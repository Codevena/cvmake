import type { CVData } from '@codevena/cvmake-schema';

/**
 * Turns a failed export into something a person can act on. `HTTP 503` told the
 * user nothing, and the caller swallowed even that — the button simply went
 * back to its label and the export never happened.
 */
async function explain(res: Response): Promise<string> {
  let kind: string | undefined;
  try {
    kind = ((await res.json()) as { kind?: string }).kind;
  } catch {
    // Not JSON — fall through to the status-based wording.
  }
  switch (kind) {
    case 'client_unverified':
      return 'The server cannot identify this request and refused the export. This is a server configuration problem, not something you can fix here.';
    case 'busy':
      return 'The server is rendering too many PDFs right now. Try again in a moment.';
    case 'rate_limited':
      return 'Too many exports in a short time. Try again in a minute.';
    case 'timeout':
      return 'Rendering took too long and was stopped.';
    case 'validation':
      return 'The CV is not valid, so it cannot be exported.';
    case 'too_large':
      return 'This CV is too large to export.';
    default:
      return `The export failed (HTTP ${res.status}).`;
  }
}

export async function exportPdf(args: { data: CVData; slug: string }): Promise<void> {
  const { data, slug } = args;
  const res = await fetch('/api/export', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      data,
      slug,
      templateId: data.rendering.template,
      paletteId: data.rendering.palette,
    }),
  });
  if (!res.ok) throw new Error(await explain(res));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}-${data.rendering.template}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
