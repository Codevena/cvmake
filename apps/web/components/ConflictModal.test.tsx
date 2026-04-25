import type { CVData } from '@codevena/forq-schema';
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
});
