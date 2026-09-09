import { cp, mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

// `.md` is here for the font licences: the package redistributes six OFL
// families as base64 inside `<template>/fonts.css`, and the OFL requires the
// licence and the copyright notices to travel with them. Without it
// `dist/shared/FONT-LICENSES.md` is not published and every fonts.css header
// points at a file that is not in the tarball.
const exts = new Set(['.css', '.png', '.woff2', '.svg', '.md']);
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
