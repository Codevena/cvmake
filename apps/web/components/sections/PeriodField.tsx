'use client';
import type { CVData } from '@codevena/cvmake-schema';
import { DateRangeInput } from '@codevena/cvmake-ui';
import { useState } from 'react';
import { type FieldPath, useFormContext, useWatch } from 'react-hook-form';

/**
 * Bridges the schema's `{ startDate, endDate? }` to `<DateRangeInput>`'s
 * `{ start, end: string | null }`, where `null` means "current position".
 *
 * The whole reason this is a component rather than two nested `Controller`
 * render props is the one thing it does with `useState`.
 *
 * "Current" is spelled `endDate: undefined` in the document, and `undefined` is
 * the one value react-hook-form cannot report back: both `useController` and
 * `useWatch` treat it as "no value yet" and hand out `_defaultValues` instead.
 * So a single click on Current used to write `undefined` into the form — really
 * removing the end date from the saved CV — and then read the OLD date straight
 * back, leaving the checkbox unchecked and both selects still showing it. The
 * user saw an end date the document no longer had, and nothing said otherwise.
 *
 * Keeping the flag here is what makes the two agree. It is seeded from the
 * loaded document and thereafter owned by the checkbox; a conflict reload
 * remounts this component, because the sections key their rows by the
 * `useFieldArray` id and react-hook-form issues new ids on `reset()`.
 */
export function PeriodField({
  startName,
  endName,
  label,
}: {
  startName: FieldPath<CVData>;
  endName: FieldPath<CVData>;
  label: string;
}) {
  const { control, setValue, getValues } = useFormContext<CVData>();
  const start = useWatch({ control, name: startName }) as string | undefined;
  const watchedEnd = useWatch({ control, name: endName }) as string | undefined;
  const [isCurrent, setIsCurrent] = useState(() => getValues(endName) === undefined);

  // While Current is on the document holds no end date at all, so the watched
  // value is meaningless here — and, being undefined, it is exactly the value
  // that would resolve back to the stale default.
  const end: string | null = isCurrent ? null : (watchedEnd ?? '');

  return (
    <DateRangeInput
      label={label}
      value={{ start: start ?? '', end }}
      onChange={(v) => {
        setIsCurrent(v.end === null);
        setValue(startName, v.start, { shouldDirty: true, shouldValidate: true });
        setValue(endName, v.end === null ? undefined : v.end, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }}
    />
  );
}
