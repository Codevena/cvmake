'use client';
import { track } from '@/lib/analytics';
import { downloadYaml } from '@/lib/download-yaml';
import type { CVData } from '@codevena/cvmake-schema';

interface Props {
  getData: () => CVData;
  slug: string;
}

export function DownloadYamlButton({ getData, slug }: Props) {
  function download() {
    track('editor.download_yaml', { slug });
    downloadYaml({ data: getData(), slug });
  }

  return (
    <button
      type="button"
      onClick={download}
      className="rounded-md border border-border bg-elevated px-3 py-1.5 text-sm text-text transition hover:border-accent/40 hover:text-accent"
    >
      Download YAML
    </button>
  );
}
