import path from 'node:path';

const SLUG_RE = /^(?!\.+$)[a-z0-9.-]+$/;

export function validateSlug(slug: string): string {
  if (!SLUG_RE.test(slug)) throw new Error(`invalid slug: ${slug}`);
  return slug;
}

export function dataDir(): string {
  return path.resolve(process.cwd(), 'data', 'cvs');
}

export function photoDir(): string {
  return path.resolve(process.cwd(), 'public', 'photos');
}

export function uploadStagingDir(): string {
  return path.resolve(process.cwd(), 'data', 'cvs', 'photos');
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
