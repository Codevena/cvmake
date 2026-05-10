# Personal-Data-Strategie — Migration zu OSS-Public-Readiness

**Status:** Design (brainstormed 2026-05-10), pending plan + execution.
**Author:** Codevena (cvMake-Maintainer)
**Vorgänger-Doc:** `docs/superpowers/plans/2026-04-24-cvmake-plan.md` Abschnitt "⚠️ Critical Finding (2026-04-26): Personal Data in Git History"
**Nachfolger:** `docs/superpowers/plans/2026-05-10-personal-data-migration.md` (kommt aus writing-plans-Skill)
**Phase-Dependency:** Blockiert Phase 10 (README + Docs + Release).

---

## 1. Goals + Non-Goals

### Goals

- Bestehender Repo `Codevena/forq` wird transition-ready für public-OSS-Toggle.
- **Null** Personal-Data des Maintainers in HEAD ODER Git-History (`git log -p` darf 0 Hits liefern).
- 2 realistic fictional Personas demonstrieren alle 8 Templates + das Foto-Feature überzeugend.
- Maintainer-Workflow bleibt unverändert (gleiche File-Pfade in `data/cvs/`, nur jetzt gitignored).
- Optional: Commit-Author-Cleanup (`Claude <noreply@anthropic.com>` → `Codevena <codevena@proton.me>`) per `--mailmap` (CLAUDE.md-Compliance).

### Non-Goals

- Repo-Migration zu neuem Namen oder Org. (Optional Repo-Rename `forq` → `cvmake` ist Open Question §9.)
- Phase-10-Scope (README, Screenshots, LICENSE, CONTRIBUTING, Release) — eigener Plan nach dieser Migration.
- Tooling-Refactor (CLI/Web bleibt funktional unverändert; nur Daten-Pfade-Strategie).
- Backwards-Compatibility (Force-Push impliziert Klon-Bruch — akzeptiert, da Sole-Contributor).

---

## 2. Decisions Snapshot

Aus Brainstorming am 2026-05-10:

| # | Decision | Choice |
|---|----------|--------|
| 1 | Endziel | OSS — Code public, andere forken |
| 2 | Scrub-Scope | Voll-anonym (Code + Tests + Docs) |
| 3 | Repo-Strategie | Same repo, `git filter-repo` |
| 4 | Sample-CVs | 2 Personas (DE + EN, unterschiedlich) |
| 5 | Sample-Fotos | AI-generierte Gesichter |
| 6 | Real-Daten-Storage | Same paths in `data/cvs/`, gitignored |
| 7 | Docs/Logs-Handling | Plans/Specs scrubben, `.review-logs/` + `NEXT_SESSION.md` raus aus History |

---

## 3. Sample-Data-Inventar

### Persona DE — Lena Bauer

- Senior Data Scientist, Berlin, ~8 Jahre Erfahrung
- Promotion in ML/NLP, 3 Karriere-Stationen, Konferenz-Talks, Open-Source-Beitragerin
- Demonstriert optimal: `academic`, `tech-dev`, `monochrome-dark` Templates
- File: `data/cvs/example.de.yaml`
- Foto: `data/cvs/photos/example-lena.webp` (AI-gen, ~30-50 KB)

### Persona EN — Adam Reyes

- Product Designer, Lisbon (remote), ~6 Jahre Erfahrung
- Visual Design + UX Research, 4 Stationen inkl. Startup, Side-Projekte, Awards
- Demonstriert optimal: `creative-accent`, `editorial`, `modern-minimal` Templates
- File: `data/cvs/example.en.yaml`
- Foto: `data/cvs/photos/example-adam.webp` (AI-gen, ~30-50 KB)

### File-Layout nach Migration

```
data/cvs/
├── .gitkeep
├── example.de.yaml          # NEW — committed (Lena Bauer)
├── example.en.yaml          # NEW — committed (Adam Reyes)
├── cv.de.yaml               # gitignored (Maintainer's local file)
├── cv.en.yaml               # gitignored (Maintainer's local file)
└── photos/
    ├── .gitkeep
    ├── example-lena.webp    # NEW — committed
    ├── example-adam.webp    # NEW — committed
    ├── markus.jpg           # gitignored (Maintainer's local file)
    └── markus.webp          # gitignored (Maintainer's local file)
```

