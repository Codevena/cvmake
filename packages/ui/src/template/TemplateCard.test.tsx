import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TemplateCard } from './TemplateCard.js';

describe('<TemplateCard>', () => {
  it('renders name, description and thumbnail', () => {
    render(
      <TemplateCard
        templateId="classic-serif"
        name="Classic Serif"
        description="Editorial newspaper feel"
        thumbnailSrc="/preview.png"
        selected={false}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('Classic Serif')).toBeInTheDocument();
    expect(screen.getByText('Editorial newspaper feel')).toBeInTheDocument();
    const img = screen.getByRole('img', { name: /classic serif/i }) as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/preview.png');
  });

  it('renders placeholder when thumbnailSrc is missing', () => {
    render(<TemplateCard templateId="x" name="X" selected={false} onSelect={() => {}} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText(/no preview/i)).toBeInTheDocument();
  });

  it('clicking dispatches onSelect with templateId', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <TemplateCard
        templateId="modern-minimal"
        name="Modern Minimal"
        selected={false}
        onSelect={onSelect}
      />,
    );
    await user.click(screen.getByRole('radio'));
    expect(onSelect).toHaveBeenCalledWith('modern-minimal');
  });

  it('reflects selected state via aria-checked', () => {
    render(<TemplateCard templateId="x" name="X" selected onSelect={() => {}} />);
    expect(screen.getByRole('radio')).toHaveAttribute('aria-checked', 'true');
  });
});
