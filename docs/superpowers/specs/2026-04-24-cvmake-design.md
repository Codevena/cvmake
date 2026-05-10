# cvMake — Design Spec

**Status:** Superseded · **Created:** 2026-04-24 · **Owner:** Alex Schmidt

> **Project renamed `cvMake` → `forq` on 2026-04-25.** The architecture and decisions in this spec still apply; only the name and package paths changed (`@cvmake/*` → `@codevena/forq-*`). See [`docs/superpowers/specs/2026-04-25-naming-decision.md`](./2026-04-25-naming-decision.md) for the rename rationale.

## 1. Summary

cvMake is an open-source CV generator solving a dual purpose:

1. **Personal tool** — Alex's own CV needs a scalable, editable, version-controlled home. His old PDF has great design but editing is painful. His current CV has better content but worse design.
2. **GitHub showcase** — a polished, "build in public" repository that other developers can fork, swap their data, and generate a professional CV.

Architecture balances both: a **YAML source of truth** (Git-versioned, forker-friendly, CLI-buildable) combined with a **Next.js web UI** (editor, live preview, photo crop, PDF export). Eight distinct templates ship in MVP, with a plugin-style registry making the system scale to unlimited templates.

## 2. Goals & Non-Goals

### Goals

- Generate pixel-perfect PDFs from structured YAML data.
- Support 8 distinct visual template directions, each individually polished.
- Let forkers drop in their own data with zero code changes.
- Provide both a web UI (for interactive editing) and a CLI (for CI/headless use).
- Support German + English locales with separate YAML files.
- Validate data with a strict schema, fail soft in rendering.
- Open-source (MIT license).

### Non-Goals (MVP)

- No user accounts, no auth, no cloud hosting of user CVs.
- No AI-generated content (summary rewrites, bullet-point improvements) — can be a later addon.
- No ATS score calculation — templates are designed with ATS compatibility in mind where it matters (Corporate), but no built-in scanner.
- No LinkedIn import / external data sources — manual YAML editing or web form only.
- No DOCX/HTML export — PDF only.
- No multi-user edit / cloud sync — single-user local-first.

## 3. Decisions Made During Brainstorming

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Scope | **Hybrid "Build in public"** (YAML + Web UI, fork-friendly) | Personal use + GitHub showcase in one codebase. |
| 2 | Data input | **Both** — YAML as source of truth + Web UI that reads/writes same schema | YAML for Git history; UI for convenience. |
| 3 | PDF engine | **Puppeteer / Playwright** (headless Chromium) | Pixel-perfect, full CSS support; user has own Hetzner + Coolify so Chromium dependency is not a constraint. |
| 4 | Template count | **8 templates in MVP, scalable registry for unlimited** | Showcase variety; plugin-like architecture future-proofs. |
| 5 | Template styles | Classic Serif, Modern Minimal, Creative Accent, Academic, Monochrome Dark, Editorial, Corporate, Tech/Dev | Covers 8 distinct application contexts. Timeline was considered, not selected. |
| 6 | i18n | **DE + EN as separate YAML files** (`cv.de.yaml`, `cv.en.yaml`) | DRY multi-language in a single YAML is painful in practice; separate files are easier to edit. |
| 7 | Photo | **Upload + Crop UI** (`react-image-crop`) + `sharp` processing | Professional UX, correct aspect per template (round/square/full-bleed). |
| 8 | Theming | **Color presets per template (D) + single accent-color override (B-escape)** | Protects design integrity while giving power users an escape hatch. |
| 9 | Sections | **Fixed core sections + `customSections[]`** for extras | Clear contract for templates, flexibility for unusual content. |
| 10 | Multi-CV | **Folder-based** — `data/cvs/*.yaml`, dropdown in UI | Supports per-job CV variants without over-engineering profile inheritance. |

## 4. Architecture

### 4.1 Repository Layout (pnpm Monorepo + Turborepo)

