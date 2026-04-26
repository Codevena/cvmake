# Phase 8 — Codex Code Review

**Branch:** `feat/cvmake-mvp` · **Range:** `9582fd6..47ac337` (40 commits) · **Date:** 2026-04-26

> Findings reported by Codex agent inline (sandbox blocked file writes); transcribed by orchestrator for record.

## Summary

Phase 8 is broadly well-structured: server-only core imports are mostly isolated behind subpath exports, the editor uses the intended iframe/portal architecture, and the save/upload/export paths have useful baseline tests. No confirmed critical security vulnerabilities, but several correctness gaps should be fixed.

## Critical Issues

None confirmed.

## Important Issues

### CONFLICT ON MISSING FILE: RECREATES INSTEAD OF CONFLICTS
**File:** `apps/web/app/api/save/route.ts:31`
**Description:** When the expected `mtime` is provided but the on-disk file no longer exists, the route silently recreates the CV instead of returning a conflict. A file that was externally deleted between load and save will be silently re-created, losing the signal to the user.

### OVERWRITE CLOSES MODAL BEFORE SUCCESS, IGNORES FAILURES
**File:** `apps/web/components/EditorShell.tsx:114`
**Description:** The `onOverwrite` handler clears the conflict state and closes the modal before awaiting the save result. If the overwrite save fails (network error, etc.) the conflict modal is gone and the user receives no indication that their data was not written.

### UPLOAD BUFFERS FULL CONTENT BEFORE SIZE CHECK — NO 413
**File:** `apps/web/app/api/upload/route.ts:41`
**Description:** The entire multipart body is buffered and the file staged to a temp path before any size check is applied. A large upload will consume memory and disk before being rejected. The handler never returns HTTP 413; it returns 400, so browsers and proxies cannot apply correct retry/abort semantics.

### ATOMIC WRITE: TEMP PATH COLLISION UNDER CONCURRENT WRITES
**File:** `apps/web/lib/atomic-write.ts:4`
**Description:** The temp file name is derived from the target path with a fixed suffix. Concurrent same-process writes to the same target will collide on the temp path: the second writer can clobber the first's temp file before rename, producing a torn final file.

### AUTOSAVE CLEAN-STATE TIMER CAN CLOBBER LATER STATES
**File:** `apps/web/lib/use-autosave.ts:104`
**Description:** After a successful save, a `setTimeout` sets status to `"saved"` after 3 seconds. If a new edit arrives within that window, the dirty/saving state is updated, but the stale timer fires anyway and resets status to `"saved"`, briefly showing incorrect state.

## Minor Issues

### MISSING EXIF ROTATE BOUNDS RE-CHECK AFTER ROTATION
**File:** `packages/core/src/photo.ts`
**Description:** Crop bounds are validated against original dimensions. After EXIF rotation swaps width/height for 90°/270° images, the stored crop coordinates may no longer be valid. The bounds check should run after applying EXIF rotation, not before.

### TESTS COVER HAPPY PATHS ONLY
**Files:** `apps/web/lib/use-autosave.test.tsx`, `apps/web/app/api/upload/route.test.ts`, `apps/web/components/ConflictModal.test.tsx`
**Description:** The conflict-overwrite-fails path, upload-too-large rejection, and autosave abort-on-unmount paths have no test coverage. The tests exercise successful flows but not the error branches that contain the bugs above.

### BARE BARREL IMPORT IN CLI
**File:** `apps/cli` (check `rg "from '@codevena/forq-core'"`)
**Description:** The CLI may be importing from the bare barrel instead of subpath exports. While the CLI is server-only, it is an inconsistency that could break if bundled.

## Strengths

- Subpath export split is well-designed and mostly enforced in `apps/web` — client components consistently use `/errors`, `/i18n`, etc.
- `data-paths.ts` slug regex and repo-root walk-up are correct; no path traversal vulnerability found.
- `PreviewFrame.tsx` palette-vars patching is done safely via `contentDocument` access gated on load event.
- `atomic-write.ts` correctly uses `rename` for atomicity on the happy path.
- The conflict modal state machine covers the overwrite/reload/cancel scenarios and the dirty-confirm gate is present.
- 170 unit tests + 5 e2e specs is solid coverage breadth for Phase 8 scope.

## Verdict

**CHANGES_REQUESTED**
