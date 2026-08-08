import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { validateScadaConfig } from './validate.js';
import { rect, baseConfig } from './serialization-fixtures.js';
import type { ScadaConfig, ScadaStateDeclaration, ScadaAnimation, ScadaSymbolEvent } from './config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));

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
          { id: 'e1', source: 'expression', expression: '${s1 > 1}' },
          { id: 'f1', source: 'flux', flux: '${tank.level}', deadband: 0.5 },
        ],
      }),
    );
    expect(ok).toEqual({ ok: true });
  });

  it('should reject declaration-level scale.expression and point to binding-scale (plan 2026-08-05-0653-3 B4)', () => {
    const rejected = validateScadaConfig(
      baseConfig({
        variables: [{ id: 'es', source: 'static', value: 1, scale: { expression: '${x * 2}' } }],
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
        symbols: [rect('be', { bindings: { fill: { point: 'p1', scale: { expression: '${x}' } } } })],
      }),
    );
    expect(okBindingExpr).toEqual({ ok: true });
  });

  // plan 2026-08-09-0121-2 Workstream A F10：binding.scale 升级为与 declaration scale 同形 finite k/b 校验。
  it('F10: rejects binding.scale with NaN/Infinity/missing k,b (mirrors declaration scale finite check)', () => {
    const expectBad = (scale: unknown, contained: string) => {
      const r = validateScadaConfig(
        baseConfig({
          symbols: [rect('bk', { bindings: { fill: { point: 'p1', scale: scale as never } } })],
        }),
      );
      expect(r.ok).toBe(false);
      expect((r as { errors: string[] }).errors.join('; ')).toContain(contained);
    };
    expectBad({ k: NaN, b: 1 }, 'scale.k must be a finite number');
    expectBad({ k: 1, b: Infinity }, 'scale.b must be a finite number');
    expectBad({ k: 'x' as never }, 'scale.k must be a finite number');
    // binding-level scale.expression 必须是非空字符串（与 declaration 拒 expression 区分）
    expectBad({ expression: '' }, 'scale.expression must be a non-empty string');
    expectBad({ expression: 5 as never }, 'scale.expression must be a non-empty string');
    // 合法 linear / expression scale 仍接受
    const okLinear = validateScadaConfig(
      baseConfig({ symbols: [rect('ok1', { bindings: { fill: { point: 'p1', scale: { k: 2, b: 1 } } } })] }),
    );
    expect(okLinear).toEqual({ ok: true });
    const okExpr = validateScadaConfig(
      baseConfig({ symbols: [rect('ok2', { bindings: { fill: { point: 'p1', scale: { expression: '${x * 2}' } } } })] }),
    );
    expect(okExpr).toEqual({ ok: true });
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
        symbols: [rect('b3', { bindings: { fill: { point: 'p1', format: '#f00' }, text: { expression: '${p1 > 1}' } } })],
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

  // plan 2026-08-05-0653-4 Proof-C1（failing-first）：scada-rect（叶子 type）误带 children 时
  // validator 必须拒绝——任何带 children 的非 scada-group 节点都会被 ConfigAdapter.buildNode 静默
  // 降级为 Group（丢 fill/stroke/width/height）。修复前：validator 仅检查 children 是否为数组，
  // 不约束 type，故该 config 通过校验进入 build 后被静默降级（leaf attrs 丢）。修复后：validator
  // fail-fast 拒绝，错误消息可观测，author 可见。
  it('rejects children on non-scada-group leaf types (C1: validator fail-fast, no silent Group downgrade)', () => {
    const result = validateScadaConfig(
      baseConfig({
        symbols: [
          rect('leaf-with-children', {
            width: 100,
            height: 50,
            fill: '#ff0000',
            stroke: '#333',
            children: [rect('c1')],
          }),
        ],
      }),
    );
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => /children.*scada-group/.test(e))).toBe(true);
  });

  it('still accepts children on scada-group (C1: only leaf-with-children rejected)', () => {
    const result = validateScadaConfig(
      baseConfig({
        symbols: [rect('g', { type: 'scada-group', children: [rect('c1')] })],
      }),
    );
    expect(result.ok).toBe(true);
  });

  it('rejects point declaration missing/empty id (id must-be-a-non-empty-string)', () => {
    expectErrors(baseConfig({ variables: [{ source: 'static', value: 1 } as never] }), 'variables[0].id must be a non-empty string');
    expectErrors(baseConfig({ variables: [{ id: '  ', source: 'static', value: 1 }] }), 'variables[0].id must be a non-empty string');
  });
});

