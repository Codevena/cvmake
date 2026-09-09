import { bootstrapTemplates, listTemplates } from '@codevena/cvmake-templates';
import { loadTemplateFontCss } from '@codevena/cvmake-templates/css';

/**
 * Serves one template's vendored `@font-face` block to the preview iframe.
 *
 * The faces used to be inlined into the bootstrap object that `EditorShell`
 * receives as a prop. That prop is serialised into every editor page load, so
 * inlining them took it from ~57 KB to 2.12 MB — and eleven twelfths of it was
 * for templates the viewer was not looking at. Here the browser fetches only
 * the one it is rendering, and caches it.
 *
 * Deliberately NOT under `/api/`: `middleware.ts` matches `/api/:path*`, and a
 * stylesheet is neither a mutation nor rate-limit-worthy.
 *
 * The PDF path does not use this route and must not: the renderer refuses all
 * network access, and gets the same bytes from `loadTemplateCss` on the server.
 */
/**
 * NOT `force-static`. On a dynamic segment with no `generateStaticParams`, Next
 * freezes whatever the handler returned for a path the first time it is asked —
 * and if that first answer was a 404, every later request gets the cached 404
 * from `.next/server/app/template-fonts/<id>.body`, rebuild or not. Measured:
 * `next build && next start`, cold, returned 22 bytes of "unknown template" for
 * all twelve.
 *
 * Caching belongs in the response header instead, where a rebuild cannot be
 * out-voted by a stale artefact.
 */
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  // Next bundles a route handler separately from the pages, so the registry
  // this module sees is its own: a page calling bootstrapTemplates() does
  // nothing for it. Without this line `listTemplates()` is empty in a
  // production build and every request 404s — including after the editor page
  // has been rendered — which leaves the preview with no vendored faces at all.
  // It is idempotent.
  bootstrapTemplates();

  const { id } = await params;
  const templateId = id.replace(/\.css$/, '');

  // Only ids the registry knows. Without this the parameter reaches the
  // filesystem, and `..` in a route segment is not something to rely on Next
  // to have normalised.
  if (!listTemplates().some((t) => t.meta.id === templateId)) {
    return new Response('/* unknown template */', {
      status: 404,
      headers: { 'content-type': 'text/css; charset=utf-8' },
    });
  }

  const css = loadTemplateFontCss(templateId);
  return new Response(css, {
    status: 200,
    headers: {
      'content-type': 'text/css; charset=utf-8',
      // The bytes are content-addressed by template id and change only when the
      // package does, so this is safe to cache hard.
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}
