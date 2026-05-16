import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Select } from './Select.js';

const OPTIONS = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
];

describe('<Select>', () => {
  it('renders options and reflects value', () => {
    render(<Select label="Locale" options={OPTIONS} value="en" onChange={() => {}} />);
    const select = screen.getByLabelText('Locale') as HTMLSelectElement;
    expect(select.value).toBe('en');
    expect(screen.getByRole('option', { name: 'Deutsch' })).toBeInTheDocument();
  });

  it('calls onChange with selected value', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Select label="Locale" options={OPTIONS} value="en" onChange={onChange} />);
    await user.selectOptions(screen.getByLabelText('Locale'), 'de');
    expect(onChange).toHaveBeenCalledWith('de');
  });

  it('shows placeholder option when provided', () => {
    render(
      <Select
        label="Locale"
        options={OPTIONS}
        value=""
        placeholder="Choose…"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('option', { name: 'Choose…' })).toBeInTheDocument();
  });

  it('sets aria-invalid and aria-describedby when error is set', () => {
    render(
      <Select label="Locale" options={OPTIONS} value="en" onChange={() => {}} error="Invalid" />,
    );
    const select = screen.getByLabelText('Locale');
    expect(select).toHaveAttribute('aria-invalid', 'true');
    const errorEl = screen.getByRole('alert');
    expect(errorEl).toHaveTextContent('Invalid');
    expect(select).toHaveAttribute('aria-describedby', errorEl.id);
  });

  it('does not set aria-invalid when no error', () => {
    render(<Select label="Locale" options={OPTIONS} value="en" onChange={() => {}} />);
    const select = screen.getByLabelText('Locale');
    expect(select).not.toHaveAttribute('aria-invalid');
    expect(select).not.toHaveAttribute('aria-describedby');
  });
});
