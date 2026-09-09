import { listTemplates } from '@codevena/cvmake-templates';
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
export const dynamic = 'force-static';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
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
