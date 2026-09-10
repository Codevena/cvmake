import { shutdownPdfBrowser } from '@codevena/cvmake-core/pdf';
import puppeteer, { type Browser } from 'puppeteer';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bootstrapTemplates, getTemplate } from '../../src/index.js';
import {
  THRESHOLD_RATIO,
  diffAgainstBaseline,
  renderTemplatePageOne,
} from './_baseline-helpers.js';

const TEMPLATE_ID = 'bauhaus';

// At module scope, not in `beforeAll`: `it.each` below is evaluated while
// vitest COLLECTS the file, which happens before any hook runs. Bootstrapping
// later leaves the registry empty at that moment, `palettes` undefined, and
// the suite registers zero cases while reporting success.
bootstrapTemplates();
const TEMPLATE = getTemplate(TEMPLATE_ID);
if (!TEMPLATE) throw new Error(`${TEMPLATE_ID} is not registered`);

// One browser per file instead of one per screenshot: this suite used 34
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

describe(`${TEMPLATE_ID} visual baseline`, () => {
  it('has palettes to check', () => {
    // Guards the loop below: `it.each([])` registers nothing and a file that
    // checks nothing reports success.
    expect(TEMPLATE.palettes.length).toBeGreaterThan(0);
  });

  it.each(TEMPLATE.palettes.map((p) => p.id))('matches baseline für %s', async (paletteId) => {
    const png = await renderTemplatePageOne({ browser, template: TEMPLATE, paletteId });
    const { ratio } = await diffAgainstBaseline({ templateId: TEMPLATE_ID, paletteId, png });
    expect(ratio).toBeLessThan(THRESHOLD_RATIO);
  });
});
