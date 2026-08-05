import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { validateScadaConfig } from './validate.js';
import { parseScadaConfig } from './parse.js';
import { serializeScadaConfig } from './serialize.js';
import { diffScadaConfig } from './diff.js';
import type { ScadaConfig, ScadaSymbolNode, ScadaStateDeclaration, ScadaAnimation, ScadaSymbolEvent } from './config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));

const rect = (id: string, overrides: Partial<ScadaSymbolNode> = {}): ScadaSymbolNode => ({
  id,
  type: 'scada-rect',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  ...overrides,
});

const baseConfig = (overrides: Partial<ScadaConfig> = {}): ScadaConfig => ({
  version: 1,
  symbols: [rect('a'), rect('b', { x: 10, y: 20 })],
  ...overrides,
});

beforeEach(() => {
  registerBuiltinScadaSymbols();
});

describe('validateScadaConfig', () => {
  it('should accept a valid config', () => {
    expect(validateScadaConfig(baseConfig())).toEqual({ ok: true });
  });

  it('should reject non-object input', () => {
    expect(validateScadaConfig(null).ok).toBe(false);
    expect(validateScadaConfig('nope').ok).toBe(false);
    expect(validateScadaConfig([]).ok).toBe(false);
  });

  it('should reject a non-1 version', () => {
    const result = validateScadaConfig({ ...baseConfig(), version: 2 });
    expect(result).toEqual({
      ok: false,
      errors: expect.arrayContaining(['config.version must be 1']),
    });
  });

  it('should reject missing symbols array', () => {
    const result = validateScadaConfig({ version: 1 });
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors).toContain('config.symbols must be an array');
  });

  it('should reject duplicate symbol ids across nested children', () => {
    const config = baseConfig({
      symbols: [rect('dup', { children: [rect('child'), rect('dup')] })],
    });
    const result = validateScadaConfig(config);
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('duplicate symbol id: dup'))).toBe(true);
  });

  it('should recurse into children with structural checks', () => {
    const config = baseConfig({
      symbols: [rect('g', { type: 'scada-group', children: [rect('c1'), { ...rect('c2'), x: 'bad' as unknown as number }] })],
    });
    const result = validateScadaConfig(config);
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('symbols[0].children[1].x'))).toBe(true);
  });

  it('should reject unknown symbol types but accept scada-group as structural container', () => {
    const unknown = validateScadaConfig(baseConfig({ symbols: [rect('x', { type: 'scada-nope' })] }));
    expect(unknown.ok).toBe(false);
    expect((unknown as { errors: string[] }).errors).toContain('unknown symbol type: scada-nope');
    const group = validateScadaConfig(baseConfig({ symbols: [rect('g', { type: 'scada-group' })] }));
    expect(group.ok).toBe(true);
  });

  it('should reject duplicate point ids and invalid source fields', () => {
    const config = baseConfig({
      variables: [
        { id: 'p1', source: 'static', value: 1 },
        { id: 'p1', source: 'static', value: 2 },
      ],
    });
    const result = validateScadaConfig(config);
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('duplicate point declaration id: p1'))).toBe(
      true,
    );
  });

  it('should validate per-source point declaration requirements', () => {
    const missingStaticValue = validateScadaConfig(baseConfig({ variables: [{ id: 'p1', source: 'static' }] }));
    expect(missingStaticValue.ok).toBe(false);
    const missingExpression = validateScadaConfig(
      baseConfig({ variables: [{ id: 'p2', source: 'expression', expression: '' }] }),
    );
    expect(missingExpression.ok).toBe(false);
    const missingFlux = validateScadaConfig(baseConfig({ variables: [{ id: 'p3', source: 'flux' }] }));
    expect(missingFlux.ok).toBe(false);
    const badSource = validateScadaConfig(baseConfig({ variables: [{ id: 'p4', source: 'websocket' as never }] }));
    expect(badSource.ok).toBe(false);
    const badPointShape = validateScadaConfig(baseConfig({ variables: ['x' as never] }));
    expect(badPointShape.ok).toBe(false);
    const badScale = validateScadaConfig(baseConfig({ variables: [{ id: 'p5', source: 'static', value: 1, scale: 'x' as never }] }));
    expect(badScale.ok).toBe(false);
    const badDeadband = validateScadaConfig(baseConfig({ variables: [{ id: 'p6', source: 'static', value: 1, deadband: 'x' as never }] }));
    expect(badDeadband.ok).toBe(false);
    const badUnit = validateScadaConfig(baseConfig({ variables: [{ id: 'p7', source: 'static', value: 1, unit: 3 as never }] }));
    expect(badUnit.ok).toBe(false);
    const badFormat = validateScadaConfig(baseConfig({ variables: [{ id: 'p8', source: 'static', value: 1, format: 3 as never }] }));
    expect(badFormat.ok).toBe(false);
    const ok = validateScadaConfig(
      baseConfig({
        variables: [
          { id: 's1', source: 'static', value: true },
          { id: 'e1', source: 'expression', expression: '@{s1} > 1' },
          { id: 'f1', source: 'flux', flux: '$tank.level', deadband: 0.5 },
        ],
      }),
    );
    expect(ok).toEqual({ ok: true });
  });

  it('should reject declaration-level scale.expression and point to binding-scale (plan 2026-08-05-0653-3 B4)', () => {
    const rejected = validateScadaConfig(
      baseConfig({
        variables: [{ id: 'es', source: 'static', value: 1, scale: { expression: '@{x} * 2' } }],
      }),
    );
    expect(rejected.ok).toBe(false);
    expect((rejected as { errors: string[] }).errors.join('; ')).toContain(
      'scale.expression is not supported at declaration level',
    );
    // linear declaration scale still accepted
    const okLinear = validateScadaConfig(
      baseConfig({ variables: [{ id: 'ls', source: 'static', value: 1, scale: { k: 2, b: 1 } }] }),
    );
    expect(okLinear).toEqual({ ok: true });
    // binding-level expression scale still accepted (applyScale consumes it)
    const okBindingExpr = validateScadaConfig(
      baseConfig({
        symbols: [rect('be', { bindings: { fill: { point: 'p1', scale: { expression: '@{x}' } } } })],
      }),
    );
    expect(okBindingExpr).toEqual({ ok: true });
  });

  it('should validate optional numeric/string fields', () => {
    const badOpacity = validateScadaConfig(baseConfig({ symbols: [rect('o', { opacity: 'high' as unknown as number })] }));
    expect(badOpacity.ok).toBe(false);
    const badViewport = validateScadaConfig({ ...baseConfig(), viewport: { x: 'a' as unknown as number } });
    expect(badViewport.ok).toBe(false);
    const badVariablesShape = validateScadaConfig({ ...baseConfig(), variables: 'nope' as never });
    expect(badVariablesShape.ok).toBe(false);
  });

  it('should validate string fields and background/viewport shapes', () => {
    const badFill = validateScadaConfig(baseConfig({ symbols: [rect('s', { fill: 42 as unknown as string })] }));
    expect((badFill as { errors: string[] }).errors).toContain('symbols[0].fill must be a string');
    const badVisible = validateScadaConfig(baseConfig({ symbols: [rect('v', { visible: 1 as unknown as boolean })] }));
    expect(badVisible.ok).toBe(false);
    const badCustom = validateScadaConfig(baseConfig({ symbols: [rect('c', { custom: 'x' as unknown as Record<string, unknown> })] }));
    expect(badCustom.ok).toBe(false);
    const badBackground = validateScadaConfig({ ...baseConfig(), background: 'nope' as never });
    expect(badBackground.ok).toBe(false);
    const badViewportShape = validateScadaConfig({ ...baseConfig(), viewport: 'nope' as never });
    expect(badViewportShape.ok).toBe(false);
    const badViewportField = validateScadaConfig({ ...baseConfig(), viewport: { x: 1, y: 2, scale: 'big' as unknown as number } });
    expect(badViewportField.ok).toBe(false);
    const badStates = validateScadaConfig(baseConfig({ symbols: [rect('st', { states: 5 as unknown as ScadaStateDeclaration })] }));
    expect(badStates.ok).toBe(false);
    const badAnimations = validateScadaConfig(baseConfig({ symbols: [rect('an', { animations: {} as unknown as ScadaAnimation[] })] }));
    expect(badAnimations.ok).toBe(false);
    const badEvents = validateScadaConfig(baseConfig({ symbols: [rect('ev', { events: {} as unknown as ScadaSymbolEvent[] })] }));
    expect(badEvents.ok).toBe(false);
    const badBindings = validateScadaConfig(baseConfig({ symbols: [rect('bi', { bindings: [] as unknown as Record<string, never> })] }));
    expect(badBindings.ok).toBe(false);
    const badSymbolShape = validateScadaConfig(baseConfig({ symbols: ['x' as never] }));
    expect(badSymbolShape.ok).toBe(false);
  });

  it('should validate bindings internal structure (m-4 回归：绑定字段语义)', () => {
    const badBindingShape = validateScadaConfig(
      baseConfig({ symbols: [rect('b1', { bindings: { fill: {} as never } })] }),
    );
    expect(badBindingShape.ok).toBe(false);
    expect((badBindingShape as { errors: string[] }).errors).toContain(
      'symbols[0].bindings.fill must contain at least one of: point | expression | map | scale | format',
    );
    const badMap = validateScadaConfig(
      baseConfig({ symbols: [rect('b2', { bindings: { fill: { point: 'p1', map: 'x' as never } } })] }),
    );
    expect(badMap.ok).toBe(false);
    const badScale = validateScadaConfig(
      baseConfig({ symbols: [rect('b2b', { bindings: { fill: { point: 'p1', scale: 'x' as never } } })] }),
    );
    expect(badScale.ok).toBe(false);
    const badFormat = validateScadaConfig(
      baseConfig({ symbols: [rect('b2c', { bindings: { fill: { point: 'p1', format: 3 as never } } })] }),
    );
    expect(badFormat.ok).toBe(false);
    const badPoint = validateScadaConfig(
      baseConfig({ symbols: [rect('b2d', { bindings: { fill: { point: '' } } })] }),
    );
    expect(badPoint.ok).toBe(false);
    const badExpr = validateScadaConfig(
      baseConfig({ symbols: [rect('b2e', { bindings: { fill: { expression: '' } } })] }),
    );
    expect(badExpr.ok).toBe(false);
    const ok = validateScadaConfig(
      baseConfig({
        symbols: [rect('b3', { bindings: { fill: { point: 'p1', format: '#f00' }, text: { expression: '@{p1} > 1' } } })],
      }),
    );
    expect(ok).toEqual({ ok: true });
  });

  it('should validate animations internal structure (m-4 回归：动画字段语义)', () => {
    const badKind = validateScadaConfig(
      baseConfig({ symbols: [rect('a1', { animations: [{ kind: 'spin' as never }] })] }),
    );
    expect(badKind.ok).toBe(false);
    expect((badKind as { errors: string[] }).errors.some((e) => e.includes('kind must be one of'))).toBe(true);
    const badWhen = validateScadaConfig(
      baseConfig({ symbols: [rect('a2', { animations: [{ kind: 'rotate', when: 'sometimes' as never }] })] }),
    );
    expect(badWhen.ok).toBe(false);
    const badPeriod = validateScadaConfig(
      baseConfig({ symbols: [rect('a2b', { animations: [{ kind: 'rotate', period: 'x' as never }] })] }),
    );
    expect(badPeriod.ok).toBe(false);
    const badFrom = validateScadaConfig(
      baseConfig({ symbols: [rect('a2c', { animations: [{ kind: 'flow', from: 'x' as never }] })] }),
    );
    expect(badFrom.ok).toBe(false);
    const ok = validateScadaConfig(
      baseConfig({
        symbols: [
          rect('a3', {
            animations: [
              { kind: 'rotate', period: 1000, when: { state: 'run' }, loop: -1 },
              { kind: 'flow', from: 0, to: 100 },
            ],
          }),
        ],
      }),
    );
    expect(ok).toEqual({ ok: true });
  });

  it('should validate states internal structure (m-4 回归：状态字段语义)', () => {
    const badStatesValue = validateScadaConfig(
      baseConfig({
        symbols: [rect('s1', { states: { states: { run: 'x' as never } } as never })],
      }),
    );
    expect(badStatesValue.ok).toBe(false);
    const badRange = validateScadaConfig(
      baseConfig({ symbols: [rect('s2', { states: { states: { run: {} }, ranges: [{ min: 'a' as never, state: 'run' }] } })] }),
    );
    expect(badRange.ok).toBe(false);
    const badRangeEntry = validateScadaConfig(
      baseConfig({ symbols: [rect('s2b', { states: { states: { run: {} }, ranges: ['x' as never] } })] }),
    );
    expect(badRangeEntry.ok).toBe(false);
    const badRangeState = validateScadaConfig(
      baseConfig({ symbols: [rect('s2c', { states: { states: { run: {} }, ranges: [{ max: 10, state: 5 as never }] } })] }),
    );
    expect(badRangeState.ok).toBe(false);
    const badBooleanMapShape = validateScadaConfig(
      baseConfig({ symbols: [rect('s2d', { states: { states: { run: {} }, booleanMap: 'x' as never } })] }),
    );
    expect(badBooleanMapShape.ok).toBe(false);
    const badValueMap = validateScadaConfig(
      baseConfig({ symbols: [rect('s2e', { states: { states: { run: {} }, valueMap: 'x' as never } })] }),
    );
    expect(badValueMap.ok).toBe(false);
    const badStatesShape = validateScadaConfig(
      baseConfig({ symbols: [rect('s2f', { states: { states: 'x' as never } as never })] }),
    );
    expect(badStatesShape.ok).toBe(false);
    const badBooleanMap = validateScadaConfig(
      baseConfig({ symbols: [rect('s3', { states: { states: { run: {} }, booleanMap: { true: 'run' } as never } })] }),
    );
    expect(badBooleanMap.ok).toBe(false);
    const ok = validateScadaConfig(
      baseConfig({
        symbols: [
          rect('s4', {
            states: {
              states: { run: { style: { fill: '#00ff00' } }, stop: {} },
              ranges: [{ min: 0, max: 100, state: 'run' }],
              booleanMap: { true: 'run', false: 'stop' },
              valueMap: { 1: 'run' },
            },
          }),
        ],
      }),
    );
    expect(ok).toEqual({ ok: true });
  });

  it('should validate states.stateSource shape (plan 2026-08-05-0653-3 B3)', () => {
    const badStateSource = validateScadaConfig(
      baseConfig({ symbols: [rect('ss1', { states: { states: { run: {} }, stateSource: '' } })] }),
    );
    expect(badStateSource.ok).toBe(false);
    expect((badStateSource as { errors: string[] }).errors.join('; ')).toContain('.stateSource must be a non-empty string');
    const badStateSourceType = validateScadaConfig(
      baseConfig({ symbols: [rect('ss2', { states: { states: { run: {} }, stateSource: 5 as never } })] }),
    );
    expect(badStateSourceType.ok).toBe(false);
    const okStateSource = validateScadaConfig(
      baseConfig({ symbols: [rect('ss3', { states: { states: { run: {} }, stateSource: 'drv.fill' } })] }),
    );
    expect(okStateSource).toEqual({ ok: true });
  });

  it('should validate events declaration shape (I11.1：on 枚举 + action 形状)', () => {
    const badOn = validateScadaConfig(
      baseConfig({ symbols: [rect('e1', { events: [{ on: 'drag' as never, action: { action: 'noop' } }] })] }),
    );
    expect(badOn.ok).toBe(false);
    expect((badOn as { errors: string[] }).errors.join('; ')).toContain('.on must be one of');

    const badAction = validateScadaConfig(
      baseConfig({ symbols: [rect('e2', { events: [{ on: 'click', action: 'noop' }] })] }),
    );
    expect(badAction.ok).toBe(false);
    expect((badAction as { errors: string[] }).errors.join('; ')).toContain('.action must be an object');

    const missingActionField = validateScadaConfig(
      baseConfig({ symbols: [rect('e3', { events: [{ on: 'click', action: {} }] })] }),
    );
    expect(missingActionField.ok).toBe(false);
    expect((missingActionField as { errors: string[] }).errors.join('; ')).toContain('action string');

    const nonObjectEvent = validateScadaConfig(
      baseConfig({ symbols: [rect('e4', { events: ['nope' as never] })] }),
    );
    expect(nonObjectEvent.ok).toBe(false);

    const ok = validateScadaConfig(
      baseConfig({
        symbols: [
          rect('e5', {
            events: [
              { on: 'click', action: { action: 'openDialog', args: { dialogId: 'd' } } },
              { on: 'dblclick', action: { action: 'navigate', args: { url: '#/x' } } },
              { on: 'hover', action: { action: 'showToast' } },
            ],
          }),
        ],
      }),
    );
    expect(ok).toEqual({ ok: true });
  });
});

