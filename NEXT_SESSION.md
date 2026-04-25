# Prompt für nächste Session — cvMake (Phase 6 Polish + Phase 7–10)

Kopiere den folgenden Block in die neue Claude-Code-Session im Projektverzeichnis `/Users/markus/Developer/cvMake`:

---

## Prompt

Wir sind mitten in der cvMake-Implementierung. Die ersten 6 Phasen aus `docs/superpowers/plans/2026-04-24-cvmake-plan.md` sind fast komplett auf dem Branch `feat/cvmake-mvp`. Heute (2026-04-25) ging der Context der vorherigen Session zur Neige. Lies zuerst den Stand und mach mit dem **akuten Bug** weiter, dann die **offenen Phasen 7–10**.

### Aktueller Stand (Branch `feat/cvmake-mvp`)

```bash
git log --oneline main..feat/cvmake-mvp | head -50
```

- **Phase 0–5 fertig**: pnpm-Workspace, Schema, Core (loader/i18n/photo/renderer/pdf), Templates-Foundation, Classic-Serif-Proof, CLI mit `build`/`validate`/`list-templates`/`build-all`.
- **Phase 6 fast fertig**: 8 Templates leben (`classic-serif`, `modern-minimal`, `creative-accent`, `academic`, `monochrome-dark`, `editorial`, `corporate`, `tech-dev`). 7 davon wurden parallel von Design-Agents implementiert. Alle haben Snapshot-Tests + Visual-Baselines. 8 PDFs aus Markus' echtem `data/cvs/cv.de.yaml` werden gebaut.

**Test-Status:**
- `pnpm --filter @cvmake/core test:unit` → 14/14
- `pnpm --filter @cvmake/core test:integration` → 1/1
- `pnpm --filter @cvmake/templates test:unit` → 46/46
- `pnpm --filter @cvmake/templates test:visual` → 8/8

PDFs: `out/cv.de.<template>.pdf` (8 Stück, 126–321 KB).

### AKUTER BUG (zuerst fixen!)

**Symptom:** Auf Seite 2+ hat der Content keinen Top-Margin — der erste Section-Heading klebt am oberen Seitenrand. Beispiel: `out/cv.de.tech-dev.pdf` Seite 2.

**Bisherige Fix-Versuche:**
- `@page { margin: 28mm 0 18mm 0 }` in `packages/templates/src/shared/print.css` — gesetzt
- `padding-top: 16pt` auf Sidebar/Main-Containers in 4 Sidebar-Templates — gesetzt
- `background-attachment: fixed` für Body-Gradient in 4 Sidebar-Templates — gesetzt (löste Sidebar-"Stufe" auf Seite 2)

Diese Fixes haben Seite 1 verbessert (Foto/Name haben Atemraum, Sidebar-Hintergrund läuft full-bleed durch). Aber Seite 2 hat **immer noch** keinen Top-Margin.

**Vermuteter Root Cause** (BITTE VERIFIZIEREN):

`packages/core/src/pdf.ts` Zeile 45 setzt:
```ts
margin: opts.margin ?? { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
```

Dieses Puppeteer-Options-`margin` überschreibt **immer** die CSS-`@page { margin }`-Regel — auch wenn beide gesetzt sind. Daher wird `@page { margin: 28mm 0 18mm 0 }` ignoriert, und Content beginnt auf jeder Seite bei 0mm.

**Vorgeschlagener Fix:**

Lass `margin` in `page.pdf()` weg, sodass Chrome das CSS-`@page`-margin respektiert:

```ts
// packages/core/src/pdf.ts
const pdfOptions: Parameters<typeof page.pdf>[0] = {
  format: opts.format ?? 'A4',
  printBackground: true,
  preferCSSPageSize: true,
};
if (opts.margin) {
  pdfOptions.margin = opts.margin;
}
const pdf = await page.pdf(pdfOptions);
```

So verhält sich das System:
- Wenn Caller `opts.margin` setzt → das wird verwendet (override).
- Wenn nicht → Chrome nutzt CSS `@page { margin }` aus shared/print.css.
- Body-Background (gradient) paintet **full-bleed** auf dem ganzen Sheet, weil das page-level ist (unabhängig vom Content-Margin).

**Verifikation (kritisch!):**

