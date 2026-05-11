# Phase 10 — OSS Public Readiness

**Status:** Spec — bereit für Implementation Plan
**Datum:** 2026-05-10
**Branch:** `main` (HEAD `60806a8`)
**Predecessors:**
- `docs/superpowers/specs/2026-04-24-cvmake-design.md` §9 (OSS Strategy)
- `docs/superpowers/specs/2026-05-10-personal-data-migration-COMPLETE.md` (Migration audit)

## 1. Summary

Bringe das Repo `Codevena/cvmake` von „privat, fork-Brand `forq`" auf
„public, fork-friendly OSS unter dem Namen `cvmake`". Phase 10 deckt
ausschließlich Public-Readiness ab: Brand-Konsistenz, OSS-Standard-Files,
Template-Showcase, GitHub-Metadata. Feature-Arbeit, Distribution (npm) und
Live-Demo bleiben Phase 11+.

Outcomes:
- Voll-Rename `forq → cvmake` über alle 6 Workspace-Packages und das
  CLI-Binary.
- Repo-Root hat `LICENSE` (MIT), `README.md`, `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`.
- Alle 8 Templates haben mind. 1 Screenshot in `docs/screenshots/`.
- GitHub-Metadata (Description, Topics, Default-Branch) reflektiert
  cvmake-Brand.
- Repo ist `visibility=public`.

## 2. Goals & Non-Goals

### Goals
- Forker können `git clone Codevena/cvmake`, `pnpm install`,
  `cvmake build data/cvs/example.de.yaml` ausführen, ohne in der Doku zu
  scrollen.
- Brand-Konsistenz: kein User-visible `forq`-Reference mehr (außer
  historischen Specs/Migration-Doc, die als Audit-Trail bleiben).
- README zeigt Showcase aller 8 Templates ohne Build-Schritt.
- OSS-Standard-Files entsprechen üblichen GitHub-Erwartungen
  (License-Auto-Detect, CoC-Detection, CONTRIBUTING-Linkout).

### Non-Goals
- npm-Publish (`@codevena/cvmake-cli` etc.) — Phase 11+, sobald API stabil.
- Live-Demo-URL (`cvmake.codevena.dev` o.ä.) — Phase 11+.
- `SECURITY.md`, `.github/ISSUE_TEMPLATE/`, `.github/PULL_REQUEST_TEMPLATE.md`
  — können Phase 11 sein, falls reale Issue-Last entsteht.
- GitHub Pages, GitHub Discussions — Phase 11+.
- Renaming historischer Spec-Dateien (`2026-04-25-forq-editor-design.md`
  etc.) — bleiben unverändert für History-Accuracy.
- Renaming des `feat/cvmake-mvp`-Branches — bleibt als historischer Branch
  bestehen, sobald Default-Branch auf `main` umgestellt ist.

## 3. Decisions Made During Brainstorming

| # | Entscheidung | Begründung |
|---|---|---|
| D1 | Lizenz: **MIT** | GitHub-Description hat MIT bereits angekündigt; permissive, kurz, fork-friendly. Apache-2.0 wäre Overengineering für ein CV-Tool. |
| D2 | Rename-Scope: **Voll-Rename** (Repo + 6 Packages + CLI-Binary) | Konsistente Brand-Erfahrung für Forker. Alternative (Hybrid Repo=cvmake, CLI=forq) verwirrt mehr als sie spart. |
| D3 | Screenshot-Pipeline: **lokal generieren + committen** | Deterministisch, kein Bot-Push-auf-main, README lädt direkt von GitHub-CDN. ~1–2 MB Repo-Wachstum. |
| D4 | Render-Source: **PDF → PNG via `pdftocairo`** | Zeigt exakt was User bekommt. Da Screenshots committet werden, braucht CI keine `poppler-utils`-Dep — nur lokales Setup. |
| D5 | Coverage: **1 Screenshot pro Template** (default palette + DE) | 8 PNGs reichen fürs Showcase-Grid. Repo bleibt schlank, Pflege simpel. |
| D6 | Default-Branch-Switch: **sofort, vor Phase-10-Arbeit** | Mechanisch, side-effect-free, alle PRs targetten dann automatisch `main`. |
| D7 | Public-Toggle-Timing: **direkt nach Phase 10** | Kein „Soak-Period"-Mehrwert; CI ist seit Phase 9 stabil. |
| D8 | Demo-URL: **out-of-scope** | Hosting-Entscheidung (Hetzner/Coolify vs. Edge) verdient eigenen Plan. README zeigt Screenshots + Quickstart-Snippet, das reicht. |
| D9 | npm-Publish: **out-of-scope** | Distribution-Komplexität (Versioning, Tokens, Lockstep-Releases zwischen 6 Packages) gehört nicht in Public-Readiness. |
| D10 | Migration-Doc: **behalten** | Zeigt sorgfältiges History-Audit, fördert Forker-Vertrauen. Sub-Step in §9 prüft auf sensible Pfade. |
| D11 | README-Badges: License + CI-Status + Tech-Stack (Next.js, TypeScript) | „Made with Claude Code" verworfen — polarisiert, optional. |
| D12 | CONTRIBUTING-Stil: **knapp + pragmatisch** | Ein Screen lang, kein „first-time-contributor"-Walkthrough. Keine Referenz auf `CLAUDE.md`-DoD (Markus-internal). |
| D13 | CoC-Kontakt: `hello@codevena.dev` | Dedizierte Adresse, sauber getrennt von Privat-Email. **Externe Voraussetzung:** Adresse muss vor Public-Toggle erreichbar sein. |
| D14 | Out-of-Scope-Items als **Phase-11-Kandidaten** dokumentiert | Klare Erwartungshaltung; Phase 10 schließt nicht jeden OSS-Wunsch. |

