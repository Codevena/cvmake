import { readdir, stat } from 'node:fs/promises';
import { EditorShell } from '@/components/EditorShell';
import { dataDir, resolveCvPath } from '@/lib/data-paths';
import { getPreviewBootstrap } from '@/lib/preview-bootstrap';
import { loadCV } from '@codevena/cvmake-core/loader';
import { bootstrapTemplates } from '@codevena/cvmake-templates';

export const dynamic = 'force-dynamic';

async function listSlugs(): Promise<string[]> {
  try {
    const files = await readdir(dataDir());
    return files
      .filter((f) => f.endsWith('.yaml'))
      .map((f) => f.slice(0, -'.yaml'.length))
      .sort();
  } catch {
    return [];
  }
}

function pickDefault(slugs: string[]): string | null {
  if (slugs.includes('cv.de')) return 'cv.de';
  return slugs[0] ?? null;
}

export default async function Home() {
  bootstrapTemplates();
  const slugs = await listSlugs();
  const slug = pickDefault(slugs);
  if (!slug) {
    return (
      <main className="p-8">
        Keine CVs in <code>data/cvs/</code> gefunden.
      </main>
    );
  }
  const target = resolveCvPath(slug);
  const data = await loadCV(target);
  const mtime = (await stat(target)).mtimeMs;
  const bootstrap = getPreviewBootstrap();
  return (
    <EditorShell
      initialData={data}
      initialMtime={mtime}
      slug={slug}
      allSlugs={slugs}
      bootstrap={bootstrap}
    />
  );
}
