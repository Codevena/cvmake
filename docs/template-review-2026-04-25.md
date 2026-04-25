# Template Review — 2026-04-25

Visual review of all 8 templates before Phase 7 (`@codevena/forq-ui`). Source PDFs built from `data/cvs/cv.de.yaml` after commit `e98aad5` (page-margin spacer-injection).

## Summary

| # | Template          | Pages | Page-2 yMin | Status        |
|---|-------------------|-------|-------------|---------------|
| 1 | classic-serif     | 2     | 1.1 pt      | needs polish  |
| 2 | modern-minimal    | 2     | 8.0 pt      | needs polish  |
| 3 | creative-accent   | 4     | 16.5 pt     | broken        |
| 4 | academic          | 2     | 17.1 pt     | good          |
| 5 | monochrome-dark   | 2     | 17.3 pt     | good          |
| 6 | editorial         | 2     | 32.1 pt     | broken (catastrophic) |
| 7 | corporate         | 2     | 17.2 pt     | good          |
| 8 | tech-dev          | 2     | 16.6 pt     | good          |

**4 good · 2 needs polish · 2 broken**

## Cross-cutting findings (apply to all templates)

### Page-break rules missing in shared print CSS

Sections, headers, and list items break across pages without regard for orphan/widow control. Most visible in `classic-serif`: `SPRACHEN` header + first item ("Deutsch — native") stays on page 1, while the remaining items get pushed to page 2 — splitting a 3-item section in two.

**Fix:** add to shared print CSS (or per-template base):
- `h2 { break-after: avoid; }` — section header must not stand alone at page bottom
- `li, dt, dd { break-inside: avoid; }` — single items must not split across pages
- For compact sections (≤5 items: Sprachen, Persönliche Daten): consider `section.compact { break-inside: avoid-page; }`
- Long sections (Berufserfahrung) must remain breakable — do **not** apply `break-inside: avoid` to them.

## Per-template findings

### 1. classic-serif

**Pages:** 2
**Page-2 yMin:** 1.1 pt
**Status:** needs polish

#### Findings
- [ ] **Page-2 top margin broken** — content (`Englisch — B2`, `Farsi — basic`) sits flush against the top edge. Confirms known bug: Grid-based two-column layout ignores `break-before: page` and the `page.evaluate()` spacer injection (in `packages/core/src/pdf.ts`) does not reach grid items.
- [ ] **Sprachen section split** between page 1 (header + "Deutsch — native") and page 2 (remaining items). Cross-cutting page-break issue documented above; classic-serif is the most visible victim because the page-2 content has no top margin.

#### Notes
Page 1 design is solid: serif font, sidebar with photo + Persönliche Daten + Kenntnisse, content right with Profil + Berufserfahrung. Hierarchy and palette work well.

### 2. modern-minimal

**Pages:** 2
**Page-2 yMin:** 8.0 pt
**Status:** needs polish

#### Findings
- [ ] **Photo far too small** — currently a tiny ~50px square in the top-right corner. Should be sized comparable to classic-serif sidebar photo. Visually disappears against the header.
- [ ] Page-2 top margin only 8 pt (partial — `page.evaluate()` spacer is undersized for this template).

#### Notes
Otherwise clean: minimal typography, clear hierarchy, no decoration. Sprachen section happens to fit fully on page 2, so no break issue here this time.

### 3. creative-accent

**Pages:** 4 (!)
**Page-2 yMin:** 16.5 pt
**Status:** broken

#### Findings
- [ ] **Photo polaroid frame must be removed** — the gray border around the photo on page 1 looks unprofessional/dated.
- [ ] **Page 3 has no top margin** — content sits flush at top edge. Spacer injection only reaches page 2, not page 3+.
- [ ] **Critical: Page 3 ~70 % empty, Kenntnisse + Sprachen pushed to page 4.** Layout bug — likely the right sidebar column with `Persönliche Daten` forces a column break that fragments the rest of the document. Page 3 contains only 2 Ausbildung items; the rest is empty space. Page 4 hosts an isolated `Kenntnisse` + `Sprachen` block with a half-rendered cream sidebar background block at bottom-right. Wastes a full page.
- [ ] **Sidebar background does not continue cleanly across pages** — the cream-yellow sidebar tint on the right is inconsistent on page 4 (broken vertical block instead of full-height continuation).

#### Notes
Page 1 design has strong identity: orange accent, drop-cap "I" in Profil, pill-shaped tech tags, italic serif headers (`Profil`, `Berufserfahrung`). Worth keeping the visual language — but the multi-page layout needs a rebuild.

