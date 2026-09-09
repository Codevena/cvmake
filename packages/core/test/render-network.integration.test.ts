import http from 'node:http';
import type { AddressInfo } from 'node:net';
import puppeteer, { type Browser } from 'puppeteer';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { wrapHtmlDocument } from '../src/html-document.js';
import { generatePDF, shutdownPdfBrowser } from '../src/pdf.js';
import { applyRenderNetworkPolicy } from '../src/render-network.js';

/**
 * Every target in this file is a loopback listener started by the test itself.
 * Nothing here may ever address a host outside this machine — the point is to
 * prove that the renderer does not reach out, and a test that itself reaches
 * out would be measuring the network instead of the guard.
 */

/** 1x1 transparent PNG — the legitimate, embedded photo. */
const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

interface Listener {
  url(pathname: string): string;
  hits: string[];
  close(): Promise<void>;
}

async function startListener(handler?: http.RequestListener): Promise<Listener> {
  const hits: string[] = [];
  const server = http.createServer((req, res) => {
    hits.push(req.url ?? '');
    if (handler) return handler(req, res);
    res.writeHead(200, { 'content-type': 'image/jpeg' });
    res.end('x');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: (pathname) => `http://127.0.0.1:${port}${pathname}`,
    hits,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

describe('generatePDF denies remote loads', () => {
  afterAll(() => shutdownPdfBrowser());

  it('blocks an attacker-supplied http image and still produces a PDF', async () => {
    const listener = await startListener();
    try {
      const doc = wrapHtmlDocument({
        title: 'export',
        html: `<h1>CV</h1>
          <img id="attack" src="${listener.url('/internal-secret.jpg')}" alt="a" />
          <img id="ok" src="${PIXEL}" alt="b" />`,
        css: 'body{font-family:sans-serif}',
      });
      const pdf = await generatePDF(doc, { fontTimeoutMs: 2000 });

      // The attack: with the policy in place the listener is never contacted.
      // Without it (measured before this guard existed) the very same document
      // produces exactly one hit.
      expect(listener.hits).toEqual([]);
      expect(pdf.subarray(0, 5).toString('utf8')).toBe('%PDF-');
      expect(pdf.byteLength).toBeGreaterThan(1000);
    } finally {
      await listener.close();
    }
  });

  it('blocks it through the renderer policy alone, with no CSP in the document', async () => {
    // Isolates L1. The test above cannot: wrapHtmlDocument emits the CSP, so
    // the attack is refused even with the interception removed — measured, the
    // mutation "delete applyRenderNetworkPolicy from pdf.ts" survived it. With
    // a CSP-free document the renderer policy is the only thing left, and that
    // mutation goes red where it should.
    const listener = await startListener();
    try {
      const doc = `<!doctype html><html><head><meta charset="utf-8" /><title>t</title></head><body><img src="${listener.url('/no-csp.jpg')}"></body></html>`;
      const pdf = await generatePDF(doc, { fontTimeoutMs: 2000 });
      expect(listener.hits).toEqual([]);
      expect(pdf.subarray(0, 5).toString('utf8')).toBe('%PDF-');
    } finally {
      await listener.close();
    }
  });

  it('lets the embedded data: image through — the guard must not blank photos', async () => {
    // The counter-probe: every other test here fails when the renderer is too
    // permissive, this one when it is too strict.
    //
    // What it actually guards is the CSP, not the handler. Measured: a `data:`
    // request IS handed to the interception handler and `abort()` on it even
    // resolves — but the abort does not stop the decode, so naturalWidth stays
    // 1 (an aborted http image goes to 0). A handler that aborts everything
    // therefore cannot blank an embedded photo. What can is tightening
    // `img-src data:` in renderCsp, and that is the mutation this test kills.
    //
    // Do not read this as "data: bypasses interception": it does not. The
    // branch has no observable effect on the render — an aborted data: load
    // decodes anyway, and removing it leaves the PDF byte-identical — but it is
    // part of the exported predicate's contract and its unit tests, so do not
    // delete it as unreachable.
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await applyRenderNetworkPolicy(page);
      await page.setContent(
        wrapHtmlDocument({
          title: 'export',
          html: `<img id="ok" src="${PIXEL}" alt="b" />`,
          css: 'body{margin:0}',
        }),
        { waitUntil: 'load' },
      );
      const width = await page.evaluate(
        () => (document.getElementById('ok') as HTMLImageElement | null)?.naturalWidth ?? 0,
      );
      expect(width).toBe(1);
    } finally {
      await browser.close();
    }
  });
});

describe('the policy is re-evaluated on every redirect hop', () => {
  let browser: Browser;
  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });
  afterAll(() => browser.close());

  /**
   * Drives a page whose first hop is allowed and whose redirect target is not.
   * The production predicate cannot express this: an https loopback listener
   * would need port 443, which means root and a certificate. Hence the
   * test-only predicate seam — without it this test would pass without a
   * redirect ever happening, and would prove nothing.
   */
  async function run(allowFirstHop: boolean) {
    const target = await startListener();
    const entry = await startListener((_req, res) => {
      res.writeHead(302, { location: target.url('/second-hop.jpg') });
      res.end();
    });
    const decisions: Array<[string, boolean]> = [];
    const page = await browser.newPage();
    try {
      const firstHop = entry.url('/first-hop.jpg');
      await applyRenderNetworkPolicy(
        page,
        { allowedHosts: [] },
        { onDecision: (url, allowed) => decisions.push([url, allowed]) },
        (url) => (allowFirstHop ? url === firstHop : true),
      );
      await page.setContent(`<!doctype html><img src="${firstHop}">`, { waitUntil: 'load' });
      await new Promise((r) => setTimeout(r, 300));
      return { decisions, entryHits: [...entry.hits], targetHits: [...target.hits] };
    } finally {
      await page.close();
      await entry.close();
      await target.close();
    }
  }

  it('allows hop 1 and refuses the redirect target', async () => {
    const { decisions, entryHits, targetHits } = await run(true);
    expect(entryHits).toHaveLength(1); // hop 1 went through
    expect(targetHits).toEqual([]); // hop 2 did not
    // onDecision is exercised only here; it is exported API.
    expect(decisions).toHaveLength(2);
    expect(decisions[0]?.[1]).toBe(true);
    expect(decisions[1]?.[1]).toBe(false);
  });

  it('counter-probe: allowing everything does reach the redirect target', async () => {
    // Proves the previous test measures the guard rather than a dead redirect.
    const { targetHits } = await run(false);
    expect(targetHits).toHaveLength(1);
  });
});

