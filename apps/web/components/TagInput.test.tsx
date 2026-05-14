import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { TagInput } from './TagInput';

function Host({ initial }: { initial: string[] }) {
  const [v, setV] = useState(initial);
  return <TagInput value={v} onChange={setV} label="Tags" />;
}

describe('<TagInput />', () => {
  it('adds tag on Enter', () => {
    render(<Host initial={[]} />);
    const input = screen.getByLabelText(/Tags/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'react' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('react')).toBeInTheDocument();
  });
  it('removes tag on × click', () => {
    render(<Host initial={['a', 'b']} />);
    fireEvent.click(screen.getByLabelText(/Remove tag a/i));
    expect(screen.queryByText('a')).not.toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
  });
});
