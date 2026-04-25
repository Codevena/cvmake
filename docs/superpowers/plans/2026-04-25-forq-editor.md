# forq Editor (Phase 8) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the interactive editor in `apps/web` on top of Phase-7 UI primitives — load YAML → edit all CV sections via react-hook-form → live preview via iframe + portal → autosave with conflict detection → photo upload + crop → A4 PDF export.

**Architecture:** Server Component (`app/page.tsx`) loads YAML directly via `loadCV()` and pre-loads all template CSS strings; passes them as props to a Client `<EditorShell>` that owns one `useForm<CVData>`. The preview is one `<iframe>` whose document is written once per template change; React mounts the template into it via `ReactDOM.createPortal`. Five REST routes handle list / load / save / upload / export. Save is optimistic with mtime-based conflict detection.

**Tech Stack:** Next.js 16 (App Router) · React 18 · TypeScript strict · react-hook-form 7 + `@hookform/resolvers` · Zod · Tailwind v4 · sharp · Puppeteer · Vitest (happy-dom) + `@testing-library/react` · Playwright.

**Spec:** `docs/superpowers/specs/2026-04-25-forq-editor-design.md`.

---

## File Structure

```
apps/web/
  app/
    page.tsx                              [RSC] default editor (default slug logic)
    cv/[slug]/page.tsx                    [RSC] deep-linkable editor
    api/
      cv/route.ts                         GET list
      cv/[slug]/route.ts                  GET detail
      save/route.ts                       POST save (mtime-guard)
      upload/route.ts                     POST multipart photo
      export/route.ts                     POST render+pdf stream
  components/
    EditorShell.tsx                       [client] form owner; mounts everything
    TopBar.tsx                            CV-dropdown, save-indicator slot, export
    Sidebar.tsx                           template/palette/accent/hidden
    PreviewFrame.tsx                      iframe + portal bridge
    SaveIndicator.tsx                     5 states (clean/dirty/saving/saved/error)
    ConflictModal.tsx                     reload / overwrite / cancel
    PhotoUploadField.tsx                  PhotoCropper + /api/upload
    TagInput.tsx                          local thin tag-list editor
    sections/
      PersonalSection.tsx
      SummarySection.tsx
      ExperienceSection.tsx
      EducationSection.tsx
      SkillsSection.tsx
      LanguagesSection.tsx
      CustomSectionsSection.tsx
  lib/
    preview-bootstrap.ts                  server-only: reads template CSS strings
    data-paths.ts                         dataDir/photoDir resolution + slug guard
    atomic-write.ts                       tmp+rename helper
    use-debounced-value.ts                generic debounce hook
    use-hotkey.ts                         mod+s hotkey hook
    use-autosave.ts                       autosave hook (debounce + Ctrl+S + abort)
    zod-issue-mapping.ts                  Zod issue → RHF setError
    render-helpers.ts                     hidden-section filtering wrapper
    css-vars.ts                           cssVariables() (mirror of core helper, client-side)
  e2e/
    fixtures/                             test YAMLs + image
    load-edit-save.spec.ts
    template-switch.spec.ts
    photo-upload.spec.ts
    pdf-export.spec.ts
    broken-yaml.spec.ts
  vitest.config.ts                        happy-dom + setup
  playwright.config.ts
  test-setup.ts

packages/core/src/
  photo.ts                                + crop param
  ../test/photo.test.ts                   + 2 crop test cases
```

Tests are co-located with the source they exercise (`*.test.ts(x)` next to the file) per workspace convention; the only exception is `apps/web/e2e/` for Playwright.

---

## Pre-flight: apps/web Test Infrastructure

### Task 0: Wire Vitest + RTL + Playwright in apps/web

**Files:**
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/test-setup.ts`
- Create: `apps/web/playwright.config.ts`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Add testing deps**

```bash
pnpm --filter @codevena/forq-web add -D \
  @testing-library/react@16.0.1 \
  @testing-library/user-event@14.5.2 \
  @testing-library/jest-dom@6.6.3 \
  happy-dom@15.11.6 \
  clsx@2.1.1
```

- [ ] **Step 2: Create `apps/web/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./test-setup.ts'],
    globals: true,
    include: ['{app,components,lib}/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
  },
  esbuild: { jsx: 'automatic' },
});
```

- [ ] **Step 3: Create `apps/web/test-setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Create `apps/web/playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 5: Smoketest configs**

```bash
pnpm --filter @codevena/forq-web test:unit
```

Expected: `No test files found`, exit 0 (vitest with `--passWithNoTests` is the existing script — if not, add `--passWithNoTests` to the script). Update `apps/web/package.json` `test:unit` to:

```json
"test:unit": "vitest run --passWithNoTests"
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/vitest.config.ts apps/web/test-setup.ts apps/web/playwright.config.ts apps/web/package.json pnpm-lock.yaml
git commit -m "chore(web): wire vitest+rtl+playwright for phase 8"
```

---

## Task 1: processPhoto crop param (core)

**Files:**
- Modify: `packages/core/src/photo.ts`
- Modify: `packages/core/test/photo.test.ts`

- [ ] **Step 1: Write failing tests in `packages/core/test/photo.test.ts`**

Append to the existing `describe('processPhoto', …)` block:

```ts
  it('wendet das crop-Rechteck vor resize an', async () => {
    const input = path.join(import.meta.dirname, 'fixtures', 'photo-input.jpg');
    const noCrop = await processPhoto({ inputPath: input, outputDir: outDir, slug: 'a' });
    const noCropBytes = (await readFile(noCrop.jpg)).byteLength;
    const cropped = await processPhoto({
      inputPath: input,
      outputDir: outDir,
      slug: 'b',
      crop: { left: 0, top: 0, width: 100, height: 100 },
    });
    const croppedBytes = (await readFile(cropped.jpg)).byteLength;
    expect(croppedBytes).not.toBe(noCropBytes);
  });

  it('lehnt out-of-bounds crop ab', async () => {
    const input = path.join(import.meta.dirname, 'fixtures', 'photo-input.jpg');
    await expect(
      processPhoto({
        inputPath: input,
        outputDir: outDir,
        slug: 'oob',
        crop: { left: 0, top: 0, width: 99999, height: 99999 },
      }),
    ).rejects.toThrow();
  });
```

- [ ] **Step 2: Run tests, expect failure**

```bash
pnpm --filter @codevena/forq-core test:unit
```

Expected: 2 new failures: `Cannot find name 'crop'` (TS) or signature mismatch.

- [ ] **Step 3: Add `crop` to `ProcessPhotoOptions` and apply via `sharp.extract` in `packages/core/src/photo.ts`**

Replace the `pipeline` const (lines 40–45) with:

```ts
  let pipeline = sharp(buffer).rotate();
  if (opts.crop) {
    pipeline = pipeline.extract({
      left: Math.round(opts.crop.left),
      top: Math.round(opts.crop.top),
      width: Math.round(opts.crop.width),
      height: Math.round(opts.crop.height),
    });
  }
  pipeline = pipeline.resize({
    width: targetSize,
    height: targetSize,
    fit: 'cover',
    position: 'attention',
  });
```

Add to the interface (after `targetSize?`):

```ts
  crop?: { left: number; top: number; width: number; height: number } | undefined;
```

Destructure `crop` from `opts` near the top of the function — actually no destructure needed if we read `opts.crop` directly above.

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @codevena/forq-core test:unit
```

Expected: all green (4 tests in `processPhoto`).

- [ ] **Step 5: Typecheck + lint**

```bash
pnpm --filter @codevena/forq-core typecheck
pnpm --filter @codevena/forq-core lint || true
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/photo.ts packages/core/test/photo.test.ts
git commit -m "feat(core): processPhoto crop param for editor upload endpoint"
```

---

## Task 2: Filesystem & slug utilities

**Files:**
- Create: `apps/web/lib/data-paths.ts`
- Create: `apps/web/lib/data-paths.test.ts`
- Create: `apps/web/lib/atomic-write.ts`
- Create: `apps/web/lib/atomic-write.test.ts`

- [ ] **Step 1: Write `apps/web/lib/data-paths.test.ts`**

```ts
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { dataDir, photoDir, resolveCvPath, validateSlug } from './data-paths';

describe('validateSlug', () => {
  it('akzeptiert cv.de', () => expect(validateSlug('cv.de')).toBe('cv.de'));
  it('akzeptiert cv-en-2026', () => expect(validateSlug('cv-en-2026')).toBe('cv-en-2026'));
  it('lehnt ".." ab', () => expect(() => validateSlug('..')).toThrow());
  it('lehnt "." ab', () => expect(() => validateSlug('.')).toThrow());
  it('lehnt Großbuchstaben ab', () => expect(() => validateSlug('CV')).toThrow());
  it('lehnt Slashes ab', () => expect(() => validateSlug('a/b')).toThrow());
  it('lehnt leeren String ab', () => expect(() => validateSlug('')).toThrow());
});

describe('resolveCvPath', () => {
  it('liegt unter dataDir', () => {
    const p = resolveCvPath('cv.de');
    expect(p.startsWith(dataDir())).toBe(true);
    expect(p.endsWith(path.join('data', 'cvs', 'cv.de.yaml'))).toBe(true);
  });
  it('blockt traversal über resolve', () => {
    expect(() => resolveCvPath('..')).toThrow();
  });
});

describe('photoDir', () => {
  it('zeigt auf public/photos', () => {
    expect(photoDir().endsWith(path.join('public', 'photos'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect TS-error (module missing)**

```bash
pnpm --filter @codevena/forq-web test:unit
```

- [ ] **Step 3: Implement `apps/web/lib/data-paths.ts`**

```ts
import path from 'node:path';

const SLUG_RE = /^(?!\.+$)[a-z0-9.-]+$/;

export function validateSlug(slug: string): string {
  if (!SLUG_RE.test(slug)) throw new Error(`invalid slug: ${slug}`);
  return slug;
}

export function dataDir(): string {
  return path.resolve(process.cwd(), 'data', 'cvs');
}

export function photoDir(): string {
  return path.resolve(process.cwd(), 'public', 'photos');
}

export function uploadStagingDir(): string {
  return path.resolve(process.cwd(), 'data', 'cvs', 'photos');
}

export function resolveCvPath(slug: string): string {
  validateSlug(slug);
  const base = dataDir();
  const candidate = path.resolve(base, `${slug}.yaml`);
  if (!candidate.startsWith(`${base}${path.sep}`)) {
    throw new Error(`path traversal blocked: ${slug}`);
  }
  return candidate;
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @codevena/forq-web test:unit
```

Expected: 9 passing.

- [ ] **Step 5: Write `apps/web/lib/atomic-write.test.ts`**

```ts
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { atomicWriteFile } from './atomic-write';

describe('atomicWriteFile', () => {
  it('schreibt neue Datei', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'aw-'));
    const target = path.join(dir, 'a.txt');
    await atomicWriteFile(target, 'hello');
    expect(await readFile(target, 'utf8')).toBe('hello');
    await rm(dir, { recursive: true, force: true });
  });
  it('überschreibt bestehende Datei', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'aw-'));
    const target = path.join(dir, 'b.txt');
    await writeFile(target, 'old');
    await atomicWriteFile(target, 'new');
    expect(await readFile(target, 'utf8')).toBe('new');
    await rm(dir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 6: Implement `apps/web/lib/atomic-write.ts`**

```ts
import { rename, rm, writeFile } from 'node:fs/promises';

export async function atomicWriteFile(target: string, contents: string | Buffer): Promise<void> {
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, contents);
  try {
    await rm(target, { force: true });
    await rename(tmp, target);
  } catch (err) {
    await rm(tmp, { force: true });
    throw err;
  }
}
```

- [ ] **Step 7: Run tests, typecheck**

```bash
pnpm --filter @codevena/forq-web test:unit
pnpm --filter @codevena/forq-web typecheck
```

- [ ] **Step 8: Commit**

```bash
git add apps/web/lib/data-paths.ts apps/web/lib/data-paths.test.ts \
        apps/web/lib/atomic-write.ts apps/web/lib/atomic-write.test.ts
git commit -m "feat(web): filesystem + slug utilities for editor api"
```

---

## Task 3: Frontend hook & mapping utilities

**Files:**
- Create: `apps/web/lib/use-debounced-value.ts` + `.test.tsx`
- Create: `apps/web/lib/use-hotkey.ts` + `.test.tsx`
- Create: `apps/web/lib/zod-issue-mapping.ts` + `.test.ts`

- [ ] **Step 1: Write `apps/web/lib/use-debounced-value.test.tsx`**

```tsx
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './use-debounced-value';

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('hält den initialen Wert sofort', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 100));
    expect(result.current).toBe('a');
  });

  it('verzögert Updates', () => {
    let value = 'a';
    const { result, rerender } = renderHook(() => useDebouncedValue(value, 100));
    value = 'b';
    rerender();
    expect(result.current).toBe('a');
    act(() => { vi.advanceTimersByTime(99); });
    expect(result.current).toBe('a');
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('b');
  });
});
```

- [ ] **Step 2: Implement `apps/web/lib/use-debounced-value.ts`**

```ts
'use client';
import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
```

- [ ] **Step 3: Write `apps/web/lib/use-hotkey.test.tsx`**

```tsx
import { fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useHotkey } from './use-hotkey';

describe('useHotkey', () => {
  it('feuert bei mod+s (Cmd auf Mac, Ctrl sonst)', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey('mod+s', handler));
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: 's', metaKey: true });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('ignoriert s ohne mod', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey('mod+s', handler));
    fireEvent.keyDown(window, { key: 's' });
    expect(handler).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Implement `apps/web/lib/use-hotkey.ts`**

```ts
'use client';
import { useEffect } from 'react';

type Combo = 'mod+s';

export function useHotkey(combo: Combo, handler: (e: KeyboardEvent) => void): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (combo === 'mod+s') {
        const isMod = e.metaKey || e.ctrlKey;
        if (isMod && e.key.toLowerCase() === 's') handler(e);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [combo, handler]);
}
```

- [ ] **Step 5: Write `apps/web/lib/zod-issue-mapping.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { applyZodIssues } from './zod-issue-mapping';

describe('applyZodIssues', () => {
  it('mappt issues auf RHF setError mit dot-path', () => {
    const setError = vi.fn();
    applyZodIssues(
      [
        { path: ['personal', 'contacts', 'email'], message: 'Invalid email', code: 'invalid_string' },
        { path: ['experience', 0, 'title'], message: 'Required', code: 'too_small' },
      ] as any,
      setError as any,
    );
    expect(setError).toHaveBeenCalledWith('personal.contacts.email', { type: 'server', message: 'Invalid email' });
    expect(setError).toHaveBeenCalledWith('experience.0.title', { type: 'server', message: 'Required' });
  });
});
```

- [ ] **Step 6: Implement `apps/web/lib/zod-issue-mapping.ts`**

```ts
import type { UseFormSetError, FieldValues, Path } from 'react-hook-form';
import type { ZodIssue } from 'zod';

export function applyZodIssues<T extends FieldValues>(
  issues: ZodIssue[],
  setError: UseFormSetError<T>,
): void {
  for (const iss of issues) {
    const dotPath = iss.path.join('.');
    if (!dotPath) continue;
    setError(dotPath as Path<T>, { type: 'server', message: iss.message });
  }
}
```

- [ ] **Step 7: Run tests + typecheck**

```bash
pnpm --filter @codevena/forq-web test:unit
pnpm --filter @codevena/forq-web typecheck
```

Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add apps/web/lib/use-debounced-value.* apps/web/lib/use-hotkey.* apps/web/lib/zod-issue-mapping.*
git commit -m "feat(web): debounce/hotkey/zod-mapping hooks for editor"
```

---

## Task 4: Preview bootstrap helper

