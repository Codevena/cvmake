import type { ColorPalette } from '@codevena/cvmake-schema';

export function cssVariables(p: ColorPalette): string {
  return `:root{--accent:${p.accent};--bg:${p.background};--surface:${p.surface};--text:${p.text};--text-muted:${p.textMuted};--text-on-accent:${p.textOnAccent};}`;
}