describe('the CSP blocks on its own, without request interception', () => {
  let browser: Browser;
  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });
  afterAll(() => browser.close());

  type Build = (l: Listener) => string;

  /** Renders a document with no request interception at all, so the only thing
   * that can stop a load is the CSP itself. `mode` picks where the meta goes. */
  async function hitsFor(
    html: Build,
    css: Build,
    mode: 'document' | 'meta-after-style' | 'no-csp',
  ): Promise<string[]> {
    const listener = await startListener();
    const page = await browser.newPage();
    try {
      const bodyHtml = html(listener);
      const styles = css(listener);
      const meta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src 'none'; base-uri 'none'; form-action 'none'" />`;
      const head =
        mode === 'document'
          ? null
          : mode === 'meta-after-style'
            ? `<style>${styles}</style>${meta}`
            : `<style>${styles}</style>`;
      const doc =
        head === null
          ? wrapHtmlDocument({ title: 't', html: bodyHtml, css: styles })
          : `<!doctype html><html><head><meta charset="utf-8" />${head}</head><body>${bodyHtml}</body></html>`;
      await page.setContent(doc, { waitUntil: 'load' });
      await new Promise((r) => setTimeout(r, 300));
      return [...listener.hits];
    } finally {
      await page.close();
      await listener.close();
    }
  }

  it('blocks an http <img>: 0 hits with the CSP, 1 without', async () => {
    const html: Build = (l) => `<img src="${l.url('/img.jpg')}">`;
    const css: Build = () => 'body{margin:0}';
    expect(await hitsFor(html, css, 'document')).toEqual([]);
    expect(await hitsFor(html, css, 'no-csp')).toHaveLength(1);
  });

  it('blocks a stylesheet @import — and only because the meta precedes <style>', async () => {
    const html: Build = () => '<p>x</p>';
    const css: Build = (l) => `@import url("${l.url('/font.css')}");\nbody{margin:0}`;
    expect(await hitsFor(html, css, 'document')).toEqual([]);
    // Same directives, placed after the stylesheet: they no longer govern it.
    // This is the number that makes the placement testable at all — an <img>
    // is blocked either way and would hide the difference.
    expect(await hitsFor(html, css, 'meta-after-style')).toHaveLength(1);
    expect(await hitsFor(html, css, 'no-csp')).toHaveLength(1);
  });
});
