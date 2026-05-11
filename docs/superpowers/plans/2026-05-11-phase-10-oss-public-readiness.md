# Phase 10 — OSS Public Readiness Implementation Plan

> **Status: COMPLETE (2026-05-11).** PR #4 squash-merged to `main` (`f50a9ca`). Repo `Codevena/cvmake` is now PUBLIC with MIT license auto-detected, 8 topics, and 8 template screenshots. Completion notes at the end of this document.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `Codevena/cvmake` from private + legacy brand `forq` to public + fork-friendly OSS as `cvmake` — full package rename, OSS standard files (LICENSE/README/CONTRIBUTING/CoC), 8 template screenshots, GitHub metadata, public visibility toggle.

**Architecture:** Single branch `feat/phase-10-oss-public-readiness` containing all code changes (Tasks 1–7). One PR squash-merged to `main`. GitHub-only operations (default-branch flip, metadata, public toggle) run via `gh` outside the branch. External email verification (`hello@codevena.dev`) gates the public toggle.

**Tech Stack:** pnpm 9 + Turbo workspace, Node 20.11, Next.js 16, TypeScript 5.6, Puppeteer (PDF), `pdftocairo` from poppler-utils (PDF→PNG for screenshots, local-only — not in CI).

**Source spec:** `docs/superpowers/specs/2026-05-10-phase-10-oss-public-readiness-design.md`

---

## File Inventory

