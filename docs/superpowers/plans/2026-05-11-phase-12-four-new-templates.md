# Phase 12 — Four New CV Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four production-ready CV templates (`swiss`, `bauhaus`, `noir`, `magazine`) to `packages/templates`, expanding the catalog from 8 → 12.

**Architecture:** Tasks 2–5 build the four templates independently and can be dispatched in parallel (no shared state during build). Tasks 1 and 6–11 are sequential glue (bootstrap merge, screenshots, showcase, README, review, commit). Each template ships with `Template.tsx` + `meta.ts` + `palettes.ts` + `styles.css` + `index.ts` + visual-regression test.

**Tech Stack:** React 18, TypeScript, plain CSS (no Tailwind in template package — templates use CSS classes scoped via class-prefix), Vitest + react-dom/server for tests, Puppeteer for visual regression, pdftocairo for PDF→PNG.

**Source spec:** `docs/superpowers/specs/2026-05-11-phase-12-four-new-templates-design.md`

**Mockup references (visual ground truth for each template):**
- Swiss: `docs/superpowers/specs/2026-05-11-phase-12-mockups/swiss.png`
- Bauhaus: `docs/superpowers/specs/2026-05-11-phase-12-mockups/bauhaus.png`
- Noir: `docs/superpowers/specs/2026-05-11-phase-12-mockups/noir.png`
- Magazine: `docs/superpowers/specs/2026-05-11-phase-12-mockups/magazine.png`

**Code reference template (study before implementing):** `packages/templates/src/classic-serif/` (all five files + the test)

---

## Task 1: Pre-flight verification

**Files:** none modified — read-only checks.

- [ ] **Step 1: Verify the spec file exists and is readable**

Run: `cat docs/superpowers/specs/2026-05-11-phase-12-four-new-templates-design.md | head -5`
Expected: header `# Phase 12 — Four New CV Templates`

- [ ] **Step 2: Verify all four mockup PNGs exist**

Run: `ls -la docs/superpowers/specs/2026-05-11-phase-12-mockups/`
Expected: `bauhaus.png`, `magazine.png`, `noir.png`, `swiss.png` — all 4 present, each 150-350 KB.

- [ ] **Step 3: Verify reference template exists**

Run: `ls packages/templates/src/classic-serif/`
Expected: `index.ts`, `meta.ts`, `palettes.ts`, `styles.css`, `Template.tsx`

- [ ] **Step 4: Verify the registry contract is what we think it is**

Run: `cat packages/schema/src/template.ts | grep -E "TemplateMeta|ColorPalette|TemplateDefinition" | head -20`
Expected: types `TemplateMeta`, `ColorPalette`, `TemplateDefinition` exported.

- [ ] **Step 5: Baseline check — all current tests green**

Run: `pnpm -r test:unit`
Expected: 178+ tests pass (whatever the current count is — must be green before we add to it).

---

## Task 2: Build the Swiss / International template

**Files:**
- Create: `packages/templates/src/swiss/meta.ts`
- Create: `packages/templates/src/swiss/palettes.ts`
- Create: `packages/templates/src/swiss/Template.tsx`
- Create: `packages/templates/src/swiss/styles.css`
- Create: `packages/templates/src/swiss/index.ts`
- Create: `packages/templates/test/swiss.test.tsx`

**Reference:** Read `docs/superpowers/specs/2026-05-11-phase-12-mockups/swiss.png` (visual ground truth) and `packages/templates/src/classic-serif/*` (code pattern). Read spec §3.1.

- [ ] **Step 1: Read inputs**

Read: `docs/superpowers/specs/2026-05-11-phase-12-mockups/swiss.png` (mockup), `docs/superpowers/specs/2026-05-11-phase-12-four-new-templates-design.md` (spec §3.1), `packages/templates/src/classic-serif/Template.tsx` + `meta.ts` + `palettes.ts` + `styles.css` + `index.ts` (code pattern), `packages/templates/test/classic-serif.test.tsx` (test pattern), `packages/schema/src/template.ts` (types).

- [ ] **Step 2: Create `meta.ts`**

```ts
import type { TemplateMeta } from '@codevena/cvmake-schema';

export const meta: TemplateMeta = {
  id: 'swiss',
  name: 'Swiss / International',
  description:
    'Striktes Zweispalten-Layout mit Helvetica, rotem Akzent und entsättigtem Foto. Pure information design — keine Verspieltheit.',
  supportsPhoto: true,
  photoFallback: 'initials',
  supportedLocales: ['de', 'en'],
  defaultSectionOrder: ['summary', 'experience', 'education', 'skills', 'languages'],
  supportsPagination: true,
};
```

- [ ] **Step 3: Create `palettes.ts`**

