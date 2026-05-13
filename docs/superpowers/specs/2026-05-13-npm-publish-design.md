# npm publish — @codevena/cvmake-* lockstep

**Author:** Markus Wiesecke
**Date:** 2026-05-13
**Status:** Spec — awaiting approval

---

## 1. Goal

Make `npx @codevena/cvmake-cli build cv.yaml` work for any user with
Node.js installed. Drop time-to-first-PDF from ~5 min (`git clone` +
`pnpm install` + `pnpm build` + invoke) to ~30 sec (one `npx`
invocation).

This is the last "🔜" in the Ship-Ready Definition agreed on
2026-05-11. After this lands, the only remaining item before launch is
the announcement post.

## 2. Scope

Publish **4 packages** to npm under the `@codevena` org, in lockstep:

| Package | Why it must be public |
|---|---|
| `@codevena/cvmake-cli` | The CLI entry — what users actually invoke |
| `@codevena/cvmake-core` | Renderer, loader, PDF, photo, i18n — CLI dep |
| `@codevena/cvmake-schema` | Zod schema — `-core` and `-templates` dep |
| `@codevena/cvmake-templates` | The 12 React templates — CLI dep |

## 3. Non-goals

- **NOT publishing** `@codevena/cvmake-ui` (web-only, no CLI consumer),
  `@codevena/cvmake-web` (the editor app — runs on cvmake.codevena.dev),
  `@codevena/cvmake-showcase` (static GH Pages site).
- No `cvmake init` scaffolding command — own feature, separate session.
- No Homebrew / Docker / nvm integration.
- No prerelease channels (no `@next`, `@beta`) — main → npm publish only.
- No public API freeze. We're at `0.1.0`, not `1.0.0`; minor versions may
  break exports until 1.0.

## 4. Decisions

### 4.1 Versioning — lockstep

All 4 packages bump to the same version on every release, even if only
one changed. Reasoning:

- Eliminates the "which version of `-core` does `-cli@0.2.0` need?"
  cross-reference problem.
