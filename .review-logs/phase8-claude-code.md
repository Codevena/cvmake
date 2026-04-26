# Phase 8 Code Review — forq Editor

**Reviewer:** Claude Code (claude-sonnet-4-6)
**Date:** 2026-04-25
**Scope:** 40 commits, `9582fd6..HEAD` (`feat/cvmake-mvp`)
**Files reviewed:** `apps/web/lib/use-autosave.ts`, `apps/web/components/PreviewFrame.tsx`, `apps/web/lib/data-paths.ts`, `apps/web/lib/atomic-write.ts`, `packages/core/src/photo.ts`, `apps/web/components/ConflictModal.tsx`, `apps/web/components/EditorShell.tsx`, all API routes, e2e specs, unit tests.

---

## Summary

Phase 8 delivers a complete, working single-user CV editor: RSC initial load, react-hook-form with Zod resolver, iframe live-preview via ReactDOM portal, autosave with debounce and mtime-guard conflict detection, photo upload with sharp crop, and PDF export via Puppeteer. The architecture is well-thought-out — the subpath-export split of `@codevena/forq-core` is clean, all client components correctly use subpath imports (`/i18n`, `/loader`, `/renderer`, etc.), path-traversal protection is solid, and the test surface is broad (28 unit test files, 5 e2e specs). The main issues are a handful of correctness bugs in the autosave state machine and the conflict-overwrite flow, plus one missing server-side guard in the upload endpoint. None of these are data-losing in normal use, but two of them cause observable incorrect behaviour and warrant fixes before the branch is merged.

---

## Critical Issues

None. No security exploits or data-loss paths were found within the constraints of the stated single-user, no-auth use case.

---

## Important Issues

### 1. `useAutosave` — untracked `setTimeout` can clobber `'saving'` state with `'clean'`

**File:** `/Users/markus/Developer/cvMake/apps/web/lib/use-autosave.ts` **line 104**

```ts
setTimeout(() => setState('clean'), 3000);
```

The timeout ID is never stored or cancelled. If the user edits again within 3 s of a successful save, the debounce fires a new `save()` call which sets state to `'saving'`. Three seconds after the *previous* save the stale timeout fires and transitions state to `'clean'`, visually telling the user "no changes" while a save is actively in-flight. The fix is to track the timeout ID in a ref and call `clearTimeout` at the start of each `save()` invocation and in a cleanup return from the containing `useEffect`.

---

### 2. `onOverwrite` in `EditorShell` — concurrent save race and silent failure

**File:** `/Users/markus/Developer/cvMake/apps/web/components/EditorShell.tsx` **lines 114–130**

Two problems exist in the `onOverwrite` handler:

**2a. Race condition:** `setConflict(null)` is called synchronously *before* the manual `fetch` completes (line 116 precedes line 117). On the very next React render `paused` becomes `false`, and the autosave debounced effect re-evaluates its `debounced !== lastSerializedRef` guard. If the user made any edits *during* the conflict modal, the debounced value will have diverged from `lastSerializedRef` (which was stamped at conflict-detection time). Both the manual overwrite fetch and `useAutosave.save()` then race to write the file using the same `expectedMtime`. The losing request receives a `409` which re-opens the conflict modal.

Mitigation: call `setConflict(null)` only *after* the fetch resolves, or update `lastSerializedRef` inside `onOverwrite` to match the data being sent, preventing the autosave from firing concurrently.

**2b. Silent error swallowing:** if the `fetch` returns a non-ok response (network failure, server error), the `if (res.ok)` branch at line 126 is simply skipped — `expectedMtimeRef` is not updated, no error state is set, and the user receives no feedback. The save indicator continues showing whatever state it was in before.

---

### 3. `/api/upload` — no server-side file-size guard before memory buffering

**File:** `/Users/markus/Developer/cvMake/apps/web/app/api/upload/route.ts` **line 41**

```ts
const buf = Buffer.from(await file.arrayBuffer());
```

The entire upload is read into memory before `processPhoto` ever runs. `processPhoto` does check `stat(tmp).size > maxBytes` but that occurs after the full buffer has been held in memory and written to disk. A client bypassing the browser-side `PhotoCropper` size guard (e.g. a `curl` request) can send an arbitrarily large file and exhaust process memory before any rejection occurs. For this single-user, local tool the practical risk is low, but a simple `if (file.size > MAX_BYTES) return 400` check before line 41 would make the guard watertight and consistent with `processPhoto`'s own intent.

---

### 4. No e2e test for conflict resolution flow

The conflict detection (409 → modal → Reload/Overwrite/Cancel) is one of the spec's stated goals (§3, decision 3) and is the most complex state machine in the codebase. It is tested at the unit level (`ConflictModal.test.tsx`) but has no e2e coverage. Simulating an external file modification between two saves is straightforward in Playwright (write a new mtime to the YAML between actions). Given the issues found in issues 1 and 2 above, an integration-level test here would catch regressions.

