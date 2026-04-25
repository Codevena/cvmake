# Prompt für nächste Session — forq Phase 8 (Editor in `apps/web`)

Kopiere den Block unter `## Prompt` in eine neue Claude-Code-Session im Projektverzeichnis `/Users/markus/Developer/cvMake`.

---

## Prompt

Wir sind auf Branch `feat/cvmake-mvp`, Repo `Codevena/forq` (private GitHub). Phase 0–7 sind komplett und gepusht (`origin/feat/cvmake-mvp` ist auf demselben Stand). Heute startet **Phase 8 — der Editor in `apps/web`**.

**Vor dem Code: kurzes Brainstorming.** Phase 8 hat ein paar größere Architektur-Entscheidungen (Live-Preview-Implementierung, Autosave-Strategie, API-Routes-vs-Server-Actions). Bitte mit `superpowers:brainstorming` starten — sonst bauen wir blind. Spec danach nach `docs/superpowers/specs/2026-04-25-forq-editor-design.md`, dann `superpowers:writing-plans`, dann subagent-driven Execution.

### Aktueller Stand (Phase 7 Output)

```bash
git log --oneline main..feat/cvmake-mvp | head -8
```

- Letzter Commit: `50c2aab docs: phase 7 plan — completion summary + actual-vs-planned deltas`
- Davor: 22 Phase-7-Commits (`f575cf5..50c2aab`) — Spec, Plan, 9 Components, Bootstrap, Demo-Page, Doc-Sync
- **Phase 7 Acceptance:** 38 Vitest-Tests grün, `pnpm build` clean, `/dev-ui` als static Next.js-Route gelistet, Repo-Lint-Baseline preserved (143 pre-existing in apps/cli/core/templates).
- Spec: `docs/superpowers/specs/2026-04-25-forq-ui-design.md`
- Plan + Completion-Summary: `docs/superpowers/plans/2026-04-25-forq-ui.md`

### Was Phase 7 liefert (importierbar via `@codevena/forq-ui`)

```ts
import {
  // Form-Primitives (controlled, RHF-Controller-friendly)
  Input, Textarea, Select, DateRangeInput,
  type DateRangeValue,
  // Editor-Composite
  BulletListEditor,
  // Photo (UI-only, ruft onConfirm({file, crop, aspect}))
  PhotoCropper, type PhotoCropResult, type PhotoAspect,
  // Color
  ColorPicker, PaletteSelector,
  // Template-Auswahl
  TemplateCard,
} from '@codevena/forq-ui';
```

Dazu: Tailwind v4 mit `@theme`-Tokens (`packages/ui/src/styles/tailwind.css`), bereits in `apps/web/app/globals.css` aktiviert. Demo-Playground unter `/dev-ui` (NODE_ENV-gated → 404 in production).

### Phase-8 Scope (laut Original-Spec §6 + §7)

1. **Editor-Layout** — Sidebar (CV-Auswahl-Dropdown, Template-Picker mit `TemplateCard`, Palette-Picker mit `PaletteSelector`, Accent-Override mit `ColorPicker`), Hauptbereich split (Form links, Live-Preview rechts).
2. **Form-Composition mit RHF** — alle Sections (`personal`, `summary`, `experience[]`, `education[]`, `skills`, `languages[]`, `customSections[]`) gegen `CVDataSchema` aus `@codevena/forq-schema` via `zodResolver`. Repeater-Felder (Experience-Einträge, Custom-Sections) via `useFieldArray`.
3. **API-Routes:**
   - `GET /api/cv` — listet alle `data/cvs/*.yaml` Slugs (Filename ohne `.yaml`-Suffix).
   - `GET /api/cv/[slug]` — `loader.load()` + Zod-Validate, returns `CVData`.
   - `POST /api/save` — Zod-Validate, `yaml.dump`, atomisch nach `data/cvs/[slug].yaml`. Stale-Save-Detection via `meta.updatedAt`-Vergleich → 409 + Diff-Modal.
   - `POST /api/upload` — multipart Photo (Original) + Crop-Region (`{x,y,width,height}` in Original-Pixeln) → `processPhoto()` mit neuem `crop`-Param → `public/photos/[slug].{webp,jpg}`. Pfad zurück für `personal.photo`.
   - `POST /api/export` — `CVData` aus Body (nicht von Disk!) → `renderer.render()` → `pdf.generate()` → A4 PDF Stream mit `Content-Disposition: attachment`.
