import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { ZodIssue } from 'zod';

export function applyZodIssues<T extends FieldValues>(
  issues: ZodIssue[],
  setError: UseFormSetError<T>,
): void {
  for (const iss of issues) {
    const dotPath = iss.path.join('.');
    if (!dotPath) continue;
    setError(dotPath as Path<T>, { type: 'server', message: iss.message });
  }
}