### Files created (new)
- `LICENSE` — MIT, copyright 2026 Markus Wiesecke / Codevena
- `README.md` — Hero + Showcase + Quickstart + Templates + Tech + Contributing + License
- `CONTRIBUTING.md` — terse setup + fork pattern + branch convention + test commands
- `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1, contact `hello@codevena.dev`
- `scripts/render-screenshots.mjs` — orchestrates `cvmake build` + `pdftocairo` per template
- `docs/screenshots/academic.png`
- `docs/screenshots/classic-serif.png`
- `docs/screenshots/corporate.png`
- `docs/screenshots/creative-accent.png`
- `docs/screenshots/editorial.png`
- `docs/screenshots/modern-minimal.png`
- `docs/screenshots/monochrome-dark.png`
- `docs/screenshots/tech-dev.png`

### Files renamed (filesystem move)
- `apps/cli/bin/forq` → `apps/cli/bin/cvmake`

### Files modified — package metadata
- `package.json` — `"name": "forq"` → `"cvmake"`, add `"screenshots"` script, add `tsx`/`zx` not needed (mjs only)
- `apps/cli/package.json` — name + bin + deps
- `apps/web/package.json` — name + deps
- `packages/core/package.json` — name + deps
- `packages/schema/package.json` — name only
- `packages/templates/package.json` — name + deps
- `packages/ui/package.json` — name + deps
- `pnpm-lock.yaml` — regenerated via `pnpm install`

### Files modified — imports + source refs
- `apps/cli/src/index.ts` — `program.name('forq')...` → `program.name('cvmake')...`
- `apps/cli/src/commands/build.ts` — import paths
- `apps/cli/src/commands/list-templates.ts` — import paths
- `apps/cli/src/commands/validate.ts` — import paths
- `apps/cli/test/build.integration.test.ts` — import paths (tmp-prefix `'forq-cli-'` stays per spec §5.2 classification: internal symbol)
- All `apps/web/**/*.ts(x)` with `@codevena/forq-*` imports
- All `packages/**/*.ts(x)` with `@codevena/forq-*` imports
- `apps/web/app/globals.css` — `@import "@codevena/forq-ui/styles/tailwind.css"` → `cvmake-ui`

### Files modified — CI
- `.github/workflows/ci.yml` — every `pnpm --filter @codevena/forq-*` argument

### Files left unchanged (per spec §5.2 classification rule)
- `docs/superpowers/specs/2026-04-25-forq-editor-design.md`
- `docs/superpowers/specs/2026-04-25-forq-ui-design.md`
- `docs/superpowers/specs/2026-04-25-naming-decision.md`
- `docs/superpowers/specs/2026-05-10-personal-data-migration-COMPLETE.md`
- `docs/superpowers/plans/2026-04-24-cvmake-plan.md`
- `docs/superpowers/plans/2026-04-25-forq-editor.md`
- `docs/superpowers/plans/2026-04-25-forq-ui.md`
- `docs/superpowers/plans/2026-05-10-personal-data-migration.md`
- `docs/superpowers/plans/2026-05-10-phase9-ci-visual-regression.md`
- `docs/superpowers/specs/2026-05-10-phase9-ci-visual-regression-design.md`
- `docs/template-review-2026-04-25.md` — describes pre-rename state, classified historical

---

## Task 0: Pre-Flight Checks & Branch Setup

**Goal:** verify external prerequisites, perform the GitHub default-branch flip (spec Step 1), create the feature branch.

**Files:** none (GitHub + local git only)

- [x] **Step 1: Verify external prereqs**

Run all four; each must succeed:

```bash
gh auth status                              # logged in
gh repo view Codevena/cvmake --json visibility,defaultBranchRef
which pdftocairo && pdftocairo -v 2>&1 | head -1
node -v                                     # >= 20.11.0
```

Expected:
- `gh` logged in as Codevena
- `visibility` = `PRIVATE`, `defaultBranchRef.name` = `feat/cvmake-mvp`
- `pdftocairo` present (any version)
- Node ≥ 20.11

- [x] **Step 2: Confirm no open PRs (default-branch flip safety)**

```bash
gh pr list --repo Codevena/cvmake --state open
```

Expected: empty list. If non-empty: STOP, ask user — flipping default-branch with open PRs may retarget them.

- [x] **Step 3: Sync local main**

```bash
git checkout main
git pull --ff-only origin main
git status
```

Expected: clean, up-to-date with `origin/main`, HEAD = `92683c3` or later.

- [x] **Step 4: Flip default branch on GitHub (spec Step 1)**

```bash
gh repo edit Codevena/cvmake --default-branch main
gh repo view Codevena/cvmake --json defaultBranchRef
```

Expected: `defaultBranchRef.name` = `main`.

- [x] **Step 5: Create feature branch**

```bash
git checkout -b feat/phase-10-oss-public-readiness
git status
```

Expected: on `feat/phase-10-oss-public-readiness`, clean tree.

**DoD:** GitHub default branch = `main`; local branch `feat/phase-10-oss-public-readiness` exists and is checked out.

---

## Task 1: Package Rename `forq → cvmake` (spec Step 2)

**Goal:** rename all 6 workspace packages, the CLI binary, and every internal import from `forq` to `cvmake`. Lockfile regenerated, all 178 unit tests still green.

This is the largest single change. Execute sub-steps a–g sequentially; commit only after sub-step g passes.

### Sub-step 1a: Root `package.json`

**File:** `package.json`

- [x] **Step 1: Change `"name"` field**

Edit: `"name": "forq"` → `"name": "cvmake"`

(No other root-package changes here — the `pnpm screenshots` script comes in Task 3.)

### Sub-step 1b: Six workspace package names + dependencies

For each of the six `package.json` files below, rename:
- `"name": "@codevena/forq-XXX"` → `"name": "@codevena/cvmake-XXX"`
- Every `"@codevena/forq-XXX": "workspace:*"` dependency → `"@codevena/cvmake-XXX": "workspace:*"`

Files (full list):
- `apps/cli/package.json`
- `apps/web/package.json`
- `packages/core/package.json`
- `packages/schema/package.json`
- `packages/templates/package.json`
- `packages/ui/package.json`

- [x] **Step 1: Apply name + deps rename to all six**

After: `rg '@codevena/forq-' apps packages -t json` returns nothing.

### Sub-step 1c: CLI binary + program metadata

**Files:**
- Modify: `apps/cli/package.json` (`"bin"` block)
- Rename: `apps/cli/bin/forq` → `apps/cli/bin/cvmake`
- Modify: `apps/cli/src/index.ts:7`

- [x] **Step 1: Rename the binary file**

```bash
git mv apps/cli/bin/forq apps/cli/bin/cvmake
```

- [x] **Step 2: Update `"bin"` entry in `apps/cli/package.json`**

Change: `"bin": { "forq": "./bin/forq" }` → `"bin": { "cvmake": "./bin/cvmake" }`

- [x] **Step 3: Update CLI program name in `apps/cli/src/index.ts`**

Change:
```ts
program.name('forq').description('forq CLI — fork-friendly OSS CV builder').version('0.0.0');
```
to:
```ts
program.name('cvmake').description('cvmake — fork-friendly OSS CV builder. YAML in, PDF out.').version('0.0.0');
```

### Sub-step 1d: Import paths across the monorepo

Mechanical bulk rename of every `@codevena/forq-*` import to `@codevena/cvmake-*`.

- [x] **Step 1: List affected files**

```bash
rg -l '@codevena/forq-' apps packages
```

Expected output: ~50 files across `apps/cli/src/`, `apps/web/`, `packages/core/src/`, `packages/templates/src/`, `packages/ui/src/`, plus test files.

- [x] **Step 2: Bulk replace**

Two ways — pick one:

**Option A (sd, if installed):**
```bash
rg -l '@codevena/forq-' apps packages | xargs sd '@codevena/forq-' '@codevena/cvmake-'
```

**Option B (sed, portable):**
```bash
rg -l '@codevena/forq-' apps packages | xargs sed -i '' 's|@codevena/forq-|@codevena/cvmake-|g'
```

(`-i ''` is BSD-sed for macOS. On Linux use `-i` without the empty string.)

- [x] **Step 3: Update CSS import**

**File:** `apps/web/app/globals.css`

Change: `@import "@codevena/forq-ui/styles/tailwind.css";` → `@import "@codevena/cvmake-ui/styles/tailwind.css";`

(The bulk replace in Step 2 covers it if scoped widely, but verify globals.css is included.)

- [x] **Step 4: Verify zero `@codevena/forq-` left in source**

```bash
rg '@codevena/forq-' apps packages
```

Expected: no matches.

### Sub-step 1e: CI workflow

**File:** `.github/workflows/ci.yml`

- [x] **Step 1: Replace every `@codevena/forq-` with `@codevena/cvmake-`**

```bash
sed -i '' 's|@codevena/forq-|@codevena/cvmake-|g' .github/workflows/ci.yml
rg '@codevena/forq-' .github/
```

Expected: no matches.

### Sub-step 1f: Lockfile + Turbo cache refresh

- [x] **Step 1: Wipe turbo cache + reinstall**

```bash
pnpm clean              # turbo run clean + rm -rf node_modules
pnpm install
```

Expected: pnpm resolves the new `@codevena/cvmake-*` workspace names, regenerates `pnpm-lock.yaml`. No `ERR_PNPM_*` errors.

- [x] **Step 2: Sanity-check the new lockfile**

```bash
rg '@codevena/forq-' pnpm-lock.yaml
rg '@codevena/cvmake-' pnpm-lock.yaml | head -5
```

Expected: zero forq matches; cvmake matches present.

### Sub-step 1g: `rg -i forq` audit (spec §5.2 classification)

Goal: every remaining `forq` reference must fall into the “unchanged” categories from the spec’s classification table.

- [x] **Step 1: Run the audit**

```bash
rg -i 'forq' --glob '!node_modules' --glob '!.git' --glob '!dist' --glob '!.next' --glob '!.turbo' --glob '!pnpm-lock.yaml' --glob '!.review*'
```

- [x] **Step 2: Classify every hit**

Expected hits fall into these buckets (all left unchanged):

| Bucket | Examples |
|---|---|
| Historical specs / plans | `docs/superpowers/specs/2026-04-25-forq-editor-design.md`, `2026-04-25-forq-ui-design.md`, `2026-04-25-naming-decision.md`, `2026-05-10-personal-data-migration-COMPLETE.md`, `docs/superpowers/plans/2026-04-25-*.md`, `2026-05-10-personal-data-migration.md`, `2026-05-10-phase9-ci-visual-regression*.md` |
| Pre-rename template review | `docs/template-review-2026-04-25.md` |
| Internal symbol (test tmp-prefix) | `apps/cli/test/build.integration.test.ts` — `mkdtemp(..., 'forq-cli-')` |
| The phase-10 spec itself | `docs/superpowers/specs/2026-05-10-phase-10-oss-public-readiness-design.md` (describes the rename) |
| This plan | `docs/superpowers/plans/2026-05-11-phase-10-oss-public-readiness.md` |

Any hit outside these buckets is a bug — fix before proceeding.

### Sub-step 1h: Verification gate

All four commands must succeed back-to-back.

- [x] **Step 1: Typecheck**

```bash
pnpm typecheck
```

Expected: green, zero TypeScript errors across all 6 packages.

- [x] **Step 2: Build**

```bash
pnpm build
```

Expected: green, all package `dist/` artifacts produced.

- [x] **Step 3: Unit tests**

```bash
pnpm -r test:unit
```

Expected: 178 tests passing (schema 9 + core 16 + ui 38 + templates 46 + cli 2 + web 67).

- [x] **Step 4: CLI smoke test with new binary name**

```bash
pnpm --filter @codevena/cvmake-cli exec cvmake build data/cvs/example.de.yaml --output /tmp/cvmake-smoke.pdf
ls -lh /tmp/cvmake-smoke.pdf
```

Expected: PDF file ≥ 20 KB exists.

### Sub-step 1i: Commit

- [x] **Step 1: Stage the rename atomically and commit**

```bash
git add -A
git status
```

Review staged files (should be ~60 modified, 1 renamed binary, lockfile updated). Then:

```bash
git commit -m "$(cat <<'EOF'
chore: rename forq → cvmake across workspace

