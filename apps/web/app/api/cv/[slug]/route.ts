import { stat } from 'node:fs/promises';
import { resolveCvPath } from '@/lib/data-paths';
import { ValidationError, YAMLParseError, loadCV } from '@codevena/forq-core';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: Request, ctx: Ctx): Promise<NextResponse> {
  const { slug } = await ctx.params;
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
    return NextResponse.json({ kind: 'unknown', message: String(err) }, { status: 500 });
  }
}
