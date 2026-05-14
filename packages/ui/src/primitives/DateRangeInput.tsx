import type { ChangeEvent } from 'react';

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

function joinYM(year: string, month: string): string {
  if (!year || !month) return '';
  return `${year}-${month}`;
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

  const years: number[] = [];
  for (let y = endYear; y >= startYear; y--) years.push(y);

  const start = parseYM(value.start);
  const isCurrent = value.end === null;
  const end = isCurrent ? { year: '', month: '' } : parseYM(value.end ?? '');

  const setStart = (year: string, month: string): void => {
    onChange({ start: joinYM(year, month), end: value.end });
  };
  const setEnd = (year: string, month: string): void => {
    onChange({ start: value.start, end: joinYM(year, month) });
  };
  const toggleCurrent = (e: ChangeEvent<HTMLInputElement>): void => {
    onChange({ start: value.start, end: e.target.checked ? null : '' });
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
    <fieldset className={wrapperClass}>
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
      {errorText && <p className="text-sm text-error">{errorText}</p>}
    </fieldset>
  );
}
