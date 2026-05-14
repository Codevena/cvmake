import type { ChangeEvent } from 'react';

export interface TextareaProps {
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
  placeholder?: string;
  rows?: number;
}

function deriveId(props: Pick<TextareaProps, 'id' | 'name' | 'label'>): string {
  if (props.id) return props.id;
  if (props.name) return props.name;
  if (props.label) return `textarea-${props.label.replace(/\s+/g, '-').toLowerCase()}`;
  return 'textarea-field';
}

export function Textarea(props: TextareaProps): JSX.Element {
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
    placeholder,
    rows = 4,
  } = props;
  const inputId = deriveId(props);
  const wrapperClass = ['flex flex-col gap-1', className].filter(Boolean).join(' ');
  const fieldClass = [
    'resize-y rounded-md border bg-elevated px-3 py-2 text-text',
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
      <textarea
        id={inputId}
        name={name}
        value={value}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        rows={rows}
        className={fieldClass}
      />
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
