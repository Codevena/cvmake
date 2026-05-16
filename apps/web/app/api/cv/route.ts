import { readdir } from 'node:fs/promises';
import { dataDir, resolveCvPath } from '@/lib/data-paths';
import { isDemoMode } from '@/lib/demo-mode';
import { loadCV } from '@codevena/cvmake-core/loader';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEMO_SLUGS = ['example.en', 'example.de'];

export async function GET(): Promise<NextResponse> {
  let entries: string[] = [];
  try {
    entries = await readdir(dataDir());
  } catch {
    return NextResponse.json({ items: [] });
  }
  let slugs = entries.filter((f) => f.endsWith('.yaml')).map((f) => f.slice(0, -'.yaml'.length));

  // C1 defence-in-depth: even if middleware is bypassed, only expose demo slugs
  // in demo mode so private CVs can never be listed by API clients.
  if (isDemoMode()) {
    slugs = slugs.filter((s) => DEMO_SLUGS.includes(s));
  }
  const items = await Promise.all(
    slugs.map(async (slug) => {
      try {
        const cv = await loadCV(resolveCvPath(slug));
        return {
          slug,
          locale: cv.meta.locale,
          displayName: `${cv.personal.firstName} ${cv.personal.lastName} (${cv.meta.locale})`,
        };
      } catch {
        return { slug, locale: 'de' as const, displayName: slug };
      }
    }),
  );
  return NextResponse.json({ items });
}
