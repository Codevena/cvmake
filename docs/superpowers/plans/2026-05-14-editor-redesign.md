# Editor Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `apps/web` editor production-presentable (showcase aesthetic, restructured layout, English UI, demo-mode-safe) and deployable at `editor.cvmake.codevena.dev`.

**Architecture:** Centralize the visual change in the shared `@codevena/cvmake-ui` theme so it cascades. Restructure the editor layout into a 56px TopBar + 72px icon Sidebar (popover-driven) + tab-navigated form area + wider preview. Add a `cmdk` command palette. Localize all chrome strings to English inline (no i18n library). Gate save-to-disk behind `NEXT_PUBLIC_DEMO_MODE` so the public deploy is a stateless demo.

**Tech Stack:** Next.js 16, React 18, Tailwind v4 (`@theme` tokens), `react-hook-form`, `cmdk`, Puppeteer (export, unchanged). pnpm 9 workspaces.

**Companion spec:** `docs/superpowers/specs/2026-05-14-editor-redesign-design.md`

---

## File Structure

### Modified

- `packages/ui/src/styles/tailwind.css` — new `@theme` block (showcase tokens)
- `packages/ui/src/primitives/Input.tsx`, `Textarea.tsx`, `Select.tsx`, `DateRangeInput.tsx` — token review (dark-mode contrast)
- `apps/web/app/layout.tsx` — Google Fonts links (Fraunces, Inter, JetBrains Mono)
- `apps/web/app/page.tsx` — demo-mode branch (force example slug)
- `apps/web/components/EditorShell.tsx` — restructure layout, render `TabNav`, wire `CommandPalette`, demo-mode branch, English alert strings
- `apps/web/components/TopBar.tsx` — rewrite (56px, italic logo, ⌘K trigger, sand CTA, demo-mode branch)
- `apps/web/components/Sidebar.tsx` — rewrite (72px icon rail + popovers)
- `apps/web/components/PreviewFrame.tsx` — shadow-card frame, rendering overlay, sticky
- `apps/web/components/SaveIndicator.tsx` — restyle, hidden in demo mode
- `apps/web/components/ConflictModal.tsx` — restyle + English
- `apps/web/components/HiddenSectionsToggles.tsx` — restyle + English (moves into a sidebar popover)
- `apps/web/components/PhotoUploadField.tsx` — restyle + English
- `apps/web/components/TagInput.tsx` — restyle
- `apps/web/components/sections/PersonalSection.tsx` — restyle + English
- `apps/web/components/sections/ExperienceSection.tsx` — restyle + English
- `apps/web/components/sections/EducationSection.tsx` — restyle + English
- `apps/web/components/sections/SkillsSection.tsx` — restyle + English
- `apps/web/components/sections/LanguagesSection.tsx` — restyle + English
- `apps/web/components/sections/CustomSectionsSection.tsx` — restyle + English
- `apps/web/components/sections/SummarySection.tsx` — restyle + English
- `apps/web/package.json` — add `cmdk` + `js-yaml` (if not present for the editor)
- Test files alongside the above whose assertions reference German strings
- `apps/showcase/index.html` — "Open editor →" link

### Created

- `apps/web/components/Popover.tsx` — lightweight popover primitive (click-outside + Escape)
- `apps/web/components/TabNav.tsx` — section tab navigation
- `apps/web/components/CommandPalette.tsx` — `cmdk`-based ⌘K palette
- `apps/web/components/DownloadYamlButton.tsx` — demo-mode YAML download
- `apps/web/lib/demo-mode.ts` — `isDemoMode()` helper
- `apps/web/Dockerfile` — Puppeteer-ready Next.js build
- `apps/web/.dockerignore`

### Manual handoff (not code — Markus does these)

- Coolify app `cvmake-editor` pointed at `apps/web/Dockerfile`, ENV `NEXT_PUBLIC_DEMO_MODE=true`
- Cloudflare DNS `editor.cvmake.codevena.dev` → Hetzner IP
- Coolify Let's Encrypt cert

---

## Token mapping reference (used by every restyle task)

When a task says "apply the token mapping", apply this find → replace across the file's `className` strings. The `@theme` block in Task 1 defines the new color names.

| Old (light theme) | New (showcase dark) |
|---|---|
| `bg-surface` (was white) | `bg-bg` for app background, `bg-surface` for panels |
| `bg-surface-muted` | `bg-elevated` |
| `text-text` | `text-text` (unchanged name, new value) |
| `text-text-muted` | `text-text-muted` (unchanged name, new value) |
| `border-border` | `border-border` (unchanged name, new value) |
| `text-accent` / `bg-accent` | `text-accent` / `bg-accent` (sand, unchanged name) |
| hardcoded `bg-white` | `bg-surface` |
| hardcoded `bg-slate-*` / `bg-gray-*` | `bg-elevated` or `bg-surface` |
| hardcoded `text-slate-*` / `text-gray-*` | `text-text-muted` |
| hardcoded `text-blue-*` / `bg-blue-*` | `text-accent` / `bg-accent` |
| section headings (currently `font-semibold`) | add `font-display` (Fraunces) |

After any restyle, the rule is: **no hardcoded color literals remain** — everything routes through a token.

---

## Task 1: Visual foundation — tokens + fonts

**Files:**
- Modify: `packages/ui/src/styles/tailwind.css`
- Modify: `apps/web/app/layout.tsx`
- Review: `packages/ui/src/primitives/{Input,Textarea,Select,DateRangeInput}.tsx`

- [ ] **Step 1: Rewrite the `@theme` block in `packages/ui/src/styles/tailwind.css`**

Replace the entire file with:

```css
@import "tailwindcss";

@theme {
  --color-bg: #0b0f17;
  --color-surface: #11161f;
  --color-elevated: #1a212d;
  --color-border: #1f2531;
  --color-text: #f5efe6;
  --color-text-muted: #9ca0aa;
  --color-text-subtle: #6b7280;
  --color-accent: #d4a574;
  --color-accent-hover: #e0b582;
  --color-accent-muted: #a98558;
  --color-error: #f87171;
  --color-success: #6ee7b7;

  --font-display: "Fraunces", Georgia, serif;
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;

  --shadow-card: 0 30px 60px -30px rgba(0, 0, 0, 0.5);
  --shadow-ring: 0 0 0 1px rgba(212, 165, 116, 0.25);
}
```

- [ ] **Step 2: Add the font links to `apps/web/app/layout.tsx`**

Replace the file with:

