import type { TemplateMeta } from '@codevena/cvmake-schema';

export const meta: TemplateMeta = {
  id: 'academic',
  name: 'Academic',
  description:
    'Einspaltiges Layout mit Serifen-Typografie, Datumspalte links und klassischer Gliederung. Für Universität, Forschung, Stipendium und formelle Bewerbungen.',
  supportsPhoto: false,
  photoFallback: 'none',
  supportedLocales: ['de', 'en'],
  defaultSectionOrder: ['summary', 'experience', 'education', 'skills', 'languages'],
  supportsPagination: true,
};
