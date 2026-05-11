import { renderCV, shutdownPdfBrowser, wrapHtmlDocument } from '@codevena/cvmake-core';
import { fullFixture } from '@codevena/cvmake-schema/test/fixtures.js';
import puppeteer from 'puppeteer';
import { afterAll, describe, expect, it } from 'vitest';
import { creativeAccent } from '../../src/creative-accent/index.js';
import { loadTemplateCss } from '../../src/css.js';
import { THRESHOLD_RATIO, diffAgainstBaseline } from './_baseline-helpers.js';

const TEMPLATE = creativeAccent;

afterAll(() => shutdownPdfBrowser());

async function renderPageOneAsPng(paletteId: string): Promise<Buffer> {
  const rendered = await renderCV({
    data: fullFixture,
    template: TEMPLATE,
    paletteId,
  });
  const css = `${rendered.css}\n${loadTemplateCss(TEMPLATE.meta.id)}`;
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

describe(`${TEMPLATE.meta.id} visual baseline`, () => {
  it.each(TEMPLATE.palettes.map((p) => p.id))('matches baseline für %s', async (paletteId) => {
    const png = await renderPageOneAsPng(paletteId);
    const { ratio } = await diffAgainstBaseline({
      templateId: TEMPLATE.meta.id,
      paletteId,
      png,
    });
    expect(ratio).toBeLessThan(THRESHOLD_RATIO);
  });
});
