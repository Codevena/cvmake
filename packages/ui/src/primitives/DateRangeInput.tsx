import { type ChangeEvent, useId, useRef, useState } from 'react';

export interface DateRangeValue {
  start: string;
  end: string | null;
}

export interface DateRangeInputProps {
  label?: string;
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  startYear?: number;
  endYear?: number;
  currentLabel?: string;
}

const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

function parseYM(ym: string): { year: string; month: string } {
  const [year = '', month = ''] = ym.split('-');
  return { year, month };
}

/**
 * A bare year is a valid CV date (`CvDateSchema` accepts `YYYY`), so a year
 * alone is emitted rather than discarded. A month without a year is not a date
 * and stays empty — the display keeps it, see the partial state below.
 */
function joinYM(year: string, month: string): string {
  if (!year) return '';
  return month ? `${year}-${month}` : year;
}

const FIELD_BASE =
  'rounded-md border bg-elevated px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60';

export function DateRangeInput(props: DateRangeInputProps): JSX.Element {
  const currentYear = new Date().getFullYear();
  const {
    label,
    value,
    onChange,
    error,
    disabled,
    required,
    className,
    startYear = currentYear - 50,
    endYear = currentYear + 1,
    currentLabel = 'Current',
  } = props;
  // useId() provides a stable unique base ID for the error paragraph.
  const uid = useId();
  const errorId = `${uid}-err`;

  const years: number[] = [];
  for (let y = endYear; y >= startYear; y--) years.push(y);

  // The selects show LOCAL state, not state derived from `value`.
  //
  // Without this, a half-made selection cannot exist: picking a month on an
  // empty date produced `joinYM('', '03') === ''`, the parent stored '', and
  // the select re-derived itself back to empty — the choice vanished as it was
  // made, so a new entry could never be given a start date at all.
  //
  // The local state follows `value` again whenever the parent sends something
  // OTHER than what was last emitted. The case it cannot see — the parent
  // echoing back exactly what was emitted — is handled outside the component:
  // the sections render each entry under `key={f.id}` from useFieldArray, and
  // react-hook-form issues new ids on `reset()`, so a conflict reload remounts
  // and the local state goes with it. Do not switch those keys to an index.
  const isCurrent = value.end === null;
  const lastEmitted = useRef<{ start: string; end: string | null }>(value);
  const [partial, setPartial] = useState(() => ({
    start: parseYM(value.start),
    end: parseYM(value.end ?? ''),
  }));

  if (value.start !== lastEmitted.current.start || value.end !== lastEmitted.current.end) {
    lastEmitted.current = value;
    setPartial({ start: parseYM(value.start), end: parseYM(value.end ?? '') });
  }

  const start = partial.start;
  const end = isCurrent ? { year: '', month: '' } : partial.end;

  const emit = (next: DateRangeValue): void => {
    lastEmitted.current = next;
    onChange(next);
  };
  const setStart = (year: string, month: string): void => {
    setPartial((p) => ({ ...p, start: { year, month } }));
    emit({ start: joinYM(year, month), end: value.end });
  };
  const setEnd = (year: string, month: string): void => {
    setPartial((p) => ({ ...p, end: { year, month } }));
    emit({ start: value.start, end: joinYM(year, month) });
  };
  const toggleCurrent = (e: ChangeEvent<HTMLInputElement>): void => {
    // Unchecking emits `end: ''`, so the local state has to be cleared with it.
    // Leaving it alone left the two selects showing the previous end date while
    // the document held none — and the resync above cannot repair that, because
    // `emit` updates `lastEmitted` before the parent re-renders.
    if (!e.target.checked) setPartial((p) => ({ ...p, end: { year: '', month: '' } }));
    emit({ start: value.start, end: e.target.checked ? null : '' });
  };

  const internalError =
    !isCurrent &&
    value.start !== '' &&
    typeof value.end === 'string' &&
    value.end !== '' &&
    value.end < value.start
      ? 'End must be after start'
      : undefined;
  const errorText = error ?? internalError;

  const wrapperClass = ['flex flex-col gap-1', className].filter(Boolean).join(' ');
  const fieldClass = `${FIELD_BASE} ${errorText ? 'border-error' : 'border-border'}`;

  return (
    <fieldset
      className={wrapperClass}
      // aria-describedby on <fieldset> IS valid (announces the error <p> along
      // with the legend), but aria-invalid does NOT apply to grouping
      // elements per WAI-ARIA — it's only meaningful on form controls. Each
      // child <select> gets aria-invalid below.
      aria-describedby={errorText ? errorId : undefined}
    >
      {label && (
        <legend className="text-sm font-medium text-text-muted mb-1">
          {label}
          {required && <span className="text-error"> *</span>}
        </legend>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Start month"
          value={start.month}
          onChange={(e) => setStart(start.year, e.target.value)}
          disabled={disabled}
          aria-invalid={errorText ? 'true' : undefined}
          className={fieldClass}
        >
          <option value="">MM</option>
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          aria-label="Start year"
          value={start.year}
          onChange={(e) => setStart(e.target.value, start.month)}
          disabled={disabled}
          aria-invalid={errorText ? 'true' : undefined}
          className={fieldClass}
        >
          <option value="">YYYY</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>

        <span className="text-text-muted">–</span>

        <select
          aria-label="End month"
          value={end.month}
          onChange={(e) => setEnd(end.year, e.target.value)}
          disabled={disabled || isCurrent}
          aria-invalid={errorText ? 'true' : undefined}
          className={fieldClass}
        >
          <option value="">MM</option>
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          aria-label="End year"
          value={end.year}
          onChange={(e) => setEnd(e.target.value, end.month)}
          disabled={disabled || isCurrent}
          aria-invalid={errorText ? 'true' : undefined}
          className={fieldClass}
        >
          <option value="">YYYY</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>

        <label className="ml-2 inline-flex items-center gap-1 text-sm text-text-muted">
          <input type="checkbox" checked={isCurrent} onChange={toggleCurrent} disabled={disabled} />
          {currentLabel}
        </label>
      </div>
      {errorText && (
        <p id={errorId} role="alert" className="text-sm text-error">
          {errorText}
        </p>
      )}
    </fieldset>
  );
}
