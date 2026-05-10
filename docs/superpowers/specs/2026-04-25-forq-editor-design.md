# forq Editor (Phase 8) — Design Spec

**Status:** Draft · **Created:** 2026-04-25 · **Owner:** Alex Schmidt
**Supersedes (partially):** §6.1 of `2026-04-24-cvmake-design.md` (Web Editor Flow)
**Depends on:** Phase 7 (`@codevena/forq-ui`), `@codevena/forq-core`, `@codevena/forq-templates`, `@codevena/forq-schema`

## 1. Summary

Phase 8 builds the **interactive editor** in `apps/web` on top of the Phase-7 UI primitives. The editor is a single-page Next.js 16 app: load a CV from `data/cvs/*.yaml`, edit it via react-hook-form sections, watch a CSS-isolated **iframe live-preview** rerender as you type, autosave every 2 s, and export an A4 PDF on demand. Photo uploads route through a server-side `processPhoto()` (sharp) extended with an explicit crop region.

The design preserves the core architecture from `2026-04-24-cvmake-design.md` §6.1 and refines five contested points through brainstorming on 2026-04-25. The editor is a **single user, single device** tool — no auth, no collab — and the YAML on disk is the source of truth.

## 2. Goals & Non-Goals

### Goals
- End-to-end editable CV: load YAML → edit all sections → save back → export PDF.
- Live preview that mirrors the print template pixel-faithfully (same renderer as PDF).
- Per-CV photo upload with crop region → sharp → optimized webp + jpg.
- Conflict-safe save against extra-process YAML edits (e.g. `git pull`, manual VS Code edit).
- All 8 templates renderable inside the live preview without CSS bleed.

### Non-Goals (Phase 8)
- No drag-and-drop reorder (arrow buttons suffice).
- No collaboration / real-time / multi-user.
- No theme builder (palettes are template-curated).
- No HEIC server-side conversion (Phase-7 polish backlog).
- No Markdown in summary/bullets (plain text).
- No template-CSS HMR contract — Next handles dev rebuilds via standard route reloads.

## 3. Brainstorming Decisions (2026-04-25)

| # | Theme | Decision | Reason |
|---|-------|----------|--------|
| 1 | Live-preview impl | **`<iframe>` + `ReactDOM.createPortal`** | CSS isolation for template fonts/styles; `srcDoc` would flicker on every keystroke; Shadow DOM does not honor `@page` rules consumed by templates. |
| 2 | API surface | **REST routes + RSC initial load** | Multipart upload and binary PDF stream require classic routes; consistency beats 30 LOC saved by Server Actions; first load is a Server Component reading `loadCV()` directly (no fetch round-trip). |
| 3 | Conflict handling | **Optimistic save + 409 + simple modal** (Reload / Overwrite / Cancel) | Single-user, but YAML-first project must not silently overwrite extra-process edits. Three-button modal, no three-way merge. |
| 4 | Form-state architecture | **One `useForm<CVData>` for the whole page**, including `rendering.*` settings | Settings persist into the same YAML — separating their state would only create a second save path. `useFieldArray` for repeaters. |
| 5a | Accent on template switch | **Keep override + add Reset button** in `ColorPicker` | Respects user intent; Reset is one click away. |
| 5b | Palette on template switch | **Reset to `template.palettes[0]`** if current palette ID is unknown to the new template | Renderer fallback already does this; UI mirrors it explicitly so the picker never shows an invalid value. Per-template palette memory is YAGNI. |
| 5c | Settings autosave | **Same 2 s debounce** as content edits | Consistency over micro-optimization. |

## 4. Architecture

### 4.1 Page & Component Layout

```
Top Bar          [forq · CV-dropdown · save-indicator · export-PDF]
┌──────────┬─────────────────────────────┬───────────────────────────┐
│ Sidebar  │ Form panel (scroll)         │ Preview panel (sticky)    │
│ (320px)  │  Personal                   │  ┌─────────────────────┐  │
│          │  Summary                    │  │  iframe (A4 ratio)  │  │
│ Template │  Experience [+]             │  │  + ReactDOM portal  │  │
│ Palette  │  Education [+]              │  └─────────────────────┘  │
│ Accent   │  Skills                     │                           │
│ Hidden   │  Languages [+]              │                           │
│   secs   │  Custom Sections [+]        │                           │
└──────────┴─────────────────────────────┴───────────────────────────┘
```