Renames all 6 workspace packages (@codevena/forq-* → @codevena/cvmake-*),
the CLI binary (forq → cvmake), and every internal import path. Updates
CI workflow filter args and regenerates pnpm-lock.yaml. Historical specs,
plans, the personal-data migration doc, and the internal test tmp-prefix
remain unchanged per phase-10 spec §5.2 classification rule.

Verification: pnpm typecheck + build + -r test:unit all green; CLI smoke
build with new binary name produces PDF.
EOF
)"
```

**DoD:**
- `pnpm --filter @codevena/cvmake-cli exec cvmake build data/cvs/example.de.yaml --output /tmp/x.pdf` produces a PDF
- `pnpm typecheck && pnpm build && pnpm -r test:unit` all green (178 tests)
- `rg '@codevena/forq-' apps packages .github` returns zero matches
- Single commit on `feat/phase-10-oss-public-readiness`

---

## Task 2: LICENSE (spec Step 3)

**Goal:** add MIT license at repo root so GitHub auto-detects it.

**Files:**
- Create: `LICENSE`

- [x] **Step 1: Write LICENSE file**

Use the OSI-approved MIT template with copyright line:

```
MIT License

Copyright (c) 2026 Markus Wiesecke / Codevena

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [x] **Step 2: Verify**

```bash
test -f LICENSE && head -3 LICENSE
wc -l LICENSE
```

Expected: file exists, ~21 lines.

- [x] **Step 3: Commit**

```bash
git add LICENSE
git commit -m "docs: add MIT LICENSE"
```

**DoD:** `LICENSE` file at repo root with MIT text and 2026 copyright line.

---

## Task 3: Screenshot Pipeline (spec Step 4)

**Goal:** produce one PNG per template (8 total) at `docs/screenshots/<template>.png`, generated locally via PDF → pdftocairo.

**Files:**
- Create: `scripts/render-screenshots.mjs`
- Modify: `package.json` (add `"screenshots"` script)
- Create: `docs/screenshots/*.png` (8 files)
- Modify: `.gitignore` (allow `dist/screenshots/` to be ignored; should already be covered by `dist/`)

### Default-palette concretization (was open in spec §5.4)

Use the first palette in each template’s `palettes` array. Concrete IDs (verified from `packages/templates/src/<tpl>/palettes.ts`):

| Template | Default palette ID |
|---|---|
| academic | `academic-slate` |
| classic-serif | `classic-grey` |
| corporate | `corporate-graphite` |
| creative-accent | `creative-citrus` |
| editorial | `editorial-paper` |
| modern-minimal | `minimal-ink` |
| monochrome-dark | `mono-carbon` |
| tech-dev | `tech-terminal` |

Hardcode this list in the script — avoids importing the TS templates package from a `.mjs` file.

- [x] **Step 1: Verify `pdftocairo` available**

```bash
which pdftocairo
```

Expected: `/opt/homebrew/bin/pdftocairo` (or similar). If missing: `brew install poppler` first.

- [x] **Step 2: Write `scripts/render-screenshots.mjs`**

Create the file with this content:

```js
#!/usr/bin/env node
// Renders one PNG per template into docs/screenshots/.
// External dep: pdftocairo (poppler-utils). brew install poppler / apt install poppler-utils.

import { execSync } from 'node:child_process';
import { mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const TEMPLATES = [
  { id: 'academic',        palette: 'academic-slate'    },
  { id: 'classic-serif',   palette: 'classic-grey'      },
  { id: 'corporate',       palette: 'corporate-graphite'},
  { id: 'creative-accent', palette: 'creative-citrus'   },
  { id: 'editorial',       palette: 'editorial-paper'   },
  { id: 'modern-minimal',  palette: 'minimal-ink'       },
  { id: 'monochrome-dark', palette: 'mono-carbon'       },
  { id: 'tech-dev',        palette: 'tech-terminal'     },
];

const PDF_DIR = 'dist/screenshots';
const PNG_DIR = 'docs/screenshots';
const YAML    = 'data/cvs/example.de.yaml';

await mkdir(PDF_DIR, { recursive: true });
await mkdir(PNG_DIR, { recursive: true });

for (const { id, palette } of TEMPLATES) {
  const pdfPath = path.join(PDF_DIR, `${id}.pdf`);
  const pngBase = path.join(PNG_DIR, id); // pdftocairo -singlefile appends .png

  console.log(`\n→ ${id} (${palette})`);

  execSync(
    `pnpm --filter @codevena/cvmake-cli exec cvmake build ${YAML} ` +
    `--template ${id} --palette ${palette} --output ${pdfPath}`,
    { stdio: 'inherit' },
  );

  execSync(
    `pdftocairo -png -r 150 -f 1 -l 1 -singlefile ${pdfPath} ${pngBase}`,
    { stdio: 'inherit' },
  );

  const info = await stat(`${pngBase}.png`);
  if (info.size < 10_000) {
    throw new Error(`${id}.png suspiciously small (${info.size} bytes)`);
  }
  console.log(`  ✓ ${pngBase}.png  (${(info.size / 1024).toFixed(0)} KB)`);
}

await rm(PDF_DIR, { recursive: true });
console.log('\nAll 8 screenshots rendered.');
```

- [x] **Step 3: Add root `screenshots` script**

**File:** `package.json`

Add to the `"scripts"` object:

```json
"screenshots": "node scripts/render-screenshots.mjs"
```

- [x] **Step 4: Run the script**

```bash
pnpm screenshots
```

Expected: 8 ✓ lines, no errors, `dist/screenshots/` removed at end.

- [x] **Step 5: Verify outputs**

```bash
ls -lh docs/screenshots/
```

Expected: 8 PNGs, each between ~50 KB and ~500 KB, named exactly:
- `academic.png`
- `classic-serif.png`
- `corporate.png`
- `creative-accent.png`
- `editorial.png`
- `modern-minimal.png`
- `monochrome-dark.png`
- `tech-dev.png`

- [x] **Step 6: Spot-check one PNG visually**

Open `docs/screenshots/tech-dev.png` in the OS image viewer. Confirm it’s a CV page (not blank, not corrupted).

- [x] **Step 7: Commit**

```bash
git add scripts/render-screenshots.mjs package.json docs/screenshots/
git commit -m "feat: add screenshot pipeline + 8 template PNGs

Adds scripts/render-screenshots.mjs that orchestrates cvmake build +
pdftocairo per template. New root script: pnpm screenshots. Output:
docs/screenshots/<template>.png (8 files, ~150 KB each). External dep
pdftocairo is local-only (assets are committed, CI does not regenerate).
Documented in CONTRIBUTING.md."
```

**DoD:** `pnpm screenshots` is idempotent; `ls docs/screenshots/*.png | wc -l` = 8; each PNG ≥ 10 KB.

---

## Task 4: README.md (spec Step 5)

**Goal:** root README with hero, 8-template showcase grid, quickstart, templates list, tech stack, links to CONTRIBUTING + LICENSE.

**Files:**
- Create: `README.md`

- [x] **Step 1: Write README**

Create `README.md` with this content:

```markdown
# cvmake

> fork-friendly OSS CV builder. YAML in, PDF out.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/Codevena/cvmake/actions/workflows/ci.yml/badge.svg)](https://github.com/Codevena/cvmake/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?logo=typescript&logoColor=white)

---

## Showcase

| | | | |
|---|---|---|---|
| ![academic](docs/screenshots/academic.png)<br/>**academic** | ![classic-serif](docs/screenshots/classic-serif.png)<br/>**classic-serif** | ![corporate](docs/screenshots/corporate.png)<br/>**corporate** | ![creative-accent](docs/screenshots/creative-accent.png)<br/>**creative-accent** |
| ![editorial](docs/screenshots/editorial.png)<br/>**editorial** | ![modern-minimal](docs/screenshots/modern-minimal.png)<br/>**modern-minimal** | ![monochrome-dark](docs/screenshots/monochrome-dark.png)<br/>**monochrome-dark** | ![tech-dev](docs/screenshots/tech-dev.png)<br/>**tech-dev** |

## Why cvmake

- **YAML as the source of truth** — your CV is a plain text file you can diff, version, and grep.
- **Multilingual** — author in `cv.de.yaml`, `cv.en.yaml`, etc., switch via CLI flag.
- **8 polished templates** — academic, classic-serif, corporate, creative-accent, editorial, modern-minimal, monochrome-dark, tech-dev — each with multiple palettes.
- **CLI + Web UI** — render PDFs from the terminal or edit live in the browser preview.

## Quickstart

```bash
git clone https://github.com/Codevena/cvmake
cd cvmake
pnpm install

# Copy the example to your local-only CV (cv.*.yaml is gitignored)
cp data/cvs/example.de.yaml data/cvs/cv.de.yaml

