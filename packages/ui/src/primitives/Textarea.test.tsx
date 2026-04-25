import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Textarea } from './Textarea.js';

describe('<Textarea>', () => {
  it('renders label and value', () => {
    render(<Textarea label="Summary" value="hello" onChange={() => {}} />);
    expect(screen.getByLabelText('Summary')).toHaveValue('hello');
  });

  it('calls onChange with next value', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Textarea label="Summary" value="" onChange={onChange} />);
    await user.type(screen.getByLabelText('Summary'), 'x');
    expect(onChange).toHaveBeenCalledWith('x');
  });

  it('shows error message', () => {
    render(<Textarea label="Summary" value="" onChange={() => {}} error="Too short" />);
    expect(screen.getByText('Too short')).toBeInTheDocument();
  });

  it('respects rows prop', () => {
    render(<Textarea label="Summary" value="" onChange={() => {}} rows={8} />);
    expect(screen.getByLabelText('Summary')).toHaveAttribute('rows', '8');
  });
});
