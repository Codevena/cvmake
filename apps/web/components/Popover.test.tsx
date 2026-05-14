import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Popover } from './Popover';

describe('Popover', () => {
  it('shows content only after the trigger is clicked', () => {
    render(
      <Popover trigger={<span>Open</span>} label="Test popover">
        <p>Panel body</p>
      </Popover>,
    );
    expect(screen.queryByText('Panel body')).toBeNull();
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByText('Panel body')).toBeTruthy();
  });

  it('closes on Escape', () => {
    render(
      <Popover trigger={<span>Open</span>} label="Test popover">
        <p>Panel body</p>
      </Popover>,
    );
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByText('Panel body')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Panel body')).toBeNull();
  });

  it('closes on outside click', () => {
    render(
      <div>
        <Popover trigger={<span>Open</span>} label="Test popover">
          <p>Panel body</p>
        </Popover>
        <button type="button">Outside</button>
      </div>,
    );
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByText('Panel body')).toBeTruthy();
    fireEvent.mouseDown(screen.getByText('Outside'));
    expect(screen.queryByText('Panel body')).toBeNull();
  });
});
