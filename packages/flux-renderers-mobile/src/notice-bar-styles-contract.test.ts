import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// [G4-R5-视角3-01] notice-bar 的 variant 变体色板曾是死 CSS：全部变体规则（含暗色覆盖与
// 变量定义）挂在 `.nop-mobile` 作用域类下，而全仓没有任何渲染器或宿主输出该类
// （notice-bar 渲染根只输出 nop-notice-bar / data-slot="notice-bar"，见 mobile-markers-contract
// 与 notice-bar.test.tsx 的 data-variant 属性断言）。修复契约 = 变体规则收敛到有生产方的
// `[data-slot='notice-bar'][data-variant=*]` 选择器，暗色覆盖语义保留。
// 样式源断言沿用 industrial 包 editor-styles readFileSync 先例。
const styles = readFileSync('src/styles.css', 'utf8');

describe('[G4-R5-视角3-01] notice-bar variant palette must not hang off the dead .nop-mobile scope', () => {
  it('no rule references the producer-less .nop-mobile scope class', () => {
    expect(styles).not.toMatch(/\.nop-mobile/);
  });

  it('every variant rule keys off the production-emitted [data-slot][data-variant] contract', () => {
    for (const variant of ['info', 'warning', 'success', 'error']) {
      expect(styles).toMatch(
        new RegExp(`\\[data-slot='notice-bar'\\]\\[data-variant='${variant}'\\]\\s*\\{`),
      );
    }
  });

  it('the custom-property palette is defined on the notice-bar element itself (scoped, alive)', () => {
    expect(styles).toMatch(/\[data-slot='notice-bar'\]\s*\{[^}]*--nop-notice-bar-info-bg/);
  });

  it('dark-mode overrides survive with notice-bar-scoped selectors (semantics preserved)', () => {
    expect(styles).toMatch(/\.dark\s+\[data-slot='notice-bar'\]/);
    expect(styles).toMatch(/\[data-mode='dark'\]\s+\[data-slot='notice-bar'\]/);
  });
});
