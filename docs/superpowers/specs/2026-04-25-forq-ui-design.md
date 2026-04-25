# forq-ui — Design Spec (Phase 7)

**Status:** Approved · **Created:** 2026-04-25 · **Owner:** Alex Schmidt

## 1. Summary

`@codevena/forq-ui` is the shared React component library consumed by the forq web editor (Phase 8). It ships **headless, controlled, strict-typed** form primitives plus three domain-specific components (PhotoCropper, ColorPicker/PaletteSelector, TemplateCard). The library has zero state-management helpers, zero network logic, and zero hardcoded i18n strings — all of those belong in `apps/web`.

This spec covers Phase 7 only: building the components, their tests, and the Tailwind v4 setup needed to render them. The actual editor (form composition, RHF wiring, autosave, API routes) is Phase 8.

## 2. Goals & Non-Goals

### Goals

- Provide reusable React components for the editor: `Input`, `Textarea`, `Select`, `DateRangeInput`, `BulletListEditor`, `PhotoCropper`, `ColorPicker`, `PaletteSelector`, `TemplateCard`.
- Strict TypeScript types derived from `@codevena/forq-schema` where applicable.
- Vitest + Testing Library coverage with at least 3 tests per component.
- Tailwind v4 styling, configured to work both inside the library and in `apps/web`.
- Component API works equally well with React Hook Form (via `<Controller>`) and standalone.

### Non-Goals (Phase 7)

- No editor implementation, no form composition, no API routes — that is Phase 8.
- No drag-and-drop reordering — `BulletListEditor` ships with `↑/↓` buttons only.
- No Storybook, no Chromatic, no visual-regression testing for UI components.
- No i18n inside the library — all labels are passed in by the consumer as props.
- No state-management hooks (`useDebouncedSave`, `useCVForm`) — Editor builds those in Phase 8.
- No `crop`-parameter extension to `processPhoto()` in `@codevena/forq-core` — out of scope; the cropper only defines the output shape, the backend integration is Phase 8.
- No `clsx` / `tailwind-merge` / `cva` dependencies — simple string-join for `className` extension.

## 3. Decisions Made During Brainstorming

| # | Theme | Choice | Rationale |
|---|---|---|---|
| 1 | Styling stack | **Tailwind v4** in both workspaces, components ship classes | Already installed in `apps/web`; CSS-first config (`@theme`) fits library pattern; avoids a second build system. shadcn/ui rejected because it is "copy into app", not "use as library". |
| 2 | Component API | **Pure controlled** (`value`/`onChange`), RHF integration via `<Controller>` | Consistent across all components, no RHF dependency in the library, easy to test. |
| 3 | Library scope | **Components only**, no hooks/stores | RHF in `apps/web` holds editor state. Hooks can be extracted later if a second consumer appears (YAGNI). |
| 4 | Photo pipeline | Cropper is **UI-only**, returns `{file, crop, aspect}`; server crops via sharp using pixel-coordinates of the original | Server has full control, no resolution loss from canvas re-encode, original stays available for re-cropping. |
| 5 | Photo upload | Cropper does **not** own the `fetch('/api/upload')` call — editor does | Keeps component free of network state, easy to test, editor controls loading/error UX. |
| 6 | Bullet reorder | `↑/↓` buttons (no drag-drop in MVP) | YAGNI; drag-drop is v2. |

## 4. Package Structure

```
packages/ui/
├── src/
│   ├── index.ts                      # Re-exports: components + types + UI_VERSION
│   ├── primitives/
│   │   ├── Input.tsx                 + Input.test.tsx
│   │   ├── Textarea.tsx              + Textarea.test.tsx
│   │   ├── Select.tsx                + Select.test.tsx
│   │   └── DateRangeInput.tsx        + DateRangeInput.test.tsx
│   ├── editors/
│   │   └── BulletListEditor.tsx      + BulletListEditor.test.tsx
│   ├── photo/
│   │   └── PhotoCropper.tsx          + PhotoCropper.test.tsx
│   ├── color/
│   │   ├── ColorPicker.tsx           + ColorPicker.test.tsx
│   │   └── PaletteSelector.tsx       + PaletteSelector.test.tsx
│   ├── template/
│   │   └── TemplateCard.tsx          + TemplateCard.test.tsx
│   ├── styles/
│   │   └── tailwind.css              # @import "tailwindcss" + @theme
│   └── test/
│       └── setup.ts                  # vitest + @testing-library/jest-dom + cleanup
├── package.json
├── tsconfig.json
└── vitest.config.ts                  # new
```

**Conventions:**
- Subfolder grouping by component family, not atomic-design depth.
- Co-located tests (`X.tsx` next to `X.test.tsx`) — Vitest default, easier to navigate.
- One public root: consumer imports everything from `@codevena/forq-ui`. No per-folder barrels.
- `styles/tailwind.css` is opt-in for consumers via subpath export.

