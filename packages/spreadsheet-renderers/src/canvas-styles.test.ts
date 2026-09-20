import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// plan 476：路径锚定测试文件所在目录（repo types shim 提供 import.meta.dirname），
// 修复原实现对进程 cwd 的依赖。
const stylesheetPath = join(import.meta.dirname, 'canvas-styles.css');

describe('spreadsheet canvas styles', () => {
  it('keeps spreadsheet shell chrome on shared theme tokens', () => {
    const stylesheet = readFileSync(stylesheetPath, 'utf8');

    expect(stylesheet).toContain("border: 1px solid var(--nop-border);");
    expect(stylesheet).toContain("background: var(--nop-surface);");
    expect(stylesheet).toContain("border-color: var(--nop-accent);");
    expect(stylesheet).toContain("color: var(--nop-body-copy);");
    expect(stylesheet).not.toContain("var(--nop-border, rgb(226, 232, 240))");
    expect(stylesheet).not.toContain("var(--nop-surface, rgb(255, 255, 255))");
    expect(stylesheet).not.toContain("var(--nop-accent, rgb(59, 130, 246))");
    expect(stylesheet).not.toContain("var(--nop-body-copy, rgb(71, 85, 105))");
  });
});

describe('canvas styles token discipline (plan 476)', () => {
  const stylesheet = readFileSync(stylesheetPath, 'utf8');

  it('bans hex literals anywhere (tokens only at consumption points)', () => {
    expect(stylesheet).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('allows rgb()/rgba()/hsl() literals only inside the --ss-* definition blocks', () => {
    const start = stylesheet.indexOf('/* --ss-* token definitions (plan 476)');
    const end = stylesheet.indexOf('/* --ss-* definitions end */');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const outside = stylesheet.slice(0, start) + stylesheet.slice(end);
    expect(outside, 'all color literals must live in the definition blocks').not.toMatch(/rgba?\(/);
    expect(outside, 'hsl literals must live in the definition blocks').not.toMatch(/\bhsl\(/);
  });

  it('bans CSS named colors outside the definition blocks (guard completeness)', () => {
    // `background: white` 类命名色曾绕过 hex/rgb 守卫（plan 476 audit Major-1）
    const start = stylesheet.indexOf('/* --ss-* token definitions (plan 476)');
    const end = stylesheet.indexOf('/* --ss-* definitions end */');
    const outside = stylesheet.slice(0, start) + stylesheet.slice(end);
    const named = /\b(?:white|black|red|green|blue|gray|grey|silver|orange|yellow|transparent(?=\s*;))\b(?![\w-])/;
    const violations = outside
      .split('\n')
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => named.test(line) && /:\s*[^;]*\b(?:white|black|red|green|blue|gray|grey|silver|orange|yellow)\b/.test(line));
    expect(violations, `named color literals found at lines ${violations.map((v) => v.index + 1).join(', ')}`).toEqual([]);
  });

  it('bans dangling --nop-* token consumption (undefined anywhere)', () => {
    expect(stylesheet).not.toMatch(/var\(--nop-(background|ring|destructive)\b/);
  });

  it('publishes --ss-* definitions on :root with dark variants', () => {
    // 文件内大量历史裸 data-slot 选择器无统一包裹根，:root 发布是覆盖全部消费点的
    // 唯一方式（--ss- 前缀命名空间隔离；theme-tokens 同款 dark 触发器）。
    expect(stylesheet).toMatch(/:root \{[^}]*--ss-gridline:/);
    expect(stylesheet).toMatch(/:root\[data-mode='dark'\] \{[^}]*--ss-gridline:/);
  });

});
