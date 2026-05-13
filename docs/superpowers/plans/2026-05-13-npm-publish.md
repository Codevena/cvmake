# npm publish — @codevena/cvmake-* Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish 4 packages to npm in lockstep so `npx @codevena/cvmake-cli build cv.yaml` works for any Node user.

**Architecture:** Lockstep 4-package publish at v0.1.0 (`-cli`, `-core`, `-schema`, `-templates`). Two stages: manual first publish (this session, irreversible — extra verification), then automated GH Action on tag push (follow-up).

**Tech Stack:** pnpm 9 workspaces, npm publish (scoped public), GitHub Actions for stage 2. No SDK changes needed.

**Companion spec:** `docs/superpowers/specs/2026-05-13-npm-publish-design.md`

---

## File Structure

### Modified

- `packages/schema/package.json` — drop `private`, add publish metadata, add `prepublishOnly`, bump to 0.1.0
- `packages/core/package.json` — same
- `packages/templates/package.json` — same
- `apps/cli/package.json` — same + bump CLI `version()` in code
- `apps/cli/src/index.ts` — read version from package.json instead of hardcoded `'0.0.0'`
- `README.md` (top-level) — prepend `npx` quickstart to existing quickstart section

### Created

- `packages/schema/README.md` — short pointer
- `packages/schema/LICENSE` — MIT (copy of root LICENSE)
- `packages/core/README.md` — short pointer
- `packages/core/LICENSE` — MIT (copy of root LICENSE)
- `packages/templates/README.md` — short pointer
- `packages/templates/LICENSE` — MIT (copy of root LICENSE)
- `apps/cli/README.md` — full README (install, quickstart, commands, templates)
- `apps/cli/LICENSE` — MIT (copy of root LICENSE)

### Stage 2 (separate later session OK)

- `.github/workflows/release.yml` — publish on `v*.*.*` tag push
- `NPM_TOKEN` secret added to repo (manual, document in commit message)

---

## Task 1: Prepare @codevena/cvmake-schema

Schema has the fewest deps — start here so subsequent dry-runs catch any
generic publish issue cheaply.

**Files:**
- Modify: `packages/schema/package.json`
- Create: `packages/schema/README.md`
- Create: `packages/schema/LICENSE`

- [ ] **Step 1: Copy root LICENSE into the package**

```bash
cp LICENSE packages/schema/LICENSE
```

- [ ] **Step 2: Write the short README**

Create `packages/schema/README.md`:

```markdown
# @codevena/cvmake-schema

Zod schema for [cvmake](https://github.com/Codevena/cvmake) YAML CV
documents. Used by `@codevena/cvmake-core` and
`@codevena/cvmake-templates`.

Most users should depend on `@codevena/cvmake-cli` directly, not this
package.

## License

MIT — see [LICENSE](./LICENSE).
```

- [ ] **Step 3: Rewrite `packages/schema/package.json`**

Replace the entire file with:

```json
{
  "name": "@codevena/cvmake-schema",
  "version": "0.1.0",
  "description": "Zod schema for cvmake YAML CV documents.",
  "keywords": ["cv", "resume", "yaml", "schema", "zod"],
  "homepage": "https://cvmake.codevena.dev",
  "bugs": { "url": "https://github.com/Codevena/cvmake/issues" },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/Codevena/cvmake.git",
    "directory": "packages/schema"
  },
  "license": "MIT",
  "author": "Markus Wiesecke",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./fixtures": {
      "types": "./dist/fixtures.d.ts",
      "default": "./dist/fixtures.js"
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "publishConfig": { "access": "public" },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run",
    "clean": "rm -rf dist .turbo",
    "prepublishOnly": "pnpm run build"
  },
  "dependencies": { "zod": "3.23.8" },
  "peerDependencies": { "react": "^18" },
  "peerDependenciesMeta": { "react": { "optional": true } },
  "devDependencies": {
    "@types/react": "18.3.12",
    "react": "18.3.1",
    "typescript": "5.6.3",
    "vitest": "2.1.5"
  }
}
```

Key changes from current state: removed `private: true`, added publish
metadata (description/keywords/homepage/bugs/repository/license/author),
added `files` array, added `publishConfig`, added `prepublishOnly` script,
bumped version to `0.1.0`.

- [ ] **Step 4: Verify the package still builds**

```bash
pnpm --filter @codevena/cvmake-schema build
```

Expected: `Done` with no errors. `packages/schema/dist/` populated.

