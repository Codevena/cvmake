import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PhotoUploadField } from './PhotoUploadField';

describe('<PhotoUploadField />', () => {
  it('rendert Auswahl-Button bei leerem Wert', () => {
    render(<PhotoUploadField slug="cv.de" value="" onChange={() => {}} />);
    expect(screen.getByText(/Foto auswählen/)).toBeInTheDocument();
  });
  it('rendert Bild und Ersetzen-Button bei gesetztem Wert', () => {
    render(<PhotoUploadField slug="cv.de" value="/photos/cv.de.jpg" onChange={() => {}} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/photos/cv.de.jpg');
    expect(screen.getByText(/Ersetzen/)).toBeInTheDocument();
  });
});
