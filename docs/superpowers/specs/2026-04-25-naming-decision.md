# Naming Decision — `forq`

**Date:** 2026-04-25
**Status:** Approved (Alex, 2026-04-25)
**Replaces working title:** `cvMake`

## Decision

The project is renamed from the working title `cvMake` to **`forq`**.

- **Product name:** `forq`
- **GitHub org:** `Codevena` (existing handle, not renamed)
- **Repo path:** `Codevena/forq` (initially private, later public)
- **npm scope:** `@codevena/*` (e.g. `@codevena/forq`, `@codevena/forq-core`, `@codevena/forq-templates`)
- **Tagline:** *Fork your CV — open-source YAML-driven résumé builder.*
- **Domain:** none for now. If needed later: `forq.codevena.dev` (subdomain on existing Codevena domain).

## Rationale

### Why "forq"

The product's central user action is **forking**: users fork the repo, swap their YAML data, generate a CV. The name names the action.

`forq` rather than `fork` because:

1. **Brand vs. generic word.** "fork" is a common verb; "forq" is a coinage and unambiguous in conversation and search. ("I use forq" reads as a brand; "I use fork" requires context.)
2. **Symmetry with Codevena.** Both are 2-syllable coinages with a real word inside (`code+vena`, `for+q`). Reads like a family.
3. **`q`-ending feels like a developer tool.** Echoes naming conventions in dev infra (RabbitMQ, ZeroMQ, Sequelize, Tanstack Query).

### Tradeoff acknowledged

`forq` does not announce that it is a CV builder. The chosen mitigation: descriptive metadata around a brandable name.

| Surface | Treatment |
|---------|-----------|
| GitHub repo description | "Fork your CV — open-source YAML-driven résumé builder. 8 templates, CLI + Web UI, MIT." |
| GitHub topics | `cv`, `resume`, `lebenslauf`, `yaml`, `pdf`, `typescript`, `nextjs`, `oss`, `build-in-public` |
| README H1 | `forq` |
| README tagline | `Fork. Edit. Ship. — A developer's open-source CV builder.` |
| npm package description | Same as repo description |

This treatment lets searchers find the project on terms like "yaml cv generator" or "resume builder typescript" via topics + description, while the name itself stays brandable.

### Alternatives considered

| Candidate | Reason rejected |
|-----------|-----------------|
| `papercv` / `paper.cv` | Strong descriptive option; fallback if brand-build effort is unwanted later. Defers to `forq` on brandability. |
| `cvforge` / `cvfoundry` | Generic "forge" naming pattern; many existing projects with similar names. |
| `mkcv` | Strong CLI aesthetic but reads as a coreutil, not a product. |
| `vellum` | Premium-print vibe, but disconnected from dev/git theme. |
| `forq.com / .dev / .io / .app` domains | All taken externally — pivoted to "no domain yet, Codevena subdomain when needed". |

### Reversibility

The repo is currently private with no published packages or external references. A rename costs ~1 hour of work (package.json names, imports, README) and is reversible until the project goes public. Branding/SEO is invested in incrementally; we are not locked in.

## Availability summary (verified 2026-04-25)

| Asset | Status |
|-------|--------|
| `Codevena/forq` GitHub repo | ✅ free |
| `@codevena/forq` npm scope | ✅ free (entire scope) |
| Unscoped `forq` on npm | ❌ taken (abandoned package, irrelevant — we use scoped) |
| `github.com/forq` user | ❌ taken (different user; not blocking — repo path is `Codevena/forq`) |
| `forq.com` / `.dev` / `.io` / `.app` | ❌ all taken (not blocking — no domain needed yet) |
| `forq.codevena.dev` subdomain | ✅ under our control |

## Rename plan

Mechanical rename from `cvmake`/`cvMake`/`@cvmake/*` to `forq`/`@codevena/*`. Affected: ~78 files (78 grep hits across `*.json`, `*.ts`, `*.tsx`, `*.md`, `*.mjs`).

### Scope of replacements

