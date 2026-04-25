import { rename, rm, writeFile } from 'node:fs/promises';

export async function atomicWriteFile(target: string, contents: string | Buffer): Promise<void> {
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, contents);
  try {
    await rename(tmp, target);
  } catch (err) {
    await rm(tmp, { force: true });
    throw err;
  }
}
