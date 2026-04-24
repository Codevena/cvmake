export interface HtmlDocOptions {
  title: string;
  html: string;
  css: string;
  extraHead?: string | undefined;
}

export function wrapHtmlDocument({ title, html, css, extraHead = '' }: HtmlDocOptions): string {
  return `<!doctype html>
<html lang="de">
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
