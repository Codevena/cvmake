# Phase 8 — Codex Spec Verification

**Branch:** `feat/cvmake-mvp` · **Spec:** `docs/superpowers/specs/2026-04-25-forq-editor-design.md` · **Date:** 2026-04-26

> Findings reported by Codex agent inline (sandbox blocked file writes); transcribed by orchestrator for record.

## Summary

Phase 8 is substantially implemented — RSC boot pages, REST routes, one `useForm<CVData>`, iframe + `createPortal`, autosave, upload, export, unit/e2e files are all present. However, gaps remain in error handling, conflict cancel behavior, export filename, and certain spec details. Note: the codex sandbox could not run build/test commands; orchestrator independently verified those green pre-DoD.

## Spec Section Coverage

| Spec Section | Implementation | Status | Notes |
|---|---|---|---|
| §3 Theme 1 iframe + portal | `PreviewFrame.tsx:32-117` | MET | iframe document write + `createPortal` present |
| §3 Theme 2 REST + RSC | `app/page.tsx`, `app/cv/[slug]/page.tsx`, `app/api/*` | MET | RSC initial load + 5 routes |
| §3 Theme 3 autosave/conflict | `use-autosave.ts`, `ConflictModal.tsx`, `EditorShell.tsx` | PARTIAL | 409 modal exists, but Cancel resumes autosave (`EditorShell.tsx:131`), contrary to spec §10.2 |
| §3 Theme 4 single form | `EditorShell.tsx:37-46,64-134` | MET | One `useForm<CVData>` with `zodResolver` |
| §3 Theme 5a/5b/5c | `Sidebar.tsx`, `use-autosave.ts` | MET | Accent preserved, reset button, unknown palette resets, settings autosave with same debounce |
| §4/§5 Architecture/API | All main files | PARTIAL | Structure matches. Gaps: export filename uses `lastName` not `slug` (`api/export/route.ts:55`); upload temp uses `.bin` (intentional) |
| §6 Preview bridge | `PreviewFrame.tsx:32-117` | MET | Template rewrites doc; palette/accent patches CSS vars; field changes portal-render only |
| §7 Photo crop | `packages/core/src/photo.ts:5-72`, `packages/core/test/photo.test.ts:29-53` | MET | Crop after rotate before resize; two crop tests present |
| §8 Form state | `apps/web/components/sections/*` | PARTIAL | All 7 sections exist. Top-level repeaters use `useFieldArray`; bullets/tags use controlled editors (BulletListEditor, TagInput) instead of nested `useFieldArray`. **Note:** Phase-7 BulletListEditor is a controlled editor — using it via `<Controller>` is the intended pattern. Spec wording may be outdated. |
| §9 Upload flow | `PhotoUploadField.tsx`, `api/upload/route.ts` | PARTIAL | Multipart upload + cropper present. Missing drag/drop, toast, real progress |
| §10 SaveIndicator/ConflictModal | `SaveIndicator.tsx`, `ConflictModal.tsx` | PARTIAL | 5 states + 3 buttons present. Cancel behavior wrong (resumes autosave) |
| §11 Export | `TopBar.tsx:22-47`, `api/export/route.ts:25-63` | PARTIAL | Sends current form data, downloads blob. Missing client error surface; **filename mismatch** (`lastName` vs `slug`) |
| §12 Error handling | Multiple | GAP | RSC YAML/Zod load error banner missing; broken-yaml e2e accepts default Next error page (deferred per plan §17). No export retry/toast |
| §13 Testing | unit + e2e | PARTIAL | 5 e2e specs exist. Some happy-path-only assertions (preview test smoke-only, template e2e doesn't assert palette reset, broken-yaml doesn't assert custom banner) |
| §17 Open questions | `page.tsx`, `TagInput.tsx`, `render-helpers.ts` | MET | Resolved: prefer `cv.de`; separate `TagInput`; hidden sections stripped before preview render |

## Gaps

1. **Conflict Cancel behavior** — `ConflictModal.tsx:81-83` + `EditorShell.tsx:131`: Cancel unpauses autosave immediately; spec §10.2 says autosave must remain paused until Reload or Overwrite is chosen.
2. **RSC load error banner missing** — `app/cv/[slug]/page.tsx:45`; `broken-yaml.spec.ts:20-23` accepts the default error boundary instead of a spec-required banner. Plan accepts this as "Phase-9 polish".
3. **Export missing client error surface** — `TopBar.tsx:22-47` has no catch/toast.
4. **Export filename mismatch** — `api/export/route.ts:55` uses `lastName.lowercase()-${templateId}.pdf`, spec §11 requires `${slug}-${templateId}.pdf`.
5. **Upload UX incomplete** — no drag/drop, no toast on error, no real progress bar.
6. **Nested `useFieldArray` for bullets/tags not used** — spec §8.1 lists them, code uses controlled editors. Likely a deliberate adaptation since Phase-7 BulletListEditor and TagInput are controlled.

## Acceptance Criteria Status

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | `pnpm --filter @codevena/forq-web build` green | PASS | Verified by orchestrator: build clean, 9 routes registered |
| 2 | e2e green (5 specs) | PASS | Verified: 5/5 green in 9.5s |
| 3 | apps/web unit green | PASS | Verified: 28 files / 59 tests |
| 4 | core unit green (with crop tests) | PASS | Verified: 5 files / 16 tests |
| 5 | typecheck + lint ≤ Phase-7 baseline (143) | PASS | typecheck clean; lint 140 errors (≤ 143) |
| 6 | All 8 templates render in iframe | MANUAL | 8 template IDs in `packages/templates/src/*/meta.ts`; runtime render verified by template-switch e2e |
| 7 | PDF export works with unsaved data | PASS | pdf-export e2e green (38KB %PDF) |
| 8 | `cv.de`/`cv.en` editable end-to-end | PASS | `/api/cv` returns both after data-dir fix |
| 9 | DoD reviews | IN PROGRESS | This is the DoD |

## Verdict

**CHANGES_REQUESTED** — fix 4 spec-violation gaps (Cancel behavior, export filename, optional polish for RSC error banner + export error surface).
