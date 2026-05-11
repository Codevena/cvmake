import type { TemplateMeta } from '@codevena/cvmake-schema';

export const meta: TemplateMeta = {
  id: 'magazine',
  name: 'Editorial Magazine',
  description:
    'Cream-Canvas, große kursive Display-Serif (Playfair Display), Sand-Akzent, großes Hochformat-Foto. Vogue-Style-Profil mit Zwei-Spalten-Body-Grid.',
  supportsPhoto: true,
  photoFallback: 'initials',
  supportedLocales: ['de', 'en'],
  defaultSectionOrder: ['summary', 'experience', 'education', 'skills', 'languages'],
  supportsPagination: true,
};
