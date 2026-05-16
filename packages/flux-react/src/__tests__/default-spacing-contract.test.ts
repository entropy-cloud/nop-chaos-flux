import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync('src/default-spacing.css', 'utf8');

describe('default-spacing.css contract', () => {
  it('scopes tabs and field slot defaults to Flux-owned roots instead of bare shared slots', () => {
    expect(styles).toContain(".nop-flux-root [data-slot='tabs-content']");
    expect(styles).toContain(".nop-page [data-slot='tabs-content']");
    expect(styles).toContain(".nop-form [data-slot='tabs-content']");
    expect(styles).toContain(".nop-container [data-slot='tabs-content']");

    expect(styles).toContain(".nop-field [data-slot='field-label']");
    expect(styles).toContain(".nop-field [data-slot='field-required']");
    expect(styles).toContain(".nop-field [data-slot='field-error']");
    expect(styles).toContain(".nop-field [data-slot='field-hint']");
    expect(styles).toContain(".nop-field [data-slot='field-description']");

    expect(styles).not.toContain("\n  [data-slot='tabs-content'] {");
    expect(styles).not.toContain("\n  [data-slot='field-label'] {");
    expect(styles).not.toContain("\n  [data-slot='field-required'] {");
    expect(styles).not.toContain("\n  [data-slot='field-error'] {");
    expect(styles).not.toContain("\n  [data-slot='field-hint'] {");
    expect(styles).not.toContain("\n  [data-slot='field-description'] {");
  });
});
