import type { ChangeEvent } from 'react';

export interface InputProps {
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
  type?: 'text' | 'email' | 'tel' | 'url';
  placeholder?: string;
  autoComplete?: string;
}

function deriveId(props: Pick<InputProps, 'id' | 'name' | 'label'>): string {
  if (props.id) return props.id;
  if (props.name) return props.name;
  if (props.label) return `input-${props.label.replace(/\s+/g, '-').toLowerCase()}`;
  return 'input-field';
}

export function Input(props: InputProps): JSX.Element {
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
    type = 'text',
    placeholder,
    autoComplete,
  } = props;
  const inputId = deriveId(props);
  const wrapperClass = ['flex flex-col gap-1', className].filter(Boolean).join(' ');
  const inputClass = [
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
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={inputClass}
      />
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
