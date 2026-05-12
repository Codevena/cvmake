import { dataDir } from '@/lib/data-paths';
import { getPreviewBootstrap } from '@/lib/preview-bootstrap';
import { wrapHtmlDocument } from '@codevena/cvmake-core/html-document';
import { generatePDF } from '@codevena/cvmake-core/pdf';
import { embedPhoto } from '@codevena/cvmake-core/photo-embed';
import { renderCV } from '@codevena/cvmake-core/renderer';
import { CVDataSchema } from '@codevena/cvmake-schema';
import { bootstrapTemplates, getTemplate } from '@codevena/cvmake-templates';
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
  slug?: string;
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
    return NextResponse.json({ kind: 'validation', issues: parsed.error.issues }, { status: 422 });
  }
  const template = getTemplate(body.templateId);
  if (!template) {
    return NextResponse.json({ kind: 'unknown_template' }, { status: 404 });
  }
  // The live preview iframe loads photos via the Next.js public dir as
  // /photos/<slug>.jpg URLs, but Puppeteer renders the HTML via setContent
  // with no base URL — those relative/absolute paths would 404 inside the
  // PDF. Inline the photo as a base64 data URL first, matching what the CLI
  // build pipeline does (apps/cli/src/commands/build.ts). dataDir() points
  // at data/cvs/ which is both the natural base for relative photo paths
  // ("photos/example-lena.webp" → data/cvs/photos/example-lena.webp) and a
  // descendant from which embedPhoto can walk up to find public/photos for
  // absolute /photos/<slug>.jpg URLs produced by the upload API.
  const embedded = await embedPhoto(parsed.data, dataDir());
  const { html, css } = await renderCV({
    data: embedded,
    template,
    ...(body.paletteId !== undefined ? { paletteId: body.paletteId } : {}),
  });
  const bootstrap = getPreviewBootstrap();
  const tplCss = bootstrap.templates[body.templateId]?.css ?? '';
  const fullCss = `${tplCss}\n${css}`;
  const doc = wrapHtmlDocument({
    title: `${parsed.data.personal.firstName} CV`,
    html,
    css: fullCss,
  });
  const pdf = await generatePDF(doc);
  // Spec §11: filename is `${slug}-${templateId}.pdf` when the caller knows
  // the slug. Falling back to lastName keeps the route useful for ad-hoc
  // payloads (e.g. tests) that don't carry a slug.
  const filename =
    `${body.slug ?? parsed.data.personal.lastName}-${body.templateId}.pdf`.toLowerCase();
  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  });
}