## 4. Reihenfolge der Schritte

Die Sequenz ergibt sich aus Dependencies (Rename → Docs schreiben sich
einmal richtig; LICENSE → README kann Badge ziehen; Screenshots → README
kann sie einbinden).

```
1. Default-Branch flip (gh CLI; mechanisch, vor Code-Arbeit)
2. Package-Rename forq → cvmake (foundational)
3. LICENSE (MIT, Copyright 2026 Markus Wiesecke / Codevena)
4. Screenshot-Pipeline + 8 PNG-Assets
5. README.md
6. CONTRIBUTING.md
7. CODE_OF_CONDUCT.md (Contributor Covenant 2.1, hello@codevena.dev)
8. GitHub-Metadata (Description, Topics)
9. Pre-Public Audit + Public-Toggle
```

## 5. Per-Step Architektur

### 5.1 Step 1 — Default-Branch flip

Einmal-Aktion via `gh repo edit Codevena/cvmake --default-branch main`.
Voraussetzung: lokaler `main` ist mit `origin/main` synchronisiert (✓
HEAD `60806a8`). Keine Side-Effects auf existierende Refs; GitHub
redirected alte URLs.

### 5.2 Step 2 — Package-Rename `forq → cvmake`

#### Zu ändernde Stellen
- Root `package.json` `"name"`: `forq` → `cvmake`
- 6 Sub-Packages in `apps/{cli,web}/package.json` und
  `packages/{core,schema,ui,templates}/package.json`:
  `@codevena/forq-{cli,core,schema,ui,templates,web}` →
  `@codevena/cvmake-{cli,core,schema,ui,templates,web}`
- CLI `bin`-Eintrag in `apps/cli/package.json`: `"forq": "..."` →
  `"cvmake": "..."`
- Alle `import`-Pfade quer durch `apps/`, `packages/`, `tests/`
- Scripts in jeder `package.json`, die `pnpm --filter
  @codevena/forq-*` benutzen
- `pnpm-lock.yaml` regenerieren via `pnpm install` nach dem Rename
- Turbo-Cache invalidieren: `pnpm clean` vor erstem Build
- CI-Workflow `.github/workflows/ci.yml`: alle `--filter`-Argumente
  aktualisieren
- README/Docs/Spec-Snippets — siehe Klassifizierungs-Regel unten

#### Klassifizierungs-Regel (für `rg -i forq`-Audit)

| Kategorie | Behandlung |
|---|---|
| User-visible Brand-Refs (CLI-Binary-Name, Package-Names, env-Var-Prefix `FORQ_*`, Config-Datei-Name `forq.config.yaml` falls existiert) | → `cvmake` |
| Doc/Spec-Anker, die das aktuelle Tool beschreiben | → `cvmake` |
| Historische Specs/Migration-Doc/CHANGELOG-Einträge | unverändert (history accuracy) |
| Lokale Variable, internes Symbol namens `forq` | unverändert (kein User-Benefit, nur Diff-Lärm) |
| Backup-Pfade in Migration-Doc (`~/cvmake-backup-…`) | bereits cvmake-named, nichts zu tun |

#### Verifikation
- `pnpm clean && pnpm install`
- `pnpm typecheck && pnpm build`
- `pnpm -r test:unit` (178 Tests grün)
- Manueller Smoke-Test: `pnpm --filter @codevena/cvmake-cli exec cvmake
  build data/cvs/example.de.yaml` → PDF in `dist/`

### 5.3 Step 3 — LICENSE

Datei `LICENSE` am Repo-Root, Inhalt = MIT-Standardtext (osi-approved
template), Copyright-Zeile:

```
Copyright (c) 2026 Markus Wiesecke / Codevena
```