- [ ] **Step 5: Verify the rest of the workspace still typechecks**

```bash
pnpm typecheck
```

Expected: all 10 tasks successful.

- [ ] **Step 6: Commit**

```bash
git add packages/schema/package.json packages/schema/README.md packages/schema/LICENSE
git commit -m "chore(schema): prepare @codevena/cvmake-schema for npm publish

- Drop private: true, set version to 0.1.0
- Add publishConfig.access=public + files array
- Add description, keywords, homepage, bugs, repository, license, author
- Add prepublishOnly to ensure fresh build on publish
- Add minimal README + LICENSE per published-package convention"
```

---

## Task 2: Prepare @codevena/cvmake-core

**Files:**
- Modify: `packages/core/package.json`
- Create: `packages/core/README.md`
- Create: `packages/core/LICENSE`

- [ ] **Step 1: Copy LICENSE**

```bash
cp LICENSE packages/core/LICENSE
```

- [ ] **Step 2: Write README**

Create `packages/core/README.md`:

```markdown
# @codevena/cvmake-core

Core engine for [cvmake](https://github.com/Codevena/cvmake): YAML
loader, React renderer, Puppeteer-driven PDF generator, photo embedder,
i18n helpers.

Most users should depend on `@codevena/cvmake-cli` directly, not this
package.

## Entry points

This package exports several subpaths:

- `@codevena/cvmake-core` — main exports
- `@codevena/cvmake-core/errors`
- `@codevena/cvmake-core/html-document`
- `@codevena/cvmake-core/loader`
- `@codevena/cvmake-core/renderer`
- `@codevena/cvmake-core/renderer-types`
- `@codevena/cvmake-core/photo`
- `@codevena/cvmake-core/photo-embed`
- `@codevena/cvmake-core/pdf`
- `@codevena/cvmake-core/i18n`

## Heavy dependencies

This package depends on `puppeteer` (downloads ~150 MB Chromium on
install) and `sharp` (native image processing). These are required for
high-fidelity PDF rendering.

## License

MIT — see [LICENSE](./LICENSE).
```

- [ ] **Step 3: Rewrite `packages/core/package.json`**

Replace the entire file with:

```json
{
  "name": "@codevena/cvmake-core",
  "version": "0.1.0",
  "description": "Core engine for cvmake: YAML loader, React renderer, Puppeteer-driven PDF generator.",
  "keywords": ["cv", "resume", "yaml", "pdf", "puppeteer", "react"],
  "homepage": "https://cvmake.codevena.dev",
  "bugs": { "url": "https://github.com/Codevena/cvmake/issues" },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/Codevena/cvmake.git",
    "directory": "packages/core"
  },
  "license": "MIT",
  "author": "Markus Wiesecke",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./errors": {
      "types": "./dist/errors.d.ts",
      "default": "./dist/errors.js"
    },
    "./html-document": {
      "types": "./dist/html-document.d.ts",
      "default": "./dist/html-document.js"
    },
    "./loader": {
      "types": "./dist/loader.d.ts",
      "default": "./dist/loader.js"
    },
    "./renderer": {
      "types": "./dist/renderer.d.ts",
      "default": "./dist/renderer.js"
    },
    "./renderer-types": {
      "types": "./dist/renderer-types.d.ts",
      "default": "./dist/renderer-types.js"
    },
    "./photo": {
      "types": "./dist/photo.d.ts",
      "default": "./dist/photo.js"
    },
    "./photo-embed": {
      "types": "./dist/photo-embed.d.ts",
      "default": "./dist/photo-embed.js"
    },
    "./pdf": {
      "types": "./dist/pdf.d.ts",
      "default": "./dist/pdf.js"
    },
    "./i18n": {
      "types": "./dist/i18n.d.ts",
      "default": "./dist/i18n.js"
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "publishConfig": { "access": "public" },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "clean": "rm -rf dist .turbo",
    "prepublishOnly": "pnpm run build"
  },
  "dependencies": {
    "@codevena/cvmake-schema": "workspace:*",
    "js-yaml": "4.1.0",
    "puppeteer": "23.7.1",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "sharp": "0.33.5",
    "zod": "3.23.8"
  },
  "devDependencies": {
    "@types/js-yaml": "4.0.9",
    "@types/node": "20.17.6",
    "@types/react": "18.3.12",
    "@types/react-dom": "18.3.1",
    "tsx": "^4.21.0",
    "typescript": "5.6.3",
    "vitest": "2.1.5"
  }
}
```