```ts
import type { ColorPalette } from '@codevena/cvmake-schema';

export const palettes: ColorPalette[] = [
  { id: 'swiss-red', name: 'Swiss Red', accent: '#e63946', background: '#ffffff', surface: '#f5f5f5', text: '#000000', textMuted: '#888888', textOnAccent: '#ffffff' },
  { id: 'swiss-blue', name: 'Swiss Blue', accent: '#0044cc', background: '#ffffff', surface: '#f5f5f5', text: '#000000', textMuted: '#888888', textOnAccent: '#ffffff' },
  { id: 'swiss-black', name: 'Swiss Black', accent: '#000000', background: '#ffffff', surface: '#f5f5f5', text: '#000000', textMuted: '#888888', textOnAccent: '#ffffff' },
];
```

- [ ] **Step 4: Create `styles.css`**

Translate the mockup CSS (`.cv-swiss` block in `.superpowers/brainstorm/5398-1778522358/content/cv-mockups-v3.html`) into `.swiss` / `.swiss__*` BEM-style classes. Key visual rules:
- font-family: `"Helvetica Neue", Helvetica, Arial, sans-serif`
- two-column grid (sidebar 100px / main 1fr) with 22px gap
- header bar with `No.` counter (56px black) + name (26px black) + role (small-caps tracking-out)
- bottom border 1px solid `var(--accent-or-black)` under header
- sidebar uppercase labels (7.5px, tracking 0.1em, weight 700)
- main section headlines (8px uppercase, tracking 0.18em, accent colour, weight 700)
- photo: `filter: grayscale(100%) contrast(1.05)`, `aspect-ratio: 3/4`, `object-fit: cover`
- accent color must be CSS variable `var(--accent)` driven by the chosen palette

Define a class `.swiss--accent` that consumes `--accent`, `--background`, `--surface`, `--text`, `--text-muted` CSS variables. The Template.tsx will set these via inline style on the root element. Look at `packages/templates/src/classic-serif/styles.css` for the convention used by existing templates.

- [ ] **Step 5: Create `Template.tsx`**

