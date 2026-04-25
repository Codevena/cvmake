import { generatePDF, renderCV, wrapHtmlDocument } from '@codevena/forq-core';
import { CVDataSchema } from '@codevena/forq-schema';
import { bootstrapTemplates, getTemplate } from '@codevena/forq-templates';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let booted = false;
function ensureBoot(): void {
  if (booted) return;
  bootstrapTemplates();
  booted = true;
}

interface ExportRequest {
  data: unknown;
  templateId: string;
  paletteId?: string;
}

export async function POST(req: Request): Promise<Response> {
  ensureBoot();
  let body: ExportRequest;
  try {
    body = (await req.json()) as ExportRequest;
  } catch {
    return NextResponse.json({ kind: 'bad_request' }, { status: 400 });
  }
  const parsed = CVDataSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { kind: 'validation', issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const template = getTemplate(body.templateId);
  if (!template) {
    return NextResponse.json({ kind: 'unknown_template' }, { status: 404 });
  }
  const { html, css } = renderCV({
    data: parsed.data,
    template,
    ...(body.paletteId !== undefined ? { paletteId: body.paletteId } : {}),
  });
  const fullCss = `${(template as { css?: string }).css ?? ''}\n${css}`;
  const doc = wrapHtmlDocument({
    title: `${parsed.data.personal.firstName} CV`,
    html,
    css: fullCss,
  });
  const pdf = await generatePDF(doc);
  const filename = `${parsed.data.personal.lastName}-${body.templateId}.pdf`.toLowerCase();
  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  });
}
