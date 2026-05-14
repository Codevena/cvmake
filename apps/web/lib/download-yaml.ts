import type { CVData } from '@codevena/cvmake-schema';
import yaml from 'js-yaml';

// Serialize CV data to YAML and trigger a browser download. Used by the
// demo-mode "Download YAML" button and the ⌘K palette's downloadYaml command.
export function downloadYaml(args: { data: CVData; slug: string }): void {
  const text = yaml.dump(args.data, { lineWidth: 100, noRefs: true });
  const blob = new Blob([text], { type: 'text/yaml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${args.slug}.yaml`;
  a.click();
  URL.revokeObjectURL(url);
}
