import type { ChangeEvent } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  id?: string;
  name?: string;
  label?: string;
  value: string;
  onChange: (next: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  options: SelectOption[];
  placeholder?: string;
}

function deriveId(props: Pick<SelectProps, 'id' | 'name' | 'label'>): string {
  if (props.id) return props.id;
  if (props.name) return props.name;
  if (props.label) return `select-${props.label.replace(/\s+/g, '-').toLowerCase()}`;
  return 'select-field';
}

export function Select(props: SelectProps): JSX.Element {
  const {
    name,
    label,
    value,
    onChange,
    onBlur,
    error,
    disabled,
    required,
    className,
    options,
    placeholder,
  } = props;
  const inputId = deriveId(props);
  const wrapperClass = ['flex flex-col gap-1', className].filter(Boolean).join(' ');
  const fieldClass = [
    'rounded-md border bg-elevated px-3 py-2 text-text',
    'focus:outline-none focus:ring-2 focus:ring-accent',
    'disabled:cursor-not-allowed disabled:opacity-60',
    error ? 'border-error' : 'border-border',
  ].join(' ');
  return (
    <div className={wrapperClass}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-muted">
          {label}
          {required && <span className="text-error"> *</span>}
        </label>
      )}
      <select
        id={inputId}
        name={name}
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        className={fieldClass}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