### OSS Onboarding-UX

Forker-Workflow (in README dokumentiert in Phase 10):

```bash
cp data/cvs/example.de.yaml data/cvs/cv.de.yaml
cp data/cvs/example.en.yaml data/cvs/cv.en.yaml
# Edit cv.de.yaml und cv.en.yaml mit eigenen Daten — wird automatisch gitignored.
```

### Default-Path-Logik im Code

- Test-Fixtures (`apps/cli/test/build.integration.test.ts`, etc.) → lesen `example.de.yaml`
- Maintainer's eigenes Build-Command (außerhalb CI) → bleibt auf `cv.de.yaml`
- Web-App liest filename per Slug (`/cv/[slug]`) — keine Pfad-Änderung nötig

### Sample-Foto-Source

- Generiert via `design`-Skill (Gemini AI), Prompt: "Professional corporate headshot, neutral grey background, person facing camera, soft natural light, business-casual attire."
- Alternative: `thispersondoesnotexist.com` (CC0-equivalent in US-Jurisdiction)
- License-Hinweis: `data/cvs/photos/README.md` deklariert "AI-generated portraits, public domain / CC0".

---

## 4. Source-Code-Scrub-Inventar

### Group A — Test-Fixtures (echte Daten als Test-Input → fictional)

| File | LOC | Action |
|------|-----|--------|
| `packages/core/test/fixtures/valid.de.yaml` | 11 | Mini-Lena-CV (gleiche Struktur) |
| `packages/core/test/fixtures/invalid-missing.de.yaml` | 9 | Mini-Lena-CV mit fehlendem Required-Field |
| `packages/core/test/fixtures/broken.yaml` | 1 | Unverändert (kein Personal-Data) |
| `packages/schema/test/fixtures.ts` | 71 | Fictional content |

### Group B — Test-Files (String-Asserts mit Personal-Data)

- `packages/core/test/loader.test.ts`
- `packages/core/test/photo.test.ts`
- `packages/core/test/renderer.test.tsx`
- `apps/cli/test/build.integration.test.ts` (assertet `'Markus Wiesecke'` + `'Berufserfahrung'`)
- `apps/web/components/sections/PersonalSection.test.tsx`
- Pattern: `s/Markus Wiesecke/Lena Bauer/g`, `s/Wiesecke/Bauer/g`

### Group C — Snapshots (gerendert mit Personal-Data → regenerieren)

- `packages/templates/test/__snapshots__/*.snap` (8 Files, einer pro Template)
- Strategie: Files löschen, dann `pnpm -r test:unit -u` regeneriert mit gescrubbten Fixtures.
- Kein manuelles Editieren.

### Group D — App-Code

- `apps/web/app/dev-ui/page.tsx:63` — `placeholder="Markus"` → `placeholder="Alex"` (1 String)

### Group E — Docs/Specs/Plans (scrubben, behalten in History)

| File | Hits | Strategie |
|------|------|-----------|
| `docs/superpowers/plans/2026-04-24-cvmake-plan.md` | 54 | `s/Markus Wiesecke/Alex Schmidt/g`, `s/Markus/Alex/g`, Email/Phone-Strings entfernen |
| `docs/superpowers/specs/2026-04-24-cvmake-design.md` | 7 | dito |
| `docs/superpowers/plans/2026-04-25-forq-ui.md` | 3 | dito |
| `docs/superpowers/specs/2026-04-25-forq-editor-design.md` | 2 | dito |
| `docs/superpowers/specs/2026-04-25-naming-decision.md` | 2 | dito |
| `docs/superpowers/plans/2026-04-25-forq-editor.md` | 2 | dito |
| `docs/superpowers/plans/2026-05-10-phase9-ci-visual-regression.md` | 2 | dito |
| `docs/superpowers/specs/2026-04-25-forq-ui-design.md` | 1 | dito |
| `docs/template-review-2026-04-25.md` | 1 | dito |

