import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUT = path.join(import.meta.dirname, 'fixtures', 'photo-input.jpg');

await writeFile(
  OUT,
  await sharp({
    create: { width: 1000, height: 1000, channels: 3, background: { r: 60, g: 120, b: 180 } },
  })
    .jpeg({ quality: 90 })
    .toBuffer(),
);
