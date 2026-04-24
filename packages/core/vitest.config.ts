import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    exclude: ['test/**/*.integration.test.ts', 'test/**/*.integration.test.tsx'],
    environment: 'node',
  },
  esbuild: { jsx: 'automatic' },
});
