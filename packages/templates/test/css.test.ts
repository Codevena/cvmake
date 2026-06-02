import { describe, expect, it } from 'vitest';
import { stripSharedImports } from '../src/css.js';

describe('stripSharedImports', () => {
  it('removes the relative shared reset/print @import lines', () => {
    const css = `@import "../shared/reset.css";\n@import "../shared/print.css";\n\n.swiss { color: red; }\n`;
    const out = stripSharedImports(css);
    expect(out).not.toContain('shared/reset.css');
    expect(out).not.toContain('shared/print.css');
    expect(out).toContain('.swiss { color: red; }');
  });

  it('preserves absolute font @import url(...) lines', () => {
    const css = `@import url("https://fonts.googleapis.com/css2?family=Inter");\n@import "../shared/reset.css";\n.x{}`;
    const out = stripSharedImports(css);
    expect(out).toContain('fonts.googleapis.com');
    expect(out).not.toContain('shared/reset.css');
  });

  it('handles single quotes', () => {
    const out = stripSharedImports(`@import '../shared/print.css';\n.x{}`);
    expect(out).not.toContain('shared/print.css');
    expect(out).toContain('.x{}');
  });
});
