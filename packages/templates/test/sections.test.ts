import { describe, expect, it } from 'vitest';
import { resolveSectionOrder } from '../src/utils/sections.js';

// The ordering, appending and hiding behaviour is already covered in
// utils.test.ts; this file only carries the deduplication guard so the two do
// not drift apart with three copies of the same setup.
describe('resolveSectionOrder deduplication', () => {
  it('renders a repeated override section once', () => {
    // The schema rejects a duplicate before it can be stored; this is the
    // second layer, for any caller that skips validation. Without it the
    // section renders twice. React does warn — the templates key sections by
    // fixed strings, which is exactly the case it complains about — but the
    // warning goes to a server console during a PDF render, and the PDF still
    // comes out with the section duplicated and exit 0.
    const out = resolveSectionOrder({
      override: ['experience', 'experience', 'education'],
      defaults: ['experience', 'education', 'skills'],
      hidden: [],
    });
    expect(out.filter((s) => s === 'experience')).toHaveLength(1);
    expect(out).toEqual(['experience', 'education', 'skills']);
  });

  it('leaves a duplicate-free override untouched', () => {
    expect(
      resolveSectionOrder({
        override: ['education', 'experience'],
        defaults: ['experience', 'education'],
        hidden: [],
      }),
    ).toEqual(['education', 'experience']);
  });
});
