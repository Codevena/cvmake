import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { BulletListEditor } from './BulletListEditor.js';

describe('<BulletListEditor>', () => {
  it('renders bullets and add button', () => {
    render(<BulletListEditor value={['one', 'two']} onChange={() => {}} />);
    expect(screen.getByDisplayValue('one')).toBeInTheDocument();
    expect(screen.getByDisplayValue('two')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add bullet/i })).toBeInTheDocument();
  });

  it('Add button appends an empty bullet', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<BulletListEditor value={['one']} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /add bullet/i }));
    expect(onChange).toHaveBeenCalledWith(['one', '']);
  });

  it('Move-up swaps with previous item', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<BulletListEditor value={['a', 'b', 'c']} onChange={onChange} />);
    const upButtons = screen.getAllByRole('button', { name: /move up/i });
    await user.click(upButtons[1] as HTMLElement);
    expect(onChange).toHaveBeenCalledWith(['b', 'a', 'c']);
  });

  it('Delete removes the bullet by index', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<BulletListEditor value={['a', 'b', 'c']} onChange={onChange} />);
    const deleteButtons = screen.getAllByRole('button', { name: /delete bullet/i });
    await user.click(deleteButtons[1] as HTMLElement);
    expect(onChange).toHaveBeenCalledWith(['a', 'c']);
  });

  it('Edit input dispatches onChange with updated array', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<BulletListEditor value={['a']} onChange={onChange} />);
    await user.type(screen.getByDisplayValue('a'), 'b');
    expect(onChange).toHaveBeenCalledWith(['ab']);
  });
});
