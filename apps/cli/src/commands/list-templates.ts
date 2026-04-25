import pc from 'picocolors';
import { bootstrapTemplates, listTemplates } from '@codevena/forq-templates';

export function runListTemplates(): number {
  bootstrapTemplates();
  const templates = listTemplates();
  for (const t of templates) {
    console.warn(pc.bold(`${t.meta.id}`), pc.gray(`(${t.meta.name})`));
    console.warn(`  ${t.meta.description}`);
    console.warn(
      `  palettes: ${t.palettes.map((p) => p.id).join(', ')}`,
    );
    console.warn(`  photo: ${t.meta.supportsPhoto ? 'yes' : 'no'} (fallback: ${t.meta.photoFallback})`);
  }
  return 0;
}