// plan 2026-08-06-0900-1 Phase 2（open-audit P2-3 数值有限性 + multi-audit P2-9-validateSymbolNode 递归深度）：
// failing-first Proof（先于 Fix）。修复前：(a) Infinity/NaN/-Infinity 经 typeof==='number' 放行 → ok:true；
// (b) ~10k 层 children 嵌套递归无 depth cap → stack overflow crash。
describe('validateScadaConfig numeric finiteness + recursion depth (plan 2026-08-06-0900-1 Phase 2)', () => {
  it('P2-3: strokeWidth: Infinity（JSON.parse("1e400")）→ ok:false + finite-number 文案', () => {
    const inf = JSON.parse('1e400'); // → Infinity
    const result = validateScadaConfig(baseConfig({ symbols: [rect('inf', { strokeWidth: inf })] }));
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('symbols[0].strokeWidth') && e.includes('finite number'))).toBe(true);
  });

  it('P2-3: x: NaN → ok:false + finite-number 文案', () => {
    const result = validateScadaConfig(baseConfig({ symbols: [rect('nan', { x: NaN })] }));
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('symbols[0].x') && e.includes('finite number'))).toBe(true);
  });

  it('P2-3: animation period: -Infinity → ok:false + finite-number 文案', () => {
    const result = validateScadaConfig(
      baseConfig({ symbols: [rect('anim', { animations: [{ kind: 'rotate', period: -Infinity as unknown as number }] })] }),
    );
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('animations[0].period') && e.includes('finite number'))).toBe(
      true,
    );
  });

  it('P2-3: deadband: Infinity → ok:false（deadband 路由 checkNumberField 享 finite 守卫）', () => {
    const result = validateScadaConfig(
      baseConfig({ variables: [{ id: 'd', source: 'static', value: 1, deadband: Infinity as unknown as number }] }),
    );
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('variables[0].deadband') && e.includes('finite number'))).toBe(
      true,
    );
  });

  it('P2-3: 合法有限数值不回归（finite x/strokeWidth/period/deadband → ok:true）', () => {
    const result = validateScadaConfig(
      baseConfig({
        symbols: [rect('ok', { x: 10, y: -5, strokeWidth: 2, animations: [{ kind: 'rotate', period: 1000 }] })],
        variables: [{ id: 'd', source: 'static', value: 1, deadband: 0.5 }],
      }),
    );
    expect(result).toEqual({ ok: true });
  });

  it('P2-9-validateSymbolNode: ~10k 层 children 嵌套返 ok:false（深度错误），非 crash', () => {
    const buildDeepChildren = (depth: number): Record<string, unknown> => {
      let node: Record<string, unknown> = { id: 'leaf', type: 'scada-rect', x: 0, y: 0 };
      for (let i = depth - 1; i >= 0; i--) {
        node = { id: `g${i}`, type: 'scada-group', x: 0, y: 0, children: [node] };
      }
      return node;
    };
    const config = baseConfig({ symbols: [buildDeepChildren(10_000) as never] });
    expect(() => validateScadaConfig(config)).not.toThrow();
    const result = validateScadaConfig(config);
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('maximum nesting depth'))).toBe(true);
  });
});

