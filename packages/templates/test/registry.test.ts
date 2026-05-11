import type { TemplateDefinition } from '@codevena/cvmake-schema';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { clearRegistry, getTemplate, listTemplates, registerTemplate } from '../src/registry.js';

const stub: TemplateDefinition = {
  meta: {
    id: 'stub',
    name: 'Stub',
    description: 'x',
    supportsPhoto: false,
    photoFallback: 'none',
    supportedLocales: ['de', 'en'],
    defaultSectionOrder: ['summary'],
    supportsPagination: true,
  },
  palettes: [
    {
      id: 'stub-default',
      name: 'Stub Default',
      accent: '#000000',
      background: '#ffffff',
      surface: '#eeeeee',
      text: '#000000',
      textMuted: '#666666',
      textOnAccent: '#ffffff',
    },
  ],
  Component: () => null as unknown as ReactElement,
};

describe('registry', () => {
  it('registriert und findet ein Template', () => {
    clearRegistry();
    registerTemplate(stub);
    expect(getTemplate('stub')?.meta.id).toBe('stub');
  });

  it('gibt null zurück für unbekannte ID', () => {
    clearRegistry();
    expect(getTemplate('unknown')).toBeNull();
  });

  it('listet alle registrierten Templates', () => {
    clearRegistry();
    registerTemplate(stub);
    expect(listTemplates().some((t) => t.meta.id === 'stub')).toBe(true);
  });

  it('verbietet doppelte Registrierung derselben ID', () => {
    clearRegistry();
    registerTemplate(stub);
    expect(() => registerTemplate(stub)).toThrow(/already registered/);
  });
});
