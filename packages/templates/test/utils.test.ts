import { describe, expect, it } from 'vitest';
import { formatDateRange, formatMonthYear } from '../src/utils/dates.js';
import { initials } from '../src/utils/initials.js';
import { resolveSectionOrder } from '../src/utils/sections.js';

describe('dates', () => {
  it('formatiert YYYY-MM auf DE', () => {
    expect(formatMonthYear('2024-08', 'de')).toBe('Aug. 2024');
  });
  it('formatiert YYYY-MM auf EN', () => {
    expect(formatMonthYear('2024-08', 'en')).toBe('Aug 2024');
  });
  it('range mit offenem Ende nutzt Label', () => {
    expect(formatDateRange('2020-01', undefined, 'de', 'heute')).toBe('Jan. 2020 – heute');
  });
  it('fällt bei out-of-range Monat auf das Jahr zurück statt "undefined"', () => {
    expect(formatMonthYear('2020-13', 'de')).toBe('2020');
    expect(formatMonthYear('2020-99', 'en')).toBe('2020');
    expect(formatMonthYear('2020-00', 'de')).toBe('2020');
  });
});

describe('initials', () => {
  it('liefert zwei Buchstaben', () => {
    expect(initials('Lena', 'Bauer')).toBe('LB');
  });
});

describe('sections', () => {
  it('respektiert override vor default', () => {
    const o = resolveSectionOrder({
      override: ['experience', 'summary'],
      defaults: ['summary', 'experience', 'education'],
      hidden: [],
    });
    expect(o).toEqual(['experience', 'summary', 'education']);
  });
  it('fügt fehlende Sections aus defaults an', () => {
    const o = resolveSectionOrder({
      override: ['experience'],
      defaults: ['summary', 'experience', 'education'],
      hidden: [],
    });
    expect(o).toEqual(['experience', 'summary', 'education']);
  });
  it('entfernt versteckte Sections', () => {
    const o = resolveSectionOrder({
      override: undefined,
      defaults: ['summary', 'experience'],
      hidden: ['summary'],
    });
    expect(o).toEqual(['experience']);
  });
});
