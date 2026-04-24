import { clearRegistry, registerTemplate } from './registry.js';
import { classicSerif } from './classic-serif/index.js';

export function bootstrapTemplates(): void {
  clearRegistry();
  registerTemplate(classicSerif);
}
