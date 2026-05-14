import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PhotoUploadField } from './PhotoUploadField';

describe('<PhotoUploadField />', () => {
  it('renders choose-photo label when value is empty', () => {
    render(<PhotoUploadField slug="cv.de" value="" onChange={() => {}} />);
    expect(screen.getByText(/Choose photo/)).toBeInTheDocument();
  });
  it('renders image and replace button when value is set', () => {
    render(<PhotoUploadField slug="cv.de" value="/photos/cv.de.jpg" onChange={() => {}} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/photos/cv.de.jpg');
    expect(screen.getByText(/Replace/)).toBeInTheDocument();
  });
});
