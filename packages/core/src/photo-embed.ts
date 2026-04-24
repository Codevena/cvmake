import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CVData } from '@cvmake/schema';

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

  const filePath = path.resolve(baseDir, photo);

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
