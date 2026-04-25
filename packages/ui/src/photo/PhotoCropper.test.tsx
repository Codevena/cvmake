import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PhotoCropper } from './PhotoCropper.js';

function makeFile(name: string, type: string, sizeBytes = 1024): File {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type });
  return new File([blob], name, { type });
}

describe('<PhotoCropper>', () => {
  it('renders the no-file drop zone by default', () => {
    render(<PhotoCropper onConfirm={() => {}} />);
    expect(screen.getByLabelText(/upload photo/i)).toBeInTheDocument();
  });

  it('rejects oversize files with an inline error', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<PhotoCropper onConfirm={onConfirm} maxBytes={500} />);
    const big = makeFile('big.jpg', 'image/jpeg', 1024);
    await user.upload(screen.getByLabelText(/upload photo/i), big);
    expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('rejects unsupported MIME types', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup({ applyAccept: false });
    render(<PhotoCropper onConfirm={onConfirm} />);
    const bad = makeFile('doc.txt', 'text/plain');
    await user.upload(screen.getByLabelText(/upload photo/i), bad);
    expect(screen.getByText(/unsupported image type/i)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('renders aspect-toggle buttons when an initialFile is provided', () => {
    const initial = makeFile('photo.jpg', 'image/jpeg');
    render(<PhotoCropper onConfirm={() => {}} initialFile={initial} />);
    expect(screen.getByRole('button', { name: '1:1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3:4' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'free' })).toBeInTheDocument();
  });

  it('Cancel returns to the no-file state and calls onCancel', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    const initial = makeFile('photo.jpg', 'image/jpeg');
    render(<PhotoCropper onConfirm={() => {}} onCancel={onCancel} initialFile={initial} />);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
    expect(screen.getByLabelText(/upload photo/i)).toBeInTheDocument();
  });
});
