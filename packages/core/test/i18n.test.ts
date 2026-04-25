import { describe, expect, it } from 'vitest';
import { LABEL_KEYS } from '@codevena/forq-schema';
import { getLabels } from '../src/i18n.js';

describe('i18n', () => {
  it('liefert DE-Labels für alle Keys', () => {
    const labels = getLabels('de');
    for (const key of LABEL_KEYS) expect(labels[key]).toBeTruthy();
  });

  it('liefert EN-Labels für alle Keys', () => {
    const labels = getLabels('en');
    for (const key of LABEL_KEYS) expect(labels[key]).toBeTruthy();
  });

  it('DE und EN haben identische Keys', () => {
    const de = Object.keys(getLabels('de')).sort();
    const en = Object.keys(getLabels('en')).sort();
    expect(de).toEqual(en);
  });
});
