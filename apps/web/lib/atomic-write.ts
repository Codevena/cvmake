import { randomBytes } from 'node:crypto';
import { rename, rm, writeFile } from 'node:fs/promises';

export async function atomicWriteFile(target: string, contents: string | Buffer): Promise<void> {
  // Include cryptographic randomness in the temp filename so concurrent same-
  // process writes (which can share a `Date.now()` value) cannot collide on
  // the temp path and corrupt each other's output.
  const tmp = `${target}.${process.pid}.${Date.now()}.${randomBytes(8).toString('hex')}.tmp`;
  await writeFile(tmp, contents);
  try {
    await rename(tmp, target);
  } catch (err) {
    await rm(tmp, { force: true });
    throw err;
  }
}
