import { rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { installFixture, photoPath, uninstallFixture } from './_shared/setup';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PHOTO_JPG = photoPath('cv.test.de', 'jpg');
const PHOTO_WEBP = photoPath('cv.test.de', 'webp');

test.describe('photo upload', () => {
  test.beforeAll(() => installFixture('cv.test.de'));
  test.afterAll(async () => {
    await uninstallFixture('cv.test.de');
    await rm(PHOTO_JPG, { force: true });
    await rm(PHOTO_WEBP, { force: true });
  });

  test('lädt Foto hoch und schreibt jpg+webp', async ({ page }) => {
    await page.goto('/cv/cv.test.de');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.resolve(HERE, 'fixtures', 'photo.jpg'));
    // PhotoCropper opens — wait for the cropped image to attach.
    const cropImg = page.getByAltText('Crop source');
    await cropImg.waitFor({ state: 'visible' });
    // Re-select the 1:1 aspect to force the cropper to recompute and store a centered
    // pixelCrop synchronously (this un-disables Confirm without needing a manual drag).
    await page.getByRole('button', { name: '1:1', exact: true }).click();
    const confirmBtn = page.getByRole('button', { name: /^(Confirm|Bestätigen|Übernehmen)$/i });
    await expect(confirmBtn).toBeEnabled({ timeout: 10000 });
    const uploadResponse = page.waitForResponse(
      (r) => r.url().endsWith('/api/upload') && r.request().method() === 'POST',
    );
    await confirmBtn.click();
    const res = await uploadResponse;
    expect(res.status()).toBe(200);
    await res.finished();
    const jpgStat = await stat(PHOTO_JPG);
    expect(jpgStat.size).toBeGreaterThan(1000);
    const webpStat = await stat(PHOTO_WEBP);
    expect(webpStat.size).toBeGreaterThan(1000);

    // Preview iframe should now render the uploaded photo
    const iframe = page.frameLocator('iframe[title="CV Preview"]');
    await expect(iframe.locator('img[src*="cv.test.de"]')).toHaveAttribute(
      'src',
      '/photos/cv.test.de.jpg',
    );
  });
});
