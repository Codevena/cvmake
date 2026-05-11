import type { CVData } from '@codevena/cvmake-schema';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConflictModal } from './ConflictModal';

const DATA: CVData = {
  meta: { locale: 'de' },
  personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [],
  education: [],
  rendering: { template: 'classic-serif' },
};

describe('<ConflictModal />', () => {
  it('Reload mit dirty Form fragt nochmal nach', () => {
    const onReload = vi.fn();
    render(
      <ConflictModal
        slug="cv.de"
        currentData={DATA}
        currentMtime={1}
        isFormDirty
        onReload={onReload}
        onOverwrite={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Datenträger neu laden/ }));
    expect(onReload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Ja, neu laden/ }));
    expect(onReload).toHaveBeenCalledWith(DATA, 1);
  });

  it('Overwrite ruft onOverwrite mit currentMtime', () => {
    const onOverwrite = vi.fn();
    render(
      <ConflictModal
        slug="cv.de"
        currentData={DATA}
        currentMtime={42}
        isFormDirty={false}
        onReload={vi.fn()}
        onOverwrite={onOverwrite}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /überschreiben/ }));
    expect(onOverwrite).toHaveBeenCalledWith(42);
  });

  it('deleted file: Reload disabled, Overwrite enabled', () => {
    const onReload = vi.fn();
    const onOverwrite = vi.fn();
    render(
      <ConflictModal
        slug="cv.de"
        currentData={null}
        currentMtime={0}
        isFormDirty={false}
        onReload={onReload}
        onOverwrite={onOverwrite}
        onCancel={vi.fn()}
      />,
    );
    // Title + body reflect the deletion case.
    expect(screen.getByText(/extern gelöscht/i)).toBeInTheDocument();
    const reloadBtn = screen.getByRole('button', { name: /Datenträger neu laden/ });
    expect(reloadBtn).toBeDisabled();
    expect(reloadBtn).toHaveAttribute('title', 'Datei existiert nicht mehr');
    // Clicking the disabled button must not call onReload.
    fireEvent.click(reloadBtn);
    expect(onReload).not.toHaveBeenCalled();
    // Overwrite still works (re-creates the file).
    fireEvent.click(screen.getByRole('button', { name: /überschreiben/ }));
    expect(onOverwrite).toHaveBeenCalledWith(0);
  });
});
