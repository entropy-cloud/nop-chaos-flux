import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync('src/designer-theme.css', 'utf8');

describe('flow designer theme stylesheet contract', () => {
  it('keeps Flow defaults as fallback reads instead of root-local token overrides', () => {
    expect(styles).not.toContain(':where(.fd-theme-root, .nop-designer) {');
    expect(styles).toContain('.nop-designer {');
    expect(styles).toContain('--fd-page-bg,');
    expect(styles).toContain('--fd-toolbar-bg, rgba(255, 255, 255, 0.78)');
    expect(styles).toContain('--fd-edge-actions-shadow, 0 2px 8px rgba(15, 23, 42, 0.08)');
  });

  it('derives palette chrome from the published accent token contract', () => {
    expect(styles).toContain('.fd-palette-swatch {');
    expect(styles).toContain('var(--fd-palette-accent, hsl(var(--primary)))');
    expect(styles).not.toContain('.fd-palette-appearance-task');
    expect(styles).not.toContain('.fd-palette-appearance-start');
  });
});
