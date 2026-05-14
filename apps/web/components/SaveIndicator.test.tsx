import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SaveIndicator } from './SaveIndicator';

describe('<SaveIndicator />', () => {
  it('clean without lastSavedAt shows "No changes"', () => {
    render(<SaveIndicator state="clean" />);
    expect(screen.getByText(/No changes/)).toBeInTheDocument();
  });
  it('dirty shows unsaved changes', () => {
    render(<SaveIndicator state="dirty" />);
    expect(screen.getByText(/Unsaved/)).toBeInTheDocument();
  });
  it('error with retry', () => {
    render(<SaveIndicator state="error" errorMessage="500" onRetry={() => {}} />);
    expect(screen.getByText(/500/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
  });
});
