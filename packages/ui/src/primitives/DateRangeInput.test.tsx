import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DateRangeInput, type DateRangeValue } from './DateRangeInput.js';

describe('<DateRangeInput>', () => {
  it('renders start and end month/year selects', () => {
    const value: DateRangeValue = { start: '2020-03', end: '2024-06' };
    render(<DateRangeInput label="Range" value={value} onChange={() => {}} />);
    expect((screen.getByLabelText('Start month') as HTMLSelectElement).value).toBe('03');
    expect((screen.getByLabelText('Start year') as HTMLSelectElement).value).toBe('2020');
    expect((screen.getByLabelText('End month') as HTMLSelectElement).value).toBe('06');
    expect((screen.getByLabelText('End year') as HTMLSelectElement).value).toBe('2024');
  });

  it('toggling Current sets end=null and disables end selects', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const value: DateRangeValue = { start: '2020-03', end: '2024-06' };
    render(<DateRangeInput value={value} onChange={onChange} />);
    await user.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith({ start: '2020-03', end: null });
  });

  it('disables end selects when value.end is null', () => {
    const value: DateRangeValue = { start: '2020-03', end: null };
    render(<DateRangeInput value={value} onChange={() => {}} />);
    expect(screen.getByLabelText('End month')).toBeDisabled();
    expect(screen.getByLabelText('End year')).toBeDisabled();
  });

  it('shows consumer-provided error', () => {
    const value: DateRangeValue = { start: '2020-03', end: '2024-06' };
    render(<DateRangeInput value={value} onChange={() => {}} error="Custom error" />);
    expect(screen.getByText('Custom error')).toBeInTheDocument();
  });

  it('shows internal error when end is before start', () => {
    const value: DateRangeValue = { start: '2024-06', end: '2020-03' };
    render(<DateRangeInput value={value} onChange={() => {}} />);
    expect(screen.getByText(/end must be after start/i)).toBeInTheDocument();
  });
});
