import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// plan 477 Phase 2：report-field-panel.css 令牌纪律守卫——
// 禁 dangling --nop-* 消费（--nop-border-hover/--nop-surface-hover/--nop-surface-muted
// 全仓零定义，light 字面 fallback 恒生效造成 dark 击穿）。
// 路径按包根 cwd（pnpm --filter 运行口径，与既有包内测试一致）。
const stylesheetPath = join(process.cwd(), 'src', 'report-field-panel.css');

describe('report field panel css token discipline (plan 477)', () => {
  const stylesheet = readFileSync(stylesheetPath, 'utf8');

  it('bans dangling --nop-* token consumption', () => {
    expect(stylesheet).not.toMatch(/var\(--nop-(border-hover|surface-hover|surface-muted)\b/);
  });

  it('publishes the --rp-* fallback family with dark variants', () => {
    expect(stylesheet).toContain(':root {');
    expect(stylesheet).toContain('--rp-hover-bg:');
    expect(stylesheet).toContain("[data-mode='dark'] {");
    const darkIdx = stylesheet.indexOf("[data-mode='dark'] {");
    expect(stylesheet.slice(darkIdx, darkIdx + 800)).toContain('--rp-hover-bg:');
  });
});
