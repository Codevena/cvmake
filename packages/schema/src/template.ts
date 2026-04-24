import type { ReactElement } from 'react';
import { z } from 'zod';
import type { CVData } from './cv.js';
import type { LabelDictionary, Locale } from './locale.js';

const HexColor = z.string().regex(/^#[0-9a-f]{6}$/i);

export const ColorPaletteSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    accent: HexColor,
    background: HexColor,
    surface: HexColor,
    text: HexColor,
    textMuted: HexColor,
    textOnAccent: HexColor,
  })
  .strict();

export type ColorPalette = z.infer<typeof ColorPaletteSchema>;

export const TemplateMetaSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    description: z.string().min(1),
    supportsPhoto: z.boolean(),
    photoFallback: z.enum(['initials', 'placeholder', 'none']),
    supportedLocales: z.array(z.enum(['de', 'en'])).nonempty(),
    defaultSectionOrder: z.array(z.string()).nonempty(),
    supportsPagination: z.boolean(),
  })
  .strict();

export type TemplateMeta = z.infer<typeof TemplateMetaSchema>;

export interface TemplateProps {
  data: CVData;
  palette: ColorPalette;
  locale: Locale;
  labels: LabelDictionary;
}

export interface TemplateDefinition {
  meta: TemplateMeta;
  palettes: ColorPalette[];
  Component: (props: TemplateProps) => ReactElement;
}
