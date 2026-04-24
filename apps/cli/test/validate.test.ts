import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { runValidate } from '../src/commands/validate.js';

describe('validate', () => {
  it('exit 0 bei gültiger YAML', async () => {
    const p = path.resolve('../../packages/core/test/fixtures/valid.de.yaml');
    const code = await runValidate(p);
    expect(code).toBe(0);
  });

  it('exit 1 bei kaputter YAML', async () => {
    const p = path.resolve('../../packages/core/test/fixtures/broken.yaml');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const code = await runValidate(p);
    expect(code).toBe(1);
    spy.mockRestore();
  });
});
