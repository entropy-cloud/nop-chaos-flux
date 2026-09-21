import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('progress marker styles — semantic token contract (V12b G1-视角7-09)', () => {
  const css = readFileSync('src/styles.css', 'utf8');

  it('defines no oklch color literals', () => {
    expect(css.includes('oklch(')).toBe(false);
  });

  it('recolors all three variants through the nop-progress token chain', () => {
    for (const variant of ['success', 'warning', 'danger']) {
      const rule = css.match(
        new RegExp(`\\.nop-progress\\[data-variant='${variant}'\\][^{}]*\\{[^}]*\\}`),
      );
      expect(rule, `missing marker rule for variant ${variant}`).toBeTruthy();
      expect(rule![0]).toContain('var(--nop-progress-');
      expect(rule![0]).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it('re-tunes the token chain under the data-mode dark trigger', () => {
    expect(css).toMatch(/\[data-mode='dark'\] \.nop-progress \{/);
  });
});
