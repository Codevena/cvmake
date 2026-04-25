# Editorial Template Redesign

**Date:** 2026-04-25
**Scope:** Rebuild page-1 layout of `editorial` template; preserve editorial DNA on page 2+.
**Files in scope:**
- `packages/templates/src/editorial/Template.tsx`
- `packages/templates/src/editorial/styles.css`
- (no schema, palette, or meta changes)

## Motivation

Current state has two layered bugs that together produce a catastrophic page-1 layout:

1. **Hero-strip photo crop is broken.** `.editorial__hero` is a 48 pt full-width band with `object-fit: cover; object-position: center top`. Applied to a portrait photo, this clips a thin horizontal slice of the subject's hairline/forehead. The cover-image concept does not work for portrait photos and should be removed.
2. **`.editorial__section { break-inside: avoid }` pushes the entire `Berufserfahrung` block to page 2.** The Experience section spans the full grid width (`.editorial__section--full`) and contains every job as one block. With `break-inside: avoid`, when the section can't fit in the remaining page-1 space below the masthead + summary, it jumps to page 2 in its entirety — leaving page 1 ~80 % empty.

The page-2 layout itself (small-caps headers, accent-red, italic Fraunces section headings, two-column education/skills/languages) is solid and should be preserved.

## Design

### 1. Page-1 masthead — magazine cover

Replace `.editorial__hero` (48 pt strip) with a magazine-cover masthead:

- **Layout:** 2-column flex/grid at the top of page 1.
  - **Left column (≈ ⅓ of page width):** portrait photo, full-bleed from the page-1 top edge to ~140 pt down. No frame, no border, no rounded corners. `object-fit: cover; object-position: center center` so the face stays centered regardless of source crop.
  - **Right column (≈ ⅔ of page width):** name (Fraunces 700, ~28 pt), title in Source Sans Pro caps with accent color, contact list inline (existing `.editorial__contacts` style).
- **Bottom edge of masthead:** existing 2 pt accent-color border-bottom remains as the visual seal between masthead and body.
- **No-photo fallback:** when `data.personal.photo` is missing, the left column collapses; the right-column masthead expands to full width and gets the existing thin accent bar (4 pt) as a top decoration. Body grid below is unchanged.
- **Page 2+:** masthead does not repeat. Body grid uses full page width.

### 2. Body — editorial DNA preserved

No structural changes to the body grid:

- 2-column newspaper grid (`grid-template-columns: 1fr 1fr`) stays.
- `summary-wrap` keeps `grid-column: 1 / -1`, the drop-cap "I" in Fraunces accent, and the 2-column `column-count: 2` paragraph treatment.
- Section headings keep Fraunces italic, accent color, 2 pt accent bottom border.
- Experience entries keep their byline / date / title / location / bullets structure.

### 3. Page-break fix

Current: `.editorial__section { break-inside: avoid; }` (line 141 of styles.css).

Change to:
- **Remove** `break-inside: avoid` from `.editorial__section`. Sections, especially long ones like Experience, must be allowed to flow across pages.
- **Keep** `break-inside: avoid` on `.editorial__entry` and `.editorial__custom-entry`. Individual jobs/entries must not split mid-bullet.
- **Add** `h2.editorial__section-heading { break-after: avoid; }` so a section header never lands alone at the bottom of a page (this rule will also be promoted to the cross-cutting print-CSS task — see below).

Result: page 1 fills with masthead + summary + first 1–2 jobs of Experience; remaining jobs flow to page 2; education/skills/languages follow on page 2 in the existing 2-column grid.

### 4. What stays unchanged

- Color palette (`palettes.ts`) — no changes.
- Meta (`meta.ts`) — no changes.
- Schema and section order resolution — no changes.
- Custom-section rendering — no changes.
- Page-2 layout, fonts, hierarchy — all preserved.

## Acceptance criteria

- Page 1 contains masthead + summary + at least one Experience entry. No more empty pages.
- Page-1 photo (when present) shows the full face/portrait, not a forehead-only slice.
- Page 2 yMin remains ≥ 16 pt (current value is 32 pt — should not regress; the `pdf.ts` spacer injection still applies).
- Visual baselines for `editorial` need to be regenerated; existing snapshots will fail as expected.
- All other templates' visual baselines remain unchanged (this work touches only `editorial/`).
- Tests pass: `pnpm test` (templates package + visual baseline regeneration for editorial).
- Type-check passes: `pnpm typecheck`.

## Out of scope

- Cross-cutting print-CSS page-break rules (e.g., `h2 { break-after: avoid }`, `li { break-inside: avoid }`) — covered by a separate shared print-CSS task that runs alongside this work, not inside it. The shared task will land in `packages/templates/src/shared/print.css`.
- Other templates' polish work (classic-serif, modern-minimal, creative-accent) — separate parallel agents.
- Photo source/cropping outside the template — the user's photo is provided as-is; the template must accept any portrait crop.

## Open questions

None at design time. Edge case to verify in implementation: if the body content is very short (single job, no education), page 1 should still render cleanly without a stranded masthead — `break-after: avoid` on the heading and the single-page natural flow should handle this.