describe('parseScadaConfig', () => {
  it('should parse a JSON string', () => {
    const config = parseScadaConfig(JSON.stringify(baseConfig()));
    expect(config.version).toBe(1);
    expect(config.symbols).toHaveLength(2);
  });

  it('should throw an error signal for invalid JSON strings', () => {
    expect(() => parseScadaConfig('{not json')).toThrow(/invalid scada config JSON/);
  });

  it('should pass through non-object JSON values unchanged', () => {
    expect(parseScadaConfig('null')).toBeNull();
    expect(parseScadaConfig('[1, 2]')).toEqual([1, 2]);
  });

  it('should shallow-copy object input to defend against external mutation', () => {
    const source = baseConfig();
    const parsed = parseScadaConfig(source);
    expect(parsed).not.toBe(source);
    expect(parsed.symbols).not.toBe(source.symbols);
    parsed.symbols.push(rect('extra'));
    expect(source.symbols).toHaveLength(2);
  });
});

describe('serializeScadaConfig', () => {
  it('should serialize with a fixed version of 1 (instance override sets, I8.3)', () => {
    const config = baseConfig();
    const text = serializeScadaConfig(config);
    const parsed = JSON.parse(text) as ScadaConfig;
    expect(parsed.version).toBe(1);
    // 实例覆盖集最小化：与 defaults 相等的字段裁剪，仅保留覆盖集
    expect(parsed.symbols[0]).toEqual({ id: 'a', type: 'scada-rect' });
    expect(parsed.symbols[1]).toEqual({ id: 'b', type: 'scada-rect', x: 10, y: 20 });
  });

  it('should output instance override sets diffed from defaults (I8.3 minimal coverage set)', () => {
    const config = baseConfig({
      symbols: [rect('a'), rect('b', { x: 10, y: 20, width: 99 })],
    });
    const parsed = JSON.parse(serializeScadaConfig(config)) as ScadaConfig;
    // 与 defaults 相等的字段（x/y/width/height）被裁剪，只保留覆盖集
    expect(parsed.symbols[0]).toEqual({ id: 'a', type: 'scada-rect' });
    expect(parsed.symbols[1]).toEqual({ id: 'b', type: 'scada-rect', x: 10, y: 20, width: 99 });
  });

  it('should round-trip through parse (group children keep override sets)', () => {
    const config = baseConfig({
      symbols: [
        rect('g', {
          type: 'scada-group',
          children: [rect('c', { fill: '#fff', width: 55 })],
        }),
      ],
      variables: [{ id: 'v1', source: 'static', value: 42 }],
    });
    const parsed = parseScadaConfig(serializeScadaConfig(config));
    expect(parsed.symbols[0]).toEqual({
      id: 'g',
      type: 'scada-group',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      children: [{ id: 'c', type: 'scada-rect', width: 55, fill: '#fff' }],
    });
    expect(parsed.variables).toEqual([{ id: 'v1', source: 'static', value: 42 }]);
  });

  it('pruneInstanceNode returns node as-is for unregistered types without defaults/children', () => {
    // 未注册 type 或无 defaults 的节点：children 不存在时直接返回 node（不走 diff 路径，
    // serialize.ts:21 false 分支）。验证 serialize 不破坏未注册图元原貌。
    const config: ScadaConfig = {
      version: 1,
      variables: [],
      symbols: [{ id: 'x', type: 'scada-totally-unregistered', x: 5 } as unknown as ScadaConfig['symbols'][number]],
    };
    const parsed = JSON.parse(serializeScadaConfig(config)) as ScadaConfig;
    expect(parsed.symbols[0]).toEqual({ id: 'x', type: 'scada-totally-unregistered', x: 5 });
  });
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
    const next = baseConfig({ variables: [{ id: 'v1', source: 'static', value: 2 }, { id: 'v2', source: 'flux', flux: '$x' }] });
    const diff = diffScadaConfig(prev, next);
    expect(diff.variables).toEqual({
      added: [{ id: 'v2', source: 'flux', flux: '$x' }],
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

// plan 2026-08-04-1558-3 Phase 3 覆盖缺口闭合：validate.ts 错误分支逐分支补断言。
describe('validateScadaConfig error branch matrix (plan 2026-08-04-1558-3 Phase 3)', () => {
  const expectErrors = (config: ScadaConfig, ...fragments: string[]): void => {
    const result = validateScadaConfig(config);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      for (const frag of fragments) {
        expect(result.errors.some((e) => e.includes(frag)), `expected error fragment "${frag}"`).toBe(true);
      }
    }
  };

  it('rejects non-object binding value (validateBinding must-be-an-object)', () => {
    expectErrors(baseConfig({ symbols: [rect('b', { bindings: { fill: 'nope' as never } })] }), 'bindings.fill must be an object');
  });

  it('rejects non-object animation entry (validateAnimation must-be-an-object)', () => {
    expectErrors(baseConfig({ symbols: [rect('a', { animations: ['nope' as never] })] }), 'animations[0] must be an object');
  });

  it('rejects non-array states.ranges (ranges must-be-an-array)', () => {
    expectErrors(
      baseConfig({ symbols: [rect('s', { states: { states: { run: {} }, ranges: 'nope' as never } })] }),
      '.ranges must be an array',
    );
  });

  it('rejects symbol missing/empty id and type (id/type must-be-a-non-empty-string)', () => {
    expectErrors(baseConfig({ symbols: [{ type: 'scada-rect', x: 0, y: 0 } as never] }), 'symbols[0].id must be a non-empty string');
    expectErrors(baseConfig({ symbols: [{ id: 'x', type: '  ', x: 0, y: 0 } as never] }), 'symbols[0].type must be a non-empty string');
  });

  it('rejects malformed strokeDash (must-be-an-array-of-numbers + some 非数字)', () => {
    expectErrors(baseConfig({ symbols: [rect('d', { strokeDash: 'nope' as never })] }), '.strokeDash must be an array of numbers');
    expectErrors(baseConfig({ symbols: [rect('d2', { strokeDash: [1, 'x' as never] })] }), '.strokeDash must be an array of numbers');
  });

  it('rejects malformed fillStyle (must-be-an-object-or-a-string)', () => {
    expectErrors(baseConfig({ symbols: [rect('f', { fillStyle: 42 as never })] }), '.fillStyle must be an object or a string');
  });

  it('rejects malformed shadow (must-be-an-object)', () => {
    expectErrors(baseConfig({ symbols: [rect('sh', { shadow: 'nope' as never })] }), '.shadow must be an object');
  });

  it('rejects malformed flow.dash (must-be-an-array-of-numbers)', () => {
    expectErrors(
      baseConfig({ symbols: [rect('fd', { flow: { enabled: true, speed: 1, dash: 'nope' as never } })] }),
      '.flow.dash must be an array of numbers',
    );
    expectErrors(
      baseConfig({ symbols: [rect('fd2', { flow: { enabled: true, speed: 1, dash: [1, 'x' as never] } })] }),
      '.flow.dash must be an array of numbers',
    );
  });

  it('rejects malformed children (must-be-an-array)', () => {
    expectErrors(baseConfig({ symbols: [rect('g', { type: 'scada-group', children: 'nope' as never })] }), '.children must be an array');
  });

  it('rejects point declaration missing/empty id (id must-be-a-non-empty-string)', () => {
    expectErrors(baseConfig({ variables: [{ source: 'static', value: 1 } as never] }), 'variables[0].id must be a non-empty string');
    expectErrors(baseConfig({ variables: [{ id: '  ', source: 'static', value: 1 }] }), 'variables[0].id must be a non-empty string');
  });
});