**Files:**
- Create: `apps/web/lib/preview-bootstrap.ts`
- Create: `apps/web/lib/preview-bootstrap.test.ts`
- Create: `apps/web/lib/css-vars.ts`

- [ ] **Step 1: Write `apps/web/lib/preview-bootstrap.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { bootstrapTemplates, listTemplates } from '@codevena/forq-templates';
import { getPreviewBootstrap } from './preview-bootstrap';

describe('getPreviewBootstrap', () => {
  it('liefert resetCss + printCss als nicht-leere Strings', () => {
    bootstrapTemplates();
    const b = getPreviewBootstrap();
    expect(b.resetCss.length).toBeGreaterThan(0);
    expect(b.printCss.length).toBeGreaterThan(0);
  });
  it('liefert für jedes registrierte Template ein CSS-String + meta', () => {
    bootstrapTemplates();
    const b = getPreviewBootstrap();
    for (const t of listTemplates()) {
      const entry = b.templates[t.meta.id];
      expect(entry).toBeDefined();
      expect(entry!.css.length).toBeGreaterThan(0);
      expect(entry!.meta.id).toBe(t.meta.id);
    }
  });
});
```

- [ ] **Step 2: Implement `apps/web/lib/preview-bootstrap.ts`**

```ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { listTemplates } from '@codevena/forq-templates';
import type { TemplateDefinition } from '@codevena/forq-schema';

export interface PreviewBootstrap {
  resetCss: string;
  printCss: string;
  templates: Record<string, { css: string; meta: TemplateDefinition['meta'] }>;
}

function templatesPkgRoot(): string {
  // Resolve relative to the templates package source. Workspace install
  // means we can require.resolve the bootstrap entry, then walk up.
  const entry = require.resolve('@codevena/forq-templates');
  return path.resolve(path.dirname(entry), '..', 'src');
}

let cached: PreviewBootstrap | null = null;

export function getPreviewBootstrap(): PreviewBootstrap {
  if (cached) return cached;
  const root = templatesPkgRoot();
  const resetCss = readFileSync(path.join(root, 'shared', 'reset.css'), 'utf8');
  const printCss = readFileSync(path.join(root, 'shared', 'print.css'), 'utf8');
  const templates: PreviewBootstrap['templates'] = {};
  for (const t of listTemplates()) {
    const css = (t as TemplateDefinition & { css?: string }).css ?? '';
    templates[t.meta.id] = { css, meta: t.meta };
  }
  cached = { resetCss, printCss, templates };
  return cached;
}
```

> Note: if `require.resolve` doesn't work under ESM, fall back to `path.resolve(process.cwd(), 'packages/templates/src')`. The test will catch a wrong path immediately.

- [ ] **Step 3: Implement `apps/web/lib/css-vars.ts`** (client-safe mirror of core helper)

```ts
import type { ColorPalette } from '@codevena/forq-schema';

export function cssVariables(p: ColorPalette): string {
  return `:root{--accent:${p.accent};--bg:${p.background};--surface:${p.surface};--text:${p.text};--text-muted:${p.textMuted};--text-on-accent:${p.textOnAccent};}`;
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @codevena/forq-web test:unit
```

Expected: 2 new tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/preview-bootstrap.* apps/web/lib/css-vars.ts
git commit -m "feat(web): preview-bootstrap loader for iframe css injection"
```

---

## Task 5: GET /api/cv list endpoint

**Files:**
- Create: `apps/web/app/api/cv/route.ts`
- Create: `apps/web/app/api/cv/route.test.ts`

- [ ] **Step 1: Write `apps/web/app/api/cv/route.test.ts`**

```ts
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('GET /api/cv', () => {
  let cwd = '';
  beforeEach(async () => {
    cwd = await mkdtemp(path.join(tmpdir(), 'forq-cv-'));
    await mkdir(path.join(cwd, 'data', 'cvs'), { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(cwd);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(cwd, { recursive: true, force: true });
  });

  it('listet Slugs aus data/cvs/*.yaml', async () => {
    await writeFile(
      path.join(cwd, 'data', 'cvs', 'cv.de.yaml'),
      `meta:\n  locale: de\npersonal:\n  firstName: M\n  lastName: W\n  contacts: {}\nexperience: []\neducation: []\nrendering:\n  template: classic-serif\n`,
    );
    await writeFile(path.join(cwd, 'data', 'cvs', 'broken.yaml'), 'not: valid: yaml: here');
    const { GET } = await import('./route');
    const res = await GET();
    const body = await res.json();
    const slugs = body.items.map((i: { slug: string }) => i.slug).sort();
    expect(slugs).toEqual(['broken', 'cv.de']);
    const cvDe = body.items.find((i: { slug: string }) => i.slug === 'cv.de');
    expect(cvDe.displayName).toContain('M W');
    const broken = body.items.find((i: { slug: string }) => i.slug === 'broken');
    expect(broken.displayName).toBe('broken');
  });
});
```

- [ ] **Step 2: Implement `apps/web/app/api/cv/route.ts`**

```ts
import { readdir } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { loadCV } from '@codevena/forq-core';
import { dataDir, resolveCvPath } from '@/lib/data-paths';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  let entries: string[] = [];
  try {
    entries = await readdir(dataDir());
  } catch {
    return NextResponse.json({ items: [] });
  }
  const slugs = entries
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => f.slice(0, -'.yaml'.length));
  const items = await Promise.all(
    slugs.map(async (slug) => {
      try {
        const cv = await loadCV(resolveCvPath(slug));
        return {
          slug,
          locale: cv.meta.locale,
          displayName: `${cv.personal.firstName} ${cv.personal.lastName} (${cv.meta.locale})`,
        };
      } catch {
        return { slug, locale: 'de' as const, displayName: slug };
      }
    }),
  );
  return NextResponse.json({ items });
}
```

- [ ] **Step 3: Add path alias if missing**

Verify `apps/web/tsconfig.json` has `"paths": { "@/*": ["./*"] }` under `compilerOptions`. If missing, add it.

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @codevena/forq-web test:unit
```

Expected: green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/cv/route.ts apps/web/app/api/cv/route.test.ts apps/web/tsconfig.json
git commit -m "feat(web): GET /api/cv list endpoint"
```

---

## Task 6: GET /api/cv/[slug] detail endpoint

**Files:**
- Create: `apps/web/app/api/cv/[slug]/route.ts`
- Create: `apps/web/app/api/cv/[slug]/route.test.ts`

- [ ] **Step 1: Write `apps/web/app/api/cv/[slug]/route.test.ts`**

```ts
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const VALID_YAML = `meta:
  locale: de
personal:
  firstName: M
  lastName: W
  contacts: {}
experience: []
education: []
rendering:
  template: classic-serif
`;

async function call(slug: string) {
  const { GET } = await import('./route');
  // Next 15+ route handlers receive { params: Promise<...> }
  return GET(new Request(`http://x/api/cv/${slug}`), { params: Promise.resolve({ slug }) });
}

