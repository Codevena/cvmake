import { stat } from 'node:fs/promises';
import { loadCV } from '@codevena/forq-core';
import { CVDataSchema } from '@codevena/forq-schema';
import yaml from 'js-yaml';
import { NextResponse } from 'next/server';
import { atomicWriteFile } from '@/lib/atomic-write';
import { resolveCvPath } from '@/lib/data-paths';

export const dynamic = 'force-dynamic';

interface SaveRequest {
  slug: string;
  data: unknown;
  expectedMtime: number;
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: SaveRequest;
  try {
    body = (await req.json()) as SaveRequest;
  } catch {
    return NextResponse.json({ kind: 'bad_request' }, { status: 400 });
  }
  let target: string;
  try {
    target = resolveCvPath(body.slug);
  } catch {
    return NextResponse.json({ kind: 'invalid_slug' }, { status: 400 });
  }
  // mtime guard
  let currentMtime = 0;
  try {
    currentMtime = (await stat(target)).mtimeMs;
  } catch {
    // file doesn't exist yet — accept and create
  }
  if (currentMtime !== 0 && currentMtime !== body.expectedMtime) {
    let currentData: unknown = null;
    try {
      currentData = await loadCV(target);
    } catch {
      currentData = null;
    }
    return NextResponse.json(
      { kind: 'conflict', currentData, currentMtime },
      { status: 409 },
    );
  }
  // validation
  const parsed = CVDataSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { kind: 'validation', issues: parsed.error.issues },
      { status: 422 },
    );
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