# Render a PDF
pnpm --filter @codevena/cvmake-cli exec cvmake build data/cvs/cv.de.yaml
```

Output PDF lands in `out/cv.pdf` by default.

## Templates

| ID | Style |
|---|---|
| `academic` | Serif, two-column publication-style layout |
| `classic-serif` | Traditional resume with serif typography |
| `corporate` | Restrained corporate single-column |
| `creative-accent` | Colored accent block, modern sans-serif |
| `editorial` | Magazine-style with strong typography |
| `modern-minimal` | Minimal, lots of whitespace |
| `monochrome-dark` | Dark theme, high contrast |
| `tech-dev` | Developer-focused with code-style accents |

Each template ships with 3+ color palettes. List them all:

```bash
pnpm --filter @codevena/cvmake-cli exec cvmake list-templates
```

## Tech Stack

- **Monorepo** — pnpm 9 workspaces + Turbo
- **Schema** — Zod
- **Rendering** — React 18 + Puppeteer (headless Chrome → PDF)
- **Web UI** — Next.js 16 (App Router) + Tailwind CSS 4
- **CLI** — Commander 12
- **Testing** — Vitest, Playwright (e2e), visual regression via pixelmatch

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports, template ideas, and pull requests welcome.

## License

MIT — see [LICENSE](LICENSE).
```

- [x] **Step 2: Verify all screenshot links resolve locally**

```bash
for f in academic classic-serif corporate creative-accent editorial modern-minimal monochrome-dark tech-dev; do
  test -f docs/screenshots/$f.png && echo "OK $f" || echo "MISSING $f"
done
```

Expected: 8× `OK`.

- [x] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with showcase, quickstart, templates"
```

**DoD:** `README.md` exists at repo root; all 8 screenshot paths resolve to files; references the MIT LICENSE and CONTRIBUTING.md by relative link.

---

## Task 5: CONTRIBUTING.md (spec Step 6)

**Goal:** terse contributor guide, one screen long, no `CLAUDE.md` references.

**Files:**
- Create: `CONTRIBUTING.md`

- [x] **Step 1: Write CONTRIBUTING**

Create `CONTRIBUTING.md` with this content:

```markdown
# Contributing to cvmake

Thanks for taking a look! cvmake is a small, focused tool — contributions that
keep it that way are most welcome.

## Setup

```bash
pnpm install   # Node ≥ 20.11 required (.nvmrc pinned)
```

## Forking your own CV

Templates and example data ship in the repo. Your personal CV stays local:

```bash
cp data/cvs/example.de.yaml data/cvs/cv.de.yaml
# edit data/cvs/cv.de.yaml — it is gitignored
```

The pattern `data/cvs/cv.*.yaml` is gitignored; only `example.*.yaml` is tracked.

## Branch naming

- `feat/<short-name>` — new features
- `fix/<short-name>` — bug fixes
- `chore/<short-name>` — refactors, deps, tooling
- `docs/<short-name>` — docs-only changes

## Tests before PR

```bash
pnpm typecheck
pnpm build
pnpm -r test:unit       # 178 unit tests
pnpm test:visual        # template visual regression
pnpm --filter @codevena/cvmake-web test:e2e   # web e2e (Playwright)
```

To accept a visual-regression diff (e.g. you intentionally changed a template):

```bash
UPDATE_VISUAL=1 pnpm test:visual
```

## Regenerating template screenshots

If you change a template’s layout, regenerate the showcase PNGs:

```bash
brew install poppler        # macOS — provides pdftocairo
# or: sudo apt install poppler-utils

pnpm screenshots
git add docs/screenshots/
```

## PR expectations

- One topic per PR; keep diffs focused.
- Describe the user-visible change in the PR body.
- Tests must pass; CI gates `static` (typecheck + build) and `unit`.
```

- [x] **Step 2: Verify**

```bash
test -f CONTRIBUTING.md && wc -l CONTRIBUTING.md
```

Expected: ~55 lines.

- [x] **Step 3: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add CONTRIBUTING with setup, branches, tests, screenshots"
```

**DoD:** `CONTRIBUTING.md` exists, no references to `CLAUDE.md` or internal-only tooling, all referenced commands actually work.

---

## Task 6: CODE_OF_CONDUCT.md (spec Step 7)

**Goal:** Contributor Covenant 2.1 verbatim with `hello@codevena.dev` as contact.

**Files:**
- Create: `CODE_OF_CONDUCT.md`

- [x] **Step 1: Fetch + write the Covenant**

Copy the official Contributor Covenant 2.1 text from <https://www.contributor-covenant.org/version/2/1/code_of_conduct/>. Set the enforcement contact section to:

```
## Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be
reported to the community leaders responsible for enforcement at
hello@codevena.dev. All complaints will be reviewed and investigated
promptly and fairly.
```

(Leave the rest of the Covenant 2.1 text untouched — Our Pledge, Our Standards, Our Responsibilities, Scope, Enforcement Guidelines, Attribution.)

- [x] **Step 2: Verify**

```bash
test -f CODE_OF_CONDUCT.md
rg 'hello@codevena.dev' CODE_OF_CONDUCT.md
rg 'Contributor Covenant' CODE_OF_CONDUCT.md
```

Expected: file exists; both rg patterns hit at least once.

- [x] **Step 3: Commit**

```bash
git add CODE_OF_CONDUCT.md
git commit -m "docs: add Contributor Covenant 2.1"
```

**DoD:** GitHub will auto-detect CoC presence; enforcement contact is `hello@codevena.dev`.

---

## Task 7: Pre-PR Audit (spec Step 9 sub-steps 1+2 + final build)

**Goal:** confirm the branch is clean of unexpected personal data and the full verification suite is green before opening the PR.

**Files:** none modified — audit-only.

- [x] **Step 1: Personal-data audit (spec §9 sub-step 1)**

