import type { TabId } from '@/components/TabNav';
import type { CVData } from '@codevena/cvmake-schema';
import type { FieldErrors } from 'react-hook-form';

/**
 * Maps a validation error back to the tab that can fix it.
 *
 * Without this the editor can reach a state it cannot explain: the save
 * indicator says "fix errors to save" and names no place, the tabs look
 * identical whether or not they contain the problem, and a form can be invalid
 * without the user having touched a single field. Telling someone their work
 * cannot be saved while showing them no way to the cause is worse than not
 * telling them at all.
 *
 * `rendering` deliberately maps to nothing: template, palette and section order
 * live in the sidebar, not in a tab, and pointing at a tab that cannot fix the
 * error would be a false lead.
 */
const FIELD_TO_TAB: Partial<Record<keyof CVData, TabId>> = {
  personal: 'personal',
  experience: 'experience',
  education: 'education',
  skills: 'skills',
  languages: 'languages',
  customSections: 'custom',
  summary: 'summary',
};

export function tabsWithErrors(errors: FieldErrors<CVData>): TabId[] {
  const tabs: TabId[] = [];
  for (const key of Object.keys(errors) as (keyof CVData)[]) {
    const tab = FIELD_TO_TAB[key];
    if (tab && !tabs.includes(tab)) tabs.push(tab);
  }
  return tabs;
}

/**
 * The tab to send the user to. Order follows the tab strip rather than the
 * order react-hook-form happens to report, so "go to the error" lands on the
 * first one they would reach by hand.
 */
const TAB_ORDER: TabId[] = [
  'personal',
  'experience',
  'education',
  'skills',
  'languages',
  'custom',
  'summary',
];

export function firstTabWithError(errors: FieldErrors<CVData>): TabId | undefined {
  const withErrors = tabsWithErrors(errors);
  return TAB_ORDER.find((t) => withErrors.includes(t));
}
