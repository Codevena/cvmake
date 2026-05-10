# Phase 9 — CI Pipeline + Visual-Regression vollständig

**Status:** Spec — bereit für Implementation Plan
**Datum:** 2026-05-10
**Branch:** `feat/cvmake-mvp`
**Predecessor:** `docs/superpowers/specs/2026-04-24-cvmake-design.md` §8 (Testing Strategy)

## 1. Summary

Erweitere die existierende GitHub-Actions-Pipeline um Tests (unit, integration, visual, e2e) und vergrößere die Visual-Regression-Matrix von 8 auf 22 Snapshots (alle Template-×-Palette-Kombinationen, Page 1). Failures sollen alle Diff-PNGs als CI-Artifact zum Download bereitstellen.

Outcomes:
- Jeder Pull Request läuft `lint + typecheck + build + test:unit + test:visual + test:e2e` automatisch in unter 8 Minuten Wallclock.
- Bei Visual-Regression-Failures liefert das CI ein ZIP mit `actual.png` + `diff.png` pro fehlgeschlagenem Snapshot.
- Lokaler Update-Flow bleibt unverändert: `UPDATE_VISUAL=1 pnpm --filter @codevena/forq-templates test:visual`.

## 2. Goals & Non-Goals

### Goals
- CI-Pipeline schützt `main` vor Regressions in Code, Tests und Template-Renderings.
- Visual-Matrix erfasst alle 22 publizierten Palette-Kombinationen pro Template (Page 1).
- Failure-UX: Reviewer sieht Diff-Bilder ohne lokal reproduzieren zu müssen.
- Reproduzierbarkeit zwischen lokalem (macOS) und CI-Rendering (Linux) wird explizit adressiert.

### Non-Goals
- Turbo Remote Cache (Phase 11+; falls Pipeline > 10 min wird).
- Multi-Page Visual-Regression (Page 2+ — separate Initiative falls Page-Break-Bugs zurückkommen).
- Cross-OS-Test-Matrix (nur Linux/`ubuntu-latest`).
- PR-Comment-Bot mit eingebetteten Diff-Bildern (Phase 10 oder später; benötigt externes Image-Hosting).
- Auto-Baseline-Update via PR-Label (zu viel Magie für OSS-Workflow).
- Visual-Regression auf Mobile-Browser oder anderen Viewports.

## 3. Decisions Made During Brainstorming

| # | Entscheidung | Begründung |
|---|---|---|
| D1 | Visual-Matrix: alle 22 Paletten × Page 1 | Erfasst Regressions in `--color-*` CSS-Custom-Properties; aktuelle 8 Snapshots verfehlen 14 Paletten |
| D2 | CI-Trigger: alle Jobs auf jedem PR | Maximale Sicherheit > schnelle Feedback-Loop; Pipeline bleibt unter 8 min |
| D3 | Failure-UX: Artifacts-Upload (`actions/upload-artifact@v4`) | Standard-Pattern, kein externes Hosting nötig |
| D4 | Update-Flow: lokal via `UPDATE_VISUAL=1` | Funktioniert für externe OSS-Contributors ohne Bot-Setup |
| D5 | Caching-Strategie: pnpm + Playwright-Browser-Cache | Standard, ~30s Overhead pro Run; Turbo Remote Cache zurückgestellt |
| D6 | CI-Struktur: Hybrid 3-Job-Layout (Approach C) | Balance zwischen Wallclock-Speed und YAML-Komplexität |
| D7 | Visual-Test-Erweiterung: Loop-in-Place pro File | Minimal-invasiv, behält bestehende Datei-Struktur |
| D8 | Threshold bleibt 0.1% (`< 0.001`) | Bei den 8 existierenden Tests bewährt; Erhöhung auf 0.5% nur wenn Cross-OS-Flakiness in CI auftritt |
| D9 | Initial-Baseline-Generierung in CI via `workflow_dispatch` | Vermeidet macOS-Linux-Diff beim ersten Run; Workflow bleibt für Mass-Updates verfügbar |
| D10 | Diff-PNG-Generierung in jedem Test-File | Reviewer kriegt Inspection-Material direkt aus Artifact ohne lokale Wiederholung |

## 4. Architektur

