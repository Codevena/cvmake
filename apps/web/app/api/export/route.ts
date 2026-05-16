import { dataDir, validateSlug } from '@/lib/data-paths';
import { isDemoMode } from '@/lib/demo-mode';
import { getPreviewBootstrap } from '@/lib/preview-bootstrap';
import { checkOrigin } from '@/lib/request-guards';
import { wrapHtmlDocument } from '@codevena/cvmake-core/html-document';
import { generatePDF } from '@codevena/cvmake-core/pdf';
import { embedPhoto } from '@codevena/cvmake-core/photo-embed';
import { renderCV } from '@codevena/cvmake-core/renderer';
import { CVDataSchema } from '@codevena/cvmake-schema';
import { bootstrapTemplates, getTemplate } from '@codevena/cvmake-templates';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Demo-mode allowlist (C1)
// ---------------------------------------------------------------------------
const DEMO_SLUGS = new Set(['example.en', 'example.de']);

// ---------------------------------------------------------------------------
// Body cap (existing)
// ---------------------------------------------------------------------------
// A CV is text — even a verbose payload with embedded base64 photos sits
// well under a megabyte. Cap explicit so an unbounded JSON body cannot
// pressure memory before validation runs.
const MAX_EXPORT_BODY_BYTES = 2 * 1024 * 1024;

class BodyTooLargeError extends Error {}

async function readBoundedText(req: Request, maxBytes: number): Promise<string> {
  const reader = req.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }
  const total = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    total.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8').decode(total);
}

// ---------------------------------------------------------------------------
// H1 — Rate limiting: token-bucket per IP (5 requests/minute)
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

interface BucketEntry {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, BucketEntry>();
// Cap on map size to bound memory under spoofed X-Forwarded-For floods (the
// header is attacker-controlled). When the map exceeds this, expired entries
// are pruned eagerly before any further allocation. The cap is conservative —
// 10k unique IPs in a 60s window means the rate-limiter is the wrong primary
// defense at that scale and you'd want a real reverse-proxy throttle.
const MAX_RATE_BUCKETS = 10_000;

function pruneExpired(now: number): void {
  for (const [key, entry] of rateBuckets) {
    if (entry.resetAt <= now) rateBuckets.delete(key);
  }
}

function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '__unknown__';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  let entry = rateBuckets.get(ip);
  // Hard cap: at the limit we first try pruning expired entries; if the map
  // is still full (e.g. a spoofed-IP flood within a single 60s window) we
  // refuse new entrants entirely. Existing IPs already in the map keep
  // their normal rate budget.
  if (!entry && rateBuckets.size >= MAX_RATE_BUCKETS) {
    pruneExpired(now);
    if (rateBuckets.size >= MAX_RATE_BUCKETS) {
      return { allowed: false, retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000) };
    }
  }
  if (!entry || now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateBuckets.set(ip, entry);
    return { allowed: true, retryAfter: 0 };
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }
  return { allowed: true, retryAfter: 0 };
}

// ---------------------------------------------------------------------------
// H1 — Concurrency semaphore (max 3 concurrent PDF renders)
// ---------------------------------------------------------------------------
const MAX_CONCURRENT_EXPORTS = 3;
let activeExports = 0;

// ---------------------------------------------------------------------------
// H1 — Render timeout (20 seconds). On expiry we abort the AbortSignal we
// pass into generatePDF, which closes the Puppeteer page and causes the
// in-flight render promise to reject. Releasing the concurrency semaphore is
// therefore tied to the actual promise settling, NOT to the timeout firing —
// see the call site below.
// ---------------------------------------------------------------------------
const RENDER_TIMEOUT_MS = 20_000;

// ---------------------------------------------------------------------------
interface ExportRequest {
  data: unknown;
  templateId: string;
  paletteId?: string;
  slug?: string;
}

