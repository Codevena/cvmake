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
  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8" />
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
