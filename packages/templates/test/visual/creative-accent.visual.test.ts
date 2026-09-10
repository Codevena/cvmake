import { shutdownPdfBrowser } from '@codevena/cvmake-core/pdf';
import puppeteer, { type Browser } from 'puppeteer';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creativeAccent } from '../../src/creative-accent/index.js';
import {
  THRESHOLD_RATIO,
  diffAgainstBaseline,
  renderTemplatePageOne,
} from './_baseline-helpers.js';

const TEMPLATE = creativeAccent;

// One browser per file instead of one per screenshot: this suite took 34
// browser launches to produce 34 images.
let browser: Browser;
beforeAll(async () => {
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
});
afterAll(async () => {
  await browser.close();
  await shutdownPdfBrowser();
});

describe(`${TEMPLATE.meta.id} visual baseline`, () => {
  it('has palettes to check', () => {
    // Guards the loop below: `it.each([])` registers nothing, and a file that
    // checks nothing reports success.
    expect(TEMPLATE.palettes.length).toBeGreaterThan(0);
  });

  it.each(TEMPLATE.palettes.map((p) => p.id))('matches baseline für %s', async (paletteId) => {
    const png = await renderTemplatePageOne({ browser, template: TEMPLATE, paletteId });
    const { ratio } = await diffAgainstBaseline({
      templateId: TEMPLATE.meta.id,
      paletteId,
      png,
    });
    expect(ratio).toBeLessThan(THRESHOLD_RATIO);
  });
});
