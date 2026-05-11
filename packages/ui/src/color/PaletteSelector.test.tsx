import type { ColorPalette } from '@codevena/cvmake-schema';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PaletteSelector } from './PaletteSelector.js';

const PALETTES: ColorPalette[] = [
  {
    id: 'a',
    name: 'Alpha',
    accent: '#ff0000',
    background: '#ffffff',
    surface: '#f5f5f5',
    text: '#000000',
    textMuted: '#666666',
    textOnAccent: '#ffffff',
  },
  {
    id: 'b',
    name: 'Beta',
    accent: '#00ff00',
    background: '#ffffff',
    surface: '#f5f5f5',
    text: '#000000',
    textMuted: '#666666',
    textOnAccent: '#ffffff',
  },
];

describe('<PaletteSelector>', () => {
  it('renders all palettes by name', () => {
    render(<PaletteSelector palettes={PALETTES} value="a" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Beta' })).toBeInTheDocument();
  });

  it('marks the selected palette via aria-checked', () => {
    render(<PaletteSelector palettes={PALETTES} value="b" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Beta' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Alpha' })).toHaveAttribute('aria-checked', 'false');
  });

  it('clicking a palette dispatches onChange with its id', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<PaletteSelector palettes={PALETTES} value="a" onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: 'Beta' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
