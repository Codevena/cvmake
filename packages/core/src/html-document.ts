import { renderCsp } from './render-network.js';

export interface HtmlDocOptions {
  title: string;
  html: string;
  css: string;
  extraHead?: string | undefined;
  /** BCP-47 language code for the <html lang="…"> attribute. Defaults to 'en'. */
  lang?: string | undefined;
}

export function wrapHtmlDocument({
  title,
  html,
  css,
  extraHead = '',
  lang = 'en',
}: HtmlDocOptions): string {
  // Defense-in-depth: every caller today passes a schema-validated `Locale`
  // enum value (`'de' | 'en'`), but the helper has no internal guarantee.
  // Escape so a future caller passing unsanitized input cannot inject HTML
  // attributes via the lang slot (mirrors how `title` is already escaped).
  // The CSP meta must precede the stylesheet. A meta placed after `<style>`
  // does not govern that stylesheet's own fetches (`@import`, `@font-face`,
  // `url()`) — measured. It is also the only layer that stops `<link
  // rel=prefetch>`, which bypasses Puppeteer's request interception entirely;
  // do not remove it as "redundant with the renderer policy".
  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="${escapeHtml(renderCsp())}" />
<title>${escapeHtml(title)}</title>
<style>${css}</style>
${extraHead}
</head>
<body>${html}</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