Run the audit pattern from spec §9 sub-step 1 against tracked files only (so gitignored locals like `data/cvs/cv.de.yaml` or `data/cvs/photos/markus.*` are correctly ignored):

```bash
git ls-files -z | xargs -0 rg -i 'markus|wiesecke|@gmail'
```

Classify every hit — only the four expected buckets are acceptable:

| Bucket | Acceptable hits |
|---|---|
| `LICENSE` | copyright line |
| `docs/superpowers/specs/2026-05-10-personal-data-migration-COMPLETE.md` | migration audit trail |
| `docs/superpowers/specs/2026-05-10-personal-data-strategy-design.md` | strategy doc |
| `docs/superpowers/plans/2026-05-10-personal-data-migration.md` | migration plan |
| Other historical specs / this plan / phase-10 spec | author/maintainer references |

Any hit outside these buckets: STOP and redact before continuing.

- [x] **Step 2: Migration-Doc re-read (spec §9 sub-step 2)**

```bash
${PAGER:-less} docs/superpowers/specs/2026-05-10-personal-data-migration-COMPLETE.md
```

Scan for any backup path that would constitute a security or privacy concern if public (per the spec: expectation is OK because all paths are local-only). If anything looks sensitive: shorten or remove that line, then commit a fixup.

- [x] **Step 3: Final verification build**

```bash
pnpm clean
pnpm install
pnpm typecheck
pnpm build
pnpm -r test:unit
```

Expected: all green; 178 unit tests pass.

- [x] **Step 4: Confirm working tree is clean**

```bash
git status
```

Expected: `nothing to commit, working tree clean` (audit was read-only; no fix needed).

If a fix from Step 1 or 2 was required, commit it:

```bash
git add -A
git commit -m "chore: pre-public personal-data audit cleanup"
```

**DoD:** audit pattern yields only expected hits; full build + 178 tests green on a fresh `pnpm clean && pnpm install`.

---

## Task 8: 4-Agent DoD Review (CLAUDE.md mandate)

**Goal:** run the Codex×2 + Claude×2 review pipeline from `~/.claude/CLAUDE.md` on the full branch diff. No GitHub issue is targeted by phase 10 → Agent B (issue verification) is skipped; only Agent A (code quality) runs in each pair.

This task does not produce code changes; it gates the PR.

- [x] **Step 1: Static checks (CLAUDE.md Step 1)**

Already done in Task 7 Step 3. Re-confirm with:

```bash
pnpm build
pnpm lint
pnpm -r test:unit
```

Lint may report the “60 known non-auto-fixable issues” already tracked in CI — these are tolerated, but a *new* lint regression introduced by phase 10 is a FAIL.

- [x] **Step 2: Codex Review Agent A**

```bash
mkdir -p .review
cat > .review/codex-prompt.txt <<'PROMPT'
Review all uncommitted-or-on-branch changes vs main for code quality,
correctness, security, and consistency. Focus areas for Phase 10:
- Package rename completeness (no stale @codevena/forq-* refs in source)
- CLI binary works after rename (bin file + bin entry + program.name)
- Screenshot script: correct palette IDs, output sizes, idempotent
- OSS docs: LICENSE/README/CONTRIBUTING/CODE_OF_CONDUCT each lint-clean and
  internally consistent
- No unexpected personal data outside the documented bucket

Run pnpm typecheck and pnpm lint yourself — either failing is automatic FAIL
(except the 60 pre-existing lint warnings tracked separately).

Write findings to .review/codex-a-findings.md in EXACTLY this format:

## FINDINGS
- [CRITICAL] ...
- [WARN] ...
- [INFO] ...
## VERDICT
PASS | FAIL

PASS requires zero CRITICAL and zero WARN. INFO is advisory.
PROMPT

codex exec "$(<.review/codex-prompt.txt)"
```

If `codex exec` hangs >10s at 0% CPU, fall back to OpenCode per CLAUDE.md:

```bash
opencode run --dangerously-skip-permissions "$(<.review/codex-prompt.txt)"
```

Read `.review/codex-a-findings.md`. If FAIL: fix every CRITICAL+WARN and restart from Task 8 Step 1.

- [x] **Step 3: Claude Review Agent A**

Spawn a `code-reviewer` subagent with the same scope, instructing it to write findings to `.review/claude-a-findings.md` using the same format.

If FAIL: fix and restart from Task 8 Step 1.

- [x] **Step 4: Cleanup review artifacts before commit**

```bash
rm -rf .review/
```

(`.review/` is in `.gitignore` so the cleanup is paranoia, but mandated by CLAUDE.md.)

**DoD:** both Agent A reviewers return `VERDICT: PASS`; `.review/` removed.

---

## Task 9: Push + Open PR + Merge

**Goal:** push the branch, open a PR, get explicit user approval to push (CLAUDE.md rule), merge.

- [x] **Step 1: Ask the user before pushing**

CLAUDE.md: “Never push to remote (origin) without explicit user permission.” STOP here and ask: *“Branch ready, 4-agent review PASS. Push `feat/phase-10-oss-public-readiness` and open PR?”*

Proceed only after explicit yes.

- [x] **Step 2: Push branch**

```bash
git push -u origin feat/phase-10-oss-public-readiness
```

- [x] **Step 3: Open PR**

