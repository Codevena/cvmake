# Phase 9 — CI + Visual-Regression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pipeline auf GitHub Actions schützt jeden PR mit lint, typecheck, build, unit-tests, e2e-tests und 22 Visual-Regression-Snapshots; Failures liefern Diff-PNGs als Artifact.

**Architecture:** 3-Job CI-Layout (`static` parallel mit `unit`, danach `e2e-visual`). 8 existierende `<template>.visual.test.ts`-Files erweitert auf `it.each`-Loop über alle Palette-IDs des jeweiligen Templates. Gemeinsame Diff-Helper-Funktion in `_baseline-helpers.ts` reduziert Duplikation. Initial-Linux-Baselines via `workflow_dispatch`-Workflow `update-baselines.yml`.

**Tech Stack:** GitHub Actions, pnpm 9.12.0, Node 20.11.1, Vitest 2.1.5, Puppeteer 23.7.1, Playwright 1.49.0, pixelmatch 6.0.0, pngjs 7.0.0, biome 1.9.4, turbo 2.3.0.

**Spec:** `docs/superpowers/specs/2026-05-10-phase9-ci-visual-regression-design.md`

---

## File Structure

### Files to create

| Path | Responsibility |
|---|---|
| `packages/templates/test/visual/_baseline-helpers.ts` | Reusable `diffAgainstBaseline()` function — handles `.actual.png` write, `UPDATE_VISUAL` short-circuit, pixelmatch ratio, `.diff.png` write on failure. Returns ratio for `expect()` assertion in callers. |
| `.github/workflows/update-baselines.yml` | Manual `workflow_dispatch` workflow — runs `UPDATE_VISUAL=1 pnpm test:visual` on Linux and uploads PNGs as artifact. |
| `packages/templates/__tests__/__visual__/<template>/<palette>.page1.png` × 14 (new) | Baselines for the 14 currently uncovered palette combinations (will eventually be Linux-generated and overwrite all 22). |

### Files to modify

| Path | Change |
|---|---|
| `.github/workflows/ci.yml` | Replace single-job with 3-job hybrid layout (`static`, `unit`, `e2e-visual`). |
| `packages/templates/test/visual/academic.visual.test.ts` | `it.each(palettes)`, use `_baseline-helpers`, preserve `bootstrapTemplates+getTemplate` pattern. |
| `packages/templates/test/visual/classic-serif.visual.test.ts` | dito |
| `packages/templates/test/visual/corporate.visual.test.ts` | dito, preserve `clearRegistry+registerTemplate` pattern. |
| `packages/templates/test/visual/creative-accent.visual.test.ts` | dito, direct-import pattern. |
| `packages/templates/test/visual/editorial.visual.test.ts` | dito, `clearRegistry+registerTemplate` pattern. |
| `packages/templates/test/visual/modern-minimal.visual.test.ts` | dito, direct-import pattern. |
| `packages/templates/test/visual/monochrome-dark.visual.test.ts` | dito, `bootstrapTemplates+getTemplate` pattern. |
| `packages/templates/test/visual/tech-dev.visual.test.ts` | dito, direct-import pattern. |

### Files unchanged

- `apps/web/playwright.config.ts` (CI-detection + `retries: 2` already configured)
- `apps/web/e2e/*.spec.ts` (5 specs already written)
- `packages/templates/vitest.visual.config.ts`
- `turbo.json` (`test:visual` and `test:e2e` already registered)
- `packages/templates/package.json` (puppeteer/pixelmatch/pngjs already in devDeps)

### Per-template registration pattern reference

| Template | Pattern in `renderPageOneAsPng()` |
|---|---|
| `academic` | `bootstrapTemplates(); const template = getTemplate('academic'); if (!template) throw …` |
| `classic-serif` | `bootstrapTemplates(); const template = getTemplate('classic-serif'); if (!template) throw …` |
| `corporate` | `clearRegistry(); registerTemplate(corporate); const template = getTemplate('corporate'); if (!template) throw …` |
| `creative-accent` | `const template = creativeAccent;` (direct import) |
| `editorial` | `clearRegistry(); registerTemplate(editorial); const template = getTemplate('editorial'); if (!template) throw …` |
| `modern-minimal` | `const template = modernMinimal;` (direct import) |
| `monochrome-dark` | `bootstrapTemplates(); const template = getTemplate('monochrome-dark'); if (!template) throw …` |
| `tech-dev` | `const template = techDev;` (direct import) |

These patterns must be preserved per file — do not refactor them in this plan.

---

## Pre-flight

- [ ] **Step 0.1: Confirm clean working tree (except known uncommitted personal data)**

Run:
```bash
git status
```

Expected: only `data/cvs/cv.de.yaml`, `data/cvs/photos/markus.jpg`, `data/cvs/photos/markus.webp` modified/untracked. These are the deliberately-uncommitted personal data files (Pfad B unresolved). Don't touch them.

- [ ] **Step 0.2: Verify on `feat/cvmake-mvp`**

Run:
```bash
git rev-parse --abbrev-ref HEAD
```

Expected: `feat/cvmake-mvp`.

- [ ] **Step 0.3: Run baseline checks lokal**

Run:
```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm -r test:unit
```

Expected: typecheck, unit tests green; lint shows ~139 errors (Phase-7 baseline, OK).

---

## Task 1: Shared baseline-helpers module

**Files:**
- Create: `packages/templates/test/visual/_baseline-helpers.ts`

- [ ] **Step 1.1: Write the helper file**

Create `packages/templates/test/visual/_baseline-helpers.ts`:

```ts
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export const UPDATE = process.env.UPDATE_VISUAL === '1';
export const THRESHOLD_RATIO = 0.001;
export const PIXELMATCH_THRESHOLD = 0.1;

export interface DiffInput {
  templateId: string;
  paletteId: string;
  pageNumber?: number;
  png: Buffer;
}

export interface DiffResult {
  ratio: number;
  baselineWritten: boolean;
}

export async function diffAgainstBaseline({
  templateId,
  paletteId,
  pageNumber = 1,
  png,
}: DiffInput): Promise<DiffResult> {
  const baselineDir = path.resolve(`__tests__/__visual__/${templateId}`);
  const actualDir = path.resolve(`__tests__/__visual__/${templateId}/.actual`);
  const filename = `${paletteId}.page${pageNumber}.png`;
  const baselinePath = path.join(baselineDir, filename);
  const actualPath = path.join(actualDir, filename);
  const diffPath = path.join(
    actualDir,
    `${paletteId}.page${pageNumber}.diff.png`,
  );

  await mkdir(actualDir, { recursive: true });
  await writeFile(actualPath, png);

  if (UPDATE || !existsSync(baselinePath)) {
    await mkdir(baselineDir, { recursive: true });
    await writeFile(baselinePath, png);
    return { ratio: 0, baselineWritten: true };
  }

  const baseline = PNG.sync.read(await readFile(baselinePath));
  const actual = PNG.sync.read(png);
  const diff = new PNG({ width: baseline.width, height: baseline.height });
  const mismatched = pixelmatch(
    baseline.data,
    actual.data,
    diff.data,
    baseline.width,
    baseline.height,
    { threshold: PIXELMATCH_THRESHOLD },
  );
  const total = baseline.width * baseline.height;
  const ratio = mismatched / total;

  if (ratio >= THRESHOLD_RATIO) {
    await writeFile(diffPath, PNG.sync.write(diff));
  }

  return { ratio, baselineWritten: false };
}
```

