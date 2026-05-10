import { afterAll, describe, expect, it } from 'vitest';
import { wrapHtmlDocument } from '../src/html-document.js';
import { generatePDF, shutdownPdfBrowser } from '../src/pdf.js';

afterAll(() => shutdownPdfBrowser());

describe('generatePDF', () => {
  it('liefert PDF-Buffer mit %PDF-Header', async () => {
    const html = wrapHtmlDocument({
      title: 'Test CV',
      html: '<h1>Hello</h1>',
      css: 'body{font-family:sans-serif}',
    });
    const buf = await generatePDF(html);
    expect(buf.slice(0, 5).toString('utf8')).toBe('%PDF-');
    expect(buf.byteLength).toBeGreaterThan(1000);
  });
});
