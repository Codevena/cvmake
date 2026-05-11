# Phase 12 — Four New CV Templates

**Author:** Markus Wiesecke
**Date:** 2026-05-11
**Status:** Spec — awaiting approval
**Companion mockups:** `.superpowers/brainstorm/5398-1778522358/content/cv-mockups-v3.html` (4 full-page CV mockups with embedded photo)

---

## 1. Goal

Expand the template catalog from 8 to 12 by adding four visually distinctive new templates: **Swiss / International**, **Bauhaus**, **Noir**, and **Editorial Magazine**. Each template ships production-ready: schema-compliant, three palettes, visual-regression tested, registered, and showcased on cvmake.codevena.dev.

The four new directions intentionally cover style territory the existing 8 templates do not occupy:

- **Swiss** fills the "pure information design, strict grid" gap.
- **Bauhaus** fills the "joyful geometric, primary palette" gap.
- **Noir** fills the "cinematic, high-contrast literary" gap (different from `monochrome-dark`, which is utilitarian dark).
- **Editorial Magazine** fills the "luxe display-serif, magazine cover" gap (different from `editorial`, which is denser and less ornamental).

## 2. Non-goals

- No changes to schema, core, CLI, or web app.
- No changes to the existing 8 templates.
- No new font dependencies beyond what the templates need (web-safe + Google Fonts; same loading pattern existing templates use).
- No new palette schema fields (palettes use the existing `ColorPalette` shape).
- No internationalisation work beyond `de` + `en` (same as existing).

## 3. Per-template specifications

Each template ships:

- `packages/templates/src/<id>/Template.tsx`
- `packages/templates/src/<id>/meta.ts`
- `packages/templates/src/<id>/palettes.ts` (3 palettes)
- `packages/templates/src/<id>/styles.css`
- `packages/templates/src/<id>/index.ts`
- `packages/templates/test/<id>.test.tsx`

Registration: extend `packages/templates/src/bootstrap.ts` with the four new templates.

### 3.1 Swiss / International (`id: swiss`)

**Style essence:** Strict grid, Helvetica Neue (system fallback: Arial), single bold accent colour. Pure information design — no decoration.

**Layout:** Two columns.

- Header bar (full width): giant numeric counter on the left (`No. 26`, where `o.` is the accent color), large bold name on the right with role beneath, separated by a single 1px bottom rule.
- Left sidebar (~100px wide): photo on top (entsättigt to grayscale), then meta blocks (Contact / Languages / Education / Stack) labeled with small uppercase tracking-out labels.
- Right main column: section headlines in small-caps tracking-out coloured with the accent, content in 10–11px regular weight.

**Photo treatment:** `filter: grayscale(100%) contrast(1.05)`, full sidebar width (100% of 100px column), 3:4 aspect ratio (`aspect-ratio: 3/4`), `object-fit: cover`. Pure document feel.

**Palettes (3):**

| id | name | accent | background | surface | text | textMuted | textOnAccent |
|---|---|---|---|---|---|---|---|
| `swiss-red` | Swiss Red | `#e63946` | `#ffffff` | `#f5f5f5` | `#000000` | `#888888` | `#ffffff` |
| `swiss-blue` | Swiss Blue | `#0044cc` | `#ffffff` | `#f5f5f5` | `#000000` | `#888888` | `#ffffff` |
| `swiss-black` | Swiss Black | `#000000` | `#ffffff` | `#f5f5f5` | `#000000` | `#888888` | `#ffffff` |

**Meta:** `supportsPhoto: true`, `photoFallback: 'initials'`, locales `de`+`en`, default section order matches existing convention.

### 3.2 Bauhaus (`id: bauhaus`)

**Style essence:** Geometric playfulness — circle, square, triangle as decorative accents in primary colours. Futura (fallback Trebuchet MS), beige canvas. Form follows function but allowed to smile.

**Layout:** Single column.

- Header: photo as a **circle with 3px accent border** on the right, name + role + contact on the left. Role displayed as a small **filled block** (background = secondary accent, text white).
- Decorative shapes positioned absolutely behind the content: a red circle in the top-right corner, a yellow triangle in the bottom area.
- Section headlines: small uppercase, **underlined with a 3px yellow rule**.
- Skills: 2-column grid with bold inline labels.

**Photo treatment:** Circle, 86×86px, 3px accent-coloured border. Photo is itself a geometric element.

**Palettes (3):**