// plan 2026-08-06-0900-1 Phase 3（open-audit P2-5 legacy 递归 + P2-6 assertShape 子形状）：
// failing-first Proof（先于 Fix）。修复前：(a) scada-group 嵌套子图元 bindings 的 @{pointId} 方言静默不 warn；
// (b) shadow/from-to/background/scale.k,b/init 子形状 malformed 全过。
describe('validateScadaConfig legacy recursion + subshape (plan 2026-08-06-0900-1 Phase 3)', () => {
  it('P2-5: scada-group 嵌套子图元 bindings 的 @{pointId} 方言产 legacy-at-syntax warning（scope 指向嵌套子图元）', () => {
    const config = baseConfig({
      symbols: [
        rect('grp', {
          type: 'scada-group',
          children: [rect('child', { bindings: { fill: { expression: '@{temp}' } } })],
        }),
      ],
    });
    const result = validateScadaConfig(config, () => true);
    expect(result.ok).toBe(true);
    expect(result.warnings?.some((w) => w.startsWith('legacy-at-syntax') && w.includes('children[0]') && w.includes('bindings.fill.expression'))).toBe(
      true,
    );
  });

  it('P2-5: 合法顶层 bindings legacy warn 不回归（scope 仍指 symbols[i]）', () => {
    const config = baseConfig({
      symbols: [rect('top', { bindings: { fill: { expression: '@{temp}' } } })],
    });
    const result = validateScadaConfig(config, () => true);
    expect(result.warnings?.some((w) => w.startsWith('legacy-at-syntax') && w.includes('symbols[0].bindings.fill.expression') && !w.includes('children'))).toBe(
      true,
    );
  });

  it('P2-6: shadow.blur 非数值 → ok:false（子形状）', () => {
    const result = validateScadaConfig(
      baseConfig({ symbols: [rect('sh', { shadow: { x: 1, y: 2, blur: 'x' as never, color: '#000' } })] }),
    );
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('symbols[0].shadow.blur'))).toBe(true);
  });

  it('P2-6: shadow.color 非字符串 → ok:false（子形状）', () => {
    const result = validateScadaConfig(
      baseConfig({ symbols: [rect('shc', { shadow: { x: 1, y: 2, blur: 3, color: 123 as never } })] }),
    );
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('symbols[0].shadow.color'))).toBe(true);
  });

  it('P2-6: animation from.y 非数值（object 形态）→ ok:false（子形状）', () => {
    const result = validateScadaConfig(
      baseConfig({ symbols: [rect('an', { animations: [{ kind: 'flow', from: { x: 1, y: 'bad' as never } }] })] }),
    );
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('animations[0].from.y'))).toBe(true);
  });

  it('P2-6: background.color 非字符串 → ok:false（子形状）', () => {
    const result = validateScadaConfig({ ...baseConfig(), background: { color: 123 } as never });
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('background.color'))).toBe(true);
  });

  it('P2-6: declaration scale.k 非数值 → ok:false（子形状）', () => {
    const result = validateScadaConfig(
      baseConfig({ variables: [{ id: 's', source: 'static', value: 1, scale: { k: 'x' as never } }] }),
    );
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('variables[0].scale.k'))).toBe(true);
  });

  it('P2-6: declaration scale.b 非数值 → ok:false（子形状）', () => {
    const result = validateScadaConfig(
      baseConfig({ variables: [{ id: 'sb', source: 'static', value: 1, scale: { b: true as never } }] }),
    );
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('variables[0].scale.b'))).toBe(true);
  });

  it('P2-6: init 非原始值（object）→ ok:false（点表 corrupt 防线）', () => {
    const result = validateScadaConfig(
      baseConfig({ variables: [{ id: 'i', source: 'static', value: 1, init: { bad: true } as never }] }),
    );
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('variables[0].init'))).toBe(true);
  });

  it('P2-6: 合法声明（含正常 shadow/animation-from/background/scale/init）不回归', () => {
    const result = validateScadaConfig(
      baseConfig({
        symbols: [
          rect('ok', {
            shadow: { x: 1, y: 2, blur: 3, color: '#000' },
            animations: [{ kind: 'flow', from: { x: 0, y: 0 }, to: 100 }],
          }),
        ],
        variables: [
          { id: 'lin', source: 'static', value: 1, scale: { k: 2, b: 1 }, init: 0 },
          { id: 'initB', source: 'static', value: 1, init: true },
          { id: 'initS', source: 'static', value: 1, init: 'idle' },
        ],
        background: { color: '#fff' },
      }),
    );
    expect(result).toEqual({ ok: true });
  });
});