1. Fix in `packages/core/src/pdf.ts` anwenden.
2. `pnpm --filter @cvmake/core build && pnpm --filter @cvmake/cli build`
3. Build alle 8 PDFs neu:
   ```bash
   for id in classic-serif modern-minimal creative-accent academic monochrome-dark editorial corporate tech-dev; do
     node apps/cli/dist/index.js build data/cvs/cv.de.yaml -t $id -o out/cv.de.$id.pdf
   done
   ```
4. Öffne `out/cv.de.tech-dev.pdf` Seite 2 — der Sidebar-bg muss bis zum Top der Seite gehen, **UND** der erste Content (`#eigeninitiative`) muss 28mm vom Page-Top entfernt sein.
5. Falls Background nicht mehr full-bleed ist: das wäre ein Indikator dass Chrome das Page-Layout anders interpretiert als gehofft. Dann Plan B: Puppeteer-margin setzen auf `{ top: '28mm', bottom: '18mm', left: '0mm', right: '0mm' }` UND zusätzlich eine separate Page-Background-Strategie testen (z. B. `<div class="page-bg">` mit `position: fixed`).
6. Visual-Baselines werden vermutlich neu generiert werden müssen: `UPDATE_VISUAL=1 pnpm --filter @cvmake/templates test:visual`, dann ohne UPDATE verifizieren.
7. Commit: `fix(core): respect css @page margin by not overriding in puppeteer`. Falls Baselines aktualisiert: zweiter Commit `test(templates): regenerate baselines after page-margin fix`.

Markus reviewt visuell. KEIN Push ohne Freigabe.

### Memory + Konventionen

Alle stehen in `/Users/markus/.claude/projects/-Users-markus-Developer-cvMake/memory/`:
- `user_role.md` — Markus profile
- `project_cvmake.md` — Projekt-Scope + Brainstorming-Entscheidungen
- `feedback_parallel_design_agents.md` — pro Template ein Agent (Phase 6 hat das genutzt)

Globale Regeln (aus `~/.claude/CLAUDE.md`):
- **Keine "Co-Authored-By"-Zeilen** in Commit-Messages.
- **Niemals pushen** ohne explizite Freigabe von Markus.
- `pnpm build` und `pnpm typecheck` vor jedem Commit.
- Definition-of-Done verlangt eigentlich 4 Review-Agents (2 Codex + 2 Claude), aber für die laufende Implementierungsarbeit pragmatisch handhaben — bei größeren PRs/Phasenabschluss konsequent durchziehen.

### Nach dem Fix: Phase 7–10

Sobald der Page-Margin-Bug behoben ist und alle 8 PDFs sauber aussehen, mit Phase 7 weitermachen. **Plan-Datei**: `docs/superpowers/plans/2026-04-24-cvmake-plan.md` — Phasen 7, 8, 9, 10.

- **Phase 7** — `@cvmake/ui` (PhotoCropper, ColorPicker, TemplateCard, FormField, ArrayField). 6 Tasks, sequenziell.
- **Phase 8** — `apps/web` (Next.js 16 Editor mit Live-Preview, API-Routes für Load/Save/Upload/Export). 10 Tasks.
- **Phase 9** — CI + E2E + Visual-Regression vollständig (Playwright-Setup, 5 E2E-Flows, CI-Workflow erweitern).
- **Phase 10** — README mit allen 8 Template-Screenshots, MIT-Lizenz, CONTRIBUTING.

Skill für Ausführung: `superpowers:subagent-driven-development` (frischer Subagent pro Task + Spec/Code-Quality-Review). Hat in Phase 0–6 gut funktioniert.

### Build-Commands Quick-Reference

```bash
# Vollständiger Lint/Typecheck/Test/Build
pnpm lint && pnpm typecheck && pnpm build

# Nur Templates testen
pnpm --filter @cvmake/templates test:unit
pnpm --filter @cvmake/templates test:visual

# Visual-Baselines regenerieren (nach absichtlicher Layout-Änderung)
UPDATE_VISUAL=1 pnpm --filter @cvmake/templates test:visual

# Eine PDF bauen
node apps/cli/dist/index.js build data/cvs/cv.de.yaml -t classic-serif -o out/test.pdf

# Alle 8 PDFs bauen
for id in classic-serif modern-minimal creative-accent academic monochrome-dark editorial corporate tech-dev; do
  node apps/cli/dist/index.js build data/cvs/cv.de.yaml -t $id -o out/cv.de.$id.pdf
done
```

Leg los: erst der Page-Margin-Fix, dann Markus zeigt sich die PDFs an, dann Phase 7.