```
cvmake/
├── packages/
│   ├── schema/                       # @cvmake/schema — Zod types, locale enum, template API
│   │   └── src/{cv,template,index}.ts
│   ├── core/                         # @cvmake/core — loader, renderer, pdf, photo, i18n
│   │   └── src/{loader,renderer,pdf,photo,i18n,index}.ts
│   ├── templates/                    # @cvmake/templates — registry + 8 template packages
│   │   └── src/
│   │       ├── registry.ts
│   │       ├── classic-serif/{Template.tsx, styles.css, palettes.ts, meta.ts, preview.png}
│   │       ├── modern-minimal/…
│   │       ├── tech-dev/…
│   │       ├── creative-accent/…
│   │       ├── academic/…
│   │       ├── monochrome-dark/…
│   │       ├── editorial/…
│   │       ├── corporate/…
│   │       └── index.ts
│   └── ui/                           # @cvmake/ui — shared React components
│       └── src/{PhotoCropper,ColorPicker,TemplateCard,FormField,ArrayField}.tsx
├── apps/
│   ├── web/                          # Next.js 16 App Router
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Editor + Live Preview split view
│   │   │   ├── cv/[slug]/page.tsx    # Print-friendly single-CV route
│   │   │   └── api/
│   │   │       ├── cv/route.ts       # GET: list all data/cvs/*.yaml slugs
│   │   │       ├── cv/[slug]/route.ts # GET: load + validate a single CV
│   │   │       ├── export/route.ts   # POST: CVData + template → PDF stream
│   │   │       ├── save/route.ts     # POST: CVData → write data/cvs/*.yaml
│   │   │       └── upload/route.ts   # POST: photo → sharp → public/photos/*
│   │   └── components/{Sidebar,TopBar,Editor,PreviewFrame}.tsx
│   └── cli/                          # Node CLI (commander)
│       ├── src/index.ts
│       ├── src/commands/{build,validate,list-templates}.ts
│       └── bin/cvmake
├── data/
│   └── cvs/                          # User content (Git-tracked)
│       ├── cv.de.yaml
│       ├── cv.en.yaml
│       ├── startup.de.yaml           # example variant
│       └── photos/                   # raw uploads (input to sharp)
├── public/photos/                    # processed photos (output of sharp)
├── docs/superpowers/specs/
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── tsconfig.base.json
```

### 4.2 Core Design Principles

1. **Template Registry is the only extension point.** Adding a template = adding one folder to `packages/templates/src/` plus one line in `registry.ts`. No DB, no config-file edit in consumer apps.
2. **CVData is the contract.** A single Zod schema in `@cvmake/schema` validates YAML on load, is the prop type for every template, and is consumed identically by CLI and Web.
3. **Server-side static rendering for PDF.** `renderer.render()` uses React's `renderToStaticMarkup` — no client JS in the PDF. The same component renders client-side via a portal into a preview iframe (see §6.3).
4. **Photos are two-stage.** User uploads raw → `sharp` produces optimized variants in `public/photos/` → templates pick the variant their design requires.
5. **Labels are centralized, content is per-file.** `packages/core/src/i18n.ts` has `{ de: { experience: "Berufserfahrung" }, en: { … } }`. Templates use `t('experience')`; locale is derived from the YAML filename suffix.
6. **Turborepo pipeline** guarantees build order: `schema` → `core` → `templates` → `apps`, with caching for speed.

### 4.3 Tech Stack

- **Language:** TypeScript (strict mode across workspace via `tsconfig.base.json`).
- **Runtime:** Node 20+ for CLI and Web server.
- **Package manager:** pnpm (workspaces).
- **Build:** Turborepo.
- **Web framework:** Next.js 16 (App Router, Server Components for API routes).
- **Styling:** Tailwind CSS (Editor UI) + plain CSS per template (so each template has full control over its design, not constrained by Tailwind theme tokens).
- **Forms:** react-hook-form + zodResolver.
- **Validation:** Zod.
- **YAML:** js-yaml.
- **PDF:** Puppeteer (bundled Chromium in dev; system Chrome in Docker/Coolify image).
- **Image processing:** sharp.
- **Photo crop UI:** react-image-crop.
- **CLI framework:** commander + picocolors.
- **Testing:** Vitest (unit), Playwright (E2E + visual regression), pdf-parse (PDF assertions).
- **Linting:** Biome (fast, single-tool).
- **License:** MIT.

## 5. Data Model

### 5.1 CVData Schema (Zod)

