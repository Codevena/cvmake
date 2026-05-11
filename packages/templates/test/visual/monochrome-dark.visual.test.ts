import { renderCV, shutdownPdfBrowser, wrapHtmlDocument } from '@codevena/cvmake-core';
import { fullFixture } from '@codevena/cvmake-schema/test/fixtures.js';
import puppeteer from 'puppeteer';
import { afterAll, describe, expect, it } from 'vitest';
import { loadTemplateCss } from '../../src/css.js';
import { bootstrapTemplates, getTemplate } from '../../src/index.js';
import { THRESHOLD_RATIO, diffAgainstBaseline } from './_baseline-helpers.js';

const TEMPLATE_ID = 'monochrome-dark';

afterAll(() => shutdownPdfBrowser());

async function renderPageOneAsPng(paletteId: string): Promise<Buffer> {
  bootstrapTemplates();
  const template = getTemplate(TEMPLATE_ID);
  if (!template) throw new Error(`${TEMPLATE_ID} not registered`);
  const rendered = await renderCV({
    data: fullFixture,
    template,
    paletteId,
  });
  const css = `${rendered.css}\n${loadTemplateCss(TEMPLATE_ID)}`;
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

describe(`${TEMPLATE_ID} visual baseline`, () => {
  bootstrapTemplates();
  const template = getTemplate(TEMPLATE_ID);
  if (!template) throw new Error(`${TEMPLATE_ID} not registered`);

  it.each(template.palettes.map((p) => p.id))('matches baseline für %s', async (paletteId) => {
    const png = await renderPageOneAsPng(paletteId);
    const { ratio } = await diffAgainstBaseline({
      templateId: TEMPLATE_ID,
      paletteId,
      png,
    });
    expect(ratio).toBeLessThan(THRESHOLD_RATIO);
  });
});
