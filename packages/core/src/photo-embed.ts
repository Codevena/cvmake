import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CVData } from '@codevena/cvmake-schema';

/**
 * Resolve a `/photos/<file>` URL (as produced by the editor's photo-upload
 * API) to a filesystem path. Walks up from `startDir` looking for a sibling
 * `public/` directory and joins the URL path into it. Falls back to the
 * literal `path.resolve` result if no public dir is found — `readFile` will
 * then ENOENT and embedPhoto leaves the original path in place.
 */
function resolvePublicUrl(startDir: string, photoUrl: string): string {
  const rel = photoUrl.replace(/^\/+/, '');
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    if (existsSync(path.join(dir, 'public', 'photos'))) {
      return path.join(dir, 'public', rel);
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(startDir, photoUrl);
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
  const filePath = photo.startsWith('/photos/')
    ? resolvePublicUrl(baseDir, photo)
    : path.resolve(baseDir, photo);

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
