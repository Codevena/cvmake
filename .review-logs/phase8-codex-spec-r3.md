# Phase 8 — Codex Spec Verification (Round 3)

**Branch:** `feat/cvmake-mvp` · **Spec:** `docs/superpowers/specs/2026-04-25-forq-editor-design.md` · **Date:** 2026-04-26

> Codex sandbox blocked file writes; transcribed by orchestrator.

## Summary

R2 type-widening fix is internally consistent across `use-autosave.ts`, `EditorShell.tsx`, `ConflictModal.tsx`. Four small spec-coverage gaps remain — three e2e/UI-copy nits and one spec-text drift — none security or correctness blockers. **Accepted by orchestrator as MVP-deferred → Phase-9 backlog.**

## R2 Gap Status

| Gap | File | Status |
|---|---|---|
| `/api/save` 409 `currentData: null` violates §5.3 | `apps/web/lib/use-autosave.ts:8,12`, `apps/web/components/ConflictModal.tsx:10,28,61,65,84,88`, `apps/web/app/api/save/route.ts:37,40` | FIXED via `CVData | null` widening |

## New Gaps (deferred to Phase 9)

### G1: e2e template-switch missing palette-reset assertion
- **File:** `apps/web/e2e/template-switch.spec.ts:22-24`
- **Spec:** §13.3, line 426
- **Current:** asserts iframe template-css textContent changed.
- **Wanted:** also assert palette resets to `tpl.palettes[0].id`.
- **Severity:** Minor (test breadth gap, behavior is correct in code).

### G2: e2e photo-upload missing iframe `<img>` src assertion
- **File:** `apps/web/e2e/photo-upload.spec.ts:38,40`
- **Spec:** §13.3, line 427
- **Current:** asserts `.jpg` + `.webp` files exist on disk.
- **Wanted:** also assert iframe `<img>` src updates to new path.
- **Severity:** Minor.

### G3: SaveIndicator "dirty" copy missing timing
- **File:** `apps/web/components/SaveIndicator.tsx:33`
- **Spec:** §10.1, line 356
- **Current:** "Ungespeicherte Änderungen"
- **Spec:** "Ungespeicherte Änderungen (auto-save in 2 s)"
- **Severity:** Cosmetic.

### G4: atomic-write spec drift (spec-doc bug, NOT code bug)
- **Spec text:** §5.3, line 150 — describes `writeFile(tmp) → rm(target) → rename(tmp,target)`.
- **Code:** `apps/web/lib/atomic-write.ts:8-13` — `writeFile(tmp) → rename(tmp,target)` (no rm). Cleanup of tmp on rename failure preserved.
- **Why:** The explicit `rm(target)` was deliberately removed in commit `b65f8b6` (Task 2) per Round-1 Codex-Code-Review's own recommendation: "POSIX `rename(2)` is atomic and overwrites the destination if it exists. Drop the redundant `rm`."
- **Action:** Update the spec text at §5.3 to match the simpler (and correct) implementation. Code is fine.
- **Severity:** Documentation drift.

## Acceptance Criteria Status (re-confirmed by orchestrator)

| # | Criterion | Status |
|---|---|---|
| 1 | `pnpm --filter @codevena/forq-web build` green | PASS |
| 2 | e2e green (5 specs) | PASS |
| 3 | apps/web unit green | PASS (67 tests) |
| 4 | core unit green (with crop tests) | PASS (16 tests) |
| 5 | typecheck + lint ≤ baseline (143) | PASS (lint 139) |
| 6 | All 8 templates render in iframe | MANUAL — covered by template-switch e2e |
| 7 | PDF export works with unsaved data | PASS (pdf-export e2e) |
| 8 | `cv.de`/`cv.en` editable end-to-end | PASS (post data-dir fix) |
| 9 | DoD reviews | IN PROGRESS — 3/4 APPROVED, this report has 4 deferred nits |

## Verdict

**CHANGES_REQUESTED** at strict reading, but the orchestrator has classified the 4 gaps as MVP-deferred → see `.review-logs/phase8-mvp-deferred.md`.
