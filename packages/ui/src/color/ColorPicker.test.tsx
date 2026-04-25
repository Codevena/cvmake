import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ColorPicker } from './ColorPicker.js';

describe('<ColorPicker>', () => {
  it('renders the hex value in the text input', () => {
    render(<ColorPicker label="Accent" value="#ff0000" onChange={() => {}} />);
    const text = screen.getByLabelText('Accent') as HTMLInputElement;
    expect(text.value).toBe('#ff0000');
  });

  it('Reset button calls onChange with empty string', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ColorPicker label="Accent" value="#ff0000" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('renders inline error for invalid hex', () => {
    render(<ColorPicker label="Accent" value="not-hex" onChange={() => {}} />);
    expect(screen.getByText(/invalid hex color/i)).toBeInTheDocument();
  });

  it('typing into text input dispatches onChange', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ColorPicker label="Accent" value="" onChange={onChange} />);
    await user.type(screen.getByLabelText('Accent'), '#');
    expect(onChange).toHaveBeenCalledWith('#');
  });
});