## 5. Public API

### 5.1 Exports

```ts
// packages/ui/src/index.ts
export { Input } from './primitives/Input.js';
export type { InputProps } from './primitives/Input.js';

export { Textarea } from './primitives/Textarea.js';
export type { TextareaProps } from './primitives/Textarea.js';

export { Select } from './primitives/Select.js';
export type { SelectProps, SelectOption } from './primitives/Select.js';

export { DateRangeInput } from './primitives/DateRangeInput.js';
export type { DateRangeInputProps, DateRangeValue } from './primitives/DateRangeInput.js';

export { BulletListEditor } from './editors/BulletListEditor.js';
export type { BulletListEditorProps } from './editors/BulletListEditor.js';

export { PhotoCropper } from './photo/PhotoCropper.js';
export type { PhotoCropperProps, PhotoCropResult, PhotoAspect } from './photo/PhotoCropper.js';

export { ColorPicker } from './color/ColorPicker.js';
export type { ColorPickerProps } from './color/ColorPicker.js';

export { PaletteSelector } from './color/PaletteSelector.js';
export type { PaletteSelectorProps } from './color/PaletteSelector.js';

export { TemplateCard } from './template/TemplateCard.js';
export type { TemplateCardProps } from './template/TemplateCard.js';

export const UI_VERSION = '0.1.0';
```

### 5.2 Shared Prop Pattern

Every form primitive follows the same controlled-field pattern:

```ts
interface ControlledFieldProps<T> {
  id?: string;
  name?: string;
  label?: string;
  value: T;
  onChange: (next: T) => void;
  onBlur?: () => void;        // RHF Controller wires this for touched-state
  error?: string;             // inline error message; not a boolean
  disabled?: boolean;
  required?: boolean;
  className?: string;         // extension hook
}
```

### 5.3 Component-Specific Types

```ts
interface InputProps extends ControlledFieldProps<string> {
  type?: 'text' | 'email' | 'tel' | 'url';
  placeholder?: string;
  autoComplete?: string;
}

interface TextareaProps extends ControlledFieldProps<string> {
  placeholder?: string;
  rows?: number;
}

interface SelectOption { value: string; label: string; }
interface SelectProps extends ControlledFieldProps<string> {
  options: SelectOption[];
  placeholder?: string;
}

interface DateRangeValue {
  start: string;              // "YYYY-MM" e.g. "2024-03"
  end: string | null;         // null = "Current"
}
interface DateRangeInputProps extends Omit<ControlledFieldProps<DateRangeValue>, 'value' | 'onChange'> {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  startYear?: number;         // default: currentYear - 50
  endYear?: number;           // default: currentYear + 1
  currentLabel?: string;      // default: "Current"
}

interface BulletListEditorProps {
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  placeholder?: string;       // for new bullets
  addLabel?: string;          // default: "Add bullet"
  className?: string;
}

type PhotoAspect = '1:1' | '3:4' | 'free';
interface PhotoCropResult {
  file: File;                 // original blob
  crop: { x: number; y: number; width: number; height: number };  // pixels in original
  aspect: PhotoAspect;
}
interface PhotoCropperProps {
  initialFile?: File;
  defaultAspect?: PhotoAspect;
  allowedAspects?: PhotoAspect[];     // default ['1:1','3:4','free']
  onConfirm: (result: PhotoCropResult) => void;
  onCancel?: () => void;
  maxBytes?: number;                  // default 10 * 1024 * 1024
  className?: string;
}

interface ColorPickerProps extends ControlledFieldProps<string> {
  resetLabel?: string;        // default: "Reset"
}

interface PaletteSelectorProps {
  palettes: ColorPalette[];   // from @codevena/forq-schema
  value: string;              // palette.id
  onChange: (paletteId: string) => void;
  className?: string;
}

interface TemplateCardProps {
  templateId: string;
  name: string;
  description?: string;
  thumbnailSrc?: string;
  selected: boolean;
  onSelect: (templateId: string) => void;
  className?: string;
}
```

### 5.4 API Conventions

- **`error: string`** (not boolean) — component renders the message directly under the field. Editor passes `errors.x?.message` from RHF.
- **`onBlur` optional** — RHF needs it for touched tracking; standalone usage skips it.
- **`PhotoCropResult.crop` in original-pixel coordinates** — `react-image-crop` returns percentages; the cropper multiplies by `image.naturalWidth/Height` before calling `onConfirm`. This shape lets the server do `sharp.extract({left, top, width, height})` directly.
- **`DateRangeValue.end: string | null`** — explicit `null` means "Current". The editor maps that to `endDate: undefined` when serializing back to the schema.
- **No i18n inside components** — all user-facing strings (`"Add bullet"`, `"Current"`, `"Reset"`) are props with English defaults. Editor overrides per locale.