- [ ] **Step 4: Build + typecheck**

```bash
pnpm --filter @codevena/cvmake-core build && pnpm typecheck
```

Expected: build succeeds, all 10 typecheck tasks pass.

- [ ] **Step 5: Commit**

```bash
git add packages/core/package.json packages/core/README.md packages/core/LICENSE
git commit -m "chore(core): prepare @codevena/cvmake-core for npm publish

- Drop private: true, set version to 0.1.0
- Add publishConfig.access=public + files array
- Add description, keywords, repo metadata, license
- Add prepublishOnly + README + LICENSE
- Document Chromium download cost in README"
```

---

## Task 3: Prepare @codevena/cvmake-templates

**Files:**
- Modify: `packages/templates/package.json`
- Create: `packages/templates/README.md`
- Create: `packages/templates/LICENSE`

- [ ] **Step 1: Copy LICENSE**

```bash
cp LICENSE packages/templates/LICENSE
```

- [ ] **Step 2: Write README**

Create `packages/templates/README.md`:

```markdown
# @codevena/cvmake-templates

The 12 production-ready CV templates that ship with
[cvmake](https://github.com/Codevena/cvmake). React components with
their own CSS, registered in a plugin-like template registry.

Most users should depend on `@codevena/cvmake-cli` directly, not this
package.

## Templates

`classic-serif`, `modern-minimal`, `corporate`, `creative-accent`,
`editorial`, `academic`, `tech-dev`, `monochrome-dark`, `swiss`,
`bauhaus`, `noir`, `magazine`.

Each ships with 3+ color palettes. See the
[live showcase](https://cvmake.codevena.dev) for previews.

## License

MIT — see [LICENSE](./LICENSE).
```

- [ ] **Step 3: Rewrite `packages/templates/package.json`**

Replace the entire file with:

```json
{
  "name": "@codevena/cvmake-templates",
  "version": "0.1.0",
  "description": "12 production-ready CV templates for cvmake — React components with CSS, multi-palette.",
  "keywords": ["cv", "resume", "react", "templates", "cvmake"],
  "homepage": "https://cvmake.codevena.dev",
  "bugs": { "url": "https://github.com/Codevena/cvmake/issues" },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/Codevena/cvmake.git",
    "directory": "packages/templates"
  },
  "license": "MIT",
  "author": "Markus Wiesecke",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./css": {
      "types": "./dist/css.d.ts",
      "default": "./dist/css.js"
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "publishConfig": { "access": "public" },
  "scripts": {
    "build": "tsc -p tsconfig.json && node scripts/copy-assets.mjs",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run",
    "test:visual": "vitest run --config vitest.visual.config.ts",
    "clean": "rm -rf dist .turbo",
    "prepublishOnly": "pnpm run build"
  },
  "dependencies": {
    "@codevena/cvmake-core": "workspace:*",
    "@codevena/cvmake-schema": "workspace:*",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "devDependencies": {
    "@types/node": "20.17.6",
    "@types/pngjs": "6.0.5",
    "@types/react": "18.3.12",
    "@types/react-dom": "18.3.1",
    "pixelmatch": "6.0.0",
    "pngjs": "7.0.0",
    "puppeteer": "23.7.1",
    "typescript": "5.6.3",
    "vitest": "2.1.5"
  }
}
```

- [ ] **Step 4: Build + typecheck**

```bash
pnpm --filter @codevena/cvmake-templates build && pnpm typecheck
```

Expected: build succeeds (includes `copy-assets.mjs` which copies the
template CSS files into dist/), typecheck passes.

