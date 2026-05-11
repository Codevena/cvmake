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

If you change a template's layout, regenerate the showcase PNGs:

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
