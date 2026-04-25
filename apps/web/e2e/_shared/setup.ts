import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// `apps/web/e2e/_shared/` → repo root is 4 levels up. The dev server resolves
// data/cvs and public/photos from the workspace root via `repoRoot()` in
// `lib/data-paths.ts`, so e2e fixtures must be installed there too.
const REPO_ROOT = path.resolve(HERE, '../../../..');
const DATA_DIR = path.join(REPO_ROOT, 'data', 'cvs');
const PHOTO_DIR = path.join(REPO_ROOT, 'public', 'photos');

function dst(name: string): string {
  return path.join(DATA_DIR, `${name}.yaml`);
}

export async function installFixture(name: 'cv.test.de' | 'cv.test.en'): Promise<void> {
  const src = path.resolve(HERE, '..', 'fixtures', `${name}.yaml`);
  const target = dst(name);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(src, target);
}

export async function uninstallFixture(name: string): Promise<void> {
  await rm(dst(name), { force: true });
}

/**
 * Path to the installed fixture (under repo-root data/cvs), NOT to the source
 * fixture file under `e2e/fixtures/`. Used by tests that need to read the YAML
 * back to assert autosave wrote to disk.
 */
export function fixturePath(name: string): string {
  return dst(name);
}

export function dataPath(name: string): string {
  return dst(name);
}

export function photoPath(slug: string, ext: 'jpg' | 'webp'): string {
  return path.join(PHOTO_DIR, `${slug}.${ext}`);
}

export function repoRoot(): string {
  return REPO_ROOT;
}