4. **Live-Preview-Iframe** — `<iframe>` + `ReactDOM.createPortal` in das iframe-document für totale CSS-Isolation (Template-Fonts kollidieren nicht mit Editor-Tailwind). Form-Changes → 150ms Debounce → Portal-Re-Render (kein Iframe-Reload, kein Flicker).
5. **Autosave** — 2s Debounced + Ctrl+S-Override + Toast mit relativer Pfad-Hinweis. Optimistic Update; bei Conflict (409) Diff-Modal mit Merge/Overwrite.
6. **`processPhoto()` `crop`-Param-Erweiterung** in `@codevena/forq-core` — `packages/core/src/photo.ts` bekommt optionalen `crop?: {left,top,width,height}` Parameter, wird vor `resize` an `sharp.extract()` übergeben. Photo-Tests entsprechend erweitern.

### Brainstorming-Themen (vor dem Coden)

#### Theme 1: Live-Preview-Implementierung
- A) `<iframe>` + ReactDOM.createPortal (Spec-Vorschlag, total CSS-isolated, live diffing)
- B) `<iframe srcDoc={renderedHtml}>` (einfacher, aber Full-Reload bei jeder Änderung → Flicker)
- C) Shadow DOM (kein Iframe — aber Template-CSS müsste explizit injectet werden)

#### Theme 2: API-Routes vs Server Actions
- A) Klassische REST-Style API-Routes (`app/api/cv/route.ts` etc.) — testbar, externe Konsumenten möglich, Spec hat sie so geplant
- B) Next.js Server Actions (`'use server'` Functions) — moderner, weniger Code, RHF kann sie direkt aufrufen
- C) Mix: GET-Routes als REST (für CLI-Konsumierbarkeit), POST als Server Actions

#### Theme 3: Autosave & Conflict-Handling
- A) Optimistic Save mit `meta.updatedAt`-Compare → 409 + Diff-Modal (Spec)
- B) Optimistic + last-write-wins (kein Conflict-Handling — single-user MVP)
- C) Pessimistic — disable Save während Request, kein Conflict möglich

#### Theme 4: Form-State Architecture
- A) Ein einziger `useForm<CVData>` für die ganze Page (Spec-implizit)
- B) Verschachtelte `<FormProvider>` + Sub-Forms pro Section
- C) RHF nur für Form-Felder, separater Zustand-Store für Meta (Template, Palette, hidden sections)

#### Theme 5: Template-Switch-UX
- Wenn der User das Template wechselt: ändert sich nur das Preview, oder darf der User die Template-spezifische `palettes`-Liste eingeschränkt sehen? Was passiert mit `accentOverride` wenn das neue Template ein anderes Default-Palette hat?

### Bekannte Phase-7-Follow-ups (Phase-8-Pflicht oder Polish)

**Pflicht für Phase 8 (sobald die jeweilige Component im Editor verwendet wird):**
- **`processPhoto()` `crop`-Param** in `@codevena/forq-core` — Server-Endpoint braucht das.
- **`PaletteSelector` + `TemplateCard` Radiogroup-Keyboard-Nav** — sobald sie in der Sidebar sitzen, müssen Pfeiltasten zwischen Cards wandern (roving tabindex). ~1h.

