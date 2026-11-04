import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ux-u6 族 A-2：flux design token（--background 等）在主题根以裸 HSL 分量形式定义
// （如 --background: 0 0% 100%）。styles.css 中颜色通道直接写 `var(--token)` 对裸分量
// 值非法（computed 回落 initial/transparent），八态状态色失效；必须以 `hsl(var(--token))`
// 包裹。旧实现（bare var）下本测试必挂。
const COLOR_TOKENS = [
  'background',
  'foreground',
  'border',
  'primary',
  'primary-foreground',
  'destructive',
  'destructive-foreground',
  'muted-foreground',
];

describe('styles.css - HSL 分量令牌包裹（ux-u6 族 A-2）', () => {
  const styles = readFileSync(join(import.meta.dirname, 'styles.css'), 'utf8');

  it('颜色令牌禁止 bare var() 引用，必须 hsl(var(...)) 包裹', () => {
    const barePattern = new RegExp(
      `(?<!hsl\\()var\\(--(${COLOR_TOKENS.join('|')})\\)`,
      'g',
    );
    const bare = styles.match(barePattern) ?? [];
    expect(bare).toEqual([]);
  });

  it('存在 hsl(var(...)) 包裹通道（正向哨兵）', () => {
    expect(styles).toMatch(/hsl\(var\(--/);
  });

  it('禁止重复包裹 hsl(hsl(', () => {
    expect(styles).not.toMatch(/hsl\(hsl\(/);
  });
});