### 4.2 Component Tree

```
app/page.tsx                                          [Server Component]
app/cv/[slug]/page.tsx                                [Server Component]
  └─ <EditorShell initialData initialMtime slug allSlugs bootstrap />
      ├─ <TopBar />                  CV-dropdown, save-indicator, export
      ├─ <Sidebar />                 template/palette/accent/hidden-toggles
      ├─ <FormPanel />               wraps RHF context
      │   ├─ <PersonalSection />     contacts + photo
      │   ├─ <SummarySection />
      │   ├─ <ExperienceSection />   useFieldArray (with bullets + tags)
      │   ├─ <EducationSection />    useFieldArray (with bullets)
      │   ├─ <SkillsSection />       stack | categorized tabs
      │   ├─ <LanguagesSection />    useFieldArray
      │   └─ <CustomSectionsSection /> nested useFieldArray
      ├─ <PreviewFrame />            iframe + portal bridge
      └─ <ConflictModal />           mounted only when conflictState != null
```

### 4.3 Data Sources

- **`@codevena/forq-schema`** — `CVDataSchema` (Zod), `Locale`, `TemplateDefinition`, `ColorPalette`, `LabelDictionary`.
- **`@codevena/forq-core`** — `loadCV` (RSC), `renderCV`, `generatePDF`, `processPhoto` (server only — extended in §7), `getLabels`.
- **`@codevena/forq-templates`** — registry, `bootstrap.ts` (registers all 8), per-template `.css` getters, `shared/{reset,print}.css`.
- **`@codevena/forq-ui`** — Phase-7 primitives + editors (`Input`, `Textarea`, `Select`, `DateRangeInput`, `BulletListEditor`, `PhotoCropper`, `ColorPicker`, `PaletteSelector`, `TemplateCard`).

## 5. Routing & Data Flow

### 5.1 Routes

| Path | Type | Purpose |
|---|---|---|
| `/` | RSC | Default editor — opens first CV in `data/cvs/*.yaml` (lex-sorted, fallback `cv.de`). |
| `/cv/[slug]` | RSC | Same shell, deep-linkable. |
| `/dev-ui` | RSC (Phase 7) | Component playground — unchanged. |
| `/api/cv` | route handler | `GET` — list slugs + display names. |
| `/api/cv/[slug]` | route handler | `GET` — `{ data, mtime, slug }`. |
| `/api/save` | route handler | `POST` — atomic write with mtime guard. |
| `/api/upload` | route handler | `POST` (multipart) — photo + crop → sharp. |
| `/api/export` | route handler | `POST` (json) — render + Puppeteer → PDF stream. |

### 5.2 Boot Sequence

```
RSC (page.tsx)
  ├─ readdir data/cvs/*.yaml                     →  allSlugs[]
  ├─ loadCV(data/cvs/${defaultSlug}.yaml)        →  initialData : CVData
  ├─ fs.stat(...).mtimeMs                        →  initialMtime
  ├─ getPreviewBootstrap()                       →  { resetCss, printCss, templates: { id → { css, meta } } }
  └─ <EditorShell  initialData  initialMtime  slug  allSlugs  bootstrap />
       ↓ (hydrates client-side)
       useForm({ defaultValues: initialData })
       useWatch() → debounced 150 ms → <PreviewFrame />
       useAutosave (debounced 2 s + Ctrl+S) → POST /api/save
```

### 5.3 API Contracts

**`GET /api/cv` → 200**
```json
{ "items": [{ "slug": "cv.de", "locale": "de", "displayName": "Alex Schmidt (de)" }] }
```
On per-file load failure: `displayName` falls back to `slug`. List never fails as a whole; broken files are still listed.

**`GET /api/cv/[slug]` → 200**
```json
{ "data": { /* CVData */ }, "mtime": 1735000000000, "slug": "cv.de" }
```
- Slug regex: `/^(?!\.+$)[a-z0-9.-]+$/` (allows internal dots like `cv.de` but rejects bare `.` / `..`). Path traversal additionally blocked by `path.resolve` + `startsWith(dataDir)` as authoritative defense.
- 422 with `{ kind: 'yaml'|'validation', issues|message, line?, column? }` when load fails.
- 404 if slug not in dir.

