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
    expect(styles).toContain('--crud-toolbar-gap: 8px;');
  });

  it('defines the plan 490 overlay size ladder on :root with zero legacy alias residue', () => {
    expect(styles).toContain('--overlay-size-xs: 360px;');
    expect(styles).toContain('--overlay-size-sm: 480px;');
    expect(styles).toContain('--overlay-size-base: 560px;');
    expect(styles).toContain('--overlay-size-md: 720px;');
    expect(styles).toContain('--overlay-size-lg: 960px;');
    expect(styles).toContain('--overlay-size-xl: min(1280px, calc(100% - 4rem));');
    expect(styles).toContain('--dialog-top-offset: 60px;');
    expect(styles).toContain('--dialog-stack-step: 30px;');
    expect(styles).toContain('--dialog-overlay-bg: rgb(0 0 0 / 0.7);');
    // Phase 3 closure: the transition aliases are deleted once zero consumers
    // remained (grep 全仓无 --dialog-size 消费, plan 490 Phase 3 Proof).
    expect(styles).not.toContain('--dialog-size-');
    expect(styles).not.toContain('--dialog-body-padding-x');
    expect(styles).not.toContain('--dialog-footer-gap');
    expect(styles).not.toContain('--dialog-footer-button-min-width');
    expect(styles).not.toContain('--dialog-title-font-size');
    expect(styles).not.toContain('--dialog-content-border-radius');
  });

  it('defines the plan 490 shared overlay anatomy tokens on :root', () => {
    expect(styles).toContain('--overlay-anatomy-body-padding-x: 24px;');
    expect(styles).toContain('--overlay-anatomy-footer-gap: 8px;');
    expect(styles).toContain('--overlay-anatomy-footer-button-min-width: 72px;');
    expect(styles).toContain('--overlay-anatomy-title-font-size: 14px;');
    expect(styles).toContain('--overlay-anatomy-content-border-radius: 6px;');
  });

  it('defines the plan 490 host-surface block-gap token on :root', () => {
    expect(styles).toContain('--space-block-gap: 12px;');
  });

  it('keeps the overlay size ladder strictly monotonic (plan 490)', () => {
    const rootStart = styles.indexOf(':root {');
    const rootEnd = styles.indexOf('}', rootStart);
    const rootBlock = styles.slice(rootStart, rootEnd);
    const tiers = ['xs', 'sm', 'base', 'md', 'lg'] as const;
    const ladder = tiers.map((tier) => {
      const match = rootBlock.match(new RegExp(`--overlay-size-${tier}:\\s*(\\d+(?:\\.\\d+)?)px`));
      return match ? Number(match[1]) : Number.NaN;
    });
    for (const [index, value] of ladder.entries()) {
      expect(Number.isNaN(value)).toBe(false);
      if (index > 0) {
        expect(value).toBeGreaterThan(ladder[index - 1]!);
      }
    }
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

  it('falls back the semantic status colors on bare :root (plan 471 V1-F1)', () => {
    const rootStart = styles.indexOf(':root {');
    const rootEnd = styles.indexOf('}', rootStart);
    const rootBlock = styles.slice(rootStart, rootEnd);
    for (const token of [
      '--success:',
      '--success-bg:',
      '--warning:',
      '--warning-bg:',
      '--info:',
      '--danger:',
      '--danger-bg:',
    ]) {
      expect(rootBlock).toContain(token);
    }
    expect(rootBlock).toContain('--success: 160 84% 39%;');
    expect(rootBlock).toContain('--danger: 0 84% 60%;');
    expect(rootBlock).toContain('--warning: 38 92% 50%;');
    expect(rootBlock).toContain('--info: 199 89% 48%;');
  });

  it('keeps theme blocks overriding the status colors over the bare :root fallback (specificity contract)', () => {
    const themeBlocks = [
      ":root[data-theme='classic'][data-mode='light']",
      ":root[data-theme='classic'][data-mode='dark']",
      ":root[data-theme='glass'][data-mode='light']",
      ":root[data-theme='glass'][data-mode='dark']",
    ];
    for (const block of themeBlocks) {
      const start = styles.indexOf(block);
      const end = styles.indexOf('}', start);
      const blockText = styles.slice(start, end);
      for (const token of [
        '--success:',
        '--success-bg:',
        '--warning:',
        '--warning-bg:',
        '--info:',
        '--danger:',
        '--danger-bg:',
      ]) {
        expect(blockText).toContain(token);
      }
    }
    const darkStart = styles.indexOf(":root[data-theme='classic'][data-mode='dark']");
    const darkBlock = styles.slice(darkStart, styles.indexOf('}', darkStart));
    expect(darkBlock).toContain('--success: 160 70% 50%;');
  });
});