```tsx
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400;1,9..144,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg text-text font-sans antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Review the four UI primitives for hardcoded light-theme values**

Read `packages/ui/src/primitives/Input.tsx`, `Textarea.tsx`, `Select.tsx`, `DateRangeInput.tsx`. For each, apply the token mapping reference above. Specifically:
- input backgrounds → `bg-elevated`
- input borders → `border-border`
- focus rings → `focus:ring-2 focus:ring-accent` (or `focus:shadow-ring`)
- label text → `text-text-muted`
- error text → `text-error`
- value text → `text-text`

Do not change component APIs (props, exports) — only `className` strings.

- [ ] **Step 4: Build + verify**

```bash
pnpm build && pnpm typecheck
```

Expected: all tasks pass. The build compiles the new theme; nothing should break (token *names* mostly unchanged, only values).

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/styles/tailwind.css packages/ui/src/primitives apps/web/app/layout.tsx
git commit -m "feat(ui): showcase dark theme tokens + fonts for the editor

Replace the editor's generic light tokens with the showcase brand:
ink/sand/parchment palette, Fraunces + Inter + JetBrains Mono. Loaded
via Google Fonts in the web app layout. UI primitives reviewed for
dark-mode contrast. Cascades to apps/web through the shared
@codevena/cvmake-ui stylesheet."
```

---

## Task 2: Popover primitive

A reusable popover for the sidebar's icon-triggered drawers. No external dependency — hand-rolled with click-outside + Escape handling.

**Files:**
- Create: `apps/web/components/Popover.tsx`
- Test: `apps/web/components/Popover.test.tsx`

- [ ] **Step 1: Write the failing test**

`apps/web/components/Popover.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Popover } from './Popover';

describe('Popover', () => {
  it('shows content only after the trigger is clicked', () => {
    render(
      <Popover trigger={<span>Open</span>} label="Test popover">
        <p>Panel body</p>
      </Popover>,
    );
    expect(screen.queryByText('Panel body')).toBeNull();
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByText('Panel body')).toBeTruthy();
  });

  it('closes on Escape', () => {
    render(
      <Popover trigger={<span>Open</span>} label="Test popover">
        <p>Panel body</p>
      </Popover>,
    );
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByText('Panel body')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Panel body')).toBeNull();
  });

  it('closes on outside click', () => {
    render(
      <div>
        <Popover trigger={<span>Open</span>} label="Test popover">
          <p>Panel body</p>
        </Popover>
        <button type="button">Outside</button>
      </div>,
    );
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByText('Panel body')).toBeTruthy();
    fireEvent.mouseDown(screen.getByText('Outside'));
    expect(screen.queryByText('Panel body')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm --filter @codevena/cvmake-web exec vitest run components/Popover.test.tsx
```

Expected: FAIL — `Popover` not found.

- [ ] **Step 3: Implement `apps/web/components/Popover.tsx`**

```tsx
'use client';
import { type ReactNode, useEffect, useRef, useState } from 'react';

interface Props {
  trigger: ReactNode;
  label: string;
  children: ReactNode;
}

export function Popover({ trigger, label, children }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-md text-text-muted transition hover:bg-elevated hover:text-text aria-expanded:bg-elevated aria-expanded:text-accent"
      >
        {trigger}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="absolute left-12 top-0 z-50 w-72 rounded-lg border border-border bg-surface p-4 shadow-card"
        >
          {children}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm --filter @codevena/cvmake-web exec vitest run components/Popover.test.tsx
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/Popover.tsx apps/web/components/Popover.test.tsx
git commit -m "feat(web): add Popover primitive for sidebar drawers"
```

---

## Task 3: TabNav component

Horizontal tab navigation for the 7 form sections.

**Files:**
- Create: `apps/web/components/TabNav.tsx`
- Test: `apps/web/components/TabNav.test.tsx`

- [ ] **Step 1: Write the failing test**

`apps/web/components/TabNav.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TabNav, type TabId } from './TabNav';

describe('TabNav', () => {
  it('renders all 7 section tabs', () => {
    render(<TabNav active="personal" onSelect={() => {}} />);
    for (const label of [
      'Personal',
      'Experience',
      'Education',
      'Skills',
      'Languages',
      'Custom',
      'Summary',
    ]) {
      expect(screen.getByRole('tab', { name: label })).toBeTruthy();
    }
  });

  it('marks the active tab as selected', () => {
    render(<TabNav active="experience" onSelect={() => {}} />);
    expect(screen.getByRole('tab', { name: 'Experience' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Personal' }).getAttribute('aria-selected')).toBe(
      'false',
    );
  });

  it('calls onSelect with the tab id when a tab is clicked', () => {
    const onSelect = vi.fn();
    render(<TabNav active="personal" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Skills' }));
    expect(onSelect).toHaveBeenCalledWith('skills' satisfies TabId);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm --filter @codevena/cvmake-web exec vitest run components/TabNav.test.tsx
```

Expected: FAIL — `TabNav` not found.

- [ ] **Step 3: Implement `apps/web/components/TabNav.tsx`**

```tsx
'use client';

export type TabId =
  | 'personal'
  | 'experience'
  | 'education'
  | 'skills'
  | 'languages'
  | 'custom'
  | 'summary';

const TABS: { id: TabId; label: string }[] = [
  { id: 'personal', label: 'Personal' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'skills', label: 'Skills' },
  { id: 'languages', label: 'Languages' },
  { id: 'custom', label: 'Custom' },
  { id: 'summary', label: 'Summary' },
];

interface Props {
  active: TabId;
  onSelect: (id: TabId) => void;
}

export function TabNav({ active, onSelect }: Props) {
  return (
    <div
      role="tablist"
      aria-label="CV sections"
      className="flex shrink-0 gap-1 border-b border-border px-4"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(tab.id)}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm transition ${
              isActive
                ? 'border-accent text-text'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm --filter @codevena/cvmake-web exec vitest run components/TabNav.test.tsx
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/TabNav.tsx apps/web/components/TabNav.test.tsx
git commit -m "feat(web): add TabNav for section navigation"
```

---

## Task 4: demo-mode helper

A single source of truth for whether the editor runs in stateless public-demo mode.

**Files:**
- Create: `apps/web/lib/demo-mode.ts`
- Test: `apps/web/lib/demo-mode.test.ts`

- [ ] **Step 1: Write the failing test**

`apps/web/lib/demo-mode.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isDemoMode } from './demo-mode';

describe('isDemoMode', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is true when NEXT_PUBLIC_DEMO_MODE is the string "true"', () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true');
    expect(isDemoMode()).toBe(true);
  });

  it('is false when the env var is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', '');
    expect(isDemoMode()).toBe(false);
  });

  it('is false for any value other than "true"', () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', '1');
    expect(isDemoMode()).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm --filter @codevena/cvmake-web exec vitest run lib/demo-mode.test.ts
```