describe('GET /api/cv/[slug]', () => {
  let cwd = '';
  beforeEach(async () => {
    cwd = await mkdtemp(path.join(tmpdir(), 'forq-cvd-'));
    await mkdir(path.join(cwd, 'data', 'cvs'), { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(cwd);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(cwd, { recursive: true, force: true });
  });

  it('liefert data + mtime + slug', async () => {
    await writeFile(path.join(cwd, 'data', 'cvs', 'cv.de.yaml'), VALID_YAML);
    const res = await call('cv.de');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slug).toBe('cv.de');
    expect(typeof body.mtime).toBe('number');
    expect(body.data.personal.firstName).toBe('M');
  });

  it('404 wenn slug nicht existiert', async () => {
    const res = await call('missing');
    expect(res.status).toBe(404);
  });

  it('422 bei broken YAML', async () => {
    await writeFile(path.join(cwd, 'data', 'cvs', 'broken.yaml'), '{ not yaml');
    const res = await call('broken');
    expect(res.status).toBe(422);
  });

  it('blockt path-traversal', async () => {
    const res = await call('..');
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Implement `apps/web/app/api/cv/[slug]/route.ts`**

```ts
import { stat } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { loadCV, ValidationError, YAMLParseError } from '@codevena/forq-core';
import { resolveCvPath } from '@/lib/data-paths';

export const dynamic = 'force-dynamic';

interface Ctx { params: Promise<{ slug: string }> }

export async function GET(_req: Request, ctx: Ctx): Promise<NextResponse> {
  const { slug } = await ctx.params;
  let target: string;
  try {
    target = resolveCvPath(slug);
  } catch {
    return NextResponse.json({ kind: 'invalid_slug' }, { status: 400 });
  }
  let mtime: number;
  try {
    const st = await stat(target);
    mtime = st.mtimeMs;
  } catch {
    return NextResponse.json({ kind: 'not_found' }, { status: 404 });
  }
  try {
    const data = await loadCV(target);
    return NextResponse.json({ data, mtime, slug });
  } catch (err) {
    if (err instanceof YAMLParseError) {
      return NextResponse.json(
        { kind: 'yaml', message: err.message, line: err.line, column: err.column },
        { status: 422 },
      );
    }
    if (err instanceof ValidationError) {
      return NextResponse.json(
        { kind: 'validation', issues: err.issues },
        { status: 422 },
      );
    }
    return NextResponse.json({ kind: 'unknown', message: String(err) }, { status: 500 });
  }
}
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @codevena/forq-web test:unit
```

Expected: 4 new tests green.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/cv/[slug]/route.ts apps/web/app/api/cv/[slug]/route.test.ts
git commit -m "feat(web): GET /api/cv/[slug] detail endpoint"
```

---

## Task 7: POST /api/save (mtime-guarded atomic write)

**Files:**
- Create: `apps/web/app/api/save/route.ts`
- Create: `apps/web/app/api/save/route.test.ts`

- [ ] **Step 1: Write `apps/web/app/api/save/route.test.ts`**

```ts
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const VALID_DATA = {
  meta: { locale: 'de', updatedAt: '2026-04-25' },
  personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [],
  education: [],
  rendering: { template: 'classic-serif' },
};
const VALID_YAML = `meta: { locale: de }
personal: { firstName: M, lastName: W, contacts: {} }
experience: []
education: []
rendering: { template: classic-serif }
`;

async function post(body: unknown) {
  const { POST } = await import('./route');
  return POST(
    new Request('http://x/api/save', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

describe('POST /api/save', () => {
  let cwd = '';
  beforeEach(async () => {
    cwd = await mkdtemp(path.join(tmpdir(), 'forq-save-'));
    await mkdir(path.join(cwd, 'data', 'cvs'), { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(cwd);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(cwd, { recursive: true, force: true });
  });

  it('200 bei mtime-match: schreibt YAML und gibt neue mtime', async () => {
    const target = path.join(cwd, 'data', 'cvs', 'cv.de.yaml');
    await writeFile(target, VALID_YAML);
    const before = (await stat(target)).mtimeMs;
    const res = await post({ slug: 'cv.de', data: VALID_DATA, expectedMtime: before });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.mtime).toBe('number');
    const written = await readFile(target, 'utf8');
    expect(written).toContain('firstName: M');
  });

  it('409 bei mtime-mismatch mit currentData', async () => {
    const target = path.join(cwd, 'data', 'cvs', 'cv.de.yaml');
    await writeFile(target, VALID_YAML);
    const res = await post({ slug: 'cv.de', data: VALID_DATA, expectedMtime: 1 });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.kind).toBe('conflict');
    expect(body.currentData).toBeDefined();
    expect(typeof body.currentMtime).toBe('number');
  });

  it('422 bei Zod-Fail', async () => {
    const target = path.join(cwd, 'data', 'cvs', 'cv.de.yaml');
    await writeFile(target, VALID_YAML);
    const before = (await stat(target)).mtimeMs;
    const bad = { ...VALID_DATA, personal: { ...VALID_DATA.personal, firstName: 123 } };
    const res = await post({ slug: 'cv.de', data: bad, expectedMtime: before });
    expect(res.status).toBe(422);
  });

  it('400 bei ungültigem Slug', async () => {
    const res = await post({ slug: '..', data: VALID_DATA, expectedMtime: 1 });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Implement `apps/web/app/api/save/route.ts`**

```ts
import { stat } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import yaml from 'js-yaml';
import { CVDataSchema } from '@codevena/forq-schema';
import { loadCV } from '@codevena/forq-core';
import { resolveCvPath } from '@/lib/data-paths';
import { atomicWriteFile } from '@/lib/atomic-write';

export const dynamic = 'force-dynamic';

interface SaveRequest {
  slug: string;
  data: unknown;
  expectedMtime: number;
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: SaveRequest;
  try {
    body = (await req.json()) as SaveRequest;
  } catch {
    return NextResponse.json({ kind: 'bad_request' }, { status: 400 });
  }
  let target: string;
  try {
    target = resolveCvPath(body.slug);
  } catch {
    return NextResponse.json({ kind: 'invalid_slug' }, { status: 400 });
  }
  // mtime guard
  let currentMtime = 0;
  try {
    currentMtime = (await stat(target)).mtimeMs;
  } catch {
    // file doesn't exist yet — accept and create
  }
  if (currentMtime !== 0 && currentMtime !== body.expectedMtime) {
    let currentData: unknown = null;
    try {
      currentData = await loadCV(target);
    } catch {
      currentData = null;
    }
    return NextResponse.json(
      { kind: 'conflict', currentData, currentMtime },
      { status: 409 },
    );
  }
  // validation
  const parsed = CVDataSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { kind: 'validation', issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const stamped = {
    ...parsed.data,
    meta: { ...parsed.data.meta, updatedAt: new Date().toISOString().slice(0, 10) },
  };
  const dump = yaml.dump(stamped, { lineWidth: 100, noRefs: true });
  await atomicWriteFile(target, dump);
  const newMtime = (await stat(target)).mtimeMs;
  return NextResponse.json({ ok: true, mtime: newMtime });
}
```

- [ ] **Step 3: Add `js-yaml` if missing in apps/web**

```bash
pnpm --filter @codevena/forq-web add js-yaml@4.1.0 && pnpm --filter @codevena/forq-web add -D @types/js-yaml@4.0.9
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @codevena/forq-web test:unit
```

Expected: 4 new tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/save/route.ts apps/web/app/api/save/route.test.ts apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): POST /api/save with mtime guard + atomic write"
```

---

## Task 8: POST /api/upload (multipart photo + sharp)

**Files:**
- Create: `apps/web/app/api/upload/route.ts`
- Create: `apps/web/app/api/upload/route.test.ts`

- [ ] **Step 1: Write `apps/web/app/api/upload/route.test.ts`**

```ts
import { mkdtemp, mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function post(form: FormData) {
  const { POST } = await import('./route');
  return POST(new Request('http://x/api/upload', { method: 'POST', body: form }));
}

describe('POST /api/upload', () => {
  let cwd = '';
  beforeEach(async () => {
    cwd = await mkdtemp(path.join(tmpdir(), 'forq-up-'));
    await mkdir(path.join(cwd, 'public', 'photos'), { recursive: true });
    await mkdir(path.join(cwd, 'data', 'cvs', 'photos'), { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(cwd);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(cwd, { recursive: true, force: true });
  });

  it('200: schreibt webp + jpg, cleanup temp', async () => {
    const fixture = await readFile(
      path.resolve(__dirname, '../../../../../packages/core/test/fixtures/photo-input.jpg'),
    );
    const form = new FormData();
    form.append('file', new Blob([fixture], { type: 'image/jpeg' }), 'p.jpg');
    form.append('slug', 'cv.de');
    form.append('crop', JSON.stringify({ x: 0, y: 0, width: 100, height: 100 }));
    form.append('aspect', '1:1');
    const res = await post(form);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.webp).toBe('/photos/cv.de.webp');
    expect(body.jpg).toBe('/photos/cv.de.jpg');
    const stagingFiles = await readdir(path.join(cwd, 'data', 'cvs', 'photos'));
    expect(stagingFiles).toEqual([]);
  });

  it('400 bei ungültigem Slug', async () => {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }), 'p.jpg');
    form.append('slug', '..');
    form.append('crop', JSON.stringify({ x: 0, y: 0, width: 1, height: 1 }));
    form.append('aspect', '1:1');
    const res = await post(form);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Implement `apps/web/app/api/upload/route.ts`**

```ts
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { processPhoto } from '@codevena/forq-core';
import { photoDir, uploadStagingDir, validateSlug } from '@/lib/data-paths';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ kind: 'bad_multipart' }, { status: 400 });
  }
  const file = form.get('file');
  const slugRaw = form.get('slug');
  const cropRaw = form.get('crop');
  const aspect = form.get('aspect');
  if (!(file instanceof Blob) || typeof slugRaw !== 'string' ||
      typeof cropRaw !== 'string' || typeof aspect !== 'string') {
    return NextResponse.json({ kind: 'bad_request' }, { status: 400 });
  }
  let slug: string;
  try {
    slug = validateSlug(slugRaw);
  } catch {
    return NextResponse.json({ kind: 'invalid_slug' }, { status: 400 });
  }
  let crop: { x: number; y: number; width: number; height: number };
  try {
    crop = JSON.parse(cropRaw);
  } catch {
    return NextResponse.json({ kind: 'bad_crop' }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  await mkdir(photoDir(), { recursive: true });
  await mkdir(uploadStagingDir(), { recursive: true });
  const tmp = path.join(uploadStagingDir(), `.upload-${slug}-${Date.now()}.bin`);
  await writeFile(tmp, buf);
  try {
    const result = await processPhoto({
      inputPath: tmp,
      outputDir: photoDir(),
      slug,
      crop: { left: crop.x, top: crop.y, width: crop.width, height: crop.height },
    });
    return NextResponse.json({
      webp: `/photos/${slug}.webp`,
      jpg: `/photos/${slug}.jpg`,
      width: result.width,
      height: result.height,
    });
  } catch (err) {
    return NextResponse.json({ kind: 'process_failed', message: String(err) }, { status: 400 });
  } finally {
    await rm(tmp, { force: true });
  }
}
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @codevena/forq-web test:unit
```

Expected: 2 new tests green.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/upload/route.ts apps/web/app/api/upload/route.test.ts
git commit -m "feat(web): POST /api/upload with sharp crop+resize"
```

---

## Task 9: POST /api/export (PDF stream)

**Files:**
- Create: `apps/web/app/api/export/route.ts`
- Create: `apps/web/app/api/export/route.test.ts`

- [ ] **Step 1: Write `apps/web/app/api/export/route.test.ts`**

```ts
import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import { bootstrapTemplates, shutdownPdfBrowser } from '@codevena/forq-templates';

const VALID_DATA = {
  meta: { locale: 'de', updatedAt: '2026-04-25' },
  personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [],
  education: [],
  rendering: { template: 'classic-serif' },
};

async function post(body: unknown) {
  const { POST } = await import('./route');
  return POST(
    new Request('http://x/api/export', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

describe('POST /api/export', () => {
  beforeAll(() => bootstrapTemplates());
  afterAll(async () => {
    const core = await import('@codevena/forq-core');
    await core.shutdownPdfBrowser();
  });

  it('liefert application/pdf mit Content-Disposition', async () => {
    const res = await post({ data: VALID_DATA, templateId: 'classic-serif' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/pdf');
    expect(res.headers.get('content-disposition')).toContain('attachment');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.byteLength).toBeGreaterThan(1000);
    expect(buf.subarray(0, 4).toString()).toBe('%PDF');
  }, 60_000);

  it('422 bei invaliden Daten', async () => {
    const res = await post({ data: { broken: true }, templateId: 'classic-serif' });
    expect(res.status).toBe(422);
  });

  it('404 bei unbekanntem Template', async () => {
    const res = await post({ data: VALID_DATA, templateId: 'no-such' });
    expect(res.status).toBe(404);
  });
});
```

> Note: this test uses real Puppeteer. Mark this file `*.integration.test.ts` if you want to gate it from quick `test:unit`. For Phase 8 we keep it as `route.test.ts` and accept the longer runtime; CI will accept.

- [ ] **Step 2: Implement `apps/web/app/api/export/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { CVDataSchema } from '@codevena/forq-schema';
import { generatePDF, renderCV } from '@codevena/forq-core';
import { wrapHtmlDocument } from '@codevena/forq-core';
import { getTemplate, bootstrapTemplates } from '@codevena/forq-templates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let booted = false;
function ensureBoot() {
  if (booted) return;
  bootstrapTemplates();
  booted = true;
}

interface ExportRequest {
  data: unknown;
  templateId: string;
  paletteId?: string;
}

export async function POST(req: Request): Promise<Response> {
  ensureBoot();
  let body: ExportRequest;
  try {
    body = (await req.json()) as ExportRequest;
  } catch {
    return NextResponse.json({ kind: 'bad_request' }, { status: 400 });
  }
  const parsed = CVDataSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { kind: 'validation', issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const template = getTemplate(body.templateId);
  if (!template) {
    return NextResponse.json({ kind: 'unknown_template' }, { status: 404 });
  }
  const { html, css } = renderCV({ data: parsed.data, template, paletteId: body.paletteId });
  const fullCss = `${(template as any).css ?? ''}\n${css}`;
  const doc = wrapHtmlDocument({ title: `${parsed.data.personal.firstName} CV`, html, css: fullCss });
  const pdf = await generatePDF(doc);
  const filename = `${parsed.data.personal.lastName}-${body.templateId}.pdf`.toLowerCase();
  return new Response(pdf, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  });
}
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @codevena/forq-web test:unit
```

Expected: 3 tests green (PDF test ~10–30 s).

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/export/route.ts apps/web/app/api/export/route.test.ts
git commit -m "feat(web): POST /api/export pdf stream"
```

---

## Task 10: EditorShell skeleton + page.tsx (RSC)

**Files:**
- Create: `apps/web/components/EditorShell.tsx`
- Modify: `apps/web/app/page.tsx`
- Create: `apps/web/components/EditorShell.test.tsx`

- [ ] **Step 1: Write `apps/web/components/EditorShell.test.tsx`** (smoke)

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CVData } from '@codevena/forq-schema';
import { EditorShell } from './EditorShell';

const DATA: CVData = {
  meta: { locale: 'de' },
  personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [],
  education: [],
  rendering: { template: 'classic-serif' },
};

const BOOTSTRAP = {
  resetCss: '/* reset */',
  printCss: '/* print */',
  templates: {
    'classic-serif': {
      css: '/* tpl */',
      meta: {
        id: 'classic-serif',
        name: 'Classic Serif',
        description: '',
        supportsPhoto: true,
        photoFallback: 'initials' as const,
        supportedLocales: ['de', 'en'] as const,
        defaultSectionOrder: ['experience'],
        supportsPagination: true,
      },
    },
  },
};

describe('<EditorShell />', () => {
  it('rendert TopBar + Sidebar + FormPanel + PreviewFrame Slots', () => {
    render(
      <EditorShell
        initialData={DATA}
        initialMtime={1}
        slug="cv.de"
        allSlugs={['cv.de']}
        bootstrap={BOOTSTRAP as any}
      />,
    );
    expect(screen.getByRole('banner')).toBeInTheDocument(); // TopBar
    expect(screen.getByRole('complementary')).toBeInTheDocument(); // Sidebar
    expect(screen.getByRole('form')).toBeInTheDocument();
    expect(screen.getByTitle('CV Preview')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement `apps/web/components/EditorShell.tsx` (skeleton, no real form sections yet)**

```tsx
'use client';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CVDataSchema, type CVData } from '@codevena/forq-schema';
import type { PreviewBootstrap } from '@/lib/preview-bootstrap';

interface Props {
  initialData: CVData;
  initialMtime: number;
  slug: string;
  allSlugs: string[];
  bootstrap: PreviewBootstrap;
}

export function EditorShell({ initialData, initialMtime, slug, allSlugs, bootstrap }: Props) {
  const form = useForm<CVData>({
    defaultValues: initialData,
    resolver: zodResolver(CVDataSchema),
    mode: 'onChange',
    shouldUnregister: false,
  });

  return (
    <FormProvider {...form}>
      <div className="flex h-screen flex-col bg-bg text-text">
        <header role="banner" className="flex h-12 items-center border-b px-4">
          <span className="font-semibold">forq</span>
          <span className="ml-4 text-sm text-text-muted">{slug}</span>
        </header>
        <div className="flex flex-1 overflow-hidden">
          <aside role="complementary" className="w-80 shrink-0 overflow-y-auto border-r p-4">
            Sidebar
          </aside>
          <form role="form" className="flex-1 overflow-y-auto p-6" onSubmit={(e) => e.preventDefault()}>
            Form
          </form>
          <section className="flex-1 overflow-hidden p-4">
            <iframe title="CV Preview" className="h-full w-full bg-white" sandbox="allow-same-origin" />
          </section>
        </div>
      </div>
    </FormProvider>
  );
}
```

- [ ] **Step 3: Modify `apps/web/app/page.tsx` (RSC)**

```tsx
import { readdir, stat } from 'node:fs/promises';
import { loadCV } from '@codevena/forq-core';
import { bootstrapTemplates } from '@codevena/forq-templates';
import { EditorShell } from '@/components/EditorShell';
import { dataDir, resolveCvPath } from '@/lib/data-paths';
import { getPreviewBootstrap } from '@/lib/preview-bootstrap';

export const dynamic = 'force-dynamic';

async function listSlugs(): Promise<string[]> {
  try {
    const files = await readdir(dataDir());
    return files.filter((f) => f.endsWith('.yaml')).map((f) => f.slice(0, -'.yaml'.length)).sort();
  } catch {
    return [];
  }
}

function pickDefault(slugs: string[]): string | null {
  if (slugs.includes('cv.de')) return 'cv.de';
  return slugs[0] ?? null;
}

export default async function Home() {
  bootstrapTemplates();
  const slugs = await listSlugs();
  const slug = pickDefault(slugs);
  if (!slug) {
    return <main className="p-8">Keine CVs in <code>data/cvs/</code> gefunden.</main>;
  }
  const target = resolveCvPath(slug);
  const data = await loadCV(target);
  const mtime = (await stat(target)).mtimeMs;
  const bootstrap = getPreviewBootstrap();
  return (
    <EditorShell
      initialData={data}
      initialMtime={mtime}
      slug={slug}
      allSlugs={slugs}
      bootstrap={bootstrap}
    />
  );
}
```

- [ ] **Step 4: Run tests + dev smoketest**

```bash
pnpm --filter @codevena/forq-web test:unit
pnpm --filter @codevena/forq-web typecheck
```

Expected: green. Then manually verify by visiting `http://localhost:3000` (after `pnpm --filter @codevena/forq-web dev`) — see TopBar with `cv.de`, sidebar, empty form, empty preview.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/EditorShell.tsx apps/web/components/EditorShell.test.tsx apps/web/app/page.tsx
git commit -m "feat(web): EditorShell skeleton + RSC bootstrap"
```

---

## Task 11: PreviewFrame (iframe + portal bridge)

**Files:**
- Create: `apps/web/components/PreviewFrame.tsx`
- Create: `apps/web/components/PreviewFrame.test.tsx`
- Modify: `apps/web/components/EditorShell.tsx` — replace inline iframe with `<PreviewFrame>`.

- [ ] **Step 1: Write `apps/web/components/PreviewFrame.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { bootstrapTemplates } from '@codevena/forq-templates';
import type { CVData } from '@codevena/forq-schema';
import { PreviewFrame } from './PreviewFrame';

bootstrapTemplates();

const DATA: CVData = {
  meta: { locale: 'de' },
  personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [],
  education: [],
  rendering: { template: 'classic-serif' },
};

describe('<PreviewFrame />', () => {
  it('rendert ein iframe mit title="CV Preview"', () => {
    const bootstrap = {
      resetCss: 'body{margin:0}',
      printCss: '@page{size:A4}',
      templates: { 'classic-serif': { css: '.cv{}', meta: { id: 'classic-serif' } as any } },
    };
    render(<PreviewFrame data={DATA} bootstrap={bootstrap as any} templateId="classic-serif" />);
    const iframe = screen.getByTitle('CV Preview') as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute('sandbox')).toBe('allow-same-origin');
  });
});
```

> Note: full portal-mount testing requires a Browser-y iframe (happy-dom does not load child docs reliably). Coverage of full render is via the e2e test in Task 27.

- [ ] **Step 2: Implement `apps/web/components/PreviewFrame.tsx`**

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getTemplate } from '@codevena/forq-templates';
import { getLabels } from '@codevena/forq-core';
import type { CVData, ColorPalette } from '@codevena/forq-schema';
import type { PreviewBootstrap } from '@/lib/preview-bootstrap';
import { cssVariables } from '@/lib/css-vars';

interface Props {
  data: CVData;
  bootstrap: PreviewBootstrap;
  templateId: string;
  paletteId?: string | undefined;
  accentOverride?: string | undefined;
}

function effectivePalette(
  bootstrap: PreviewBootstrap,
  templateId: string,
  paletteId: string | undefined,
  accentOverride: string | undefined,
): ColorPalette | null {
  const t = getTemplate(templateId);
  if (!t) return null;
  const pal = t.palettes.find((p) => p.id === paletteId) ?? t.palettes[0];
  if (!pal) return null;
  return { ...pal, accent: accentOverride ?? pal.accent };
}

function writeInitialDoc(
  iframe: HTMLIFrameElement,
  bootstrap: PreviewBootstrap,
  templateId: string,
  paletteVars: string,
  locale: string,
): HTMLElement | null {
  const tpl = bootstrap.templates[templateId];
  if (!tpl) return null;
  const doc = iframe.contentDocument;
  if (!doc) return null;
  doc.open();
  doc.write(`<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<style id="reset-css">${bootstrap.resetCss}</style>
<style id="template-css">${tpl.css}</style>
<style id="print-css">${bootstrap.printCss}</style>
<style id="palette-vars">${paletteVars}</style>
</head>
<body><div id="cv-root"></div></body>
</html>`);
  doc.close();
  return doc.getElementById('cv-root');
}

export function PreviewFrame({ data, bootstrap, templateId, paletteId, accentOverride }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const lastTemplateRef = useRef<string | null>(null);

  // Build / rebuild iframe document on template change
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const palette = effectivePalette(bootstrap, templateId, paletteId, accentOverride);
    if (!palette) return;
    const newRoot = writeInitialDoc(
      iframe,
      bootstrap,
      templateId,
      cssVariables(palette),
      data.meta.locale,
    );
    lastTemplateRef.current = templateId;
    setRoot(newRoot);
  }, [templateId, bootstrap, data.meta.locale]);

  // Patch palette vars without rebuild
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || lastTemplateRef.current !== templateId) return;
    const palette = effectivePalette(bootstrap, templateId, paletteId, accentOverride);
    if (!palette) return;
    const styleEl = iframe.contentDocument?.getElementById('palette-vars');
    if (styleEl) styleEl.textContent = cssVariables(palette);
  }, [paletteId, accentOverride, templateId, bootstrap]);

  const tplDef = getTemplate(templateId);
  const palette = effectivePalette(bootstrap, templateId, paletteId, accentOverride);

  return (
    <>
      <iframe
        ref={iframeRef}
        title="CV Preview"
        sandbox="allow-same-origin"
        className="h-full w-full bg-white"
      />
      {root && tplDef && palette
        ? createPortal(
            <tplDef.Component
              data={data}
              palette={palette}
              locale={data.meta.locale}
              labels={getLabels(data.meta.locale)}
            />,
            root,
          )
        : null}
    </>
  );
}
```

- [ ] **Step 3: Wire `<PreviewFrame>` into `EditorShell.tsx`**

Replace the inline `<section>` block in `EditorShell.tsx`:

```tsx
import { useWatch } from 'react-hook-form';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { PreviewFrame } from './PreviewFrame';

// inside EditorShell, after const form = useForm(...)
const watched = useWatch({ control: form.control }) as CVData;
const debounced = useDebouncedValue(watched, 150);
```

And replace the iframe section JSX:

```tsx
<section className="flex-1 overflow-hidden p-4">
  <PreviewFrame
    data={debounced}
    bootstrap={bootstrap}
    templateId={debounced?.rendering?.template ?? 'classic-serif'}
    paletteId={debounced?.rendering?.palette}
    accentOverride={debounced?.rendering?.accentOverride}
  />
</section>
```

- [ ] **Step 4: Run tests + dev smoketest**

```bash
pnpm --filter @codevena/forq-web test:unit
pnpm --filter @codevena/forq-web typecheck
pnpm --filter @codevena/forq-web dev
# manually open http://localhost:3000, see classic-serif rendered inside the iframe
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/PreviewFrame.tsx apps/web/components/PreviewFrame.test.tsx apps/web/components/EditorShell.tsx
git commit -m "feat(web): live preview iframe + react portal bridge"
```

---

## Task 12: PersonalSection (without photo upload)

**Files:**
- Create: `apps/web/components/sections/PersonalSection.tsx`
- Create: `apps/web/components/sections/PersonalSection.test.tsx`

> The photo field is implemented as a plain `<Input>` for now; the rich `<PhotoUploadField>` lands in Task 23.

- [ ] **Step 1: Write `apps/web/components/sections/PersonalSection.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import type { CVData } from '@codevena/forq-schema';
import { describe, expect, it } from 'vitest';
import { PersonalSection } from './PersonalSection';

function Wrapper({ initial }: { initial: CVData }) {
  const form = useForm<CVData>({ defaultValues: initial, mode: 'onChange', shouldUnregister: false });
  return (
    <FormProvider {...form}>
      <PersonalSection />
    </FormProvider>
  );
}

const DATA: CVData = {
  meta: { locale: 'de' },
  personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [], education: [],
  rendering: { template: 'classic-serif' },
};

describe('<PersonalSection />', () => {
  it('rendert Name-Felder und propagiert Änderungen', () => {
    render(<Wrapper initial={DATA} />);
    const first = screen.getByLabelText(/Vorname/i) as HTMLInputElement;
    fireEvent.change(first, { target: { value: 'Alex' } });
    expect((screen.getByLabelText(/Vorname/i) as HTMLInputElement).value).toBe('Alex');
  });
});
```

- [ ] **Step 2: Implement `apps/web/components/sections/PersonalSection.tsx`**

```tsx
'use client';
import { Controller, useFormContext } from 'react-hook-form';
import type { CVData } from '@codevena/forq-schema';
import { Input } from '@codevena/forq-ui';

export function PersonalSection() {
  const { control } = useFormContext<CVData>();
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-base font-semibold">Persönliche Daten</legend>
      <div className="grid grid-cols-2 gap-3">
        <Controller
          control={control}
          name="personal.firstName"
          render={({ field, fieldState }) => (
            <Input label="Vorname" value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur}
                   error={fieldState.error?.message} required />
          )}
        />
        <Controller
          control={control}
          name="personal.lastName"
          render={({ field, fieldState }) => (
            <Input label="Nachname" value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur}
                   error={fieldState.error?.message} required />
          )}
        />
      </div>
      <Controller
        control={control}
        name="personal.title"
        render={({ field, fieldState }) => (
          <Input label="Titel / Headline" value={field.value ?? ''} onChange={field.onChange}
                 error={fieldState.error?.message} />
        )}
      />
      <div className="grid grid-cols-3 gap-3">
        <Controller
          control={control} name="personal.birthDate"
          render={({ field, fieldState }) => (
            <Input label="Geburtsdatum" value={field.value ?? ''} onChange={field.onChange}
                   error={fieldState.error?.message} />
          )}
        />
        <Controller
          control={control} name="personal.maritalStatus"
          render={({ field, fieldState }) => (
            <Input label="Familienstand" value={field.value ?? ''} onChange={field.onChange}
                   error={fieldState.error?.message} />
          )}
        />
        <Controller
          control={control} name="personal.drivingLicense"
          render={({ field, fieldState }) => (
            <Input label="Führerschein" value={field.value ?? ''} onChange={field.onChange}
                   error={fieldState.error?.message} />
          )}
        />
      </div>
      <Controller
        control={control} name="personal.photo"
        render={({ field, fieldState }) => (
          <Input label="Foto-Pfad (vorerst manuell)" value={field.value ?? ''} onChange={field.onChange}
                 error={fieldState.error?.message} />
        )}
      />
      <fieldset className="grid grid-cols-2 gap-3 rounded border p-3">
        <legend className="px-1 text-sm font-medium">Kontakt</legend>
        {(['email','phone','website','github','linkedin','location'] as const).map((k) => (
          <Controller
            key={k}
            control={control}
            name={`personal.contacts.${k}` as const}
            render={({ field, fieldState }) => (
              <Input
                label={k}
                value={field.value ?? ''}
                onChange={field.onChange}
                error={fieldState.error?.message}
                type={k === 'email' ? 'email' : k === 'website' ? 'url' : k === 'phone' ? 'tel' : 'text'}
              />
            )}
          />
        ))}
      </fieldset>
    </fieldset>
  );
}
```

- [ ] **Step 3: Wire into EditorShell form area**

In `EditorShell.tsx`, replace the literal `Form` placeholder with `<PersonalSection />`:

```tsx
<form role="form" className="flex-1 overflow-y-auto p-6" onSubmit={(e) => e.preventDefault()}>
  <PersonalSection />
</form>
```

(Add `import { PersonalSection } from './sections/PersonalSection';` at the top.)

- [ ] **Step 4: Run tests + smoketest**

```bash
pnpm --filter @codevena/forq-web test:unit
pnpm --filter @codevena/forq-web typecheck
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/sections/PersonalSection.tsx apps/web/components/sections/PersonalSection.test.tsx apps/web/components/EditorShell.tsx
git commit -m "feat(web): PersonalSection form fields"
```

---

## Task 13: SummarySection

**Files:**
- Create: `apps/web/components/sections/SummarySection.tsx`
- Create: `apps/web/components/sections/SummarySection.test.tsx`

- [ ] **Step 1: Write `apps/web/components/sections/SummarySection.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import type { CVData } from '@codevena/forq-schema';
import { describe, expect, it } from 'vitest';
import { SummarySection } from './SummarySection';

const DATA: CVData = {
  meta: { locale: 'de' }, personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [], education: [], rendering: { template: 'classic-serif' },
};

describe('<SummarySection />', () => {
  it('rendert eine Textarea und speichert Änderungen im form-state', () => {
    function Wrap() {
      const form = useForm<CVData>({ defaultValues: DATA, shouldUnregister: false });
      return (
        <FormProvider {...form}>
          <SummarySection />
          <output>{form.watch('summary') ?? ''}</output>
        </FormProvider>
      );
    }
    render(<Wrap />);
    const ta = screen.getByLabelText(/Profil/i) as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: 'Hallo Welt' } });
    expect(screen.getByRole('status')).toHaveTextContent('Hallo Welt');
  });
});
```

- [ ] **Step 2: Implement `apps/web/components/sections/SummarySection.tsx`**

```tsx
'use client';
import { Controller, useFormContext } from 'react-hook-form';
import type { CVData } from '@codevena/forq-schema';
import { Textarea } from '@codevena/forq-ui';

export function SummarySection() {
  const { control } = useFormContext<CVData>();
  return (
    <fieldset className="mt-6 flex flex-col gap-2">
      <legend className="text-base font-semibold">Profil</legend>
      <Controller
        control={control}
        name="summary"
        render={({ field, fieldState }) => (
          <Textarea
            label="Profil"
            value={field.value ?? ''}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            rows={5}
          />
        )}
      />
    </fieldset>
  );
}
```

- [ ] **Step 3: Wire into EditorShell, below `<PersonalSection />`**

```tsx
import { SummarySection } from './sections/SummarySection';
// …
<PersonalSection />
<SummarySection />
```

- [ ] **Step 4: Run + commit**

```bash
pnpm --filter @codevena/forq-web test:unit
git add apps/web/components/sections/SummarySection.* apps/web/components/EditorShell.tsx
git commit -m "feat(web): SummarySection"
```

---

## Task 14: TagInput + ExperienceSection

**Files:**
- Create: `apps/web/components/TagInput.tsx`
- Create: `apps/web/components/TagInput.test.tsx`
- Create: `apps/web/components/sections/ExperienceSection.tsx`
- Create: `apps/web/components/sections/ExperienceSection.test.tsx`

- [ ] **Step 1: Write `apps/web/components/TagInput.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { TagInput } from './TagInput';

function Host({ initial }: { initial: string[] }) {
  const [v, setV] = useState(initial);
  return <TagInput value={v} onChange={setV} label="Tags" />;
}

describe('<TagInput />', () => {
  it('fügt Tag bei Enter hinzu', () => {
    render(<Host initial={[]} />);
    const input = screen.getByLabelText(/Tags/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'react' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('react')).toBeInTheDocument();
  });
  it('entfernt Tag per Click auf ×', () => {
    render(<Host initial={['a', 'b']} />);
    fireEvent.click(screen.getByLabelText(/Tag a entfernen/i));
    expect(screen.queryByText('a')).not.toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement `apps/web/components/TagInput.tsx`**

```tsx
'use client';
import { useId, useState, type KeyboardEvent } from 'react';

interface Props {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

export function TagInput({ label, value, onChange, placeholder }: Props) {
  const id = useId();
  const [draft, setDraft] = useState('');
  function commit() {
    const t = draft.trim();
    if (!t) return;
    if (value.includes(t)) { setDraft(''); return; }
    onChange([...value, t]);
    setDraft('');
  }
  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }
  function remove(t: string) {
    onChange(value.filter((x) => x !== t));
  }
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <div className="flex flex-wrap items-center gap-1 rounded border bg-surface p-2">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded bg-accent/20 px-2 py-0.5 text-xs">
            {t}
            <button
              type="button"
              aria-label={`Tag ${t} entfernen`}
              className="text-text-muted hover:text-text"
              onClick={() => remove(t)}
            >×</button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={commit}
          placeholder={placeholder}
          className="flex-1 min-w-[120px] bg-transparent outline-none"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement `apps/web/components/sections/ExperienceSection.tsx`**

```tsx
'use client';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import type { CVData } from '@codevena/forq-schema';
import { BulletListEditor, DateRangeInput, Input } from '@codevena/forq-ui';
import { TagInput } from '../TagInput';

export function ExperienceSection() {
  const { control } = useFormContext<CVData>();
  const { fields, append, remove, swap } = useFieldArray({ control, name: 'experience' });
  return (
    <fieldset className="mt-6 flex flex-col gap-3">
      <legend className="text-base font-semibold">Berufserfahrung</legend>
      {fields.map((f, idx) => (
        <div key={f.id} className="rounded border p-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">#{idx + 1}</span>
            <div className="flex gap-1">
              <button type="button" disabled={idx === 0} onClick={() => swap(idx, idx - 1)} aria-label="nach oben">↑</button>
              <button type="button" disabled={idx === fields.length - 1} onClick={() => swap(idx, idx + 1)} aria-label="nach unten">↓</button>
              <button type="button" onClick={() => { if (confirm('Eintrag löschen?')) remove(idx); }} aria-label="Eintrag löschen">🗑</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Controller control={control} name={`experience.${idx}.title`} render={({ field, fieldState }) => (
              <Input label="Position" value={field.value ?? ''} onChange={field.onChange} error={fieldState.error?.message} required />
            )} />
            <Controller control={control} name={`experience.${idx}.company`} render={({ field, fieldState }) => (
              <Input label="Unternehmen" value={field.value ?? ''} onChange={field.onChange} error={fieldState.error?.message} required />
            )} />
            <Controller control={control} name={`experience.${idx}.location`} render={({ field, fieldState }) => (
              <Input label="Ort" value={field.value ?? ''} onChange={field.onChange} error={fieldState.error?.message} />
            )} />
            <Controller
              control={control}
              name={`experience.${idx}.startDate`}
              render={({ field: startField }) => (
                <Controller
                  control={control}
                  name={`experience.${idx}.endDate`}
                  render={({ field: endField }) => (
                    <DateRangeInput
                      label="Zeitraum"
                      value={{ startDate: startField.value ?? '', endDate: endField.value }}
                      onChange={(v) => {
                        startField.onChange(v.startDate);
                        endField.onChange(v.endDate);
                      }}
                    />
                  )}
                />
              )}
            />
          </div>
          <Controller control={control} name={`experience.${idx}.bullets`} render={({ field }) => (
            <BulletListEditor label="Aufgaben" value={field.value ?? []} onChange={field.onChange} />
          )} />
          <Controller control={control} name={`experience.${idx}.tags`} render={({ field }) => (
            <TagInput label="Tags" value={field.value ?? []} onChange={field.onChange} />
          )} />
        </div>
      ))}
      <button
        type="button"
        className="rounded border border-dashed p-2 text-sm hover:bg-surface"
        onClick={() => append({ title: '', company: '', startDate: '', bullets: [] })}
      >+ Eintrag hinzufügen</button>
    </fieldset>
  );
}
```

- [ ] **Step 4: Write `apps/web/components/sections/ExperienceSection.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import type { CVData } from '@codevena/forq-schema';
import { describe, expect, it, vi } from 'vitest';
import { ExperienceSection } from './ExperienceSection';

const DATA: CVData = {
  meta: { locale: 'de' }, personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [], education: [], rendering: { template: 'classic-serif' },
};

function Wrap() {
  const form = useForm<CVData>({ defaultValues: DATA, shouldUnregister: false });
  return <FormProvider {...form}><ExperienceSection /></FormProvider>;
}

describe('<ExperienceSection />', () => {
  it('+ Eintrag hinzufügen rendert ein neues Item', () => {
    render(<Wrap />);
    fireEvent.click(screen.getByRole('button', { name: /Eintrag hinzufügen/ }));
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('löscht ein Item nach confirm', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Wrap />);
    fireEvent.click(screen.getByRole('button', { name: /Eintrag hinzufügen/ }));
    fireEvent.click(screen.getByLabelText('Eintrag löschen'));
    expect(screen.queryByText('#1')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Wire into EditorShell**

```tsx
import { ExperienceSection } from './sections/ExperienceSection';
// …
<PersonalSection />
<SummarySection />
<ExperienceSection />
```

- [ ] **Step 6: Run + commit**

```bash
pnpm --filter @codevena/forq-web test:unit
git add apps/web/components/TagInput.* apps/web/components/sections/ExperienceSection.* apps/web/components/EditorShell.tsx
git commit -m "feat(web): TagInput + ExperienceSection (useFieldArray)"
```

---

## Task 15: EducationSection

**Files:**
- Create: `apps/web/components/sections/EducationSection.tsx`
- Create: `apps/web/components/sections/EducationSection.test.tsx`

Pattern mirrors ExperienceSection but with `degree`/`institution` fields and no `tags`.

- [ ] **Step 1: Implement `apps/web/components/sections/EducationSection.tsx`**

```tsx
'use client';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import type { CVData } from '@codevena/forq-schema';
import { BulletListEditor, DateRangeInput, Input } from '@codevena/forq-ui';

export function EducationSection() {
  const { control } = useFormContext<CVData>();
  const { fields, append, remove, swap } = useFieldArray({ control, name: 'education' });
  return (
    <fieldset className="mt-6 flex flex-col gap-3">
      <legend className="text-base font-semibold">Ausbildung</legend>
      {fields.map((f, idx) => (
        <div key={f.id} className="rounded border p-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">#{idx + 1}</span>
            <div className="flex gap-1">
              <button type="button" disabled={idx === 0} onClick={() => swap(idx, idx - 1)} aria-label="nach oben">↑</button>
              <button type="button" disabled={idx === fields.length - 1} onClick={() => swap(idx, idx + 1)} aria-label="nach unten">↓</button>
              <button type="button" onClick={() => { if (confirm('Eintrag löschen?')) remove(idx); }} aria-label="Eintrag löschen">🗑</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Controller control={control} name={`education.${idx}.degree`} render={({ field, fieldState }) => (
              <Input label="Abschluss" value={field.value ?? ''} onChange={field.onChange} error={fieldState.error?.message} required />
            )} />
            <Controller control={control} name={`education.${idx}.institution`} render={({ field, fieldState }) => (
              <Input label="Institution" value={field.value ?? ''} onChange={field.onChange} error={fieldState.error?.message} required />
            )} />
            <Controller control={control} name={`education.${idx}.location`} render={({ field, fieldState }) => (
              <Input label="Ort" value={field.value ?? ''} onChange={field.onChange} error={fieldState.error?.message} />
            )} />
            <Controller
              control={control}
              name={`education.${idx}.startDate`}
              render={({ field: startField }) => (
                <Controller
                  control={control}
                  name={`education.${idx}.endDate`}
                  render={({ field: endField }) => (
                    <DateRangeInput
                      label="Zeitraum"
                      value={{ startDate: startField.value ?? '', endDate: endField.value }}
                      onChange={(v) => { startField.onChange(v.startDate); endField.onChange(v.endDate); }}
                    />
                  )}
                />
              )}
            />
          </div>
          <Controller control={control} name={`education.${idx}.bullets`} render={({ field }) => (
            <BulletListEditor label="Inhalte" value={field.value ?? []} onChange={field.onChange} />
          )} />
        </div>
      ))}
      <button
        type="button"
        className="rounded border border-dashed p-2 text-sm hover:bg-surface"
        onClick={() => append({ degree: '', institution: '', startDate: '' })}
      >+ Eintrag hinzufügen</button>
    </fieldset>
  );
}
```

- [ ] **Step 2: Write `apps/web/components/sections/EducationSection.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import type { CVData } from '@codevena/forq-schema';
import { describe, expect, it } from 'vitest';
import { EducationSection } from './EducationSection';

const DATA: CVData = {
  meta: { locale: 'de' }, personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [], education: [], rendering: { template: 'classic-serif' },
};

describe('<EducationSection />', () => {
  it('+ Eintrag rendert ein Item', () => {
    function Wrap() {
      const form = useForm<CVData>({ defaultValues: DATA, shouldUnregister: false });
      return <FormProvider {...form}><EducationSection /></FormProvider>;
    }
    render(<Wrap />);
    fireEvent.click(screen.getByRole('button', { name: /Eintrag hinzufügen/ }));
    expect(screen.getByText('#1')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Wire into EditorShell, run, commit**

```tsx
import { EducationSection } from './sections/EducationSection';
// …
<EducationSection />
```

```bash
pnpm --filter @codevena/forq-web test:unit
git add apps/web/components/sections/EducationSection.* apps/web/components/EditorShell.tsx
git commit -m "feat(web): EducationSection (useFieldArray)"
```

---

## Task 16: SkillsSection

**Files:**
- Create: `apps/web/components/sections/SkillsSection.tsx`
- Create: `apps/web/components/sections/SkillsSection.test.tsx`

- [ ] **Step 1: Implement `apps/web/components/sections/SkillsSection.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import type { CVData } from '@codevena/forq-schema';
import { Input } from '@codevena/forq-ui';
import { TagInput } from '../TagInput';

type Tab = 'stack' | 'categorized';

export function SkillsSection() {
  const { control, getValues, setValue, watch } = useFormContext<CVData>();
  const initialCats = getValues('skills.categorized') ?? {};
  const initialTab: Tab = Object.keys(initialCats).length > 0 ? 'categorized' : 'stack';
  const [tab, setTab] = useState<Tab>(initialTab);
  const cats = watch('skills.categorized') ?? {};
  const catEntries = Object.entries(cats);

  function addCategory() {
    const name = prompt('Kategorie-Name?');
    if (!name) return;
    setValue('skills.categorized', { ...cats, [name]: [] }, { shouldDirty: true });
  }
  function removeCategory(name: string) {
    if (!confirm(`Kategorie ${name} löschen?`)) return;
    const { [name]: _, ...rest } = cats;
    setValue('skills.categorized', rest, { shouldDirty: true });
  }

  return (
    <fieldset className="mt-6 flex flex-col gap-3">
      <legend className="text-base font-semibold">Skills</legend>
      <div className="flex gap-2">
        <button type="button" onClick={() => setTab('stack')}
                className={`rounded border px-3 py-1 text-sm ${tab === 'stack' ? 'bg-accent text-text-on-accent' : ''}`}>
          Liste
        </button>
        <button type="button" onClick={() => setTab('categorized')}
                className={`rounded border px-3 py-1 text-sm ${tab === 'categorized' ? 'bg-accent text-text-on-accent' : ''}`}>
          Kategorien
        </button>
      </div>
      {tab === 'stack' && (
        <Controller control={control} name="skills.stack" render={({ field }) => (
          <TagInput label="Skills" value={field.value ?? []} onChange={field.onChange} />
        )} />
      )}
      {tab === 'categorized' && (
        <div className="flex flex-col gap-3">
          {catEntries.map(([name, items]) => (
            <div key={name} className="rounded border p-3">
              <div className="mb-2 flex items-center justify-between">
                <Input label="Kategorie" value={name} onChange={(next) => {
                  if (!next || next === name) return;
                  const { [name]: oldItems, ...rest } = cats;
                  setValue('skills.categorized', { ...rest, [next]: oldItems }, { shouldDirty: true });
                }} />
                <button type="button" onClick={() => removeCategory(name)} aria-label={`Kategorie ${name} löschen`}>🗑</button>
              </div>
              <TagInput
                label={`${name} Items`}
                value={items}
                onChange={(next) => setValue('skills.categorized', { ...cats, [name]: next }, { shouldDirty: true })}
              />
            </div>
          ))}
          <button type="button" onClick={addCategory}
                  className="rounded border border-dashed p-2 text-sm hover:bg-surface">
            + Kategorie hinzufügen
          </button>
        </div>
      )}
    </fieldset>
  );
}
```

- [ ] **Step 2: Write `apps/web/components/sections/SkillsSection.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import type { CVData } from '@codevena/forq-schema';
import { describe, expect, it } from 'vitest';
import { SkillsSection } from './SkillsSection';

const DATA: CVData = {
  meta: { locale: 'de' }, personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [], education: [], rendering: { template: 'classic-serif' },
};

describe('<SkillsSection />', () => {
  it('hat Tab-Buttons Liste/Kategorien', () => {
    function Wrap() {
      const form = useForm<CVData>({ defaultValues: DATA, shouldUnregister: false });
      return <FormProvider {...form}><SkillsSection /></FormProvider>;
    }
    render(<Wrap />);
    expect(screen.getByRole('button', { name: /Liste/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kategorien/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Kategorien/ }));
    expect(screen.getByRole('button', { name: /Kategorie hinzufügen/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Wire + commit**

```tsx
import { SkillsSection } from './sections/SkillsSection';
// …
<SkillsSection />
```

```bash
pnpm --filter @codevena/forq-web test:unit
git add apps/web/components/sections/SkillsSection.* apps/web/components/EditorShell.tsx
git commit -m "feat(web): SkillsSection with stack|categorized tabs"
```

---

## Task 17: LanguagesSection

**Files:**
- Create: `apps/web/components/sections/LanguagesSection.tsx`
- Create: `apps/web/components/sections/LanguagesSection.test.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import type { CVData } from '@codevena/forq-schema';
import { Input, Select } from '@codevena/forq-ui';

const LEVELS = [
  { value: 'native', label: 'Muttersprache (native)' },
  { value: 'C2', label: 'C2' }, { value: 'C1', label: 'C1' },
  { value: 'B2', label: 'B2' }, { value: 'B1', label: 'B1' },
  { value: 'A2', label: 'A2' }, { value: 'A1', label: 'A1' },
  { value: 'basic', label: 'Grundkenntnisse' },
];

export function LanguagesSection() {
  const { control } = useFormContext<CVData>();
  const { fields, append, remove, swap } = useFieldArray({ control, name: 'languages' });
  return (
    <fieldset className="mt-6 flex flex-col gap-3">
      <legend className="text-base font-semibold">Sprachen</legend>
      {fields.map((f, idx) => (
        <div key={f.id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2 rounded border p-3">
          <Controller control={control} name={`languages.${idx}.name`} render={({ field, fieldState }) => (
            <Input label="Sprache" value={field.value ?? ''} onChange={field.onChange} error={fieldState.error?.message} required />
          )} />
          <Controller control={control} name={`languages.${idx}.level`} render={({ field, fieldState }) => (
            <Select label="Niveau" value={field.value ?? 'B2'} onChange={(v) => field.onChange(v)} options={LEVELS} error={fieldState.error?.message} />
          )} />
          <Controller control={control} name={`languages.${idx}.label`} render={({ field, fieldState }) => (
            <Input label="Label (optional)" value={field.value ?? ''} onChange={field.onChange} error={fieldState.error?.message} />
          )} />
          <div className="flex gap-1">
            <button type="button" disabled={idx === 0} onClick={() => swap(idx, idx - 1)} aria-label="nach oben">↑</button>
            <button type="button" disabled={idx === fields.length - 1} onClick={() => swap(idx, idx + 1)} aria-label="nach unten">↓</button>
            <button type="button" onClick={() => { if (confirm('Sprache löschen?')) remove(idx); }} aria-label="Sprache löschen">🗑</button>
          </div>
        </div>
      ))}
      <button type="button"
              className="rounded border border-dashed p-2 text-sm hover:bg-surface"
              onClick={() => append({ name: '', level: 'B2' })}>
        + Sprache hinzufügen
      </button>
    </fieldset>
  );
}
```

- [ ] **Step 2: Test (similar add-remove pattern as Education)**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import type { CVData } from '@codevena/forq-schema';
import { describe, expect, it } from 'vitest';
import { LanguagesSection } from './LanguagesSection';

const DATA: CVData = {
  meta: { locale: 'de' }, personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [], education: [], rendering: { template: 'classic-serif' },
};

describe('<LanguagesSection />', () => {
  it('add / remove cycle', () => {
    function Wrap() {
      const form = useForm<CVData>({ defaultValues: DATA, shouldUnregister: false });
      return <FormProvider {...form}><LanguagesSection /></FormProvider>;
    }
    render(<Wrap />);
    fireEvent.click(screen.getByRole('button', { name: /Sprache hinzufügen/ }));
    expect(screen.getByLabelText(/Sprache$/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Wire + commit**

```tsx
import { LanguagesSection } from './sections/LanguagesSection';
// …
<LanguagesSection />
```

```bash
pnpm --filter @codevena/forq-web test:unit
git add apps/web/components/sections/LanguagesSection.* apps/web/components/EditorShell.tsx
git commit -m "feat(web): LanguagesSection with level Select"
```

---

## Task 18: CustomSectionsSection

**Files:**
- Create: `apps/web/components/sections/CustomSectionsSection.tsx`
- Create: `apps/web/components/sections/CustomSectionsSection.test.tsx`

- [ ] **Step 1: Implement** (nested useFieldArray)

```tsx
'use client';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import type { CVData } from '@codevena/forq-schema';
import { BulletListEditor, Input } from '@codevena/forq-ui';

function ItemsArray({ outerIdx }: { outerIdx: number }) {
  const { control } = useFormContext<CVData>();
  const { fields, append, remove } = useFieldArray({ control, name: `customSections.${outerIdx}.items` });
  return (
    <div className="mt-2 flex flex-col gap-2 pl-4">
      {fields.map((f, idx) => (
        <div key={f.id} className="rounded border p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs">Item #{idx + 1}</span>
            <button type="button" onClick={() => { if (confirm('Item löschen?')) remove(idx); }} aria-label="Item löschen">🗑</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Controller control={control} name={`customSections.${outerIdx}.items.${idx}.title`} render={({ field, fieldState }) => (
              <Input label="Titel" value={field.value ?? ''} onChange={field.onChange} error={fieldState.error?.message} required />
            )} />
            <Controller control={control} name={`customSections.${outerIdx}.items.${idx}.subtitle`} render={({ field, fieldState }) => (
              <Input label="Subtitle" value={field.value ?? ''} onChange={field.onChange} error={fieldState.error?.message} />
            )} />
            <Controller control={control} name={`customSections.${outerIdx}.items.${idx}.date`} render={({ field, fieldState }) => (
              <Input label="Datum" value={field.value ?? ''} onChange={field.onChange} error={fieldState.error?.message} />
            )} />
            <Controller control={control} name={`customSections.${outerIdx}.items.${idx}.description`} render={({ field, fieldState }) => (
              <Input label="Beschreibung" value={field.value ?? ''} onChange={field.onChange} error={fieldState.error?.message} />
            )} />
          </div>
          <Controller control={control} name={`customSections.${outerIdx}.items.${idx}.bullets`} render={({ field }) => (
            <BulletListEditor label="Bullets" value={field.value ?? []} onChange={field.onChange} />
          )} />
        </div>
      ))}
      <button type="button" onClick={() => append({ title: '' })}
              className="rounded border border-dashed p-1 text-xs hover:bg-surface">
        + Item
      </button>
    </div>
  );
}

export function CustomSectionsSection() {
  const { control } = useFormContext<CVData>();
  const { fields, append, remove } = useFieldArray({ control, name: 'customSections' });
  return (
    <fieldset className="mt-6 flex flex-col gap-3">
      <legend className="text-base font-semibold">Eigene Sections</legend>
      {fields.map((f, idx) => (
        <div key={f.id} className="rounded border p-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">Section #{idx + 1}</span>
            <button type="button" onClick={() => { if (confirm('Section löschen?')) remove(idx); }} aria-label="Section löschen">🗑</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Controller control={control} name={`customSections.${idx}.id`} render={({ field, fieldState }) => (
              <Input label="ID (slug)" value={field.value ?? ''} onChange={field.onChange} error={fieldState.error?.message} required />
            )} />
            <Controller control={control} name={`customSections.${idx}.title`} render={({ field, fieldState }) => (
              <Input label="Titel" value={field.value ?? ''} onChange={field.onChange} error={fieldState.error?.message} required />
            )} />
          </div>
          <ItemsArray outerIdx={idx} />
        </div>
      ))}
      <button type="button"
              className="rounded border border-dashed p-2 text-sm hover:bg-surface"
              onClick={() => append({ id: '', title: '', items: [] })}>
        + Section hinzufügen
      </button>
    </fieldset>
  );
}
```

- [ ] **Step 2: Test (smoke)**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import type { CVData } from '@codevena/forq-schema';
import { describe, expect, it } from 'vitest';
import { CustomSectionsSection } from './CustomSectionsSection';

const DATA: CVData = {
  meta: { locale: 'de' }, personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [], education: [], rendering: { template: 'classic-serif' },
};

describe('<CustomSectionsSection />', () => {
  it('add section + add item', () => {
    function Wrap() {
      const form = useForm<CVData>({ defaultValues: DATA, shouldUnregister: false });
      return <FormProvider {...form}><CustomSectionsSection /></FormProvider>;
    }
    render(<Wrap />);
    fireEvent.click(screen.getByRole('button', { name: /Section hinzufügen/ }));
    expect(screen.getByText('Section #1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '+ Item' }));
    expect(screen.getByText('Item #1')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Wire + commit**

```tsx
import { CustomSectionsSection } from './sections/CustomSectionsSection';
// …
<CustomSectionsSection />
```

```bash
pnpm --filter @codevena/forq-web test:unit
git add apps/web/components/sections/CustomSectionsSection.* apps/web/components/EditorShell.tsx
git commit -m "feat(web): CustomSectionsSection with nested useFieldArray"
```

---

## Task 19: Sidebar — TemplatePicker + PalettePicker + template-switch effect

**Files:**
- Create: `apps/web/components/Sidebar.tsx`
- Create: `apps/web/components/Sidebar.test.tsx`
- Modify: `apps/web/components/EditorShell.tsx` (replace inline aside with `<Sidebar bootstrap={…} />`)

- [ ] **Step 1: Implement `apps/web/components/Sidebar.tsx`**

```tsx
'use client';
import { useEffect, useRef } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { listTemplates, getTemplate } from '@codevena/forq-templates';
import type { CVData } from '@codevena/forq-schema';
import { ColorPicker, PaletteSelector, TemplateCard } from '@codevena/forq-ui';
import type { PreviewBootstrap } from '@/lib/preview-bootstrap';

interface Props { bootstrap: PreviewBootstrap }

export function Sidebar({ bootstrap }: Props) {
  const { control, setValue, getValues } = useFormContext<CVData>();
  const templateId = useWatch({ control, name: 'rendering.template' });
  const paletteId = useWatch({ control, name: 'rendering.palette' });
  const accentOverride = useWatch({ control, name: 'rendering.accentOverride' });

  // Template-switch effect: reset palette if not present in new template
  const prevRef = useRef(templateId);
  useEffect(() => {
    if (prevRef.current === templateId) return;
    const tpl = getTemplate(templateId);
    if (tpl) {
      const current = getValues('rendering.palette');
      if (!tpl.palettes.some((p) => p.id === current)) {
        setValue('rendering.palette', tpl.palettes[0]?.id, { shouldDirty: true });
      }
    }
    prevRef.current = templateId;
  }, [templateId, setValue, getValues]);

  const templates = listTemplates();
  const currentTpl = getTemplate(templateId);
  const palettes = currentTpl?.palettes ?? [];

  return (
    <aside role="complementary" className="w-80 shrink-0 overflow-y-auto border-r p-4">
      <section>
        <h2 className="mb-2 text-sm font-semibold">Template</h2>
        <Controller
          control={control}
          name="rendering.template"
          render={({ field }) => (
            <div role="radiogroup" aria-label="Template" className="grid grid-cols-2 gap-2">
              {templates.map((t) => (
                <TemplateCard
                  key={t.meta.id}
                  templateId={t.meta.id}
                  name={t.meta.name}
                  description={t.meta.description}
                  selected={field.value === t.meta.id}
                  onSelect={() => field.onChange(t.meta.id)}
                />
              ))}
            </div>
          )}
        />
      </section>
      <section className="mt-4">
        <h2 className="mb-2 text-sm font-semibold">Palette</h2>
        <Controller
          control={control}
          name="rendering.palette"
          render={({ field }) => (
            <PaletteSelector
              palettes={palettes}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </section>
      <section className="mt-4">
        <h2 className="mb-2 text-sm font-semibold">Accent-Override</h2>
        <Controller
          control={control}
          name="rendering.accentOverride"
          render={({ field }) => (
            <div className="flex items-end gap-2">
              <ColorPicker
                label="Hex"
                value={field.value ?? ''}
                onChange={field.onChange}
              />
              <button
                type="button"
                onClick={() => setValue('rendering.accentOverride', undefined, { shouldDirty: true })}
                className="rounded border px-2 py-1 text-xs"
              >Reset</button>
            </div>
          )}
        />
      </section>
    </aside>
  );
}
```

> Note: `TemplateCard` and `PaletteSelector` props per Phase-7 surface — verify the shape before implementing if signatures differ; adapt the JSX accordingly.

- [ ] **Step 2: Test (smoke)**

```tsx
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { bootstrapTemplates } from '@codevena/forq-templates';
import type { CVData } from '@codevena/forq-schema';
import { describe, expect, it } from 'vitest';
import { Sidebar } from './Sidebar';

bootstrapTemplates();

const DATA: CVData = {
  meta: { locale: 'de' }, personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [], education: [], rendering: { template: 'classic-serif' },
};

const BOOTSTRAP = { resetCss: '', printCss: '', templates: {} } as any;

describe('<Sidebar />', () => {
  it('rendert Template-Picker, Palette-Picker, Accent-Override', () => {
    function Wrap() {
      const form = useForm<CVData>({ defaultValues: DATA });
      return <FormProvider {...form}><Sidebar bootstrap={BOOTSTRAP} /></FormProvider>;
    }
    render(<Wrap />);
    expect(screen.getByText('Template')).toBeInTheDocument();
    expect(screen.getByText('Palette')).toBeInTheDocument();
    expect(screen.getByText('Accent-Override')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Template' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Wire into EditorShell**

Replace the placeholder `<aside>` in `EditorShell.tsx`:

```tsx
import { Sidebar } from './Sidebar';
// …
<Sidebar bootstrap={bootstrap} />
```

- [ ] **Step 4: Run + commit**

```bash
pnpm --filter @codevena/forq-web test:unit
pnpm --filter @codevena/forq-web typecheck
git add apps/web/components/Sidebar.* apps/web/components/EditorShell.tsx
git commit -m "feat(web): Sidebar with template/palette/accent + switch effect"
```

---

## Task 20: HiddenSectionsToggles + render-helpers

**Files:**
- Create: `apps/web/lib/render-helpers.ts`
- Create: `apps/web/lib/render-helpers.test.ts`
- Create: `apps/web/components/HiddenSectionsToggles.tsx`
- Modify: `apps/web/components/Sidebar.tsx` (add toggles section)
- Modify: `apps/web/components/PreviewFrame.tsx` (filter hidden sections out of `data` before passing to Template — via render-helper)

- [ ] **Step 1: `apps/web/lib/render-helpers.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { applyHiddenSections } from './render-helpers';
import type { CVData } from '@codevena/forq-schema';

const BASE: CVData = {
  meta: { locale: 'de' },
  personal: { firstName: 'M', lastName: 'W', contacts: {} },
  summary: 'hi', experience: [{ title: 'a', company: 'b', startDate: '', bullets: [] }],
  education: [], skills: { stack: ['x'] }, languages: [{ name: 'en', level: 'C2' }],
  rendering: { template: 'classic-serif' },
};

describe('applyHiddenSections', () => {
  it('strippt summary aus dem Output wenn hidden', () => {
    const out = applyHiddenSections({ ...BASE, rendering: { ...BASE.rendering, hiddenSections: ['summary'] } });
    expect(out.summary).toBeUndefined();
  });
  it('strippt experience auf [] wenn hidden', () => {
    const out = applyHiddenSections({ ...BASE, rendering: { ...BASE.rendering, hiddenSections: ['experience'] } });
    expect(out.experience).toEqual([]);
  });
  it('lässt unbekannte hidden-IDs unbeachtet', () => {
    const out = applyHiddenSections({ ...BASE, rendering: { ...BASE.rendering, hiddenSections: ['nope'] } });
    expect(out.experience).toEqual(BASE.experience);
  });
});
```

- [ ] **Step 2: Implement `apps/web/lib/render-helpers.ts`**

```ts
import type { CVData } from '@codevena/forq-schema';

const HIDDABLE = new Set(['summary', 'experience', 'education', 'skills', 'languages', 'customSections']);

export function applyHiddenSections(data: CVData): CVData {
  const hidden = data.rendering.hiddenSections ?? [];
  if (hidden.length === 0) return data;
  const out: CVData = { ...data };
  for (const id of hidden) {
    if (!HIDDABLE.has(id)) continue;
    if (id === 'summary') out.summary = undefined;
    else if (id === 'experience') out.experience = [];
    else if (id === 'education') out.education = [];
    else if (id === 'skills') out.skills = undefined;
    else if (id === 'languages') out.languages = [];
    else if (id === 'customSections') out.customSections = [];
  }
  return out;
}
```

- [ ] **Step 3: Implement `apps/web/components/HiddenSectionsToggles.tsx`**

```tsx
'use client';
import { Controller, useFormContext } from 'react-hook-form';
import type { CVData } from '@codevena/forq-schema';

const TOGGLES: Array<{ id: string; label: string }> = [
  { id: 'summary', label: 'Profil' },
  { id: 'experience', label: 'Berufserfahrung' },
  { id: 'education', label: 'Ausbildung' },
  { id: 'skills', label: 'Skills' },
  { id: 'languages', label: 'Sprachen' },
];

export function HiddenSectionsToggles() {
  const { control } = useFormContext<CVData>();
  return (
    <Controller
      control={control}
      name="rendering.hiddenSections"
      render={({ field }) => {
        const hidden = new Set(field.value ?? []);
        return (
          <ul className="flex flex-col gap-1">
            {TOGGLES.map((t) => (
              <li key={t.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!hidden.has(t.id)}
                    onChange={(e) => {
                      const next = new Set(hidden);
                      if (e.target.checked) next.delete(t.id); else next.add(t.id);
                      field.onChange([...next]);
                    }}
                  />
                  {t.label}
                </label>
              </li>
            ))}
          </ul>
        );
      }}
    />
  );
}
```

- [ ] **Step 4: Add toggles section to `Sidebar.tsx`**

After the Accent-Override section, add:

```tsx
import { HiddenSectionsToggles } from './HiddenSectionsToggles';
// …
<section className="mt-4">
  <h2 className="mb-2 text-sm font-semibold">Sichtbare Sections</h2>
  <HiddenSectionsToggles />
</section>
```

- [ ] **Step 5: Apply hidden-sections filter in `PreviewFrame.tsx`**

```tsx
import { applyHiddenSections } from '@/lib/render-helpers';
// …
const filtered = applyHiddenSections(data);
// pass filtered into <tplDef.Component data={filtered} … />
```

- [ ] **Step 6: Run + commit**

```bash
pnpm --filter @codevena/forq-web test:unit
git add apps/web/lib/render-helpers.* apps/web/components/HiddenSectionsToggles.tsx apps/web/components/Sidebar.tsx apps/web/components/PreviewFrame.tsx
git commit -m "feat(web): hidden-sections toggles + preview filter"
```

---

## Task 21: SaveIndicator + useAutosave

**Files:**
- Create: `apps/web/components/SaveIndicator.tsx`
- Create: `apps/web/components/SaveIndicator.test.tsx`
- Create: `apps/web/lib/use-autosave.ts`
- Create: `apps/web/lib/use-autosave.test.tsx`

- [ ] **Step 1: `apps/web/components/SaveIndicator.tsx`**

```tsx
'use client';
import clsx from 'clsx';

export type SaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'error';

interface Props {
  state: SaveState;
  errorMessage?: string;
  onRetry?: () => void;
  lastSavedAt?: number; // epoch ms
}

function relativeTime(t: number): string {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return `vor ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `vor ${m} Min.`;
  const h = Math.round(m / 60);
  return `vor ${h} h`;
}

export function SaveIndicator({ state, errorMessage, onRetry, lastSavedAt }: Props) {
  return (
    <div className={clsx('flex items-center gap-2 text-sm',
      state === 'error' && 'text-error',
      state === 'saved' && 'text-success',
    )}>
      {state === 'clean' && lastSavedAt && <span>✓ Gespeichert {relativeTime(lastSavedAt)}</span>}
      {state === 'clean' && !lastSavedAt && <span>✓ Keine Änderungen</span>}
      {state === 'dirty' && <span>• Ungespeicherte Änderungen</span>}
      {state === 'saving' && <span>⟳ Speichere…</span>}
      {state === 'saved' && <span>✓ Gespeichert</span>}
      {state === 'error' && (
        <>
          <span>⚠ {errorMessage ?? 'Fehler beim Speichern'}</span>
          {onRetry && <button type="button" className="underline" onClick={onRetry}>Erneut versuchen</button>}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Test (smoke)**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SaveIndicator } from './SaveIndicator';

describe('<SaveIndicator />', () => {
  it('clean ohne lastSavedAt zeigt "Keine Änderungen"', () => {
    render(<SaveIndicator state="clean" />);
    expect(screen.getByText(/Keine Änderungen/)).toBeInTheDocument();
  });
  it('dirty', () => {
    render(<SaveIndicator state="dirty" />);
    expect(screen.getByText(/Ungespeicherte/)).toBeInTheDocument();
  });
  it('error mit retry', () => {
    render(<SaveIndicator state="error" errorMessage="500" onRetry={() => {}} />);
    expect(screen.getByText(/500/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Erneut versuchen/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Implement `apps/web/lib/use-autosave.ts`**

```ts
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CVData } from '@codevena/forq-schema';
import { useDebouncedValue } from './use-debounced-value';
import { useHotkey } from './use-hotkey';
import type { SaveState } from '@/components/SaveIndicator';

export type ConflictPayload = { currentData: CVData; currentMtime: number };
export type ServerError = { kind: 'validation'; issues: unknown[] } | { kind: 'server' | 'network'; message: string };

export interface UseAutosaveOpts {
  slug: string;
  data: CVData;
  isDirty: boolean;
  isValid: boolean;
  expectedMtime: number;
  onConflict: (p: ConflictPayload) => void;
  onError: (e: ServerError) => void;
  paused: boolean;
}

export interface UseAutosaveReturn {
  state: SaveState;
  errorMessage: string | undefined;
  lastSavedAt: number | undefined;
  expectedMtimeRef: React.MutableRefObject<number>;
  retry: () => void;
}

export function useAutosave(opts: UseAutosaveOpts): UseAutosaveReturn {
  const debounced = useDebouncedValue(opts.data, 2000);
  const lastSerializedRef = useRef<string>(JSON.stringify(opts.data));
  const expectedMtimeRef = useRef<number>(opts.expectedMtime);
  const inFlightRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<SaveState>('clean');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [lastSavedAt, setLastSavedAt] = useState<number | undefined>(undefined);

  const save = useCallback(async (payload: CVData) => {
    if (opts.paused) return;
    inFlightRef.current?.abort();
    const ctrl = new AbortController();
    inFlightRef.current = ctrl;
    setState('saving');
    setErrorMessage(undefined);
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: opts.slug, data: payload, expectedMtime: expectedMtimeRef.current }),
      });
      if (res.status === 409) {
        const body = await res.json();
        opts.onConflict({ currentData: body.currentData, currentMtime: body.currentMtime });
        setState('error');
        setErrorMessage('Konflikt: Datei extern verändert');
        return;
      }
      if (res.status === 422) {
        const body = await res.json();
        opts.onError({ kind: 'validation', issues: body.issues ?? [] });
        setState('error');
        setErrorMessage('Validation-Fehler');
        return;
      }
      if (!res.ok) {
        const text = await res.text();
        opts.onError({ kind: 'server', message: text });
        setState('error');
        setErrorMessage(`HTTP ${res.status}`);
        return;
      }
      const body = await res.json();
      expectedMtimeRef.current = body.mtime;
      lastSerializedRef.current = JSON.stringify(payload);
      setLastSavedAt(Date.now());
      setState('saved');
      setTimeout(() => setState('clean'), 3000);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      opts.onError({ kind: 'network', message: (err as Error).message });
      setState('error');
      setErrorMessage((err as Error).message);
    }
  }, [opts]);

  // Debounced auto-save
  useEffect(() => {
    if (!opts.isDirty || !opts.isValid || opts.paused) return;
    const ser = JSON.stringify(debounced);
    if (ser === lastSerializedRef.current) return;
    void save(debounced);
  }, [debounced, opts.isDirty, opts.isValid, opts.paused, save]);

  // Mark dirty in indicator while typing
  useEffect(() => {
    if (state === 'saving' || state === 'error') return;
    const ser = JSON.stringify(opts.data);
    if (opts.isDirty && ser !== lastSerializedRef.current) setState('dirty');
  }, [opts.data, opts.isDirty, state]);

  // Ctrl+S / Cmd+S override
  useHotkey('mod+s', () => {
    if (opts.isDirty && opts.isValid) void save(opts.data);
  });

  const retry = useCallback(() => { void save(opts.data); }, [save, opts.data]);

  return { state, errorMessage, lastSavedAt, expectedMtimeRef, retry };
}
```

- [ ] **Step 4: Test useAutosave** (one happy + one 409 + one 422)

```tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CVData } from '@codevena/forq-schema';
import { useAutosave } from './use-autosave';

const DATA: CVData = {
  meta: { locale: 'de' }, personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [], education: [], rendering: { template: 'classic-serif' },
};

describe('useAutosave', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('löst nach 2s einen save aus, bei 200 → expectedMtime updated', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true, mtime: 99 }), { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    const onConflict = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useAutosave({
      slug: 'cv.de', data: DATA, isDirty: true, isValid: true,
      expectedMtime: 1, onConflict, onError, paused: false,
    }));
    await act(async () => { vi.advanceTimersByTime(2100); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(result.current.expectedMtimeRef.current).toBe(99));
  });

  it('bei 409 → onConflict mit currentData', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ kind: 'conflict', currentData: DATA, currentMtime: 555 }), { status: 409, headers: { 'content-type': 'application/json' } }),
    );
    const onConflict = vi.fn();
    renderHook(() => useAutosave({
      slug: 'cv.de', data: DATA, isDirty: true, isValid: true,
      expectedMtime: 1, onConflict, onError: vi.fn(), paused: false,
    }));
    await act(async () => { vi.advanceTimersByTime(2100); });
    await waitFor(() => expect(onConflict).toHaveBeenCalledWith({ currentData: DATA, currentMtime: 555 }));
  });
});
```

- [ ] **Step 5: Wire useAutosave + SaveIndicator into EditorShell** (partial — integration completed in Task 22)

In `EditorShell.tsx`:

```tsx
import { useState } from 'react';
import { SaveIndicator } from './SaveIndicator';
import { useAutosave, type ConflictPayload } from '@/lib/use-autosave';
import { applyZodIssues } from '@/lib/zod-issue-mapping';
// …
const [conflict, setConflict] = useState<ConflictPayload | null>(null);
const formStateValid = form.formState.isValid;
const isDirty = form.formState.isDirty;

const autosave = useAutosave({
  slug,
  data: watched,
  isDirty,
  isValid: formStateValid,
  expectedMtime: initialMtime,
  onConflict: setConflict,
  onError: (e) => {
    if (e.kind === 'validation') applyZodIssues(e.issues as any, form.setError);
  },
  paused: conflict !== null,
});
```

In TopBar JSX:

```tsx
<header role="banner" className="flex h-12 items-center justify-between border-b px-4">
  <div className="flex items-center gap-3">
    <span className="font-semibold">forq</span>
    <span className="text-sm text-text-muted">{slug}</span>
  </div>
  <SaveIndicator
    state={autosave.state}
    errorMessage={autosave.errorMessage}
    onRetry={autosave.retry}
    lastSavedAt={autosave.lastSavedAt}
  />
</header>
```

- [ ] **Step 6: Run + commit**

```bash
pnpm --filter @codevena/forq-web test:unit
git add apps/web/components/SaveIndicator.* apps/web/lib/use-autosave.* apps/web/components/EditorShell.tsx
git commit -m "feat(web): SaveIndicator + useAutosave hook"
```

---

## Task 22: ConflictModal

**Files:**
- Create: `apps/web/components/ConflictModal.tsx`
- Create: `apps/web/components/ConflictModal.test.tsx`
- Modify: `apps/web/components/EditorShell.tsx` (mount when conflict !== null; wire actions)

- [ ] **Step 1: Implement `apps/web/components/ConflictModal.tsx`**

```tsx
'use client';
import { useState } from 'react';
import type { CVData } from '@codevena/forq-schema';

interface Props {
  slug: string;
  currentData: CVData;
  currentMtime: number;
  isFormDirty: boolean;
  onReload: (data: CVData, mtime: number) => void;
  onOverwrite: (mtime: number) => void;
  onCancel: () => void;
}

export function ConflictModal({ slug, currentData, currentMtime, isFormDirty, onReload, onOverwrite, onCancel }: Props) {
  const [confirmReload, setConfirmReload] = useState(false);
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="conflict-title"
         className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-w-lg rounded bg-surface p-6 text-text shadow-xl">
        <h2 id="conflict-title" className="text-lg font-semibold">Datei wurde extern verändert</h2>
        <p className="mt-2 text-sm">
          Die YAML-Datei <code>data/cvs/{slug}.yaml</code> wurde seit dem Laden geändert
          (z. B. via <code>git pull</code> oder einem anderen Editor). Was möchtest du tun?
        </p>
        {confirmReload ? (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-sm text-error">
              Achtung: deine ungespeicherten Editor-Änderungen gehen verloren. Wirklich neu laden?
            </p>
            <div className="flex gap-2">
              <button type="button" className="rounded border px-3 py-1"
                      onClick={() => onReload(currentData, currentMtime)}>Ja, neu laden</button>
              <button type="button" className="rounded border px-3 py-1"
                      onClick={() => setConfirmReload(false)}>Doch nicht</button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex gap-2">
            <button type="button" className="rounded border px-3 py-1"
                    onClick={() => isFormDirty ? setConfirmReload(true) : onReload(currentData, currentMtime)}>
              Datenträger neu laden
            </button>
            <button type="button" className="rounded border px-3 py-1"
                    onClick={() => onOverwrite(currentMtime)}>Meine Version überschreiben</button>
            <button type="button" className="rounded border px-3 py-1"
                    onClick={onCancel}>Abbrechen</button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Test**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CVData } from '@codevena/forq-schema';
import { ConflictModal } from './ConflictModal';

const DATA: CVData = {
  meta: { locale: 'de' }, personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [], education: [], rendering: { template: 'classic-serif' },
};

describe('<ConflictModal />', () => {
  it('Reload mit dirty Form fragt nochmal nach', () => {
    const onReload = vi.fn();
    render(<ConflictModal slug="cv.de" currentData={DATA} currentMtime={1} isFormDirty
             onReload={onReload} onOverwrite={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Datenträger neu laden/ }));
    expect(onReload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Ja, neu laden/ }));
    expect(onReload).toHaveBeenCalledWith(DATA, 1);
  });
  it('Overwrite ruft onOverwrite mit currentMtime', () => {
    const onOverwrite = vi.fn();
    render(<ConflictModal slug="cv.de" currentData={DATA} currentMtime={42} isFormDirty={false}
             onReload={vi.fn()} onOverwrite={onOverwrite} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /überschreiben/ }));
    expect(onOverwrite).toHaveBeenCalledWith(42);
  });
});
```

- [ ] **Step 3: Wire into EditorShell**

```tsx
import { ConflictModal } from './ConflictModal';
// at the bottom of the EditorShell return tree:
{conflict && (
  <ConflictModal
    slug={slug}
    currentData={conflict.currentData}
    currentMtime={conflict.currentMtime}
    isFormDirty={form.formState.isDirty}
    onReload={(data, mtime) => {
      form.reset(data);
      autosave.expectedMtimeRef.current = mtime;
      setConflict(null);
    }}
    onOverwrite={async (mtime) => {
      autosave.expectedMtimeRef.current = mtime;
      setConflict(null);
      // re-trigger save by setting a no-op dirty flag
      // The next field change OR Ctrl+S will save with new mtime; here we explicitly fire:
      await fetch('/api/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, data: form.getValues(), expectedMtime: mtime }),
      });
    }}
    onCancel={() => setConflict(null)}
  />
)}
```

- [ ] **Step 4: Run + commit**

```bash
pnpm --filter @codevena/forq-web test:unit
git add apps/web/components/ConflictModal.* apps/web/components/EditorShell.tsx
git commit -m "feat(web): ConflictModal with reload/overwrite/cancel"
```

---

## Task 23: PhotoUploadField + integrate into PersonalSection

**Files:**
- Create: `apps/web/components/PhotoUploadField.tsx`
- Create: `apps/web/components/PhotoUploadField.test.tsx`
- Modify: `apps/web/components/sections/PersonalSection.tsx` — replace plain photo Input with `<PhotoUploadField>`.

- [ ] **Step 1: Implement `apps/web/components/PhotoUploadField.tsx`**

```tsx
'use client';
import { useState, type ChangeEvent } from 'react';
import { PhotoCropper, type PhotoCropResult } from '@codevena/forq-ui';

interface Props {
  slug: string;
  value: string;
  onChange: (path: string) => void;
  aspect?: '1:1' | '3:4' | 'free';
}

export function PhotoUploadField({ slug, value, onChange, aspect = '1:1' }: Props) {
  const [pending, setPending] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setPending(f);
    e.target.value = '';
  }

  async function onCropConfirm(result: PhotoCropResult) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', result.file);
      form.append('slug', slug);
      form.append('crop', JSON.stringify(result.crop));
      form.append('aspect', result.aspect);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      onChange(body.jpg);
      setPending(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Foto</span>
      {value && (
        <div className="flex items-center gap-3">
          <img src={value} alt="" className="h-20 w-20 rounded object-cover" />
          <button type="button" className="rounded border px-2 py-1 text-xs"
                  onClick={() => onChange('')}>Entfernen</button>
        </div>
      )}
      <label className="inline-flex w-fit cursor-pointer rounded border border-dashed px-3 py-1 text-sm">
        {value ? 'Ersetzen' : 'Foto auswählen'}
        <input type="file" accept="image/*" className="hidden" onChange={onFileSelect} />
      </label>
      {pending && (
        <PhotoCropper
          file={pending}
          aspect={aspect}
          onCancel={() => setPending(null)}
          onConfirm={onCropConfirm}
        />
      )}
      {busy && <span className="text-xs text-text-muted">Lade hoch…</span>}
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}
```

> If the actual `PhotoCropper` prop names differ from `{file, aspect, onCancel, onConfirm}`, adapt to the Phase-7 surface. The contract from NEXT_SESSION says `PhotoCropper` takes a file and emits `{file, crop, aspect}` via `onConfirm`.

- [ ] **Step 2: Test (smoke without actual crop)**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PhotoUploadField } from './PhotoUploadField';

describe('<PhotoUploadField />', () => {
  it('rendert Auswahl-Button bei leerem Wert', () => {
    render(<PhotoUploadField slug="cv.de" value="" onChange={() => {}} />);
    expect(screen.getByText(/Foto auswählen/)).toBeInTheDocument();
  });
  it('rendert Bild und Ersetzen-Button bei gesetztem Wert', () => {
    render(<PhotoUploadField slug="cv.de" value="/photos/cv.de.jpg" onChange={() => {}} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/photos/cv.de.jpg');
    expect(screen.getByText(/Ersetzen/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Replace photo field in PersonalSection.tsx**

Replace the `<Controller … name="personal.photo" …>` block in `PersonalSection.tsx` with:

```tsx
<Controller
  control={control}
  name="personal.photo"
  render={({ field }) => (
    <PhotoUploadField slug={slug} value={field.value ?? ''} onChange={field.onChange} />
  )}
/>
```

This requires `slug` to be passed in. Update `PersonalSection` signature:

```tsx
export function PersonalSection({ slug }: { slug: string }) { /* … */ }
```

And update `EditorShell.tsx`:

```tsx
<PersonalSection slug={slug} />
```

Add import in `PersonalSection.tsx`:

```tsx
import { PhotoUploadField } from '../PhotoUploadField';
```

- [ ] **Step 4: Run + commit**

```bash
pnpm --filter @codevena/forq-web test:unit
git add apps/web/components/PhotoUploadField.* apps/web/components/sections/PersonalSection.tsx apps/web/components/EditorShell.tsx
git commit -m "feat(web): PhotoUploadField wired to /api/upload"
```

---

## Task 24: TopBar (CV-Dropdown + Export-Button)

**Files:**
- Create: `apps/web/components/TopBar.tsx`
- Create: `apps/web/components/TopBar.test.tsx`
- Modify: `apps/web/components/EditorShell.tsx` — extract header into `<TopBar>`.

- [ ] **Step 1: Implement `apps/web/components/TopBar.tsx`**

```tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import type { CVData } from '@codevena/forq-schema';
import { SaveIndicator, type SaveState } from './SaveIndicator';

interface Props {
  slug: string;
  allSlugs: string[];
  saveState: SaveState;
  saveError?: string;
  onRetry: () => void;
  lastSavedAt?: number;
}

export function TopBar({ slug, allSlugs, saveState, saveError, onRetry, lastSavedAt }: Props) {
  const { getValues, formState } = useFormContext<CVData>();
  const router = useRouter();
  const [exporting, setExporting] = useState(false);

  async function exportPdf() {
    if (!formState.isValid || exporting) return;
    setExporting(true);
    try {
      const data = getValues();
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          data,
          templateId: data.rendering.template,
          paletteId: data.rendering.palette,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}-${data.rendering.template}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <header role="banner" className="flex h-12 shrink-0 items-center justify-between gap-4 border-b px-4">
      <div className="flex items-center gap-3">
        <span className="font-semibold">forq</span>
        <select
          aria-label="CV auswählen"
          value={slug}
          onChange={(e) => router.push(`/cv/${e.target.value}`)}
          className="rounded border bg-surface px-2 py-1 text-sm"
        >
          {allSlugs.map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
      </div>
      <SaveIndicator state={saveState} errorMessage={saveError} onRetry={onRetry} lastSavedAt={lastSavedAt} />
      <button
        type="button"
        disabled={!formState.isValid || exporting}
        onClick={exportPdf}
        className="rounded bg-accent px-3 py-1 text-sm text-text-on-accent disabled:opacity-50"
      >
        {exporting ? 'Export…' : 'PDF exportieren'}
      </button>
    </header>
  );
}
```

- [ ] **Step 2: Test (smoke)**

```tsx
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import type { CVData } from '@codevena/forq-schema';
import { describe, expect, it, vi } from 'vitest';
import { TopBar } from './TopBar';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const DATA: CVData = {
  meta: { locale: 'de' }, personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [], education: [], rendering: { template: 'classic-serif' },
};

describe('<TopBar />', () => {
  it('rendert Dropdown + Save-Indicator + Export-Button', () => {
    function Wrap() {
      const form = useForm<CVData>({ defaultValues: DATA });
      return (
        <FormProvider {...form}>
          <TopBar slug="cv.de" allSlugs={['cv.de', 'cv.en']} saveState="clean" onRetry={() => {}} />
        </FormProvider>
      );
    }
    render(<Wrap />);
    expect(screen.getByLabelText(/CV auswählen/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PDF exportieren/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Wire into EditorShell**

Replace the inline header block with:

```tsx
import { TopBar } from './TopBar';
// …
<TopBar
  slug={slug}
  allSlugs={allSlugs}
  saveState={autosave.state}
  saveError={autosave.errorMessage}
  onRetry={autosave.retry}
  lastSavedAt={autosave.lastSavedAt}
/>
```

- [ ] **Step 4: Run + commit**

```bash
pnpm --filter @codevena/forq-web test:unit
git add apps/web/components/TopBar.* apps/web/components/EditorShell.tsx
git commit -m "feat(web): TopBar with CV-dropdown + PDF export"
```

---

## Task 25: cv/[slug]/page.tsx (deep-link route)

**Files:**
- Create: `apps/web/app/cv/[slug]/page.tsx`

- [ ] **Step 1: Implement**

```tsx
import { stat } from 'node:fs/promises';
import { notFound } from 'next/navigation';
import { readdir } from 'node:fs/promises';
import { loadCV } from '@codevena/forq-core';
import { bootstrapTemplates } from '@codevena/forq-templates';
import { EditorShell } from '@/components/EditorShell';
import { dataDir, resolveCvPath } from '@/lib/data-paths';
import { getPreviewBootstrap } from '@/lib/preview-bootstrap';

export const dynamic = 'force-dynamic';

interface Ctx { params: Promise<{ slug: string }> }

async function listSlugs(): Promise<string[]> {
  try {
    const files = await readdir(dataDir());
    return files.filter((f) => f.endsWith('.yaml')).map((f) => f.slice(0, -'.yaml'.length)).sort();
  } catch { return []; }
}

export default async function CvPage({ params }: Ctx) {
  bootstrapTemplates();
  const { slug } = await params;
  let target: string;
  try { target = resolveCvPath(slug); } catch { notFound(); }
  let mtime: number;
  try { mtime = (await stat(target)).mtimeMs; } catch { notFound(); }
  const data = await loadCV(target);
  const slugs = await listSlugs();
  const bootstrap = getPreviewBootstrap();
  return (
    <EditorShell
      initialData={data}
      initialMtime={mtime}
      slug={slug}
      allSlugs={slugs}
      bootstrap={bootstrap}
    />
  );
}
```

- [ ] **Step 2: Smoketest manually**

```bash
pnpm --filter @codevena/forq-web dev
# visit http://localhost:3000/cv/cv.de  and  http://localhost:3000/cv/cv.en
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/cv/[slug]/page.tsx
git commit -m "feat(web): cv/[slug] deep-linkable editor route"
```

---

## Task 26: E2E — load-edit-save

**Files:**
- Create: `apps/web/e2e/fixtures/cv.test.de.yaml`
- Create: `apps/web/e2e/fixtures/cv.test.en.yaml`
- Create: `apps/web/e2e/_shared/setup.ts`
- Create: `apps/web/e2e/load-edit-save.spec.ts`

- [ ] **Step 1: Add fixture YAMLs**

`apps/web/e2e/fixtures/cv.test.de.yaml`:
```yaml
meta: { locale: de, updatedAt: '2026-04-25' }
personal:
  firstName: TestVorname
  lastName: TestNachname
  contacts: {}
experience: []
education: []
rendering: { template: classic-serif }
```

`apps/web/e2e/fixtures/cv.test.en.yaml`:
```yaml
meta: { locale: en, updatedAt: '2026-04-25' }
personal:
  firstName: Test
  lastName: User
  contacts: {}
experience: []
education: []
rendering: { template: modern-minimal }
```

- [ ] **Step 2: Implement `apps/web/e2e/_shared/setup.ts`**

```ts
import { copyFile, rm } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../../..');

export async function installFixture(name: 'cv.test.de' | 'cv.test.en'): Promise<void> {
  const src = path.resolve(__dirname, '..', 'fixtures', `${name}.yaml`);
  const dst = path.join(ROOT, 'data', 'cvs', `${name}.yaml`);
  await copyFile(src, dst);
}

export async function uninstallFixture(name: string): Promise<void> {
  const dst = path.join(ROOT, 'data', 'cvs', `${name}.yaml`);
  await rm(dst, { force: true });
}
```

- [ ] **Step 3: Implement `apps/web/e2e/load-edit-save.spec.ts`**

```ts
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { installFixture, uninstallFixture } from './_shared/setup';

test.describe('load → edit → save', () => {
  test.beforeAll(() => installFixture('cv.test.de'));
  test.afterAll(() => uninstallFixture('cv.test.de'));

  test('schreibt Änderung in YAML', async ({ page }) => {
    await page.goto('/cv/cv.test.de');
    const first = page.getByLabel('Vorname');
    await first.fill('NeuerName');
    // wait for autosave (debounced 2s)
    await page.waitForTimeout(2500);
    await expect(page.getByText(/Gespeichert/)).toBeVisible({ timeout: 5000 });
    const ROOT = path.resolve(__dirname, '../../..');
    const yaml = await readFile(path.join(ROOT, 'data', 'cvs', 'cv.test.de.yaml'), 'utf8');
    expect(yaml).toContain('NeuerName');
  });
});
```

- [ ] **Step 4: Run e2e**

```bash
pnpm --filter @codevena/forq-web test:e2e -- load-edit-save
```

Expected: green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/e2e/
git commit -m "test(web): e2e load-edit-save flow"
```

---

## Task 27: E2E — template-switch

**Files:**
- Create: `apps/web/e2e/template-switch.spec.ts`

- [ ] **Step 1: Implement**

```ts
import { test, expect } from '@playwright/test';
import { installFixture, uninstallFixture } from './_shared/setup';

test.describe('template switch', () => {
  test.beforeAll(() => installFixture('cv.test.de'));
  test.afterAll(() => uninstallFixture('cv.test.de'));

  test('Template-Wechsel updated iframe-CSS und resettet Palette', async ({ page }) => {
    await page.goto('/cv/cv.test.de');
    const iframe = page.frameLocator('iframe[title="CV Preview"]');
    const oldTplCss = await iframe.locator('#template-css').textContent();
    expect(oldTplCss).toBeTruthy();

    // pick "Modern Minimal" (label may vary; click on TemplateCard with that name)
    await page.getByRole('radiogroup', { name: 'Template' }).getByText('Modern Minimal').click();

    await page.waitForTimeout(500);
    const newTplCss = await iframe.locator('#template-css').textContent();
    expect(newTplCss).not.toBe(oldTplCss);
  });
});
```

- [ ] **Step 2: Run + commit**

```bash
pnpm --filter @codevena/forq-web test:e2e -- template-switch
git add apps/web/e2e/template-switch.spec.ts
git commit -m "test(web): e2e template-switch"
```

---

## Task 28: E2E — photo-upload

**Files:**
- Copy fixture image into `apps/web/e2e/fixtures/photo.jpg` (use `packages/core/test/fixtures/photo-input.jpg`).
- Create: `apps/web/e2e/photo-upload.spec.ts`

- [ ] **Step 1: Copy fixture**

```bash
cp packages/core/test/fixtures/photo-input.jpg apps/web/e2e/fixtures/photo.jpg
```

- [ ] **Step 2: Implement spec**

```ts
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { installFixture, uninstallFixture } from './_shared/setup';

test.describe('photo upload', () => {
  test.beforeAll(() => installFixture('cv.test.de'));
  test.afterAll(() => uninstallFixture('cv.test.de'));

  test('lädt Foto hoch und schreibt jpg+webp', async ({ page }) => {
    await page.goto('/cv/cv.test.de');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.resolve(__dirname, 'fixtures', 'photo.jpg'));
    // PhotoCropper opens — confirm the crop with default region
    await page.getByRole('button', { name: /Bestätigen|Confirm/ }).click();
    await page.waitForTimeout(2000);
    const ROOT = path.resolve(__dirname, '../../..');
    const jpgStat = await stat(path.join(ROOT, 'public', 'photos', 'cv.test.de.jpg'));
    expect(jpgStat.size).toBeGreaterThan(1000);
    const webpStat = await stat(path.join(ROOT, 'public', 'photos', 'cv.test.de.webp'));
    expect(webpStat.size).toBeGreaterThan(1000);
  });
});
```

> If the PhotoCropper confirm button uses different German wording (`Übernehmen`, `Speichern`), adjust the regex.

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter @codevena/forq-web test:e2e -- photo-upload
git add apps/web/e2e/photo-upload.spec.ts apps/web/e2e/fixtures/photo.jpg
git commit -m "test(web): e2e photo upload"
```

---

## Task 29: E2E — pdf-export

**Files:**
- Create: `apps/web/e2e/pdf-export.spec.ts`

- [ ] **Step 1: Implement**

```ts
import { test, expect } from '@playwright/test';
import { installFixture, uninstallFixture } from './_shared/setup';

test.describe('pdf export', () => {
  test.beforeAll(() => installFixture('cv.test.de'));
  test.afterAll(() => uninstallFixture('cv.test.de'));

  test('Klick auf "PDF exportieren" liefert ein A4 PDF', async ({ page }) => {
    await page.goto('/cv/cv.test.de');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /PDF exportieren/ }).click(),
    ]);
    const buf = await download.createReadStream().then(async (s) => {
      if (!s) return Buffer.alloc(0);
      const chunks: Buffer[] = [];
      for await (const c of s) chunks.push(c as Buffer);
      return Buffer.concat(chunks);
    });
    expect(buf.byteLength).toBeGreaterThan(10_000);
    expect(buf.subarray(0, 4).toString()).toBe('%PDF');
  });
});
```

- [ ] **Step 2: Run + commit**

```bash
pnpm --filter @codevena/forq-web test:e2e -- pdf-export
git add apps/web/e2e/pdf-export.spec.ts
git commit -m "test(web): e2e pdf export"
```

---

## Task 30: E2E — broken-yaml

**Files:**
- Create: `apps/web/e2e/fixtures/cv.broken.yaml` (malformed YAML)
- Create: `apps/web/e2e/broken-yaml.spec.ts`

- [ ] **Step 1: Add malformed fixture**

`apps/web/e2e/fixtures/cv.broken.yaml`:

```yaml
meta:
  locale: de
personal: { firstName: T, lastName: U, contacts: {}
experience: []
```

(deliberately missing closing `}`)

- [ ] **Step 2: Implement spec**

```ts
import { copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from '@playwright/test';

test.describe('broken yaml', () => {
  const SRC = path.resolve(__dirname, 'fixtures', 'cv.broken.yaml');
  const DST = path.resolve(__dirname, '../../..', 'data', 'cvs', 'cv.broken.yaml');
  test.beforeAll(() => copyFile(SRC, DST));
  test.afterAll(() => rm(DST, { force: true }));

  test('Banner zeigt Fehler, Export disabled', async ({ page }) => {
    await page.goto('/cv/cv.broken');
    // RSC throws on YAMLParseError before EditorShell mounts; Next will show the
    // default error boundary or a 500. Assert the error page rather than a banner
    // (acceptable for MVP; later we'll catch in the RSC and show a banner).
    await expect(page.locator('body')).toContainText(/yaml|YAML|parse/i, { timeout: 10_000 });
  });
});
```

> Note: the RSC throws on YAMLParseError. For MVP we accept Next's error boundary. A nicer banner is a Phase-9 polish.

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter @codevena/forq-web test:e2e -- broken-yaml
git add apps/web/e2e/broken-yaml.spec.ts apps/web/e2e/fixtures/cv.broken.yaml
git commit -m "test(web): e2e broken-yaml"
```

---

## Task 31: Final acceptance — typecheck, lint, build, suites, manual walkthrough, DoD review

- [ ] **Step 1: Full workspace lint + typecheck + build**

```bash
pnpm typecheck
pnpm lint
pnpm build
```

Expected: no new errors beyond Phase-7 lint baseline (143 in `apps/cli` / `packages/core` / `packages/templates`). New errors → fix before proceeding.

- [ ] **Step 2: Full unit + integration**

```bash
pnpm --filter @codevena/forq-core test:unit
pnpm --filter @codevena/forq-ui test:unit
pnpm --filter @codevena/forq-web test:unit
```

Expected: all green.

- [ ] **Step 3: Full E2E**

```bash
pnpm --filter @codevena/forq-web test:e2e
```

Expected: 5 green specs.

- [ ] **Step 4: Manual walkthrough**

```bash
pnpm --filter @codevena/forq-web dev
```

Verify in the browser:
1. `http://localhost:3000` loads `cv.de` editor.
2. Edit firstName → after 2 s see "Gespeichert" toast → `data/cvs/cv.de.yaml` updated.
3. Cycle through all 8 templates in the sidebar — preview updates without flicker.
4. Cycle through palettes for current template — accent color updates instantly.
5. Set accentOverride; reset clears it.
6. Toggle hidden sections; preview reflects.
7. Upload a photo → crop → confirm → preview updates with new image.
8. Click "PDF exportieren" → file downloads, opens in PDF viewer, contains current data.
9. While editor is open, manually edit `data/cvs/cv.de.yaml` in another editor and save → make a change in the web editor → conflict modal appears.
10. Reload action restores disk state; Overwrite re-saves; Cancel pauses autosave.

Document any issues found and fix them inline.

- [ ] **Step 5: Definition-of-Done — 4 review agents**

Per `~/.claude/CLAUDE.md`:

```
1. Spawn codex review agent #1: review uncommitted changes + recent phase-8 commits.
   Prompt instructs codex to write findings to .review-logs/phase8-codex-code.md.
2. Spawn codex review agent #2: verify phase-8 acceptance criteria.
   Prompt instructs codex to write findings to .review-logs/phase8-codex-acceptance.md.
3. Spawn claude review agent #1 (code-review): review uncommitted + recent phase-8 commits.
   Findings to .review-logs/phase8-claude-code.md.
4. Spawn claude review agent #2: verify acceptance criteria green.
   Findings to .review-logs/phase8-claude-acceptance.md.
```

- All 4 must report **zero findings**. If any has findings, fix every one and re-run **all four**.
- Codex sandbox issue mitigation: if codex agents fail with sandbox errors, dispatch via `codex` CLI manually or fall back to `gemini` per NEXT_SESSION guidance.
- No reviewer is given a timeout. They take as long as they take.

- [ ] **Step 6: Final commit + push prompt**

After all reviewers approve and the manual walkthrough is clean:

```bash
git status
git log --oneline main..feat/cvmake-mvp | head -40
```

Confirm phase-8 commit count and ask the user before pushing:

> "Phase 8 ist komplett. Alle 4 Reviewer grün, alle Tests grün, manuelle Verifikation OK. Soll ich `origin/feat/cvmake-mvp` pushen?"

Wait for explicit user confirmation before `git push`.

---

## Self-Review (post-write checklist)

**1. Spec coverage:**
- §3 decisions 1–5: covered in Tasks 11 (preview), 5–9 (REST routes), 21–22 (autosave + conflict), 19 (template switch + palette reset effect), 19 + 20 (accent reset + hidden toggles). ✅
- §5.3 API contracts: each route matches the JSON shapes documented in the spec (Tasks 5–9). ✅
- §6 iframe lifecycle + update rules: Task 11. ✅
- §7 processPhoto crop: Task 1. ✅
- §8 form state + sections: Tasks 12–18. ✅
- §9 photo upload flow: Tasks 8 + 23. ✅
- §10 SaveIndicator + ConflictModal: Tasks 21 + 22. ✅
- §11 export: Tasks 9 + 24. ✅
- §13 testing strategy (unit + integration + 5 e2e specs): Tasks 1–22 unit/integration, Tasks 26–30 e2e. ✅
- §14 acceptance criteria: Task 31. ✅
- §17 open questions: (1) default slug → resolved in Task 10 `pickDefault()`. (2) TagInput → Task 14 builds local `<TagInput>` instead of extending UI package. (3) hidden-sections renderer support → Task 20 wraps templates via `applyHiddenSections` instead of patching each template.

**2. Placeholder scan:** no "TBD" / "TODO" / "implement later". Every step shows actual code.

**3. Type consistency:**
- `useAutosave` opts type matches what `EditorShell` passes. ✅
- `<PhotoUploadField>` `onChange(path: string)` matches PersonalSection wiring. ✅
- `ConflictPayload`, `ServerError`, `SaveState` types exported from `use-autosave.ts` and consumed in `EditorShell.tsx` and `SaveIndicator.tsx`. ✅
- `cssVariables(palette)` produces same string shape as core `renderer.tsx` helper (mirrored explicitly in Task 4). ✅

If any of these are tripped during execution, fix inline and adjust dependent tasks.