```ts
export const CVDataSchema = z.object({
  meta: z.object({
    locale: z.enum(['de', 'en']),
    updatedAt: z.string().optional(),
  }),
  personal: z.object({
    firstName: z.string(),
    lastName: z.string(),
    title: z.string().optional(),
    photo: z.string().optional(),                 // relative path, e.g. "photos/alex.jpg"
    birthDate: z.string().optional(),             // ISO "1987-01-13"
    maritalStatus: z.string().optional(),
    drivingLicense: z.string().optional(),
    contacts: z.object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      website: z.string().url().optional(),
      github: z.string().optional(),
      linkedin: z.string().optional(),
      location: z.string().optional(),
    }),
  }),
  summary: z.string().optional(),
  experience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    location: z.string().optional(),
    startDate: z.string(),
    endDate: z.string().optional(),              // undefined = "Current"
    bullets: z.array(z.string()),
    tags: z.array(z.string()).optional(),
  })),
  education: z.array(z.object({
    degree: z.string(),
    institution: z.string(),
    location: z.string().optional(),
    startDate: z.string(),
    endDate: z.string().optional(),
    bullets: z.array(z.string()).optional(),
  })),
  skills: z.object({
    stack: z.array(z.string()).optional(),
    categorized: z.record(z.string(), z.array(z.string())).optional(),
  }).optional(),
  languages: z.array(z.object({
    name: z.string(),
    level: z.enum(['native','C2','C1','B2','B1','A2','A1','basic']),
    label: z.string().optional(),
  })).optional(),
  customSections: z.array(z.object({
    id: z.string(),
    title: z.string(),
    items: z.array(z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      date: z.string().optional(),
      description: z.string().optional(),
      bullets: z.array(z.string()).optional(),
    })),
  })).optional(),
  rendering: z.object({
    template: z.string(),
    palette: z.string().optional(),
    accentOverride: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
    sectionOrder: z.array(z.string()).optional(),
    hiddenSections: z.array(z.string()).optional(),
  }),
}).strict();
```

### 5.2 Template API Contract

```ts
export interface TemplateDefinition {
  meta: {
    id: string;                        // "classic-serif"
    name: string;                      // "Classic Serif"
    description: string;
    supportsPhoto: boolean;            // Academic = false
    photoFallback: 'initials' | 'placeholder' | 'none';
    supportedLocales: Locale[];        // ['de', 'en']
    defaultSectionOrder: string[];     // e.g. ['summary','experience','education','skills','languages']
    supportsPagination: boolean;       // whether it handles multi-page flow gracefully
  };
  palettes: ColorPalette[];            // curated presets (1–5 per template)
  Component: React.FC<TemplateProps>;
}

export interface TemplateProps {
  data: CVData;
  palette: ColorPalette;
  locale: Locale;
  labels: LabelDictionary;
}

export interface ColorPalette {
  id: string;                          // "classic-grey"
  name: string;                        // "Classic Grey"
  accent: string;                      // #7a8894 — the one override-able color
  background: string;
  surface: string;                     // sidebar / cards
  text: string;
  textMuted: string;
  textOnAccent: string;
}
```

## 6. Data Flow

### 6.1 Web Editor Flow

1. **Boot:** `pnpm dev` → Next.js → user opens `http://localhost:3000` → server reads `data/cvs/*.yaml` → sidebar dropdown lists all CV slugs.
2. **Select CV:** user picks `cv.de` → `GET /api/cv/cv.de` → `loader.load()` parses + validates → returns `CVData` → client stores in react-hook-form state.
3. **Edit + Live Preview:** left panel = form, right panel = `<PreviewFrame>` with `<iframe srcDoc={html}>` for CSS isolation. Form changes → 150ms debounce → preview re-renders.
4. **Photo Upload:** drag/drop → `<PhotoCropper>` modal (aspect ratios: 1:1, 3:4, free) → confirm → `POST /api/upload` (multipart) → `sharp` produces `.webp` + `.jpg` fallback at 600×600 → response `{ path }` → client sets `formData.personal.photo`.
5. **Save:** Ctrl+S or auto-save (2s debounce) → `POST /api/save` → validate with Zod → `yaml.dump` → write `data/cvs/*.yaml` → toast + Git-diff hint.
6. **Export PDF:** user clicks "PDF exportieren" → `POST /api/export` with current `CVData` (including unsaved edits) → `renderer.render()` → HTML string → `pdf.generate()` → Puppeteer → A4 PDF buffer → streamed to browser with `Content-Disposition: attachment`.

### 6.2 CLI Flow

```
$ pnpm cvmake build data/cvs/cv.de.yaml \
    --template classic-serif \
    --palette classic-grey \
    --output out/cv.de.pdf

loader.load(path)    → CVData
renderer.render()    → HTML string
pdf.generate()       → PDF buffer
fs.writeFile(output, buffer)
```

Additional CLI commands:
- `cvmake list-templates` — prints registered templates + palettes.
- `cvmake validate <yaml>` — Zod validation, exit 1 on error.
- `cvmake build --all` — builds every `data/cvs/*.yaml` with its default template.

### 6.3 Key Flow Decisions

