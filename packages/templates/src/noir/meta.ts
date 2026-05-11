import type { TemplateMeta } from '@codevena/cvmake-schema';

export const meta: TemplateMeta = {
  id: 'noir',
  name: 'Noir',
  description:
    'Schwarze Bühne, Cream-Serif (Cormorant), Gold-Akzent, sepia-getöntes Foto. Cinematic high-contrast — Einträge lesen sich wie Absätze, nicht wie Bullet-Listen.',
  supportsPhoto: true,
  photoFallback: 'initials',
  supportedLocales: ['de', 'en'],
  defaultSectionOrder: ['summary', 'experience', 'education', 'skills', 'languages'],
  supportsPagination: true,
};
