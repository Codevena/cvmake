'use client';
import type { CVData } from '@codevena/cvmake-schema';
import yaml from 'js-yaml';

interface Props {
  getData: () => CVData;
  slug: string;
}

export function DownloadYamlButton({ getData, slug }: Props) {
  function download() {
    const text = yaml.dump(getData(), { lineWidth: 100, noRefs: true });
    const blob = new Blob([text], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
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
