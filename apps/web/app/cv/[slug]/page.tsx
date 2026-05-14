import { readdir, stat } from 'node:fs/promises';
import { EditorShell } from '@/components/EditorShell';
import { dataDir, resolveCvPath } from '@/lib/data-paths';
import { isDemoMode } from '@/lib/demo-mode';
import { getPreviewBootstrap } from '@/lib/preview-bootstrap';
import { loadCV } from '@codevena/cvmake-core/loader';
import { bootstrapTemplates } from '@codevena/cvmake-templates';
import { notFound, redirect } from 'next/navigation';

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
  const { slug } = await params;
  // In demo mode the editor lives at `/`; bounce `/cv/<slug>` there,
  // preserving the slug so a deep-linked demo CV still loads (page.tsx
  // validates it against the allowed demo slugs).
  if (isDemoMode()) redirect(`/?slug=${encodeURIComponent(slug)}`);
  bootstrapTemplates();

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
    // key={slug} keeps EditorShell's react-hook-form in sync with the CV
    // (consistent with the demo route at /, where switching is a query param).
    <EditorShell
      key={slug}
      initialData={data}
      initialMtime={mtime}
      slug={slug}
      allSlugs={slugs}
      bootstrap={bootstrap}
    />
  );
}