**`POST /api/save` → 200 | 409 | 422**
Request:
```json
{ "slug": "cv.de", "data": { /* CVData */ }, "expectedMtime": 1735000000000 }
```
Response 200:
```json
{ "ok": true, "mtime": 1735000123456 }
```
Response 409 (mtime mismatch):
```json
{ "kind": "conflict", "currentData": { /* CVData */ }, "currentMtime": 1735000456789 }
```
Response 422 (Zod fail):
```json
{ "kind": "validation", "issues": [{ "path": ["personal","email"], "message": "Invalid email" }] }
```
- Atomic write: `fs.writeFile('${slug}.yaml.tmp', dump)` → `fs.rename(tmp, target)` (POSIX `rename(2)` is atomic and overwrites in place — no intermediate `rm(target)` step needed).
- Server stamps `data.meta.updatedAt = new Date().toISOString().slice(0,10)` before dump.

**`POST /api/upload` → 200 | 400 | 413**
multipart fields: `file` (Blob, ≤10 MB), `slug` (string), `crop` (JSON `{x,y,width,height}` in original-image px), `aspect` (`'1:1'|'3:4'|'free'`).
Server:
1. Validates slug + multipart shape.
2. Writes blob to `data/cvs/photos/.upload-${slug}-${ts}.${ext}`.
3. Calls `processPhoto({ inputPath, outputDir: 'public/photos', slug, crop: {left,top,width,height} })`.
4. Removes temp file (always, also on error).
5. Returns `{ webp: '/photos/${slug}.webp', jpg: '/photos/${slug}.jpg', width, height }`.

**`POST /api/export` → 200**
Request:
```json
{ "data": { /* CVData (live, possibly unsaved) */ }, "templateId": "classic-serif", "paletteId": "classic-grey" }
```
Response: `application/pdf` stream with `Content-Disposition: attachment; filename="${slug}-${templateId}.pdf"`.

### 5.4 Edit / Save Cycle

```
Form change   ─►  RHF state                                        (instant)
              ─►  useWatch() output                                (instant)
              ─►  debounced 150 ms                                 ─► <PreviewFrame> portal re-render
              ─►  debounced 2000 ms (autosave)                     ─► POST /api/save
                       ├─ 200  → expectedMtime = res.mtime; toast
                       ├─ 409  → open <ConflictModal />
                       ├─ 422  → setError() per Zod issue
                       └─ network/5xx → error badge + manual retry
Ctrl+S        ─►  immediate save (bypasses 2 s debounce)
```

`AbortController` cancels any in-flight save when a newer one starts. The save loop pauses while the conflict modal is open; user must pick an action to resume.

## 6. Live-Preview Bridge

### 6.1 iframe Lifecycle

The preview is one `<iframe>` element, owned by `<PreviewFrame>`, never reloaded once mounted (template switch rewrites its document but keeps the element).

```
<iframe ref title="CV Preview" sandbox="allow-same-origin" />
       │
       │ first effect (mount or templateId change)
       ▼
writeInitialDoc(iframe, { templateId, paletteVars, bootstrap })
       │
       ▼  iframe.contentDocument now contains:
       │   <html>
       │     <head>
       │       <style id="reset-css">    …shared/reset.css… </style>
       │       <style id="template-css"> …classic-serif/styles.css… </style>
       │       <style id="print-css">    …shared/print.css… </style>
       │       <style id="palette-vars"> :root{--accent:…;…} </style>
       │     </head>
       │     <body><div id="cv-root"></div></body>
       │   </html>
       │
       ▼  setIframeRoot(iframe.contentDocument.getElementById('cv-root'))
       │
       ▼  ReactDOM.createPortal(<TemplateComp data={debounced} … />, iframeRoot)
```

### 6.2 Update Rules

