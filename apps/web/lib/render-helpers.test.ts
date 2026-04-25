import type { CVData } from '@codevena/forq-schema';
import { describe, expect, it } from 'vitest';
import { applyHiddenSections } from './render-helpers';

const BASE: CVData = {
  meta: { locale: 'de' },
  personal: { firstName: 'M', lastName: 'W', contacts: {} },
  summary: 'hi',
  experience: [{ title: 'a', company: 'b', startDate: '', bullets: [] }],
  education: [],
  skills: { stack: ['x'] },
  languages: [{ name: 'en', level: 'C2' }],
  rendering: { template: 'classic-serif' },
};

describe('applyHiddenSections', () => {
  it('strippt summary aus dem Output wenn hidden', () => {
    const out = applyHiddenSections({
      ...BASE,
      rendering: { ...BASE.rendering, hiddenSections: ['summary'] },
    });
    expect(out.summary).toBeUndefined();
  });
  it('strippt experience auf [] wenn hidden', () => {
    const out = applyHiddenSections({
      ...BASE,
      rendering: { ...BASE.rendering, hiddenSections: ['experience'] },
    });
    expect(out.experience).toEqual([]);
  });
  it('lässt unbekannte hidden-IDs unbeachtet', () => {
    const out = applyHiddenSections({
      ...BASE,
      rendering: { ...BASE.rendering, hiddenSections: ['nope'] },
    });
    expect(out.experience).toEqual(BASE.experience);
  });
});