- Matches how the monorepo is built (workspace:* implies "consume the
  current tip"). Lockstep makes the contract explicit.
- Future-proofs against accidental skew if `-cli` ships changes that
  depend on new `-core` exports.

**First public version: `0.1.0`** for all 4. Signals "early stable,
expect minor breakage on minor bumps."

**Bump command (in the release script):**
```bash
pnpm -r --filter "@codevena/cvmake-{cli,core,schema,templates}" \
     exec pnpm version <major|minor|patch>
```

### 4.2 publishConfig

Each of the 4: `"publishConfig": { "access": "public" }` and drop
`"private": true`. Scoped packages default to restricted (paid plan)
without this.

### 4.3 Workspace ref translation

pnpm publish auto-replaces `workspace:*` in dependencies with the actual
version at publish time. We verify this with `pnpm publish --dry-run`
and inspect the proposed `package.json` inside the tarball. Expected:

```json
"dependencies": {
  "@codevena/cvmake-schema": "0.1.0"   // not "workspace:*"
}
```

### 4.4 Files field — minimal tarballs

Each published package declares an explicit `files` array. Default pnpm
behaviour is "ship everything not in `.npmignore`" — too noisy. We list:

- `cvmake-cli`: `["dist", "bin", "README.md", "LICENSE"]`
- `cvmake-core`: `["dist", "README.md", "LICENSE"]`
- `cvmake-schema`: `["dist", "README.md", "LICENSE"]`
- `cvmake-templates`: `["dist", "README.md", "LICENSE"]`

Note: `package.json` is always included automatically.

### 4.5 LICENSE per package

Each of the 4 gets a copy (not symlink — symlinks break in tarballs) of
the repo-root LICENSE. Same MIT text, same copyright holder. We commit
real files so the published tarball contains the LICENSE.

### 4.6 README per package

- **`cvmake-cli`** gets a full README: install, quickstart, YAML schema
  pointer, example output, list of templates, link to the web demo.
  This is THE README most users see (`npm install` → `npm view`).
- **`cvmake-core`**, **`cvmake-schema`**, **`cvmake-templates`** get
  short READMEs (~10 lines) pointing back to the main repo. They're
  consumed transitively; few users will look at them.

### 4.7 npm metadata (each of 4)

```json
{
  "description": "<package-specific one-liner>",
  "keywords": ["cv", "resume", "yaml", "pdf", "puppeteer", "react"],
  "homepage": "https://cvmake.codevena.dev",
  "bugs": { "url": "https://github.com/Codevena/cvmake/issues" },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/Codevena/cvmake.git",
    "directory": "<apps/cli|packages/core|...>"
  },
  "license": "MIT",
  "author": "Markus Wiesecke"
}
```

### 4.8 Release process — manual first, automated after

**Stage 1 — manual first publish (this session):**

1. `npm login` (interactive, on Markus's machine)
2. Verify `@codevena` org exists or is claimable
3. Bump all 4 to `0.1.0`
4. `pnpm -r --filter <list> publish --dry-run --no-git-checks` — inspect
   each tarball's `package.json` and file list
5. `pnpm -r --filter <list> publish --access public --no-git-checks` —
   real publish, in dependency order: schema → core → templates → cli

**Stage 2 — automated subsequent releases (deferred or same session):**

GitHub Actions workflow on tag push (`v0.2.0` etc.):

```yaml
# .github/workflows/release.yml
on:
  push:
    tags: ['v*.*.*']
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - checkout, pnpm setup, install
      - run: pnpm build
      - run: pnpm test:unit
      - run: pnpm -r --filter "@codevena/cvmake-{cli,core,schema,templates}" \
               publish --access public --no-git-checks
        env:
          NPM_CONFIG_PROVENANCE: true
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Requires `NPM_TOKEN` secret in repo settings — npm Automation Token
(granular, publish scope only, no read access to private packages).

### 4.9 README quickstart rewrite

Top-level `README.md` quickstart section gets a new top entry:

```bash
# Install + render in one shot
npx @codevena/cvmake-cli build path/to/cv.yaml
```

The existing `git clone → pnpm` quickstart stays as the contributor path.

### 4.10 CLI binary — already correct

`apps/cli/bin/cvmake` is `#!/usr/bin/env node\nimport('../dist/index.js');`,
mode `0755`. npm preserves file mode in tarballs. No changes needed.

## 5. Risks & mitigations

| Risk | Mitigation |
|---|---|
| @codevena org not registered | Try claim via `npm publish` (creates the scope if you're authenticated and the scope is free); verify in step 1 of stage 1 |
| Package name squatting | All 4 names verified unclaimed today (`npm view` → E404). Publish ASAP to lock them. |
| First publish is irrevocable (72h unpublish window) | Dry-run with tarball inspection BEFORE real publish. Markus reviews the tarball file list. |
| Workspace ref not translated by pnpm | Verified by dry-run inspection — fail the publish if any dep starts with `workspace:` |
| Sharp/Puppeteer install heaviness | Document in README: "first run downloads Chromium (~150 MB)". This is the cost of high-fidelity PDF rendering and is unavoidable. |
| `0.1.0` chosen but breaks expectations | semver rules: pre-1.0 minor bumps CAN break. README and CHANGELOG note this. |
| CI flake on automated release | First publish is manual; automated step is added AFTER first publish succeeds. Lowers blast radius. |

## 6. Acceptance criteria

1. ✓ `npm view @codevena/cvmake-cli@0.1.0` returns the published metadata
2. ✓ From an empty directory on a clean machine: `npx @codevena/cvmake-cli
   build path/to/cv.de.yaml` produces `out/cv.de.pdf` matching what
   `pnpm cvmake build …` produces from the workspace
3. ✓ Top-level README quickstart shows the npx command first and works
   end-to-end as written
4. ✓ All 4 tarball file lists reviewed manually — no stray test
   fixtures, dotfiles, or workspace metadata
5. ✓ `package.json` in each tarball has concrete versions, no
   `workspace:*` strings
6. ✓ NPM_TOKEN added to repo secrets (for stage 2)
7. ✓ Release workflow exists in `.github/workflows/release.yml` (stage
   2) — can be deferred to a follow-up commit if stage 1 takes the
   session budget

## 7. Open questions

1. **Org claim:** is `@codevena` already an npm org under Markus's
   account? If not, manual claim during `npm login`. Markus to confirm
   before we kick off stage 1.
2. **Provenance:** enable `npm publish --provenance` for supply-chain
   attestation? Requires the automated workflow path; not relevant for
   manual stage 1.
3. **Drop `apps/cli/package.json` `private: true` cleanup** — only `cli`
   currently has `private: true` from the workspace lockfile. core/
   schema/templates have it too. Confirmed by spec — drop on all 4.
4. **`puppeteer` as `optionalDependencies`?** — Some users may want to
   render via a system Chromium they already have. Current setup
   requires Puppeteer's bundled Chromium download. Deferred; current
   behavior shipped as-is.

## 8. Out of scope (for future sessions)

- `cvmake init` scaffolding command
- Homebrew formula
- Docker image
- Provenance attestation pipeline
- Public API freeze + 1.0.0 release
- `@codevena/cvmake-ui` and `-web` as published packages
