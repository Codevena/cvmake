import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config.mjs';

/**
 * The editor preview is not an ordinary page. `PreviewFrame` writes into an
 * `about:blank` iframe with `document.write()`, and such a document inherits
 * the EMBEDDER's policy — this one, not the renderer's. The renderer has its
 * own CSP in `packages/core/src/render-network.ts`, and the two have to agree
 * about fonts or the PDF and the preview disagree again, which is the whole
 * point of vendoring them.
 *
 * That is exactly how this was got wrong once: `data:` was added to the
 * renderer's `font-src` and forgotten here, so every vendored face was refused
 * in the browser and the preview silently fell back to a system font.
 */
async function cspDirectives(): Promise<Record<string, string>> {
  const headers = await nextConfig.headers();
  const csp = headers
    .flatMap((h: { headers: { key: string; value: string }[] }) => h.headers)
    .find((h: { key: string }) => h.key === 'Content-Security-Policy');
  expect(csp, 'no Content-Security-Policy header is configured at all').toBeDefined();
  const out: Record<string, string> = {};
  for (const part of String(csp?.value).split(';')) {
    const [name, ...rest] = part.trim().split(/\s+/);
    if (name) out[name] = rest.join(' ');
  }
  return out;
}

describe('the app CSP', () => {
  it('allows the vendored fonts, which are data: URIs', async () => {
    const d = await cspDirectives();
    expect(d['font-src']).toBeDefined();
    expect(d['font-src']?.split(' ')).toContain('data:');
  });

  it('still refuses everything by default, and frames', async () => {
    // Counter-probe: the point is not "allow more", it is "allow exactly the
    // one scheme the fonts need". If these ever loosen, the case above stops
    // meaning anything.
    const d = await cspDirectives();
    expect(d['default-src']).toBe("'self'");
    expect(d['frame-ancestors']).toBe("'none'");
    expect(d['font-src']?.split(' ')).not.toContain('*');
    // Vendoring the fonts made two remote hosts unnecessary. An allowance
    // nothing uses is just a wider policy, and it reads as though the app
    // still fetches from Google when it no longer does.
    expect(d['font-src']).not.toContain('gstatic');
    expect(d['style-src']).not.toContain('googleapis');
  });
});