| Change | Action | Cost |
|---|---|---|
| Form field (data.*) | React reconciles inside portal | one render, zero reflow outside changed nodes |
| Palette change | Patch `<style id="palette-vars">.textContent` only | CSS-vars cascade natively |
| Accent override change | Same as palette change | CSS-vars cascade natively |
| Template change | Full `writeInitialDoc()` + portal remounts with new component | ~50 ms, no network |

### 6.3 Bootstrap Provider

`apps/web/lib/preview-bootstrap.ts` (server-only):
```ts
export function getPreviewBootstrap(): PreviewBootstrap {
  return {
    resetCss: readFileSync('.../shared/reset.css', 'utf8'),
    printCss: readFileSync('.../shared/print.css', 'utf8'),
    templates: Object.fromEntries(
      listTemplates().map(t => [t.meta.id, { css: (t as any).css, meta: t.meta }])
    ),
  };
}
```
RSC calls it once per request and passes the result to `<EditorShell>` as a serialized prop. Total payload: ~30–50 KB gzipped.

### 6.4 Sandbox & Same-Origin

- `sandbox="allow-same-origin"` — no `allow-scripts`, no input handlers in iframe.
- Same-origin in dev and prod (Next serves both), so `iframe.contentDocument` is always reachable.
- React StrictMode double-invokes effects in dev — `writeInitialDoc` is idempotent and gated on a ref flag to prevent double mount.

## 7. processPhoto Crop Extension (`packages/core/src/photo.ts`)

Add an optional `crop` field that runs **after EXIF-rotate, before resize**:

```ts
export interface ProcessPhotoOptions {
  inputPath: string;
  outputDir: string;
  slug: string;
  maxBytes?: number;
  targetSize?: number;
  crop?: { left: number; top: number; width: number; height: number }; // pixels in the rotated image
}

export async function processPhoto(opts: ProcessPhotoOptions): Promise<ProcessedPhoto> {
  // … existing slug + size validation …
  let pipeline = sharp(buffer).rotate();
  if (opts.crop) {
    pipeline = pipeline.extract({
      left:   Math.round(opts.crop.left),
      top:    Math.round(opts.crop.top),
      width:  Math.round(opts.crop.width),
      height: Math.round(opts.crop.height),
    });
  }
  pipeline = pipeline.resize({
    width: targetSize, height: targetSize, fit: 'cover', position: 'attention',
  });
  // … existing webp + jpg writes …
}
```

**Coordinate convention:** `crop` is in pixels of the **EXIF-rotated** image (i.e. visually-correct orientation), matching what Phase-7 `<PhotoCropper>` produces.

**New tests** (in `packages/core/src/photo.test.ts`):
1. With `crop`, output bytes differ from no-crop call on same input.
2. Out-of-bounds `crop` (`width > image.width`) → `processPhoto` rejects, error surfaces to `/api/upload` as 400.

## 8. Form State

### 8.1 RHF Wiring

```ts
const form = useForm<CVData>({
  defaultValues: initialData,
  resolver: zodResolver(CVDataSchema),
  mode: 'onChange',
  shouldUnregister: false,
});
```

- One form, all fields, including `rendering.{template,palette,accentOverride,hiddenSections,sectionOrder}`.
- `useFieldArray` for: `experience`, `education`, `languages`, `customSections`, plus per-entry: `experience.${i}.bullets`, `experience.${i}.tags`, `education.${i}.bullets`, `customSections.${i}.items`, `customSections.${i}.items.${j}.bullets`.
- `<Controller>` wraps Phase-7 primitives that don’t use the native `ref` API (color picker, palette selector, template card group).

### 8.2 Section Specs

| Section | Fields | Repeater | Notes |
|---|---|---|---|
| Personal | firstName, lastName, title, photo, birthDate, maritalStatus, drivingLicense, contacts.{email,phone,website,github,linkedin,location} | — | Photo via `<PhotoUploadField>` (§9). |
| Summary | summary (Textarea, 5 rows) | — | Plain text only (no Markdown). |
| Experience | title, company, location, startDate, endDate (DateRangeInput), bullets (BulletListEditor), tags (TagInput) | useFieldArray on `experience` | Reorder via ↑↓ buttons. |
| Education | degree, institution, location, dates, bullets (optional) | useFieldArray on `education` | Same reorder pattern. |
| Skills | tabs: `stack` (TagInput) \| `categorized` (record<string, string[]>) | manual array → record sync | Both shapes coexist in `CVData.skills` (both optional); switching tabs only changes which is shown/edited. We do **not** drop the inactive shape — users may have data in both, templates pick what they render (most templates prefer `categorized` if non-empty). |
| Languages | name, level (Select 8 levels), label | useFieldArray on `languages` | |
| Custom Sections | id, title, items[] | nested: outer + per-section items | Inner item: title, subtitle, date, description, bullets. |