- [ ] **Step 1.2: Verify typecheck**

Run:
```bash
pnpm --filter @codevena/forq-templates exec tsc --noEmit -p tsconfig.json
```

Expected: 0 errors.

- [ ] **Step 1.3: Commit**

```bash
git add packages/templates/test/visual/_baseline-helpers.ts
git commit -m "test(templates): extract shared baseline diff helper

Centralizes pixelmatch comparison, .actual/.diff PNG writes, and
UPDATE_VISUAL short-circuit so the eight per-template visual tests
can share one assertion path."
```

---

## Task 2: Extend `modern-minimal.visual.test.ts` to all palettes

This is the template task — Tasks 3–9 follow the same shape with the per-template registration pattern from the table above.

**Files:**
- Modify: `packages/templates/test/visual/modern-minimal.visual.test.ts`

- [ ] **Step 2.1: Replace the whole file**

Overwrite `packages/templates/test/visual/modern-minimal.visual.test.ts` with:

```ts
import { afterAll, describe, expect, it } from 'vitest';
import puppeteer from 'puppeteer';
import {
  renderCV,
  shutdownPdfBrowser,
  wrapHtmlDocument,
} from '@codevena/forq-core';
import { modernMinimal } from '../../src/modern-minimal/index.js';
import { loadTemplateCss } from '../../src/css.js';
import { fullFixture } from '@codevena/forq-schema/test/fixtures.js';
import { THRESHOLD_RATIO, diffAgainstBaseline } from './_baseline-helpers.js';

const TEMPLATE = modernMinimal;

afterAll(() => shutdownPdfBrowser());

async function renderPageOneAsPng(paletteId: string): Promise<Buffer> {
  const rendered = await renderCV({
    data: fullFixture,
    template: TEMPLATE,
    paletteId,
  });
  const css = `${rendered.css}\n${loadTemplateCss(TEMPLATE.meta.id)}`;
  const html = wrapHtmlDocument({ title: 'CV', html: rendered.html, css });
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buf = await page.screenshot({ fullPage: false, type: 'png' });
    return Buffer.from(buf);
  } finally {
    await browser.close();
  }
}

describe(`${TEMPLATE.meta.id} visual baseline`, () => {
  it.each(TEMPLATE.palettes.map((p) => p.id))(
    'matches baseline für %s',
    async (paletteId) => {
      const png = await renderPageOneAsPng(paletteId);
      const { ratio } = await diffAgainstBaseline({
        templateId: TEMPLATE.meta.id,
        paletteId,
        png,
      });
      expect(ratio).toBeLessThan(THRESHOLD_RATIO);
    },
  );
});
```

> **Note:** `TEMPLATE.meta.id` rather than a hardcoded string keeps the test honest if the meta id ever changes; `modernMinimal` exports `meta` in its `TemplateDefinition`.

- [ ] **Step 2.2: Run only this test, expect existing palette to pass and new ones to auto-baseline**

Run:
```bash
pnpm --filter @codevena/forq-templates build
UPDATE_VISUAL=1 pnpm --filter @codevena/forq-templates test:visual -- modern-minimal
```

Expected: 3 cases (`minimal-ink`, `minimal-ocean`, `minimal-rose`) all green; new baselines for `minimal-ocean` and `minimal-rose` written under `packages/templates/__tests__/__visual__/modern-minimal/`.

- [ ] **Step 2.3: Re-run without UPDATE_VISUAL to confirm assertions actually compare**

Run:
```bash
pnpm --filter @codevena/forq-templates test:visual -- modern-minimal
```

Expected: 3 cases green, no new baseline writes.

- [ ] **Step 2.4: Inspect the two new PNGs visually**

Run:
```bash
ls -lh packages/templates/__tests__/__visual__/modern-minimal/
```

Open `minimal-ocean.page1.png` and `minimal-rose.page1.png` in Preview. Confirm they show a CV with the expected color accents (ocean blue / rose pink).

- [ ] **Step 2.5: Commit**

```bash
git add packages/templates/test/visual/modern-minimal.visual.test.ts \
        packages/templates/__tests__/__visual__/modern-minimal/
git commit -m "test(templates/modern-minimal): cover all palettes via it.each loop"
```

---

## Task 3: Extend `classic-serif.visual.test.ts`

**Files:**
- Modify: `packages/templates/test/visual/classic-serif.visual.test.ts`

- [ ] **Step 3.1: Replace the whole file**

Overwrite `packages/templates/test/visual/classic-serif.visual.test.ts` with:

```ts
import { afterAll, describe, expect, it } from 'vitest';
import puppeteer from 'puppeteer';
import {
  renderCV,
  shutdownPdfBrowser,
  wrapHtmlDocument,
} from '@codevena/forq-core';
import { bootstrapTemplates, getTemplate } from '../../src/index.js';
import { loadTemplateCss } from '../../src/css.js';
import { fullFixture } from '@codevena/forq-schema/test/fixtures.js';
import { THRESHOLD_RATIO, diffAgainstBaseline } from './_baseline-helpers.js';

const TEMPLATE_ID = 'classic-serif';

afterAll(() => shutdownPdfBrowser());

async function renderPageOneAsPng(paletteId: string): Promise<Buffer> {
  bootstrapTemplates();
  const template = getTemplate(TEMPLATE_ID);
  if (!template) throw new Error(`${TEMPLATE_ID} not registered`);
  const rendered = await renderCV({
    data: fullFixture,
    template,
    paletteId,
  });
  const css = `${rendered.css}\n${loadTemplateCss(TEMPLATE_ID)}`;
  const html = wrapHtmlDocument({ title: 'CV', html: rendered.html, css });
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buf = await page.screenshot({ fullPage: false, type: 'png' });
    return Buffer.from(buf);
  } finally {
    await browser.close();
  }
}

describe(`${TEMPLATE_ID} visual baseline`, () => {
  bootstrapTemplates();
  const template = getTemplate(TEMPLATE_ID);
  if (!template) throw new Error(`${TEMPLATE_ID} not registered`);

  it.each(template.palettes.map((p) => p.id))(
    'matches baseline für %s',
    async (paletteId) => {
      const png = await renderPageOneAsPng(paletteId);
      const { ratio } = await diffAgainstBaseline({
        templateId: TEMPLATE_ID,
        paletteId,
        png,
      });
      expect(ratio).toBeLessThan(THRESHOLD_RATIO);
    },
  );
});
```

> **Note:** The `bootstrapTemplates` call inside the `describe` block runs at collection time, which is what `it.each` needs for the palette-id list.

- [ ] **Step 3.2: Smoke test**

Run:
```bash
UPDATE_VISUAL=1 pnpm --filter @codevena/forq-templates test:visual -- classic-serif
```