```bash
gh pr create --base main --head feat/phase-10-oss-public-readiness \
  --title "phase 10: OSS public readiness" \
  --body "$(cat <<'EOF'
## Summary
- Full rename `forq → cvmake` across 6 workspace packages, CLI binary, all imports, CI workflow
- Adds OSS standard files: LICENSE (MIT), README, CONTRIBUTING, CODE_OF_CONDUCT (Covenant 2.1)
- Adds 8 template screenshots in `docs/screenshots/` + `pnpm screenshots` pipeline (local `pdftocairo`)

## Verification
- `pnpm typecheck && pnpm build && pnpm -r test:unit` — 178 tests green
- `pnpm --filter @codevena/cvmake-cli exec cvmake build data/cvs/example.de.yaml` — renders PDF
- `rg '@codevena/forq-' apps packages .github` — zero matches
- 4-agent DoD review (Codex Agent A + Claude Agent A) — PASS

## Out of scope (phase 11+)
npm publish, live demo URL, SECURITY.md, issue/PR templates, GitHub Pages, Discussions.

Spec: docs/superpowers/specs/2026-05-10-phase-10-oss-public-readiness-design.md
Plan: docs/superpowers/plans/2026-05-11-phase-10-oss-public-readiness.md
EOF
)"
```

- [x] **Step 4: Wait for CI green**

```bash
gh pr checks --watch
```

Expected: `static`, `unit`, `e2e-visual` all green.

- [x] **Step 5: Merge**

Ask the user one more time before merging. Then:

```bash
gh pr merge --squash --delete-branch
git checkout main
git pull --ff-only origin main
```

**DoD:** PR merged to `main`; local `main` synced to the merge commit; feature branch deleted.

---

## Task 10: GitHub Metadata (spec Step 8)

**Goal:** set repo description + topics so the public landing page reflects the brand.

- [x] **Step 1: Set description + topics**

```bash
gh repo edit Codevena/cvmake \
  --description "cvmake — fork-friendly OSS CV builder. YAML in, PDF out. 8 templates, CLI + web UI."

gh repo edit Codevena/cvmake \
  --add-topic cv \
  --add-topic resume \
  --add-topic yaml \
  --add-topic pdf \
  --add-topic nextjs \
  --add-topic typescript \
  --add-topic oss \
  --add-topic cli
```

- [x] **Step 2: Verify metadata**

```bash
gh repo view Codevena/cvmake --json description,repositoryTopics,licenseInfo
```

Expected:
- `description` set to the cvmake string above
- `repositoryTopics.nodes` contains all 8 topics
- `licenseInfo.spdxId` = `MIT` (auto-detected from `LICENSE` on `main`)

**DoD:** `gh repo view` shows description, all 8 topics, and MIT license auto-detected.

---

## Task 11: Email Verification (spec Step 9 sub-step 3) — EXTERNAL BLOCKER

**Goal:** confirm `hello@codevena.dev` is reachable before flipping the repo public, because the CoC publicly directs reports there.

This step is **out of code scope**. It blocks Task 12.

- [x] **Step 1: Ask the user to confirm the mailbox is configured**

Prompt: *“Is `hello@codevena.dev` set up and able to receive mail? (We will not flip the repo public until you confirm.)”*

- [x] **Step 2: Send a test mail from an external account**

User action: send a test mail (e.g. from their personal account) to `hello@codevena.dev` with a recognizable subject like `cvmake-coc-mailbox-test`.

- [x] **Step 3: Confirm receipt**

User opens the mailbox and confirms the test mail arrived. Reply to this conversation with “verified.”

**DoD:** user has confirmed receipt of a test mail at `hello@codevena.dev`.

---

## Task 12: Public Toggle + Smoke Tests (spec Step 9 toggle + post-toggle)

**Goal:** flip the repo to public and verify anonymous access.

- [x] **Step 1: Final ask before the irreversible toggle**

The visibility flip is reversible in theory but search-engine indexing and forks are not. Prompt: *“Confirm flip `Codevena/cvmake` to PUBLIC now?”*

- [x] **Step 2: Flip visibility**

```bash
gh repo edit Codevena/cvmake --visibility public --accept-visibility-change-consequences
```

- [x] **Step 3: Verify**

```bash
gh repo view Codevena/cvmake --json visibility
```

Expected: `"visibility": "PUBLIC"`.

- [x] **Step 4: Anonymous browser load**

Open <https://github.com/Codevena/cvmake> in a logged-out browser window (private/incognito tab). Expected: page loads, README renders with all 8 screenshots, badges show CI + MIT.

- [x] **Step 5: Anonymous clone**

```bash
git clone https://github.com/Codevena/cvmake /tmp/cvmake-public-test
cd /tmp/cvmake-public-test
ls
```

Expected: clone succeeds without auth, repo contents present.

- [x] **Step 6: Cleanup**

```bash
rm -rf /tmp/cvmake-public-test
```

**DoD (also = phase 10 overall DoD):**
1. `gh repo view Codevena/cvmake --json visibility` → `PUBLIC`
2. Anonymous browser load + clone both succeed
3. README showcase renders all 8 screenshots
4. License badge shows MIT (GitHub auto-detect)
5. 8 topics listed; description matches spec

---

## Self-review notes (kept after writing)

**Spec coverage:** every step 1–9 from spec §4 maps to a task here (Step 1 → Task 0; Step 2 → Task 1; Steps 3–7 → Tasks 2–6; Step 8 → Task 10; Step 9 → Tasks 7+11+12). The 4-agent DoD review (CLAUDE.md mandate, not in the spec) is Task 8.

**Open spec items concretized in this plan:**
- Default palette per template: hardcoded list of palette index 0 IDs (Task 3).
- Branch strategy: single branch `feat/phase-10-oss-public-readiness`, single PR (user choice).
- `pdftocairo`: verified installed on the maintainer machine (v26.04) — no install pre-step needed, just a `which` check.

**External prerequisites (re-stated):**
- `hello@codevena.dev` mailbox reachable — blocks Task 12.
- `pdftocairo` installed locally — verified; no action needed.

**DoD per task:** each task has an explicit verifiable end-state (command + expected output), not just “done.”

