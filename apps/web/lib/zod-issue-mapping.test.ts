import type { UseFormSetError } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import type { ZodIssue } from 'zod';
import { applyZodIssues } from './zod-issue-mapping';

type TestForm = {
  personal: { contacts: { email: string } };
  experience: { title: string }[];
};

describe('applyZodIssues', () => {
  it('mappt issues auf RHF setError mit dot-path', () => {
    const setError: UseFormSetError<TestForm> = vi.fn();
    const issues: ZodIssue[] = [
      {
        path: ['personal', 'contacts', 'email'],
        message: 'Invalid email',
        code: 'invalid_string',
        validation: 'email',
      } as ZodIssue,
      {
        path: ['experience', 0, 'title'],
        message: 'Required',
        code: 'too_small',
        minimum: 1,
        type: 'string',
        inclusive: true,
      } as ZodIssue,
    ];
    applyZodIssues<TestForm>(issues, setError);
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