Expected: 3 cases (`classic-grey`, `classic-navy`, `classic-ink`) green; 2 new baselines written.

- [ ] **Step 3.3: Re-run without UPDATE_VISUAL**

Run:
```bash
pnpm --filter @codevena/forq-templates test:visual -- classic-serif
```

Expected: 3 cases green.

- [ ] **Step 3.4: Visual inspection**

```bash
ls -lh packages/templates/__tests__/__visual__/classic-serif/
```

Open `classic-navy.page1.png` and `classic-ink.page1.png` in Preview, confirm correct accent colors.

- [ ] **Step 3.5: Commit**

```bash
git add packages/templates/test/visual/classic-serif.visual.test.ts \
        packages/templates/__tests__/__visual__/classic-serif/
git commit -m "test(templates/classic-serif): cover all palettes via it.each loop"
```

---

## Task 4: Extend `academic.visual.test.ts`

**Files:**
- Modify: `packages/templates/test/visual/academic.visual.test.ts`

- [ ] **Step 4.1: Replace the whole file**

Overwrite `packages/templates/test/visual/academic.visual.test.ts` with:

```ts
import { afterAll, describe, expect, it } from 'vitest';
import puppeteer from 'puppeteer';
import {
  renderCV,
  shutdownPdfBrowser,
  wrapHtmlDocument,
} from '@codevena/forq-core';
import { bootstrapTemplates, getTemplate } from '../../src/index.js';
import { loadTemplateCss } from '../../src/css.js';
import { fullFixture } from '@codevena/forq-schema/test/fixtures.js';
import { THRESHOLD_RATIO, diffAgainstBaseline } from './_baseline-helpers.js';

const TEMPLATE_ID = 'academic';

afterAll(() => shutdownPdfBrowser());

async function renderPageOneAsPng(paletteId: string): Promise<Buffer> {
  bootstrapTemplates();
  const template = getTemplate(TEMPLATE_ID);
  if (!template) throw new Error(`${TEMPLATE_ID} not registered`);
  const rendered = await renderCV({
    data: fullFixture,
    template,
    paletteId,
  });
  const css = `${rendered.css}\n${loadTemplateCss(TEMPLATE_ID)}`;
  const html = wrapHtmlDocument({ title: 'CV', html: rendered.html, css });
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buf = await page.screenshot({ fullPage: false, type: 'png' });
    return Buffer.from(buf);
  } finally {
    await browser.close();
  }
}

describe(`${TEMPLATE_ID} visual baseline`, () => {
  bootstrapTemplates();
  const template = getTemplate(TEMPLATE_ID);
  if (!template) throw new Error(`${TEMPLATE_ID} not registered`);

  it.each(template.palettes.map((p) => p.id))(
    'matches baseline für %s',
    async (paletteId) => {
      const png = await renderPageOneAsPng(paletteId);
      const { ratio } = await diffAgainstBaseline({
        templateId: TEMPLATE_ID,
        paletteId,
        png,
      });
      expect(ratio).toBeLessThan(THRESHOLD_RATIO);
    },
  );
});
```

- [ ] **Step 4.2: Smoke test**

```bash
UPDATE_VISUAL=1 pnpm --filter @codevena/forq-templates test:visual -- academic
```

Expected: 2 cases (`academic-slate`, `academic-burgundy`) green; 1 new baseline (`academic-burgundy`) written.

- [ ] **Step 4.3: Re-run without UPDATE_VISUAL**

```bash
pnpm --filter @codevena/forq-templates test:visual -- academic
```

Expected: 2 cases green.

- [ ] **Step 4.4: Visual inspection**

Open `packages/templates/__tests__/__visual__/academic/academic-burgundy.page1.png` in Preview.

- [ ] **Step 4.5: Commit**

```bash
git add packages/templates/test/visual/academic.visual.test.ts \
        packages/templates/__tests__/__visual__/academic/
git commit -m "test(templates/academic): cover all palettes via it.each loop"
```

---

## Task 5: Extend `corporate.visual.test.ts`

**Files:**
- Modify: `packages/templates/test/visual/corporate.visual.test.ts`

- [ ] **Step 5.1: Replace the whole file**

Overwrite `packages/templates/test/visual/corporate.visual.test.ts` with:

```ts
import { afterAll, describe, expect, it } from 'vitest';
import puppeteer from 'puppeteer';
import {
  renderCV,
  shutdownPdfBrowser,
  wrapHtmlDocument,
} from '@codevena/forq-core';
import { clearRegistry, getTemplate, registerTemplate } from '../../src/index.js';
import { corporate } from '../../src/corporate/index.js';
import { loadTemplateCss } from '../../src/css.js';
import { fullFixture } from '@codevena/forq-schema/test/fixtures.js';
import { THRESHOLD_RATIO, diffAgainstBaseline } from './_baseline-helpers.js';

const TEMPLATE_ID = 'corporate';

afterAll(() => shutdownPdfBrowser());

async function renderPageOneAsPng(paletteId: string): Promise<Buffer> {
  clearRegistry();
  registerTemplate(corporate);
  const template = getTemplate(TEMPLATE_ID);
  if (!template) throw new Error(`${TEMPLATE_ID} not registered`);
  const rendered = await renderCV({
    data: fullFixture,
    template,
    paletteId,
  });
  const css = `${rendered.css}\n${loadTemplateCss(TEMPLATE_ID)}`;
  const html = wrapHtmlDocument({ title: 'CV', html: rendered.html, css });
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buf = await page.screenshot({ fullPage: false, type: 'png' });
    return Buffer.from(buf);
  } finally {
    await browser.close();
  }
}

describe(`${TEMPLATE_ID} visual baseline`, () => {
  it.each(corporate.palettes.map((p) => p.id))(
    'matches baseline für %s',
    async (paletteId) => {
      const png = await renderPageOneAsPng(paletteId);
      const { ratio } = await diffAgainstBaseline({
        templateId: TEMPLATE_ID,
        paletteId,
        png,
      });
      expect(ratio).toBeLessThan(THRESHOLD_RATIO);
    },
  );
});
```

> **Note:** For `clearRegistry+registerTemplate`-pattern templates, we read palette IDs directly from the imported template object instead of through the registry, because collection-time registry state is fragile.

- [ ] **Step 5.2: Smoke test**

```bash
UPDATE_VISUAL=1 pnpm --filter @codevena/forq-templates test:visual -- corporate
```

Expected: 2 cases (`corporate-graphite`, `corporate-steel`) green; 1 new baseline (`corporate-steel`) written.

- [ ] **Step 5.3: Re-run without UPDATE_VISUAL**

```bash
pnpm --filter @codevena/forq-templates test:visual -- corporate
```

Expected: 2 cases green.

- [ ] **Step 5.4: Visual inspection**

Open `packages/templates/__tests__/__visual__/corporate/corporate-steel.page1.png` in Preview.

- [ ] **Step 5.5: Commit**

```bash
git add packages/templates/test/visual/corporate.visual.test.ts \
        packages/templates/__tests__/__visual__/corporate/
git commit -m "test(templates/corporate): cover all palettes via it.each loop"
```