### 4.1 Drei-Job-Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ .github/workflows/ci.yml                                          │
│                                                                   │
│   ┌────────────────┐  ┌────────────────┐                          │
│   │ static         │  │ unit           │   parallel               │
│   │ (lint+tc+build)│  │ (test:unit)    │                          │
│   └───────┬────────┘  └────────────────┘                          │
│           │ needs                                                 │
│           ▼                                                       │
│   ┌─────────────────────────────────────┐                         │
│   │ e2e-visual                          │   Browser-heavy         │
│   │ (test:e2e + test:visual)            │   sequential nach static│
│   │ artifact upload bei failure         │                         │
│   └─────────────────────────────────────┘                         │
└──────────────────────────────────────────────────────────────────┘
```

**Job-Verantwortlichkeiten:**

| Job | Inhalt | Caches | Erwartete Runtime |
|---|---|---|---|
| `static` | `pnpm install --frozen-lockfile`, `biome check .`, `turbo run typecheck`, `turbo run build` | pnpm, turbo (lokal pro Run) | 2–3 min |
| `unit` | `pnpm install --frozen-lockfile`, `turbo run test:unit` | pnpm | 1–2 min |
| `e2e-visual` | `pnpm install`, `pnpm --filter @codevena/forq-web exec playwright install --with-deps chromium`, `turbo run test:e2e`, `turbo run test:visual`, on-failure: `actions/upload-artifact@v4` mit `__visual__/**/.actual/**` | pnpm, ms-playwright, puppeteer-chromium, turbo (build-output von `static`-Job über GH-Artifact wenn nötig — aktuell rebuild) | 4–6 min |

`e2e-visual` `needs: [static]` — verhindert Browser-Install wenn static schon Lint-Fehler zeigt. `unit` läuft parallel zu `static`.

### 4.2 Visual-Test-Erweiterung

**Aktueller Stand:** 8 Files (`packages/templates/test/visual/<id>.visual.test.ts`), je ein `it(...)` für eine Palette.

**Neuer Stand:** 8 Files, je ein `describe(...)` mit `it.each(template.palettes.map(p => p.id))(...)` der für alle 2–4 Paletten pro Template läuft.

**Vorlage (Struktur gilt für alle 8 Files; nur die Template-Import-Logik unterscheidet sich pro File — z.B. `academic.visual.test.ts` nutzt `bootstrapTemplates() + getTemplate('academic')`, `editorial.visual.test.ts` nutzt `clearRegistry() + registerTemplate(editorial)`. Diese Unterschiede bleiben in `renderPageOneAsPng()` lokal.):**

```ts
import { afterAll, describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import puppeteer from 'puppeteer';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { renderCV, wrapHtmlDocument, shutdownPdfBrowser } from '@codevena/forq-core';
import { modernMinimal } from '../../src/modern-minimal/index.js';
import { loadTemplateCss } from '../../src/css.js';
import { fullFixture } from '@codevena/forq-schema/test/fixtures.js';

const TEMPLATE = modernMinimal;
const BASELINE_DIR = path.resolve(`__tests__/__visual__/${TEMPLATE.id}`);
const ACTUAL_DIR = path.resolve(`__tests__/__visual__/${TEMPLATE.id}/.actual`);
const UPDATE = process.env.UPDATE_VISUAL === '1';
const THRESHOLD_RATIO = 0.001;

afterAll(() => shutdownPdfBrowser());

describe(`${TEMPLATE.id} visual baseline`, () => {
  it.each(TEMPLATE.palettes.map(p => p.id))(
    `matches baseline für %s`,
    async (paletteId) => {
      const png = await renderPageOneAsPng(paletteId);
      const baselinePath = path.join(BASELINE_DIR, `${paletteId}.page1.png`);
      const actualPath = path.join(ACTUAL_DIR, `${paletteId}.page1.png`);
      const diffPath = path.join(ACTUAL_DIR, `${paletteId}.page1.diff.png`);

      await mkdir(ACTUAL_DIR, { recursive: true });
      await writeFile(actualPath, png);

      if (UPDATE || !existsSync(baselinePath)) {
        await mkdir(BASELINE_DIR, { recursive: true });
        await writeFile(baselinePath, png);
        return;
      }

      const baseline = PNG.sync.read(await readFile(baselinePath));
      const actual = PNG.sync.read(png);
      const diff = new PNG({ width: baseline.width, height: baseline.height });
      const mismatched = pixelmatch(
        baseline.data, actual.data, diff.data,
        baseline.width, baseline.height,
        { threshold: 0.1 },
      );
      const total = baseline.width * baseline.height;
      const ratio = mismatched / total;

      if (ratio >= THRESHOLD_RATIO) {
        await writeFile(diffPath, PNG.sync.write(diff));
      }
      expect(ratio).toBeLessThan(THRESHOLD_RATIO);
    },
  );
});
```

`renderPageOneAsPng(paletteId)` bleibt unverändert pro File (wegen Template-Import + ggf. registry-bootstrap).

### 4.3 Initial-Baseline-Workflow

Eigener Workflow-File `.github/workflows/update-baselines.yml` mit `workflow_dispatch`-Trigger:

```yaml
name: Update Visual Baselines
on:
  workflow_dispatch:
    inputs:
      branch: { description: 'Branch to update', required: true, default: 'feat/cvmake-mvp' }
jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { ref: ${{ inputs.branch }} }
      - uses: pnpm/action-setup@v4
        with: { version: 9.12.0 }
      - uses: actions/setup-node@v4
        with: { node-version: 20.11.1, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @codevena/forq-templates build
      - run: UPDATE_VISUAL=1 pnpm --filter @codevena/forq-templates test:visual
      - uses: actions/upload-artifact@v4
        with:
          name: visual-baselines-linux
          path: packages/templates/__tests__/__visual__/**/*.png
          retention-days: 7
