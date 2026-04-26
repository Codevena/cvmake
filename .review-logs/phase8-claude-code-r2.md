# Phase 8 — Claude Code Review Round 2

**Reviewer:** Claude Code (Sonnet 4.6)
**Date:** 2026-04-25
**Branch:** `feat/cvmake-mvp`
**Commits reviewed:** `47ac337..HEAD` (3 fix commits: `76bfe98`, `c58a872`, `d9feb0f`)
**Mode:** Read-only

---

## Summary

All three Round-1 issues have been addressed, and the related fixes flagged by other reviewers are also confirmed complete. One **new High-severity bug** was introduced by the `d9feb0f` commit: the server now correctly returns `currentData: null` for the deleted-file 409 case, but the client casts the response as `{ currentData: CVData }` (non-nullable), and `ConflictModal` has no null guard — clicking "Datenträger neu laden" in this scenario calls `form.reset(null)` which corrupts or crashes the editor form. TypeScript does not surface this because of the `as` cast.

Two pre-existing items of note (not introduced by fix commits, not blocking):

1. The upload staging temp path at `/Users/markus/Developer/cvMake/apps/web/app/api/upload/route.ts:52` still uses `slug+Date.now()` without randomness — concurrent same-slug uploads could collide. This was not in scope for these commits.
2. `window.alert()` for overwrite failures is functional but provides a poor UX; acceptable for now given it is an error-branch fallback.

---

## Round-1 Issue Resolution

| # | Issue | Status | Evidence |
|---|-------|--------|----------|
| 1 | `setTimeout(3000)` clobber in `use-autosave.ts` | **Fixed** | `savedTimerRef` introduced at line 45; cleared before each new schedule (line 109) and on unmount (lines 146-151). Regression test added at `use-autosave.test.tsx:50-100`. |
| 2 | `onOverwrite` race + silent failure in `EditorShell.tsx` | **Fixed** | Fetch is now awaited before modal dismissal; non-2xx returns `window.alert` and leaves modal open; `setConflict(null)` only called on success; `expectedMtimeRef` updated from response body. |
| 3 | Upload route buffers full body before size check | **Fixed** | `file.size > MAX_UPLOAD_BYTES` check at line 46 of `upload/route.ts` runs before `file.arrayBuffer()` (line 49). `413` response returns `{ kind: 'too_large', maxBytes }`. Test added. |

### Also-verified items (flagged by other reviewers)

| Item | Status | Evidence |
|------|--------|----------|
| `save/route.ts` — deleted-file → 409 instead of silent recreate | **Fixed** | `stExists` null path returns `{ kind: 'conflict', currentData: null, currentMtime: 0 }` with status 409 when `expectedMtime > 0`. Two new tests in `save/route.test.ts` cover both paths. |
| `atomic-write.ts` — temp path collision under concurrent writes | **Fixed** | `randomBytes(8).toString('hex')` suffix added to temp filename. 16-concurrent-write test passes. |
| `EditorShell.tsx` — Cancel keeps autosave paused via `conflictPaused` | **Fixed** | `conflictPaused` state added; `paused` prop is `conflict !== null || conflictPaused`; only `onReload` and successful `onOverwrite` call `setConflictPaused(false)`. Matches spec §10.2. |
| `export/route.ts` + `TopBar.tsx` — slug-based filename per spec §11 | **Fixed** | `body.slug` is preferred over `lastName` in the filename; `slug` is now included in the `TopBar` fetch body; `a.download` on the client also uses slug. |

---

## New Issues

### HIGH — `currentData: null` not handled client-side for deleted-file 409

**Introduced by:** `d9feb0f` (`apps/web/app/api/save/route.ts`)

**Root cause:** The save route now correctly sends `{ kind: 'conflict', currentData: null, currentMtime: 0 }` when a file has been deleted externally and the client had `expectedMtime > 0`. However, `use-autosave.ts` line 79 casts the response body as `{ currentData: CVData; currentMtime: number }` — TypeScript accepts the `null` being treated as `CVData`. The value propagates as:

```
use-autosave.ts:79   → body.currentData = null (at runtime, typed as CVData)
use-autosave.ts:83   → onConflict({ currentData: null, currentMtime: 0 })
EditorShell.tsx:47   → setConflict({ currentData: null, currentMtime: 0 })
ConflictModal.tsx:7  → currentData: CVData  (prop, non-nullable type, no null guard)
ConflictModal.tsx:50 → onReload(null, 0)    ("Ja, neu laden" button)
EditorShell.tsx:116  → form.reset(null)     → react-hook-form corrupts/crashes form
```

`ConflictModal` has no conditional branch for a null/missing `currentData`. The "Datenträger neu laden" button is rendered and clickable even when `currentData` is `null`, and pressing it calls `form.reset(null)`.

**Affected files:**
- `/Users/markus/Developer/cvMake/apps/web/lib/use-autosave.ts` — cast on line 79 must widen to `CVData | null`
- `/Users/markus/Developer/cvMake/apps/web/lib/use-autosave.ts` — `ConflictPayload.currentData` must be `CVData | null`
- `/Users/markus/Developer/cvMake/apps/web/components/ConflictModal.tsx` — props type and "Reload" button must guard for null
- `/Users/markus/Developer/cvMake/apps/web/components/EditorShell.tsx` — `onReload` handler must guard `form.reset` against null

**Suggested fix (outline):**
1. Change `ConflictPayload` to `{ currentData: CVData | null; currentMtime: number }`.
2. Widen the cast in `use-autosave.ts:79` to `{ currentData: CVData | null; currentMtime: number }`.
3. In `ConflictModal`, when `currentData` is `null`, disable or replace the "Datenträger neu laden" button with a message like "Die Datei wurde gelöscht — kein Inhalt zum Laden." and offer only "Abbrechen".
4. In `EditorShell.onReload`, guard: `if (data !== null) form.reset(data);`.

---

### LOW — `window.alert` for overwrite failure is functional but suboptimal

**File:** `/Users/markus/Developer/cvMake/apps/web/components/EditorShell.tsx` lines 139-150

The fix correctly prevents silent failure, but `window.alert` is a blocking synchronous call and in some environments (e.g. automated tests, headless browsers) it throws. The fix is acceptable as a stopgap, but a toast/inline error in the ConflictModal would be more consistent with the overall UX. Not a regression — no test will fail because of it.

---

### LOW (pre-existing, not introduced by fix commits) — Upload staging temp path lacks randomness

**File:** `/Users/markus/Developer/cvMake/apps/web/app/api/upload/route.ts:52`

```
const tmp = path.join(uploadStagingDir(), `.upload-${slug}-${Date.now()}.bin`);
```

The atomic-write fix added `randomBytes` to CV file writes but the upload staging temp path was not updated. Two concurrent uploads for the same slug within the same millisecond would collide. Low probability in practice (single-user tool), but worth noting. Not introduced by the fix commits.

---

## Verdict

**CHANGES_REQUESTED**

The three Round-1 fixes and the five co-fixed items are all correctly implemented and well-tested. However, `d9feb0f` introduced a new High-severity client-side bug: `currentData: null` from the deleted-file 409 is not handled by `ConflictPayload`, `ConflictModal`, or the `onReload` callback in `EditorShell`. Clicking "Reload" in this specific scenario calls `form.reset(null)`, which corrupts the editor form state at runtime. TypeScript does not catch this because of the `as` cast on `use-autosave.ts:79`. This must be fixed before the branch is mergeable.
