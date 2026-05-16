import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Input } from './Input.js';

describe('<Input>', () => {
  it('renders label and value', () => {
    render(<Input label="Name" value="Lena" onChange={() => {}} />);
    expect(screen.getByLabelText('Name')).toHaveValue('Lena');
  });

  it('calls onChange with next value', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Input label="Name" value="" onChange={onChange} />);
    await user.type(screen.getByLabelText('Name'), 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('shows error message', () => {
    render(<Input label="Name" value="" onChange={() => {}} error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('sets aria-invalid and aria-describedby when error is set', () => {
    render(<Input label="Name" value="" onChange={() => {}} error="Required" />);
    const input = screen.getByLabelText('Name');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const errorEl = screen.getByRole('alert');
    expect(errorEl).toHaveTextContent('Required');
    expect(input).toHaveAttribute('aria-describedby', errorEl.id);
  });

  it('does not set aria-invalid when no error', () => {
    render(<Input label="Name" value="" onChange={() => {}} />);
    const input = screen.getByLabelText('Name');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('respects disabled prop', () => {
    render(<Input label="Name" value="" onChange={() => {}} disabled />);
    expect(screen.getByLabelText('Name')).toBeDisabled();
  });
});
