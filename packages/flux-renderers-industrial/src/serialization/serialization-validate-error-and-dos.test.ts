import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { validateScadaConfig } from './validate.js';
import { rect, baseConfig } from './serialization-fixtures.js';
import { MAX_SYMBOLS, MAX_VARIABLES, MAX_TOTAL_NODES } from './validators/helpers.js';
import type { ScadaConfig } from './config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));

beforeEach(() => {
  registerBuiltinScadaSymbols();
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
