import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CVData } from '@codevena/cvmake-schema';

/**
 * Walk up from `startDir` looking for a sibling `public/` directory that
 * contains a `photos/` folder. Returns the `public/` path or null.
 */
function findPublicDir(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    if (existsSync(path.join(dir, 'public', 'photos'))) {
      return path.join(dir, 'public');
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * True when `target` resolves to `root` itself or a path strictly inside it.
 * Mirrors the path-traversal guard in apps/web/lib/data-paths.ts so a
 * malicious `..`/absolute photo value cannot escape its allowed directory.
 */
function isContained(target: string, root: string): boolean {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  return resolvedTarget === resolvedRoot || resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`);
}

function mimetypeFromExt(ext: string): string | null {
  switch (ext.toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    default:
      return null;
  }
}

/**
 * Reads the photo referenced in CVData and replaces its path with a base64
 * data URL so Puppeteer can render it without a base URL.
 *
 * - If photo is already a data URL, returns data unchanged (idempotent).
 * - If photo is undefined/empty, returns data unchanged.
 * - If the file does not exist, returns data unchanged (templates fall back
 *   to initials rendering).
 */
export async function embedPhoto(data: CVData, baseDir: string): Promise<CVData> {
  const photo = data.personal.photo;

  // Nothing to embed
  if (!photo) return data;

  // Already a data URL — idempotent
  if (photo.startsWith('data:')) return data;

  const mimetype = mimetypeFromExt(path.extname(photo));
  if (!mimetype) return data;

  // The editor's photo-upload API returns absolute `/photos/<slug>.jpg`
  // paths (so the dev server can serve them at the same URL), but here we
  // need a real filesystem path. Map a leading `/photos/` onto the repo's
  // `public/photos/` so PDF export embeds the same image the live preview
  // shows. Relative paths still resolve against `baseDir` (the YAML dir).
  //
  // Security: `photo` is an unconstrained user-supplied string (CVDataSchema
  // only types it as an optional string). Confine the resolved path to its
  // allowed root so a `..`/absolute payload cannot turn this into an
  // arbitrary file read whose bytes get embedded into the returned PDF.
  let filePath: string;
  let allowedRoot: string;
  if (photo.startsWith('/photos/')) {
    const publicDir = findPublicDir(baseDir);
    if (!publicDir) return data; // no public/ dir → nothing to embed
    const rel = photo.replace(/^\/+/, '');
    filePath = path.join(publicDir, rel);
    allowedRoot = path.join(publicDir, 'photos');
  } else {
    filePath = path.resolve(baseDir, photo);
    allowedRoot = path.resolve(baseDir);
  }

  if (!isContained(filePath, allowedRoot)) {
    // Path traversal blocked — leave the original value untouched.
    return data;
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(filePath);
  } catch {
    // File not found — leave original path so template can fall back to initials
    return data;
  }

  const dataUrl = `data:${mimetype};base64,${bytes.toString('base64')}`;

  return {
    ...data,
    personal: {
      ...data.personal,
      photo: dataUrl,
    },
  };
}
