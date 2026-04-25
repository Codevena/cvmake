import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { ZodIssue } from 'zod';

export function applyZodIssues<T extends FieldValues>(
  issues: ZodIssue[],
  setError: UseFormSetError<T>,
): void {
  for (const iss of issues) {
    const dotPath = iss.path.join('.');
    if (!dotPath) continue; // root-level issues have no RHF field; hoist via setError('root', ...) if needed
    setError(dotPath as Path<T>, { type: 'server', message: iss.message });
  }
}
