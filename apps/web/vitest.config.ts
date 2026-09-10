import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    // Some of these tests render real PDFs, so a hook owns a Chromium and
    // `afterAll` has to close it. The 10 s default assumes an idle machine:
    // under load the shutdown overruns and the suite fails for a reason that
    // has nothing to do with the change being tested — which is how a gate
    // teaches people to ignore red. `vitest.visual.config.ts` (120 s) and
    // `packages/core/vitest.integration.config.ts` (60 s) already do this for
    // the same reason; this file drives a browser too and was the one left on
    // the default. Measured: `apps/web` alone is 182/182, and it fails only in
    // the parallel `pnpm -r test:unit` while the machine is loaded.
    hookTimeout: 30_000,
    testTimeout: 30_000,
    environment: 'happy-dom',
    setupFiles: ['./test-setup.ts'],
    globals: true,
    include: ['{app,components,lib}/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
  },
  esbuild: { jsx: 'automatic' },
});