- Preview uses an **`<iframe>` with React portal** (`ReactDOM.createPortal` into the iframe's document body) for total CSS isolation, so template fonts and styles don't conflict with the editor's Tailwind. The portal approach gives live React-diffing updates on form changes without full iframe reloads (avoids flicker that `srcDoc` would cause).
- PDF export **sends `CVData` in the request body** instead of re-reading from disk — enables "unsaved changes in the exported PDF" and keeps the endpoint stateless (CLI uses the same `@cvmake/core` primitives directly without HTTP).
- **Puppeteer browser instance is a module-level singleton** in dev for fast iteration; production may re-launch per request for isolation.
- Auto-save debounce: 2 seconds. Explicit save: Ctrl+S. Toast confirms write with relative path.

## 7. Error Handling & Edge Cases

### 7.1 Error Categories

| Category | Where | Handler | UX |
|----------|-------|---------|-----|
| YAML parse error | `loader.ts` | `YAMLParseError { path, line, column, message }` | Web: error banner + raw-YAML view; CLI: exit 1 with colored stderr pointing to line. |
| Zod schema error | `loader.ts`, `/api/save` | `ZodError.issues[]` | Web: inline form errors (react-hook-form) + disabled Export button; CLI: table of issues. |
| Photo too large (>10MB) | `/api/upload` | Client pre-check + 413 response | Toast with clear limit; raw file remains in client state. |
| Invalid image format | `sharp.metadata()` | 400 `INVALID_IMAGE` | Allowed: jpeg/png/webp/heic (HEIC auto-converted). |
| Puppeteer crash | `pdf.ts` | Retry 1× with fresh browser; 500 on second failure | Toast with request ID + GitHub issue link. |
| Font timeout (>5s) | Puppeteer waitFor | Proceed + warning header | Toast: "fonts may be incomplete". |
| Template render error | `renderer.ts` | `TEMPLATE_RENDER_ERROR` | "Switch template or open an issue" with template ID. |
| Stale save (conflict) | `/api/save` | Compare `meta.updatedAt` | 409 + diff modal: merge or overwrite. |
| Missing template ID | Registry lookup | Fallback to `classic-serif` + warning | Banner: "Template 'X' not found, showing Classic Serif". |
| Missing palette ID | Template | Fallback to first preset | Silent. |
| Unknown custom section | Template | Generic renderer (title + bullet list) | Silent — by design. |
| File write error | `/api/save` | 500 + fallback | UI offers "Download YAML" button. |

### 7.2 Content Edge Cases

- **Long content / page overflow:** CSS `break-inside: avoid` on experience items; optional pagination per template (`supportsPagination` meta).
- **Empty sections:** Templates must guard (`{data.languages?.length > 0 && <Section>…</Section>}`) — no "Languages: (empty)" rendering.
- **Missing photo when template requires it:** Initials avatar fallback (`photoFallback: 'initials'`) or placeholder (`'placeholder'`) or skip (`'none'`).
- **Very long name:** Templates use `text-wrap: balance` and clamped font-size to avoid overflow. Classic Serif explicitly line-wraps by design.
- **Locale mismatch (DE content, EN template labels):** No crash; UI shows non-blocking warning banner.

### 7.3 Security

- **YAML bombs:** `js-yaml` with `CORE_SCHEMA` and `maxAliasCount` limit.
- **XSS via content:** React auto-escapes; no `dangerouslySetInnerHTML` without `remark`-sanitized markdown.
- **Path traversal in upload/save:** `slug` strictly validated (`/^[a-z0-9-]+$/`); `path.resolve` + `startsWith(baseDir)` checks on all file operations.
- **CLI output path:** resolved and restricted, not controllable via YAML content.

## 8. Testing Strategy

### 8.1 Four-Layer Test Pyramid

**Unit tests (Vitest)** — per-package, fast, isolated:
- `@cvmake/schema`: parser against valid/invalid YAML fixtures; boundary cases.
- `@cvmake/core/loader`: multi-file loading, locale derivation, error formatting.
- `@cvmake/core/i18n`: meta-test that DE and EN label sets have identical keys.
- `@cvmake/core/photo`: sharp pipeline with test images; input validation.
- `@cvmake/templates/registry`: all templates have unique IDs, ≥1 palette, valid Component.

**Template rendering tests (`packages/templates/__tests__/`)** — one file per template, snapshot-based:
- Happy path (full fixture).
- Minimal data (only `personal.firstName + lastName`).
- Custom sections (generic rendering).
- Locale switch (DE vs EN label snapshot).
- Palette switch (CSS custom properties in output).
- Photo off (initials fallback or skip depending on template).

Shared fixtures in `packages/schema/test/fixtures.ts`: `fullFixture`, `minimalFixture`, `alexFixture` (real CV data), `longContentFixture`.

**PDF integration tests (`apps/cli/__tests__/` + `apps/web/__tests__/`)** — critical because HTML ≠ PDF:
- CLI build smoke test per template: exit code, file size > 10KB, `pdf-parse` text contains expected strings.
- **Visual regression (Playwright / pixelmatch):** Puppeteer screenshot of first PDF page as PNG compared against committed baseline image (threshold 0.1%). Baselines in `__tests__/__visual__/` per template × palette (~24 images). Run as `pnpm test:visual` locally + on CI for main/labeled PRs.
- Font loading test: `document.fonts.check()` returns true for all template fonts.

**E2E tests (Playwright, `apps/web/e2e/`)** — essential flows only:
1. Load, edit, save → verify YAML write.
2. Template switch → preview iframe font change.
3. PDF export → downloaded file valid + contains name.
4. Photo upload + crop → preview shows photo.
5. Broken YAML → error banner + disabled export.

Budget: ~60s total for E2E.

### 8.2 CI Pipeline (GitHub Actions)

```yaml
jobs:
  test:
    steps:
      - pnpm install --frozen-lockfile
      - pnpm build           # turbo, cached
      - pnpm lint            # biome
      - pnpm typecheck       # tsc --noEmit across packages
      - pnpm test:unit
      - pnpm test:integration
      - pnpm test:visual     # main + labeled PRs
      - pnpm test:e2e        # playwright on ubuntu-latest
```

Turborepo caching ensures unchanged packages skip re-testing.

### 8.3 Testing Design Principles

- **No mocks for YAML or sharp** — real fixture files are cheaper and more honest than mocks.
- **Puppeteer CI flags** (`--no-sandbox`) abstracted behind a test utility.
- **`alexFixture` as reality check** — the real CV in `data/cvs/cv.de.yaml` is itself a test fixture.
- **Per-template test + baseline is part of "template done"** — a template is not merged until it has green unit tests + a committed visual baseline.

## 9. Template Implementation Approach

This is a **first-class design concern**, not a "ship fast, polish later" task.

**Rule:** Each of the 8 templates must be designed and perfected by its own dedicated agent, dispatched in parallel (up to 10 concurrent via the `dispatching-parallel-agents` pattern).

Per-template brief:
- Style direction (classic-serif/modern-minimal/tech-dev/creative-accent/academic/monochrome-dark/editorial/corporate).
- Typography choice (font family, weights, scale).
- Color palette(s) — 1–5 curated presets.
- Layout structure (single/two-column, sidebar placement, header shape).
- Photo treatment (round/square/full-bleed/none).
- Section rendering (order, iconography, separators).
- Pagination strategy.
- Target application context (who uses this template, for what kind of role).
- Test artifacts — snapshot + visual baseline + custom-section handling.

Each agent delivers:
- `packages/templates/src/<id>/Template.tsx`
- `packages/templates/src/<id>/styles.css`
- `packages/templates/src/<id>/palettes.ts`
- `packages/templates/src/<id>/meta.ts`
- `packages/templates/src/<id>/preview.png` (screenshot for TemplateCard)
- Unit tests + visual baselines.

## 10. Out of Scope / Future Work

- LinkedIn / resume.json / JSON Resume import/export.
- AI-assisted bullet rewriting (OpenAI / OpenRouter integration) — Alex's stack suggests this is a plausible v2 addon.
- Multi-profile inheritance (`base.yaml` + overrides) — decided against in brainstorming (Git branches serve the same purpose, more visibly).
- ATS scoring, keyword highlighting.
- Theme builder UI (creating new palettes in the Web UI).
- Export to DOCX / HTML / JSON.
- Cloud-hosted version with auth.

## 11. Implementation Sequencing (Rough Order)

1. **Monorepo scaffold** — pnpm workspace, Turborepo, tsconfig.base, Biome.
2. **`@cvmake/schema`** — Zod schema + fixtures + unit tests.
3. **`@cvmake/core`** — loader, i18n, photo (sharp), PDF (Puppeteer), renderer primitive.
4. **`@cvmake/ui`** — PhotoCropper, ColorPicker, TemplateCard, form primitives.
5. **`@cvmake/templates` registry + base layout infrastructure** (shared CSS resets, `@page` rules, font-loading conventions).
6. **Parallel template implementation** — 8 agents, one per template, shipped with tests + baselines.
7. **`apps/cli`** — commander setup, build/validate/list-templates commands.
8. **`apps/web`** — editor layout, preview iframe, API routes (load/save/upload/export).
9. **Alex's real content** — populate `data/cvs/cv.de.yaml` + `cv.en.yaml` with actual data.
10. **CI + E2E + visual regression** — GitHub Actions, Playwright, baselines.
11. **Docs + README** — README with screenshots of all 8 templates, fork-and-use guide, MIT license.

Detailed implementation plan to be written next via the `writing-plans` skill.
