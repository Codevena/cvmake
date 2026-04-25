import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// `apps/web` package root (the dev server resolves data/cvs relative to its cwd).
const WEB_ROOT = path.resolve(HERE, '../..');

function dst(name: string): string {
  return path.join(WEB_ROOT, 'data', 'cvs', `${name}.yaml`);
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

export function fixturePath(name: string): string {
  return dst(name);
}