export async function POST(req: Request): Promise<Response> {
  // H3 — Origin check (CSRF protection)
  const originErr = checkOrigin(req);
  if (originErr) return originErr;

  // H1 — Rate limit
  const ip = getClientIp(req);
  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { kind: 'rate_limited', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  // H1 — Atomic concurrency acquire (claude-A pass).
  // The cap check and increment MUST be in the same synchronous block — JS
  // event-loop semantics guarantee no other request can interleave between
  // these two lines, so the cap is enforced precisely. The previous code
  // had an await (body read + JSON.parse) between the check and the
  // increment, which let burst-load requests all observe activeExports=0
  // and blow past MAX_CONCURRENT_EXPORTS.
  if (activeExports >= MAX_CONCURRENT_EXPORTS) {
    return NextResponse.json({ kind: 'busy' }, { status: 503 });
  }
  activeExports += 1;
  try {
    bootstrapTemplates();
    // Pre-check the declared Content-Length, then stream the body and count
    // bytes. Content-Length can be missing or spoofed, so the streaming counter
    // is the actual enforcement and the header check just lets us short-circuit
    // honest oversize requests before allocating any buffers.
    const declaredLength = req.headers.get('content-length');
    if (declaredLength !== null && Number(declaredLength) > MAX_EXPORT_BODY_BYTES) {
      return NextResponse.json(
        { kind: 'too_large', maxBytes: MAX_EXPORT_BODY_BYTES },
        { status: 413 },
      );
    }
    let rawText: string;
    try {
      rawText = await readBoundedText(req, MAX_EXPORT_BODY_BYTES);
    } catch (err) {
      if (err instanceof BodyTooLargeError) {
        return NextResponse.json(
          { kind: 'too_large', maxBytes: MAX_EXPORT_BODY_BYTES },
          { status: 413 },
        );
      }
      return NextResponse.json({ kind: 'bad_request' }, { status: 400 });
    }
    let body: ExportRequest;
    try {
      body = JSON.parse(rawText) as ExportRequest;
    } catch {
      return NextResponse.json({ kind: 'bad_request' }, { status: 400 });
    }

    // C1 — Demo-mode slug allowlist for export
    if (isDemoMode()) {
      if (!body.slug || !DEMO_SLUGS.has(body.slug)) {
        return NextResponse.json({ kind: 'forbidden' }, { status: 403 });
      }
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

    // H2 — Sanitize Content-Disposition filename
    // Run body.slug through validateSlug(); fall back to a sanitized lastName.
    const safeSlug = (() => {
      if (body.slug) {
        try {
          return validateSlug(body.slug);
        } catch {
          // fall through to lastName fallback
        }
      }
      return parsed.data.personal.lastName.toLowerCase().replace(/[^a-z0-9.-]+/g, '-');
    })();
    const rawFilename = `${safeSlug}-${body.templateId}.pdf`.toLowerCase();
    // Strip CR/LF/double-quotes defensively before interpolating into the header
    const filename = rawFilename.replace(/[\r\n"]/g, '');

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
    const { html, css, locale } = await renderCV({
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
      lang: locale,
    });

    // Abort-based timeout: on expiry, signal aborts → generatePDF closes the
    // Puppeteer page → the inner promise rejects synchronously with the
    // timeout, so we cannot return-before-the-render-actually-stops.
    const ac = new AbortController();
    const timeoutId = setTimeout(() => ac.abort(), RENDER_TIMEOUT_MS);
    let pdf: Buffer;
    try {
      pdf = await generatePDF(doc, { signal: ac.signal });
    } catch (err) {
      clearTimeout(timeoutId);
      if (ac.signal.aborted) {
        return NextResponse.json({ kind: 'timeout' }, { status: 504 });
      }
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ kind: 'render_failed', message: msg }, { status: 500 });
    }
    clearTimeout(timeoutId);

    // Spec §11: filename is `${slug}-${templateId}.pdf` when the caller knows
    // the slug. Falling back to lastName keeps the route useful for ad-hoc
    // payloads (e.g. tests) that don't carry a slug.
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${filename}"`,
      },
    });
  } finally {
    activeExports -= 1;
  }
}
