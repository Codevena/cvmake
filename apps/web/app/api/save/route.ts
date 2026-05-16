import { stat } from 'node:fs/promises';
import { atomicWriteFile } from '@/lib/atomic-write';
import { resolveCvPath } from '@/lib/data-paths';
import { isDemoMode } from '@/lib/demo-mode';
import { checkOrigin } from '@/lib/request-guards';
import { loadCV } from '@codevena/cvmake-core/loader';
import { CVDataSchema } from '@codevena/cvmake-schema';
import yaml from 'js-yaml';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// (C1 enforcement lives inside POST() — the demo deploy refuses all writes
// regardless of slug. DEMO_SLUGS constants live only on read-side routes.)

// M6 — 512 KB body cap on /api/save (reuses the same bounded-reader pattern
// as /api/export; prevents memory pressure from unbounded req.json() calls).
const MAX_SAVE_BODY_BYTES = 512 * 1024;

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

interface SaveRequest {
  slug: string;
  data: unknown;
  expectedMtime: number;
}

export async function POST(req: Request): Promise<NextResponse> {
  // H3 — Origin check (CSRF protection)
  const originErr = checkOrigin(req);
  if (originErr) return originErr;

  // M6 — Bounded body read (512 KB)
  const declaredLength = req.headers.get('content-length');
  if (declaredLength !== null && Number(declaredLength) > MAX_SAVE_BODY_BYTES) {
    return NextResponse.json({ kind: 'too_large', maxBytes: MAX_SAVE_BODY_BYTES }, { status: 413 });
  }
  let rawText: string;
  try {
    rawText = await readBoundedText(req, MAX_SAVE_BODY_BYTES);
  } catch (err) {
    if (err instanceof BodyTooLargeError) {
      return NextResponse.json(
        { kind: 'too_large', maxBytes: MAX_SAVE_BODY_BYTES },
        { status: 413 },
      );
    }
    return NextResponse.json({ kind: 'bad_request' }, { status: 400 });
  }

  // C1 — defense-in-depth: the demo deploy must NEVER write to disk, for any
  // slug. The middleware enforces this; this handler-level check mirrors the
  // invariant so a middleware misconfig / bypassed-matcher test cannot leak
  // a write through, even into the example.* fixtures.
  if (isDemoMode()) {
    return NextResponse.json({ kind: 'forbidden' }, { status: 403 });
  }
  let body: SaveRequest;
  try {
    body = JSON.parse(rawText) as SaveRequest;
  } catch {
    return NextResponse.json({ kind: 'bad_request' }, { status: 400 });
  }
  let target: string;
  try {
    target = resolveCvPath(body.slug);
  } catch {
    return NextResponse.json({ kind: 'invalid_slug' }, { status: 400 });
  }
  // mtime guard.
  //
  // Per spec §10.2 we treat an externally-deleted file as a conflict — the
  // user opened the editor on a known mtime (>0) but the file is now gone,
  // which is exactly the kind of out-of-band change the conflict modal is
  // designed to handle. Only when the client signals "create new" by sending
  // expectedMtime === 0 do we accept a missing file and let it be created.
  const stExists = await stat(target).catch(() => null);
  if (!stExists) {
    if (body.expectedMtime > 0) {
      return NextResponse.json(
        { kind: 'conflict', currentData: null, currentMtime: 0 },
        { status: 409 },
      );
    }
    // expectedMtime === 0 → first save of a new file; fall through.
  } else if (stExists.mtimeMs !== body.expectedMtime) {
    let currentData: unknown = null;
    try {
      currentData = await loadCV(target);
    } catch {
      currentData = null;
    }
    return NextResponse.json(
      { kind: 'conflict', currentData, currentMtime: stExists.mtimeMs },
      { status: 409 },
    );
  }
  // validation
  const parsed = CVDataSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json({ kind: 'validation', issues: parsed.error.issues }, { status: 422 });
  }
  const stamped = {
    ...parsed.data,
    meta: { ...parsed.data.meta, updatedAt: new Date().toISOString().slice(0, 10) },
  };
  const dump = yaml.dump(stamped, { lineWidth: 100, noRefs: true });
  await atomicWriteFile(target, dump);
  const newMtime = (await stat(target)).mtimeMs;
  return NextResponse.json({ ok: true, mtime: newMtime });
}
