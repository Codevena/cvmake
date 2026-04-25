import { readdir, stat } from 'node:fs/promises';
import { EditorShell } from '@/components/EditorShell';
import { dataDir, resolveCvPath } from '@/lib/data-paths';
import { getPreviewBootstrap } from '@/lib/preview-bootstrap';
import { loadCV } from '@codevena/forq-core/loader';
import { bootstrapTemplates } from '@codevena/forq-templates';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ slug: string }>;
}

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

export default async function CvPage({ params }: Ctx) {
  bootstrapTemplates();
  const { slug } = await params;

  let target: string;
  try {
    target = resolveCvPath(slug);
  } catch {
    notFound();
  }

  let mtime: number;
  try {
    mtime = (await stat(target)).mtimeMs;
  } catch {
    notFound();
  }

  const data = await loadCV(target);
  const slugs = await listSlugs();
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
