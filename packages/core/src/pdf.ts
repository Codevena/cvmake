import type { Browser } from 'puppeteer';
import puppeteer from 'puppeteer';

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    });
  }
  return browserPromise;
}

export async function shutdownPdfBrowser(): Promise<void> {
  if (!browserPromise) return;
  const b = await browserPromise;
  browserPromise = null;
  await b.close();
}

export interface GeneratePDFOptions {
  format?: 'A4' | 'Letter' | undefined;
  margin?: { top: string; right: string; bottom: string; left: string } | undefined;
  fontTimeoutMs?: number | undefined;
}

export async function generatePDF(
  html: string,
  opts: GeneratePDFOptions = {},
): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.emulateMediaType('print');
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await Promise.race([
      page.evaluate(() => (document as unknown as { fonts: { ready: Promise<void> } }).fonts.ready),
      new Promise((resolve) => setTimeout(resolve, opts.fontTimeoutMs ?? 5000)),
    ]);
    const pdf = await page.pdf({
      format: opts.format ?? 'A4',
      printBackground: true,
      margin: opts.margin ?? { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      preferCSSPageSize: true,
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
