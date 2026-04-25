import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUT = path.join(import.meta.dirname, 'fixtures', 'photo-input.jpg');

const WIDTH = 1000;
const HEIGHT = 1000;
const CHANNELS = 3;

// Build a horizontal RGB gradient so cropping changes the output bytes.
// Each row is identical; each column x maps to (R, G, B) varying across 0..255.
const buffer = Buffer.alloc(WIDTH * HEIGHT * CHANNELS);
for (let y = 0; y < HEIGHT; y++) {
  for (let x = 0; x < WIDTH; x++) {
    const idx = (y * WIDTH + x) * CHANNELS;
    const t = x / (WIDTH - 1); // 0..1 across width
    buffer[idx] = Math.round(t * 255); // R: 0..255
    buffer[idx + 1] = Math.round((1 - t) * 255); // G: 255..0
    buffer[idx + 2] = Math.round(Math.abs(0.5 - t) * 2 * 255); // B: 255..0..255
  }
}

await writeFile(
  OUT,
  await sharp(buffer, { raw: { width: WIDTH, height: HEIGHT, channels: CHANNELS } })
    .jpeg({ quality: 90 })
    .toBuffer(),
);
