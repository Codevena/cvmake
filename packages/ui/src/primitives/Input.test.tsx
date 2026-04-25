import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Input } from './Input.js';

describe('<Input>', () => {
  it('renders label and value', () => {
    render(<Input label="Name" value="Alex" onChange={() => {}} />);
    expect(screen.getByLabelText('Name')).toHaveValue('Alex');
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

  it('respects disabled prop', () => {
    render(<Input label="Name" value="" onChange={() => {}} disabled />);
    expect(screen.getByLabelText('Name')).toBeDisabled();
  });
});
