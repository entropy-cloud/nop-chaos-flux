import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync('src/form-renderers.css', 'utf8');

describe('form renderer stylesheet contract', () => {
  it('scopes form field selectors to the nop-form root', () => {
    expect(styles).toContain(".nop-form [data-slot='select-wrapper']");
    expect(styles).toContain(".nop-form [data-slot='checkbox-wrapper']");
    expect(styles).toContain(".nop-form [data-slot='radio-group-wrapper']");
    expect(styles).not.toContain("\n[data-slot='select-wrapper']");
    expect(styles).not.toContain("\n[data-slot='checkbox-wrapper']");
    expect(styles).not.toContain("\n[data-slot='radio-group-wrapper']");
  });
});
