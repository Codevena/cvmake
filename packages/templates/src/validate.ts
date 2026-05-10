import {
  ColorPaletteSchema,
  type TemplateDefinition,
  TemplateMetaSchema,
} from '@codevena/forq-schema';

export function validateTemplate(def: TemplateDefinition): void {
  TemplateMetaSchema.parse(def.meta);
  if (def.palettes.length === 0) {
    throw new Error(`template ${def.meta.id}: must have at least one palette`);
  }
  const ids = new Set<string>();
  for (const palette of def.palettes) {
    ColorPaletteSchema.parse(palette);
    if (ids.has(palette.id)) {
      throw new Error(`template ${def.meta.id}: duplicate palette id ${palette.id}`);
    }
    ids.add(palette.id);
  }
}