- [ ] **Step 5: Inspect what `copy-assets.mjs` puts in dist/**

```bash
ls packages/templates/dist/ | head -20
```

Expected: see 12 template subdirs each with `styles.css`, plus
`index.js`, `css.js`, `bootstrap.js`, etc.

- [ ] **Step 6: Commit**

```bash
git add packages/templates/package.json packages/templates/README.md packages/templates/LICENSE
git commit -m "chore(templates): prepare @codevena/cvmake-templates for npm publish

- Drop private: true, set version to 0.1.0
- Add publishConfig.access=public + files array (dist/ includes the
  CSS files placed by scripts/copy-assets.mjs)
- Add publish metadata + prepublishOnly + README + LICENSE"
```

---

## Task 4: Prepare @codevena/cvmake-cli (with full README)

The CLI is the user-facing package. Spend time on the README — it's
what shows up on `npm view @codevena/cvmake-cli` and the npmjs.com
package page.

**Files:**
- Modify: `apps/cli/package.json`
- Modify: `apps/cli/src/index.ts` (read version from package.json)
- Create: `apps/cli/README.md`
- Create: `apps/cli/LICENSE`

- [ ] **Step 1: Copy LICENSE**

```bash
cp LICENSE apps/cli/LICENSE
```

- [ ] **Step 2: Write the full CLI README**

Create `apps/cli/README.md`:

````markdown
# @codevena/cvmake-cli

> YAML in, PDF out. The official [cvmake](https://github.com/Codevena/cvmake) CLI.

Build production-quality CV PDFs from a plain-text YAML file. 12 polished
templates, multiple color palettes each, multilingual.

**Live demo + web editor:** https://cvmake.codevena.dev

## Quick start

```bash
# Get an example to start from
curl -O https://raw.githubusercontent.com/Codevena/cvmake/main/data/cvs/example.en.yaml
mv example.en.yaml cv.yaml

# Open cv.yaml in your editor, fill in your data

# Render
npx @codevena/cvmake-cli build cv.yaml
# → out/cv.pdf
```

The first invocation downloads Chromium (~150 MB, one-time) — required
for high-fidelity PDF rendering. Subsequent runs are instant.

## Commands

```bash
cvmake build <cv.yaml> [-t <template>] [-p <palette>] [-o <output.pdf>]
cvmake validate <cv.yaml>
cvmake list-templates
cvmake build-all [-d <dir>] [-o <out>]   # render every YAML in a directory
```

Default output: `out/cv.pdf`.

## Templates

12 templates ship with the CLI:

`classic-serif`, `modern-minimal`, `corporate`, `creative-accent`,
`editorial`, `academic`, `tech-dev`, `monochrome-dark`, `swiss`,
`bauhaus`, `noir`, `magazine`.

Each template has 3+ color palettes. Specify both in YAML:

```yaml
rendering:
  template: bauhaus
  palette: bauhaus-primary
```

…or override on the command line:

```bash
npx @codevena/cvmake-cli build cv.yaml --template noir --palette noir-gold
```

See [the showcase](https://cvmake.codevena.dev) for live previews of
every template + palette.

## YAML schema

The full schema is published as `@codevena/cvmake-schema`. The fastest
way to understand it is to read the example:

https://github.com/Codevena/cvmake/blob/main/data/cvs/example.en.yaml

`cvmake validate` checks your YAML against the schema and prints
human-readable errors if anything is off.

## Web editor

Prefer a GUI? https://cvmake.codevena.dev — same engine, runs in your
browser. Edit the YAML side-by-side with the live PDF preview, export
when ready.

## License

MIT — see [LICENSE](./LICENSE).
````

- [ ] **Step 3: Update the hardcoded version in `apps/cli/src/index.ts`**

Read package.json at runtime so the CLI's `--version` flag stays in sync
with the published version. Replace:

```ts
program
  .name('cvmake')
  .description('cvmake — fork-friendly OSS CV builder. YAML in, PDF out.')
  .version('0.0.0');
```

with:

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf8'),
) as { version: string };

program
  .name('cvmake')
  .description('cvmake — fork-friendly OSS CV builder. YAML in, PDF out.')
  .version(pkg.version);
```

Keep the other imports (`Command`, `runBuild`, etc.) unchanged.

- [ ] **Step 4: Rewrite `apps/cli/package.json`**

Replace the entire file with:

```json
{
  "name": "@codevena/cvmake-cli",
  "version": "0.1.0",
  "description": "YAML in, PDF out. The official cvmake CLI — render CVs from a plain-text YAML file.",
  "keywords": ["cv", "resume", "yaml", "pdf", "cli", "puppeteer", "react"],
  "homepage": "https://cvmake.codevena.dev",
  "bugs": { "url": "https://github.com/Codevena/cvmake/issues" },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/Codevena/cvmake.git",
    "directory": "apps/cli"
  },
  "license": "MIT",
  "author": "Markus Wiesecke",
  "type": "module",
  "main": "./dist/index.js",
  "bin": { "cvmake": "./bin/cvmake" },
  "files": ["dist", "bin", "README.md", "LICENSE"],
  "publishConfig": { "access": "public" },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "clean": "rm -rf dist .turbo",
    "prepublishOnly": "pnpm run build"
  },
  "dependencies": {
    "@codevena/cvmake-core": "workspace:*",
    "@codevena/cvmake-schema": "workspace:*",
    "@codevena/cvmake-templates": "workspace:*",
    "commander": "12.1.0",
    "picocolors": "1.1.1"
  },
  "devDependencies": {
    "@types/node": "20.17.6",
    "pdf-parse": "1.1.1",
    "typescript": "5.6.3",
    "vitest": "2.1.5"
  }
}
```

- [ ] **Step 5: Build + smoke-test the local CLI binary**

```bash
pnpm --filter @codevena/cvmake-cli build
node apps/cli/bin/cvmake --version
```

Expected: prints `0.1.0`.

- [ ] **Step 6: Full workspace check**

```bash
pnpm build && pnpm typecheck && pnpm -r test:unit
```

Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add apps/cli/package.json apps/cli/src/index.ts apps/cli/README.md apps/cli/LICENSE
git commit -m "chore(cli): prepare @codevena/cvmake-cli for npm publish

- Drop private: true, set version to 0.1.0
- Add publishConfig.access=public + files array (dist + bin)
- Read version from package.json at runtime so --version stays in sync
- Add publish metadata + prepublishOnly
- Add full user-facing README (install, commands, templates, schema)
- Add LICENSE"
```

---

## Task 5: Update top-level README quickstart

Most visitors read this first. Put `npx` at the top so the easiest path
is the most visible. The current Quickstart section lives at lines
44-59 of `README.md` (one fenced bash block with the git-clone flow).

**Files:**
- Modify: `README.md` (top-level), section between `## Quickstart`
  (line 44) and the next heading `## Templates` (line 61)

- [ ] **Step 1: Replace the Quickstart section**

Use Edit with these exact strings.

`old_string` (the full current section, lines 44-59):

````
## Quickstart

```bash
git clone https://github.com/Codevena/cvmake
cd cvmake
pnpm install
pnpm build      # builds the workspace packages once

# Copy the example to your local-only CV (cv.*.yaml is gitignored)
cp data/cvs/example.de.yaml data/cvs/cv.de.yaml

# Render a PDF
pnpm cvmake build data/cvs/cv.de.yaml
```

Output PDF lands in `out/cv.pdf` by default.
````

`new_string`:

````
## Quickstart

### Install + render in one shot

```bash
npx @codevena/cvmake-cli build path/to/cv.yaml
```

No clone required. The first run downloads Chromium (~150 MB, one-time)
which is needed for high-fidelity PDF rendering.

### Or clone for contribution / customization

```bash
git clone https://github.com/Codevena/cvmake
cd cvmake
pnpm install
pnpm build      # builds the workspace packages once

# Copy the example to your local-only CV (cv.*.yaml is gitignored)
cp data/cvs/example.de.yaml data/cvs/cv.de.yaml

# Render a PDF
pnpm cvmake build data/cvs/cv.de.yaml
```

Output PDF lands in `out/cv.pdf` by default.
````

- [ ] **Step 2: Verify the edit applied cleanly**

```bash
sed -n '44,75p' README.md
```

Expected: the new section appears with both subheadings (`### Install +
render in one shot` and `### Or clone for contribution …`).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs(readme): add npx quickstart for the published CLI"
```

---

## Task 6: Pre-publish review pipeline (CLAUDE.md gate)

All 5 prep commits together are a substantial change to package
metadata. Run the full Definition-of-Done review pipeline BEFORE the
irreversible publish step.

- [ ] **Step 1: Static checks**

```bash
pnpm build && pnpm typecheck && pnpm -r test:unit
```

Expected: all green.

- [ ] **Step 2: Codex review (Agent A only — no GitHub issue)**

```bash
mkdir -p .review
cat > .review/codex-prompt.txt <<'PROMPT'
Review all uncommitted changes in this repo for npm-publish readiness.

Scope: 5 commits preparing 4 packages for first publish to npm:
- packages/schema, packages/core, packages/templates, apps/cli
  → each gets: drop private, version 0.1.0, publishConfig.access=public,
    files array, repo/license/author/keywords metadata, prepublishOnly,
    README, LICENSE.
- README.md → npx quickstart added.

Run targeted commands (DO NOT use pnpm/turbo — sandbox has no network):
- node_modules/.bin/tsc -p apps/cli/tsconfig.json --noEmit
- pnpm publish --dry-run for each of the 4 packages — pnpm-publish
  works offline if dist/ is already populated. Check the proposed
  tarball file lists and inspect that workspace:* deps are translated
  to concrete versions (0.1.0).

Flag CRITICAL/WARN for:
- Workspace ref strings that remain in the tarball package.json
- Missing files in the files array that would break the published
  package (e.g. forgetting `bin` on the cli)
- License/copyright inconsistencies
- Version mismatches between the 4 packages
- Anything in the tarball that shouldn't ship (test fixtures, .review/,
  source maps if they leak secrets, etc.)

Pre-existing lint debt (70 errors in template files I did NOT touch)
is tolerated by CI — do NOT fail on it.

Write findings to .review/codex-a-findings.md in format:
## FINDINGS
- [CRITICAL/WARN/INFO] one line per item
## VERDICT
PASS | FAIL

PASS = zero CRITICAL and zero WARN. INFO is advisory.
PROMPT

codex exec "$(<.review/codex-prompt.txt)"
```

Then read `.review/codex-a-findings.md`. If FAIL: fix all CRITICAL/WARN
findings, re-run from Step 1. If PASS: proceed.

- [ ] **Step 3: Claude review (Agent A only)**

Spawn a `claude` subagent (`subagent_type: claude`) with this prompt:

> Independent npm-publish readiness review of all uncommitted changes
> in /Users/markus/Developer/cvMake. 5 commits preparing 4 packages
> (@codevena/cvmake-{schema,core,templates,cli}) for first public
> publish to npm at v0.1.0.
>
> Verify:
> - Each package's `files` array is complete (no missing dist
>   subpaths, no missing bin for cli).
> - The 4 packages all declare matching versions (0.1.0 lockstep).
> - `publishConfig.access: "public"` on each (required for scoped
>   public packages).
> - `prepublishOnly: "pnpm run build"` on each.
> - `repository.directory` matches the actual subpath.
> - README content is accurate: CLI commands match
>   apps/cli/src/index.ts; template list matches
>   packages/templates/src/.
> - Top-level README quickstart prepends the npx invocation.
> - apps/cli/src/index.ts reads version from package.json (not
>   hardcoded).
> - No accidental publishing of dev-only files (test fixtures,
>   tsconfig, etc. should NOT be in the published tarball — confirmed
>   by `files` array being explicit).
>
> Write to `.review/claude-a-findings.md` in:
> ## FINDINGS
> - [CRITICAL/WARN/INFO]
> ## VERDICT
> PASS | FAIL
>
> Report back only: "Review written. Verdict: PASS|FAIL"

- [ ] **Step 4: Gate**

Both `.review/codex-a-findings.md` and `.review/claude-a-findings.md`
must be VERDICT: PASS with zero CRITICAL and zero WARN.

If either is FAIL: fix all findings, re-run BOTH reviewers from the
beginning. Repeat until both PASS.

- [ ] **Step 5: Clean up review artifacts (before any commit)**

```bash
rm -rf .review/
```

No commit needed for this task — Task 6 is verification only.

---

## Task 7: Dry-run all 4 publishes, inspect tarballs

**STOP HERE FOR MARKUS REVIEW.** Run the dry-run, inspect each tarball,
and present a clear go/no-go summary before Task 8 (irreversible).

- [ ] **Step 1: Dry-run each package (in dep order)**

```bash
pnpm --filter @codevena/cvmake-schema publish --dry-run --no-git-checks 2>&1 | tee /tmp/dry-schema.txt
pnpm --filter @codevena/cvmake-core publish --dry-run --no-git-checks 2>&1 | tee /tmp/dry-core.txt
pnpm --filter @codevena/cvmake-templates publish --dry-run --no-git-checks 2>&1 | tee /tmp/dry-templates.txt
pnpm --filter @codevena/cvmake-cli publish --dry-run --no-git-checks 2>&1 | tee /tmp/dry-cli.txt
```

Each must succeed (exit 0). Output shows the file list and final tarball
size.

- [ ] **Step 2: Inspect the actual tarball contents**

```bash
cd packages/schema && pnpm pack --pack-destination /tmp/ 2>&1 | tail -3
tar -tzf /tmp/codevena-cvmake-schema-0.1.0.tgz | head -40

cd ../core && pnpm pack --pack-destination /tmp/ 2>&1 | tail -3
tar -tzf /tmp/codevena-cvmake-core-0.1.0.tgz | head -40

cd ../templates && pnpm pack --pack-destination /tmp/ 2>&1 | tail -3
tar -tzf /tmp/codevena-cvmake-templates-0.1.0.tgz | head -40

cd ../../apps/cli && pnpm pack --pack-destination /tmp/ 2>&1 | tail -3
tar -tzf /tmp/codevena-cvmake-cli-0.1.0.tgz | head -40

cd ../..
```

Expected each tarball: only `package/dist/**`, `package/bin/cvmake`
(cli only), `package/README.md`, `package/LICENSE`, `package/package.json`.
NO test/, NO tsconfig, NO src/.

- [ ] **Step 3: Verify workspace refs are translated**

```bash
for pkg in schema core templates cli; do
  echo "===" $pkg "==="
  tar -xOzf /tmp/codevena-cvmake-${pkg}-0.1.0.tgz package/package.json \
    | grep -E '"@codevena/cvmake'
done
```

Expected: every reference looks like `"@codevena/cvmake-X": "0.1.0"`.
NO `workspace:*` strings.

If `workspace:*` is present in any tarball: STOP. pnpm publish did not
do the translation. Investigate before continuing. Common cause:
`pnpm publish` running in legacy mode — use `pnpm publish --no-git-checks`
without other flags, or check `.npmrc` for `link-workspace-packages` or
similar overrides.

- [ ] **Step 4: Clean up dry-run tarballs**

```bash
rm /tmp/codevena-cvmake-{schema,core,templates,cli}-0.1.0.tgz /tmp/dry-{schema,core,templates,cli}.txt
```

- [ ] **Step 5: Present go/no-go to Markus**

Summarize:
- All 4 tarballs build and pass dry-run? (yes/no)
- File lists clean? (yes/no, list anything suspicious)
- Workspace refs translated to 0.1.0? (yes/no)
- Total tarball sizes? (rough KB each)
- Anything weird? (free text)

Wait for explicit Markus go-ahead before Task 8. Once Task 8 runs,
unpublishing has a 72h window then becomes permanent.

---

## Task 8: First real publish (Markus runs)

**This step is interactive and irreversible. Markus runs it himself
or pairs with the agent.**

- [ ] **Step 1: Verify npm auth**

```bash
npm whoami
```

Expected: prints Markus's npm username. If not logged in: `npm login`.

- [ ] **Step 2: Verify @codevena org membership**

```bash
npm org ls codevena
```

Expected: shows Markus as owner.

- [ ] **Step 3: Publish in dep order (schema → core → templates → cli)**

```bash
pnpm --filter @codevena/cvmake-schema publish --access public --no-git-checks
pnpm --filter @codevena/cvmake-core publish --access public --no-git-checks
pnpm --filter @codevena/cvmake-templates publish --access public --no-git-checks
pnpm --filter @codevena/cvmake-cli publish --access public --no-git-checks
```

Each step prints the package URL on success
(`https://www.npmjs.com/package/@codevena/cvmake-<name>`).

If any step fails (e.g. 403 from npm): STOP. Do not retry the failed
package without investigation. Common causes: org permissions, OTP
required (npm publishing usually prompts for 2FA), name conflict.

- [ ] **Step 4: Verify all 4 are live**

```bash
for pkg in schema core templates cli; do
  echo "===" $pkg "==="
  npm view @codevena/cvmake-${pkg} version dist-tags.latest
done
```

Expected: each prints `0.1.0` twice.

---

## Task 9: Smoke test from a clean directory

Verify the published CLI actually works end-to-end.

- [ ] **Step 1: Create a clean test dir outside the repo**

```bash
SMOKE=$(mktemp -d /tmp/cvmake-smoke-XXXX)
cd "$SMOKE"
curl -O https://raw.githubusercontent.com/Codevena/cvmake/main/data/cvs/example.en.yaml
mv example.en.yaml cv.yaml
ls
```

Expected: `cv.yaml` is present.

- [ ] **Step 2: Render via npx**

```bash
npx @codevena/cvmake-cli build cv.yaml
```

First run: downloads Chromium (~150 MB, takes 30-90 seconds).
Subsequent runs: instant.

Expected: exit 0, prints something like
`✓ Rendered to out/cv.pdf`.

- [ ] **Step 3: Verify the PDF**

```bash
ls -la out/cv.pdf
file out/cv.pdf
```

Expected: file size > 50 KB, type `PDF document`.

Open it visually:

```bash
open out/cv.pdf
```

Expected: looks identical to what `pnpm cvmake build` produces in the
workspace.

- [ ] **Step 4: Test --version**

```bash
npx @codevena/cvmake-cli --version
```

Expected: `0.1.0`.

- [ ] **Step 5: Test --help**

```bash
npx @codevena/cvmake-cli --help
```

Expected: lists `build`, `validate`, `list-templates`, `build-all`.

- [ ] **Step 6: Clean up the smoke dir**

```bash
cd /
rm -rf "$SMOKE"
```

If anything failed in steps 1-5: open an npm unpublish window (72h
deadline), debug, fix, and republish at 0.1.1. Do not publish 0.1.0
again under any circumstance — npm forbids republishing the same
version.

---

## Task 10 (Stage 2 — optional same session, otherwise own session)

Automate subsequent releases on tag push.

**Files:**
- Create: `.github/workflows/release.yml`
- Manual: Add `NPM_TOKEN` secret to repo settings

- [ ] **Step 1: Create the release workflow**

`.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags: ['v*.*.*']

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9.12.0 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20.11.1
          cache: pnpm
          registry-url: 'https://registry.npmjs.org'

      - run: pnpm install --frozen-lockfile

      - name: cache puppeteer browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/puppeteer
          key: ${{ runner.os }}-puppeteer-${{ hashFiles('**/pnpm-lock.yaml') }}

      - name: install puppeteer chrome
        run: pnpm --filter @codevena/cvmake-core exec puppeteer browsers install chrome

      - run: pnpm build
      - run: pnpm -r test:unit

      - name: publish to npm
        run: |
          set -e
          pnpm --filter @codevena/cvmake-schema publish --access public --no-git-checks
          pnpm --filter @codevena/cvmake-core publish --access public --no-git-checks
          pnpm --filter @codevena/cvmake-templates publish --access public --no-git-checks
          pnpm --filter @codevena/cvmake-cli publish --access public --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 2: Generate the npm Automation Token**

