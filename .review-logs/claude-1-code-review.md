# Phase 7 Code Review — `@codevena/forq-ui`

**Reviewer:** Claude (Opus 4.7, 1M context)
**Branch:** `feat/cvmake-mvp` (commits `8f5e702..HEAD`)
**Scope:** All 9 components, tests, build infrastructure, demo page.
**Date:** 2026-04-25

---

## 1. Summary

Phase 7 ships nine well-scoped, headless, controlled React components matching the Phase 7 design spec almost exactly. Type-check, build, biome, vitest (37/37) and `next build` are all green; the components are small, predictable, and consistently structured. Two minor concerns merit attention before declaring "done": (a) a real a11y bug in `BulletListEditor` (input has neither a `<label htmlFor>` nor an `aria-label` association) and (b) a small documentation drift between the spec/plan (which still list `image/heic`) and the implementation (which intentionally drops HEIC). Everything else is either acceptable MVP debt or stylistic.

---

## 2. Strengths

- **API consistency.** Every form primitive follows the exact same shape from the spec (`value`, `onChange`, `onBlur?`, `error: string`, `disabled?`, `required?`, `className?`). RHF `<Controller>` wiring will be trivial in Phase 8.
- **Strict-typed end-to-end.** `tsc -p tsconfig.json --noEmit` is clean even when re-run with explicit `--strict --exactOptionalPropertyTypes --noUncheckedIndexedAccess`. No `any` usages anywhere in `packages/ui/src`.
- **Pragmatic class composition.** Plain `[base, custom].filter(Boolean).join(' ')` avoids `clsx`/`tailwind-merge` dep creep, exactly as the spec mandated.
- **PhotoCropper polish.** Lazy URL creation (initialiser callback) plus a single `useEffect` cleanup keyed on `imageUrl` correctly handles unmount and file-replacement; both prior leaks are gone. The conditional spread `{...(crop !== undefined ? { crop } : {})}` is the right way to satisfy `exactOptionalPropertyTypes` for the `react-image-crop` API.
- **Tests are behavior-only.** No assertions on Tailwind class lists (per spec §8.3). Tests target labels, roles, displayed values, and call-shape — they will survive markup tweaks.
- **Build artefacts.** `dist/` mirrors `src/` 1-to-1 with `.d.ts` + sourcemaps for every component; barrel re-exports both runtime and type declarations. `apps/web` consumes the package with zero friction; `next build` produces `/dev-ui` as a static route.
- **Demo page covers all nine components** with realistic state (controlled values, palette objects, `DateRangeValue`, `PhotoCropResult`).

---

## 3. Issues

### Critical
*None.*

### Important

**I-1. `BulletListEditor`: bullet inputs have no accessible name.**
File: `packages/ui/src/editors/BulletListEditor.tsx:52-64`.
The component renders `label` as a `<span>` (line 52) and the per-row `<input>` has neither `id` + `<label htmlFor>` nor `aria-label`/`aria-labelledby`. Screen-reader users hear "edit text" with no context. The per-task review flagged this; it remains unfixed.

Recommended fix (no behaviour change, no breaking API):
```tsx
<input
  aria-label={`${label ?? 'Bullet'} ${idx + 1}`}
  ...
/>
```
or render the heading as a `<label id="...">` and use `aria-labelledby={`${headingId} bullet-${idx}`}`.

This is the only Phase 7 component without an accessible name on its primary input. I'd fix it before Phase 8 starts wiring it to RHF, because at that point the editor will be the easiest place to surface the missing label and it will get harder to retrofit.

**I-2. Spec/plan documentation drift on HEIC.**
Files: `docs/superpowers/specs/2026-04-25-forq-ui-design.md:310,313`, `docs/superpowers/plans/2026-04-25-forq-ui.md:1782,1893`.
Both spec and plan list `image/heic` in the MIME whitelist and `accept` attribute. The fix commit `e221d26` intentionally dropped HEIC because browsers can't reliably decode it (sound decision). The implementation now uses `image/jpeg,image/png,image/webp`. Spec/plan should either be updated to match, or include a footnote explaining the decision. Otherwise a future contributor will "fix" the implementation to match the spec and reintroduce the problem.

