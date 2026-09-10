import { randomBytes } from 'node:crypto';
import { rename, rm, writeFile } from 'node:fs/promises';

/**
 * Writes a file by creating a temporary sibling and renaming it into place.
 *
 * `rename` within one filesystem is atomic, so a reader never sees a partially
 * written file — it sees either the old contents or the new ones. That matters
 * most for paths something else serves while they are being written:
 * `public/photos/<slug>.webp` is fetched by the browser, and a plain
 * `writeFile` interrupted halfway hands it a truncated image.
 *
 * The temporary file MUST be a sibling of the target. A temp in `os.tmpdir()`
 * usually lives on a different filesystem, where `rename` is not a rename at
 * all but a copy — and copies are not atomic.
 *
 * What this does NOT do: pair two files. Writing A and then B atomically still
 * leaves A new and B old if the process dies between them. Callers that need
 * both or neither have to say so themselves.
 */
export async function atomicWriteFile(target: string, contents: string | Buffer): Promise<void> {
  // Cryptographic randomness in the temp name, because two concurrent writes
  // in one process can share a `Date.now()` value and would otherwise collide
  // on the temp path and corrupt each other.
  const tmp = `${target}.${process.pid}.${Date.now()}.${randomBytes(8).toString('hex')}.tmp`;
  try {
    // The write belongs inside the try: a partial write — ENOSPC is the
    // realistic one — leaves bytes on disk, and cleaning up only after a
    // failed `rename` leaves them there for ever.
    await writeFile(tmp, contents);
    await rename(tmp, target);
  } catch (err) {
    await rm(tmp, { force: true });
    throw err;
  }
}
