import type { TemplateMeta } from '@cvmake/schema';

export const meta: TemplateMeta = {
  id: 'classic-serif',
  name: 'Classic Serif',
  description:
    'Zweispaltiges Layout mit Serifen-Typografie, rundem Foto und ruhiger grauer Palette. Klassisch, formell, zeitlos.',
  supportsPhoto: true,
  photoFallback: 'initials',
  supportedLocales: ['de', 'en'],
  defaultSectionOrder: ['summary', 'experience', 'education', 'skills', 'languages'],
  supportsPagination: true,
};