Cheapest fix: append a one-line note to spec §7.4 ("HEIC dropped in implementation; see commit e221d26") and update the MIME whitelist in plan §2.

### Minor

**M-1. `deriveId` is duplicated four times verbatim.**
Files: `Input.tsx:19-24`, `Textarea.tsx:18-23`, `Select.tsx:23-28`, `ColorPicker.tsx:19-24`.
The bodies differ only by a single hardcoded prefix string (`'input-'`, `'textarea-'`, `'select-'`, `'color-'`). The per-task review marked this as a "rule of 3-or-4" deferred refactor.

My take: **it's fine to defer**. The duplication is mechanical, low-risk, and extracting it now would require either (a) a tiny `internal/deriveId.ts` shared module — easy but adds a private surface that the package then has to maintain — or (b) accepting a `prefix` argument and threading the call site. The functions are 6 lines each, total cost ≈ 24 lines. The pattern won't be reused outside primitives, so the rule of three doesn't strongly apply. **My recommendation: leave it for Phase 8 or beyond.** If extracted, do `packages/ui/src/internal/derive-field-id.ts` (not exported from the barrel) so the public API stays unchanged.

**M-2. `BulletListEditor` effect runs on every render.**
File: `packages/ui/src/editors/BulletListEditor.tsx:17-22`.
The effect has no dependency array. The `justAddedRef` guard makes the body a no-op on most renders, so functionally it's correct, but every render schedules an effect. Cleaner:
```ts
useEffect(() => {
  if (justAddedRef.current && newRowRef.current) {
    newRowRef.current.focus();
    justAddedRef.current = false;
  }
}, [value.length]);
```
Same correctness, runs only when the list grows.

**M-3. `PhotoCropper`: redundant explicit `URL.revokeObjectURL` in `onPick`.**
File: `packages/ui/src/photo/PhotoCropper.tsx:88`.
The `useEffect` cleanup at lines 68-72 already revokes the previous `imageUrl` when the URL changes. The explicit `if (imageUrl) URL.revokeObjectURL(imageUrl)` on line 88 calls revoke a second time on the same URL. `URL.revokeObjectURL` is idempotent in browsers, so no actual bug — but the redundancy obscures the lifecycle and risks confusion if the effect is later refactored. Suggest removing line 88.

**M-4. Radiogroup keyboard navigation missing in `PaletteSelector` and `TemplateCard`.**
Files: `PaletteSelector.tsx:16-43`, `TemplateCard.tsx:21-43`.
ARIA's `radiogroup` pattern expects arrow-key navigation between the radios with a single tab-stop on the group. Both components currently rely on default `<button>` tab order (every tile is its own tab-stop) and have no `onKeyDown` for arrow keys. The per-task review flagged this. For an MVP shipping behind a private editor, this is acceptable — the spec doesn't require WCAG AA — but it's worth tracking as Phase 8 polish (or a v2 ticket). Click + space/enter activation works because they're real buttons.

**M-5. `ColorPicker` text input has no `inputMode="text"` or pattern attribute.**
File: `packages/ui/src/color/ColorPicker.tsx:71-82`.
On mobile the user gets a generic keyboard. Adding `inputMode="text" autoCapitalize="none" autoCorrect="off" spellCheck={false}` is a one-line UX improvement. Optional.

**M-6. `disabled` prop is omitted from `<select>` aria-disabled fallback in `DateRangeInput` start fields when `isCurrent` is true.**
File: `packages/ui/src/primitives/DateRangeInput.tsx:90-117`.
Cosmetic: only the *end* selects get `disabled || isCurrent`. The start selects only respect `disabled`. That's actually correct behaviour (start should still be editable when end="Current"), but the asymmetry is worth a one-line code comment. Skip if you don't care.