**Pseudonym:** "Alex Schmidt" als Project-Author-Pseudonym in Docs (consistent mit Persona-Namen aber separat von "Lena Bauer" / "Adam Reyes" um Verwirrung zu vermeiden).

### Group F — Files KOMPLETT raus aus Repo + History

- `NEXT_SESSION.md` (3 Hits) — Session-spezifisch, kein OSS-Wert
- `.review-logs/*.md` (~14 Files inkl. Codex-/Claude-Review-Outputs mit Personal-Data) — komplettes Verzeichnis
- `data/cvs/cv.de.yaml`, `cv.en.yaml`, `data/cvs/photos/markus.{jpg,webp}` — Real-Data
- `data/letters/*` (bereits gitignored seit Phase 8 aber in History) — Bewerbungsanschreiben
- `scripts/build-letter.mjs` (bereits gitignored seit Phase 8 aber in History) — Letter-Build-Helper

### Verifikations-Greps nach HEAD-Scrub (müssen 0 Hits ergeben)

```bash
git grep -i "markus\|wiesecke" -- ':!pnpm-lock.yaml' ':!.gitignore'
git grep "@gmail.com\|@proton.me\|@posteo"
git grep -E "\\+49 ?(15|16|17)"
```

---

## 5. `.gitignore` Updates + Finaler Repo-State

### `.gitignore` Additions

Baut auf bestehende `data/letters/` + `scripts/build-letter.mjs` Excludes auf:

```gitignore
# Personal CV data — gitignored. Copy data/cvs/example.*.yaml to data/cvs/cv.*.yaml
# and edit yours locally. Templates stay clean of forker data.
data/cvs/*.yaml
data/cvs/*.yml
!data/cvs/example.*.yaml
!data/cvs/example.*.yml
data/cvs/photos/*
!data/cvs/photos/example-*
!data/cvs/photos/.gitkeep

# Session/review artifacts — local-only, never public
NEXT_SESSION.md
.review-logs/
.review/
```

### Effekt

- `cv.*.yaml`, `cv.*.yml` → out (Maintainer + jeder Forker by-default)
- `photos/markus.*` → out (catch-all `photos/*` minus `example-*`)
- `NEXT_SESSION.md` → out
- `.review-logs/` → out
- `.review/` → out (Codex-Review-Working-Directory; bereits in CLAUDE.md erwähnt aber bisher nicht im `.gitignore`)
- Erlaubt: `example.*.yaml`, `example-*.{webp,jpg,png}`, `.gitkeep`

### Final HEAD `git ls-files data/`

```
data/cvs/.gitkeep
data/cvs/example.de.yaml
data/cvs/example.en.yaml
data/cvs/photos/.gitkeep
data/cvs/photos/example-adam.webp
data/cvs/photos/example-lena.webp
data/cvs/photos/README.md
```

### Reihenfolge-Hinweis

`.gitignore`-Update muss VOR `git rm --cached cv.*.yaml` passieren, sonst spuckt Git Warnings.

---

## 6. filter-repo Recipe

### Tool

```bash
brew install git-filter-repo
```

### Disziplin

Mirror-Backup vor jeder Operation. Rewrite läuft in **frischem Clone**, niemals direkt auf Working-Repo.

```bash
# 1. Mirror-Backup
git clone --mirror git@github.com:Codevena/forq.git ~/forq-backup-2026-05-10.git
# Plus: zweite Backup-Kopie an externem Ort (USB / iCloud / 2nd machine)

# 2. Frischer Clone für Rewrite
git clone git@github.com:Codevena/forq.git /tmp/forq-rewrite
cd /tmp/forq-rewrite
```

### Operation A — Path-Deletions

```bash
git filter-repo --invert-paths \
  --path data/cvs/cv.de.yaml \
  --path data/cvs/cv.en.yaml \
  --path data/cvs/photos/markus.jpg \
  --path data/cvs/photos/markus.webp \
  --path NEXT_SESSION.md \
  --path-glob '.review-logs/*' \
  --path-glob '.review/*' \
  --path scripts/build-letter.mjs \
  --path-glob 'data/letters/*'
```

