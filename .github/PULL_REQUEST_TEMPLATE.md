## What
<!-- one-line description -->

## Why
<!-- motivation; link issue if applicable -->

## How
<!-- key implementation choices -->

## Screenshots
<!-- for UI changes -->

## Tested
`./gates` runs all six in one go and prints an exit code per gate — the same six
CI runs. The individual commands are here so a failure can be re-run on its own.

- [ ] Build passes (`pnpm build`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Typecheck passes (`pnpm typecheck`)
- [ ] Unit tests pass (`pnpm -r test:unit`, or `pnpm test`)
- [ ] Integration tests pass (`pnpm -r test:integration` — needs Chromium:
      `pnpm --filter @codevena/cvmake-core exec puppeteer browsers install chrome`)
- [ ] Pack/install smoke test passes (`node scripts/smoke-pack.mjs`)
- [ ] Manually verified the change works