---

## Task 6: Extend `creative-accent.visual.test.ts`

**Files:**
- Modify: `packages/templates/test/visual/creative-accent.visual.test.ts`

- [ ] **Step 6.1: Replace the whole file**

Overwrite `packages/templates/test/visual/creative-accent.visual.test.ts` with:

```ts
import { afterAll, describe, expect, it } from 'vitest';
import puppeteer from 'puppeteer';
import {
  renderCV,
  shutdownPdfBrowser,
  wrapHtmlDocument,
} from '@codevena/forq-core';
import { creativeAccent } from '../../src/creative-accent/index.js';
import { loadTemplateCss } from '../../src/css.js';
import { fullFixture } from '@codevena/forq-schema/test/fixtures.js';
import { THRESHOLD_RATIO, diffAgainstBaseline } from './_baseline-helpers.js';

const TEMPLATE = creativeAccent;

afterAll(() => shutdownPdfBrowser());

async function renderPageOneAsPng(paletteId: string): Promise<Buffer> {
  const rendered = await renderCV({
    data: fullFixture,
    template: TEMPLATE,
    paletteId,
  });
  const css = `${rendered.css}\n${loadTemplateCss(TEMPLATE.meta.id)}`;
  const html = wrapHtmlDocument({ title: 'CV', html: rendered.html, css });
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buf = await page.screenshot({ fullPage: false, type: 'png' });
    return Buffer.from(buf);
  } finally {
    await browser.close();
  }
}

describe(`${TEMPLATE.meta.id} visual baseline`, () => {
  it.each(TEMPLATE.palettes.map((p) => p.id))(
    'matches baseline für %s',
    async (paletteId) => {
      const png = await renderPageOneAsPng(paletteId);
      const { ratio } = await diffAgainstBaseline({
        templateId: TEMPLATE.meta.id,
        paletteId,
        png,
      });
      expect(ratio).toBeLessThan(THRESHOLD_RATIO);
    },
  );
});
```

- [ ] **Step 6.2: Smoke test**

```bash
UPDATE_VISUAL=1 pnpm --filter @codevena/forq-templates test:visual -- creative-accent
```

Expected: 4 cases (`creative-citrus`, `creative-forest`, `creative-indigo`, `creative-coral`) green; 3 new baselines written.

- [ ] **Step 6.3: Re-run without UPDATE_VISUAL**

```bash
pnpm --filter @codevena/forq-templates test:visual -- creative-accent
```

Expected: 4 cases green.

- [ ] **Step 6.4: Visual inspection**

Open the 3 new PNGs in `packages/templates/__tests__/__visual__/creative-accent/` (`creative-forest`, `creative-indigo`, `creative-coral`).

- [ ] **Step 6.5: Commit**

```bash
git add packages/templates/test/visual/creative-accent.visual.test.ts \
        packages/templates/__tests__/__visual__/creative-accent/
git commit -m "test(templates/creative-accent): cover all palettes via it.each loop"
```

---

## Task 7: Extend `editorial.visual.test.ts`

**Files:**
- Modify: `packages/templates/test/visual/editorial.visual.test.ts`

- [ ] **Step 7.1: Replace the whole file**

Overwrite `packages/templates/test/visual/editorial.visual.test.ts` with:

```ts
import { afterAll, describe, expect, it } from 'vitest';
import puppeteer from 'puppeteer';
import {
  renderCV,
  shutdownPdfBrowser,
  wrapHtmlDocument,
} from '@codevena/forq-core';
import { clearRegistry, getTemplate, registerTemplate } from '../../src/registry.js';
import { editorial } from '../../src/editorial/index.js';
import { loadTemplateCss } from '../../src/css.js';
import { fullFixture } from '@codevena/forq-schema/test/fixtures.js';
import { THRESHOLD_RATIO, diffAgainstBaseline } from './_baseline-helpers.js';

const TEMPLATE_ID = 'editorial';

afterAll(() => shutdownPdfBrowser());

async function renderPageOneAsPng(paletteId: string): Promise<Buffer> {
  clearRegistry();
  registerTemplate(editorial);
  const template = getTemplate(TEMPLATE_ID);
  if (!template) throw new Error(`${TEMPLATE_ID} not registered`);
  const rendered = await renderCV({
    data: fullFixture,
    template,
    paletteId,
  });
  const css = `${rendered.css}\n${loadTemplateCss(TEMPLATE_ID)}`;
  const html = wrapHtmlDocument({ title: 'CV', html: rendered.html, css });
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buf = await page.screenshot({ fullPage: false, type: 'png' });
    return Buffer.from(buf);
  } finally {
    await browser.close();
  }
}

describe(`${TEMPLATE_ID} visual baseline`, () => {
  it.each(editorial.palettes.map((p) => p.id))(
    'matches baseline für %s',
    async (paletteId) => {
      const png = await renderPageOneAsPng(paletteId);
      const { ratio } = await diffAgainstBaseline({
        templateId: TEMPLATE_ID,
        paletteId,
        png,
      });
      expect(ratio).toBeLessThan(THRESHOLD_RATIO);
    },
  );
});
```

> **Note:** Editorial imports from `../../src/registry.js` (not `../../src/index.js`) — preserve that.

- [ ] **Step 7.2: Smoke test**

```bash
UPDATE_VISUAL=1 pnpm --filter @codevena/forq-templates test:visual -- editorial
```

Expected: 2 cases (`editorial-paper`, `editorial-cream`) green; 1 new baseline (`editorial-cream`) written.

- [ ] **Step 7.3: Re-run without UPDATE_VISUAL**

```bash
pnpm --filter @codevena/forq-templates test:visual -- editorial
```

Expected: 2 cases green.

- [ ] **Step 7.4: Visual inspection**

Open `packages/templates/__tests__/__visual__/editorial/editorial-cream.page1.png` in Preview.

- [ ] **Step 7.5: Commit**

```bash
git add packages/templates/test/visual/editorial.visual.test.ts \
        packages/templates/__tests__/__visual__/editorial/
git commit -m "test(templates/editorial): cover all palettes via it.each loop"
```

---

## Task 8: Extend `monochrome-dark.visual.test.ts`

**Files:**
- Modify: `packages/templates/test/visual/monochrome-dark.visual.test.ts`

- [ ] **Step 8.1: Replace the whole file**

Overwrite `packages/templates/test/visual/monochrome-dark.visual.test.ts` with:

```ts
import { afterAll, describe, expect, it } from 'vitest';
import puppeteer from 'puppeteer';
import {
  renderCV,
  shutdownPdfBrowser,
  wrapHtmlDocument,
} from '@codevena/forq-core';
import { bootstrapTemplates, getTemplate } from '../../src/index.js';
import { loadTemplateCss } from '../../src/css.js';
import { fullFixture } from '@codevena/forq-schema/test/fixtures.js';
import { THRESHOLD_RATIO, diffAgainstBaseline } from './_baseline-helpers.js';

const TEMPLATE_ID = 'monochrome-dark';

afterAll(() => shutdownPdfBrowser());

async function renderPageOneAsPng(paletteId: string): Promise<Buffer> {
  bootstrapTemplates();
  const template = getTemplate(TEMPLATE_ID);
  if (!template) throw new Error(`${TEMPLATE_ID} not registered`);
  const rendered = await renderCV({
    data: fullFixture,
    template,
    paletteId,
  });
  const css = `${rendered.css}\n${loadTemplateCss(TEMPLATE_ID)}`;
  const html = wrapHtmlDocument({ title: 'CV', html: rendered.html, css });
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buf = await page.screenshot({ fullPage: false, type: 'png' });
    return Buffer.from(buf);
  } finally {
    await browser.close();
  }
}

describe(`${TEMPLATE_ID} visual baseline`, () => {
  bootstrapTemplates();
  const template = getTemplate(TEMPLATE_ID);
  if (!template) throw new Error(`${TEMPLATE_ID} not registered`);

  it.each(template.palettes.map((p) => p.id))(
    'matches baseline für %s',
    async (paletteId) => {
      const png = await renderPageOneAsPng(paletteId);
      const { ratio } = await diffAgainstBaseline({
        templateId: TEMPLATE_ID,
        paletteId,
        png,
      });
      expect(ratio).toBeLessThan(THRESHOLD_RATIO);
    },
  );
});
```

- [ ] **Step 8.2: Smoke test**

```bash
UPDATE_VISUAL=1 pnpm --filter @codevena/forq-templates test:visual -- monochrome-dark
```

Expected: 3 cases (`mono-carbon`, `mono-amber`, `mono-emerald`) green; 2 new baselines written.

- [ ] **Step 8.3: Re-run without UPDATE_VISUAL**

```bash
pnpm --filter @codevena/forq-templates test:visual -- monochrome-dark
```

Expected: 3 cases green.

- [ ] **Step 8.4: Visual inspection**

Open `mono-amber.page1.png` and `mono-emerald.page1.png` from `packages/templates/__tests__/__visual__/monochrome-dark/`. Note: these are dark-background templates; verify amber/emerald accent colors are visible.

- [ ] **Step 8.5: Commit**

```bash
git add packages/templates/test/visual/monochrome-dark.visual.test.ts \
        packages/templates/__tests__/__visual__/monochrome-dark/
git commit -m "test(templates/monochrome-dark): cover all palettes via it.each loop"
```

---

## Task 9: Extend `tech-dev.visual.test.ts`

**Files:**
- Modify: `packages/templates/test/visual/tech-dev.visual.test.ts`

- [ ] **Step 9.1: Replace the whole file**

Overwrite `packages/templates/test/visual/tech-dev.visual.test.ts` with:

```ts
import { afterAll, describe, expect, it } from 'vitest';
import puppeteer from 'puppeteer';
import {
  renderCV,
  shutdownPdfBrowser,
  wrapHtmlDocument,
} from '@codevena/forq-core';
import { techDev } from '../../src/tech-dev/index.js';
import { loadTemplateCss } from '../../src/css.js';
import { fullFixture } from '@codevena/forq-schema/test/fixtures.js';
import { THRESHOLD_RATIO, diffAgainstBaseline } from './_baseline-helpers.js';

const TEMPLATE = techDev;

afterAll(() => shutdownPdfBrowser());

async function renderPageOneAsPng(paletteId: string): Promise<Buffer> {
  const rendered = await renderCV({
    data: fullFixture,
    template: TEMPLATE,
    paletteId,
  });
  const css = `${rendered.css}\n${loadTemplateCss(TEMPLATE.meta.id)}`;
  const html = wrapHtmlDocument({ title: 'CV', html: rendered.html, css });
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buf = await page.screenshot({ fullPage: false, type: 'png' });
    return Buffer.from(buf);
  } finally {
    await browser.close();
  }
}

describe(`${TEMPLATE.meta.id} visual baseline`, () => {
  it.each(TEMPLATE.palettes.map((p) => p.id))(
    'matches baseline für %s',
    async (paletteId) => {
      const png = await renderPageOneAsPng(paletteId);
      const { ratio } = await diffAgainstBaseline({
        templateId: TEMPLATE.meta.id,
        paletteId,
        png,
      });
      expect(ratio).toBeLessThan(THRESHOLD_RATIO);
    },
  );
});
```

- [ ] **Step 9.2: Smoke test**

```bash
UPDATE_VISUAL=1 pnpm --filter @codevena/forq-templates test:visual -- tech-dev
```

Expected: 3 cases (`tech-terminal`, `tech-ocean`, `tech-violet`) green; 2 new baselines written.

- [ ] **Step 9.3: Re-run without UPDATE_VISUAL**

```bash
pnpm --filter @codevena/forq-templates test:visual -- tech-dev
```

Expected: 3 cases green.

- [ ] **Step 9.4: Visual inspection**

Open `tech-ocean.page1.png` and `tech-violet.page1.png` from `packages/templates/__tests__/__visual__/tech-dev/`.

- [ ] **Step 9.5: Commit**

```bash
git add packages/templates/test/visual/tech-dev.visual.test.ts \
        packages/templates/__tests__/__visual__/tech-dev/
git commit -m "test(templates/tech-dev): cover all palettes via it.each loop"
```

---

## Task 10: Full local visual-suite verification

**Files:** None (verification only)

- [ ] **Step 10.1: Run the entire visual suite end-to-end**

Run:
```bash
pnpm --filter @codevena/forq-templates test:visual
```

Expected: 22 test cases total, all green. Vitest output should show 8 describe blocks.

- [ ] **Step 10.2: Confirm baseline-PNG count**

Run:
```bash
find packages/templates/__tests__/__visual__ -name "*.page1.png" -not -path "*/.actual/*" | wc -l
```

Expected: `22`.

- [ ] **Step 10.3: Confirm no `.actual/*.diff.png` files exist (none should be flagged)**

Run:
```bash
find packages/templates/__tests__/__visual__ -name "*.diff.png" 2>/dev/null
```

Expected: empty output.

- [ ] **Step 10.4: Cleanup `.actual/` to keep diffs noise-free in next run**

Run:
```bash
find packages/templates/__tests__/__visual__ -type d -name ".actual" -exec rm -rf {} + 2>/dev/null
```

Expected: clean. (No commit; `.actual/` is gitignored — see `packages/templates/.gitignore` if present, or this is overwritten on every run anyway.)

- [ ] **Step 10.5: Run full lint + typecheck + unit suite to catch regressions**

Run:
```bash
pnpm typecheck
pnpm lint
pnpm -r test:unit
```

Expected: typecheck and unit green; lint <= 143 errors (Phase-7 baseline).

---

## Task 11: Replace single-job CI with 3-job hybrid layout

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 11.1: Replace the workflow file**

Overwrite `.github/workflows/ci.yml` with:

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:

jobs:
  static:
    name: static (lint + typecheck + build)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9.12.0 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20.11.1
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm build

  unit:
    name: unit tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9.12.0 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20.11.1
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r test:unit

  e2e-visual:
    name: e2e + visual
    runs-on: ubuntu-latest
    needs: [static]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9.12.0 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20.11.1
          cache: pnpm
      - run: pnpm install --frozen-lockfile

      - name: cache playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: ${{ runner.os }}-playwright-${{ hashFiles('**/pnpm-lock.yaml') }}

      - name: cache puppeteer browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/puppeteer
          key: ${{ runner.os }}-puppeteer-${{ hashFiles('**/pnpm-lock.yaml') }}

      - name: install playwright chromium
        run: pnpm --filter @codevena/forq-web exec playwright install --with-deps chromium

      - run: pnpm build

      - name: run e2e tests
        run: pnpm --filter @codevena/forq-web test:e2e

      - name: run visual tests
        run: pnpm --filter @codevena/forq-templates test:visual

      - name: upload visual artifacts on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diffs-${{ github.run_id }}
          path: |
            packages/templates/__tests__/__visual__/**/.actual/**
            apps/web/playwright-report/**
            apps/web/test-results/**
          if-no-files-found: ignore
          retention-days: 30
```

- [ ] **Step 11.2: Validate YAML syntax locally**

Run:
```bash
node -e "console.log(require('js-yaml').load(require('fs').readFileSync('.github/workflows/ci.yml','utf8')).jobs)" 2>&1 | head -20
```

Expected: prints object with `static`, `unit`, `e2e-visual` keys (no parse error). If `js-yaml` isn't globally available, run via the workspace:
```bash
pnpm exec -- node -e "console.log(require('js-yaml').load(require('fs').readFileSync('.github/workflows/ci.yml','utf8')).jobs)"
```

- [ ] **Step 11.3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: split pipeline into static / unit / e2e-visual jobs

- static (lint+typecheck+build) and unit run in parallel
- e2e-visual depends on static, runs Playwright + Puppeteer with
  browser binary caches
- on failure, uploads .actual PNGs, playwright-report, test-results
  as 30-day artifact"
```

---

## Task 12: Add manual baseline-update workflow

**Files:**
- Create: `.github/workflows/update-baselines.yml`

- [ ] **Step 12.1: Create the workflow file**

Create `.github/workflows/update-baselines.yml`:

```yaml
name: Update Visual Baselines
on:
  workflow_dispatch:
    inputs:
      branch:
        description: 'Branch to generate baselines for'
        required: true
        default: 'feat/cvmake-mvp'

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.branch }}
      - uses: pnpm/action-setup@v4
        with: { version: 9.12.0 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20.11.1
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @codevena/forq-templates build
      - name: cache puppeteer browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/puppeteer
          key: ${{ runner.os }}-puppeteer-${{ hashFiles('**/pnpm-lock.yaml') }}
      - name: regenerate all visual baselines
        env:
          UPDATE_VISUAL: '1'
        run: pnpm --filter @codevena/forq-templates test:visual
      - name: upload baselines
        uses: actions/upload-artifact@v4
        with:
          name: visual-baselines-linux-${{ github.run_id }}
          path: packages/templates/__tests__/__visual__/**/*.page*.png
          retention-days: 7
