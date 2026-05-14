import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CommandPalette } from './CommandPalette';

const NOOP_COMMANDS = {
  switchCv: vi.fn(),
  allSlugs: ['cv.en', 'cv.de'],
  switchTemplate: vi.fn(),
  templateIds: ['classic-serif', 'swiss'],
  switchPalette: vi.fn(),
  paletteIds: ['classic-serif-default', 'classic-serif-mono'],
  jumpToSection: vi.fn(),
  exportPdf: vi.fn(),
};

describe('CommandPalette', () => {
  it('is closed by default and opens when `open` is true', () => {
    const { rerender } = render(
      <CommandPalette open={false} onClose={() => {}} commands={NOOP_COMMANDS} />,
    );
    expect(screen.queryByPlaceholderText(/type a command/i)).toBeNull();
    rerender(<CommandPalette open={true} onClose={() => {}} commands={NOOP_COMMANDS} />);
    expect(screen.getByPlaceholderText(/type a command/i)).toBeTruthy();
  });

  it('fires exportPdf and closes when the Export command is chosen', () => {
    const exportPdf = vi.fn();
    const onClose = vi.fn();
    render(
      <CommandPalette open={true} onClose={onClose} commands={{ ...NOOP_COMMANDS, exportPdf }} />,
    );
    fireEvent.click(screen.getByText(/export pdf/i));
    expect(exportPdf).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('jumps to a section when a section command is chosen', () => {
    const jumpToSection = vi.fn();
    render(
      <CommandPalette
        open={true}
        onClose={() => {}}
        commands={{ ...NOOP_COMMANDS, jumpToSection }}
      />,
    );
    fireEvent.click(screen.getByText(/go to experience/i));
    expect(jumpToSection).toHaveBeenCalledWith('experience');
  });

  it('calls switchPalette and closes when a palette command is chosen', () => {
    const switchPalette = vi.fn();
    const onClose = vi.fn();
    render(
      <CommandPalette
        open={true}
        onClose={onClose}
        commands={{ ...NOOP_COMMANDS, switchPalette }}
      />,
    );
    fireEvent.click(screen.getByText(/switch palette: classic-serif-default/i));
    expect(switchPalette).toHaveBeenCalledWith('classic-serif-default');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