### 8.3 Sidebar Specs

- `<TemplatePicker />` — `<TemplateCard>` grid driven by `bootstrap.templates`. Roving-tabindex (Phase-7 follow-up). `Controller` for `rendering.template`.
- `<PalettePicker />` — `<PaletteSelector>` for current template’s palettes. Roving-tabindex. `Controller` for `rendering.palette`.
- `<AccentOverrideField />` — Phase-7 `<ColorPicker>` + Reset button (clears `rendering.accentOverride`). Resets on click only — never automatically.
- `<HiddenSectionsToggles />` — switches for `summary`, `experience`, `education`, `skills`, `languages`. Toggled IDs collected into `rendering.hiddenSections: string[]`. Custom sections aren’t in this list (managed in their own section).

### 8.4 Template-Switch Effect

```ts
useEffect(() => {
  const next = watch('rendering.template');
  if (next === prevTemplateRef.current) return;
  const tpl = bootstrap.templates[next];
  const currentPalette = form.getValues('rendering.palette');
  if (!tpl.meta.palettes?.some(p => p.id === currentPalette)) {
    form.setValue('rendering.palette', tpl.meta.palettes[0]?.id, { shouldDirty: true });
  }
  // accentOverride: untouched (decision 5a)
  prevTemplateRef.current = next;
}, [watch('rendering.template')]);
```

## 9. Photo Upload Flow

`<PhotoUploadField name="personal.photo" slug={slug} aspect="1:1" />`

1. Empty state: drop zone + “Choose file” button.
2. Filled state: `<img src={photo}>` + “Replace” button.
3. On select: open Phase-7 `<PhotoCropper>` with chosen aspect.
4. `onConfirm({ file, crop, aspect })`:
   - Build `FormData` with `file`, `slug`, `crop` (JSON), `aspect`.
   - `POST /api/upload` with progress UI.
   - On 200: `form.setValue('personal.photo', '/photos/${slug}.jpg', { shouldDirty: true })` — the next 2 s autosave persists the new path.
   - On 4xx/5xx: toast error with message; form state unchanged.

Photo files are slug-based (`${slug}.jpg`/`${slug}.webp`) and overwrite previous ones for the same CV — no garbage accumulation.

## 10. Save Indicator & Conflict Modal

### 10.1 `<SaveIndicator />`

```
clean    →  ✓ Gespeichert vor 2 Min.
dirty    →  • Ungespeicherte Änderungen (auto-save in 2 s)
saving   →  ⟳ Speichere…
saved    →  ✓ Gespeichert (3 s toast, then back to clean)
error    →  ⚠ Fehler · [Erneut versuchen]
```

State derived from `formState.isDirty`, in-flight ref, last-save timestamp, last-error ref.

### 10.2 `<ConflictModal />`

Triggered when `/api/save` returns 409. Modal contents:

> **Datei wurde extern verändert.** Die YAML-Datei `data/cvs/<slug>.yaml` wurde seit dem Laden geändert (z. B. via `git pull` oder einem anderen Editor). Was möchtest du tun?
>
> [Datenträger neu laden]   [Meine Version überschreiben]   [Abbrechen]

- **Datenträger neu laden:** if `formState.isDirty`, second-step confirm; then `form.reset(currentData)`, set `expectedMtimeRef = currentMtime`, clear conflict state.
- **Meine Version überschreiben:** call `/api/save` again with `expectedMtime: currentMtime` — this matches and writes.
- **Abbrechen:** close modal; autosave stays paused until user picks Reload or Overwrite (otherwise we’d 409-loop).

## 11. Export Flow

