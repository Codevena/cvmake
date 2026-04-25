import type { TemplateDefinition } from '@codevena/forq-schema';
import { validateTemplate } from './validate.js';

const REGISTRY = new Map<string, TemplateDefinition>();

export function registerTemplate(def: TemplateDefinition): void {
  validateTemplate(def);
  if (REGISTRY.has(def.meta.id)) {
    throw new Error(`Template ${def.meta.id} already registered`);
  }
  REGISTRY.set(def.meta.id, def);
}

export function getTemplate(id: string): TemplateDefinition | null {
  return REGISTRY.get(id) ?? null;
}

export function listTemplates(): TemplateDefinition[] {
  return [...REGISTRY.values()];
}

export function clearRegistry(): void {
  REGISTRY.clear();
}
