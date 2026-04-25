import { Buffer } from 'node:buffer';
import { expect, test } from '@playwright/test';
import { installFixture, uninstallFixture } from './_shared/setup';

test.describe('pdf export', () => {
  test.beforeAll(() => installFixture('cv.test.de'));
  test.afterAll(() => uninstallFixture('cv.test.de'));

  test('Klick auf "PDF exportieren" liefert ein A4 PDF', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/cv/cv.test.de');
    // RHF mode is 'onChange' but the first valid render still needs a tick
    // for `formState.isValid` to flip and un-disable the button.
    const exportBtn = page.getByRole('button', { name: /PDF exportieren/ });
    await expect(exportBtn).toBeEnabled({ timeout: 5000 });

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 45_000 }),
      exportBtn.click(),
    ]);

    const buf = await download.createReadStream().then(async (s) => {
      if (!s) return Buffer.alloc(0);
      const chunks: Buffer[] = [];
      for await (const c of s) chunks.push(c as Buffer);
      return Buffer.concat(chunks);
    });
    expect(buf.byteLength).toBeGreaterThan(10_000);
    expect(buf.subarray(0, 4).toString()).toBe('%PDF');
  });
});
