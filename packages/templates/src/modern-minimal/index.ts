import type { TemplateDefinition } from '@codevena/forq-schema';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';
import { ModernMinimalTemplate } from './Template.js';

export const modernMinimal: TemplateDefinition = {
  meta: templateMeta,
  palettes,
  Component: ModernMinimalTemplate,
};
