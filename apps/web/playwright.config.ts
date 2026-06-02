import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  // Retry in CI to absorb the inherent timing flakiness of a browser + dev
  // server + Puppeteer PDF suite; none locally so real failures aren't masked.
  // `trace: 'on-first-retry'` below captures a trace when a retry kicks in.
  // workers stays at 1: the e2e specs share the dev server and write the same
  // data/cvs fixtures, so parallel runs would race.
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