### 4. academic

**Pages:** 2
**Page-2 yMin:** 17.1 pt
**Status:** good

#### Findings
None.

#### Notes
Traditional academic layout: serif body, small-caps section headers, date-left/content-right. No photo. Page 2 starts cleanly with `Weitere Projekte`. Sprachen + Kenntnisse all fit on page 2. Approved.

### 5. monochrome-dark

**Pages:** 2
**Page-2 yMin:** 17.3 pt
**Status:** good

#### Findings
None.

#### Notes
Strong identity: dark background, circular photo, arrow-bullets (→), right-aligned language levels in the sidebar. Page 2 sidebar intentionally stays empty/dark — looks deliberate. Approved.

### 6. editorial

**Pages:** 2
**Page-2 yMin:** 32.1 pt
**Status:** broken (catastrophic — needs full rebuild)

#### Findings
- [ ] **Photo crop catastrophic** — only a thin horizontal strip of forehead/eyes is visible at the very top of page 1. Looks like a Cover-Image idea that the layout could not accommodate.
- [ ] **Page 1 ~80 % empty** — only the header (name, role, contact strip) and a 2-column `Profil` block fit on page 1. The entire `Berufserfahrung`, `Ausbildung`, `Kenntnisse`, and `Sprachen` content is pushed to page 2.
- [ ] Cover-photo concept does not work with the current layout.

#### Notes
Page 2 itself is dense and editorial-looking (small-caps headers, accent-red, classic hierarchy) — that part is fine. The page-1 concept needs to be redesigned from scratch: either drop the cover-photo, fix its sizing/cropping, or rebuild page 1 to fill it with content.

### 7. corporate

**Pages:** 2
**Page-2 yMin:** 17.2 pt
**Status:** good

#### Findings
None.

#### Notes
Clean and professional: round photo top-right, date-left/content-right, sans-serif, thin separators. Solid layout, no wasted space. Approved.

### 8. tech-dev

**Pages:** 2
**Page-2 yMin:** 16.6 pt
**Status:** good

#### Findings
None.

#### Notes
Strong dev-themed identity: terminal-green photo ring, monospace sidebar with `// contact`, `// skills`, `// languages` comment-style labels, array notation `[Next.js, React, TypeScript, ...]`, terminal-prompt header gimmick `> alex@codevena:~$ whoami`, hashtag company tags (`#codevena(eigenprojekt)`). Page 2 sidebar continues cream-tinted as on page 1. Approved.

## Decision options

### Option A — Phase 6.5 polish round (full)

Dispatch one parallel agent per template that needs work, in parallel:
- agent: classic-serif — page-2 spacer + page-break rules
- agent: modern-minimal — photo sizing + page-2 spacer
- agent: creative-accent — page-3 layout rebuild, photo frame, sidebar continuation
- agent: editorial — full page-1 rebuild + photo concept rework
- shared task: add cross-cutting print-CSS page-break rules (orphans/widows, `break-after: avoid` on h2, `break-inside: avoid` on list items)

Skill: `superpowers:dispatching-parallel-agents`. Validated workflow from phase 6.

**Pros:** ship phase 7 (`@codevena/forq-ui`) on top of 8 polished templates. No follow-up cleanup needed.
**Cons:** +1 session before phase 7. Editorial may need design brainstorming first (its concept is broken, not just its CSS).

### Option B — Direct Phase 7

Park all findings as TODOs, start `@codevena/forq-ui` immediately on the current template state.

**Pros:** unblocks the UI work fastest.
**Cons:** the UI surfaces broken templates to users (4/8 have issues). User sees `editorial` and thinks the whole product is broken.

### Option C — Mix (recommended)

Do only the broken/critical fixes now, defer polish:
- **fix now:** classic-serif page-2 + creative-accent page-3 layout + editorial page-1 rebuild + cross-cutting page-break rules
- **defer:** modern-minimal photo size, creative-accent polaroid frame, creative-accent sidebar tint

After fixes, all 8 templates render reasonably; polish can land later in a 6.6 round. Then phase 7.

**Pros:** ship phase 7 with no embarrassing templates. Limits scope of phase 6.5.
**Cons:** still adds ~1 session before phase 7. Two follow-ups instead of one.

## Open question

`editorial` may need a brainstorming pass on the page-1 concept before any polish agent touches the code — the cover-photo idea seems to be the root cause of the broken layout. Worth a 15-min brainstorm session before dispatching an agent at it.
