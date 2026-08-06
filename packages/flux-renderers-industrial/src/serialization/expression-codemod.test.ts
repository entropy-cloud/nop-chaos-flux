import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
 * codemod 权威实现位于 `scripts/scada-expression-codemod.mjs`（workspace 根）。该脚本 top-level
 * 调用 `main(process.argv)`（含 node:fs 副作用 + process.exit），无法在测试环境直接 import——
 * import 即触发副作用退出。采用 plan 2026-08-06-0746-2 P2-12 fallback：保留内联 `migrateContent`
 * 等价逻辑（regex source 与生产逐字对齐），并加守护测试断言「内联 patterns 与生产源码同步」——
 * 生产增/删/改 pattern 或其 regex 时守护测试转红，消除 false-green（divergent 副本静默放行）。
 */

// === codemod 等价逻辑（与 scripts/scada-expression-codemod.mjs 的 patterns 同源；守护测试保证同步） ===
// 注：内联 char class 用未转义 `-`（ESLint no-useless-escape clean），生产用 `\-`——二者等价
// （char class 末位 `-` 为字面量），守护测试比对前规范化 `\-`→`-` 以消除这层 cosmetic 差异。
const AT_SYNTAX_PATTERN = /@\{([^{}]*?)\}/g;
const DOLLAR_SHORTHAND_PATTERN = /(?<=flux:\s*'|expression:\s*')\$([a-z_][a-zA-Z0-9_.-]*)(?=['"])/g;
// QUOTED_DOLLAR_PATTERN：生产 scada-expression-codemod.mjs:31 定义但 migrateContent 当前未启用
// （生产注释「跳过：暂不处理数组形式」）。此处保留定义以与生产 pattern 集合对齐（parity），
// 供守护测试断言同步；生产启用该 pattern 时守护测试 + QUOTED_DOLLAR 覆盖用例转红。
const QUOTED_DOLLAR_PATTERN = /['"]\$([a-z_][a-zA-Z0-9_.-]*)['"]/g;

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

// 生产 codemod 源码快照（守护测试用，断言内联 patterns 与权威实现同步）。
// 生产脚本含 top-level main() 副作用无法 import，改读源码文本做 divergence 守卫。
const PROD_CODEMOD_PATH = join(import.meta.dirname, '../../../../scripts/scada-expression-codemod.mjs');
const PROD_CODEMOD_SOURCE = readFileSync(PROD_CODEMOD_PATH, 'utf8');
// 生产 migrateContent 函数体：提取其实际使用的 pattern 集合（.replace(NAME_PATTERN）。
const PROD_MIGRATE_BLOCK = PROD_CODEMOD_SOURCE.slice(
  PROD_CODEMOD_SOURCE.indexOf('function migrateContent'),
  PROD_CODEMOD_SOURCE.indexOf('function migrateFile'),
);
const PROD_USED_PATTERNS = new Set(
  [...PROD_MIGRATE_BLOCK.matchAll(/\.replace\((\w+_PATTERN)/g)].map((m) => m[1]),
);
// 生产各 pattern 的 regex source（逐字提取，供精确比对；regex 改一个字符即转红）。
// 生产 pattern source 不含 `/`，故 `/const (\w+_PATTERN)\s*=\s*\/(.+?)\/[a-z]*;/g` 可精确捕获。
// 规范化 `\-`→`-`：生产 char class 用转义 `\-`，内联用未转义 `-`（lint clean），二者等价；
// 比对前统一以消除 cosmetic 差异，使守卫只对 **行为相关** 的 regex 变化转红。
const normalizeRegexSource = (src: string): string => src.replace(/\\-/g, '-');
const PROD_PATTERN_SOURCES = new Map(
  [...PROD_CODEMOD_SOURCE.matchAll(/const (\w+_PATTERN)\s*=\s*\/(.+?)\/[a-z]*;/g)].map(
    (m) => [m[1], normalizeRegexSource(m[2])] as const,
  ),
);

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

  it('QUOTED_DOLLAR_PATTERN 定义但生产当前跳过（独立引号 $xxx 不改写，count=0）', () => {
    // 生产 scada-expression-codemod.mjs:31 定义 QUOTED_DOLLAR_PATTERN 但 migrateContent 未启用。
    // 独立引号 '$xxx'（无 flux:/expression: 前缀，DOLLAR_SHORTHAND 的 lookbehind 不匹配）
    // 当前不被改写——刻画生产行为；生产启用该 pattern 后本测试转红（提示补 positive 覆盖）。
    const { migrated, count } = migrateContent("'$analog.temp'");
    expect(count).toBe(0);
    expect(migrated).toBe("'$analog.temp'");
  });

  it('内联 patterns 与生产 scada-expression-codemod.mjs 同步（生产改 patterns 时转红）', () => {
    // 守护契约（plan 2026-08-06-0746-2 P2-12 fallback）：生产 codemod 是权威，本测试内联副本
    // 须与之同步。生产增/删/改 pattern 或其 regex source → 本测试转红，提示同步内联副本，
    // 消除「测试验 divergent 副本，生产行为退化时静默放行」的 false-green。
    // (1) 内联每个 pattern 的 regex source 须与生产逐字相等（改一个字符即转红）。
    expect(PROD_PATTERN_SOURCES.get('AT_SYNTAX_PATTERN')).toBe(AT_SYNTAX_PATTERN.source);
    expect(PROD_PATTERN_SOURCES.get('DOLLAR_SHORTHAND_PATTERN')).toBe(DOLLAR_SHORTHAND_PATTERN.source);
    expect(PROD_PATTERN_SOURCES.get('QUOTED_DOLLAR_PATTERN')).toBe(QUOTED_DOLLAR_PATTERN.source);
    // (2) 生产 migrateContent 实际使用的 pattern 集合 = 内联 migrateContent 使用的集合
    //     （若生产启用 QUOTED_DOLLAR_PATTERN 或新增 pattern，此处转红 → 提示补覆盖）。
    expect(PROD_USED_PATTERNS).toEqual(new Set(['AT_SYNTAX_PATTERN', 'DOLLAR_SHORTHAND_PATTERN']));
  });
});
