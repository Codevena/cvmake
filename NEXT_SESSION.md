# Prompt für nächste Session — forq Phase 8 (Editor in apps/web)

Kopiere diesen Block in die neue Claude-Code-Session im Projektverzeichnis `/Users/markus/Developer/cvMake`:

---

## Prompt

Wir sind auf Branch `feat/cvmake-mvp`. Phase 0–7 sind komplett:
- Schema, Core, CLI, 8 Templates polished, Repo umbenannt zu `forq`
- **Phase 7 (`@codevena/forq-ui`) komplett:** 9 Components + 37 Tests grün, Tailwind v4 in `apps/web` aktiv, Demo-Page unter `/dev-ui` live
- Spec: `docs/superpowers/specs/2026-04-25-forq-ui-design.md`
- Plan: `docs/superpowers/plans/2026-04-25-forq-ui.md`

**Heute: Phase 8 — Editor in `apps/web`.** Form-Composition mit RHF, API-Routes, Live-Preview-Iframe, Autosave.

### Was Phase 7 geliefert hat (importierbar via `@codevena/forq-ui`)

- Form-Primitives: `Input`, `Textarea`, `Select`, `DateRangeInput` (+ `DateRangeValue`-Typ)
- Editor-Composite: `BulletListEditor`
- Photo: `PhotoCropper` (+ `PhotoCropResult`, `PhotoAspect` Typen) — UI-only, ruft `onConfirm({file, crop, aspect})`
- Color: `ColorPicker` (single accent), `PaletteSelector` (visuelles Grid)
- Template: `TemplateCard` (Selected-State + Click-Dispatch)
- Tailwind v4 + `@theme` Tokens (siehe `packages/ui/src/styles/tailwind.css`)

### Phase-8 Aufgaben (laut Original-Spec §6 + §7)

1. **Editor-Layout** — Sidebar (CV-Auswahl, Template/Palette-Picker via PaletteSelector + TemplateCard), Hauptbereich split (Form links, Preview-iframe rechts).
2. **Form-Composition mit RHF** — alle Sections gegen `CVDataSchema` aus `@codevena/forq-schema`. PhotoCropper an `/api/upload` ankoppeln.
3. **API-Routes:**
   - `GET /api/cv` — listet alle `data/cvs/*.yaml` slugs
   - `GET /api/cv/[slug]` — `loader.load()` + Validate
   - `POST /api/save` — Zod-Validate, `yaml.dump`, schreibe `data/cvs/*.yaml`, Stale-Save-Detection via `meta.updatedAt`
   - `POST /api/upload` — multipart Photo + Crop-Region → `processPhoto()` mit `crop`-Param-Erweiterung in `@codevena/forq-core`
   - `POST /api/export` — `CVData` → `renderer.render()` → `pdf.generate()` → A4 PDF Buffer
4. **Live-Preview-Iframe** — `<iframe>` mit React-Portal in das iframe-document, total CSS-Isoliert. Form-Changes → 150ms Debounce → re-render.
5. **Autosave** — 2s Debounced + Ctrl+S Override + Toast.
6. **`processPhoto()` `crop`-Param-Erweiterung** — `packages/core/src/photo.ts` braucht optionalen `crop`-Parameter (sharp `extract`); Photo-Tests entsprechend erweitern.

### Bekannte Phase-7-Follow-ups (für Phase 8 oder Polish-Sprint)

- A11y: `BulletListEditor` Input-Label-Association (consumer kann `aria-label` per Bullet hinzufügen, oder Component kriegt `bulletAriaLabel`-Prop)
- A11y: Radiogroup-Keyboard-Navigation für `PaletteSelector` + `TemplateCard` (arrow-key roving tabindex)
- `deriveFieldId` extraction nach `packages/ui/src/internal/` (4 Kopien in Input/Textarea/Select/ColorPicker)
- `<DateRangeInput>` `aria-label`-Strings als Props exponieren (i18n)
- `<ColorPicker>` `aria-invalid` und Ghost-Color-State bei invalid hex
- `<PhotoCropper>` HEIC-Support: Server-side Conversion vor Cropping (sharp kann HEIC, Browser nicht)

### Quick-Reference

```bash
# Pipeline
pnpm lint && pnpm typecheck && pnpm build

# UI-Library Tests (37/37 grün)
pnpm --filter @codevena/forq-ui test:unit

# Demo-Page rendern
pnpm --filter @codevena/forq-web dev
# → http://localhost:3000/dev-ui
```

### Memory & Konventionen

- Globale Regeln (`~/.claude/CLAUDE.md`): keine Co-Authored-By-Zeilen, niemals pushen ohne Freigabe, `pnpm typecheck && pnpm build` vor jedem Commit, 4 Review-Agents bei Phase-Abschluss.
- Spec: `docs/superpowers/specs/2026-04-25-forq-ui-design.md` (Phase 7) plus die ursprüngliche `2026-04-24-cvmake-design.md` (Architektur).