```
Export-PDF button (disabled when !formState.isValid):
  data = form.getValues()
  POST /api/export with { data, templateId: data.rendering.template, paletteId: data.rendering.palette }
  → server: getTemplate(templateId) → renderCV() → generatePDF() → A4 PDF buffer
  → response: stream with Content-Disposition: attachment; filename="${slug}-${templateId}.pdf"
  → client: blob → object URL → anchor.click()
```

The `data` field carries unsaved edits; the export reflects the editor’s current state, not necessarily what is on disk.

## 12. Error Handling

| Source | Surface | Recovery |
|---|---|---|
| YAML parse error on load | Error banner with line/col | “Open file” hint; export disabled. |
| Zod issue on load | Error banner with first 5 issues | Same — fix in YAML, reload. |
| Zod issue on save (422) | `setError()` per issue + inline message in section | Local fix; autosave retries on next change. |
| 409 conflict | `<ConflictModal />` | User-driven Reload / Overwrite / Cancel. |
| 5xx / network | Error badge + Retry button | Manual retry; no auto-retry. |
| Photo too large / invalid | Toast | User retries with smaller file. |
| Sharp / extract error | Toast | User picks new crop. |
| Puppeteer crash | Toast with “Try again” | One server-side retry inside `/api/export`; second failure → 500. |
| Template not found | Banner + fallback to `classic-serif` | Same behavior as renderer fallback (silent in renderer; we surface it in the editor). |

## 13. Testing Strategy

### 13.1 Unit (Vitest)

- `packages/core/src/photo.test.ts` (extended) — `crop` applied; out-of-bounds rejects; EXIF-rotate before extract.
- `apps/web/lib/preview-bootstrap.test.ts` — all 8 templates loaded, CSS string non-empty, shared CSS strings present.
- `apps/web/components/sections/*.test.tsx` — `useFieldArray` add / remove / reorder behavior; controlled-input event flow against the Phase-7 primitives.
- `apps/web/lib/zod-issue-mapping.test.ts` — Zod `path[]` to RHF `Path<CVData>` mapping for nested arrays.
- `apps/web/lib/atomic-write.test.ts` — write to tmp + rename; tmp cleanup on failure.

### 13.2 Integration (Vitest, Next route handler invocation)

- `app/api/cv/route.test.ts` — listing; broken file in dir does not break list.
- `app/api/cv/[slug]/route.test.ts` — 200 / 404 / 422 / path-traversal blocked.
- `app/api/save/route.test.ts` — 200 path; 409 path; 422 path; atomic write; slug validation.
- `app/api/upload/route.test.ts` — multipart parsing; sharp error path; temp cleanup on success and on failure.
- `app/api/export/route.test.ts` — content-type, content-disposition; non-empty buffer (PDF parsing happens in CLI tests).

### 13.3 E2E (Playwright `apps/web/e2e/`)

Five specs:

1. `load-edit-save.spec.ts` — boot `/`, change a field, verify saved-toast, verify YAML on disk reflects the change.
2. `template-switch.spec.ts` — click second template, verify `<style id="template-css">` content changed inside iframe, verify palette resets to that template’s first palette.
3. `photo-upload.spec.ts` — upload fixture image, crop + confirm, verify `/photos/${slug}.{jpg,webp}` exist, iframe `<img>` carries new `src`.
4. `pdf-export.spec.ts` — click export, intercept download, assert size > 10 KB and content-type `application/pdf`.
5. `broken-yaml.spec.ts` — pre-write malformed YAML, navigate to `/cv/<slug>`, assert error banner + disabled export button.

Fixtures live in `apps/web/e2e/fixtures/`; per-test setup copies them into `data/cvs/` and tears down after.

## 14. Acceptance Criteria

