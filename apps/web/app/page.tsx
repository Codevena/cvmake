import { stat } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { EditorShell } from '@/components/EditorShell';
import { dataDir, resolveCvPath } from '@/lib/data-paths';
import { isDemoMode } from '@/lib/demo-mode';
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

  let slug: string;
  let allSlugs: string[];

  if (isDemoMode()) {
    slug = 'example.en';
    allSlugs = ['example.en'];
  } else {
    const slugs = await listSlugs();
    const picked = pickDefault(slugs);
    if (!picked) {
      return (
        <main className="p-8 text-sm">
          No CV files found in <code>data/cvs/</code>.{' '}
          <a
            href="https://github.com/Codevena/cvmake#quickstart"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            See the quickstart guide.
          </a>
        </main>
      );
    }
    slug = picked;
    allSlugs = slugs;
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
      allSlugs={allSlugs}
      bootstrap={bootstrap}
    />
  );
}
