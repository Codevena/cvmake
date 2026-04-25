import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SaveIndicator } from './SaveIndicator';

describe('<SaveIndicator />', () => {
  it('clean ohne lastSavedAt zeigt "Keine Änderungen"', () => {
    render(<SaveIndicator state="clean" />);
    expect(screen.getByText(/Keine Änderungen/)).toBeInTheDocument();
  });
  it('dirty', () => {
    render(<SaveIndicator state="dirty" />);
    expect(screen.getByText(/Ungespeicherte/)).toBeInTheDocument();
  });
  it('error mit retry', () => {
    render(<SaveIndicator state="error" errorMessage="500" onRetry={() => {}} />);
    expect(screen.getByText(/500/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Erneut versuchen/ })).toBeInTheDocument();
  });
});
