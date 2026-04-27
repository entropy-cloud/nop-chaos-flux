/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  exports?: Record<string, unknown>;
};

describe('@nop-chaos/theme-tokens styles contract', () => {
  it('exports the source stylesheet subpath', () => {
    expect(packageJson.exports?.['./styles.css']).toBe('./src/styles.css');
  });

  it('defines the base root token block', () => {
    expect(styles).toContain(':root {');
    expect(styles).toContain('--radius-sm:');
    expect(styles).toContain('--radius-md:');
    expect(styles).toContain('--shadow-sm:');
    expect(styles).toContain('--primary-foreground:');
    expect(styles).toContain('--background:');
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
    }
  });
});