Expected: FAIL — `isDemoMode` not found.

- [ ] **Step 3: Implement `apps/web/lib/demo-mode.ts`**

```ts
// Public demo deploys set NEXT_PUBLIC_DEMO_MODE=true. In demo mode the editor
// never writes to disk: it loads the tracked example CV, keeps edits in
// browser memory only, and offers a YAML download instead of autosave.
// Local `pnpm dev` leaves the var unset and keeps the full save-to-disk flow.
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm --filter @codevena/cvmake-web exec vitest run lib/demo-mode.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/demo-mode.ts apps/web/lib/demo-mode.test.ts
git commit -m "feat(web): add isDemoMode helper for public deploy gating"
```

---

## Task 5: DownloadYamlButton

Demo-mode action: serialize the current form state to YAML and trigger a browser download.

**Files:**
- Create: `apps/web/components/DownloadYamlButton.tsx`
- Test: `apps/web/components/DownloadYamlButton.test.tsx`
- Modify: `apps/web/package.json` (ensure `js-yaml` is a dependency of the web app)

- [ ] **Step 1: Ensure `js-yaml` is available to the web app**

Check `apps/web/package.json` dependencies. `js-yaml` is already a dependency (used elsewhere in the editor). If it is NOT listed, add `"js-yaml": "4.1.0"` to `dependencies` and `"@types/js-yaml": "4.0.9"` to `devDependencies`, then run `pnpm install`.

- [ ] **Step 2: Write the failing test**

`apps/web/components/DownloadYamlButton.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CVData } from '@codevena/cvmake-schema';
import { DownloadYamlButton } from './DownloadYamlButton';

const DATA: CVData = {
  meta: { locale: 'en' },
  personal: { firstName: 'Lena', lastName: 'Bauer', contacts: {} },
  experience: [],
  education: [],
  rendering: { template: 'classic-serif' },
};

describe('DownloadYamlButton', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('serializes the data to a YAML blob and triggers a download', () => {
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake');
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clicked: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this.download);
    });

    render(<DownloadYamlButton getData={() => DATA} slug="cv.en" />);
    fireEvent.click(screen.getByRole('button', { name: /download yaml/i }));

    expect(createUrl).toHaveBeenCalledTimes(1);
    const blob = createUrl.mock.calls[0]?.[0] as Blob;
    expect(blob.type).toContain('yaml');
    expect(clicked).toEqual(['cv.en.yaml']);
    expect(revokeUrl).toHaveBeenCalledWith('blob:fake');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
pnpm --filter @codevena/cvmake-web exec vitest run components/DownloadYamlButton.test.tsx
```

Expected: FAIL — `DownloadYamlButton` not found.

- [ ] **Step 4: Implement `apps/web/components/DownloadYamlButton.tsx`**

```tsx
'use client';
import type { CVData } from '@codevena/cvmake-schema';
import yaml from 'js-yaml';

interface Props {
  getData: () => CVData;
  slug: string;
}

export function DownloadYamlButton({ getData, slug }: Props) {
  function download() {
    const text = yaml.dump(getData(), { lineWidth: 100, noRefs: true });
    const blob = new Blob([text], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      className="rounded-md border border-border bg-elevated px-3 py-1.5 text-sm text-text transition hover:border-accent/40 hover:text-accent"
    >
      Download YAML
    </button>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
pnpm --filter @codevena/cvmake-web exec vitest run components/DownloadYamlButton.test.tsx
```

Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/DownloadYamlButton.tsx apps/web/components/DownloadYamlButton.test.tsx apps/web/package.json
git commit -m "feat(web): add DownloadYamlButton for demo-mode persistence"
```

---

## Task 6: CommandPalette

`cmdk`-based ⌘K palette. Commands operate via callbacks passed by `EditorShell`.

**Files:**
- Modify: `apps/web/package.json` (add `cmdk`)
- Create: `apps/web/components/CommandPalette.tsx`
- Test: `apps/web/components/CommandPalette.test.tsx`

- [ ] **Step 1: Add `cmdk` to the web app**

Add `"cmdk": "1.1.1"` to `dependencies` in `apps/web/package.json`, then:

```bash
pnpm install
```

- [ ] **Step 2: Write the failing test**

`apps/web/components/CommandPalette.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CommandPalette } from './CommandPalette';

const NOOP_COMMANDS = {
  switchCv: vi.fn(),
  allSlugs: ['cv.en', 'cv.de'],
  switchTemplate: vi.fn(),
  templateIds: ['classic-serif', 'swiss'],
  jumpToSection: vi.fn(),
  exportPdf: vi.fn(),
};

