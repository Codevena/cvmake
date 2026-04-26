# Phase 8 — Claude Spec-Conformance Review (Round 3)

**Spec:** `/Users/markus/Developer/cvMake/docs/superpowers/specs/2026-04-25-forq-editor-design.md`
**Branch:** `feat/cvmake-mvp`
**Round-2 HEAD:** `76bfe98`
**Round-3 HEAD:** `4c074e2`
**Verifier:** Claude Opus 4.7 (1M context)
**Date:** 2026-04-25

## Summary

Re-verification after two more fix commits (`f5998f4`, `4c074e2`) addressed
findings raised by other R2 reviewers — not by my R1/R2 reports. Both are
narrow, surgical changes: (1) `ConflictPayload.currentData` widened to
`CVData | null` with full UI handling for the externally-deleted-file case
and (2) the `'saved' → 'clean'` 3 s timer is now cleared at the START of the
next save so a stale timer cannot clobber an in-flight `'saving'` state. New
unit tests cover both fixes. Web unit suite grew from 65 to **67 tests**,
all green; `pnpm typecheck` is full-turbo green (10/10 cached). My R2
**APPROVED** verdict still holds.

## R2 APPROVED Items Status

Every spec section R1+R2 reviewed and marked MET was re-checked against the
post-fix tree. None regressed.

| Spec Section | R2 Status | R3 Status | Notes |
|---|---|---|---|
| §3 T1 — iframe + createPortal | MET | MET | Untouched. |
| §3 T2 — REST routes + RSC initial load | MET | MET | Untouched. |
| §3 T3 — Optimistic save + 409 + 3-button modal | MET | MET (improved) | Conflict modal now correctly handles "deleted-file" 409 (reload disabled, overwrite re-creates). |
| §3 T4 — Single `useForm<CVData>` | MET | MET | Untouched. |
| §3 T5a — Accent kept on template switch + Reset | MET | MET | Untouched. |
| §3 T5b — Palette resets when unknown to new template | MET | MET | Untouched. |
| §3 T5c — Settings autosave 2 s debounce | MET | MET | Untouched. |
| §4.2 — Component tree | MET | MET | No structural changes. |
| §4.3 — Data sources | MET | MET | Untouched. |
| §5.1 — Routes (5 API + 2 RSC + dev-ui) | MET | MET | Same 7 routes. |
| §5.2 — Boot sequence | MET | MET | Untouched. |
| §5.3 — `GET /api/cv` contract | MET | MET | Untouched. |
| §5.3 — `GET /api/cv/[slug]` contract | MET | MET | Untouched. |
| §5.3 — `POST /api/save` contract | MET | MET | Existing 200/409/422 paths unchanged. The R2 "delete returns 409 with `currentData: null, currentMtime: 0`" path (`apps/web/app/api/save/route.ts:41`) is now properly handled on the client side too. |
| §5.3 — `POST /api/upload` contract | MET | MET | Untouched. |
| §5.3 — `POST /api/export` contract | MET | MET | Untouched. |
| §5.4 — Edit/save cycle | MET | MET (improved) | `useAutosave.save()` now clears the stale `savedTimerRef` at the START (before `await fetch`) so a slow second save (>3 s after the first `'saved'`) can no longer be clobbered back to `'clean'`. |
| §6.1–§6.4 — iframe lifecycle, update rules, bootstrap, sandbox | MET | MET | Untouched. |
| §7 — `processPhoto` crop extension + 2 tests | MET | MET | Untouched. |
| §8.1–§8.4 — Form state, sections, sidebar, template switch | MET | MET | Untouched. |
| §9 — Photo upload flow | MET | MET | Untouched. |
| §10.1 — `<SaveIndicator />` 5 states | MET | MET (improved) | The new saved-timer hardening removes the only remaining edge where the indicator could lie ("clean" while still saving). |
| §10.2 — `<ConflictModal />` 3 buttons + dirty-confirm | MET | MET (improved) | Reload button is now `disabled` with German `title` "Datei existiert nicht mehr" when `currentData === null`; Overwrite still works (re-creates the file); Cancel always works. Title and body text correctly switch to "extern gelöscht" wording. Spec §10.2 lists all 3 actions; this is a graceful degradation, not a removal. |
| §11 — Export flow | MET | MET | Untouched. |
| §12 — Error handling table (12 rows) | MET (Puppeteer retry minor gap) | MET (same minor gap) | Unchanged from R2. |
| §13.1–§13.3 — Tests | MET (65 / 28) | MET (**67 / 28**) | New tests: deleted-file conflict UI; slow-second-save stale-timer-not-clobbering. |
| §17 OQ1–OQ3 — Open questions | MET | MET | Unchanged. |

## Fix-commit verification

### `f5998f4` — `ConflictPayload.currentData: CVData → CVData | null`