// HCA4-P3-1 / HCA4-P3-2（归 HCA-CR）：校验覆盖缺口——align 字段 + background.grid 子形状。
describe('validateScadaConfig coverage gaps (HCA4-P3-1/P3-2)', () => {
  it('HCA4-P3-1: rejects invalid align value (not left|center|right)', () => {
    const badAlign = validateScadaConfig(
      baseConfig({ symbols: [rect('a', { align: 'diagonal' as unknown as 'left' })] }),
    );
    expect(badAlign.ok).toBe(false);
    expect((badAlign as { errors: string[] }).errors.some((e) => e.includes('align'))).toBe(true);
  });

  it('HCA4-P3-1: accepts valid align values (left|center|right)', () => {
    for (const align of ['left', 'center', 'right'] as const) {
      const result = validateScadaConfig(baseConfig({ symbols: [rect('a', { align })] }));
      expect(result.ok).toBe(true);
    }
  });

  it('HCA4-P3-2: rejects malformed background.grid (size not number)', () => {
    const result = validateScadaConfig({
      ...baseConfig(),
      background: { color: '#fff', grid: { size: 'big' as unknown as number, color: '#ccc' } },
    });
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('background.grid'))).toBe(true);
  });

  it('HCA4-P3-2: rejects malformed background.grid (color not string)', () => {
    const result = validateScadaConfig({
      ...baseConfig(),
      background: { grid: { size: 10, color: 123 as unknown as string } },
    });
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('background.grid'))).toBe(true);
  });

  it('HCA4-P3-2: accepts well-formed background.grid', () => {
    const result = validateScadaConfig({
      ...baseConfig(),
      background: { color: '#fff', grid: { size: 20, color: '#ccc' } },
    });
    expect(result).toEqual({ ok: true });
  });
});

// plan 2026-08-08-1809-1 Phase 1（open-audit F2：assertShape 'number' 分支不拒 NaN/±Infinity）：
// failing-first Proof（先于 Fix）。修复前：assertShape number 分支仅 `typeof v === 'number'`，
// 故 grid.size=Infinity（JSON.parse('1e400')）/ animation.from.x=NaN / declaration scale.k=Infinity 直过——
// 修复后这些子字段必须报 finite-number 错误。对照 checkNumberField（已 finite）同形。
describe('validateScadaConfig assertShape finite number (plan 2026-08-08-1809-1 Phase 1 / F2)', () => {
  it('F2: background.grid.size = 1e400 (→Infinity) → ok:false + finite-number 文案', () => {
    const inf = JSON.parse('1e400'); // → Infinity
    const result = validateScadaConfig({
      ...baseConfig(),
      background: { color: '#fff', grid: { size: inf, color: '#ccc' } },
    });
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('background.grid.size') && e.includes('finite number'))).toBe(
      true,
    );
  });

  it('F2: background.grid.size = NaN → ok:false + finite-number 文案', () => {
    const result = validateScadaConfig({
      ...baseConfig(),
      background: { color: '#fff', grid: { size: NaN, color: '#ccc' } },
    });
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('background.grid.size') && e.includes('finite number'))).toBe(
      true,
    );
  });

  it('F2: animation.from = {x: NaN} → ok:false + finite-number 文案', () => {
    const result = validateScadaConfig(
      baseConfig({
        symbols: [rect('an', { animations: [{ kind: 'flow', from: { x: NaN, y: 0 } }] })],
      }),
    );
    expect(result.ok).toBe(false);
    expect(
      (result as { errors: string[] }).errors.some((e) => e.includes('animations[0].from.x') && e.includes('finite number')),
    ).toBe(true);
  });

  it('F2: declaration scale.k = 1e400 (→Infinity) → ok:false + finite-number 文案', () => {
    const inf = JSON.parse('1e400'); // → Infinity
    const result = validateScadaConfig(
      baseConfig({ variables: [{ id: 's', source: 'static', value: 1, scale: { k: inf as unknown as number, b: 0 } }] }),
    );
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('variables[0].scale.k') && e.includes('finite number'))).toBe(
      true,
    );
  });
});