---

## Minor Issues

### 5. `cssVariables` is duplicated

**Files:**
- `/Users/markus/Developer/cvMake/packages/core/src/renderer.tsx` lines 30–39 (private local copy)
- `/Users/markus/Developer/cvMake/apps/web/lib/css-vars.ts` lines 3–5 (exported, used by `PreviewFrame`)

Both produce identical CSS-variable strings. The server-side `renderer.tsx` should import from a shared location or `@codevena/forq-core/renderer-types` rather than maintaining a private copy. This is currently harmless since they produce the same output, but a future palette field change would require updating two places.

---

### 6. `/api/export` — `generatePDF()` is not wrapped in a `try/catch`

**File:** `/Users/markus/Developer/cvMake/apps/web/app/api/export/route.ts` **line 54**

```ts
const pdf = await generatePDF(doc);
```

If Puppeteer throws (browser crash, navigation timeout, out-of-memory), the rejection propagates uncaught through the route handler. Next.js will catch it at the framework level and return a 500 with an HTML error page, but the `content-type` header is already `application/pdf` by this point, and the client-side `exportPdf()` in `TopBar` only checks `res.ok` — so the error message from Puppeteer is silently discarded. A `try/catch` returning a structured JSON 500 would make debugging easier.

---

### 7. `useAutosave` — `setTimeout` not cleaned up on unmount

**File:** `/Users/markus/Developer/cvMake/apps/web/lib/use-autosave.ts` **line 104**

The 3-second timeout that transitions `'saved'` → `'clean'` is not cleared when the component unmounts (e.g. user navigates to a different CV). React 18 silently ignores state updates on unmounted components so this does not cause crashes or warnings, but it is a latent resource leak and would trigger the `react-hooks/exhaustive-deps` rule if that rule were enabled. Addressed by the same fix described in issue 1.

---

## Strengths

- **Subpath export split is correct.** All client-side components (`PreviewFrame`, section components, `EditorShell`) exclusively use subpath imports such as `@codevena/forq-core/i18n`. No bare barrel import (`@codevena/forq-core`) appears anywhere in `apps/web` source code, meaning server-only modules (`loader`, `pdf`, `photo`, `renderer`) cannot accidentally be included in the client bundle.

- **Path traversal protection is robust.** `validateSlug` (`data-paths.ts`) rejects empty strings, dotfiles, uppercase, slashes, and backslashes. `resolveCvPath` adds a redundant `startsWith(base + sep)` guard after `path.resolve`, giving defence-in-depth. Tested thoroughly including the `".."` edge case.

- **Atomic write semantics are correct.** `atomicWriteFile` writes to a PID+timestamp-suffixed temp file, then renames atomically. The `rm` in the catch path was correctly removed in commit `b65f8b6` (rename is atomic; on failure the tmp file is cleaned up).

- **`useAutosave` ref pattern prevents stale closures correctly.** The `optsRef` pattern (update ref on every render via a bare `useEffect`, then read `optsRef.current` inside the stable `save` callback) is the idiomatic solution to the stale-closure-in-debounce problem. The previous root-cause comment in the code correctly documents why.

- **`PreviewFrame` is React StrictMode safe.** The two-effect split (full document rewrite on template/locale change; in-place `textContent` patch for palette) is correct. StrictMode double-invocation of the first effect is harmless: `doc.open()` resets the document, `setRoot` updates state, and the portal targets the freshly-created element. No cleanup is needed or missing.

- **ConflictModal state machine is correct.** The `isFormDirty` confirmation gate (ask twice before discarding unsaved edits) is properly wired via props; the `confirmReload` sub-state is reset if the user clicks "Doch nicht" (line 58). Tests cover both the dirty and clean reload paths.

- **`data-paths.ts` is tested at the right level.** The test suite validates `validateSlug` against seven slug patterns, `resolveCvPath` for traversal blocking, and `photoDir` for path correctness — all without needing a real filesystem.

- **Photo crop bounds delegation to sharp is acceptable.** `processPhoto` passes `Math.round()`-normalised crop values to `sharp.extract()`. Sharp's own validation rejects negative coordinates, zero dimensions, and out-of-bounds regions with a clear error. The test at `packages/core/test/photo.test.ts:43` correctly documents this contract. No separate bounds-checking layer is needed for a single-user tool.

- **Test coverage breadth is excellent for an MVP.** 28 unit test files covering every hook, every API route, every section component, and 5 e2e specs covering the main user journeys. The use of temp directories for filesystem tests (rather than mocking `fs`) ensures real I/O behaviour is exercised.

---

## Verdict

**CHANGES_REQUESTED**

Two issues (issues 1 and 2) cause observable incorrect behaviour in a production user session: the save indicator can flicker to "clean" while a save is in-flight, and the overwrite path has a latent race and no error feedback. Issue 3 (missing server-side size guard before memory buffering) is a minor hardening gap. These should be fixed before merging; none require significant rework.
