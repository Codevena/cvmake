import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { fixturePath, installFixture, uninstallFixture } from './_shared/setup';

test.describe('load → edit → save', () => {
  test.beforeAll(() => installFixture('cv.test.de'));
  test.afterAll(() => uninstallFixture('cv.test.de'));

  test('schreibt Änderung in YAML', async ({ page }) => {
    await page.goto('/cv/cv.test.de');
    // Phase-7 <Input required> renders the label as "First name *" — match the prefix.
    const first = page.getByLabel(/^First name/);
    // Wait for the form to hydrate before filling. Without this, `fill()` can
    // race the initial CV→form propagation and get clobbered when react-hook-form
    // settles its initial value — the source of the long-standing Linux-CI flake.
    await expect(first).toHaveValue('TestVorname');
    // Even after the initial value lands, react-hook-form can re-settle
    // `defaultValues` one more tick later on slow CI and clobber a fill that
    // landed in that window. Retry fill+verify until the new value sticks.
    await expect(async () => {
      await first.fill('NeuerName');
      await expect(first).toHaveValue('NeuerName', { timeout: 1000 });
    }).toPass({ timeout: 10_000 });
    // Poll the YAML file on disk instead of matching DOM text. The original
    // /Gespeichert/ substring assertion was unsound because it also matched
    // any pre-existing "✓ Gespeichert vor Xs" badge from a prior save, so
    // the test could pass before the edit was persisted. And the brief
    // "⟳ Speichere…" flash (autosave fetch completes in <100ms on localhost)
    // is unreliable to catch via Playwright's polling cadence. Polling the
    // file itself is the only deterministic signal that the autosave loop
    // actually wrote the new value through to disk. 15s = 2s debounce + 5x
    // generous margin for Linux-CI variance.
    await expect
      .poll(async () => readFile(fixturePath('cv.test.de'), 'utf8'), {
        timeout: 25000,
        intervals: [200],
      })
      .toContain('NeuerName');
  });
});