## 6. Tailwind v4 Setup

Tailwind v4 uses CSS-first configuration. The library does **not** run a CSS build step — components ship class strings, and the consumer's Tailwind build scans the library sources via `@source`.

### 6.1 Library CSS

`packages/ui/src/styles/tailwind.css`:

```css
@import "tailwindcss";

@theme {
  --color-surface: #ffffff;
  --color-surface-muted: #f8fafc;
  --color-border: #e2e8f0;
  --color-text: #0f172a;
  --color-text-muted: #64748b;
  --color-accent: #2563eb;
  --color-error: #dc2626;

  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;

  --shadow-card: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}
```

These tokens describe the **editor theme**, not template themes. Templates own their own CSS (`packages/templates/src/<id>/styles.css`) and render in an iframe-isolated preview, so there is no class collision.

### 6.2 Package Export

`packages/ui/package.json` adds a subpath export:

```json
"exports": {
  ".":               { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
  "./styles/tailwind.css": "./src/styles/tailwind.css"
}
```

### 6.3 Web App Wiring

`apps/web/app/globals.css`:

```css
@import "@codevena/forq-ui/styles/tailwind.css";
@source "../../packages/ui/src/**/*.{ts,tsx}";
@source "./**/*.{ts,tsx}";
```

`apps/web/postcss.config.mjs`:

```js
export default {
  plugins: { '@tailwindcss/postcss': {} },
};
```

`apps/web/app/layout.tsx` imports `./globals.css`.

### 6.4 Class-Name Conventions

- Tailwind utilities only — no component-specific CSS files.
- Theme tokens via Tailwind utilities (`bg-surface`, `text-text-muted`, `border-border`) — never hardcoded hex values.
- `className` prop merges by simple concatenation: `[base, custom].filter(Boolean).join(' ')`. No `clsx`/`tailwind-merge`.

## 7. Component Behavior

Detailed behavior per component. Each ships with at least 3 tests (renders / onChange / edge case).

### 7.1 Input / Textarea / Select
- **Layout:** `<label>` block above field; field below; optional error `<p>` below field.
- **States:** `focus:ring-2 focus:ring-accent`; `error` adds `border-error` and renders the message.
- **Disabled:** native `disabled` attribute + reduced opacity.

### 7.2 DateRangeInput
- **Render:** two pairs of `<select>` for start and end. Each pair = month select (`1`–`12`) + year select (years from `endYear` down to `startYear`, newest first). Plus a "Current" checkbox.
- **Current toggle:** when checked, `end` becomes `null` and the end selects are disabled.
- **Validation:** if `end !== null` and `end < start`, show `error="End must be after start"` (default English; consumer overrides via the standard `error` prop when its own validation fires).
- **Output:** `{start: "YYYY-MM", end: "YYYY-MM" | null}`.

### 7.3 BulletListEditor
- **Render:** vertical list, each row = `<input>` + `↑`/`↓`/delete buttons. "Add bullet" button at the bottom.
- **Auto-focus:** newly added bullet receives focus.
- **Empty state:** only the "Add bullet" button.
- **Edge cases:** ↑ on first item disabled; ↓ on last item disabled; delete on a list with one item leaves an empty list (no special handling).

### 7.4 PhotoCropper
- **Two render states:**
  1. **No file** — drag-drop zone with `<input type="file" accept="image/jpeg,image/png,image/webp,image/heic">`.
  2. **File selected** — `<ReactCrop>` from `react-image-crop` with current aspect; aspect-toggle buttons above; "Cancel" + "Confirm" buttons below.
- **Client validation:** file size `> maxBytes` or MIME not in whitelist → inline error inside the drop-zone, the file is **not** loaded into the cropper UI, and `onConfirm` is not called.
- **MIME whitelist:** `image/jpeg`, `image/png`, `image/webp`, `image/heic`.
- **Output conversion:** react-image-crop returns percent-based crop; the component multiplies by `image.naturalWidth / image.naturalHeight` before calling `onConfirm`.

### 7.5 ColorPicker
- **Render:** native `<input type="color">` next to a hex `<input type="text">`, both bound to the same value. "Reset" button calls `onChange('')`.
- **Validation:** hex regex `/^#[0-9a-f]{6}$/i` on text input; invalid hex sets the `error`.
- **Empty value:** valid state — means "no override; use palette accent".

### 7.6 PaletteSelector
- **Render:** grid (`grid-cols-3 md:grid-cols-5 gap-2`) of swatch buttons. Each swatch = three color stripes (accent / background / text), name underneath, `ring-2 ring-accent` when selected.
- **Output:** `onChange(palette.id)`.

