/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as {
  exports?: Record<string, unknown>;
};

describe('@nop-chaos/theme-tokens styles contract', () => {
  it('exports the published stylesheet subpath', () => {
    const styleExport = packageJson.exports?.['./styles.css'];
    const stylePath = typeof styleExport === 'string' ? styleExport : (styleExport as Record<string, string>)?.default;
    expect(stylePath).toBe('./dist/styles.css');
  });

  it('defines the base root token block', () => {
    expect(styles).toContain(':root {');
    expect(styles).toContain('--radius-sm:');
    expect(styles).toContain('--radius-md:');
    expect(styles).toContain('--shadow-sm:');
    expect(styles).toContain('--sidebar: var(--card);');
    expect(styles).toContain('--sidebar-border: var(--border);');
    expect(styles).toContain('--surface-primary:');
    expect(styles).toContain('--surface-overlay:');
    expect(styles).toContain('--primary-foreground:');
    expect(styles).toContain('--background:');
    expect(styles).toContain('--popover: var(--card);');
    expect(styles).toContain('--popover-foreground: var(--card-foreground);');
    expect(styles).toContain('--border: 214 32% 91%;');
    expect(styles).not.toContain('--host-primary:');
  });

  it('defines the C1a table token surface on :root', () => {
    expect(styles).toContain('--table-body-font-size: 12px;');
    expect(styles).toContain('--table-header-font-size: 14px;');
    expect(styles).toContain('--table-header-font-weight: 400;');
    expect(styles).toContain('--table-header-bg:');
    expect(styles).toContain('--table-cell-padding-y: 11px;');
    expect(styles).toContain('--table-cell-padding-x: 10px;');
    expect(styles).toContain('--table-edge-padding-x: 16px;');
    expect(styles).toContain('--table-row-height: 40px;');
    expect(styles).toContain('--table-header-separator-color: hsl(var(--border));');
    expect(styles).toContain('--table-hover-bg:');
    expect(styles).toContain('--table-selected-bg:');
    expect(styles).toContain('--table-selected-bg-strong:');
    expect(styles).toContain('--table-striped-bg: transparent;');
    expect(styles).toContain('--table-fixed-edge-width: 30px;');
    expect(styles).toContain('--table-fixed-edge-shadow:');
    expect(styles).toContain('--table-fixed-edge-shadow-right:');
    expect(styles).toContain('--table-empty-height: 200px;');
    expect(styles).toContain('--table-row-action-height: 32px;');
    expect(styles).toContain('--table-row-action-gap: 10px;');
    expect(styles).toContain('--crud-toolbar-gap: 10px;');
  });

  it('defines the C1a dialog size and position tokens on :root', () => {
    expect(styles).toContain('--dialog-size-xs: 375px;');
    expect(styles).toContain('--dialog-size-sm: 350px;');
    expect(styles).toContain('--dialog-size-base: 500px;');
    expect(styles).toContain('--dialog-size-md: 800px;');
    expect(styles).toContain('--dialog-size-lg: 1100px;');
    expect(styles).toContain('--dialog-size-xl: 90%;');
    expect(styles).toContain('--dialog-top-offset: 60px;');
    expect(styles).toContain('--dialog-stack-step: 30px;');
    expect(styles).toContain('--dialog-overlay-bg: rgb(0 0 0 / 0.7);');
    expect(styles).toContain('--dialog-title-font-size: 14px;');
    expect(styles).toContain('--dialog-body-padding-x: 24px;');
    expect(styles).toContain('--dialog-footer-gap: 8px;');
    expect(styles).toContain('--dialog-footer-button-min-width: 72px;');
    expect(styles).toContain('--dialog-content-border-radius: 6px;');
  });

  it('defines all supported theme root selectors', () => {
    expect(styles).toContain(":root[data-theme='classic'][data-mode='light']");
    expect(styles).toContain(":root[data-theme='classic'][data-mode='dark']");
    expect(styles).toContain(":root[data-theme='glass'][data-mode='light']");
    expect(styles).toContain(":root[data-theme='glass'][data-mode='dark']");
  });

  it('defines representative semantic color tokens for every theme variant', () => {
    const blocks = [
      ":root[data-theme='classic'][data-mode='light']",
      ":root[data-theme='classic'][data-mode='dark']",
      ":root[data-theme='glass'][data-mode='light']",
      ":root[data-theme='glass'][data-mode='dark']",
    ];

    for (const block of blocks) {
      const start = styles.indexOf(block);
      expect(start).toBeGreaterThanOrEqual(0);
      const end = styles.indexOf('}', start);
      const blockText = styles.slice(start, end);
      expect(blockText).toContain('--primary:');
      expect(blockText).toContain('--background:');
      expect(blockText).toContain('--card:');
      expect(blockText).toContain('--border:');
      expect(blockText).toContain('--chart-1:');
      expect(blockText).toContain('--chart-5:');
      expect(blockText).toContain('--surface-primary:');
      expect(blockText).toContain('--surface-hover:');
      expect(blockText).toContain('--surface-overlay:');
      expect(blockText).not.toContain('--host-');
    }
  });
});
