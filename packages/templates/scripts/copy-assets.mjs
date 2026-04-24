import { cp, readdir, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';

const exts = new Set(['.css', '.png', '.woff2', '.svg']);
const src = path.resolve('src');
const dist = path.resolve('dist');

async function* walk(dir) {
  for (const entry of await readdir(dir)) {
    const p = path.join(dir, entry);
    const s = await stat(p);
    if (s.isDirectory()) yield* walk(p);
    else yield p;
  }
}

let count = 0;
for await (const file of walk(src)) {
  if (!exts.has(path.extname(file))) continue;
  const dest = file.replace(src, dist);
  await mkdir(path.dirname(dest), { recursive: true });
  await cp(file, dest, { force: true });
  count++;
}
console.log(`copied ${count} asset(s)`);
