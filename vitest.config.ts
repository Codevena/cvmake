import { defineConfig } from 'vitest/config';

// Repo-level checks that belong to no package: the commands the documentation
// tells people to run have to exist. Run by `pnpm test:repo`, which `./gates`
// includes.
export default defineConfig({
  test: { include: ['test/**/*.test.ts'] },
});