1. `pnpm --filter @codevena/forq-web build` green.
2. `pnpm --filter @codevena/forq-web test:e2e` green (5 specs above).
3. `pnpm --filter @codevena/forq-web test:unit` green (sections + libs + route handlers).
4. `pnpm --filter @codevena/forq-core test:unit` green (with extended `processPhoto` crop tests).
5. `pnpm typecheck && pnpm lint` workspace-wide: no **new** findings beyond Phase-7 baseline (143 in `apps/cli` / `packages/core` / `packages/templates`).
6. All 8 templates render correctly inside the iframe preview (manual walk-through in dev server; not in Playwright visual regression).
7. PDF export delivers a valid A4 PDF reflecting unsaved-editor state.
8. `cv.de.yaml` and `cv.en.yaml` are end-to-end editable from boot through save.
9. Definition-of-Done per `~/.claude/CLAUDE.md`: 4 review agents (2 × Codex, 2 × Claude) with zero findings; if Codex sandbox issues persist, fall back to manual `codex` CLI or `gemini` per NEXT_SESSION guidance.

## 15. Out-of-Scope (Phase 8)

- Drag-and-drop reorder for repeaters.
- Custom palette builder.
- Multi-user / collaboration / auto-merge.
- Inline Markdown.
- HEIC server-side conversion (Phase-7 polish).
- Phase-7 lint baseline cleanup (143 findings).
- BulletListEditor `<fieldset>` / `<legend>` group label (Phase-7 polish).
- `deriveFieldId` extraction may happen as polish near the end of Phase 8 if convenient; not blocking.

## 16. Files to Create / Modify

### Create
> Unit-test files (`*.test.ts(x)`) live next to their source per workspace convention and are implied by §13. They are not listed individually here.

- `apps/web/app/page.tsx` (rewrite)
- `apps/web/app/cv/[slug]/page.tsx`
- `apps/web/app/api/cv/route.ts`
- `apps/web/app/api/cv/[slug]/route.ts`
- `apps/web/app/api/save/route.ts`
- `apps/web/app/api/upload/route.ts`
- `apps/web/app/api/export/route.ts`
- `apps/web/components/EditorShell.tsx`
- `apps/web/components/TopBar.tsx`
- `apps/web/components/Sidebar.tsx`
- `apps/web/components/PreviewFrame.tsx`
- `apps/web/components/ConflictModal.tsx`
- `apps/web/components/SaveIndicator.tsx`
- `apps/web/components/PhotoUploadField.tsx`
- `apps/web/components/sections/PersonalSection.tsx`
- `apps/web/components/sections/SummarySection.tsx`
- `apps/web/components/sections/ExperienceSection.tsx`
- `apps/web/components/sections/EducationSection.tsx`
- `apps/web/components/sections/SkillsSection.tsx`
- `apps/web/components/sections/LanguagesSection.tsx`
- `apps/web/components/sections/CustomSectionsSection.tsx`
- `apps/web/lib/preview-bootstrap.ts`
- `apps/web/lib/use-debounced-value.ts`
- `apps/web/lib/use-hotkey.ts`
- `apps/web/lib/data-paths.ts`
- `apps/web/lib/atomic-write.ts`
- `apps/web/lib/zod-issue-mapping.ts`
- `apps/web/e2e/load-edit-save.spec.ts`
- `apps/web/e2e/template-switch.spec.ts`
- `apps/web/e2e/photo-upload.spec.ts`
- `apps/web/e2e/pdf-export.spec.ts`
- `apps/web/e2e/broken-yaml.spec.ts`
- `apps/web/e2e/fixtures/*` (test CV YAMLs, test image)

### Modify
- `packages/core/src/photo.ts` — add optional `crop` parameter.
- `packages/core/src/photo.test.ts` — add 2 crop test cases.
- `apps/web/package.json` — add `clsx` (className composition); no DnD lib.
- `apps/web/playwright.config.ts` — wire e2e fixtures dir, base URL.

### Optional polish (only if convenient)
- `packages/ui/src/internal/deriveFieldId.ts` — extract Phase-7 duplicated helper.

## 17. Open Questions (defer to plan-writing)

1. **Default `defaultSlug` selection on `/`** — pick lex-smallest, or pick `cv.de` if present, else lex-smallest? (Plan-time decision; trivial.)
2. **TagInput primitive** — Phase 7 has `BulletListEditor` but no dedicated tag input. Decision during plan: extend `BulletListEditor` for inline-tag style, or build a thin separate component.
3. **Hidden-sections persistence** — confirm `rendering.hiddenSections` is honored by every template (renderer-side); if not, add a renderer wrapper. Out-of-scope bug fix for templates is acceptable.