→ Diese Files verschwinden aus jedem Commit-Tree.

### Operation B — Content-Replacements

```bash
cat > /tmp/replacements.txt <<'EOF'
Markus Wiesecke==>Alex Schmidt
Wiesecke==>Schmidt
markus.wiesecke@gmail.com==>alex@example.com
regex:\+49 ?(15|16|17)\d{1,2}[\s-]?\d{3,}==>+49 30 0000000
EOF

git filter-repo --replace-text /tmp/replacements.txt
```

→ Wirkt auf File-Contents UND Commit-Messages.

**Bewusste Nicht-Scrubbing-Entscheidung:** `codevena@proton.me` wird **nicht** ersetzt. Codevena ist die deliberate OSS-Maintainer-Identität (GitHub-Org-Name), nicht Personal-Data. Open Question §9.1 begründet das.

**Subtilität:** `Markus` alleine (ohne Nachname) NICHT generell ersetzen — würde in Snapshots/Tests Kollisionen produzieren. Stattdessen: nach Operation A+B bleibt "Markus" nur noch in Files, die in Section-3-HEAD-Scrub bereits manuell editiert wurden (Group D + E). filter-repo rewritet die History dieser scrubbed Files mit ihrem neuen Content rückwirkend.

### Operation C — Commit-Author-Cleanup

```bash
cat > /tmp/mailmap.txt <<'EOF'
Codevena <codevena@proton.me> Claude <noreply@anthropic.com>
EOF

git filter-repo --mailmap /tmp/mailmap.txt
```

→ Alle Commits "Claude <noreply@anthropic.com>" werden zu "Codevena <codevena@proton.me>".

