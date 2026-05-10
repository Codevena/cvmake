import { academic } from './academic/index.js';
import { classicSerif } from './classic-serif/index.js';
import { corporate } from './corporate/index.js';
import { creativeAccent } from './creative-accent/index.js';
import { editorial } from './editorial/index.js';
import { modernMinimal } from './modern-minimal/index.js';
import { monochromeDark } from './monochrome-dark/index.js';
import { clearRegistry, registerTemplate } from './registry.js';
import { techDev } from './tech-dev/index.js';

export function bootstrapTemplates(): void {
  clearRegistry();
  registerTemplate(classicSerif);
  registerTemplate(modernMinimal);
  registerTemplate(creativeAccent);
  registerTemplate(academic);
  registerTemplate(monochromeDark);
  registerTemplate(editorial);
  registerTemplate(corporate);
  registerTemplate(techDev);
}