```

- [ ] **Step 12.2: Validate YAML**

Run:
```bash
pnpm exec -- node -e "console.log(require('js-yaml').load(require('fs').readFileSync('.github/workflows/update-baselines.yml','utf8')).jobs)"
```

Expected: prints object with `generate` key.

- [ ] **Step 12.3: Commit**

```bash
git add .github/workflows/update-baselines.yml
git commit -m "ci: add manual workflow for Linux visual baseline generation"
```

---

## Task 13: Push branch and observe initial CI run

**Files:** None (operational task)

> **Stop here for explicit user push approval — CLAUDE.md global rule.**

- [ ] **Step 13.1: Ask user permission to push**

Show the user:
```
Bereit zu pushen. Push wird `feat/cvmake-mvp` zu origin pushen, was sofort den CI-Run auf
GitHub Actions triggert. Erwartet: `static` und `unit` grün, `e2e-visual` rot wegen
macOS-vs-Linux-Render-Differenz auf den ~22 Snapshots. Sind das die richtigen
Erwartungen — und ok zu pushen?
```

Wait for explicit user approval.

- [ ] **Step 13.2: Push**

Run:
```bash
git push origin feat/cvmake-mvp
```

- [ ] **Step 13.3: Watch the run**

Run:
```bash
gh run watch --exit-status
```

Expected outcome (the first time):
- `static`: ✅ success
- `unit`: ✅ success
- `e2e-visual`: ❌ failure on `pnpm --filter @codevena/forq-templates test:visual`, with most/all 22 cases failing on pixel-diff. E2E sub-step should be green (it passed before locally and uses fixtures, no template renders).

If `e2e-visual` is unexpectedly green: log it as a finding and proceed to Step 13.4 anyway — could mean macOS/Linux Chromium produce identical output for our render. If `e2e` part fails before visual tests even run: STOP, debug the failure separately (likely Playwright config or Next.js startup issue).

- [ ] **Step 13.4: Download the failure artifact**

Run:
```bash
gh run download --name "visual-diffs-$(gh run list --branch feat/cvmake-mvp --workflow ci.yml --limit 1 --json databaseId --jq '.[0].databaseId')" --dir /tmp/visual-diffs-pr1
```

Expected: directory `/tmp/visual-diffs-pr1/packages/templates/__tests__/__visual__/<template>/.actual/<palette>.page1.png` and `*.diff.png` exist for failed cases.

- [ ] **Step 13.5: Spot-check one diff**

Open `/tmp/visual-diffs-pr1/packages/templates/__tests__/__visual__/modern-minimal/.actual/minimal-ink.page1.diff.png` in Preview. Expected: pixel-noise pattern indicating subpixel font-rendering differences (consistent with macOS-vs-Linux explanation), not catastrophic layout breakage.

If you see catastrophic layout differences (missing text, broken positioning): STOP. The CI environment has a misconfiguration unrelated to OS rendering — debug separately.

---

## Task 14: Trigger update-baselines workflow and refresh local baselines

**Files:**
- Modify: `packages/templates/__tests__/__visual__/<template>/<palette>.page1.png` (all 22 — overwritten with Linux versions)

- [ ] **Step 14.1: Trigger the manual workflow**

Run:
```bash
gh workflow run update-baselines.yml --ref feat/cvmake-mvp -f branch=feat/cvmake-mvp
```

- [ ] **Step 14.2: Wait for it to finish and capture run ID**

Run:
```bash
gh run watch --exit-status
RUN_ID=$(gh run list --workflow update-baselines.yml --branch feat/cvmake-mvp --limit 1 --json databaseId --jq '.[0].databaseId')
echo "Run ID: $RUN_ID"
```

Expected: `success`.

- [ ] **Step 14.3: Download the Linux baselines**

Run:
```bash
gh run download "$RUN_ID" --name "visual-baselines-linux-${RUN_ID}" --dir /tmp/linux-baselines
ls /tmp/linux-baselines/packages/templates/__tests__/__visual__/
```

Expected: 8 directories listed (`academic`, `classic-serif`, `corporate`, `creative-accent`, `editorial`, `modern-minimal`, `monochrome-dark`, `tech-dev`); 22 `.page1.png` files total.

- [ ] **Step 14.4: Replace local baselines with Linux versions**

Run:
```bash
rm -rf packages/templates/__tests__/__visual__/*/.actual
cp -R /tmp/linux-baselines/packages/templates/__tests__/__visual__/* \
       packages/templates/__tests__/__visual__/
```

> **Why we overwrite even the originally-passing 8:** macOS-Chromium and Linux-Chromium render slightly differently. Mixing OS-origin baselines causes flake. Single-OS-source = consistency.

- [ ] **Step 14.5: Verify count and visual sanity**

Run:
```bash
find packages/templates/__tests__/__visual__ -name "*.page1.png" -not -path "*/.actual/*" | wc -l
```

Expected: `22`.

Open 3–4 random PNGs in Preview to confirm they look sane (CV layout, correct palette colors, no rendering failure).

- [ ] **Step 14.6: Run the suite locally**

Run:
```bash
pnpm --filter @codevena/forq-templates test:visual
```

Expected outcome: One of two scenarios is acceptable:

(a) **All 22 pass** — Linux baselines also match macOS Chromium output close enough. Move on.

(b) **All 22 fail with macOS-vs-Linux diff** — same drift as in Step 13. Local Mac runs will always diff against Linux baselines. This is acceptable and expected; the contract is "CI is the source of truth, local is best-effort." Document in commit message.

If only some fail: investigate which templates are flaky between OSes; could indicate a real layout sensitivity worth tracking.

- [ ] **Step 14.7: Commit**

```bash
git add packages/templates/__tests__/__visual__/
git commit -m "test(templates): replace baselines with Linux-CI-generated versions

Generated via the manual update-baselines workflow on ubuntu-latest
to establish CI as the source of truth for visual regression.
Local Mac runs may diff against these baselines due to subpixel
font-rendering differences; CI run on PRs is authoritative."
```

- [ ] **Step 14.8: Push and watch CI**

> **Ask user for push approval again.**

Then:
```bash
git push origin feat/cvmake-mvp
gh run watch --exit-status
```

Expected: all 3 jobs green.

If `e2e-visual` is still red: download artifact, inspect diff PNGs. Possible causes:
- Stale browser cache on CI (rare; cache key is pnpm-lock-based)
- Race condition between baseline download and test run (unlikely, all sequential)
- Genuine pixel drift across CI runs (browser version pinning issue)

Investigate before declaring done.

---

## Task 15: Threshold sanity check — verify CI catches a regression

**Files:** None (temporary edit, will be reverted)

- [ ] **Step 15.1: Introduce an artificial visual change**

Edit `packages/templates/src/modern-minimal/styles.css` and add anywhere:

```css
/* TEMP — sanity check for CI visual gate, will be removed in same step */
.cv-name { letter-spacing: 0.5px !important; }
```

(Or similar — pick a selector that exists. Verify the selector by `grep -r "cv-name" packages/templates/src/modern-minimal/`. If no `.cv-name` selector exists, use any existing class with a property delta, e.g. `body { padding-top: 1px; }`.)

- [ ] **Step 15.2: Run visual tests locally**

```bash
pnpm --filter @codevena/forq-templates build
pnpm --filter @codevena/forq-templates test:visual -- modern-minimal
```

Expected: 3 cases fail with mismatch ratio above 0.001. `.actual/*.diff.png` files written.

- [ ] **Step 15.3: Push to CI and confirm rejection**

> **Ask user for push approval.**

```bash
git add packages/templates/src/modern-minimal/styles.css
git commit -m "TEMP: visual sanity check (DO NOT MERGE)"
git push origin feat/cvmake-mvp
gh run watch --exit-status
```

Expected: `e2e-visual` job fails on visual tests; artifact contains diff PNGs.

- [ ] **Step 15.4: Download and inspect**

```bash
gh run download $(gh run list --branch feat/cvmake-mvp --workflow ci.yml --limit 1 --json databaseId --jq '.[0].databaseId') --name "visual-diffs-$(gh run list --branch feat/cvmake-mvp --workflow ci.yml --limit 1 --json databaseId --jq '.[0].databaseId')" --dir /tmp/sanity-check-diffs
```

Expected: `/tmp/sanity-check-diffs/.../modern-minimal/.actual/*.diff.png` exists for the 3 modern-minimal palettes.

- [ ] **Step 15.5: Revert the temp change**

Run:
```bash
git reset --hard HEAD~1
```

Expected: working tree clean, last commit removed.

- [ ] **Step 15.6: Force-push to clean up the sanity-check commit on origin**

> **Ask user explicitly:** `Force-push origin/feat/cvmake-mvp to drop the TEMP sanity-check commit?` This is a destructive op on a remote branch — explicit yes required.

If approved:
```bash
git push --force-with-lease origin feat/cvmake-mvp
gh run watch --exit-status
```

Expected: clean CI run, all 3 jobs green.

If NOT approved: leave the commit in place but ensure it's clearly marked "DO NOT MERGE". Mention this in the final summary.

---

## Task 16: Run full DoD review pipeline

Per CLAUDE.md global, before declaring Phase 9 done: run Codex×2 + Claude×2 review pipeline.

**Files:** `.review/` (gitignored, deleted after)

- [ ] **Step 16.1: Confirm Codex availability**

Run:
```bash
codex exec "Hello"
```

Expected: response in <10s. If hangs at 0% CPU: fall back to OpenCode per CLAUDE.md.

- [ ] **Step 16.2: Run Codex Agent A — code quality**

```bash
mkdir -p .review
cat > .review/codex-prompt.txt <<'PROMPT'
Review all changes on branch feat/cvmake-mvp since the merge-base with main for code
quality, correctness, security, and consistency. The work is Phase 9 of the cvMake
project: CI pipeline + visual-regression. Run `pnpm typecheck` and `pnpm lint`
yourself — either failing is automatic FAIL.

Pay specific attention to:
- The shared helper packages/templates/test/visual/_baseline-helpers.ts
- The 8 modified visual test files (loops + helper usage)
- .github/workflows/ci.yml (3-job layout)
- .github/workflows/update-baselines.yml

Write findings to .review/codex-a-findings.md using EXACTLY this format:

## FINDINGS
- [CRITICAL] one line per item
- [WARN] one line per item
- [INFO] one line per item
## VERDICT
PASS | FAIL

PASS requires zero CRITICAL and zero WARN. INFO is advisory.
PROMPT

codex exec "$(<.review/codex-prompt.txt)"
```

Expected: file `.review/codex-a-findings.md` written with VERDICT line.

- [ ] **Step 16.3: Address Codex Agent A findings**

If VERDICT is FAIL: fix every CRITICAL and WARN, commit fixes, re-run Step 16.2 until PASS. Do not proceed otherwise.

- [ ] **Step 16.4: Run Claude Agent A — code quality**

Spawn a Claude agent (via the Agent tool with subagent_type `code-reviewer`) with prompt:

> Review all changes on branch feat/cvmake-mvp since the merge-base with main. The work is Phase 9 (CI + visual-regression) per `docs/superpowers/specs/2026-05-10-phase9-ci-visual-regression-design.md`. Check correctness, security, consistency with the spec, and adherence to existing project conventions. Run pnpm typecheck and pnpm lint yourself. Write findings to `.review/claude-a-findings.md` in this exact format:
>
> ## FINDINGS
> - [CRITICAL] ...
> - [WARN] ...
> - [INFO] ...
> ## VERDICT
> PASS | FAIL
>
> PASS = zero CRITICAL or WARN. Do not output findings to stdout — only the file.

- [ ] **Step 16.5: Address Claude Agent A findings**

Same loop as Step 16.3.

- [ ] **Step 16.6: Final gate**

Verify both `.review/codex-a-findings.md` and `.review/claude-a-findings.md` end with `VERDICT: PASS`. (Agent B / issue verification skipped — no GitHub issue is associated with Phase 9.)

- [ ] **Step 16.7: Cleanup `.review/`**

Run:
```bash
rm -rf .review/
```

(Per CLAUDE.md: "Vor dem Commit: rm -rf .review/")

---

## Task 17: Update master-plan + memory

**Files:**
- Modify: `docs/superpowers/plans/2026-04-24-cvmake-plan.md`
- Possibly: `/Users/markus/.claude/projects/-Users-markus-Developer-cvMake/memory/MEMORY.md` and/or a new memory file

- [ ] **Step 17.1: Update Phase 9 status in master plan**

Open `docs/superpowers/plans/2026-04-24-cvmake-plan.md` and change the Phase 9 row in the status table from `⬜ Offen` to `✅ Done`. Add a brief note (1–2 lines) summarizing actual outcomes vs. planned.

- [ ] **Step 17.2: Commit master-plan update**

```bash
git add docs/superpowers/plans/2026-04-24-cvmake-plan.md
git commit -m "docs: master plan — phase 9 marked done"
```

- [ ] **Step 17.3: Update memory**

Add a project memory entry recording: 22 visual snapshots in CI, 3-job layout, lokal-only baseline update, manual workflow for Linux baselines. Or update the existing `project_cvmake.md` memory.

(Use the auto-memory file pattern from CLAUDE.md.)

---

## Task 18: Final push and merge to main

**Files:** None

- [ ] **Step 18.1: Verify clean state**

Run:
```bash
git status
git log --oneline origin/feat/cvmake-mvp..HEAD
```

Expected: clean working tree (except known personal-data files); local commits ahead of origin from Tasks 17.

- [ ] **Step 18.2: Ask user for push + merge approval**

Show:
```
Phase 9 ist done. Bereit zu pushen + nach main mergen?
- Push: `git push origin feat/cvmake-mvp`
- Merge: `git checkout main && git merge --no-ff feat/cvmake-mvp && git push origin main && git checkout feat/cvmake-mvp`
```

Wait for explicit yes.

- [ ] **Step 18.3: Push + merge**

If approved:
```bash
git push origin feat/cvmake-mvp
git checkout main
git merge --no-ff feat/cvmake-mvp -m "merge: phase 9 — CI + visual-regression complete"
git push origin main
git checkout feat/cvmake-mvp
```

- [ ] **Step 18.4: Final CI verification on main**

Run:
```bash
gh run watch --exit-status
```

Expected: all 3 jobs green on `main`.

---

## Definition of Done

Phase 9 is **done** only when ALL of these are true:

1. `pnpm typecheck` green locally.
2. `pnpm lint` ≤ 143 errors locally (Phase-7 baseline).
3. `pnpm -r test:unit` green locally.
4. `pnpm --filter @codevena/forq-templates test:visual` runs 22 cases (acceptable: locally diffs vs. Linux baselines per Task 14.6 scenario b).
5. `pnpm --filter @codevena/forq-web test:e2e` green locally.
6. `pnpm build` green locally.
7. CI on `feat/cvmake-mvp` and on `main` shows all 3 jobs (`static`, `unit`, `e2e-visual`) green.
8. `gh workflow run update-baselines.yml` works manually.
9. Threshold sanity check from Task 15 confirmed CI catches an artificial regression.
10. Codex Agent A and Claude Agent A both `VERDICT: PASS` (Task 16).
11. Master plan updated, memory updated (Task 17).
12. Phase 9 merged to `main` (Task 18).

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Linux Chromium produces visibly different baselines than macOS (font hinting, anti-aliasing) | High | Task 14 — Linux baselines from CI are the source of truth. Local Mac runs may have slight diff; documented as acceptable. |
| `pnpm --filter ... test:visual -- <template>` filter syntax not supported by vitest in this monorepo setup | Medium | Falls back to running the entire suite per task — increases per-task time by ~30s but preserves correctness. Verify filter syntax in Step 2.2 first; if it fails, drop the filter and run all 22 (slower but works). |
| Playwright `webServer: { command: 'pnpm start' }` fails to start Next.js in CI within 120s | Medium | If observed: adjust `apps/web/playwright.config.ts` `webServer.timeout` (already 120_000) — bump to 180_000. Not modified preemptively. |
| `gh run watch --exit-status` returns success even when sub-steps reported failures (rare gh-cli quirk) | Low | Always inspect `gh run list` output explicitly after watch; check `conclusion` field. |
| Cache key collision when `pnpm-lock.yaml` is unchanged but Node version flag-set changes | Very low | Cache fallback re-installs; ~60s overhead, no correctness issue. |
| Visual tests OOM on `ubuntu-latest` runner due to 22 sequential Puppeteer launches | Low | Tests already serialize via vitest default (no parallelism); each Puppeteer instance is closed in `finally`. If OOM: split into 2 vitest projects or move to `ubuntu-latest-large`. |
| `it.each` collection-time `bootstrapTemplates()` call has side effects on other tests in the same suite run | Medium | Vitest isolates test files in worker threads by default; cross-file pollution unlikely. If observed: add explicit `beforeAll(bootstrapTemplates)` instead of inline call. |

---

## Rollback Plan

If the new pipeline is broken in a way that blocks all PRs and can't be quickly fixed:

```bash
git revert <ci-commit-sha>
git push origin feat/cvmake-mvp
```

This reverts only the `.github/workflows/ci.yml` and `.github/workflows/update-baselines.yml` changes, leaving the visual-test improvements in place. The old single-job CI is restored. Visual tests still run locally via `pnpm --filter @codevena/forq-templates test:visual`.

---

## References

- Spec: `docs/superpowers/specs/2026-05-10-phase9-ci-visual-regression-design.md`
- Master plan Phase 9 section: `docs/superpowers/plans/2026-04-24-cvmake-plan.md` lines 5101–5247
- Existing visual harness: `packages/templates/test/visual/*.visual.test.ts`
- Existing CI: `.github/workflows/ci.yml`
- Existing Playwright setup: `apps/web/playwright.config.ts`
- CLAUDE.md global rules (commit + push + DoD): `~/.claude/CLAUDE.md`
