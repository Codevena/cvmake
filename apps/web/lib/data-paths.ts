import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const SLUG_RE = /^(?!\.+$)[a-z0-9.-]+$/;

export function validateSlug(slug: string): string {
  if (!SLUG_RE.test(slug)) throw new Error(`invalid slug: ${slug}`);
  return slug;
}

/**
 * Walk up from process.cwd() looking for a `pnpm-workspace.yaml` marker so
 * `dataDir()`/`photoDir()` resolve to the workspace root regardless of where
 * the Next.js dev server was launched from. Falls back to cwd when the marker
 * is not found (e.g. in unit-test temp dirs).
 *
 * Not cached so tests that mock `process.cwd()` get fresh results.
 */
function repoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

export function dataDir(): string {
  return path.resolve(repoRoot(), 'data', 'cvs');
}

export function photoDir(): string {
  return path.resolve(repoRoot(), 'public', 'photos');
}

export function uploadStagingDir(): string {
  return path.resolve(repoRoot(), 'data', 'cvs', 'photos');
}

export async function listSlugs(): Promise<string[]> {
  try {
    const files = await readdir(dataDir());
    return files
      .filter((f) => f.endsWith('.yaml'))
      .map((f) => f.slice(0, -'.yaml'.length))
      .sort();
  } catch {
    return [];
  }
}

export function resolveCvPath(slug: string): string {
  validateSlug(slug);
  const base = dataDir();
  const candidate = path.resolve(base, `${slug}.yaml`);
  if (!candidate.startsWith(`${base}${path.sep}`)) {
    throw new Error(`path traversal blocked: ${slug}`);
  }
  return candidate;
}
