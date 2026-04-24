import type { CVData } from '../src/cv.js';

export const minimalFixture: CVData = {
  meta: { locale: 'de' },
  personal: {
    firstName: 'Markus',
    lastName: 'Wiesecke',
    contacts: {},
  },
  experience: [],
  education: [],
  rendering: { template: 'classic-serif' },
};

export const fullFixture: CVData = {
  meta: { locale: 'de', updatedAt: '2026-04-24' },
  personal: {
    firstName: 'Markus',
    lastName: 'Wiesecke',
    title: 'Fullstack Developer',
    photo: 'photos/markus.jpg',
    birthDate: '1987-01-13',
    contacts: {
      email: 'hello@codevena.dev',
      phone: '+49 175 9025586',
      website: 'https://codevena.dev',
      github: 'codevena',
      linkedin: 'markus-wiesecke',
      location: 'Wuppertal, DE',
    },
  },
  summary: 'Fullstack Developer mit Fokus auf Next.js und TypeScript.',
  experience: [
    {
      title: 'Fullstack Developer',
      company: 'Codevena',
      location: 'Wuppertal',
      startDate: '2020-01',
      bullets: ['Next.js 16 SaaS entwickelt', 'Hetzner + Coolify Deployment'],
      tags: ['Next.js', 'TypeScript', 'PostgreSQL'],
    },
  ],
  education: [
    {
      degree: 'Fachinformatiker Anwendungsentwicklung',
      institution: 'BBQ Düsseldorf',
      startDate: '2024-08',
      endDate: '2026-07',
    },
  ],
  skills: {
    stack: ['Next.js', 'TypeScript', 'PostgreSQL'],
    categorized: { Backend: ['Node.js', 'Prisma'], Frontend: ['React', 'Tailwind'] },
  },
  languages: [
    { name: 'Deutsch', level: 'native' },
    { name: 'Englisch', level: 'B2' },
  ],
  customSections: [
    {
      id: 'projects',
      title: 'Projekte',
      items: [{ title: 'FlashBuddy', subtitle: 'SaaS', description: 'Lern-Karten App.' }],
    },
  ],
  rendering: {
    template: 'classic-serif',
    palette: 'classic-grey',
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'languages'],
  },
};