GitHub erkennt MIT automatisch und zeigt Badge im Repo-Header an.

### 5.4 Step 4 — Screenshot-Pipeline

#### Script
Neues File: `scripts/render-screenshots.ts` (oder `.mjs`), Aufruf via
neues Root-Script `pnpm screenshots`.

Pseudo-Logik:
```
templates = listAllTemplates()    // 8 Stück
for template in templates:
  pdfPath = `dist/screenshots/${template}.pdf`
  pngPath = `docs/screenshots/${template}.png`
  buildPDF(template, "default-palette", "data/cvs/example.de.yaml") → pdfPath
  pdfToPng(pdfPath, page=1, dpi=150) → pngPath  // pdftocairo unter der Haube
  cropToFirstPage(pngPath)  // falls pdftocairo mehrere Seiten ausgibt
cleanup dist/screenshots/  // intermediate PDFs nicht committen
```

Output-Layout: `docs/screenshots/<template>.png` (flache Hierarchie,
da nur 1 PNG pro Template).

#### Externe Abhängigkeit
`pdftocairo` aus `poppler-utils`. Nicht in CI nötig (Screenshots werden
committed). Lokales Setup wird in CONTRIBUTING.md §"Screenshots
regenerieren" dokumentiert: `brew install poppler` (macOS) bzw.
`apt install poppler-utils` (Linux).

#### Re-Render-Strategie
Manuell, on-demand. Kein pre-commit-Hook (würde Forker zwingen `poppler`
zu installieren). Wenn ein Template-Layout ändert: Maintainer ruft
`pnpm screenshots`, committed das Diff.

### 5.5 Step 5 — README.md

#### Sections (in dieser Reihenfolge)
1. **Hero**
   - H1 `cvmake`
   - Tagline: „fork-friendly OSS CV builder. YAML in, PDF out."
   - Badges: License (shields.io/MIT), CI-Status (GitHub-Actions),
     Tech-Stack (Next.js, TypeScript)
2. **Showcase** — 8 Template-Screenshots als Markdown-Grid (2×4 oder
   4×2), jedes mit Template-Name als Caption
3. **Why cvmake** — 3–4 Bullets (YAML als Source of Truth, multilingual,
   8 Templates, CLI + Web)
4. **Quickstart**
   ```
   git clone https://github.com/Codevena/cvmake
   cd cvmake
   pnpm install
   cp data/cvs/example.de.yaml data/cvs/cv.de.yaml
   pnpm --filter @codevena/cvmake-cli exec cvmake build data/cvs/cv.de.yaml
   ```
5. **Templates** — Liste + One-Liner pro Template
6. **Tech Stack** — kurzer Bullet-Block
7. **Contributing** — Linkout zu `CONTRIBUTING.md`
8. **License** — „MIT — see LICENSE"

### 5.6 Step 6 — CONTRIBUTING.md

#### Sections (Knapp + pragmatisch)
1. **Setup** — `pnpm install`, Node-Version-Hinweis
2. **Fork-Pattern** — `cp data/cvs/example.de.yaml data/cvs/cv.de.yaml`,
   Hinweis dass `cv.*.yaml` gitignored ist
3. **Branch-Convention** — `feat/`, `fix/`, `chore/`, `docs/`
4. **Tests vor PR** — `pnpm typecheck && pnpm build && pnpm -r test:unit`
5. **Visual-Regression** — Hinweis auf `pnpm test:visual` und
   `UPDATE_VISUAL=1` für Snapshot-Updates
6. **Screenshots regenerieren** — falls Template-Änderung: `brew install
   poppler && pnpm screenshots`
7. **PR-Erwartung** — kurz, fokussiert, ein Topic pro PR

Keine Referenz auf `CLAUDE.md`-DoD (das ist Markus-internal,
nicht-OSS).

### 5.7 Step 7 — CODE_OF_CONDUCT.md

Contributor Covenant 2.1 verbatim, Kontakt-Adresse:
`hello@codevena.dev`. **Externe Voraussetzung (siehe §6):** Adresse muss
erreichbar sein bevor Public-Toggle.

### 5.8 Step 8 — GitHub-Metadata

Via `gh repo edit Codevena/cvmake`:
- `--description "cvmake — fork-friendly OSS CV builder. YAML in, PDF out. 8 templates, CLI + web UI."`
- `--add-topic cv,resume,yaml,pdf,nextjs,typescript,oss,cli`
- Homepage: leer lassen (per D8)

GitHub License-Auto-Detection läuft, sobald LICENSE-Datei auf `main`
liegt.

### 5.9 Step 9 — Pre-Public Audit + Public-Toggle

