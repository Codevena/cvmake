import type { CVData } from '@codevena/cvmake-schema';

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
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}-${data.rendering.template}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