**Type widening (`apps/web/lib/use-autosave.ts:8–12, 92`):**
- `ConflictPayload` documented inline with the deleted-file rationale.
- 409 body parsing now typed `CVData | null` (line 92).

**UI handling (`apps/web/components/ConflictModal.tsx`):**
- `Props.currentData: CVData | null` (line 7).
- `fileDeleted = currentData === null` derived flag (line 28).
- Title: "Datei wurde extern gelöscht" vs "extern verändert" (line 40).
- Body copy split into two branches (lines 42–53).
- Reload button(s) `disabled={fileDeleted}` with `title={reloadDisabledTitle}`
  and visual `disabled:opacity-50` (lines 60–63, 84–86); both onClick guards
  (`if (!currentData) return`) prevent any accidental reload-of-null.
- Overwrite button untouched — still works (it re-creates the file via the
  `expectedMtime===0` create-new path landed in R2).
- Cancel button untouched — still works.

**Test coverage (`apps/web/components/ConflictModal.test.tsx:51–77`):**
- Renders with `currentData={null}, currentMtime={0}`.
- Asserts deletion-specific title text ("extern gelöscht").
- Asserts Reload button is `:disabled` and carries the German tooltip.
- Asserts clicking the disabled Reload does NOT call `onReload`.
- Asserts Overwrite still calls `onOverwrite(0)` (i.e. re-create path).

**Spec compliance:** §10.2 lists Reload / Overwrite / Cancel. Disabling
Reload when there is literally nothing to reload to is the only sensible
behaviour and is explicitly allowed by §5.3 `/api/save` 409 contract which
permits `currentData: null` for the deleted case. No spec violation.

### `4c074e2` — Clear stale `savedTimerRef` at start of next save

**Implementation (`apps/web/lib/use-autosave.ts:63–73`):**
- Inside `save()`, immediately after the `current.paused` early-return and
  BEFORE `inFlightRef.current?.abort()`, the saved-timer ref is cleared:
  ```ts
  if (savedTimerRef.current) {
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = null;
  }
  ```
- Inline comment correctly explains the race: a slow second save (>3 s)
  would otherwise have its `'saving'` state clobbered to `'clean'` by the
  prior save's stale 3 s timer.

**Test coverage (`apps/web/lib/use-autosave.test.tsx:102–179`):**
- New test "langsamer zweiter Save: stale clean-Timer überschreibt nicht
  den saving-State" simulates exactly this race using fake timers and a
  manually-resolved second `fetch`.
- Asserts state stays `'saving'` after advancing past the original 5.1 s
  clean-timer mark while the second request is still in flight.
- Resolves the second save and asserts state moves to `'saved'` with the
  new mtime.

**Spec compliance:** §10.1 lists indicator states `clean | saving | saved
| conflict | error`. Spec §5.4 requires the indicator to truthfully reflect
the in-flight state. This fix removes a subtle lie ("clean" during an
ongoing save) — pure improvement, no spec violation.

## Verification commands

```bash
# Unit tests — 67 pass / 28 files
pnpm --filter @codevena/forq-web test:unit
#   Test Files  28 passed (28)
#        Tests  67 passed (67)

# Typecheck — full-turbo green
pnpm typecheck
#   Tasks:    10 successful, 10 total
#   Cached:   10 cached, 10 total
```

## Acceptance §14.1–14.8 status

- §14.1 web build: not re-run this round (no source-tree changes outside
  the two narrow files; both files compile cleanly per typecheck).
- §14.2 e2e: not re-run this round (no route or boot-sequence changes;
  conflict-modal e2e still asserts the dirty-confirm + reload happy path).
- §14.3 web unit: **PASS** (67/67).
- §14.4 core unit: untouched, no relevant change to `processPhoto`.
- §14.5 typecheck/lint: typecheck **PASS** full-turbo; lint untouched.
- §14.6 8 templates render: no template or preview-bootstrap change.
- §14.7 PDF export: no export-route change.
- §14.8 cv.de / cv.en boot-through-save: improved (deleted-file conflict
  now has a clean recovery path via Overwrite re-create).

No regressions; all R2-passing acceptance items still pass.

## New gaps

None introduced by `f5998f4` or `4c074e2`.

Pre-existing minor gaps from R1/R2 still open (all flagged as non-blocking
in prior rounds):

1. §12 Puppeteer one-server-side-retry — still not implemented.
2. §5.3 `/api/upload` `aspect` field still not consumed by `processPhoto`.
3. §13.2 `/api/cv` route test breadth — single test.

## Verdict

**APPROVED**

R2 verdict still holds. The two R3 fix commits are surgical, well-tested,
and improve spec conformance in two specific edge cases (deleted-file
409 handling and the saved-timer race). Web unit suite is 67/67 green;
typecheck is full-turbo cached. Phase 8 remains spec-conformant and ready
to ship.