### 7.7 TemplateCard
- **Render:** card containing thumbnail (`<img>` with `thumbnailSrc`, or a placeholder div if absent), name, optional description; `ring-2 ring-accent` when selected.
- **Output:** `onSelect(templateId)`.

## 8. Testing Strategy

### 8.1 Stack
- Vitest 2.1.5 (already installed)
- @testing-library/react 16.0.1 (already installed)
- happy-dom 15.11.6 (already installed)
- **New devDeps:** `@testing-library/jest-dom@^6`, `@testing-library/user-event@^14`

### 8.2 Configuration

`packages/ui/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    include: ['src/**/*.test.ts?(x)'],
  },
});
```

`packages/ui/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());
```

### 8.3 Test Conventions

Each component has at least three tests:
1. **Renders** with minimal valid props without throwing.
2. **Controlled behavior** — `onChange` fires with the expected next value.
3. **Edge case** — component-specific (error rendering, current toggle, reorder behavior, hex validation, etc.).

We do **not** test:
- Tailwind class lists (brittle).
- `react-image-crop` internals (we test our wrapper).
- Visual output (no Storybook / no visual regression for UI in MVP).

## 9. Demo Page (apps/web/app/_dev-ui/)

A lightweight sanity-check page lives at `apps/web/app/_dev-ui/page.tsx`. It is **not** linked from production routes; it exists for local visual verification of each component.

```tsx
'use client';
import { useState } from 'react';
import { Input, BulletListEditor, PaletteSelector, /* ... */ } from '@codevena/forq-ui';

export default function DevUI() {
  const [name, setName] = useState('');
  const [bullets, setBullets] = useState<string[]>([]);
  return (
    <main className="p-8 space-y-12">
      <section><h2>Input</h2><Input label="Name" value={name} onChange={setName} /></section>
      <section><h2>BulletListEditor</h2><BulletListEditor value={bullets} onChange={setBullets} /></section>
      {/* ... */}
    </main>
  );
}
```

Activating Tailwind in `apps/web` (globals.css + postcss.config + layout import) is part of Phase 7 because the demo page needs styles to render meaningfully.

## 10. Implementation Sequence

1. Activate Tailwind v4 in `apps/web` (`globals.css`, `postcss.config.mjs`, layout import).
2. Bootstrap `packages/ui` test infrastructure (`vitest.config.ts`, `src/test/setup.ts`, devDep additions).
3. Create `packages/ui/src/styles/tailwind.css` with `@theme` tokens; add subpath export to `package.json`.
4. Build form primitives in TDD order: `Input` → `Textarea` → `Select` → `DateRangeInput`.
5. Build `BulletListEditor` in TDD.
6. Build `ColorPicker` → `PaletteSelector` → `TemplateCard` in TDD.
7. Build `PhotoCropper` in TDD (most complex — last).
8. Wire all exports in `packages/ui/src/index.ts`.
9. Add demo page at `apps/web/app/_dev-ui/page.tsx` for manual visual check.
10. Run full Definition-of-Done: `pnpm lint && pnpm typecheck && pnpm build`, then four review agents.

## 11. Acceptance Criteria

- `pnpm --filter @codevena/forq-ui build` is green.
- `pnpm --filter @codevena/forq-ui test:unit` is green with at least 3 tests per component (≥ 27 tests total across 9 components).
- All listed components are exported from `packages/ui/src/index.ts`.
- TypeScript types match `@codevena/forq-schema` where applicable (verified by `tsc --noEmit`).
- `apps/web` builds with Tailwind active; demo page at `/_dev-ui` renders all components without runtime errors.
- All four review agents (2× Codex, 2× Claude) report zero findings (per global Definition-of-Done in `~/.claude/CLAUDE.md`).

## 12. Out of Scope / Future Work

- Drag-and-drop reordering in `BulletListEditor` (v2).
- Storybook / Chromatic / visual regression for UI components.
- Internationalization inside components (consumer passes labels as props).
- Form-layout components (`FormSection`, `FormGrid`) — added in Phase 8 if needed.
- Editor state-management hooks (`useDebouncedSave`, `useCVForm`) — Phase 8.
- `processPhoto()` `crop` parameter extension in `@codevena/forq-core` — Phase 8.
- Editor implementation, API routes, autosave wiring — Phase 8.

## 13. References

- Original architecture spec: [`2026-04-24-cvmake-design.md`](./2026-04-24-cvmake-design.md) (project renamed to forq, but architecture stands).
- Naming decision: [`2026-04-25-naming-decision.md`](./2026-04-25-naming-decision.md).
- Implementation plan to follow via the `superpowers:writing-plans` skill.
