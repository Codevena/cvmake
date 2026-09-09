import { describe, expect, it } from 'vitest';

/**
 * Imports ONLY the route, and deliberately nothing that populates the template
 * registry.
 *
 * That isolation is the whole point. The route gates on `listTemplates()`, and
 * Next bundles a route handler separately from the pages, so a page calling
 * `bootstrapTemplates()` does nothing for this module's copy of the registry.
 * In a production build every request returned 404 — including after the
 * editor page had been rendered — and `PreviewFrame` asks for exactly this URL,
 * so the preview got none of the vendored faces. Any test that shares a process
 * with something which has already bootstrapped will pass regardless; this one
 * must not import such a thing.
 */
describe('GET /template-fonts/[id] in a cold module', () => {
  it('serves the vendored faces without anyone else bootstrapping first', async () => {
    const { GET } = await import('./[id]/route');
    const res = await GET(new Request('http://x/template-fonts/tech-dev.css'), {
      params: Promise.resolve({ id: 'tech-dev.css' }),
    });
    expect(res.status).toBe(200);
    const css = await res.text();
    expect(css).toContain('@font-face');
    expect(css).toContain('data:font/woff2;base64,');
  });

  it('is not statically frozen', async () => {
    // A unit test cannot observe Next's static cache, so this pins the
    // directive that produced it. With `force-static` on a dynamic segment and
    // no `generateStaticParams`, the first answer for a path is frozen into
    // `.next/server/app/template-fonts/<id>.body` — and when that first answer
    // was a 404, every later request served the cached 404 across rebuilds.
    // Measured against `next build && next start`: 22 bytes of "unknown
    // template" for all twelve, then 200 with 279411 bytes once it was gone.
    const mod = await import('./[id]/route');
    expect(mod.dynamic).not.toBe('force-static');
  });

  it('still refuses an unknown id', async () => {
    // The counter-probe: bootstrapping must widen the allowlist to the real
    // twelve, not disable it.
    const { GET } = await import('./[id]/route');
    const res = await GET(new Request('http://x/template-fonts/../package.json'), {
      params: Promise.resolve({ id: '../package.json' }),
    });
    expect(res.status).toBe(404);
  });
});
