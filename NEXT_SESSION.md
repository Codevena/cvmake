# Prompt für nächste Session — cvMake Implementation Planning

Kopiere den folgenden Block in deine neue Claude-Code-Session (im Projektverzeichnis `/Users/markus/Developer/cvMake`):

---

## Prompt

Wir haben in der vorherigen Session die Spec für **cvMake** fertig gebrainstormt (ein Open-Source CV-Generator). Die Design-Spec liegt in `docs/superpowers/specs/2026-04-24-cvmake-design.md` und wurde bereits committed (Commit `686a308` auf Branch `main`).

**Deine Aufgabe jetzt:** Invoke das `superpowers:writing-plans`-Skill und erstelle einen detaillierten Implementation-Plan, der die Spec in umsetzbare Phasen zerlegt.

### Kontext zum Wiedereinlesen

- **Spec:** `docs/superpowers/specs/2026-04-24-cvmake-design.md` — komplettes Design-Dokument mit Architektur, Datenmodell, Flows, Error-Handling, Tests. Erst die Spec komplett lesen, bevor der Plan geschrieben wird.
- **Memory:** Meine User-Profile- und Projekt-Memories liegen unter `/Users/markus/.claude/projects/-Users-markus-Developer-cvMake/memory/` — insbesondere:
  - `feedback_parallel_design_agents.md` — **WICHTIG:** Jedes der 8 Templates muss durch einen eigenen dedizierten Agent designed/perfektioniert werden. Bis zu 10 Agents parallel dispatchen über das `dispatching-parallel-agents`-Skill. Nicht batchen.
  - `project_cvmake.md` — Scope + alle 10 Brainstorming-Entscheidungen.
  - `user_role.md` — mein Profil (Fullstack Dev, Deutsch, Hetzner + Coolify).

### Wichtige Rahmenbedingungen für den Plan

1. **Build-Reihenfolge folgt den Dependencies:** `schema` → `core` → `templates` → `apps`. Turborepo-Pipeline nutzen.
2. **End-to-End-Proof vor Parallelisierung:** Erst 1 Template (z. B. Classic Serif) komplett durchbauen — Loader, Renderer, PDF, CLI-Command, ein funktionierendes PDF vom echten Markus-Content. Das beweist die Architektur, bevor wir 7 Templates parallel bauen.
3. **Template-Phase = parallele Agents.** Nach dem End-to-End-Proof: `dispatching-parallel-agents` mit einem Agent pro Template, jeder mit einem detaillierten Brief (Style-Direction, Typografie, Palette, Layout, Foto-Treatment, Section-Rendering, Tests, Visual-Baseline).
4. **Web-UI kommt NACH den Templates**, nicht davor. Die Templates + CLI müssen zuerst stehen und visuell getestet sein, bevor wir den Editor draufbauen.
5. **Visual-Regression ist Teil der Template-Definition-of-Done** — ohne committed Baseline-Image kein Merge.
6. **Tech-Stack folgt der Spec:** Next.js 16, TypeScript strict, pnpm Workspace, Turborepo, Zod, Puppeteer, sharp, react-image-crop, Biome, Vitest, Playwright. Prisma wird NICHT gebraucht (kein DB, keine Auth).
7. **Real-Content-Test:** Meinen echten CV (die alte PDF-Datei liegt unter `/Users/markus/Desktop/Markus_Wiesecke_CV_2025-06-27.pdf`) als Basis nutzen, um `data/cvs/cv.de.yaml` zu füllen. Englische Variante durch Content-Aktualisierung mit dem „aktuellen" PDF (`/Users/markus/Desktop/Markus_Wiesecke_CV_aktuell.pdf`) anreichern.

### Meine Arbeitsweise

- Sprache: Deutsch.
- Ich bin Fullstack Dev, arbeite Next.js/TS/Postgres, deploye auf eigenem Hetzner + Coolify. Du kannst technisch präzise sein.
- Qualität > Geschwindigkeit. Nicht batchen, nicht abkürzen.
- Nach Git-Workflow: lokal committen ist okay, **nie ohne Rückfrage pushen**.
- Build-Check (`pnpm build` / `tsc --noEmit`) vor jedem Commit. Code muss typen-sauber sein.
- Commit-Messages: **keine** „Co-Authored-By Claude" Zeilen.

### Was ich von dir erwarte

1. Lies die Spec vollständig (`docs/superpowers/specs/2026-04-24-cvmake-design.md`).
2. Lies meine Memories (`MEMORY.md` + verlinkte Dateien).
3. Invoke `superpowers:writing-plans`.
4. Erstelle einen Plan mit klaren Phasen, Milestones, Review-Checkpoints und expliziten Hinweisen, wo parallele Agents dispatched werden.
5. Schreibe den Plan nach `docs/superpowers/plans/2026-04-24-cvmake-plan.md`.
6. Committe den Plan lokal.
7. Frage mich vor dem Start der Implementierung nach Review.

Leg los.

---

## Hintergrund falls relevant

- Projektpfad: `/Users/markus/Developer/cvMake`
- Git: Branch `main`, erster Commit `686a308 docs: add cvMake design spec` ist bereits drin.
- Spec-Review ist durch mich schon erfolgt — die Datei ist final.
- Visual Companion Session: `.superpowers/brainstorm/` (nicht in Git, per `.gitignore` ausgeschlossen).
