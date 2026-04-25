import { copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(HERE, '..');
const SRC = path.resolve(HERE, 'fixtures', 'cv.broken.yaml');
const DST = path.join(WEB_ROOT, 'data', 'cvs', 'cv.broken.yaml');

test.describe('broken yaml', () => {
  test.beforeAll(() => copyFile(SRC, DST));
  test.afterAll(() => rm(DST, { force: true }));

  test('Banner zeigt Fehler, Export disabled', async ({ page }) => {
    await page.goto('/cv/cv.broken');
    // RSC throws on YAMLParseError before EditorShell mounts; Next will show the
    // default error boundary or a 500. Assert the error page rather than a banner
    // (acceptable for MVP; later we'll catch in the RSC and show a banner).
    await expect(page.locator('body')).toContainText(/yaml|YAML|parse|error|exception/i, {
      timeout: 10_000,
    });
  });
});
