import type { TemplateDefinition } from '@codevena/forq-schema';
import { ModernMinimalTemplate } from './Template.js';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';

export const modernMinimal: TemplateDefinition = {
  meta: templateMeta,
  palettes,
  Component: ModernMinimalTemplate,
};