describe('CommandPalette', () => {
  it('is closed by default and opens when `open` is true', () => {
    const { rerender } = render(
      <CommandPalette open={false} onClose={() => {}} commands={NOOP_COMMANDS} />,
    );
    expect(screen.queryByPlaceholderText(/type a command/i)).toBeNull();
    rerender(<CommandPalette open={true} onClose={() => {}} commands={NOOP_COMMANDS} />);
    expect(screen.getByPlaceholderText(/type a command/i)).toBeTruthy();
  });

  it('fires exportPdf and closes when the Export command is chosen', () => {
    const exportPdf = vi.fn();
    const onClose = vi.fn();
    render(
      <CommandPalette
        open={true}
        onClose={onClose}
        commands={{ ...NOOP_COMMANDS, exportPdf }}
      />,
    );
    fireEvent.click(screen.getByText(/export pdf/i));
    expect(exportPdf).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('jumps to a section when a section command is chosen', () => {
    const jumpToSection = vi.fn();
    render(
      <CommandPalette
        open={true}
        onClose={() => {}}
        commands={{ ...NOOP_COMMANDS, jumpToSection }}
      />,
    );
    fireEvent.click(screen.getByText(/go to experience/i));
    expect(jumpToSection).toHaveBeenCalledWith('experience');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
pnpm --filter @codevena/cvmake-web exec vitest run components/CommandPalette.test.tsx
```

Expected: FAIL — `CommandPalette` not found.

- [ ] **Step 4: Implement `apps/web/components/CommandPalette.tsx`**

```tsx
'use client';
import { Command } from 'cmdk';
import { useEffect } from 'react';
import type { TabId } from './TabNav';

export interface PaletteCommands {
  switchCv: (slug: string) => void;
  allSlugs: string[];
  switchTemplate: (id: string) => void;
  templateIds: string[];
  jumpToSection: (id: TabId) => void;
  exportPdf: () => void;
  // Present only in demo mode — when set, the palette shows a
  // "Download YAML" action alongside "Export PDF".
  downloadYaml?: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  commands: PaletteCommands;
}

const SECTIONS: TabId[] = [
  'personal',
  'experience',
  'education',
  'skills',
  'languages',
  'custom',
  'summary',
];

export function CommandPalette({ open, onClose, commands }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function run(fn: () => void) {
    fn();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-bg/80 p-4 pt-[12vh]"
      onClick={onClose}
      role="presentation"
    >
      <Command
        label="Command palette"
        className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-surface shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <Command.Input
          autoFocus
          placeholder="Type a command…"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm text-text outline-none placeholder:text-text-subtle"
        />
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-text-muted">
            No results.
          </Command.Empty>

          <Command.Group
            heading="Sections"
            className="px-2 py-1 text-xs uppercase tracking-wider text-text-subtle"
          >
            {SECTIONS.map((id) => (
              <Command.Item
                key={id}
                onSelect={() => run(() => commands.jumpToSection(id))}
                className="cursor-pointer rounded-md px-3 py-2 text-sm text-text aria-selected:bg-elevated aria-selected:text-accent"
              >
                Go to {id.charAt(0).toUpperCase() + id.slice(1)}
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group
            heading="Template"
            className="px-2 py-1 text-xs uppercase tracking-wider text-text-subtle"
          >
            {commands.templateIds.map((id) => (
              <Command.Item
                key={id}
                onSelect={() => run(() => commands.switchTemplate(id))}
                className="cursor-pointer rounded-md px-3 py-2 text-sm text-text aria-selected:bg-elevated aria-selected:text-accent"
              >
                Switch template: {id}
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group
            heading="CV"
            className="px-2 py-1 text-xs uppercase tracking-wider text-text-subtle"
          >
            {commands.allSlugs.map((slug) => (
              <Command.Item
                key={slug}
                onSelect={() => run(() => commands.switchCv(slug))}
                className="cursor-pointer rounded-md px-3 py-2 text-sm text-text aria-selected:bg-elevated aria-selected:text-accent"
              >
                Open CV: {slug}
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group
            heading="Actions"
            className="px-2 py-1 text-xs uppercase tracking-wider text-text-subtle"
          >
            <Command.Item
              onSelect={() => run(commands.exportPdf)}
              className="cursor-pointer rounded-md px-3 py-2 text-sm text-text aria-selected:bg-elevated aria-selected:text-accent"
            >
              Export PDF
            </Command.Item>
            {commands.downloadYaml && (
              <Command.Item
                onSelect={() => run(commands.downloadYaml as () => void)}
                className="cursor-pointer rounded-md px-3 py-2 text-sm text-text aria-selected:bg-elevated aria-selected:text-accent"
              >
                Download YAML
              </Command.Item>
            )}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
pnpm --filter @codevena/cvmake-web exec vitest run components/CommandPalette.test.tsx
```

Expected: PASS (3 tests). If `cmdk`'s `Command.Item` needs a mouse interaction other than `click` to fire `onSelect` in jsdom, adjust the test to `fireEvent.click` on the item's text node's closest `[cmdk-item]` — but `click` on the rendered text should bubble correctly.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/CommandPalette.tsx apps/web/components/CommandPalette.test.tsx apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): add cmdk command palette (sections, templates, CVs, export)"
```

---

## Task 7: TopBar rewrite

**Files:**
- Modify: `apps/web/components/TopBar.tsx`
- Modify: `apps/web/components/TopBar.test.tsx`

- [ ] **Step 1: Read the current `TopBar.tsx` and `TopBar.test.tsx` in full**

Note the current props interface, the export flow, and which German strings the test asserts on.

- [ ] **Step 2: Rewrite `TopBar.tsx`**

The new TopBar is 56px, `bg-surface backdrop-blur`, `border-b border-border`. It keeps the existing `exportPdf` logic and props, and adds: a `onOpenPalette` prop (callback to open ⌘K), an `isDemo` prop. Layout:

- Left: `<span className="font-display italic text-accent text-lg">cvmake</span>`
- Center-left: the CV `<select>` restyled as a pill — `bg-elevated border border-border rounded-md px-2 py-1 text-sm text-text` (in demo mode, render it `disabled` showing only the example slug)
- Right cluster:
  - ⌘K trigger: `<button onClick={onOpenPalette} className="flex items-center gap-1 rounded-md bg-elevated px-2 py-1 text-xs text-text-muted">` with a `<kbd className="font-mono">⌘K</kbd>`
  - `<SaveIndicator …>` — only when `!isDemo`
  - `<DownloadYamlButton getData={getValues} slug={slug} />` — only when `isDemo` (import from `./DownloadYamlButton`; `getValues` comes from the existing `useFormContext<CVData>()` call)
  - "Export PDF" button: `bg-accent text-bg px-4 py-1.5 rounded-md text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-accent-hover`

All visible strings in English: "Select CV", "Export PDF", any aria-labels. The German `aria-label="CV auswählen"` becomes `aria-label="Select CV"`.

Keep the `role="banner"` header element and the `biome-ignore` comment.

- [ ] **Step 3: Update `TopBar.test.tsx`**

Replace any assertions on German strings with the English equivalents (e.g. a query for `/CV auswählen/` becomes `/Select CV/`). Add an assertion that clicking the ⌘K button calls the `onOpenPalette` prop. Keep the existing export-flow test, updating only string matches.

- [ ] **Step 4: Run the TopBar tests**

```bash
pnpm --filter @codevena/cvmake-web exec vitest run components/TopBar.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/TopBar.tsx apps/web/components/TopBar.test.tsx
git commit -m "feat(web): rewrite TopBar — 56px, italic wordmark, palette trigger, sand CTA

English UI strings. Adds onOpenPalette + isDemo props. Save indicator
hidden in demo mode. Export flow unchanged."
```

---

## Task 8: Sidebar rewrite

**Files:**
- Modify: `apps/web/components/Sidebar.tsx`
- Modify: `apps/web/components/Sidebar.test.tsx`

- [ ] **Step 1: Read the current `Sidebar.tsx` and `Sidebar.test.tsx` in full**

The current sidebar is a 320px column with the template grid, palette selector, and hidden-section toggles inline. Note the props and the template-switch effect (palette reset logic) — that logic must be preserved.

- [ ] **Step 2: Rewrite `Sidebar.tsx`**

A 72px (`w-[72px]`) `bg-surface border-r border-border` vertical rail. Keep the `role="complementary"` aside and the `biome-ignore` comment. Keep the existing template-switch `useEffect` (palette reset on template change) — it does not depend on layout.

The rail holds three `Popover` components (from Task 2), each `trigger` being an icon (use inline SVGs, ~20px, `currentColor`):

1. **Template** (grid icon) — popover body: the existing `TemplateCard` radiogroup, unchanged logic
2. **Palette** (swatch icon) — popover body: the existing `PaletteSelector` + `ColorPicker`, unchanged logic
3. **Sections** (eye icon) — popover body: the existing `<HiddenSectionsToggles />`

A fourth static link at the bottom: an info icon `<a href="https://github.com/Codevena/cvmake">` opening in a new tab.

Move the JSX that currently renders these three controls inline into the respective `Popover` `children`. Their `Controller` / `useFormContext` wiring is unchanged — only their container moves.

- [ ] **Step 3: Update `Sidebar.test.tsx`**

The current test likely asserts the template grid / palette selector render directly. Update it: the controls are now behind popovers, so the test must first click the trigger (e.g. `fireEvent.click(screen.getByLabelText('Template'))`) then assert the grid appears. Update any German labels to English ("Template", "Palette", "Sections").

- [ ] **Step 4: Run the Sidebar tests**

```bash
pnpm --filter @codevena/cvmake-web exec vitest run components/Sidebar.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/Sidebar.tsx apps/web/components/Sidebar.test.tsx
git commit -m "feat(web): rewrite Sidebar as a 72px icon rail with popover drawers

Template grid, palette selector, and hidden-section toggles move from
an inline 320px column into Popover-triggered drawers. Template-switch
palette-reset logic preserved."
```

---

## Task 9: Section forms — restyle + localize

Seven section components. Each gets the token mapping applied, Fraunces section headings, and a `const t` English string map. The form logic (`Controller`, `useFormContext`, field arrays) is **unchanged** — only `className` strings and visible text.

**Files:**
- Modify + Test (update assertions): each of
  - `apps/web/components/sections/PersonalSection.tsx`
  - `apps/web/components/sections/ExperienceSection.tsx`
  - `apps/web/components/sections/EducationSection.tsx`
  - `apps/web/components/sections/SkillsSection.tsx`
  - `apps/web/components/sections/LanguagesSection.tsx`
  - `apps/web/components/sections/CustomSectionsSection.tsx`
  - `apps/web/components/sections/SummarySection.tsx`

- [ ] **Step 1: PersonalSection — read, restyle, localize**

Read `PersonalSection.tsx`. At the top add:

```tsx
const t = {
  legend: 'Personal',
  firstName: 'First name',
  lastName: 'Last name',
  title: 'Title / Headline',
  // …one key per German string found in the file
} as const;
```

Replace every German literal with `t.<key>`. Apply the token mapping. Change the `<legend>` to `className="font-display text-base"`. If a `PersonalSection.test.tsx` exists and asserts German strings, update those assertions to the English values.

- [ ] **Step 2: ExperienceSection — read, restyle, localize**

Same process. Expected German→English keys include: `Erfahrung`→`Experience`, `Position`→`Role`, `Firma`/`Unternehmen`→`Company`, `Zeitraum`→`Period`, `Eintrag hinzufügen`→`Add entry`, `Entfernen`→`Remove`. Read the file for the exact set.

- [ ] **Step 3: EducationSection — read, restyle, localize**

Same process. Likely keys: `Ausbildung`/`Bildung`→`Education`, `Abschluss`→`Degree`, `Institution`→`Institution`, `Zeitraum`→`Period`.

- [ ] **Step 4: SkillsSection — read, restyle, localize**

Same process. Likely keys: `Fähigkeiten`/`Kenntnisse`→`Skills`, `Kategorie`→`Category`, plus `TagInput` placeholder text.

- [ ] **Step 5: LanguagesSection — read, restyle, localize**

Same process. Likely keys: `Sprachen`→`Languages`, `Sprache`→`Language`, `Niveau`→`Level`.

- [ ] **Step 6: CustomSectionsSection — read, restyle, localize**

Same process. Likely keys: `Eigene Abschnitte`→`Custom sections`, `Titel`→`Title`, `Inhalt`→`Content`.

- [ ] **Step 7: SummarySection — read, restyle, localize**

Same process. Likely keys: `Zusammenfassung`/`Profil`→`Summary`, plus any helper text.

- [ ] **Step 8: Run all section tests + typecheck**

```bash
pnpm --filter @codevena/cvmake-web exec vitest run components/sections
pnpm --filter @codevena/cvmake-web exec tsc --noEmit
```

Expected: PASS, no type errors.

- [ ] **Step 9: Commit**

```bash
git add apps/web/components/sections
git commit -m "feat(web): restyle + localize the 7 CV section forms

Showcase tokens, Fraunces section headings, English strings via a
per-file `t` map. Form logic (react-hook-form wiring, field arrays)
unchanged. Test assertions updated to English."
```

---

## Task 10: Supporting components — restyle + localize

**Files:**
- Modify: `apps/web/components/ConflictModal.tsx` (+ test)
- Modify: `apps/web/components/HiddenSectionsToggles.tsx` (+ test if present)
- Modify: `apps/web/components/PhotoUploadField.tsx` (+ test)
- Modify: `apps/web/components/TagInput.tsx` (+ test)
- Modify: `apps/web/components/SaveIndicator.tsx` (+ test)

- [ ] **Step 1: ConflictModal — read, restyle, localize**

Read `ConflictModal.tsx` + `ConflictModal.test.tsx`. Apply token mapping. The modal overlay becomes `bg-bg/80`, the panel `bg-surface border border-border shadow-card`. Translate strings: `Konflikt`→`Conflict`, `Neu laden`→`Reload`, `Überschreiben`→`Overwrite`, `Abbrechen`→`Cancel`, plus the body copy. Update the test's German assertions to English.

- [ ] **Step 2: HiddenSectionsToggles — read, restyle, localize**

Read the file. Apply token mapping. Translate: `Versteckte Abschnitte`→`Hidden sections` and each section toggle label. Update its test if one exists.

- [ ] **Step 3: PhotoUploadField — read, restyle, localize**

Read the file. Apply token mapping. Translate: `Foto`→`Photo`, `Hochladen`→`Upload`, `Entfernen`→`Remove`, crop-dialog strings, plus any error text (`zu groß`→`too large`, `ungültiger Typ`→`unsupported type`). Update its test's German assertions.

- [ ] **Step 4: TagInput — read, restyle**

Read the file. Apply token mapping only — `TagInput` is structural, check for a placeholder string and translate if present. Update its test if it asserts styling-coupled text.

- [ ] **Step 5: SaveIndicator — read, restyle, localize**

Read the file. Apply token mapping. Translate state strings: `Gespeichert`→`Saved`, `Speichert…`→`Saving…`, `Fehler`→`Error`, `Wiederholen`→`Retry`, and any relative-time text (`vor Xs`→`Xs ago`). Update its test's assertions.

- [ ] **Step 6: Run the tests for all five + typecheck**

```bash
pnpm --filter @codevena/cvmake-web exec vitest run components/ConflictModal.test.tsx components/PhotoUploadField.test.tsx components/TagInput.test.tsx components/SaveIndicator.test.tsx
pnpm --filter @codevena/cvmake-web exec tsc --noEmit
```

Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/ConflictModal.tsx apps/web/components/HiddenSectionsToggles.tsx apps/web/components/PhotoUploadField.tsx apps/web/components/TagInput.tsx apps/web/components/SaveIndicator.tsx apps/web/components/*.test.tsx
git commit -m "feat(web): restyle + localize supporting editor components

ConflictModal, HiddenSectionsToggles, PhotoUploadField, TagInput,
SaveIndicator — showcase tokens + English strings. Logic unchanged."
```

---

## Task 11: PreviewFrame polish

**Files:**
- Modify: `apps/web/components/PreviewFrame.tsx`
- Modify: `apps/web/components/PreviewFrame.test.tsx`

- [ ] **Step 1: Read the current `PreviewFrame.tsx` and its test**

Note how it receives the rendered CV and whether it already has a "dirty/rendering" signal available.

- [ ] **Step 2: Restyle + add the rendering overlay**

- Wrap the iframe in a container: `className="relative h-full overflow-auto bg-bg p-6"`.
- The iframe itself gets `className="mx-auto block w-full max-w-3xl rounded-md bg-white shadow-card"`.
- Add a `rendering?: boolean` prop. When `true`, render an absolutely-positioned overlay with three pulsing sand dots:

```tsx
{rendering && (
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
    <div className="flex gap-1.5 rounded-full bg-surface/90 px-3 py-2">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:300ms]" />
    </div>
  </div>
)}
```

- Make the container sticky relative to the form scroll: the EditorShell layout (Task 12) places it in its own flex column, so `PreviewFrame` itself just needs `h-full`.

- [ ] **Step 3: Update `PreviewFrame.test.tsx`**

Keep the existing render assertions. Add: when `rendering` is `true`, the overlay is present; when `false`/absent, it is not. Match the overlay by a `data-testid="preview-rendering"` you add to the overlay `div`.

- [ ] **Step 4: Run the PreviewFrame test**

```bash
pnpm --filter @codevena/cvmake-web exec vitest run components/PreviewFrame.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/PreviewFrame.tsx apps/web/components/PreviewFrame.test.tsx
git commit -m "feat(web): polish PreviewFrame — shadow-card frame + rendering overlay"
```

---

## Task 12: EditorShell restructure + demo-mode wiring

The integration task: new layout, tab state, command palette wiring, demo-mode branch.

**Files:**
- Modify: `apps/web/components/EditorShell.tsx`
- Modify: `apps/web/components/EditorShell.test.tsx`
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: Read `EditorShell.tsx`, `EditorShell.test.tsx`, and `page.tsx` in full**

Note the current layout JSX (the `flex h-screen flex-col` wrapper), how sections are currently rendered (stacked), the autosave wiring, and the conflict-modal handlers with their German `window.alert` strings.

- [ ] **Step 2: Restructure the EditorShell layout + tab state**

In `EditorShell.tsx`:

- Import `TabNav`, `type TabId`, `CommandPalette`, `type PaletteCommands`, `isDemoMode`, `useHotkey` (from `apps/web/lib/use-hotkey`).
- Add state: `const [activeTab, setActiveTab] = useState<TabId>('personal')` and `const [paletteOpen, setPaletteOpen] = useState(false)`.
- `const demo = isDemoMode();`
- Wire `useHotkey` so ⌘K / Ctrl+K toggles `paletteOpen` (check the existing `use-hotkey` signature when you read the file; pass a handler that calls `setPaletteOpen((v) => !v)`).
- When `demo` is true, do **not** start `useAutosave` — guard the hook call: keep the hook call but pass `paused: true` permanently when `demo`, OR (cleaner) early-branch the autosave object to a static no-op shape. Pick whichever keeps the hook-call-order rule (hooks must run unconditionally — so keep `useAutosave` called, but force `paused: demo || conflict !== null || conflictPaused`).
- Build the layout:

```tsx
return (
  <FormProvider {...form}>
    <div className="flex h-screen flex-col bg-bg text-text">
      <TopBar
        slug={slug}
        allSlugs={allSlugs}
        saveState={autosave.state}
        saveError={autosave.errorMessage}
        onRetry={autosave.retry}
        lastSavedAt={autosave.lastSavedAt}
        onOpenPalette={() => setPaletteOpen(true)}
        isDemo={demo}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar bootstrap={bootstrap} />
        <div className="flex flex-[0.85] flex-col overflow-hidden border-r border-border">
          <TabNav active={activeTab} onSelect={setActiveTab} />
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'personal' && <PersonalSection slug={slug} />}
            {activeTab === 'experience' && <ExperienceSection />}
            {activeTab === 'education' && <EducationSection />}
            {activeTab === 'skills' && <SkillsSection />}
            {activeTab === 'languages' && <LanguagesSection />}
            {activeTab === 'custom' && <CustomSectionsSection />}
            {activeTab === 'summary' && <SummarySection />}
          </div>
        </div>
        <div className="flex flex-[1.5] flex-col overflow-hidden">
          <PreviewFrame data={debounced} bootstrap={bootstrap} rendering={debounced !== watched} />
        </div>
      </div>
      {demo && (
        <div className="shrink-0 border-t border-border bg-surface px-4 py-1.5 text-center text-xs text-text-muted">
          Demo mode — edits are not saved.{' '}
          <a
            href="https://www.npmjs.com/package/@codevena/cvmake-cli"
            className="text-accent underline"
            target="_blank"
            rel="noreferrer"
          >
            Use the CLI
          </a>{' '}
          to keep your work.
        </div>
      )}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={paletteCommands}
      />
      {conflict && <ConflictModal … />}
    </div>
  </FormProvider>
);
```

Note: confirm the actual prop names `PreviewFrame` and the section components expect when you read the files — the snippet above assumes `PreviewFrame` takes `data` + `bootstrap`; adjust to the real signature. The section components currently take no props except `PersonalSection` which takes `slug` — verify on read.

- [ ] **Step 3: Build the `paletteCommands` object**

Inside `EditorShell`, assemble:

```tsx
const paletteCommands: PaletteCommands = {
  switchCv: (s) => router.push(`/?slug=${encodeURIComponent(s)}`),
  allSlugs,
  switchTemplate: (id) => form.setValue('rendering.template', id, { shouldDirty: true }),
  templateIds: listTemplates().map((t) => t.id),
  jumpToSection: (id) => setActiveTab(id),
  exportPdf: () => exportPdf({ data: form.getValues(), slug }),
  // Demo mode only — undefined otherwise, so the palette hides the command.
  ...(demo
    ? {
        downloadYaml: () => {
          const text = yaml.dump(form.getValues(), { lineWidth: 100, noRefs: true });
          const blob = new Blob([text], { type: 'text/yaml;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${slug}.yaml`;
          a.click();
          URL.revokeObjectURL(url);
        },
      }
    : {}),
};
```

For `switchCv`: check how the current app navigates between slugs (the existing `<select>` `onChange` in `TopBar` — reuse that mechanism, likely `router.push`). For `exportPdf`: the export logic currently lives in `TopBar.tsx`. Extract it into a shared function — create `apps/web/lib/export-pdf.ts` exporting `async function exportPdf(args: { data: CVData; slug: string }): Promise<void>` containing the existing fetch-blob-download logic from `TopBar`, and call it from both `TopBar` and here. (This is a small, in-scope refactor — the export logic should not be duplicated.) Import `yaml` from `js-yaml` at the top of `EditorShell.tsx` for the `downloadYaml` command — it mirrors `DownloadYamlButton`'s serialization; if you prefer not to duplicate, extract a `lib/serialize-yaml.ts` and use it in both, but a 6-line inline block is acceptable here.

- [ ] **Step 4: Localize the conflict-modal `window.alert` strings**

In the `ConflictModal` `onConfirm`/`onCancel` handlers, translate the German `window.alert` strings: `Überschreiben fehlgeschlagen` → `Overwrite failed`.

- [ ] **Step 5: Demo-mode branch in `page.tsx`**

In `apps/web/app/page.tsx`, import `isDemoMode`. When `isDemoMode()` is true, skip the `listSlugs()` filesystem read and force `slug = 'example.en'` (and `allSlugs = ['example.en']`), loading `data/cvs/example.en.yaml` via the existing `loadCV` / `resolveCvPath`. When not in demo mode, current behavior is unchanged.

- [ ] **Step 6: Update `EditorShell.test.tsx`**

Update assertions for the new layout: the test should still mount `EditorShell` with the same props. If it asserted on stacked sections, change to assert the active tab's section renders. Add a demo-mode test: with `NEXT_PUBLIC_DEMO_MODE=true` (via `vi.stubEnv`), the demo banner renders and `SaveIndicator` is absent.

- [ ] **Step 7: Create `apps/web/lib/export-pdf.ts` test**

`apps/web/lib/export-pdf.test.ts` — mock `fetch` returning a fake PDF blob, assert the function POSTs to `/api/export` with the right body shape and triggers an anchor download. (Mirror the `DownloadYamlButton` test's anchor-click spy pattern.)

- [ ] **Step 8: Full editor test run + typecheck + build**

```bash
pnpm --filter @codevena/cvmake-web exec vitest run
pnpm --filter @codevena/cvmake-web exec tsc --noEmit
pnpm build
```

Expected: all green.

- [ ] **Step 9: Commit**

```bash
git add apps/web/components/EditorShell.tsx apps/web/components/EditorShell.test.tsx apps/web/app/page.tsx apps/web/lib/export-pdf.ts apps/web/lib/export-pdf.test.ts
git commit -m "feat(web): restructure EditorShell — tabs, command palette, demo mode

3-pane layout (icon sidebar / tabbed form / wide preview), ⌘K palette
wired via use-hotkey, demo-mode branch (no autosave, demo banner,
example CV). Export logic extracted to lib/export-pdf.ts and shared
between TopBar and the palette. Conflict-modal alerts localized."
```

---

## Task 13: Dockerfile for the editor

**Files:**
- Create: `apps/web/Dockerfile`
- Create: `apps/web/.dockerignore`

- [ ] **Step 1: Create `apps/web/.dockerignore`**

```
node_modules
.next
.turbo
**/node_modules
**/.next
**/.turbo
**/dist
.git
*.log
```

- [ ] **Step 2: Create `apps/web/Dockerfile`**

A multi-stage build from the monorepo root context. Note: the build context must be the repo root (so pnpm workspaces resolve), so the Coolify app config will set the build context to `.` and the Dockerfile path to `apps/web/Dockerfile`.

```dockerfile
# Build + run the cvmake web editor. Build context = repo root.
FROM node:20.11.1-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Chromium runtime deps for Puppeteer (PDF export).
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 \
    libatk1.0-0 libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 \
    libnspr4 libnss3 libpango-1.0-0 libx11-6 libxcomposite1 \
    libxdamage1 libxext6 libxfixes3 libxkbcommon0 libxrandr2 wget \
  && rm -rf /var/lib/apt/lists/*

FROM base AS build
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json biome.json ./
COPY apps ./apps
COPY packages ./packages
COPY data ./data
RUN pnpm install --frozen-lockfile
# Puppeteer's bundled Chromium download for the build/runtime image.
RUN pnpm --filter @codevena/cvmake-core exec puppeteer browsers install chrome
RUN pnpm build

FROM base AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
COPY --from=build /root/.cache/puppeteer /root/.cache/puppeteer
EXPOSE 3000
CMD ["pnpm", "--filter", "@codevena/cvmake-web", "start"]
```

- [ ] **Step 3: Verify the Dockerfile builds (if Docker is available locally)**

```bash
docker build -f apps/web/Dockerfile -t cvmake-editor:test .
```

Expected: builds successfully. If Docker is not available locally, skip — the Coolify build will be the real verification. Note this in the task report.

- [ ] **Step 4: Commit**

```bash
git add apps/web/Dockerfile apps/web/.dockerignore
git commit -m "build(web): Puppeteer-ready Dockerfile for the editor deploy

Multi-stage build from the repo root context. Installs Chromium
system deps + Puppeteer's bundled Chrome so PDF export works in the
container. Run target: pnpm --filter @codevena/cvmake-web start."
```

---

## Task 14: Showcase "Open editor" link

**Files:**
- Modify: `apps/showcase/index.html`

- [ ] **Step 1: Read `apps/showcase/index.html` top nav**

Locate the `<nav>` in the header (around line 78) — it has links to Templates, Quickstart, Why, GitHub.

- [ ] **Step 2: Add the editor link to the nav**

Add, as the last item before the GitHub link, a sand-styled button link:

```html
<a
  href="https://editor.cvmake.codevena.dev"
  class="rounded-md bg-sand px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-sand/90 sm:text-sm"
  >Open editor →</a
>
```

Also add it to the hero CTA cluster (near the "Browse templates" / "GitHub" buttons around line 118) as a primary action, matching the existing hero button styling.

- [ ] **Step 3: Rebuild the showcase CSS (the new classes must be in the Tailwind output)**

```bash
pnpm --filter @codevena/cvmake-showcase build:css
```

Expected: `Done`. Verify the new classes resolve (no new arbitrary values were used, so they should already be covered, but rebuild to be safe).

- [ ] **Step 4: Commit**

```bash
git add apps/showcase/index.html
git commit -m "feat(showcase): add 'Open editor' link to nav + hero"
```

---

## Task 15: Final verification + review pipeline

- [ ] **Step 1: Full static checks**

```bash
pnpm build && pnpm typecheck && pnpm -r test:unit
```

Expected: all green. Pre-existing lint debt (70 errors, tracked separately) is tolerated — but confirm no NEW lint errors in the files this plan touched: `pnpm lint 2>&1 | grep -E "apps/web|packages/ui"`.

- [ ] **Step 2: Manual visual walkthrough**

```bash
pnpm --filter @codevena/cvmake-web dev
```

Open http://localhost:3000 and verify against the spec's §12 acceptance criteria:
- Dark showcase aesthetic, no blue/white remnants
- 56px TopBar, 72px icon sidebar with working popovers, tab nav, wide preview with shadow-card
- ⌘K opens the palette; every command works
- All UI text is English
- Switch templates/palettes, edit fields, export a PDF — all work

Then test demo mode:
```bash
NEXT_PUBLIC_DEMO_MODE=true pnpm --filter @codevena/cvmake-web dev
```
Verify: example CV loaded, no save indicator, demo banner shown, Download YAML works, Export PDF still works.

- [ ] **Step 3: Codex review (Agent A)**

```bash
mkdir -p .review
cat > .review/codex-prompt.txt <<'PROMPT'
Review all uncommitted changes (or the commit range for the editor
redesign branch) for code quality, correctness, and consistency.

Context: redesign of apps/web — showcase dark theme, restructured
layout (TopBar/Sidebar/TabNav/PreviewFrame), cmdk command palette,
German→English localization, NEXT_PUBLIC_DEMO_MODE gating, a
Puppeteer Dockerfile.

Run `node_modules/.bin/tsc -p apps/web/tsconfig.json --noEmit` and the
web vitest suite (`node_modules/.bin/vitest run` in apps/web). Do NOT
use pnpm/turbo — sandbox has no network; the developer verified
`pnpm build` + `pnpm -r test:unit` locally.

Specifically check:
- No hardcoded color literals remain in apps/web components — all via tokens
- No German strings remain in editor chrome
- Hook-call-order is preserved in EditorShell (useAutosave still called
  unconditionally, just force-paused in demo mode)
- The export-pdf logic extracted to lib/export-pdf.ts is identical in
  behavior to the old inline TopBar version
- demo-mode branch in page.tsx doesn't break the non-demo path
- Dockerfile build context assumptions are sound

Pre-existing lint debt (70 errors in template files) is tolerated by
CI — do NOT fail on it.

Write findings to .review/codex-a-findings.md:
## FINDINGS
- [CRITICAL/WARN/INFO] one per line
## VERDICT
PASS | FAIL
PASS = zero CRITICAL, zero WARN.
PROMPT
codex exec "$(<.review/codex-prompt.txt)"
```

Read `.review/codex-a-findings.md`. Fix all CRITICAL/WARN, re-run.

- [ ] **Step 4: Claude review (Agent A)**

Spawn a `claude` subagent: "Independent review of the editor redesign in /Users/markus/Developer/cvMake. Verify against `docs/superpowers/specs/2026-05-14-editor-redesign-design.md` §12 acceptance criteria. Check token consistency, localization completeness, the demo-mode branch, hook-order safety in EditorShell, and that the export-pdf refactor preserves behavior. Write `.review/claude-a-findings.md` in the FINDINGS/VERDICT format. Report back only the verdict."

- [ ] **Step 5: Gate**

Both reviewers must return `VERDICT: PASS`. Fix + re-run both until clean.

- [ ] **Step 6: Clean up + final commit**

```bash
rm -rf .review/
```

If reviewer fixes were made, they were committed during the fix loop. Nothing else to commit here.

- [ ] **Step 7: Manual deploy handoff (Markus)**

Provide Markus the checklist (not code — he runs these):
1. Coolify → new application `cvmake-editor`, source = the repo, build context = repo root, Dockerfile path = `apps/web/Dockerfile`
2. ENV: `NEXT_PUBLIC_DEMO_MODE=true`
3. Port: 3000
4. Cloudflare DNS: `editor.cvmake.codevena.dev` → A record to the Hetzner box IP (DNS-only or proxied — proxied is fine)
5. Coolify: enable Let's Encrypt for the domain
6. Deploy, then smoke-test: open `https://editor.cvmake.codevena.dev`, edit a field, export a PDF, hit ⌘K
7. Once live: the showcase's "Open editor" links (Task 14) resolve

---

## Final acceptance check

Against spec §12:

1. [ ] Editor renders in showcase aesthetic — no blue/white remnants
2. [ ] Layout matches §5 — 56px TopBar, 72px sidebar w/ popovers, tab nav, ~1.5× preview
3. [ ] ⌘K palette works; all §6.1 commands fire
4. [ ] All editor UI text is English; CV data still renders per its locale
5. [ ] `NEXT_PUBLIC_DEMO_MODE=true` → no autosave, example CV, Download YAML, demo banner
6. [ ] `pnpm build && pnpm typecheck && pnpm -r test:unit` green; new components tested
7. [ ] Editor deployed + reachable at `https://editor.cvmake.codevena.dev`, renders + exports
8. [ ] Showcase has a working "Open editor →" link

When all green: update `NEXT_SESSION.md` (editor redesign + deploy ✓), update the `project_cvmake` memory, and update `LAUNCH_DRAFTS.md` — the "live web editor" claims are now TRUE and can stay in the launch copy.