**Realitäts-Check 2026-05-10:** Auf `origin/main` aktuell **0 Claude-Author-Commits** (PR #1 squash-merged mit Codevena als Author). Die 6 ursprünglichen D1-D9-Commits leben in `refs/pull/1/*` (GitHub-managed, von filter-repo nicht erreichbar) und in einem lokalen Branch-Backup. Operation C ist Sicherheits-Net — wird auf `main` 0 Effekt haben, aber schützt gegen historische Edge-Cases.

### Operations-Order

1. HEAD-Scrub (Section 4, manuelle Edits) committen auf einem Setup-Branch und mergen
2. Operation A (path deletions)
3. Operation B (content replacements)
4. Operation C (mailmap)
5. Force-push (siehe Section 8 Phase 2)

filter-repo benötigt zwischen Operationen kein Reset — schreibt jedes Mal die komplette History neu in-place.

---

## 7. Verifikation + Test-Plan

Vier Verifikations-Layer — jede Stufe ist ein Gate vor dem nächsten Schritt.

### Layer 1 — Pre-filter-repo HEAD-Check

Nach Section-4-Edits, vor filter-repo:

```bash
# 0 hits expected:
git grep -i "markus\|wiesecke" -- ':!pnpm-lock.yaml' ':!.gitignore'
git grep "@gmail.com\|@proton.me\|@posteo"
git grep -E "\\+49 ?(15|16|17)"

# Sample-Files vorhanden:
test -f data/cvs/example.de.yaml || echo FAIL
test -f data/cvs/example.en.yaml || echo FAIL
test -f data/cvs/photos/example-lena.webp || echo FAIL
test -f data/cvs/photos/example-adam.webp || echo FAIL

# Real-Daten un-tracked:
git ls-files data/cvs/cv.de.yaml | grep -q . && echo "STILL TRACKED — fail"
```

### Layer 2 — Post-filter-repo Full-History-Scan

Paranoides All-Blobs-Grep:

```bash
git rev-list --objects --all \
  | awk '{print $1}' | sort -u \
  | while read sha; do
      [ "$(git cat-file -t $sha 2>/dev/null)" = "blob" ] || continue
      git cat-file -p $sha 2>/dev/null \
        | grep -q -i "markus\|wiesecke\|markus.wiesecke@gmail" \
        && echo "LEAK in $sha"
    done
# Expected: empty output
```

Plus filter-repo's eigene Diagnose:

```bash
git filter-repo --analyze
# .git/filter-repo/analysis/path-deleted-sizes.txt etc. — manuell auf 'markus' grepen
```

### Layer 3 — Build/Test-Pass im Rewritten Repo

```bash
cd /tmp/forq-rewrite
pnpm install
pnpm typecheck && pnpm build
pnpm -r test:unit
pnpm --filter @codevena/forq-templates test:visual  # darf rot sein bis Baselines regeneriert
```

**Snapshot + Visual-Baseline Regeneration** (Teil von Layer 3):

- Vitest snapshots: `pnpm -r test:unit -u` → check in
- Visual baselines: `gh workflow run update-baselines.yml` (Phase-9-Mechanik) → CI commitet neue Linux-Baselines mit Sample-Data

### Layer 4 — Post-Push Fresh-Clone-Test

```bash
cd /tmp && git clone git@github.com:Codevena/forq.git verify-clone
cd verify-clone
pnpm install && pnpm typecheck && pnpm build && pnpm -r test:unit
# Plus Layer-2 Full-History-Scan im fresh clone
```

### Test-Suite-Erwartungen nach Migration

- 178 unit tests → muss weiterhin grün sein (Sample-Data hat dieselbe Struktur wie real-Data)
- 8 template-snapshot-tests → Snapshots regeneriert
- 22 visual baselines → Linux-Regeneration via update-baselines.yml workflow
- E2E (`photo-upload`, `template-switch`) → funktionieren unverändert

### Rollback-Pfad

Mirror-Backup vollständig wiederherstellbar:

```bash
git clone --mirror ~/forq-backup-2026-05-10.git restore.git
cd restore.git && git push --mirror --force git@github.com:Codevena/forq.git
```

Akzeptable Rollback-Window: 24-48h nach Force-Push, bevor Phase-10-Arbeit drauf landet.

---

## 8. Migration-Sequence

Zwei separate Phasen mit User-Gate dazwischen.

### Phase 1 — HEAD-Scrub via normaler PR (reversibel, reviewable, ~3-4h)

```
[1.1]  Branch: chore/personal-data-migration vom main
[1.2]  AI-Sample-Fotos generieren → data/cvs/photos/example-{lena,adam}.webp
[1.3]  Sample-CV-YAMLs schreiben:
        - data/cvs/example.de.yaml (Lena Bauer)
        - data/cvs/example.en.yaml (Adam Reyes)
        - data/cvs/photos/README.md (License-Notice für AI-Fotos)
[1.4]  Test-Fixtures scrubben (Group A)
[1.5]  Test-Files scrubben (Group B)
[1.6]  Snapshots regenerieren (Group C):
        rm -rf packages/templates/test/__snapshots__/*.snap
        pnpm --filter @codevena/forq-templates test:unit -u
[1.7]  App-Code-Scrub (Group D)
[1.8]  Docs/Specs/Plans-Scrub (Group E):
        sed-Pass + manuelle Verifikation pro File
[1.9]  .gitignore-Update (Section 5-Block)
[1.10] git rm --cached für jetzt-gitignored Files
[1.11] Layer-1 Verifikation (siehe Section 7)
[1.12] pnpm typecheck + build + test:unit (alles grün gate)
[1.13] Visual-Baselines regenerieren via gh workflow run update-baselines.yml
[1.14] Commits in mehrere logische Commits aufgeteilt, push, PR open
[1.15] CI grün → PR merge (squash) → in main
```

**Gate 1:** User-Approval vor Phase 2. Repo ist private, HEAD ist clean, History noch nicht. Sicherer Zwischenpunkt.

### Phase 2 — filter-repo + Force-Push (destruktiv, ~1-2h)

```
[2.1]  Mirror-Backup erstellen
[2.2]  Backup an zweitem Ort sichern + Restore-Test (Layer 0)
[2.3]  Frischer Clone /tmp/forq-rewrite
[2.4]  Branch-Protection auf main temporär disablen
[2.5]  Operation A (path-deletions)
[2.6]  Operation B (content-replacements)
[2.7]  Operation C (mailmap)
[2.8]  Layer-2 Full-History-Blob-Scan — 0 hits required
[2.9]  pnpm install + typecheck + build + test:unit im /tmp/forq-rewrite
[2.10] Layer-2-Output speichern als Audit-Trail
```

**Gate 2:** User-Approval vor Force-Push. Vorzeigen: Layer-2-Audit + lokale Test-Runs.

```
[2.11] Force-push: git push --force --all && git push --force --tags
[2.12] Branch-Protection re-enablen
[2.13] Real-Data sichern + Re-Clone Working-Repo:
        - cp data/cvs/cv.*.yaml ~/cv-backup-2026-05-10/
        - cp data/cvs/photos/markus.* ~/cv-backup-2026-05-10/
        - cd .. && rm -rf cvMake
        - git clone git@github.com:Codevena/forq.git cvMake
        - cd cvMake && cp ~/cv-backup-2026-05-10/* data/cvs/
        - cp ~/cv-backup-2026-05-10/markus.* data/cvs/photos/
[2.14] Fresh-Clone-Verifikation (Layer 4)
[2.15] Visual-Baselines regenerieren: gh workflow run update-baselines.yml
[2.16] CHANGELOG / docs/superpowers/specs/2026-05-10-personal-data-migration-COMPLETE.md
       schreiben — SHAs vorher/nachher, Backup-Location, Audit-Output
```

### Geschätzter Total-Aufwand

- Phase 1: 3-4h (manuelle Edits + AI-Foto-Generation)
- Phase 2: 1-2h (mostly waiting on filter-repo + tests)
- Real-Time inkl. Verifikation: 1 Tag verteilt auf 2 Sessions

---

## 9. Risks + Open Questions

### Risks (geordnet nach Severity)

**🔴 HIGH — Mirror-Backup vergessen oder korrumpiert**
- Mitigation: 2 Backups an verschiedenen Orten. Test-Restore vor filter-repo: `git clone --mirror backup.git restore-test && cd restore-test && git log --oneline | wc -l` (sollte ≥162 liefern).

**🔴 HIGH — filter-repo verfehlt eine Leak-Stelle**
- Risiko: Personal-Marker in unerwarteten Stellen (binär-encoded, base64, font-files, etc.).
- Mitigation: Layer-2 Full-Blob-Scan post-rewrite ist mandatory gate. Plus `git filter-repo --analyze` Output durchgeprüft.

**🟡 MID — GitHub PR-Detail-Page leakt pre-squash-Content**
- PRs #1 + #2 sind squash-merged. GitHub behält die originalen Pre-Squash-Commits in der "Files changed"-View der PR-Detail-Seite (`https://github.com/Codevena/forq/pulls/1`), nicht in Branch-Refs erreichbar.
- PR #1 (Phase-8-Cleanup): 6 Commits, keiner berührt cv.*.yaml direkt. "Markus" nur in Test-Code-Diffs.
- PR #2 (Phase 9): 25 Commits, alle CI/Visual-Regression — kein Personal-Data-Touch.
- Severity: niedrig (kein raw-CV-Leak). Akzeptabler Compromise für OSS-public.
- Optional Mitigation: PR #1+#2 löschen (`gh api -X DELETE`) — verliert Reviews/Comments. Empfehlung: NICHT löschen, akzeptieren.

**🟡 MID — Branch-Protection auf main blockt force-push**
- `gh api repos/Codevena/forq/branches/main/protection` zeigt aktuelle Settings.
- Mitigation: Vor force-push protection temporär disablen, re-enablen nach Verifikation. (Steps [2.4] + [2.12])

**🟢 LOW — AI-generierte Foto-Lizenz**
- `thispersondoesnotexist.com` Faces: in den USA nicht copyright-fähig (kein menschlicher Schöpfer per Naruto v. Slater Präzedenz). EU/DE Rechtslage uneindeutig.
- Mitigation: NOTICE-File `data/cvs/photos/README.md` deklariert "AI-generated portraits, public domain / CC0".

**🟢 LOW — CI im Moment des Force-Push**
- Wenn workflow-run gerade läuft: orphaned commit, harmlos.
- Mitigation: `gh run list --status in_progress` checken vor push, wenn nicht-leer 2 Min warten.

**🟢 LOW — Maintainer's real-data verloren beim Re-Clone**
- Step [2.13] erfordert Backup vor `rm -rf cvMake`.
- Mitigation: Step im Plan explizit + Verifikations-`ls ~/cv-backup-2026-05-10/` Schritt.

### Open Questions

1. **OSS-Author-Identity:** Sollen post-migration Commits weiterhin als "Codevena <codevena@proton.me>" laufen, oder eigene OSS-Identität? **Empfehlung:** "Codevena" beibehalten — eindeutige Maintainer-Identität.

2. **Repo-Rename `forq` → `cvmake`?** Aktuell `Codevena/forq`, Tool heißt cvmake. Optional als Schritt `[2.x] gh repo rename cvmake`. **Empfehlung:** Ja, mit der Migration (low cost, GitHub redirected forq → cvmake automatisch). Entscheidung in writing-plans-Phase.

3. **Public-Toggle Timing?** Nach Phase 2 (Migration done) ODER nach Phase 10 (README/LICENSE/Screenshots auch ready)? **Empfehlung:** Nach Phase 10 — public-going erfordert Mindest-OSS-Hygiene (README, LICENSE, CONTRIBUTING).

4. **AI-Foto-Generation: Gemini im design-Skill ODER thispersondoesnotexist?** Beides geht. **Empfehlung:** Gemini via design-Skill — kontrollierter, kann Prompt-Tuning machen, klare Public-Domain-Story.

5. **PR oder direkter Commit für Phase 1?** Phase 1 hat ~30 File-Edits + Snapshot-Regeneration. **Empfehlung:** Eigener PR (`chore/personal-data-migration`) — reviewable, CI-validated, mergebar.

---

## 10. Phase-10-Readiness nach Migration

Nach Phase 2 done ist `Codevena/forq` (oder umbenannt `cvmake`) ready für Phase 10 mit clean state:

- ✅ Sample-Data showcased Tool-Capabilities (Lena Bauer + Adam Reyes über alle 8 Templates)
- ✅ README kann auf `data/cvs/example.*.yaml` verlinken als Getting-Started
- ✅ Screenshots zeigen Lena+Adam-CVs ohne Privacy-Concern
- ✅ LICENSE-File (MIT/Apache-2.0) ohne historische Personal-Data-Frage
- ✅ CONTRIBUTING.md mit "fork → copy example.de.yaml → edit → PR template-improvements" Flow

Phase 10 wird dann reine Docs/Polish-Arbeit ohne Migration-Kopfzerbrechen.

---

## Appendix — Brainstorming-Kontext

Diese Spec entstand aus einer Brainstorming-Session am 2026-05-10 nach Pfad A (PR #1 squash-merged als `22a8e2f`). Vorgänger-Doc in Master-Plan-Abschnitt "⚠️ Critical Finding (2026-04-26): Personal Data in Git History" (siehe `docs/superpowers/plans/2026-04-24-cvmake-plan.md`).

Master-Plan listete 4 Optionen (A/B/C/D); diese Spec konkretisiert Option A (filter-repo) mit zusätzlichen Decisions zu Sample-Personas, Foto-Sourcing, Docs-Scrub-Scope, und Real-Data-Storage-Pfad.

Siehe auch:
- `docs/superpowers/plans/2026-04-24-cvmake-plan.md` (Master-Plan)
- `docs/superpowers/specs/2026-04-24-cvmake-design.md` (System-Design)
- (Nachfolger) `docs/superpowers/plans/2026-05-10-personal-data-migration.md` (Implementation-Plan, kommt aus writing-plans)