Manually (Markus):

1. https://www.npmjs.com/settings/<username>/tokens/granular
2. Click "Generate new token" → "Granular Access Token"
3. Settings:
   - Name: `cvmake-release-action`
   - Expiration: 1 year
   - Packages and scopes: select all 4 (`@codevena/cvmake-{schema,core,templates,cli}`) with "Read and write" permission
   - Organizations: codevena (read-only — sufficient for publish)
   - IP ranges: leave empty
4. Copy the token (starts with `npm_`).

- [ ] **Step 3: Add the token to GitHub repo secrets**

Manually (Markus):

```bash
gh secret set NPM_TOKEN --body "<paste-token-here>" --repo Codevena/cvmake
```

Or via the GitHub UI: repo Settings → Secrets and variables → Actions →
New repository secret → Name: `NPM_TOKEN`, Secret: `<paste>`.

- [ ] **Step 4: Commit the workflow**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add release workflow for npm publish on tag push

Triggers on v*.*.* tag push. Publishes all 4 @codevena/cvmake-*
packages in dep order. Requires NPM_TOKEN secret in repo settings.

Markus: generate via npmjs.com → Granular Access Token, scope to
the 4 packages, set as 'NPM_TOKEN' secret."
```

- [ ] **Step 5: Document the release flow**

Add a short section to top-level `README.md` (or a `RELEASING.md`)
documenting:

```markdown
## Releasing

Manual:

```bash
pnpm -r --filter "@codevena/cvmake-{cli,core,schema,templates}" \
     exec pnpm version <major|minor|patch>
git add -p   # commit the version bumps
git tag v$(node -p "require('./apps/cli/package.json').version")
git push origin main --tags
```

The push of the tag triggers `.github/workflows/release.yml` which
publishes all 4 packages.
```

Commit the docs change separately:

```bash
git add README.md
git commit -m "docs(release): document tag-based release flow"
```

---

## Final acceptance check

All boxes from the spec's §6:

1. [ ] `npm view @codevena/cvmake-cli@0.1.0` returns published metadata
2. [ ] `npx @codevena/cvmake-cli build cv.yaml` produces a PDF from
       a clean directory on a clean machine
3. [ ] Top-level README quickstart shows the npx command first
4. [ ] All 4 tarball file lists manually reviewed — no stray files
5. [ ] No `workspace:*` strings in any published tarball
6. [ ] (Stage 2) NPM_TOKEN added to repo secrets
7. [ ] (Stage 2) Release workflow exists and the first tag-triggered
       release succeeds

When all green: update `NEXT_SESSION.md` to mark npm publish ✓ done,
and update the `project_cvmake` memory note to reflect the new
ship-ready definition state.
