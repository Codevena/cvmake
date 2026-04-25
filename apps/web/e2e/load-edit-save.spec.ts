import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { fixturePath, installFixture, uninstallFixture } from './_shared/setup';

test.describe('load → edit → save', () => {
  test.beforeAll(() => installFixture('cv.test.de'));
  test.afterAll(() => uninstallFixture('cv.test.de'));

  test('schreibt Änderung in YAML', async ({ page }) => {
    await page.goto('/cv/cv.test.de');
    // Phase-7 <Input required> renders the label as "Vorname *" — match the prefix.
    const first = page.getByLabel(/^Vorname/);
    await first.fill('NeuerName');
    // wait for autosave (debounced 2s)
    await page.waitForTimeout(2500);
    await expect(page.getByText(/Gespeichert/)).toBeVisible({ timeout: 5000 });
    const yaml = await readFile(fixturePath('cv.test.de'), 'utf8');
    expect(yaml).toContain('NeuerName');
  });
});