#### Audit-Sub-Steps
1. `rg -i 'markus\|wiesecke\|@gmail'` über Repo (außer `.git/`,
   `node_modules/`, `dist*/`). Erwartet: Hits nur in
   - `LICENSE` (Copyright-Zeile)
   - `CODE_OF_CONDUCT.md` (Kontakt)
   - Migration-Doc (historisch, OK)
   - Spec-Files mit Markus' Name als Author (OK)
   Jeder unerwartete Hit wird redaktiert.
2. Re-Read `2026-05-10-personal-data-migration-COMPLETE.md` auf sensible
   Backup-Pfade. Falls Pfade ein Sicherheitsproblem darstellen → kürzen.
   (Erwartung: ist OK, da Pfade lokal-only sind.)
3. Verify `hello@codevena.dev` ist erreichbar (Test-Mail).
4. Final-Build: `pnpm clean && pnpm install && pnpm typecheck && pnpm
   build && pnpm -r test:unit`. Alles grün.

#### Toggle
`gh repo edit Codevena/cvmake --visibility public --accept-visibility-change-consequences`

#### Post-Toggle Smoke-Test
- Anonymes Browser-Window: `https://github.com/Codevena/cvmake` lädt.
- `git clone https://github.com/Codevena/cvmake /tmp/cvmake-test` ohne
  Auth → funktioniert.

## 6. Risiken & Mitigationen

| Risiko | Mitigation |
|---|---|
| Package-Rename bricht Imports / lockfile / turbo-cache | Gate-Step nach Rename: `pnpm clean && pnpm install && pnpm build && pnpm typecheck && pnpm -r test:unit` muss grün sein, bevor Step 3 beginnt |
| `pdftocairo` fehlt auf Markus' System | Vor Step 4: `brew install poppler`. Falls Skript-Lauf scheitert → Setup nachholen |
| Personal-Data-Reste in Files die wir touchen | §5.9 Sub-Step 1 fängt das ab (`rg -i`-Audit) |
| Migration-Doc enthält sensible Backup-Pfade | §5.9 Sub-Step 2 (manuelles Re-Read) |
| `hello@codevena.dev` nicht erreichbar | §5.9 Sub-Step 3 (Test-Mail) blockiert Toggle |
| Default-Branch-Switch killt offene PRs | Aktuell **keine offenen PRs** auf GitHub → null Risiko |
| Externe Voraussetzung: Email | Markus muss `hello@codevena.dev` einrichten/verifizieren — nicht Teil der Code-Tasks, aber blockiert Step 9 |

## 7. Definition of Done

1. ✅ `pnpm --filter @codevena/cvmake-cli exec cvmake build data/cvs/example.de.yaml` rendert PDF (CLI-Rename verifiziert)
2. ✅ `pnpm typecheck && pnpm build && pnpm -r test:unit` grün (178 Tests)
3. ✅ Repo-Root hat `LICENSE`, `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`
4. ✅ `docs/screenshots/<template>.png` für alle 8 Templates vorhanden
5. ✅ GitHub: Description gesetzt, 8 Topics, default-branch=`main`, license auto-detected = MIT
6. ✅ `rg -i 'markus\|wiesecke\|@gmail'`-Audit clean (nur erwartete Hits)
7. ✅ `gh repo view Codevena/cvmake --json visibility` → `PUBLIC`
8. ✅ 4-Agent-DoD-Review (Codex×2 + Claude×2) auf finalem State

## 8. Out-of-Scope (Phase 11 Kandidaten)

- npm-Publish (`@codevena/cvmake-*` auf npm, `npx cvmake init`)
- Live-Demo-URL (`cvmake.codevena.dev` oder GitHub-Pages-Variante)
- `SECURITY.md`
- `.github/ISSUE_TEMPLATE/` + `.github/PULL_REQUEST_TEMPLATE.md`
- GitHub Discussions
- GitHub Pages (statische Showcase-Site)
- Cleanup von `feat/cvmake-mvp` Branch (historisch, kann separater Cleanup
  sein)
- `/tmp/forq-rewrite` Cleanup (per Migration-Plan §34.1, ab ~12.05.2026)

## 9. Externe Voraussetzungen

Diese Items sind nicht Teil der Code-Tasks, blockieren aber Step 9
(Public-Toggle):
- `hello@codevena.dev` muss eingerichtet und erreichbar sein
- `poppler-utils` lokal installiert (für Screenshot-Generierung in Step 4)

## 10. Referenzen

- `docs/superpowers/specs/2026-04-24-cvmake-design.md` §9 (OSS Strategy)
- `docs/superpowers/specs/2026-05-10-personal-data-migration-COMPLETE.md`
- `NEXT_SESSION.md` — Quelle für die 8 Open Questions
- `MEMORY.md` — User-Profile, Project-Scope
- Contributor Covenant 2.1: https://www.contributor-covenant.org/version/2/1/code_of_conduct/
