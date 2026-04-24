import type { CVData, TemplateDefinition } from '@cvmake/schema';

export interface RenderInput {
  data: CVData;
  template: TemplateDefinition;
  paletteId?: string;
}

export interface RenderOutput {
  html: string;
  css: string;
  locale: 'de' | 'en';
}