**Polish (kann auch nach Phase 8):**
- `deriveFieldId`-Extraction nach `packages/ui/src/internal/deriveFieldId.ts` — 4 Kopien in Input/Textarea/Select/ColorPicker. Mechanisch, ~30 min.
- `DateRangeInput` aria-label-Strings als Props exponieren (i18n).
- `ColorPicker` Ghost-Color-State bei invalid hex (`opacity-40` + `aria-invalid`).
- `PhotoCropper` HEIC-Support — server-side Conversion via sharp vor dem Cropping-Pass (sharp kann HEIC, Browser kann nicht).
- BulletListEditor `<fieldset>`/`<legend>` Group-Label statt `<span>` (analog zu DateRangeInput).
- Repo-weiter Lint-Baseline-Cleanup — 143 pre-existing Biome-Findings in `apps/cli`/`packages/core`/`packages/templates`.

### Empfohlener Ablauf

1. **`superpowers:brainstorming`** öffnen, Themes 1–5 durchgehen.
2. Approved Design → `docs/superpowers/specs/2026-04-25-forq-editor-design.md`.
3. **`superpowers:writing-plans`** für den Implementation-Plan.
4. **`superpowers:subagent-driven-development`** — pro Task ein Implementer + 2-stage Review (spec + code-quality), wie in Phase 7.
5. Definition-of-Done: 4 Review-Agents per `~/.claude/CLAUDE.md` — sei dir bewusst dass Codex-Subagents in dieser Session am Read-Only-Sandbox scheiterten; falls das Problem persistiert, manuell mit `codex` CLI oder über `gemini` als Ersatz dispatchen.

### Akzeptanz-Kriterium für Phase 8 (Vorschlag, beim Brainstorming verfeinern)

- `pnpm --filter @codevena/forq-web build` grün
- `pnpm --filter @codevena/forq-web test:e2e` grün (Playwright — mind. 5 Flows: Load → Edit → Save, Template-Switch, Photo-Upload, PDF-Export, Broken-YAML-Banner)
- `pnpm --filter @codevena/forq-core test:unit` grün (mit erweiterten `processPhoto`-Crop-Tests)
- Alle 8 Templates rendern korrekt im Live-Preview-Iframe
- PDF-Export liefert ein gültiges A4-PDF mit aktuellen (auch ungesicherten) Editor-Daten
- Markus' echte CV-Daten (`data/cvs/cv.de.yaml`, `cv.en.yaml`) editierbar end-to-end

### Quick-Reference

```bash
# Aktueller Stand
git log --oneline -5
git status

# Pipeline
pnpm lint && pnpm typecheck && pnpm build

# Phase 7 Tests (38 grün — sollten weiter grün bleiben)
pnpm --filter @codevena/forq-ui test:unit

# Phase 7 Demo-Playground (lokal)
pnpm --filter @codevena/forq-web dev
# → http://localhost:3000/dev-ui

# Phase 8 Entwicklung (kommt)
pnpm --filter @codevena/forq-web dev
# → http://localhost:3000/

# CLI Smoketest
node apps/cli/dist/index.js --help
node apps/cli/dist/index.js build data/cvs/cv.de.yaml -t classic-serif -o out/cv.de.pdf
```

### Memory & Konventionen

Auto-Memory in `/Users/markus/.claude/projects/-Users-markus-Developer-cvMake/memory/`. Globale Regeln (`~/.claude/CLAUDE.md`):
- **Niemals `Co-Authored-By`** in Commits.
- **Niemals push** ohne explizite Freigabe.
- `pnpm typecheck && pnpm build` vor jedem Commit.
- Definition-of-Done verlangt 4 Review-Agents — bei Phase-Abschluss konsequent.

**Specs zum Lesen vor Brainstorming:**
- `docs/superpowers/specs/2026-04-24-cvmake-design.md` — die ursprüngliche Architektur (vor Rename), §6 Web-Editor-Flow ist die Basis für Phase 8.
- `docs/superpowers/specs/2026-04-25-forq-ui-design.md` — Phase-7 API + Constraints für Editor-Konsumenten.

Leg los: `superpowers:brainstorming` öffnen, Theme 1 (Live-Preview-Implementierung) als erste Frage stellen.
