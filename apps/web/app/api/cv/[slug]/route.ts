import { stat } from 'node:fs/promises';
import { resolveCvPath } from '@/lib/data-paths';
import { isDemoMode } from '@/lib/demo-mode';
import { ValidationError, YAMLParseError } from '@codevena/cvmake-core/errors';
import { loadCV } from '@codevena/cvmake-core/loader';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// C1 — defense-in-depth: middleware also enforces this, but we re-check at the
// handler so a future middleware misconfig (or a direct test that bypasses the
// matcher) cannot leak the maintainer's private CV slugs from the demo image.
const DEMO_SLUGS = new Set(['example.en', 'example.de']);

interface Ctx {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: Request, ctx: Ctx): Promise<NextResponse> {
  const { slug } = await ctx.params;
  if (isDemoMode() && !DEMO_SLUGS.has(slug)) {
    return NextResponse.json({ kind: 'not_found' }, { status: 404 });
  }
  let target: string;
  try {
    target = resolveCvPath(slug);
  } catch {
    return NextResponse.json({ kind: 'invalid_slug' }, { status: 400 });
  }
  let mtime: number;
  try {
    const st = await stat(target);
    mtime = st.mtimeMs;
  } catch {
    return NextResponse.json({ kind: 'not_found' }, { status: 404 });
  }
  try {
    const data = await loadCV(target);
    return NextResponse.json({ data, mtime, slug });
  } catch (err) {
    if (err instanceof YAMLParseError) {
      return NextResponse.json(
        { kind: 'yaml', message: err.message, line: err.line, column: err.column },
        { status: 422 },
      );
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ kind: 'validation', issues: err.issues }, { status: 422 });
    }
    // Log details server-side; return a generic message so raw error strings
    // (which can include absolute filesystem paths) don't leak to the client.
    console.error(`[cv/${slug}] load failed:`, err);
    return NextResponse.json({ kind: 'unknown' }, { status: 500 });
  }
}
