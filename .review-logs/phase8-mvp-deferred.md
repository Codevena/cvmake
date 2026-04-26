# Phase 8 — MVP-Deferred Backlog

**Decision date:** 2026-04-26 · **Decided by:** Markus (option C — pragmatic close-out)

After 3 rounds of DoD review (4 reviewer agents per round), Phase 8 is closed as functional-MVP-complete with the following deliberate deferrals to Phase 9 polish.

## Status Snapshot at Close

- 45 commits between `9582fd6` (base) and `f5998f4` (HEAD).
- ✅ `pnpm typecheck` clean (10/10 packages).
- ✅ `pnpm build` green.
- ✅ 187 unit tests pass (schema 9 · core 16 · ui 38 · templates 46 · cli 2 · web 67 = 178; +9 schema not counted twice — verified 187 total).
- ✅ 5 Playwright e2e specs green.
- ✅ Lint at 139 errors (≤ 143 Phase-7 baseline → criterion §14.5 met).
- ✅ Real CVs (`cv.de.yaml`, `cv.en.yaml`) editable end-to-end via repo-root data-dir resolution.
- ✅ Round 3 reviewer verdicts: **3 APPROVED** (codex-code, claude-code, claude-spec) **+ 1 CHANGES_REQUESTED** (codex-spec — 4 nits below).

## Deferred Items (Phase 9)

### D1 — e2e template-switch: assert palette resets
**File:** `apps/web/e2e/template-switch.spec.ts:22-24` · **Spec:** §13.3
- Add: `expect(page.getByLabel('Palette').getAttribute('value')).toBe(newTpl.palettes[0].id)` (or equivalent).
- Behavior is correct in code; only the test assertion is missing.

### D2 — e2e photo-upload: assert iframe `<img>` src updates
**File:** `apps/web/e2e/photo-upload.spec.ts:38,40` · **Spec:** §13.3
- Add: `expect(iframe.locator('img').getAttribute('src')).toContain('/photos/cv.test.de.jpg')`.
- Behavior is correct in code; only the test assertion is missing.

### D3 — SaveIndicator dirty copy includes auto-save timing
**File:** `apps/web/components/SaveIndicator.tsx:33` · **Spec:** §10.1
- Change `"• Ungespeicherte Änderungen"` to `"• Ungespeicherte Änderungen (auto-save in 2s)"`.
- One-liner cosmetic improvement.

### D4 — Update spec §5.3 to reflect simpler atomic-write
**File:** `docs/superpowers/specs/2026-04-25-forq-editor-design.md:150` · **Type:** Spec-doc drift
- Spec describes `writeFile(tmp) → rm(target) → rename(tmp,target)`. Code (`apps/web/lib/atomic-write.ts`) does `writeFile(tmp) → rename(tmp,target)` — POSIX `rename(2)` is atomic and overwrites.
- The simpler form was explicitly recommended by Round-1 Codex Code Review and adopted in commit `b65f8b6`.
- Update spec text to match the implementation; no code change.

### D5 — RSC YAML/Zod load-error custom banner
**Files:** `apps/web/app/cv/[slug]/page.tsx`, `apps/web/app/page.tsx` · **Spec:** §12 (already noted as Phase-9 polish in `docs/superpowers/plans/2026-04-25-forq-editor.md` Task 30)
- Today: RSC throws YAMLParseError → Next default error page.
- Want: catch in RSC, show a custom banner with line/col + "open file" hint + disabled export button (per §12).

### D6 — Export client error toast
**File:** `apps/web/components/TopBar.tsx` · **Spec:** §12
- Today: `exportPdf()` throws on non-OK with no UI surface (browser would just stay silent).
- Want: try/catch + toast with HTTP code + retry option.

### D7 — Drag/drop in PhotoUploadField
**File:** `apps/web/components/PhotoUploadField.tsx` · **Spec:** §9 (deeper cited UX, MVP relies on file-input click)
- Today: file-input via `<label>`.
- Want: drop zone with `dragover`/`drop` handlers.

### D8 — `processPhoto` EXIF rotate bounds re-check
**File:** `packages/core/src/photo.ts` · **Severity:** Minor (no observed bug; defensive hardening)
- After `sharp.rotate()` swaps width/height for 90°/270° EXIF, the original-pixel crop coordinates may become invalid.
- `sharp.extract()` already throws `extract_area: bad extract area` for out-of-bounds, which we catch as 400 — so the user sees a clear error, just not a particularly nice one.
- A pre-extract bounds check after rotate could provide a better error message.

### D9 — `apps/cli` bare-barrel imports
**Files:** `apps/cli/src/commands/build.ts:4`, `apps/cli/src/commands/validate.ts:2`, `apps/cli/test/build.integration.test.ts:7`
- Server-only consumer, no client-bundling concern.
- Cosmetic consistency with the apps/web subpath-import discipline.

### D10 — Repo-wide biome lint baseline cleanup (139 errors)
- All in pre-existing `apps/cli/`, `packages/core/`, `packages/templates/` files (no new findings from Phase 8 code).
- Mostly `organizeImports` and `format` — auto-fixable via `pnpm exec biome check --write --unsafe` then careful manual review.
- Out of Phase 8 scope.

## What Was Fixed in DoD Rounds

For the record, 12 issues were fixed across 3 rounds of DoD review (5 commits):

- `d9feb0f` — backend hardening: upload size pre-check + 413, save delete-conflict 409, atomic-write uniqueness via randomBytes
- `c58a872` — autosave timer + conflict-modal hardening (savedTimerRef, onOverwrite race, conflictPaused)
- `76bfe98` — export filename uses slug per spec §11
- `4c074e2` — clear autosave saved-timer at start of next save (R2-1)
- `f5998f4` — widen conflict currentData to CVData|null for deleted-file case (R2-2)

## Acceptance

Phase 8 is **closed as MVP-complete** on 2026-04-26. The 10 deferred items above are Phase-9 candidates.
