import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TabNav, type TabId } from './TabNav';

describe('TabNav', () => {
  it('renders all 7 section tabs', () => {
    render(<TabNav active="personal" onSelect={() => {}} />);
    for (const label of [
      'Personal',
      'Experience',
      'Education',
      'Skills',
      'Languages',
      'Custom',
      'Summary',
    ]) {
      expect(screen.getByRole('tab', { name: label })).toBeTruthy();
    }
  });

  it('marks the active tab as selected', () => {
    render(<TabNav active="experience" onSelect={() => {}} />);
    expect(screen.getByRole('tab', { name: 'Experience' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Personal' }).getAttribute('aria-selected')).toBe(
      'false',
    );
  });

  it('calls onSelect with the tab id when a tab is clicked', () => {
    const onSelect = vi.fn();
    render(<TabNav active="personal" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Skills' }));
    expect(onSelect).toHaveBeenCalledWith('skills' satisfies TabId);
  });
});
