# Prompt für nächste Session — forq Template-Review (vor Phase 7)

> **Hinweis (2026-04-25):** Projekt wurde von `cvMake` zu `forq` umbenannt. Branch `feat/cvmake-mvp` bleibt vorerst, wird beim ersten Merge zu `main` ggf. umbenannt. Siehe `docs/superpowers/specs/2026-04-25-naming-decision.md`.

Kopiere den folgenden Block in die neue Claude-Code-Session im Projektverzeichnis `/Users/markus/Developer/cvMake`:

---

## Prompt

Wir sind auf Branch `feat/cvmake-mvp`. Phasen 0–6 sind komplett, das Page-Margin-Polish landed. **Bevor wir mit Phase 7 (`@codevena/forq-ui`) anfangen, will ich jedes Template visuell durchreviewen.** Heißt: für alle 8 Templates Seite 1 + Seite 2 angucken, mein Feedback einsammeln, in ein Review-Dokument konsolidieren, und dann gemeinsam entscheiden, ob eine Polish-Runde (Phase 6.5) nötig ist oder wir direkt zu Phase 7 springen.

### Aktueller Stand

```bash
git log --oneline main..feat/cvmake-mvp | head -5
```

- Phase 6 fertig, alle 8 Templates leben.
- Commit `e98aad5`: Page-2-Top-Margin via `page.evaluate()` Spacer-Injection in `packages/core/src/pdf.ts`.
  - **Sauber: tech-dev, academic, monochrome-dark, editorial, corporate**
  - **Partial: modern-minimal (8pt), creative-accent (Seite 3 verpasst)**
  - **Broken: classic-serif (Grid-Layout, `break-before:page` ignoriert)**
- Tests: core 14/14, integration 1/1, templates 46/46, visual 8/8.

### Review-Ablauf

#### Schritt 1: Alle 8 PDFs frisch bauen

```bash
pnpm --filter @codevena/forq-core build && pnpm --filter @codevena/forq-cli build
for id in classic-serif modern-minimal creative-accent academic monochrome-dark editorial corporate tech-dev; do
  node apps/cli/dist/index.js build data/cvs/cv.de.yaml -t $id -o out/cv.de.$id.pdf
done
```

#### Schritt 2: Pro Template — Seite 1 + Seite 2 als PNG rendern und mir zeigen

Render-Befehl pro Template (rendere ALLE Seiten, nicht nur 1+2 — manche Templates haben 3-4 Seiten):

```bash
# Pages 1-4 (überspringt nicht-existierende stillschweigend)
pdftoppm -png -r 80 out/cv.de.<TEMPLATE>.pdf out/_review_<TEMPLATE>
ls out/_review_<TEMPLATE>-*.png
```

Dann **per Template** die PNGs in den Chat lesen (`Read` tool auf jede `.png`). **Eins nach dem anderen** — nicht alles auf einmal — damit ich pro Template gezielt Feedback geben kann.

Reihenfolge zum Reviewen:
1. classic-serif
2. modern-minimal
3. creative-accent
4. academic
5. monochrome-dark
6. editorial
7. corporate
8. tech-dev

#### Schritt 3: Pro Template Feedback einsammeln

Pro Template Markus folgendes fragen:
- Typografie ok? (Größe, Hierarchie, Lesbarkeit)
- Spacing & Layout ok? (Gaps, Abstände, Zeilenhöhe)
- Palette ok? (Akzentfarben, Kontrast)
- Foto-Treatment ok? (Größe, Position, Border-Radius)
- Section-Reihenfolge ok?
- Seite-2+ Top-Margin ok? (visueller Sanity-Check, NICHT nur die `pdftotext`-Zahl)
- Sonstige Auffälligkeiten?

Mach dir pro Template Notizen in einem strukturierten Markdown-Dokument: `docs/template-review-2026-04-25.md` (oder mit aktuellem Datum). Format:

```markdown
## <template-id>

**Pages:** 2 (or whatever)
**Page-2 yMin:** <pdftotext-bbox value> pt
**Status:** good / needs polish / broken

### Findings
- [ ] (item)
- [ ] (item)

### Notes
…
```

#### Schritt 4: Entscheidungs-Punkt

Nach dem Review aller 8 Templates: Markus zeigen, was die kritischsten Items sind, und vorschlagen:

- **Option A — Phase 6.5 Polish-Runde**: Per-Template-Agent dispatchen (1 Agent pro Template das Polish braucht), parallel via `superpowers:dispatching-parallel-agents`. Skill ist erprobt aus Phase 6.
- **Option B — Direkt Phase 7 starten**: Wenn die Findings minor sind, parken wir sie als TODOs und gehen zum UI weiter.
- **Option C — Mix**: Nur die kaputten Templates (classic-serif page-2-bug, creative-accent page-3-bug) jetzt fixen, Rest später.

Markus entscheidet. **Nichts ohne Freigabe committen oder pushen.**

### Memory + Konventionen

Auto-Memory in `/Users/markus/.claude/projects/-Users-markus-Developer-cvMake/memory/`. Globale Regeln (aus `~/.claude/CLAUDE.md`):
- **Keine "Co-Authored-By"-Zeilen** in Commits.
- **Niemals pushen** ohne explizite Freigabe.
- `pnpm build` und `pnpm typecheck` vor jedem Commit.
- Definition-of-Done verlangt 4 Review-Agents — bei Phase-Abschluss konsequent.

### Quick-Reference

```bash
# Lint/Typecheck/Test/Build
pnpm lint && pnpm typecheck && pnpm build

# Page-2 yMin-Probe (sanity-check)
pdftotext -layout -bbox out/cv.de.<template>.pdf - 2>/dev/null | awk '/<page/{p++} p==2 && /<word/{print; exit}'

# Eine PDF aus aktueller cv.de.yaml
node apps/cli/dist/index.js build data/cvs/cv.de.yaml -t classic-serif -o out/test.pdf
```

Leg los: PDFs frisch bauen, dann Template 1 (classic-serif) page 1+2+ rendern, in den Chat schicken, ich gucke.