**M-7. `BulletListEditor` does not constrain `disabled` from the controlled-field pattern.**
File: `packages/ui/src/editors/BulletListEditor.tsx:3-10`.
`BulletListEditorProps` lacks `disabled`. The spec's §5.3 doesn't list it either, but Phase 8 will likely want a way to disable the whole list (e.g., during autosave). Easy to add later in a non-breaking change. Not a Phase 7 blocker.

---

## 4. Specific Question Answers

### "Cross-component consistency"
Yes. Every primitive (`Input`, `Textarea`, `Select`, `ColorPicker`) uses the same shape:
1. Destructure props (excluding `id` since `deriveId` reads it),
2. Compute `inputId` via `deriveId`,
3. Compute `wrapperClass = ['flex flex-col gap-1', className].filter(Boolean).join(' ')`,
4. Compute `fieldClass` with conditional `border-error`,
5. Render label → field → optional error `<p>`.
The wrapper-class string is byte-identical across all four primitives. The error rendering (`<p className="text-sm text-error">`) is byte-identical. Class composition pattern is consistent. **No deviations.**

### "`deriveFieldId` duplication: should it be addressed?"
**No, not before declaring Phase 7 done.** See M-1 above. The duplication is 24 lines total, the function is trivial, and extracting it now would create an internal module that the package then has to maintain. If/when a 5th primitive is added, extract then. Document the decision in `packages/ui/CONTRIBUTING.md` if there were one (there isn't, and there shouldn't be for a 9-component MVP package).

### "Imports / exports — barrel matches?"
Yes. Every component exports its `*Props` type and the component function from the barrel. `dist/index.d.ts` mirrors `src/index.ts` exactly. Sub-types are correctly re-exported (`SelectOption`, `DateRangeValue`, `PhotoCropResult`, `PhotoAspect`). No missing types.

### "Test brittleness"
Tests are robust. They assert on:
- `getByLabelText` (semantic, not class-based),
- `getByRole` with name (semantic),
- `getByDisplayValue` (real value, not class),
- `toHaveAttribute('aria-checked', ...)` (ARIA contract, not class).
**No tests assert on Tailwind class lists.** The only fragile spot is `screen.getByText('Required')` and similar — these would break if you i18n the default error strings, but the spec mandates English defaults so that is by design.

### "A11y baseline acceptability for MVP"
Mixed.
- `Input`/`Textarea`/`Select`/`ColorPicker`/`DateRangeInput` — accessible: proper label/htmlFor or fieldset/legend.
- `PhotoCropper` — has `aria-label="Upload photo"` on the file input and `aria-pressed` on aspect toggles. Acceptable.
- `PaletteSelector`/`TemplateCard` — have correct `role="radio"` + `aria-checked` + accessible name. Missing arrow-key navigation but click/space/enter work. **Acceptable for MVP**, track as polish.
- `BulletListEditor` — **NOT acceptable.** Inputs literally have no accessible name. This is the only real a11y bug (I-1). Should be fixed now.

### "Type-safety landmines for RHF `<Controller>` integration in Phase 8"
Two minor things to be aware of:
1. **`onBlur?: () => void`** — RHF's `field.onBlur` returns `void` and takes no args, so this is wired with `onBlur={field.onBlur}` directly. Compatible.
2. **`value: T` is required** — fine for RHF (it always provides a value), but standalone callers must pre-initialise. Already documented in spec.
3. **`error?: string`** — RHF gives `errors[name]?.message?.toString()` which is `string | undefined`. With `exactOptionalPropertyTypes`, you must spread conditionally: `{...(message ? { error: message } : {})}` or use `error={message ?? ''}` and check the renderer. Easy to handle in Phase 8 with a `<FormField>` wrapper.

No landmines on the library side.

