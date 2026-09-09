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
 * Drops the photo field entirely. Used for every value that did not become an
 * embedded data URL — leaving such a value in place would put an arbitrary,
 * user-chosen URL into the rendered `<img src>`.
 */
function withoutPhoto(data: CVData): CVData {
  const { photo: _dropped, ...personal } = data.personal;
  return { ...data, personal };
}

/**
 * Reads the photo referenced in CVData and replaces its path with a base64
 * data URL so Puppeteer can render it without a base URL.
 *
 * POSTCONDITION, relied upon by the renderer: on return, `personal.photo` is
 * either absent or a `data:image/` URL. Nothing else ever reaches the document.
 * Every branch that cannot embed the value therefore drops the field, and the
 * templates render their initials fallback — which is what this comment claimed
 * long before it was true.
 *
 * The schema (packages/schema) already refuses remote and control-character
 * values before a request reaches here. This is the second, independent half:
 * it holds even for callers that skip validation.
 */
export async function embedPhoto(data: CVData, baseDir: string): Promise<CVData> {
  const photo = data.personal.photo;

  // Nothing to embed. Dropping rather than returning as-is keeps the
  // postcondition free of exceptions ('' is not a data: URL).
  if (!photo) return withoutPhoto(data);

  // Already an embedded image — idempotent. Tested case-insensitively and
  // restricted to `data:image/` so this branch accepts exactly the set the
  // schema accepts; `/^data:/i` would keep a `data:text/html` value the schema
  // refuses, and the two layers would mean different things.
  if (/^data:image\//i.test(photo)) return data;

  const mimetype = mimetypeFromExt(path.extname(photo));
  if (!mimetype) return withoutPhoto(data);

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
    if (!publicDir) return withoutPhoto(data); // no public/ dir → nothing to embed
    const rel = photo.replace(/^\/+/, '');
    filePath = path.join(publicDir, rel);
    allowedRoot = path.join(publicDir, 'photos');
  } else {
    filePath = path.resolve(baseDir, photo);
    allowedRoot = path.resolve(baseDir);
  }

  if (!isContained(filePath, allowedRoot)) {
    // Path traversal blocked — and the value is dropped, not left in place:
    // refusing to READ it while still rendering it as `<img src>` would move
    // the problem from the filesystem to the network.
    return withoutPhoto(data);
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(filePath);
  } catch {
    // File not found — drop the field so the template really does fall back to
    // initials instead of rendering a dead <img>.
    return withoutPhoto(data);
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
