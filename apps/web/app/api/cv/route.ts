import { readdir } from 'node:fs/promises';
import { dataDir, resolveCvPath } from '@/lib/data-paths';
import { loadCV } from '@codevena/forq-core/loader';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  let entries: string[] = [];
  try {
    entries = await readdir(dataDir());
  } catch {
    return NextResponse.json({ items: [] });
  }
  const slugs = entries.filter((f) => f.endsWith('.yaml')).map((f) => f.slice(0, -'.yaml'.length));
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