### "Bundle/build correctness"
- `pnpm --filter @codevena/forq-ui build` is green.
- `dist/` contains `.js`, `.d.ts`, `.js.map`, `.d.ts.map` for every component plus the root barrel.
- `package.json` `"main"` and `"types"` point at the barrel; the `./styles/tailwind.css` subpath export resolves to `src/styles/tailwind.css` (intentional — Tailwind needs the source).
- `apps/web` consumes via `workspace:*` and `pnpm next build` succeeds with `/dev-ui` rendering.

### "Demo page exercises all 9 components meaningfully?"
Yes — all 9 components are rendered, all are controlled with `useState`, and three (`DateRangeInput`, `PhotoCropper`, `PaletteSelector` via the `palettes` prop) get a JSON dump of state for visual confirmation. **Coverage is complete.**

Two improvements worth considering (not blockers):
1. The `TemplateCard` demo passes only two cards with `templateId` as the visible name (`'classic-serif'`/`'modern-minimal'`) — acceptable for a dev playground but a thumbnail would prove the `<img>` path. Optional.
2. There's no `disabled` toggle to visually confirm disabled-state styling. Cheap one-checkbox addition. Optional.

### "Memory & leaks beyond PhotoCropper"
Spot-checked all components for refs / listeners / timers / object URLs / subscriptions:
- `PhotoCropper` — covered (handled by the fix commit).
- `BulletListEditor` — uses `newRowRef` and `justAddedRef`. Refs are React-managed; no subscriptions. **Clean.**
- All form primitives — pure functional components, no effects, no refs. **Clean.**
- `PaletteSelector`/`TemplateCard` — pure functional, no effects. **Clean.**
- `ColorPicker`/`Select`/`DateRangeInput` — pure, no effects. **Clean.**

No additional leaks anywhere.

### "`exactOptionalPropertyTypes` and `disabled?: boolean` propagation"
Verified by a clean `tsc -p tsconfig.json --noEmit --strict --exactOptionalPropertyTypes --noUncheckedIndexedAccess`.
The native HTML elements (`<input>`, `<select>`, `<textarea>`, `<button>`) accept `disabled: boolean | undefined` because their JSX intrinsic types declare `disabled?: boolean` *without* `exactOptionalPropertyTypes` issues — TS treats the omission case the same as `undefined` because it's a builtin. No landmines.

The interesting case is `react-image-crop`'s `crop` prop — this is correctly handled with the conditional spread on `PhotoCropper.tsx:188,191`. Without that, passing `crop={undefined}` would error under strict opts.

---

## 5. Verification Run Log

```
pnpm --filter @codevena/forq-ui build          → green (tsc emits dist/)
tsc -p tsconfig.json --noEmit                  → green (zero errors)
tsc --noEmit --strict --exactOptional          → green (zero errors)
   --noUncheckedIndexedAccess
pnpm exec biome check packages/ui              → 27 files, no fixes applied
pnpm exec vitest run                           → 37/37 passed in 1.22s
pnpm next build (apps/web)                     → green, /dev-ui static route built
git log 8f5e702..HEAD | grep "Co-Authored-By" → no matches (compliant with global rule)
grep ":\s*any\b" packages/ui/src              → no matches
```

---

## 6. Final Verdict

**Findings listed.**

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Important | 2 (I-1 BulletListEditor a11y, I-2 doc drift on HEIC) |
| Minor | 7 (M-1 through M-7) |

**Recommendation:** Fix I-1 (it's a 1-line `aria-label`) and I-2 (two short doc edits). Accept the seven Minors as MVP debt and track them in the Phase 8 prompt or a backlog file. Then Phase 7 is genuinely done.

If the user wants strict zero-findings before declaring Phase 7 complete, all 9 issues are individually small (each well under 30 minutes of work). M-2 (effect deps), M-3 (redundant revoke) and M-1 (extract `deriveId`) take 5-10 minutes combined. M-4 (radiogroup keyboard nav) is the largest at maybe an hour for both components. The rest are one-liners or doc edits.