| From | To | Where |
|------|-----|-------|
| `@cvmake/schema` | `@codevena/forq-schema` | All package.json `name` + every TS/TSX import |
| `@cvmake/core` | `@codevena/forq-core` | Same |
| `@cvmake/templates` | `@codevena/forq-templates` | Same |
| `@cvmake/cli` | `@codevena/forq-cli` | Same |
| `@cvmake/ui` | `@codevena/forq-ui` | Same (Phase 7, not yet built — placeholder) |
| `@cvmake/web` | `@codevena/forq-web` | Same |
| Root package name `cvmake` | `forq` | `/package.json` only |
| CLI binary name (current: `cvmake`) | `forq` | `apps/cli/package.json` `bin` field |
| Repo description / README references | "forq" | docs and READMEs |
| Spec doc file name `2026-04-24-cvmake-design.md` | leave as-is | historic record; superseded by an updated entry inside |

### Steps

1. **Update every `@cvmake/*` package name** in `*/package.json` `name` and `dependencies` to `@codevena/forq-*`.
2. **Find-and-replace `@cvmake/` → `@codevena/forq-`** across all source files (TS/TSX, tests, mjs).
3. **Rename root package** in `/package.json` from `cvmake` to `forq`.
4. **Update CLI binary name** in `apps/cli/package.json` `bin` field from `cvmake` to `forq`.
5. **Update CLI usage strings** — `Usage: cvmake build ...` → `Usage: forq build ...` in `apps/cli/src/**`.
6. **Update doc references** — `cvMake` / `cvmake` → `forq` in:
   - `docs/superpowers/specs/2026-04-24-cvmake-design.md` (add a deprecation note pointing to this naming decision; keep historic content intact otherwise)
   - `docs/superpowers/plans/2026-04-24-cvmake-plan.md`
   - `docs/template-review-2026-04-25.md`
   - `NEXT_SESSION.md`
   - Templates' palette/meta files where `cvMake` appears in comments or descriptions
7. **Run `pnpm install`** to refresh the lockfile and ensure workspace links resolve under the new names.
8. **Verify build** — `pnpm typecheck && pnpm build && pnpm --filter '!@codevena/forq-ui' --filter '!@codevena/forq-web' test:unit && pnpm --filter @codevena/forq-templates test:visual && pnpm --filter @codevena/forq-cli test:integration`.
9. **Commit:** `chore: rename project from cvmake to forq` with the spec link.
10. **Create GitHub repo `Codevena/forq` (private)** via `gh repo create`.
11. **Add remote and push:** `git remote add origin git@github.com:Codevena/forq.git && git push -u origin feat/cvmake-mvp` (branch name stays as-is for now; can be renamed in a follow-up).

### Why `@codevena/forq-*` instead of `@codevena/*`

Using `forq-` as a prefix inside the `@codevena` scope (e.g. `@codevena/forq-core`, `@codevena/forq-cli`) reserves the bare `@codevena/*` namespace for future Codevena tools. If `@codevena/core` were claimed by this project, a future product (say `@codevena/letter` for an Anschreiben tool) would have to either also prefix or live in a separate scope. The `forq-` prefix scopes this product cleanly.

### Out of scope for this rename

- No working-directory rename. The on-disk path stays `/Users/alex/Developer/cvMake` to avoid invalidating Claude memory paths and shell history references. The path is irrelevant to the brand once the repo is on GitHub.
- No npm publishing in this step. Packages stay private until Phase 11 (README + screenshots + first public release).
- No branch rename (`feat/cvmake-mvp`). Defer to whenever we open the first PR against `main`.
- No CI changes — there is no CI yet.
- No `apps/web` or `@codevena/forq-ui` content changes beyond the package-name swap.

## Acceptance criteria

- `pnpm typecheck`, `pnpm build`, all unit/visual/integration tests pass with new names.
- `node apps/cli/dist/index.js build ...` works and prints "forq" branding (or at minimum no longer prints "cvMake").
- `git remote -v` shows `origin git@github.com:Codevena/forq.git`.
- Initial push succeeds; branch is visible on GitHub under `Codevena/forq`.

## Open questions

None.
