import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
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

  it('aria-invalid lives on each <select> (WAI-ARIA), aria-describedby on fieldset', () => {
    // claude-A pass: aria-invalid only applies to form controls per WAI-ARIA,
    // not to grouping elements like <fieldset>; it's wired onto each <select>.
    // The <fieldset> still carries aria-describedby (which IS valid on
    // groupings) so AT reads the error along with the legend.
    const value: DateRangeValue = { start: '2020-03', end: '2024-06' };
    render(<DateRangeInput label="Range" value={value} onChange={() => {}} error="Custom error" />);
    const errorEl = screen.getByRole('alert');
    expect(errorEl).toHaveTextContent('Custom error');
    const fieldset = errorEl.closest('fieldset');
    expect(fieldset).not.toHaveAttribute('aria-invalid');
    expect(fieldset).toHaveAttribute('aria-describedby', errorEl.id);
    // Every <select> child gets aria-invalid="true".
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);
    for (const s of selects) {
      expect(s).toHaveAttribute('aria-invalid', 'true');
    }
  });

  it('no aria-invalid anywhere when there is no error', () => {
    const value: DateRangeValue = { start: '2020-03', end: '2024-06' };
    render(<DateRangeInput label="Range" value={value} onChange={() => {}} />);
    const fieldset = document.querySelector('fieldset');
    expect(fieldset).not.toHaveAttribute('aria-invalid');
    expect(fieldset).not.toHaveAttribute('aria-describedby');
    for (const s of screen.getAllByRole('combobox')) {
      expect(s).not.toHaveAttribute('aria-invalid');
    }
  });
});

// A new experience entry starts with an empty date, and the old component made
// that state unreachable: whichever half was chosen first was discarded, so the
// entry could never become valid.
describe('partial entry', () => {
  function Harness({ initial }: { initial: DateRangeValue }) {
    const [value, setValue] = useState<DateRangeValue>(initial);
    return (
      <>
        <DateRangeInput label="Period" value={value} onChange={setValue} />
        <output data-testid="emitted">{JSON.stringify(value)}</output>
      </>
    );
  }

  const emitted = () => JSON.parse(screen.getByTestId('emitted').textContent ?? '{}');

  it('keeps a month chosen before a year, and emits nothing yet', () => {
    render(<Harness initial={{ start: '', end: '' }} />);
    fireEvent.change(screen.getByLabelText('Start month'), { target: { value: '03' } });
    // The choice survives on screen — this is what used to vanish.
    expect(screen.getByLabelText('Start month')).toHaveValue('03');
    // A month without a year is not a date, so nothing is emitted yet.
    expect(emitted().start).toBe('');
  });

  it('completes to YYYY-MM once the year follows', () => {
    render(<Harness initial={{ start: '', end: '' }} />);
    fireEvent.change(screen.getByLabelText('Start month'), { target: { value: '03' } });
    fireEvent.change(screen.getByLabelText('Start year'), { target: { value: '2020' } });
    expect(emitted().start).toBe('2020-03');
  });

  it('emits a bare year immediately when the year comes first', () => {
    // `CvDateSchema` accepts `YYYY`, so this is a valid date on its own and the
    // entry becomes savable before the month is chosen.
    render(<Harness initial={{ start: '', end: '' }} />);
    fireEvent.change(screen.getByLabelText('Start year'), { target: { value: '2020' } });
    expect(emitted().start).toBe('2020');
    fireEvent.change(screen.getByLabelText('Start month'), { target: { value: '03' } });
    expect(emitted().start).toBe('2020-03');
  });

  it('does the same for the end date', () => {
    render(<Harness initial={{ start: '2019-01', end: '' }} />);
    fireEvent.change(screen.getByLabelText('End month'), { target: { value: '07' } });
    expect(screen.getByLabelText('End month')).toHaveValue('07');
    fireEvent.change(screen.getByLabelText('End year'), { target: { value: '2021' } });
    expect(emitted().end).toBe('2021-07');
  });

  it('clears the end selects when Current is unchecked again', () => {
    // Checking Current emits `end: null`; unchecking emits `end: ''`. The local
    // state has to follow, or the selects go on showing the old end date while
    // the document holds none — a date the user can see and the PDF will not
    // have. The resync at the top of the component cannot catch it, because
    // `emit` writes `lastEmitted` first.
    render(<Harness initial={{ start: '2019-01', end: '' }} />);
    fireEvent.change(screen.getByLabelText('End month'), { target: { value: '07' } });
    fireEvent.change(screen.getByLabelText('End year'), { target: { value: '2021' } });
    expect(emitted().end).toBe('2021-07');

    fireEvent.click(screen.getByLabelText('Current'));
    expect(emitted().end).toBeNull();

    fireEvent.click(screen.getByLabelText('Current'));
    expect(emitted().end).toBe('');
    expect(screen.getByLabelText('End month')).toHaveValue('');
    expect(screen.getByLabelText('End year')).toHaveValue('');
  });

  it('follows a value that changes from outside', () => {
    // The counter-probe: local state must not shadow a genuine external update.
    function Outside() {
      const [value, setValue] = useState<DateRangeValue>({ start: '2019-01', end: '' });
      return (
        <>
          <DateRangeInput label="Period" value={value} onChange={setValue} />
          <button type="button" onClick={() => setValue({ start: '2022-08', end: '' })}>
            set
          </button>
        </>
      );
    }
    render(<Outside />);
    fireEvent.click(screen.getByRole('button', { name: 'set' }));
    expect(screen.getByLabelText('Start month')).toHaveValue('08');
    expect(screen.getByLabelText('Start year')).toHaveValue('2022');
  });
});