Implement `SwissTemplate({ data, palette, locale, labels }: TemplateProps)` following the structure shown in the mockup. Required behaviors (matching all existing templates' contract):
- root element gets CSS custom properties from `palette` (accent, background, surface, text, textMuted, textOnAccent)
- if `data.personal.photo` exists → `<img>` in sidebar, else `<div class="swiss__initials">` with `initials(...)` helper from `../utils/initials.js`
- sidebar lists contact (email/phone/location/linkedin/github/website/birthDate, conditional rendering — only show what's set), then languages, education, skills
- main column renders sections in order via `resolveSectionOrder(...)` from `../utils/sections.js`
- experience entries use `formatDateRange(...)` from `../utils/dates.js`
- labels (`labels.experience`, `labels.education`, etc.) drive section headings — must support both DE and EN

Use `packages/templates/src/classic-serif/Template.tsx` as the authoritative pattern for these helper usages.

- [ ] **Step 6: Create `index.ts`**

```ts
import type { TemplateDefinition } from '@codevena/cvmake-schema';
import { SwissTemplate } from './Template.js';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';

export const swiss: TemplateDefinition = {
  meta: templateMeta,
  palettes,
  Component: SwissTemplate,
};
```

- [ ] **Step 7: Create `test/swiss.test.tsx`**

```tsx
import { getLabels } from '@codevena/cvmake-core';
import { fullFixture, minimalFixture } from '@codevena/cvmake-schema/test/fixtures.js';
import { renderToStaticMarkup } from 'react-dom/server';
/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { swiss } from '../src/swiss/index.js';

const palette = swiss.palettes[0]!;

describe('SwissTemplate', () => {
  it('rendert Voll-Fixture ohne Fehler', () => {
    const html = renderToStaticMarkup(
      <swiss.Component data={fullFixture} palette={palette} locale="de" labels={getLabels('de')} />,
    );
    expect(html).toContain('Lena Bauer');
    expect(html).toContain('Berufserfahrung');
    expect(html).toContain('Codevena');
  });

  it('zeigt Initialen wenn kein Foto', () => {
    const html = renderToStaticMarkup(
      <swiss.Component data={minimalFixture} palette={palette} locale="de" labels={getLabels('de')} />,
    );
    expect(html).toMatch(/swiss__initials[^>]*>LB/);
  });

  it('rendert EN-Labels bei locale=en', () => {
    const html = renderToStaticMarkup(
      <swiss.Component
        data={{ ...fullFixture, meta: { locale: 'en' } }}
        palette={palette}
        locale="en"
        labels={getLabels('en')}
      />,
    );
    expect(html).toContain('Experience');
    expect(html).not.toContain('Berufserfahrung');
  });

  it('matched HTML-Snapshot', () => {
    const html = renderToStaticMarkup(
      <swiss.Component data={fullFixture} palette={palette} locale="de" labels={getLabels('de')} />,
    );
    expect(html).toMatchSnapshot();
  });
});
```

- [ ] **Step 8: Run unit tests**

Run: `pnpm --filter @codevena/cvmake-templates test:unit -- swiss`
Expected: 4 tests pass. Snapshot created on first run.

- [ ] **Step 9: Commit (without bootstrap — that's Task 5)**

```bash
git add packages/templates/src/swiss/ packages/templates/test/swiss.test.tsx packages/templates/test/__snapshots__/swiss.test.tsx.snap
git commit -m "feat(templates): add swiss template (3 palettes, photo-optional)"
```

---

## Task 3: Build the Bauhaus template

**Files:**
- Create: `packages/templates/src/bauhaus/meta.ts`
- Create: `packages/templates/src/bauhaus/palettes.ts`
- Create: `packages/templates/src/bauhaus/Template.tsx`
- Create: `packages/templates/src/bauhaus/styles.css`
- Create: `packages/templates/src/bauhaus/index.ts`
- Create: `packages/templates/test/bauhaus.test.tsx`

**Reference:** `docs/superpowers/specs/2026-05-11-phase-12-mockups/bauhaus.png`, spec §3.2.

- [ ] **Step 1: Read inputs** — same set as Task 2 Step 1, but bauhaus mockup + spec §3.2.

- [ ] **Step 2: Create `meta.ts`**

```ts
import type { TemplateMeta } from '@codevena/cvmake-schema';

export const meta: TemplateMeta = {
  id: 'bauhaus',
  name: 'Bauhaus',
  description:
    'Beige Canvas mit geometrischen Akzentformen (Kreis, Quadrat, Dreieck), Futura, blau-umrahmtem Kreis-Foto. Form follows function — mit einem Lächeln.',
  supportsPhoto: true,
  photoFallback: 'initials',
  supportedLocales: ['de', 'en'],
  defaultSectionOrder: ['summary', 'experience', 'education', 'skills', 'languages'],
  supportsPagination: true,
};
```

- [ ] **Step 3: Create `palettes.ts`**

```ts
import type { ColorPalette } from '@codevena/cvmake-schema';

export const palettes: ColorPalette[] = [
  { id: 'bauhaus-primary', name: 'Bauhaus Primary', accent: '#e63946', background: '#f5f1e8', surface: '#eee8d9', text: '#1a1a1a', textMuted: '#555555', textOnAccent: '#ffffff' },
  { id: 'bauhaus-cobalt', name: 'Bauhaus Cobalt', accent: '#1d4ed8', background: '#f5f1e8', surface: '#eee8d9', text: '#1a1a1a', textMuted: '#555555', textOnAccent: '#ffffff' },
  { id: 'bauhaus-amber', name: 'Bauhaus Amber', accent: '#fbbf24', background: '#1a1a1a', surface: '#2a2a2a', text: '#f5f1e8', textMuted: '#888888', textOnAccent: '#1a1a1a' },
];
```

- [ ] **Step 4: Create `styles.css`**

Translate `.cv-bauhaus` from the mockup HTML. Key rules:
- font-family: `"Futura", "Trebuchet MS", "Avenir Next", sans-serif`
- single column, position: relative parent for absolutely-positioned decorative shapes
- Decorative shapes (**hardcoded colors, NOT palette-driven** — spec §3.2):
  - `.bauhaus__circle` — `right: -30px; top: -30px; width: 90px; height: 90px; border-radius: 50%; background: #e63946; z-index: 0;`
  - `.bauhaus__triangle` — `right: 60px; bottom: 30px; border-left/right: 26px solid transparent; border-bottom: 26px solid #fbbf24; z-index: 0;`
- photo: `width: 86px; height: 86px; border-radius: 50%; border: 3px solid var(--accent); object-fit: cover; z-index: 2; position: relative`
- role badge: `background: var(--accent); color: var(--text-on-accent); padding: 3px 8px; font-size: 11px;`
- section headlines: `font-size: 9px; text-transform: uppercase; letter-spacing: 0.16em; border-bottom: 3px solid #fbbf24; display: inline-block; padding-bottom: 2px;` (yellow underline ALWAYS, regardless of palette)
- skills grid: `display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px;`

- [ ] **Step 5: Create `Template.tsx`**

Implement `BauhausTemplate({ data, palette, locale, labels }: TemplateProps)`. Header uses a flexbox with text on left, circular photo on right. Decorative shape divs (`<div class="bauhaus__circle" aria-hidden />` etc.) rendered as siblings of the header. Otherwise same data-handling pattern as classic-serif (section ordering, helpers, label-driven headings).

- [ ] **Step 6: Create `index.ts`**

```ts
import type { TemplateDefinition } from '@codevena/cvmake-schema';
import { BauhausTemplate } from './Template.js';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';

export const bauhaus: TemplateDefinition = {
  meta: templateMeta,
  palettes,
  Component: BauhausTemplate,
};
```

- [ ] **Step 7: Create `test/bauhaus.test.tsx`** — same 4-test pattern as Task 2 Step 7, swap `swiss` → `bauhaus` and `SwissTemplate` → `BauhausTemplate`. Initials regex: `bauhaus__initials[^>]*>LB`.

- [ ] **Step 8: Run unit tests**

Run: `pnpm --filter @codevena/cvmake-templates test:unit -- bauhaus`
Expected: 4 tests pass.

- [ ] **Step 9: Commit**

```bash
git add packages/templates/src/bauhaus/ packages/templates/test/bauhaus.test.tsx packages/templates/test/__snapshots__/bauhaus.test.tsx.snap
git commit -m "feat(templates): add bauhaus template (3 palettes, geometric accents)"
```

---

## Task 4: Build the Noir template

**Files:**
- Create: `packages/templates/src/noir/meta.ts`
- Create: `packages/templates/src/noir/palettes.ts`
- Create: `packages/templates/src/noir/Template.tsx`
- Create: `packages/templates/src/noir/styles.css`
- Create: `packages/templates/src/noir/index.ts`
- Create: `packages/templates/test/noir.test.tsx`

**Reference:** `docs/superpowers/specs/2026-05-11-phase-12-mockups/noir.png`, spec §3.3.

- [ ] **Step 1: Read inputs** — noir mockup + spec §3.3.

- [ ] **Step 2: Create `meta.ts`**

```ts
import type { TemplateMeta } from '@codevena/cvmake-schema';

export const meta: TemplateMeta = {
  id: 'noir',
  name: 'Noir',
  description:
    'Schwarze Bühne, Cream-Serif (Cormorant), Gold-Akzent, sepia-getöntes Foto. Cinematic high-contrast — Einträge lesen sich wie Absätze, nicht wie Bullet-Listen.',
  supportsPhoto: true,
  photoFallback: 'initials',
  supportedLocales: ['de', 'en'],
  defaultSectionOrder: ['summary', 'experience', 'education', 'skills', 'languages'],
  supportsPagination: true,
};
```

- [ ] **Step 3: Create `palettes.ts`**

```ts
import type { ColorPalette } from '@codevena/cvmake-schema';

export const palettes: ColorPalette[] = [
  { id: 'noir-gold', name: 'Noir Gold', accent: '#d4a574', background: '#0d0d0d', surface: '#1a1a1a', text: '#f1e9d2', textMuted: '#888076', textOnAccent: '#0d0d0d' },
  { id: 'noir-silver', name: 'Noir Silver', accent: '#c0c0c0', background: '#0d0d0d', surface: '#1a1a1a', text: '#f1e9d2', textMuted: '#888076', textOnAccent: '#0d0d0d' },
  { id: 'noir-copper', name: 'Noir Copper', accent: '#b87333', background: '#0d0d0d', surface: '#1a1a1a', text: '#f1e9d2', textMuted: '#888076', textOnAccent: '#0d0d0d' },
];
```

- [ ] **Step 4: Create `styles.css`**

Translate `.cv-noir` from mockup. Key:
- font-family: `"Cormorant Garamond", "EB Garamond", "Playfair Display", Georgia, serif`
- header: flexbox with text + small photo on right
- photo: `width: 70px; height: 90px; object-fit: cover; object-position: center top; filter: grayscale(100%) sepia(15%) contrast(1.05) brightness(0.92); border: 1px solid var(--accent);`
- display name: 36px, weight 600
- role: 10px uppercase, tracking 0.32em, `var(--accent)`
- summary: italic 11px in pull-quote style
- section headlines: 8px uppercase, tracking 0.34em, `var(--accent)`, weight 500
- experience entries: title (13px, weight 600) + dates on one line (dates in `var(--accent)`), italic org line, body as paragraph (NO `<ul>`, prose only — spec §3.3)
- dividers: 1px `var(--accent)` rule at 35% opacity (`background-color: var(--accent); opacity: 0.35`)

**Note:** Spec §3.3 explicitly says "no bullet lists — prose". Experience bullets should render as a concatenated paragraph, not `<ul>`. Use `data.experience[i].bullets?.join(' ')` or similar to flatten. If `bullets` are empty/missing, render the `description` field directly.

- [ ] **Step 5: Create `Template.tsx`**

Implement `NoirTemplate({ data, palette, locale, labels }: TemplateProps)`. Header is flex with `<div>` text-block + `<img>` photo or `<div>` initials on the right. Body renders sections in order. Experience entries: title row + italic org + paragraph (concatenated bullets or description).

- [ ] **Step 6: Create `index.ts`**

```ts
import type { TemplateDefinition } from '@codevena/cvmake-schema';
import { NoirTemplate } from './Template.js';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';

export const noir: TemplateDefinition = {
  meta: templateMeta,
  palettes,
  Component: NoirTemplate,
};
```

- [ ] **Step 7: Create `test/noir.test.tsx`** — same 4-test pattern, swap to `noir` / `NoirTemplate`. Initials regex: `noir__initials[^>]*>LB`.

- [ ] **Step 8: Run unit tests**

Run: `pnpm --filter @codevena/cvmake-templates test:unit -- noir`
Expected: 4 tests pass.

- [ ] **Step 9: Commit**

```bash
git add packages/templates/src/noir/ packages/templates/test/noir.test.tsx packages/templates/test/__snapshots__/noir.test.tsx.snap
git commit -m "feat(templates): add noir template (3 palettes, cinematic prose layout)"
```

---

## Task 5: Build the Magazine template

**Files:**
- Create: `packages/templates/src/magazine/meta.ts`
- Create: `packages/templates/src/magazine/palettes.ts`
- Create: `packages/templates/src/magazine/Template.tsx`
- Create: `packages/templates/src/magazine/styles.css`
- Create: `packages/templates/src/magazine/index.ts`
- Create: `packages/templates/test/magazine.test.tsx`

**Reference:** `docs/superpowers/specs/2026-05-11-phase-12-mockups/magazine.png`, spec §3.4.

- [ ] **Step 1: Read inputs** — magazine mockup + spec §3.4.

- [ ] **Step 2: Create `meta.ts`**

```ts
import type { TemplateMeta } from '@codevena/cvmake-schema';

export const meta: TemplateMeta = {
  id: 'magazine',
  name: 'Editorial Magazine',
  description:
    'Cream-Canvas, große kursive Display-Serif (Playfair Display), Sand-Akzent, großes Hochformat-Foto. Vogue-Style-Profil mit Zwei-Spalten-Body-Grid.',
  supportsPhoto: true,
  photoFallback: 'initials',
  supportedLocales: ['de', 'en'],
  defaultSectionOrder: ['summary', 'experience', 'education', 'skills', 'languages'],
  supportsPagination: true,
};
```

- [ ] **Step 3: Create `palettes.ts`**

```ts
import type { ColorPalette } from '@codevena/cvmake-schema';

export const palettes: ColorPalette[] = [
  { id: 'magazine-sand', name: 'Magazine Sand', accent: '#a98558', background: '#f5efe6', surface: '#ede5d6', text: '#1a1612', textMuted: '#8b6f4e', textOnAccent: '#ffffff' },
  { id: 'magazine-forest', name: 'Magazine Forest', accent: '#4a6b50', background: '#f5efe6', surface: '#ede5d6', text: '#1a1612', textMuted: '#8b6f4e', textOnAccent: '#ffffff' },
  { id: 'magazine-burgundy', name: 'Magazine Burgundy', accent: '#7a2f3a', background: '#f5efe6', surface: '#ede5d6', text: '#1a1612', textMuted: '#8b6f4e', textOnAccent: '#ffffff' },
];
```

- [ ] **Step 4: Create `styles.css`**

Translate `.cv-mag` from mockup. Key:
- font-family: `"Playfair Display", "Didot", "Bodoni MT", "Cormorant Garamond", serif` (headings); body uses `Georgia, "EB Garamond", serif`
- header: grid `1fr 110px` with large photo on right
- photo: `width: 110px; height: 138px; object-fit: cover; object-position: center top; box-shadow: 4px 4px 0 var(--magazine-shadow);` where `--magazine-shadow` is set to `var(--accent)` with 35% alpha via inline style (use `${palette.accent}59` for hex 35% alpha, or compute `rgba` from palette accent — see Template.tsx step)
- display name: 42px, italic, weight 400, line-height 0.95
- summary: italic Georgia 10.5px, max-width 92%
- divider: 60px line, `var(--accent)`, 1px high
- body uses two-column grid `110px 1fr` with section labels left (italic Playfair small caps tracking-out, sand-colour) + content right (Georgia)
- entry titles: italic Playfair 12px, weight 500
- entry meta: italic 9px `var(--accent)` or `var(--text-muted)`

- [ ] **Step 5: Create `Template.tsx`**

Implement `MagazineTemplate({ data, palette, locale, labels }: TemplateProps)`. The shadow colour needs the accent at 35% alpha. Compute as inline style:

```tsx
const shadowColor = hexToRgba(palette.accent, 0.35);
// helper at top of file:
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
```

Then on the `<img>`: `style={{ boxShadow: `4px 4px 0 ${shadowColor}` }}`.

Header is a grid div with the text block (label / name / role) on the left and the photo on the right. Body uses a 2-column grid for section-label-and-content pairs.

- [ ] **Step 6: Create `index.ts`**

```ts
import type { TemplateDefinition } from '@codevena/cvmake-schema';
import { MagazineTemplate } from './Template.js';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';

export const magazine: TemplateDefinition = {
  meta: templateMeta,
  palettes,
  Component: MagazineTemplate,
};
```

- [ ] **Step 7: Create `test/magazine.test.tsx`** — same 4-test pattern, swap to `magazine` / `MagazineTemplate`. Initials regex: `magazine__initials[^>]*>LB`.

- [ ] **Step 8: Run unit tests**

Run: `pnpm --filter @codevena/cvmake-templates test:unit -- magazine`
Expected: 4 tests pass.

- [ ] **Step 9: Commit**

```bash
git add packages/templates/src/magazine/ packages/templates/test/magazine.test.tsx packages/templates/test/__snapshots__/magazine.test.tsx.snap
git commit -m "feat(templates): add magazine template (3 palettes, Vogue-style display serif)"
```

---

## Task 6: Register all four new templates in bootstrap.ts

**Files:**
- Modify: `packages/templates/src/bootstrap.ts`

**Why this is sequential:** If Tasks 2–5 ran in parallel and each tried to edit `bootstrap.ts`, they would step on each other. Tasks 2–5 explicitly do NOT touch `bootstrap.ts`. This task merges all four registrations after the four templates exist on disk.

- [ ] **Step 1: Read current bootstrap.ts**

Run: `cat packages/templates/src/bootstrap.ts`

- [ ] **Step 2: Replace its contents**

Write the file with:

```ts
import { academic } from './academic/index.js';
import { bauhaus } from './bauhaus/index.js';
import { classicSerif } from './classic-serif/index.js';
import { corporate } from './corporate/index.js';
import { creativeAccent } from './creative-accent/index.js';
import { editorial } from './editorial/index.js';
import { magazine } from './magazine/index.js';
import { modernMinimal } from './modern-minimal/index.js';
import { monochromeDark } from './monochrome-dark/index.js';
import { noir } from './noir/index.js';
import { clearRegistry, registerTemplate } from './registry.js';
import { swiss } from './swiss/index.js';
import { techDev } from './tech-dev/index.js';

export function bootstrapTemplates(): void {
  clearRegistry();
  registerTemplate(classicSerif);
  registerTemplate(modernMinimal);
  registerTemplate(creativeAccent);
  registerTemplate(academic);
  registerTemplate(monochromeDark);
  registerTemplate(editorial);
  registerTemplate(corporate);
  registerTemplate(techDev);
  registerTemplate(swiss);
  registerTemplate(bauhaus);
  registerTemplate(noir);
  registerTemplate(magazine);
}
```

- [ ] **Step 3: Build + run all template tests**

Run: `pnpm build && pnpm --filter @codevena/cvmake-templates test:unit`
Expected: all 12 templates render, all tests green.

- [ ] **Step 4: Run visual-regression tests — expect 4 baseline misses**

Run: `pnpm --filter @codevena/cvmake-templates test:visual`
Expected outcome:
- The 8 existing baselines still match — must be green.
- The 4 new templates have no baselines yet → either the test framework auto-creates them on first local run, or the run fails with "no baseline" for each. Both are acceptable here.

If the test FAILS only because of missing baselines for the 4 new templates: continue to Step 5 anyway. Baselines will be regenerated on Linux CI in Task 11 via the `update-baselines.yml` workflow_dispatch (same pattern Phase 9 established to handle macOS-vs-Linux font-rendering differences).

If the test FAILS because an EXISTING baseline broke: that's a real regression — fix before continuing.

- [ ] **Step 5: Commit**

```bash
git add packages/templates/src/bootstrap.ts
git commit -m "feat(templates): register swiss, bauhaus, noir, magazine in bootstrap"
```

---

## Task 7: Render PDFs and generate screenshots for the 4 new templates

**Files:**
- Create: `docs/screenshots/swiss.png`
- Create: `docs/screenshots/bauhaus.png`
- Create: `docs/screenshots/noir.png`
- Create: `docs/screenshots/magazine.png`

**Tool:** `scripts/render-screenshots.mjs` (existing pipeline from Phase 10).

- [ ] **Step 1: Inspect the screenshot script to confirm it picks up new templates automatically**

Run: `cat scripts/render-screenshots.mjs | head -40`
Expected: it iterates over `listTemplates()` from the registry. If yes, no script edit needed. If it has a hardcoded list, add the 4 new ids.

- [ ] **Step 2: Run the screenshot pipeline**

Run: `node scripts/render-screenshots.mjs` (or whatever invocation Phase-10 docs reveal — check `docs/superpowers/plans/2026-05-11-phase-10-oss-public-readiness.md` Task 3 for the exact command if unsure)
Expected: 12 PNGs written to `docs/screenshots/` (4 new + 8 existing overwritten — git diff will show only the 4 new files unless the existing renderer changed).

- [ ] **Step 3: Visual review of the 4 new PDFs/PNGs**

Open or display the 4 new PNGs (`docs/screenshots/{swiss,bauhaus,noir,magazine}.png`). Compare each against its mockup at `docs/superpowers/specs/2026-05-11-phase-12-mockups/{id}.png`. They should be structurally and stylistically the same (won't be pixel-identical because the mockup is HTML, the PDF is Puppeteer-rendered React).

Sanity checks:
- Photo appears in expected position with expected filter
- Accent colour matches palette (palette 0 is the default)
- Section layout matches mockup
- No text overflow or layout breakage

If a template visibly diverges from its mockup, fix the implementation (return to the matching task) and re-run the screenshot pipeline before continuing.

- [ ] **Step 4: Stage the screenshots**

```bash
git add docs/screenshots/swiss.png docs/screenshots/bauhaus.png docs/screenshots/noir.png docs/screenshots/magazine.png
```

(Don't commit yet — Task 11 bundles the showcase update with this.)

---

## Task 8: Update the showcase app to render 12 cards

**Files:**
- Modify: `apps/showcase/app.js` (the `TEMPLATES` array near top)

- [ ] **Step 1: Read the current TEMPLATES array**

Run: `grep -A 50 "const TEMPLATES" apps/showcase/app.js | head -60`

- [ ] **Step 2: Extend the array from 8 to 12 entries**

After the existing 8 entries (last one is `monochrome-dark`), add:

```js
  {
    id: 'swiss',
    name: 'Swiss / International',
    blurb: 'Strict grid, Helvetica, red accent. Pure information design.',
  },
  {
    id: 'bauhaus',
    name: 'Bauhaus',
    blurb: 'Geometric shapes, primary palette, Futura. Joyful structure.',
  },
  {
    id: 'noir',
    name: 'Noir',
    blurb: 'Cinematic high-contrast — black canvas, cream serif, gold accent.',
  },
  {
    id: 'magazine',
    name: 'Editorial Magazine',
    blurb: 'Luxe display serif, italic, generous whitespace. Vogue-feel.',
  },
```

- [ ] **Step 3: Verify the showcase still renders cleanly locally**

Run: `pnpm --filter @codevena/cvmake-showcase dev` in one terminal, then:

```bash
pnpm --filter @codevena/cvmake-web exec playwright screenshot --browser=chromium --viewport-size=1440,1800 --full-page --wait-for-timeout=1500 http://localhost:4173/ /tmp/showcase-12.png
ls -la /tmp/showcase-12.png
```

Open the PNG. Expected: 12 cards in a 4×3 (or 3×4 on narrower viewport) grid, all 12 thumbnails load (no broken images).

Stop the dev server (Ctrl-C in the dev terminal) when done.

- [ ] **Step 4: Stage** (commit bundled in Task 11)

```bash
git add apps/showcase/app.js
```

---

## Task 9: Update README showcase table

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read the current showcase table**

Run: `sed -n '/## Showcase/,/## Why cvmake/p' README.md`

Expected: a markdown table with 8 entries in a 2×4 grid (academic / classic-serif / corporate / creative-accent | editorial / modern-minimal / monochrome-dark / tech-dev).

- [ ] **Step 2: Rewrite the table to 12 entries in a 3×4 grid (or 4×3, whichever looks better)**

Replace the existing 2-row table with a 3-row, 4-column table that includes the 4 new templates. Alphabetical order across rows:

```markdown
## Showcase

| | | | |
|---|---|---|---|
| ![academic](docs/screenshots/academic.png)<br/>**academic** | ![bauhaus](docs/screenshots/bauhaus.png)<br/>**bauhaus** | ![classic-serif](docs/screenshots/classic-serif.png)<br/>**classic-serif** | ![corporate](docs/screenshots/corporate.png)<br/>**corporate** |
| ![creative-accent](docs/screenshots/creative-accent.png)<br/>**creative-accent** | ![editorial](docs/screenshots/editorial.png)<br/>**editorial** | ![magazine](docs/screenshots/magazine.png)<br/>**magazine** | ![modern-minimal](docs/screenshots/modern-minimal.png)<br/>**modern-minimal** |
| ![monochrome-dark](docs/screenshots/monochrome-dark.png)<br/>**monochrome-dark** | ![noir](docs/screenshots/noir.png)<br/>**noir** | ![swiss](docs/screenshots/swiss.png)<br/>**swiss** | ![tech-dev](docs/screenshots/tech-dev.png)<br/>**tech-dev** |
```

- [ ] **Step 3: Also extend the `## Templates` ID/Style table further down in the README**

Find the existing table:

```markdown
## Templates

| ID | Style |
|---|---|
| `academic` | … |
…
```

Insert these new rows in alphabetical order:

```markdown
| `bauhaus` | Geometric shapes, primary palette, Futura |
| `magazine` | Display serif, italic, two-column body — Vogue-style |
| `noir` | Cinematic dark, cream serif, gold accent, prose entries |
| `swiss` | Strict grid, Helvetica, red accent — pure information design |
```

- [ ] **Step 4: Stage** (commit bundled in Task 11)

```bash
git add README.md
```

---

## Task 10: 4-agent DoD review (per CLAUDE.md mandate)

**Why:** CLAUDE.md mandates a 4-agent review pipeline before any task is considered complete. For Phase 12 this means: Codex Agent A (code quality) + Claude Agent A (code quality). Agent B (issue verification) is skipped because no GitHub issue targets Phase 12.

- [ ] **Step 1: Static checks first**

Run: `pnpm build && pnpm lint && pnpm -r test:unit`
Expected: all green. If lint fails on the 4 new files, fix and re-run.

- [ ] **Step 2: Codex Agent A — code quality review**

```bash
mkdir -p .review
cat > .review/codex-prompt.txt <<'PROMPT'
Review all uncommitted changes in this repo for code quality, correctness,
security, and consistency. Specifically check the 4 new templates added in
packages/templates/src/{swiss,bauhaus,noir,magazine}/ and their tests in
packages/templates/test/. Verify:
- Schema compliance (TemplateMeta + ColorPalette shapes)
- BEM-style class naming consistency with existing templates
- Photo-optional handling (initials fallback works)
- Locale support (DE + EN labels)
- No accidental shared mutable state across templates
- Visual-regression test pattern matches the 8 existing tests

Run `pnpm typecheck` and `pnpm lint` yourself — either failing is automatic FAIL.

Write your findings to .review/codex-a-findings.md using EXACTLY this format.
Do not output findings to stdout — only the file.

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

If Codex CLI hits its OpenAI usage limit (HTTP 429 / "usage limit"), fall back to:

```bash
opencode run --dangerously-skip-permissions "$(<.review/codex-prompt.txt)"
```

Read `.review/codex-a-findings.md` after completion. If VERDICT is FAIL or any CRITICAL/WARN appears: fix the findings, then re-run this step. Loop until PASS.

- [ ] **Step 3: Claude Agent A — code quality review**

Dispatch the `code-reviewer` subagent with prompt:

> "Review all uncommitted changes in this repo for code quality, correctness, security, and consistency. Specifically check the 4 new templates added in packages/templates/src/{swiss,bauhaus,noir,magazine}/ and their tests. Write findings to .review/claude-a-findings.md using the format:
>
> ```
> ## FINDINGS
> - [CRITICAL]
> - [WARN]
> - [INFO]
> ## VERDICT
> PASS | FAIL
> ```
>
> PASS requires zero CRITICAL and zero WARN. Do not output findings to stdout."

Read `.review/claude-a-findings.md`. If FAIL: fix, then re-run both Codex A and Claude A from the top.

- [ ] **Step 4: Cleanup `.review/`**

```bash
rm -rf .review/
```

---

## Task 11: Bundle commit + push + deploy verification

**Files staged (from Tasks 7, 8, 9):**
- `docs/screenshots/swiss.png` + `bauhaus.png` + `noir.png` + `magazine.png`
- `apps/showcase/app.js`
- `README.md`

- [ ] **Step 1: Verify all tasks committed except the bundled set**

Run: `git status`
Expected: staged files = the 6 from Tasks 7+8+9. Working tree clean otherwise.

- [ ] **Step 2: Commit the bundle**

```bash
git commit -m "$(cat <<'EOF'
feat: showcase 12 templates — wire up swiss, bauhaus, noir, magazine

- 4 new template screenshots in docs/screenshots/
- apps/showcase/app.js TEMPLATES array extended 8 → 12
- README showcase table updated to 4×3 layout
- README Templates ID/Style table extended

Closes Phase 12.
EOF
)"
```

- [ ] **Step 3: Push to main** (ask user first per CLAUDE.md rule)

Ask the user: "Push the Phase-12 commits to origin/main? This triggers the deploy-showcase workflow and updates cvmake.codevena.dev."

If approved:

```bash
git push origin main
```

- [ ] **Step 4: Watch the deploy workflow**

```bash
sleep 4
RUN_ID=$(gh run list --workflow=deploy-showcase.yml --limit=1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN_ID" --exit-status
```

Expected: build + deploy jobs both green in ~15-20 seconds.

- [ ] **Step 5: Live verification**

```bash
sleep 5
pnpm --filter @codevena/cvmake-web exec playwright screenshot --browser=chromium --viewport-size=1440,1800 --full-page --wait-for-timeout=2000 https://cvmake.codevena.dev/ /tmp/live-12.png
```

Open the PNG. Expected: 12 cards visible on the live site.

- [ ] **Step 6: Regenerate visual baselines on Linux CI**

The 4 new templates have no visual baselines yet (or the local macOS-generated ones won't match Linux-CI-rendered actuals due to font-rendering differences — same issue Phase 9 solved). Dispatch the `update-baselines.yml` workflow to regenerate all baselines on Linux:

```bash
gh workflow run update-baselines.yml --ref main
sleep 6
gh run watch $(gh run list --workflow=update-baselines.yml --limit=1 --json databaseId --jq '.[0].databaseId') --exit-status
```

Expected: workflow runs, commits new baselines to main (4 new + 8 existing untouched).

```bash
git pull origin main
pnpm --filter @codevena/cvmake-templates test:visual
```

Expected: 12 visual tests green locally.

- [ ] **Step 7: Update memory**

Edit `/Users/markus/.claude/projects/-Users-markus-Developer-cvMake/memory/project_cvmake.md`:
- Update phase status: add a `**Phase 12 (2026-05-11):** 4 new templates (swiss, bauhaus, noir, magazine) — 12 templates total live at cvmake.codevena.dev` line.
- Update memory description to mention "Phase 12 done, 12 templates".

(No git commit — memory file is local-only.)

---

## Definition of Done (mirrors spec §5)

1. ✅ `pnpm typecheck && pnpm build && pnpm -r test:unit` green
2. ✅ `pnpm --filter @codevena/cvmake-templates test:visual` green for all 12 templates
3. ✅ Four PDFs visually reviewed and matching their mockups
4. ✅ `apps/showcase/app.js` `TEMPLATES` array has 12 entries
5. ✅ `docs/screenshots/` has 12 PNGs
6. ✅ README has 12 entries in showcase table + 12 rows in templates table
7. ✅ `https://cvmake.codevena.dev` shows 12 cards live
8. ✅ CI green (`load-edit-save.spec.ts` may still flake — pre-existing, unrelated to Phase 12)
9. ✅ 4-agent review per CLAUDE.md: Codex A + Claude A both PASS
