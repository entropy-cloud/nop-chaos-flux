import { describe, it, expect } from 'vitest';
import { validateScadaConfig } from './validate.js';
import type { ScadaConfig } from './config-types.js';

/**
 * I18.3 迁移兼容 failing-first Proof（plan 2026-08-05-2129-1 Phase 3）。
 *
 * 守护契约：
 * - validator 对旧 `@{pointId}` 表达式 warn（错误码 `legacy-at-syntax`），不 fail。
 * - codemod 改写 `@{...}` → `${...}`、`$xxx` → `${xxx}`，幂等。
 * - normalizeFluxExpression 仅接受 `${` 开头（`$xxx` 简写剥离分支移除）。
 *
 * Test Strategy Tier: Must automate（表达式语法为组态公共契约 + 迁移回归路径）。
 *
 * 注：codemod 实现位于 `scripts/scada-expression-codemod.mjs`（workspace 根，含 node:fs 等
 * Node API）。本测试在 package 内 vitest 环境（happy-dom）运行，无法跨 workspace 导入。
 * 直接验证 codemod 等价逻辑（与 scripts/scada-expression-codemod.mjs 的 migrateContent
 * 同源——若改 patterns，同步更新两边）。
 */

// === codemod 等价逻辑（与 scripts/scada-expression-codemod.mjs 的 patterns 同源） ===
const AT_SYNTAX_PATTERN = /@\{([^{}]*?)\}/g;
const DOLLAR_SHORTHAND_PATTERN = /(?<=flux:\s*'|expression:\s*')\$([a-z_][a-zA-Z0-9_.-]*)(?=['"])/g;

function migrateContent(content: string): { migrated: string; count: number } {
  let migrated = content;
  let count = 0;
  migrated = migrated.replace(AT_SYNTAX_PATTERN, (_match, inner: string) => {
    count++;
    return `\${${inner}}`;
  });
  migrated = migrated.replace(DOLLAR_SHORTHAND_PATTERN, (_match, ident: string) => {
    count++;
    return `\${${ident}}`;
  });
  return { migrated, count };
}
// === end codemod 等价逻辑 ===

const baseConfig = (overrides: Partial<ScadaConfig> = {}): ScadaConfig => ({
  version: 1,
  variables: [],
  symbols: [],
  ...overrides,
}) as ScadaConfig;

describe('I18.3 validator legacy-at-syntax warn（迁移期 warn 不 fail）', () => {
  it('variables[].expression 含旧 @{pointId} 方言 → warn（不 fail）', () => {
    const result = validateScadaConfig(
      baseConfig({
        variables: [{ id: 'e', source: 'expression', expression: '@{a} * 2' } as never],
      } as never),
    );
    expect(result.ok).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings?.some((w) => w.startsWith('legacy-at-syntax'))).toBe(true);
  });

  it('symbols[].bindings[].expression 含旧 @{pointId} 方言 → warn（不 fail）', () => {
    const result = validateScadaConfig(
      baseConfig({
        symbols: [
          {
            id: 'sym',
            type: 'scada-rect',
            x: 0,
            y: 0,
            bindings: { fill: { expression: '@{temp}' } },
          } as never,
        ] as never,
      } as never),
      () => true, // 接受所有 symbol type（单测不注册 symbol）
    );
    expect(result.ok).toBe(true);
    expect(result.warnings?.some((w) => w.startsWith('legacy-at-syntax'))).toBe(true);
  });

  it('bindings[].scale.expression 含旧 @{pointId} 方言 → warn', () => {
    const result = validateScadaConfig(
      baseConfig({
        symbols: [
          {
            id: 'sym',
            type: 'scada-rect',
            x: 0,
            y: 0,
            bindings: { fill: { point: 'p1', scale: { expression: '@{x}' } } },
          } as never,
        ] as never,
      } as never),
      () => true,
    );
    expect(result.ok).toBe(true);
    expect(result.warnings?.some((w) => w.includes('scale.expression'))).toBe(true);
  });

  it('无旧方言 → 无 warnings', () => {
    const result = validateScadaConfig(
      baseConfig({
        variables: [{ id: 'e', source: 'expression', expression: '${a * 2}' } as never],
      } as never),
    );
    expect(result.ok).toBe(true);
    expect(result.warnings).toBeUndefined();
  });

  it('warn 文案含 codemod 指引（scripts/scada-expression-codemod.mjs）', () => {
    const result = validateScadaConfig(
      baseConfig({
        variables: [{ id: 'e', source: 'expression', expression: '@{a}' } as never],
      } as never),
    );
    expect(result.warnings?.[0]).toContain('scada-expression-codemod.mjs');
  });
});

describe('I18.3 codemod 改写正确性（scada-expression-codemod.mjs）', () => {
  it('@{a} → ${a}（简单标识符）', () => {
    const { migrated, count } = migrateContent("flux: '@{a}'");
    expect(migrated).toBe("flux: '${a}'");
    expect(count).toBe(1);
  });

  it('@{a + b} → ${a + b}（含运算符）', () => {
    const { migrated, count } = migrateContent("expression: '@{a + b} > 1'");
    expect(migrated).toBe("expression: '${a + b} > 1'");
    expect(count).toBe(1);
  });

  it('flux: $xxx → flux: ${xxx}（scada 简写）', () => {
    const { migrated, count } = migrateContent("flux: '$analog.temp'");
    expect(migrated).toBe("flux: '${analog.temp}'");
    expect(count).toBe(1);
  });

  it('多个改写一次完成（混合 @{} + $xxx）', () => {
    const original = `
      variables: [
        { id: 'a', flux: '$tank.level' },
        { id: 'b', source: 'expression', expression: '@{a} * 2' },
      ]
    `;
    const { migrated, count } = migrateContent(original);
    expect(count).toBe(2);
    expect(migrated).toContain("flux: '${tank.level}'");
    expect(migrated).toContain("expression: '${a} * 2'");
  });

  it('idempotent：迁移后的内容再跑无变化', () => {
    const once = migrateContent("flux: '$tank.level'");
    const twice = migrateContent(once.migrated);
    expect(twice.count).toBe(0);
    expect(twice.migrated).toBe(once.migrated);
  });

  it('保留 $Math/$JSON/$Date 平台命名空间（仅改写 $<lower|_> 简写）', () => {
    // $Math.PI 不应被改写（大写 M 开头，不被 [a-z_] 匹配）
    const { migrated, count } = migrateContent("expression: '${$Math.PI}'");
    expect(count).toBe(0);
    expect(migrated).toBe("expression: '${$Math.PI}'");
  });
});