---

## Completion Notes (added 2026-05-11)

**Outcome:** PR #4 `phase 10: OSS public readiness` squash-merged to `main` (`f50a9ca`). Repo flipped PUBLIC. All 12 task DoDs satisfied.

**Branch history (11 commits, squashed to 1 on merge):**

| SHA | Subject |
|---|---|
| `92683c3` | docs: phase-10 OSS-public-readiness design spec |
| `b0336d5` | docs: phase-10 OSS-public-readiness implementation plan |
| `ad1f2a3` | chore: rename forq → cvmake across workspace |
| `99100b7` | docs: add MIT LICENSE |
| `1105ea2` | feat: add screenshot pipeline + 8 template PNGs |
| `695dae9` | chore: clean up screenshot temp dir even on failure (review fix) |
| `bbd6bd2` | docs: add README with showcase, quickstart, templates |
| `7d2d9e2` | docs: add CONTRIBUTING with setup, branches, tests, screenshots |
| `b6e844d` | docs: add Contributor Covenant 2.1 |
| `97946f2` | fix: 4-agent review followup — biome format CLI, add build step to README |
| `bdb65d9` | fix: 4-agent review followup — auto-mkdir output dir, default branch |

**Deviations applied vs the plan-as-written (all justified, all reviewer-approved):**

1. **Task 1 — also renamed `.github/workflows/update-baselines.yml`** (plan only named `ci.yml`). Same `--filter @codevena/forq-templates` pattern; leaving it would have broken the workflow at first dispatch. Spec §5.2 "CI workflow filter args" rule applies uniformly.
2. **Task 1 — also updated user-visible brand text** in `apps/web/components/TopBar.tsx:57` (nav wordmark) and `apps/web/app/dev-ui/page.tsx:59` (h1 heading). Spec §5.2 "User-visible Brand-Refs → cvmake" rule.
3. **Task 1 — 5 additional test mkdtemp tmp-prefixes left unchanged** (`packages/core/test/photo.test.ts`, four `apps/web/app/api/.../route.test.ts` files). Same pattern as the plan-named `apps/cli/test/build.integration.test.ts`. Spec §5.2 "internal symbol → unchanged" rule.
4. **Task 3 — screenshot script uses `node apps/cli/bin/cvmake` not `pnpm --filter @codevena/cvmake-cli exec cvmake`.** The documented form fails with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "cvmake" not found` because pnpm doesn't link a workspace package's own `bin` into its own `node_modules/.bin/`.
5. **Task 3 — cleanup wrapped in `try/finally`** (code-quality reviewer recommendation). `dist/screenshots/` is removed even if the build/rasterise loop throws mid-iteration.
6. **Task 4 — added root `pnpm cvmake` script** to `package.json` (`"cvmake": "node apps/cli/bin/cvmake"`). README and CONTRIBUTING use this ergonomic form. Same root cause as deviation #4.
7. **Task 4 — README quickstart includes `pnpm build`** between `pnpm install` and `pnpm cvmake build`. The CLI binary imports `../dist/index.js`; cold clones must build before running.
8. **Followup fix — biome format split in `apps/cli/src/index.ts`.** The plan's program.name().description().version() chain became a single 120-char line after rename, triggering a NEW biome lint error. Split across 4 lines (matches biome 100-char rule).
9. **Followup fix — `runBuild` now auto-mkdirs the output dir.** `apps/cli/src/commands/build.ts` matched the existing `runBuildAll` pattern. Without this, a cold-clone user following the README quickstart with the default `out/cv.pdf` output hit `ENOENT`.
10. **Followup fix — `.github/workflows/update-baselines.yml` workflow_dispatch input default `feat/cvmake-mvp` → `main`.** Stale after the Task 0 default-branch flip.

**4-agent DoD review:**
- Codex Agent A — Codex CLI hit `OpenAI usage limit` on the second pass. Fell back to OpenCode (`opencode run --dangerously-skip-permissions "$(<.review/codex-prompt.txt)"`) per CLAUDE.md fallback rule. Final OpenCode verdict: PASS.
- Claude Agent A — `code-reviewer` subagent. First pass: FAIL (1 CRITICAL = the `runBuild` ENOENT, 1 WARN = stale update-baselines default). Re-run after fixes: PASS.
- No GitHub issue targeted phase 10 → Agent B (issue verification) skipped per plan §Task 8 note. 2 of 4 agents ran (the Agent A code-quality pair).

**Audit final state:**
- `rg '@codevena/forq-' apps packages .github` → zero matches.
- `rg -i forq` outside expected buckets → zero hits. Expected hits: 15 historical doc files, 6 internal test tmp-prefixes (5 unmodified + 1 plan-explicit).
- Personal-data audit (`git ls-files -z | xargs -0 rg -i 'markus|wiesecke|@gmail'`) → only LICENSE copyright + 5 documented spec/plan files.
- `pnpm typecheck && pnpm build && pnpm -r test:unit` → 178 tests green.
- Anonymous clone smoke test → success, all 8 screenshots present, README renders.

**Phase 11+ candidates** (parked, out-of-scope per spec §8):
- npm-Publish (`@codevena/cvmake-*` on npm; `npx cvmake init`).
- Live demo URL (`cvmake.codevena.dev` or GitHub Pages).
- `SECURITY.md`, `.github/ISSUE_TEMPLATE/`, `.github/PULL_REQUEST_TEMPLATE.md`.
- GitHub Discussions toggle.
- GitHub Pages (static showcase site).
- Cleanup of legacy `feat/cvmake-mvp` branch (historical, now non-default).
- `/tmp/forq-rewrite` cleanup per Migration-Plan §34.1 (eligible from ~2026-05-12).
