import { type ChangeEvent, useId } from 'react';

export interface ColorPickerProps {
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
  resetLabel?: string;
}

const HEX_RE = /^#[0-9a-f]{6}$/i;

export function ColorPicker(props: ColorPickerProps): JSX.Element {
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
    resetLabel = 'Reset',
  } = props;
  // Only `id` opts the caller into controlled-id linkage (for `<label htmlFor>`
  // pairing in form-builder contexts). `name`/`label` are NOT promoted to
  // DOM ids because two ColorPicker instances with the same label
  // (`<ColorPicker label="Hex" />` × 2) would emit duplicate ids, breaking
  // accessibility AT pairings. useId guarantees uniqueness across instances
  // and is the safe default (claude-A pass tightening of H16).
  const reactId = useId();
  const inputId = props.id ?? `color-${reactId}`;
  const errorId = `${inputId}-err`;
  const hexValid = value === '' || HEX_RE.test(value);
  const errorText = error ?? (hexValid ? undefined : 'Invalid hex color');

  const onText = (e: ChangeEvent<HTMLInputElement>): void => onChange(e.target.value);
  const onSwatch = (e: ChangeEvent<HTMLInputElement>): void => onChange(e.target.value);
  const reset = (): void => onChange('');

  const wrapperClass = ['flex flex-col gap-1', className].filter(Boolean).join(' ');
  const textClass = [
    'w-32 rounded-md border bg-surface px-3 py-2 text-sm',
    'focus:outline-none focus:ring-2 focus:ring-accent',
    errorText ? 'border-error' : 'border-border',
  ].join(' ');

  return (
    <div className={wrapperClass}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text">
          {label}
          {required && <span className="text-error"> *</span>}
        </label>
      )}
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label ? `${label} swatch` : 'Color swatch'}
          value={HEX_RE.test(value) ? value : '#000000'}
          onChange={onSwatch}
          disabled={disabled}
          className="h-9 w-12 rounded border border-border"
        />
        <input
          id={inputId}
          name={name}
          type="text"
          value={value}
          onChange={onText}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          placeholder="#rrggbb"
          className={textClass}
          aria-invalid={errorText ? 'true' : undefined}
          aria-describedby={errorText ? errorId : undefined}
        />
        <button
          type="button"
          onClick={reset}
          disabled={disabled}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-elevated"
        >
          {resetLabel}
        </button>
      </div>
      {errorText && (
        <p id={errorId} role="alert" className="text-sm text-error">
          {errorText}
        </p>
      )}
    </div>
  );
}
