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

  it('drives horizontal field label width through --field-label-width with an auto fallback', () => {
    expect(styles).toContain(
      ".nop-field[data-label-align='left'] [data-slot='field-label']",
    );
    expect(styles).toContain(
      ".nop-field[data-label-align='right'] [data-slot='field-label']",
    );
    expect(styles).toContain('width: var(--field-label-width, auto);');
    expect(styles).toContain('overflow-wrap: break-word;');
    expect(styles).not.toContain('width: var(--field-label-width);');
    expect(styles).not.toContain('width: var(--field-label-width, 96px)');
  });
});

describe('form-actions alignment contract (plan 499, R2-3b)', () => {
  it('stacks actions confirm-first on narrow viewports and right-aligns them from sm (40rem)', () => {
    expect(styles).toContain(
      ".nop-form > [data-slot='form-actions'] {\n    display: flex;\n    flex-direction: column-reverse;",
    );
    expect(styles).toContain('@media (min-width: 40rem)');
    expect(styles).toContain(
      ".nop-form > [data-slot='form-actions'] {\n      flex-direction: row;\n      justify-content: flex-end;\n    }",
    );
    expect(styles).toContain(
      '.nop-form > [data-slot=\'form-actions\'] button {\n      min-width: var(--overlay-anatomy-footer-button-min-width);\n    }',
    );
  });

  it('keeps the form-actions gap on its own token (footer channel keeps --overlay-anatomy-footer-gap)', () => {
    expect(styles).toContain('gap: var(--space-form-actions-gap);');
    expect(styles).not.toContain(
      ".nop-form > [data-slot='form-actions'] {\n      gap: var(--overlay-anatomy-footer-gap);",
    );
  });
});
