import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { diffScadaConfig } from './diff.js';
import { rect, baseConfig } from './serialization-fixtures.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));

beforeEach(() => {
  registerBuiltinScadaSymbols();
});

describe('diffScadaConfig', () => {
  it('should return empty diff for identical configs', () => {
    const config = baseConfig();
    const diff = diffScadaConfig(config, baseConfig());
    expect(diff).toEqual({ added: [], removed: [], updated: [] });
  });

  it('should converge symbol additions/removals/property changes', () => {
    const prev = baseConfig({ symbols: [rect('a'), rect('b'), rect('c')] });
    const next = baseConfig({
      symbols: [rect('a', { fill: '#111' }), rect('b'), rect('d')],
    });
    const diff = diffScadaConfig(prev, next);
    expect(diff.added.map((n) => n.id)).toEqual(['d']);
    expect(diff.removed).toEqual(['c']);
    expect(diff.updated).toEqual([{ id: 'a', patch: { fill: '#111' } }]);
  });

  it('should treat nested children changes as an updated patch carrying the new children', () => {
    const prev = baseConfig({ symbols: [rect('g', { type: 'scada-group', children: [rect('c1')] })] });
    const next = baseConfig({ symbols: [rect('g', { type: 'scada-group', children: [rect('c1'), rect('c2')] })] });
    const diff = diffScadaConfig(prev, next);
    expect(diff.updated).toHaveLength(1);
    expect(diff.updated[0]!.patch.children?.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('should convert a same-id type change into removed + added (no updated patch)', () => {
    const prev = baseConfig({ symbols: [rect('a'), rect('b')] });
    const next = baseConfig({
      symbols: [{ ...rect('a'), type: 'scada-ellipse', width: 30, height: 30 }, rect('b')],
    });
    const diff = diffScadaConfig(prev, next);
    expect(diff.removed).toEqual(['a']);
    expect(diff.added.map((n) => ({ id: n.id, type: n.type }))).toEqual([
      { id: 'a', type: 'scada-ellipse' },
    ]);
    expect(diff.updated).toEqual([]);
  });

  it('should emit an explicit empty children patch when a subtree becomes undefined', () => {
    const prev = baseConfig({ symbols: [rect('g', { type: 'scada-group', children: [rect('c1')] })] });
    const next = baseConfig({ symbols: [rect('g', { type: 'scada-group' })] });
    const diff = diffScadaConfig(prev, next);
    expect(diff.updated).toEqual([{ id: 'g', patch: { children: [] } }]);
  });

  it('should diff variables only when changed', () => {
    const prev = baseConfig({ variables: [{ id: 'v1', source: 'static', value: 1 }] });
    const next = baseConfig({ variables: [{ id: 'v1', source: 'static', value: 2 }, { id: 'v2', source: 'flux', flux: '${x}' }] });
    const diff = diffScadaConfig(prev, next);
    expect(diff.variables).toEqual({
      added: [{ id: 'v2', source: 'flux', flux: '${x}' }],
      removed: [],
      updated: [{ id: 'v1', patch: { value: 2 } }],
    });
    const same = diffScadaConfig(next, { ...next });
    expect(same.variables).toBeUndefined();
  });

  it('should report variable removals and null-branch diffs', () => {
    const withVars = baseConfig({ variables: [{ id: 'gone', source: 'static', value: 1 }] });
    const without = diffScadaConfig(withVars, baseConfig());
    expect(without.variables).toEqual({ added: [], removed: ['gone'], updated: [] });
    const gained = diffScadaConfig(baseConfig(), withVars);
    expect(gained.variables).toEqual({ added: [{ id: 'gone', source: 'static', value: 1 }], removed: [], updated: [] });
  });
});

// plan 2026-08-04-2243-2 W5：diffScadaConfig 深相等改 own-keys-sorted 递归比较（stable deep-equal）。
// 失败用例（修复前）：valuesEqual 用 JSON.stringify，异源 config（prev=exportConfig vs next=host 重算）
// key 序不同 → 假阳性 diff → 全 reloadBindings 重建。修复后 key 插入序不影响判等，仅真实语义变更触发更新。
describe('diffScadaConfig stable deep-equal (plan 2026-08-04-2243-2 W5)', () => {
  it('异源 key 序不同但语义相同的 nested 对象判等（不假阳性触发 updated）', () => {
    // 同一图元，shadow 对象字段顺序相反——JSON.stringify 会判不等，stable deep-equal 判等。
    const prev = baseConfig({
      symbols: [rect('a', { shadow: { x: 1, y: 2, blur: 3, color: '#000' } })],
    });
    const next = baseConfig({
      symbols: [rect('a', { shadow: { color: '#000', blur: 3, y: 2, x: 1 } })],
    });
    const diff = diffScadaConfig(prev, next);
    expect(diff.updated).toEqual([]);
  });

  it('异源 key 序不同的 custom 对象判等', () => {
    const prev = baseConfig({ symbols: [rect('a', { custom: { a: 1, b: 2, c: 3 } })] });
    const next = baseConfig({ symbols: [rect('a', { custom: { c: 3, b: 2, a: 1 } })] });
    expect(diffScadaConfig(prev, next).updated).toEqual([]);
  });

  it('真实字段变更仍检出（语义不同 → updated patch）', () => {
    const prev = baseConfig({
      symbols: [rect('a', { shadow: { x: 1, y: 2, blur: 3, color: '#000' } })],
    });
    const next = baseConfig({
      symbols: [rect('a', { shadow: { color: '#000', blur: 3, y: 2, x: 99 } })],
    });
    const diff = diffScadaConfig(prev, next);
    expect(diff.updated).toEqual([{ id: 'a', patch: { shadow: { color: '#000', blur: 3, y: 2, x: 99 } } }]);
  });

  it('键数不同（b 缺键）检出更新', () => {
    const prev = baseConfig({ symbols: [rect('a', { custom: { a: 1, b: 2 } })] });
    const next = baseConfig({ symbols: [rect('a', { custom: { a: 1 } })] });
    expect(diffScadaConfig(prev, next).updated).toEqual([{ id: 'a', patch: { custom: { a: 1 } } }]);
  });

  it('数组按 index 比较（顺序敏感，数组重排检出更新）', () => {
    const prev = baseConfig({ symbols: [rect('a', { strokeDash: [6, 2] })] });
    const next = baseConfig({ symbols: [rect('a', { strokeDash: [2, 6] })] });
    expect(diffScadaConfig(prev, next).updated).toEqual([{ id: 'a', patch: { strokeDash: [2, 6] } }]);
  });

  it('相同数组（同序）判等', () => {
    const prev = baseConfig({ symbols: [rect('a', { strokeDash: [6, 2] })] });
    const next = baseConfig({ symbols: [rect('a', { strokeDash: [6, 2] })] });
    expect(diffScadaConfig(prev, next).updated).toEqual([]);
  });

  it('异源 key 序不同的变量 scale 对象判等（不假阳性触发 variables.updated）', () => {
    const prev = baseConfig({
      variables: [{ id: 'v', source: 'static', value: 1, scale: { k: 2, b: 1 } }],
    });
    const next = baseConfig({
      variables: [{ id: 'v', source: 'static', value: 1, scale: { b: 1, k: 2 } }],
    });
    expect(diffScadaConfig(prev, next).variables).toBeUndefined();
  });
});

// plan 2026-08-05-0653-2 Phase 2（open P1-1）：diffScadaConfig 不再丢弃 flow 字段。
// 失败用例（修复前）：`SYMBOL_KEYS` 字面量数组不含 `'flow'`，仅 `flow.enabled` / `flow.dash` 变更时
// diff 路径产出空 patch（机械遗漏）→ host 同版本 config prop 改 flow 时 pipe-junction applyProps
// 收不到新 flow，管道流动动画冻结在旧值（Failure Paths `flow-toggle-ignored`）。
describe('diffScadaConfig flow field (plan 2026-08-05-0653-2 Phase 2 open P1-1)', () => {
  it('检出仅 flow.enabled 变更（true→false）并产出 updated[].patch.flow', () => {
    const prev = baseConfig({
      symbols: [rect('p', { type: 'scada-pipe-junction', flow: { enabled: true, speed: 1 } })],
    });
    const next = baseConfig({
      symbols: [rect('p', { type: 'scada-pipe-junction', flow: { enabled: false, speed: 1 } })],
    });
    const diff = diffScadaConfig(prev, next);
    expect(diff.updated).toHaveLength(1);
    expect(diff.updated[0]).toEqual({
      id: 'p',
      patch: { flow: { enabled: false, speed: 1 } },
    });
  });

  it('检出 flow.speed / flow.dash 子字段变更', () => {
    const prev = baseConfig({
      symbols: [
        rect('p', { type: 'scada-pipe-junction', flow: { enabled: true, speed: 1, dash: [4, 2] } }),
      ],
    });
    const next = baseConfig({
      symbols: [
        rect('p', { type: 'scada-pipe-junction', flow: { enabled: true, speed: 5, dash: [10, 6] } }),
      ],
    });
    const diff = diffScadaConfig(prev, next);
    expect(diff.updated).toEqual([
      { id: 'p', patch: { flow: { enabled: true, speed: 5, dash: [10, 6] } } },
    ]);
  });

  it('flow 子字段同值判等（不假阳性触发 updated）', () => {
    const flow = { enabled: true, speed: 2, dash: [8, 4] };
    const prev = baseConfig({
      symbols: [rect('p', { type: 'scada-pipe-junction', flow })],
    });
    const next = baseConfig({
      symbols: [rect('p', { type: 'scada-pipe-junction', flow: { ...flow } })],
    });
    expect(diffScadaConfig(prev, next).updated).toEqual([]);
  });

  it('flow 由 undefined → 定义检出新增', () => {
    const prev = baseConfig({
      symbols: [rect('p', { type: 'scada-pipe-junction' })],
    });
    const next = baseConfig({
      symbols: [rect('p', { type: 'scada-pipe-junction', flow: { enabled: true, speed: 1 } })],
    });
    expect(diffScadaConfig(prev, next).updated).toEqual([
      { id: 'p', patch: { flow: { enabled: true, speed: 1 } } },
    ]);
  });

  it('flow 由定义 → undefined 检出移除', () => {
    const prev = baseConfig({
      symbols: [rect('p', { type: 'scada-pipe-junction', flow: { enabled: true, speed: 1 } })],
    });
    const next = baseConfig({
      symbols: [rect('p', { type: 'scada-pipe-junction' })],
    });
    // 注意：`flow` 移除时 patch.flow = undefined，applyUpdate 经 `!== undefined` 守卫会跳过——
    // 这是 applyDiff 层语义（移除需经符号级 reload），diff 层职责仅为产出标记。本测试断言 diff 层标记存在。
    const diff = diffScadaConfig(prev, next);
    expect(diff.updated).toHaveLength(1);
    expect(diff.updated[0]!.id).toBe('p');
  });
});
