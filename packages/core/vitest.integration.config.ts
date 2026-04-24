import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.integration.test.ts', 'test/**/*.integration.test.tsx'],
    environment: 'node',
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