| id | name | accent | background | surface | text | textMuted | textOnAccent |
|---|---|---|---|---|---|---|---|
| `bauhaus-primary` | Bauhaus Primary | `#e63946` (red) | `#f5f1e8` (beige) | `#eee8d9` | `#1a1a1a` | `#555555` | `#ffffff` |
| `bauhaus-cobalt` | Bauhaus Cobalt | `#1d4ed8` (blue) | `#f5f1e8` | `#eee8d9` | `#1a1a1a` | `#555555` | `#ffffff` |
| `bauhaus-amber` | Bauhaus Amber | `#fbbf24` (yellow) | `#1a1a1a` (inverted) | `#2a2a2a` | `#f5f1e8` | `#888888` | `#1a1a1a` |

**Decorative shape colours (hardcoded, not palette-driven):** All three palettes use the same shape colour mapping for visual consistency — `circle: #e63946` (red), `square: #1d4ed8` (blue), `triangle: #fbbf24` (yellow). The palette's `accent` only drives the photo border, role pill background, and section underline. This keeps the Bauhaus identity intact across all three palettes while letting the accent set the dominant signal colour.

**Meta:** `supportsPhoto: true`, `photoFallback: 'initials'`.

### 3.3 Noir (`id: noir`)

**Style essence:** Cinematic, high-contrast literary. Black canvas, cream serif (Cormorant Garamond, fallback EB Garamond / Georgia), gold accent. Entries read like short paragraphs, not bullet lists.

**Layout:** Single column, generous whitespace.

- Header: large display name (~36px), photo as small sepia-toned rectangle (70×90) with gold border on the top-right, role in small uppercase tracking-out gold caps below name.
- Italic summary in pull-quote style with em-dashes, max-width ~90%.
- Section headlines: small uppercase, very wide tracking (0.34em), gold.
- Experience entries: title + dates on one line (dates in gold), italic org line, then a paragraph body (no bullet lists — prose).
- Section dividers: 1px gold rule at 35% opacity.

**Photo treatment:** Rectangle 70×90, `grayscale(100%) sepia(15%) contrast(1.05) brightness(0.92)`, 1px gold border. Sepia-toned cinematic.

**Palettes (3):**

| id | name | accent | background | surface | text | textMuted | textOnAccent |
|---|---|---|---|---|---|---|---|
| `noir-gold` | Noir Gold | `#d4a574` | `#0d0d0d` | `#1a1a1a` | `#f1e9d2` | `#888076` | `#0d0d0d` |
| `noir-silver` | Noir Silver | `#c0c0c0` | `#0d0d0d` | `#1a1a1a` | `#f1e9d2` | `#888076` | `#0d0d0d` |
| `noir-copper` | Noir Copper | `#b87333` | `#0d0d0d` | `#1a1a1a` | `#f1e9d2` | `#888076` | `#0d0d0d` |

**Meta:** `supportsPhoto: true`, `photoFallback: 'initials'`.

### 3.4 Editorial Magazine (`id: magazine`)

**Style essence:** Luxe display serif, italic, generous whitespace — Vogue-style profile feature. Playfair Display (fallback Didot / Bodoni MT), cream canvas, sand accent.

**Layout:** Single column with two-column grid for body sections (label-left, content-right).

- Header: photo as **large 110×138 portrait** with a 4px sand-coloured offset shadow (right + down) on the top-right. Display name in massive italic serif (~42px), small label above ("Profile · No. 026 · 2026"), role in italic sand.
- Divider: 60px sand line under the header.
- Pull-quote summary in italic Georgia.
- Body grid: section labels left (italic, small caps, tracked, sand), content right (Georgia for body, Playfair italics for entry titles).
- Entry titles: italic Playfair, item meta in italic sand.

**Photo treatment:** 110×138 rectangle, `object-position: center top`, 4px offset shadow whose colour follows the palette accent at 35% alpha (e.g. sand palette → `rgba(169,133,88,0.35)`). Like a magazine cover photo.

**Palettes (3):**

| id | name | accent | background | surface | text | textMuted | textOnAccent |
|---|---|---|---|---|---|---|---|
| `magazine-sand` | Magazine Sand | `#a98558` | `#f5efe6` | `#ede5d6` | `#1a1612` | `#8b6f4e` | `#ffffff` |
| `magazine-forest` | Magazine Forest | `#4a6b50` | `#f5efe6` | `#ede5d6` | `#1a1612` | `#8b6f4e` | `#ffffff` |
| `magazine-burgundy` | Magazine Burgundy | `#7a2f3a` | `#f5efe6` | `#ede5d6` | `#1a1612` | `#8b6f4e` | `#ffffff` |

**Meta:** `supportsPhoto: true`, `photoFallback: 'initials'`.

