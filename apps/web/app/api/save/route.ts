import { stat } from 'node:fs/promises';
import { atomicWriteFile } from '@/lib/atomic-write';
import { resolveCvPath } from '@/lib/data-paths';
import { loadCV } from '@codevena/cvmake-core/loader';
import { CVDataSchema } from '@codevena/cvmake-schema';
import yaml from 'js-yaml';
import { NextResponse } from 'next/server';

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
