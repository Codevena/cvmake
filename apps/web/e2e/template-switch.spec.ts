import { expect, test } from '@playwright/test';
import { installFixture, uninstallFixture } from './_shared/setup';

test.describe('template switch', () => {
  test.beforeAll(() => installFixture('cv.test.de'));
  test.afterAll(() => uninstallFixture('cv.test.de'));

  test('Template-Wechsel updated iframe-CSS und resettet Palette', async ({ page }) => {
    await page.goto('/cv/cv.test.de');
    // give the iframe a moment to write its initial document
    await page.waitForTimeout(500);
    const iframe = page.frameLocator('iframe[title="CV Preview"]');
    const oldTplCss = await iframe.locator('#template-css').textContent();
    expect(oldTplCss).toBeTruthy();

    // The template grid now lives behind a Popover in the 72px icon sidebar —
    // open it via its trigger button before reaching the radiogroup. `exact`
    // avoids colliding with the "Open command palette" (⌘K) button.
    await page.getByRole('button', { name: 'Template', exact: true }).click();
    // pick "Modern Minimal" — the radio (TemplateCard) inside the Template radiogroup
    await page
      .getByRole('radiogroup', { name: 'Template' })
      .getByRole('radio', { name: /Modern Minimal/ })
      .click();

    await page.waitForTimeout(500);
    const newTplCss = await iframe.locator('#template-css').textContent();
    expect(newTplCss).not.toBe(oldTplCss);

    // The palette selector is behind its own Popover — opening it (an outside
    // click relative to the Template popover) also closes the Template one.
    // `exact` avoids matching the "Open command palette" (⌘K) button.
    await page.getByRole('button', { name: 'Palette', exact: true }).click();
    // Palette resets to first palette of the new template (Modern Minimal → Minimal Ink)
    await expect(page.getByRole('radio', { name: 'Minimal Ink' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});
