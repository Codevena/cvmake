# Prompt für nächste Session — cvMake Phase 7 (`@cvmake/ui`)

Kopiere den folgenden Block in die neue Claude-Code-Session im Projektverzeichnis `/Users/markus/Developer/cvMake`:

---

## Prompt

Wir sind mitten in der cvMake-Implementierung auf Branch `feat/cvmake-mvp`. Phasen 0–6 sind durch, das Page-Margin-Polish-Tooling ist drauf (commit `e98aad5`). Heute geht's mit **Phase 7 — `@cvmake/ui`** weiter.

### Aktueller Stand

```bash
git log --oneline main..feat/cvmake-mvp | head -10
```

- **Phasen 0–6 fertig**: Schema, Core (loader/i18n/photo/renderer/pdf), Templates-Foundation, Classic-Serif-Proof, CLI komplett, 8 Templates produktiv.
- **Page-2-Top-Margin-Fix landed** (commit `e98aad5`): `packages/core/src/pdf.ts` injiziert via `page.evaluate()` einen 16pt `cv-page-spacer` vor dem ersten Element jeder neuen Seite. Puppeteer-Margin = 0 bleibt → full-bleed Sidebar-Gradient erhalten.
  - **Sauber: ✅ tech-dev, academic, monochrome-dark, editorial, corporate** (yMin ≈ 16-32pt auf Seite 2+).
  - **Partial: ⚠️ modern-minimal** (~8pt statt 16pt), **creative-accent** (Seite 2+4 ok, Seite 3 verpasst).
  - **Broken: ❌ classic-serif** (Grid-Layout — `break-before:page` auf Grid-Items wird von Chromium nicht respektiert).
  - Diese 3 Restprobleme sind dokumentiert in `docs/superpowers/plans/2026-04-24-cvmake-plan.md` Phase-6-Status; **NICHT in dieser Session lösen** — erst nach Phase 7+8 wenn das Web-UI das Editing erlaubt und Markus die Templates ggf. eh überarbeitet.

**Test-Status:**
- `pnpm --filter @cvmake/core test:unit` → 14/14
- `pnpm --filter @cvmake/core test:integration` → 1/1
- `pnpm --filter @cvmake/templates test:unit` → 46/46
- `pnpm --filter @cvmake/templates test:visual` → 8/8

### Phase 7 — `@cvmake/ui`

**Plan-Datei**: `docs/superpowers/plans/2026-04-24-cvmake-plan.md` ab Zeile 3669 (`## Phase 7 — @cvmake/ui (Shared React Components)`).

Ziel: Wiederverwendbare React-Komponenten als eigenes Workspace-Package `@cvmake/ui`, die später vom `apps/web` Next.js Editor genutzt werden. Komponenten:
- `PhotoCropper` — react-image-crop Wrapper, liefert kreisrunden Crop als File für die Photo-Pipeline.
- `ColorPicker` — palettenbasierter Picker (zeigt nur Palette-Tokens, keine free-form colors).
- `TemplateCard` — Card mit Preview-PNG, Hover-State, click → select.
- `FormField` — generischer Form-Field Wrapper mit Label, Error, Hilfetext.
- `ArrayField` — add/remove/reorder UI für YAML-Arrays (Berufserfahrung, Skills, etc.).

Jeweils Tests mit Vitest + Testing-Library. Storybook-artige Demo (interactive playground in `examples/`).

### Skill für Ausführung

`superpowers:subagent-driven-development` (frischer Subagent pro Task + Spec/Code-Quality-Review). Hat in den Phasen 0–6 zuverlässig funktioniert.

### Memory + Konventionen

Auto-Memory in `/Users/markus/.claude/projects/-Users-markus-Developer-cvMake/memory/`. Globale Regeln (aus `~/.claude/CLAUDE.md`):
- **Keine "Co-Authored-By"-Zeilen** in Commits.
- **Niemals pushen** ohne explizite Freigabe.
- `pnpm build` und `pnpm typecheck` vor jedem Commit.
- Definition-of-Done verlangt 4 Review-Agents (2 Codex + 2 Claude); für laufende Implementierungsarbeit pragmatisch handhaben, bei Phase-Abschluss konsequent durchziehen.

### Build-Commands Quick-Reference

```bash
# Alles bauen, typechecken, testen
pnpm lint && pnpm typecheck && pnpm build

# Eine PDF für Smoke-Test (nach Core-Änderungen)
node apps/cli/dist/index.js build data/cvs/cv.de.yaml -t tech-dev -o out/cv.de.tech-dev.pdf

# Alle 8 PDFs
for id in classic-serif modern-minimal creative-accent academic monochrome-dark editorial corporate tech-dev; do
  node apps/cli/dist/index.js build data/cvs/cv.de.yaml -t $id -o out/cv.de.$id.pdf
done

# Page-2 yMin-Probe (sanity-check page-margin fix nach Core-Änderungen)
pdftotext -layout -bbox out/cv.de.tech-dev.pdf - 2>/dev/null | awk '/<page/{p++} p==2 && /<word/{print; exit}'
```

Leg los: Phase 7 Task 7.1 lesen, dann Subagent dispatchen.
