import type { TemplateMeta } from '@codevena/cvmake-schema';

export const meta: TemplateMeta = {
  id: 'swiss',
  name: 'Swiss / International',
  description:
    'Striktes Zweispalten-Layout mit Helvetica, rotem Akzent und entsättigtem Foto. Pure information design — keine Verspieltheit.',
  supportsPhoto: true,
  photoFallback: 'initials',
  supportedLocales: ['de', 'en'],
  defaultSectionOrder: ['summary', 'experience', 'education', 'skills', 'languages'],
  supportsPagination: true,
};