// plan 2026-08-08-1809-1 Phase 2（open-audit F4：validate 无广度/总量上限 → 不可信 config DoS）：
// failing-first Proof（先于 Fix）。修复前：(a) `symbols: new Array(MAX_SYMBOLS+1)` 仅 Array.isArray 后 forEach
// 全量递归（无 length 守卫），sparse 空洞 forEach 跳过 → ok:true 放行；(b) 深嵌套/超宽 children 总节点数
// 超 MAX_TOTAL_NODES 无计数早退。修复后两类超阈 config 必须 {ok:false} + 结构化 error（O(1) 早退 / 递归早退）。
import { MAX_SYMBOLS, MAX_VARIABLES, MAX_TOTAL_NODES } from './validators/helpers.js';
describe('validateScadaConfig breadth/total-node DoS guards (plan 2026-08-08-1809-1 Phase 2 / F4)', () => {
  it('F4: symbols.length > MAX_SYMBOLS → ok:false + 超限文案（O(1) length 守卫，不遍历）', () => {
    // sparse array of length MAX_SYMBOLS+1：修复前 forEach 跳过空洞 → ok:true；修复后 length 守卫早退。
    const result = validateScadaConfig({ version: 1, symbols: new Array(MAX_SYMBOLS + 1) as never });
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('symbols') && e.includes('maximum symbol count'))).toBe(true);
  });

  it('F4: variables.length > MAX_VARIABLES → ok:false + 超限文案（O(1) length 守卫）', () => {
    const result = validateScadaConfig({ version: 1, symbols: [], variables: new Array(MAX_VARIABLES + 1) as never });
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('variables') && e.includes('maximum variable count'))).toBe(
      true,
    );
  });

  it('F4: 嵌套 children 总节点数超 MAX_TOTAL_NODES → ok:false + 超限文案（递归期计数早退）', () => {
    // 单 root scada-group + (MAX_TOTAL_NODES+2) 个 dense undefined children：递归期每节点计数 +1，
    // 超 MAX_TOTAL_NODES 即 push 总量 error 并停止深入。修复前：无总量守卫（仅 depth），不会报 total-node error。
    const result = validateScadaConfig({
      version: 1,
      symbols: [
        { id: 'root', type: 'scada-group', x: 0, y: 0, children: Array.from({ length: MAX_TOTAL_NODES + 2 }) as never },
      ],
    });
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('maximum total node count'))).toBe(true);
  });

  it('F4: 阈内大规模 config 不被误拒（length == MAX_SYMBOLS 的 sparse symbols 通过 length 守卫，内部空洞 forEach 跳过 → ok:true）', () => {
    const result = validateScadaConfig({ version: 1, symbols: new Array(MAX_SYMBOLS) as never });
    expect(result.ok).toBe(true);
  });

  it('F4: 阈内合法 nested children 零回归（既有 nested fixtures 行为不变）', () => {
    const result = validateScadaConfig(
      baseConfig({
        symbols: [
          rect('g', { type: 'scada-group', children: [rect('c1'), rect('c2', { x: 10 }), rect('c3')] }),
        ],
      }),
    );
    expect(result.ok).toBe(true);
  });
});
