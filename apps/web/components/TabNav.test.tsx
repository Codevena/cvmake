import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { type TabId, TabNav } from './TabNav';

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

describe('<TabNav /> error marking', () => {
  it('marks a tab whose section fails validation, for sight and for assistive tech', () => {
    // Without this the editor can say "fix errors to save" while every tab
    // looks identical — and in the skills case the user has not touched a
    // single field, so there is nothing to retrace.
    render(<TabNav active="personal" onSelect={() => {}} errorTabs={['experience']} />);
    const bad = screen.getByRole('tab', { name: /Experience/ });
    expect(bad).toHaveAttribute('aria-invalid', 'true');
    expect(bad).toHaveTextContent('has errors');
    const good = screen.getByRole('tab', { name: /^Personal/ });
    expect(good).not.toHaveAttribute('aria-invalid');
  });

  it('marks nothing when the form is valid', () => {
    render(<TabNav active="personal" onSelect={() => {}} />);
    for (const tab of screen.getAllByRole('tab')) {
      expect(tab).not.toHaveAttribute('aria-invalid');
    }
  });
});