## 4. Implementation strategy

**Pattern:** `superpowers:dispatching-parallel-agents` with 4 agents, each owning one template directory + test file.

**Per-agent task:**

1. Read the mockup HTML for the assigned style from the brainstorm session.
2. Read one existing template (`classic-serif`) as code reference for file structure, imports, schema usage, and section ordering.
3. Implement `Template.tsx`, `meta.ts`, `palettes.ts`, `styles.css`, `index.ts` — matching the mockup visually while respecting the schema.
4. Implement `test/<id>.test.tsx` — visual regression test following the existing pattern.
5. Patch `bootstrap.ts` to register the new template.
6. Run `pnpm --filter @codevena/cvmake-templates test:unit` and `test:visual` for the new template — must be green.
7. Render an example PDF (`pnpm cvmake build data/cvs/example.de.yaml --template <id>`) for manual visual review.

**Shared inputs each agent gets:**

- Spec section for its template (3.1 / 3.2 / 3.3 / 3.4)
- Mockup file path (the brainstorm HTML, rendered visually with embedded photo)
- Reference template path: `packages/templates/src/classic-serif/`
- Schema location: `packages/schema/src/template.ts`
- Bootstrap file: `packages/templates/src/bootstrap.ts`

**Sequenced steps (not parallel):**

- **After all 4 agents finish:** I render the 4 example PDFs, screenshot each to PNG via the Phase-10 screenshot pipeline (`scripts/build-screenshots.mjs` or equivalent), and place the new PNGs in `docs/screenshots/`.
- **Update `apps/showcase/app.js`:** extend the `TEMPLATES` array from 8 to 12 entries with the four new id/name/blurb tuples.
- **Update README.md showcase table:** 8 → 12 entries in the markdown table.
- **Commit + push:** one bundled commit `feat(templates): add swiss, bauhaus, noir, magazine — 4 new templates` plus a follow-up `docs: showcase update with 12 templates`.

## 5. Definition of Done

1. `pnpm typecheck && pnpm build && pnpm -r test:unit` — all green
2. `pnpm --filter @codevena/cvmake-templates test:visual` — green for all 12 templates (4 new + 8 existing baselines untouched)
3. Four PDFs rendered from `data/cvs/example.de.yaml` for each new template, visually reviewed and matching the mockup style
4. `apps/showcase/app.js` `TEMPLATES` array has 12 entries
5. `docs/screenshots/` has 12 PNGs (8 existing + 4 new) at consistent resolution
6. README.md `## Showcase` table has 12 entries in a 4×3 layout (or 3×4)
7. `https://cvmake.codevena.dev` reloads with 12 cards in the grid
8. CI green on the bundling commit (CI may still flake on `load-edit-save.spec.ts`, that's pre-existing and unrelated)
9. 4-agent review per CLAUDE.md mandate (Codex×2 + Claude×2 or OpenCode fallback)

## 6. Out of scope (for Phase 12)

- npm publish (Phase 13 / future)
- Launch post (Markus' own task)
- Custom CI workflow for visual baseline auto-update (existing `update-baselines.yml` covers it)
- Adding more palettes per template beyond the 3 specified
- Adding more templates beyond these 4

## 7. Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| One agent produces a template that doesn't visually match the mockup | Medium | Visual review of all 4 PDFs before commit; iterate on the failing template only |
| Visual-regression baselines fail on CI (Linux vs macOS render diff) | Medium | Same fix as Phase 9: regenerate baselines on Linux CI via `update-baselines.yml` workflow_dispatch after agent run |
| Bootstrap.ts merge conflicts if multiple agents edit it | Low | One agent designated as bootstrap-merger; the other 3 emit a diff but don't apply |
| Screenshot pipeline broken (Puppeteer cache, pdftocairo missing) | Low | Verified working in Phase 10; same machine setup |
| Fonts don't render identically in PDF vs browser | Medium | Templates use web-safe fallbacks; mockups are previews not contracts |

## 8. Open questions

None — brainstorm closed all of them.

## 9. References

- Brainstorm session: `.superpowers/brainstorm/5398-1778522358/`
- Mockup file (visual reference for agents): `.superpowers/brainstorm/5398-1778522358/content/cv-mockups-v3.html`
- Existing template reference: `packages/templates/src/classic-serif/`
- Schema: `packages/schema/src/template.ts`
- Phase-9 visual-regression setup: `packages/templates/test/` + `update-baselines.yml`
- Phase-10 screenshot pipeline: `scripts/render-screenshots.mjs`
- Memory: `project_cvmake.md` (parallel-agent template workflow established)
