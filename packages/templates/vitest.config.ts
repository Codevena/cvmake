import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    exclude: ['test/visual/**', 'node_modules', 'dist'],
    environment: 'node',
  },
  esbuild: { jsx: 'automatic' },
});
