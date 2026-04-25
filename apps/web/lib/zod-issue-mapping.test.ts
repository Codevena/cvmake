import { describe, expect, it, vi } from 'vitest';
import { applyZodIssues } from './zod-issue-mapping';

describe('applyZodIssues', () => {
  it('mappt issues auf RHF setError mit dot-path', () => {
    const setError = vi.fn();
    applyZodIssues(
      [
        {
          path: ['personal', 'contacts', 'email'],
          message: 'Invalid email',
          code: 'invalid_string',
        },
        { path: ['experience', 0, 'title'], message: 'Required', code: 'too_small' },
        // biome-ignore lint/suspicious/noExplicitAny: test fixture uses non-enum codes
      ] as any,
      // biome-ignore lint/suspicious/noExplicitAny: setError is a vi.fn mock
      setError as any,
    );
    expect(setError).toHaveBeenCalledWith('personal.contacts.email', {
      type: 'server',
      message: 'Invalid email',
    });
    expect(setError).toHaveBeenCalledWith('experience.0.title', {
      type: 'server',
      message: 'Required',
    });
  });
});