```

Manuell triggern via GH-UI → Artifact downloaden → Inhalt nach `packages/templates/__tests__/__visual__/` extrahieren → committen. Workflow bleibt im Repo für spätere Mass-Updates (z.B. Font-Stack-Wechsel).

## 5. Komponenten-Inventar

### 5.1 Neue Files

| Pfad | Inhalt |
|---|---|
| `.github/workflows/update-baselines.yml` | Manueller Workflow für CI-generierte Baselines |
| `packages/templates/__tests__/__visual__/<template>/<palette>.page1.png` × 14 (neu) | Baselines für die 14 bisher nicht abgedeckten Paletten |

### 5.2 Modifizierte Files

| Pfad | Änderung |
|---|---|
| `.github/workflows/ci.yml` | 3-Job-Layout (`static` / `unit` / `e2e-visual`), Browser-Cache-Steps, Artifact-Upload |
| `packages/templates/test/visual/academic.visual.test.ts` | `it.each` über alle Paletten, Diff-PNG bei Fail |
| `packages/templates/test/visual/classic-serif.visual.test.ts` | dito |
| `packages/templates/test/visual/corporate.visual.test.ts` | dito |
| `packages/templates/test/visual/creative-accent.visual.test.ts` | dito |
| `packages/templates/test/visual/editorial.visual.test.ts` | dito |
| `packages/templates/test/visual/modern-minimal.visual.test.ts` | dito |
| `packages/templates/test/visual/monochrome-dark.visual.test.ts` | dito |
| `packages/templates/test/visual/tech-dev.visual.test.ts` | dito |

### 5.3 Unverändert

- `apps/web/playwright.config.ts` (CI-detection + retries=2 schon konfiguriert).
- `apps/web/e2e/*.spec.ts` (5 Specs schon vollständig).
- `packages/templates/vitest.visual.config.ts`.
- `turbo.json` (`test:visual` und `test:e2e` schon registriert).

## 6. Data Flow

### 6.1 Standard CI-Run (PR push)

1. GH triggert workflow `ci.yml` auf `pull_request` oder `push: main`.
2. Job `static` und Job `unit` starten parallel:
   - `actions/checkout@v4` → `pnpm/action-setup@v4` → `actions/setup-node@v4` (mit pnpm-cache).
   - `pnpm install --frozen-lockfile` (cache hit: ~5s; cache miss: ~60s).
   - Job `static`: `biome check .` → `turbo run typecheck` → `turbo run build`. Gesamt ~2 min.
   - Job `unit`: `turbo run test:unit`. Gesamt ~1 min.
3. Wenn `static` grün: Job `e2e-visual` startet:
   - Standard-Setup wie oben.
   - Cache-Restore: `actions/cache` für `~/.cache/ms-playwright` und `~/.cache/puppeteer`.
   - `pnpm --filter @codevena/forq-web exec playwright install --with-deps chromium` (cache hit: ~5s; cache miss: ~120s).
   - `turbo run test:e2e` (Playwright managed `webServer: { command: 'pnpm start' }` selbst).
   - `turbo run test:visual` (Puppeteer-Singleton aus `@codevena/forq-core` rendert 22 Snapshots).
   - Bei Failure: `if: failure()` step uploadet `packages/templates/__tests__/__visual__/**/.actual/**` und `apps/web/playwright-report/` als Artifacts.
4. PR-Status zeigt 3 Checks (`static`, `unit`, `e2e-visual`); merge bei `main`-Branch erlaubt nur wenn alle 3 grün.

### 6.2 Initial-Baseline-Generierung (einmalig)

1. Spec wird gemerged, Tests sind erweitert, aber Baselines fehlen für 14 neue Palette-Kombos. Alle existierenden 8 Baselines stammen von macOS-Generierung; Cross-OS-Diff zur Linux-CI nicht verifiziert.
2. Dev triggert `update-baselines.yml` manuell via GH-UI auf `feat/cvmake-mvp`.
3. Workflow läuft auf `ubuntu-latest`, ruft `UPDATE_VISUAL=1 pnpm test:visual`, generiert **alle 22** PNGs (überschreibt auch die 8 alten — bewusst, für Cross-OS-Konsistenz).
4. Workflow uploadet alle PNGs als Artifact.
5. Dev downloaded ZIP, extrahiert nach `packages/templates/__tests__/__visual__/`, committet "test(templates): Linux-baselines für alle 22 Palette-Kombinationen".
6. Push, CI-Run grün — Pipeline ist live.

### 6.3 Baseline-Update bei legitimer Template-Änderung

1. Dev macht Layout/Palette-Änderung lokal.
2. `pnpm --filter @codevena/forq-templates test:visual` → fail mit pixel-diff.
3. Visuelle Inspektion der `.actual/*.png` und `.actual/*.diff.png` lokal.
4. Wenn Änderung intendiert: `UPDATE_VISUAL=1 pnpm --filter @codevena/forq-templates test:visual` regeneriert macOS-Baselines lokal.
5. Commit der neuen PNGs.
6. CI auf PR fail mit OS-Diff (macOS-Baseline ≠ Linux-Render).
7. Dev triggert `update-baselines.yml` für seinen Branch → Linux-Baselines, Artifact-Download, lokal überschreiben, commit, push.
8. CI grün, merge.

> **Verbesserung für später:** Bei häufigen Template-Updates wird Schritt 6–7 lästig. Optionen für Phase 11+: (a) Skip-OS-Diff via Threshold-Erhöhung; (b) Auto-Update via PR-Label + GH-Token-Push; (c) lokale Linux-Container-Renderings via Docker.

## 7. Error Handling & Edge Cases

| Failure | Erkennung | Reaktion / Mitigation |
|---|---|---|
| Lint fail | `biome check` exit ≠ 0 | Job `static` rot; GH-Annotations zeigen Datei+Zeile; `unit` und `e2e-visual` laufen weiter (parallel) bzw. werden geblockt (`e2e-visual` `needs: static`) |
| Typecheck fail | `tsc --noEmit` exit ≠ 0 | Wie Lint |
| Build fail | `next build` / `tsc -p` exit ≠ 0 | Wie Lint |
| Unit-Test fail | Vitest exit ≠ 0 | Job `unit` rot; Logs zeigen Fail-Details |
| E2E flake | Playwright auto-retry (`retries: 2 in CI`) | Best-effort retry; bei stabilem Fail: trace + screenshot in `playwright-report/` ins Artifact |
| Visual-Diff > 0.1% | `pixelmatch` mismatch ratio | Test rot; `diff.png` geschrieben; Artifact-Upload triggert |
| Visual-Diff durch Cross-OS-Render | Wie Diff > 0.1%, oft "ganzheitlich" verteilt | Mitigation: Initial-Baselines aus CI generiert (Workflow `update-baselines.yml`); falls trotzdem flaky → Threshold-Erhöhung auf 0.5% dokumentiert in Code-Comment |
| Browser-Install-Failure | Step exit ≠ 0 (selten) | Job rot; manueller Re-Run via GH-UI; meist Network-Issue |
| Cache-Miss | `actions/cache` no-hit (Cache-Eviction nach 7 Tagen idle) | Frischer Install (~60s pnpm + ~120s Browser); Job läuft weiter |
| Out-of-Memory beim Puppeteer-Render | OOM-Kill | Mitigation: Tests laufen seriell (vitest default), nicht parallel; ein Browser-Singleton aus `@codevena/forq-core` |
| `data/cvs/cv.de.yaml`-Änderung | Snapshot-Fixtures nutzen `fullFixture` aus `@codevena/forq-schema/test/fixtures.js`, NICHT die echten YAML-Daten | Visual-Tests sind unabhängig von persönlichen Daten — kein Risiko |
| Concurrent Workflow-Runs | mehrere Pushes auf gleichen PR | GH-Actions-Default: alle laufen; bei Bedarf später `concurrency.group` mit `cancel-in-progress: true` |

## 8. Testing Strategy

### 8.1 Wie wir die neue Pipeline testen

- **Self-test des CI-Workflows:** Beim ersten Push der `ci.yml`-Änderung muss die Pipeline grün durchlaufen — manuell verifiziert via `gh run watch` und PR-Status. Es gibt keinen automatisierten Meta-Test.
- **Initial-Baseline-Verification:** Nach Generierung in CI: 22 PNGs visuell kurz inspizieren (Stichprobe pro Template), dann committen.
- **Threshold-Sanity-Check:** Nach erstem grünen CI-Run: künstlich ein Template minimal ändern (z.B. `font-size: 14.5px`), CI muss rot mit Diff-Artifact werden. Danach revert.

### 8.2 Verification-before-completion (Definition of Done)

```bash
# Lokal alle relevanten Suites
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm -r test:unit
pnpm --filter @codevena/forq-templates test:visual
pnpm --filter @codevena/forq-web test:e2e
pnpm build

# Remote: GH-Actions-Pipeline auf PR
gh run list --branch feat/cvmake-mvp --limit 3 --json conclusion,name
# erwartet: alle 3 jobs (`static`, `unit`, `e2e-visual`) = success
```

Phase 9 ist erst "done" wenn alle obigen Befehle grün laufen UND ein bewusst eingeführter Visual-Diff vom CI als Failure mit Artifact erkannt wurde.

### 8.3 Threshold und Performance-Budget

| Metrik | Target | Maximum |
|---|---|---|
| Visual-Diff-Threshold | 0.1% (`< 0.001`) | 0.5% bei nachweislicher Cross-OS-Flakiness |
| Pipeline-Wallclock | ~6 min | hard fail wenn > 15 min (dann Re-Design Caching/Parallel) |
| Job `static` | 2–3 min | 5 min |
| Job `unit` | 1–2 min | 3 min |
| Job `e2e-visual` | 4–6 min | 10 min |

## 9. Implementation Sequencing (Rough Order)

Wird im nachfolgenden Implementation-Plan-Dokument detailliert. Grobe Reihenfolge:

1. Visual-Tests von 8 Files auf `it.each`-Loop erweitern + Diff-PNG-Generierung einbauen. Lokaler Smoke-Run mit `UPDATE_VISUAL=1` füllt die 14 fehlenden Baselines auf — diese macOS-PNGs werden temporär committed um die Test-Mechanik zu validieren, in Schritt 6 aber durch Linux-Versionen überschrieben.
2. `.github/workflows/ci.yml` zu 3-Job-Layout erweitern.
3. `.github/workflows/update-baselines.yml` erstellen.
4. PR push; erwartet: `static` und `unit` grün, `e2e-visual` rot weil macOS-Baselines ≠ Linux-Render auf den meisten oder allen 22 Snapshots.
5. Workflow `update-baselines.yml` auf dem Branch triggern; Artifact mit allen 22 Linux-PNGs herunterladen.
6. Lokal `packages/templates/__tests__/__visual__/` durch die Linux-PNGs ersetzen, committen, pushen.
7. CI komplett grün. Threshold-Sanity-Check: künstliches Mini-Diff einführen, verifizieren dass CI rot wird mit Diff-Artifact, dann revert.
8. Merge nach `main`.

## 10. Out of Scope / Future Work

- **Turbo Remote Cache** — Aufschub bis Pipeline > 10 min wird; dann optional Hetzner+Minio als Self-hosted-Cache.
- **Multi-page Visual-Regression** (Page 2, 3) — separate Initiative falls Page-Break-Bugs zurückkommen.
- **Cross-OS-Test-Matrix** — aktuell nur Linux; Mac-Validation via lokales Dev.
- **PR-Comment-Bot mit eingebetteten Diff-Bildern** — benötigt externes Image-Hosting (S3, GH-Releases, imgur); nett aber nicht critical.
- **Auto-Baseline-Update via PR-Label** — verlangt GH-Token mit Push-Rechten + Bot-Identity; zu viel Magie für jetzt.
- **Snapshot-Tests parallel zu Visual-Regression** — `__tests__/<template>.snapshot.test.ts` existieren schon (Phase 4–6); orthogonal zur Visual-Pipeline.
- **Performance-Tests / Lighthouse CI** — out of scope für Phase 9.

## 11. References

- Existing CI workflow: `.github/workflows/ci.yml`
- Existing visual harness: `packages/templates/test/visual/*.visual.test.ts`
- Existing Playwright setup: `apps/web/playwright.config.ts` + `apps/web/e2e/*.spec.ts`
- Master plan: `docs/superpowers/plans/2026-04-24-cvmake-plan.md` Phase 9
- Original design: `docs/superpowers/specs/2026-04-24-cvmake-design.md` §8
