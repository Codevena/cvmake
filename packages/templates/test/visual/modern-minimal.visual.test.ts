import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import puppeteer from 'puppeteer';
import {
  renderCV,
  wrapHtmlDocument,
  shutdownPdfBrowser,
} from '@codevena/forq-core';
import { modernMinimal } from '../../src/modern-minimal/index.js';
import { loadTemplateCss } from '../../src/css.js';
import { fullFixture } from '@codevena/forq-schema/test/fixtures.js';

const BASELINE_DIR = path.resolve('__tests__/__visual__/modern-minimal');
const ACTUAL_DIR = path.resolve('__tests__/__visual__/modern-minimal/.actual');
const UPDATE = process.env.UPDATE_VISUAL === '1';

afterAll(() => shutdownPdfBrowser());

async function renderPageOneAsPng(paletteId: string): Promise<Buffer> {
  const template = modernMinimal;
  const rendered = await renderCV({ data: fullFixture, template, paletteId });
  const css = `${rendered.css}\n${loadTemplateCss('modern-minimal')}`;
  const html = wrapHtmlDocument({ title: 'CV', html: rendered.html, css });
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buf = await page.screenshot({ fullPage: false, type: 'png' });
    return Buffer.from(buf);
  } finally {
    await browser.close();
  }
}

describe('modern-minimal visual baseline', () => {
  it('matched Baseline für minimal-ink', async () => {
    const png = await renderPageOneAsPng('minimal-ink');
    const baselinePath = path.join(BASELINE_DIR, 'minimal-ink.page1.png');
    await mkdir(ACTUAL_DIR, { recursive: true });
    await writeFile(path.join(ACTUAL_DIR, 'minimal-ink.page1.png'), png);

    if (UPDATE || !existsSync(baselinePath)) {
      await mkdir(BASELINE_DIR, { recursive: true });
      await writeFile(baselinePath, png);
      return;
    }

    const baseline = PNG.sync.read(await readFile(baselinePath));
    const actual = PNG.sync.read(png);
    const diff = new PNG({ width: baseline.width, height: baseline.height });
    const mismatched = pixelmatch(
      baseline.data,
      actual.data,
      diff.data,
      baseline.width,
      baseline.height,
      { threshold: 0.1 },
    );
    const total = baseline.width * baseline.height;
    expect(mismatched / total).toBeLessThan(0.001);
  });
});
