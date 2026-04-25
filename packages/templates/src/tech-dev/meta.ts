import type { TemplateMeta } from '@codevena/forq-schema';

export const meta: TemplateMeta = {
  id: 'tech-dev',
  name: 'Tech Dev',
  description:
    'Zweispaltiges Layout mit Terminal-Header und Monospace-Sidebar. Für Senior Developer, Staff Engineer und SaaS-Builder.',
  supportsPhoto: true,
  photoFallback: 'initials',
  supportedLocales: ['de', 'en'],
  defaultSectionOrder: ['summary', 'experience', 'education', 'skills', 'languages'],
  supportsPagination: true,
};
