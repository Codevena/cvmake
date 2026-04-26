# Prompt für nächste Session — forq nach Phase 8

Kopiere den Block unter `## Prompt` in eine neue Claude-Code-Session im Projektverzeichnis `/Users/markus/Developer/cvMake`.

---

## Prompt

Wir sind auf `feat/cvmake-mvp` und `main` (synchron, beide auf `fb40054`), Repo `Codevena/forq` (private GitHub). **Phase 0–8 sind komplett, gepusht und in `main` gemerged.** Editor läuft live (`pnpm --filter @codevena/forq-web dev` → `http://localhost:3000`), Markus' echte CVs editierbar end-to-end, PDF-Export funktioniert.

**Master-Plan mit aktuellem Status:** `docs/superpowers/plans/2026-04-24-cvmake-plan.md` — Phasen-Tabelle zeigt 0–8 ✅, 8b ⏸ (scheduled), 9 + 10 ⬜.

### Was diese Session tun soll — drei realistische Pfade, lass uns einen wählen

**Pfad A — Phase 9: CI + Visual-Regression vollständig** *(orthogonal, nicht blockiert, am ehesten "klassische Engineering-Arbeit")*
- GitHub Actions Workflow (`pnpm install` → `pnpm typecheck` → `pnpm lint` → `pnpm test:unit` → `pnpm test:e2e` → `pnpm build`)
- Visual-Regression-Suite: in `packages/templates/test/visual/` ist Scaffolding, aber Baselines fehlen. Pro Template × Palette ein Snapshot, pixelmatch-Diff, Update-Mechanismus.
- Optional: Caching (Turborepo + GitHub Actions cache), parallele Jobs.
- Optional: PR-Comment-Bot mit Visual-Diff-Bildern.
- Brainstorming → Spec → Plan → Execution. ~3–6h Aufwand abhängig von CI-Tooling-Tiefe.

**Pfad B — Personal-Data-Strategie brainstormen** *(Voraussetzung für Phase 10 / Public-Going)*
- Critical Finding aus dem Master-Plan: `data/cvs/cv.de.yaml`, `cv.en.yaml`, `markus.jpg` sind seit Phase 0 in Git-History committed mit echten persönlichen Daten.
- 4 Lösungsoptionen sind im Plan dokumentiert (history-rewrite mit `git filter-repo` / separates OSS-Repo / private bleiben / hybrid via `.gitignore` + Sample-Daten).
- Brainstorming-Session: welche Option, welche Trade-Offs für Markus konkret. Ergebnis = Spec + Migrationsplan.
- ~1–2h Brainstorming, danach je nach Option 30 min – mehrere Stunden Migration.

**Pfad C — Personal-CV-Updates pflegen** *(falls die uncommitted Working-Tree-Änderungen jetzt landen sollen)*
- `git status` zeigt: `M data/cvs/cv.de.yaml`, `M data/cvs/photos/markus.jpg`, `?? data/cvs/photos/markus.webp` — bewusst uncommitted gelassen weil Personal-Data-Strategie noch offen ist.
- Wenn klar ist dass die in private bleiben (Pfad B-Entscheidung pro "private long-term"): committen + push, fertig.
- Wenn nicht klar: erst Pfad B, dann diese.

**Mein Vorschlag:** Pfad A starten (CI/Visual ist gerade pure Engineering und blockt nichts), parallel über Pfad B nachdenken. Pfad C erst nach B-Entscheidung.

### Status-Quick-Check Commands

```bash
git log --oneline -5
git status
pnpm typecheck && pnpm build
pnpm -r test:unit
pnpm --filter @codevena/forq-web test:e2e
```

Erwartet: alles grün. Lint zeigt 139 errors (Phase-7-Baseline 143 → unter Schwelle, OK).

### Aktive Routine

In 2 Wochen (2026-05-10 08:00 UTC) feuert eine remote scheduled routine `trig_01DdJXYWNhhRpmqDzzzVWwvN`, die einen Cleanup-PR für die Phase-8-Backlog-Items D1–D4, D8, D9 öffnet (mechanische Nits aus den DoD-Reviews). Dokumentiert in `.review-logs/phase8-mvp-deferred.md`. Wenn du diese Session vor dem 2026-05-10 hast, kannst du die Routine via `https://claude.ai/code/routines/trig_01DdJXYWNhhRpmqDzzzVWwvN` einsehen oder löschen.

### Wichtige Specs zum Lesen je nach Pfad

- **Pfad A:** `docs/superpowers/specs/2026-04-24-cvmake-design.md` §8 (Testing Strategy) als Ausgangsbasis. Kein dedizierter Phase-9-Spec existiert — den schreibst du in dieser Session.
- **Pfad B:** `docs/superpowers/plans/2026-04-24-cvmake-plan.md` Sektion "Critical Finding" hat die 4 Optionen + Trade-Offs. Memory `project_cvmake.md` hat den OSS-Showcase-Kontext.
- **Pfad C:** `data/cvs/cv.de.yaml` lesen, sich vergewissern dass die Änderungen sinnvoll sind, dann `git add` + `git commit` (Repo ist private — wenn long-term private OK).

### Konventionen

`~/.claude/CLAUDE.md` global rules:
- **Niemals `Co-Authored-By`** in Commits.
- **Niemals push** ohne explizite Freigabe.
- `pnpm typecheck && pnpm build` vor jedem Commit.
- Definition-of-Done verlangt 4 Review-Agents bei Phase-Abschluss (siehe Phase-8-DoD-Beispiel in `.review-logs/`).

Auto-Memory unter `/Users/markus/.claude/projects/-Users-markus-Developer-cvMake/memory/` ist aktuell (Phase-8-Status + Phase-9-Backlog-Pointer drin).

**Frag mich zuerst welchen Pfad — A, B, oder C.** Dann mit `superpowers:brainstorming` einsteigen (Pfad A oder B) oder direkt committen (Pfad C).
