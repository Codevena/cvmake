import type { CVData } from '@codevena/cvmake-schema';
import type { FieldErrors } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { firstTabWithError, tabsWithErrors } from './error-tabs';

const err = (message: string) => ({ type: 'custom', message }) as never;

describe('error-tabs', () => {
  it('maps each section to its tab', () => {
    const errors = { experience: err('bad'), personal: err('bad') } as FieldErrors<CVData>;
    expect(tabsWithErrors(errors).sort()).toEqual(['experience', 'personal']);
  });

  it('reports the first tab in strip order, not in the order react-hook-form lists them', () => {
    // "Go to the error" must land where the user would arrive by hand.
    const errors = { skills: err('bad'), personal: err('bad') } as FieldErrors<CVData>;
    expect(firstTabWithError(errors)).toBe('personal');
  });

  it('ignores errors that no tab can fix', () => {
    // template, palette and section order live in the sidebar; pointing at a
    // tab for them would be a false lead.
    const errors = { rendering: err('bad') } as FieldErrors<CVData>;
    expect(tabsWithErrors(errors)).toEqual([]);
    expect(firstTabWithError(errors)).toBeUndefined();
  });

  it('returns nothing for a valid form', () => {
    expect(firstTabWithError({} as FieldErrors<CVData>)).toBeUndefined();
  });
});
