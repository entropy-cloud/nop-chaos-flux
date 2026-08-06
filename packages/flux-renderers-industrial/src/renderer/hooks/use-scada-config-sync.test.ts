import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { computeSymbolBounds, useScadaConfigSync } from './use-scada-config-sync.js';
import { MAX_SCALE, MIN_SCALE, fit, clampScale } from '../../engine/viewport.js';
import { registerBuiltinScadaSymbols } from '../../symbols/register-builtin.js';
import { resetLeaferMock } from '../../test-support/leafer-ui-mock.js';
import type { ScadaSymbolNode, ScadaConfig } from '../../serialization/config-types.js';
import type { ScadaCanvasRuntime } from './use-scada-engine.js';

vi.mock('leafer-ui', () => import('../../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
});

describe('computeSymbolBounds — custom.points 几何族 (plan 2026-08-04-1558-3 Phase 1)', () => {
  it('derives bounds from custom.points ({x,y} 形式) 而非退化为 0 尺寸', () => {
    const polygon: ScadaSymbolNode = {
      id: 'p1',
      type: 'scada-polygon',
      x: 100,
      y: 200,
      custom: { points: [{ x: 10, y: 10 }, { x: 50, y: 10 }, { x: 30, y: 60 }] },
    };
    const bounds = computeSymbolBounds([polygon]);
    expect(bounds).toBeDefined();
    expect(bounds).toEqual({ x: 110, y: 210, width: 40, height: 50 });
  });

  it('derives bounds from custom.points (flat [x1,y1,...] 形式)', () => {
    const line: ScadaSymbolNode = {
      id: 'l1',
      type: 'scada-line',
      x: 0,
      y: 0,
      custom: { points: [0, 0, 30, 40] },
    };
    const bounds = computeSymbolBounds([line]);
    expect(bounds).toEqual({ x: 0, y: 0, width: 30, height: 40 });
  });

  it('polygon-only 场景 fit 后 scale 有界（< MAX_SCALE）且包围盒含图元', () => {
    const polygon: ScadaSymbolNode = {
      id: 'pg',
      type: 'scada-polygon',
      x: 500,
      y: 500,
      custom: { points: [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 100, y: 150 }] },
    };
    const bounds = computeSymbolBounds([polygon]);
    expect(bounds).toBeDefined();
    expect(bounds!.width).toBe(200);
    expect(bounds!.height).toBe(150);
    const viewport = { width: 800, height: 600 };
    const state = fit(bounds!, viewport, 0);
    expect(state.scale).toBeGreaterThanOrEqual(MIN_SCALE);
    expect(state.scale).toBeLessThan(MAX_SCALE);
    expect(state.scale).toBeLessThan(20);
  });

  it('ignores malformed points (非数字坐标) 并回退到 width/height 矩形', () => {
    const node: ScadaSymbolNode = {
      id: 'bad',
      type: 'scada-polygon',
      x: 10,
      y: 20,
      width: 30,
      height: 40,
      custom: { points: [{ x: 'no', y: 1 }] },
    };
    const bounds = computeSymbolBounds([node]);
    expect(bounds).toEqual({ x: 10, y: 20, width: 30, height: 40 });
  });

  it('aggregates multiple nodes (rect + polygon) into a union bounds', () => {
    const rect: ScadaSymbolNode = { id: 'r', type: 'scada-rect', x: 0, y: 0, width: 50, height: 50 };
    const polygon: ScadaSymbolNode = {
      id: 'p',
      type: 'scada-polygon',
      x: 100,
      y: 100,
      custom: { points: [{ x: 0, y: 0 }, { x: 50, y: 50 }] },
    };
    const bounds = computeSymbolBounds([rect, polygon]);
    expect(bounds).toEqual({ x: 0, y: 0, width: 150, height: 150 });
  });

  it('returns undefined for an empty symbol list', () => {
    expect(computeSymbolBounds([])).toBeUndefined();
  });
});

// Proof-1/Proof-2 (plan 2026-08-04-2242-2 Phase 1, 失败用例先行)：
// 收口 ScadaSymbolNode x/y 三层契约漂移——JSON 省略 x/y + viewport policy 时，
// bounds consumer 原样读取 node.x/node.y（undefined）→ NaN bounds → NaN viewport → 空白 ready 画布。
// 经 `as ScadaSymbolNode` 绕过当前必填类型构造省略 x/y 的节点；Fix 前应失败（返回 undefined/NaN）。
describe('computeSymbolBounds / viewport pipeline — omitted x/y contract (plan 2026-08-04-2242-2)', () => {
  it('Proof-1a: rect 节点省略 x/y 时 bounds.x/y 为有限（0），width/height 仍按声明', () => {
    const node = { id: 'r', type: 'scada-rect', width: 100, height: 50 } as ScadaSymbolNode;
    const bounds = computeSymbolBounds([node]);
    expect(bounds).toBeDefined();
    expect(Number.isFinite(bounds!.x)).toBe(true);
    expect(Number.isFinite(bounds!.y)).toBe(true);
    expect(bounds!.x).toBe(0);
    expect(bounds!.y).toBe(0);
    expect(bounds!.width).toBe(100);
    expect(bounds!.height).toBe(50);
  });

  it('Proof-1b: custom.points 节点省略 x/y 时 bounds 按 (0,0) 原点 + points 极值得有限包围盒', () => {
    const node = {
      id: 'p',
      type: 'scada-polygon',
      custom: { points: [{ x: 10, y: 10 }, { x: 50, y: 10 }, { x: 30, y: 60 }] },
    } as ScadaSymbolNode;
    const bounds = computeSymbolBounds([node]);
    expect(bounds).toBeDefined();
    expect(Number.isFinite(bounds!.x)).toBe(true);
    expect(Number.isFinite(bounds!.y)).toBe(true);
    expect(Number.isFinite(bounds!.width)).toBe(true);
    expect(Number.isFinite(bounds!.height)).toBe(true);
    // 原点默认 0：bounds = (0+10, 0+10, 40, 50)
    expect(bounds!.x).toBe(10);
    expect(bounds!.y).toBe(10);
    expect(bounds!.width).toBe(40);
    expect(bounds!.height).toBe(50);
  });

  it('Proof-2: 省略 x/y 的 symbol + viewport fit → viewport x/y/scale 全有限（非 NaN-blank）', () => {
    const node = { id: 'r', type: 'scada-rect', width: 100, height: 50 } as ScadaSymbolNode;
    const bounds = computeSymbolBounds([node]);
    expect(bounds).toBeDefined();
    // unionBounds 结果不含 NaN（bounds 四分量全有限）
    expect(Number.isFinite(bounds!.x)).toBe(true);
    expect(Number.isFinite(bounds!.y)).toBe(true);
    expect(Number.isFinite(bounds!.width)).toBe(true);
    expect(Number.isFinite(bounds!.height)).toBe(true);
    // applyInitialViewport 的 fit 分支委托同一 pure fit（viewport.ts:54，engine.fit 同源）
    const state = fit(bounds!, { width: 800, height: 600 }, 0);
    expect(Number.isFinite(state.x)).toBe(true);
    expect(Number.isFinite(state.y)).toBe(true);
    expect(Number.isFinite(state.scale)).toBe(true);
    expect(state.scale).toBeGreaterThanOrEqual(MIN_SCALE);
    expect(state.scale).toBeLessThanOrEqual(MAX_SCALE);
  });
});

// plan 2026-08-04-2243-2 D1：默认几何族（polygon/line/arrow 无显式 custom.points）fit/center 包围盒。
// 失败用例（修复前）：boundsOfNode 仅认显式 custom.points，无 custom.points 时回退 width/height 矩形 →
// 默认三角形 polygon（无 width/height）bounds = 0×0 → fit 冲到 MAX_SCALE(20×)，图元钉在画布外。
// 修复后：consult 符号定义 defaultGeometryPoints（polygon DEFAULT_TRIANGLE 100×86 / line [0,0,100,0]）。
describe('computeSymbolBounds — default geometry points (plan 2026-08-04-2243-2 D1)', () => {
  it('default-triangle polygon（无 custom.points/width/height）bounds 按符号定义 DEFAULT_TRIANGLE 计算', () => {
    const polygon: ScadaSymbolNode = { id: 'p', type: 'scada-polygon', x: 100, y: 200 };
    const bounds = computeSymbolBounds([polygon]);
    expect(bounds).toBeDefined();
    // DEFAULT_TRIANGLE = (0,0),(100,0),(50,86) → 包围盒 (0,0,100,86)，绝对 = node 原点 + 极值
    expect(bounds).toEqual({ x: 100, y: 200, width: 100, height: 86 });
  });

  it('default-triangle polygon fit 后 scale 有界（< MAX_SCALE），不冲到 20×', () => {
    const polygon: ScadaSymbolNode = { id: 'p', type: 'scada-polygon', x: 500, y: 500 };
    const bounds = computeSymbolBounds([polygon]);
    expect(bounds).toBeDefined();
    expect(bounds!.width).toBe(100);
    expect(bounds!.height).toBe(86);
    const state = fit(bounds!, { width: 800, height: 600 }, 0);
    expect(state.scale).toBeGreaterThanOrEqual(MIN_SCALE);
    expect(state.scale).toBeLessThan(MAX_SCALE);
    expect(state.scale).toBeLessThan(20);
  });

  it('零高 line（无 custom.points/width/height）bounds 按默认 [0,0,100,0] 计算（width=100）', () => {
    const line: ScadaSymbolNode = { id: 'l', type: 'scada-line', x: 0, y: 0 };
    const bounds = computeSymbolBounds([line]);
    expect(bounds).toBeDefined();
    // line defaultGeometryPoints = [0,0,100,0] → 包围盒 (0,0,100,0)
    expect(bounds).toEqual({ x: 0, y: 0, width: 100, height: 0 });
  });

  it('零高 line fit 后 scale 有界（width=100 贡献有效尺寸，不冲到 MAX_SCALE）', () => {
    const line: ScadaSymbolNode = { id: 'l', type: 'scada-line', x: 0, y: 0 };
    const bounds = computeSymbolBounds([line]);
    expect(bounds).toBeDefined();
    const state = fit(bounds!, { width: 800, height: 600 }, 0);
    expect(state.scale).toBeLessThan(MAX_SCALE);
  });

  it('arrow（无 custom.points/width/height）bounds 按默认 [0,0,100,0] 计算', () => {
    const arrow: ScadaSymbolNode = { id: 'a', type: 'scada-arrow', x: 10, y: 20 };
    const bounds = computeSymbolBounds([arrow]);
    expect(bounds).toEqual({ x: 10, y: 20, width: 100, height: 0 });
  });

  it('节点带显式 custom.points 仍优先于定义默认几何（不退化、不误用 default）', () => {
    const polygon: ScadaSymbolNode = {
      id: 'p',
      type: 'scada-polygon',
      x: 0,
      y: 0,
      custom: { points: [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 100, y: 150 }] },
    };
    const bounds = computeSymbolBounds([polygon]);
    expect(bounds).toEqual({ x: 0, y: 0, width: 200, height: 150 });
  });

  it('line 带显式 width/height（无 custom.points）按定义默认几何 [0,0,w,h] 算包围盒', () => {
    const line: ScadaSymbolNode = { id: 'l', type: 'scada-line', x: 5, y: 6, width: 240, height: 0 };
    const bounds = computeSymbolBounds([line]);
    expect(bounds).toEqual({ x: 5, y: 6, width: 240, height: 0 });
  });

  it('非 points 几何族（rect 无 custom.points）仍回退 width/height 矩形（不误触发 defaultGeometryPoints）', () => {
    const rect: ScadaSymbolNode = { id: 'r', type: 'scada-rect', x: 1, y: 2, width: 30, height: 40 };
    const bounds = computeSymbolBounds([rect]);
    expect(bounds).toEqual({ x: 1, y: 2, width: 30, height: 40 });
  });
});

// plan 2026-08-04-2243-1 Phase 2 L4：pendingSkip 计数器改 per-import nonce 收口泄漏。
// 失败用例（修复前）：import 后 host 并发改 config（identity 不匹配 baseline）→ 旧计数器不递减 →
// 残留 → 后续 host 重发与 baseline 同身份的 config 时被误 skip（画布滞留 imported 场景，prevRef 静默前进）。
// nonce 修复：skip 标记 single-use，effect 首次运行即消费（不论 identity 是否匹配），不残留。
describe('useScadaConfigSync pendingSkip per-import nonce (plan 2026-08-04-2243-1 Phase 2 L4)', () => {
  const sym = (id: string, x = 0): ScadaSymbolNode => ({ id, type: 'scada-rect', x, y: 0 });
  // cfgA 与 leak-step 重发使用同一常量引用（身份匹配 baseline 是泄漏触发条件）。
  const cfgA: ScadaConfig = { version: 1, variables: [], symbols: [sym('a', 0)] };
  const cfgAprime: ScadaConfig = { version: 1, variables: [], symbols: [sym('a', 99)] };
  const cfgImported: ScadaConfig = { version: 1, variables: [], symbols: [sym('imp', 0)] };

  interface FakeRuntimeEngine {
    reset: ReturnType<typeof vi.fn>;
    applyDiff: ReturnType<typeof vi.fn>;
  }
  type FakeRuntime = { engine: FakeRuntimeEngine };

  it('nonce consumed once even when a concurrent non-matching config change occurs (no leak → re-sent baseline still syncs)', () => {
    const reset = vi.fn();
    const applyDiff = vi.fn();
    const reload = vi.fn();
    const onBuilt = vi.fn();
    let runtime: FakeRuntime = { engine: { reset, applyDiff } };

    const { result, rerender } = renderHook(
      (props: { config: ScadaConfig; runtime: FakeRuntime }) =>
        useScadaConfigSync({
          config: props.config,
          runtime: props.runtime as unknown as ScadaCanvasRuntime,
          reloadBindings: reload,
          onBuilt,
        }),
      { initialProps: { config: cfgA, runtime } },
    );

    // step 1：mount → full sync cfgA → reset(cfgA)
    expect(reset).toHaveBeenCalledWith(cfgA);
    expect(applyDiff).not.toHaveBeenCalled();

    // step 2：import cfgImported（nonce 标记，prevRef=imported，reset(imported)）
    act(() => result.current.syncImported(cfgImported));
    expect(reset).toHaveBeenCalledWith(cfgImported);

    // step 3：模拟 reload setRuntime（新 runtime 身份）+ host 并发改 cfgAprime（identity 不匹配 baseline cfgA）
    // 修复前：计数器不递减（残留）；修复后：nonce 首次运行即消费。两条都走正常 diff sync。
    runtime = { engine: { reset, applyDiff } };
    rerender({ config: cfgAprime, runtime });
    expect(applyDiff).toHaveBeenCalledTimes(1);

    // step 4：host 重发 cfgA（identity === baseline）。
    // 修复前（计数器泄漏）：counter>0 && cfgA===baseline → 误 skip → applyDiff 不递增（仍 1）。
    // 修复后（nonce 已消费）：正常 diff sync → applyDiff 递增到 2。
    rerender({ config: cfgA, runtime });
    expect(applyDiff).toHaveBeenCalledTimes(2);
  });

  it('self-induced re-run after import (same config identity) is still skipped (nonce preserves skip intent)', () => {
    const reset = vi.fn();
    const applyDiff = vi.fn();
    const reload = vi.fn();
    const onBuilt = vi.fn();
    let runtime: FakeRuntime = { engine: { reset, applyDiff } };

    const { result, rerender } = renderHook(
      (props: { config: ScadaConfig; runtime: FakeRuntime }) =>
        useScadaConfigSync({
          config: props.config,
          runtime: props.runtime as unknown as ScadaCanvasRuntime,
          reloadBindings: reload,
          onBuilt,
        }),
      { initialProps: { config: cfgA, runtime } },
    );

    expect(reset).toHaveBeenCalledWith(cfgA);
    reset.mockClear();

    act(() => result.current.syncImported(cfgImported));
    expect(reset).toHaveBeenCalledWith(cfgImported);
    reset.mockClear();

    // self-induced re-run：reload 产新 runtime，config 仍为 baseline cfgA（身份匹配）→ skip。
    // 不应再次 reset/import（import 已应用）。
    runtime = { engine: { reset, applyDiff } };
    rerender({ config: cfgA, runtime });
    expect(reset).not.toHaveBeenCalled();
    expect(applyDiff).not.toHaveBeenCalled();
  });
});

// plan 2026-08-05-1253-1 Phase 1（multi-audit P2-5）：applyInitialViewport fill 分支 clamp-before-center。
// 失败用例（修复前）：fill 分支用未钳制 scale 算居中 x/y，引擎 setViewport 才钳 scale → 极端 bounds
// （rawScale 越界 [0.1,20]）时 x/y 按未钳 scale 算、实际 scale 被钳 → 内容几何中心不齐视口中心（漂移）。
// 修复后：scale 先 clampScale 再算 x/y（与 contain/fit 分支 viewport.ts:67 对齐）。
describe('useScadaConfigSync applyInitialViewport fill branch clamp-before-center (plan 2026-08-05-1253-1 Phase 1)', () => {
  const tinySym = (): ScadaSymbolNode => ({ id: 'tiny', type: 'scada-rect', x: 0, y: 0, width: 1, height: 1 });
  // bounds = {x:0, y:0, width:1, height:1}; size = 800×600 → rawScale = max(800/1, 600/1) = 800 越界。
  // 修复前期望（按未钳 scale=800）：x = 0.5 - 800/1600 = 0；修复后（钳 scale=20）：x = 0.5 - 20 = -19.5。
  const expectedRawScale = 800;
  const expectedClampedScale = clampScale(expectedRawScale);
  const expectedCenteredX = 0 + 0.5 - 800 / (2 * expectedClampedScale);
  const expectedCenteredY = 0 + 0.5 - 600 / (2 * expectedClampedScale);

  it('Proof: fill 分支极端 bounds → setViewport 收到已钳 scale 且 x/y 按钳制 scale 算（不漂移）', () => {
    expect(expectedClampedScale).toBe(MAX_SCALE);
    const setViewport = vi.fn();
    const reset = vi.fn();
    const applyDiff = vi.fn();
    const reload = vi.fn();
    const runtime = {
      engine: {
        reset,
        applyDiff,
        setViewport,
        getSize: () => ({ width: 800, height: 600 }),
      },
    };

    renderHook(
      (props: { config: ScadaConfig; runtime: typeof runtime }) =>
        useScadaConfigSync({
          config: props.config,
          runtime: props.runtime as unknown as ScadaCanvasRuntime,
          reloadBindings: reload,
          viewport: { fit: 'fill' },
        }),
      { initialProps: { config: { version: 1, variables: [], symbols: [tinySym()] }, runtime } },
    );

    expect(reset).toHaveBeenCalledTimes(1);
    expect(setViewport).toHaveBeenCalledTimes(1);
    const state = setViewport.mock.calls[0][0];
    // scale 已钳制到 [MIN_SCALE, MAX_SCALE]（修复前传 800 未钳）
    expect(state.scale).toBe(expectedClampedScale);
    expect(state.scale).toBeLessThanOrEqual(MAX_SCALE);
    // 居中 x/y 按钳制 scale 计算（内容几何中心 0.5 对齐视口中心 400/600）
    expect(state.x).toBeCloseTo(expectedCenteredX, 10);
    expect(state.y).toBeCloseTo(expectedCenteredY, 10);
    // 修复前：x===0（按未钳 scale 算）、scale===800（未钳），二者均漂移。
    expect(state.x).not.toBe(0);
    expect(state.scale).not.toBe(expectedRawScale);
  });

  it('contain 分支不回归（仍委托 engine.fit，scale 有界）', () => {
    const fitSpy = vi.fn((_bounds: unknown, _padding: number) => ({ x: 0, y: 0, scale: 1 }));
    const reset = vi.fn();
    const applyDiff = vi.fn();
    const reload = vi.fn();
    const runtime = {
      engine: { reset, applyDiff, fit: fitSpy, getSize: () => ({ width: 800, height: 600 }) },
    };

    renderHook(
      (props: { config: ScadaConfig; runtime: typeof runtime }) =>
        useScadaConfigSync({
          config: props.config,
          runtime: props.runtime as unknown as ScadaCanvasRuntime,
          reloadBindings: reload,
          viewport: { fit: 'contain' },
        }),
      { initialProps: { config: { version: 1, variables: [], symbols: [tinySym()] }, runtime } },
    );

    expect(fitSpy).toHaveBeenCalledTimes(1);
    expect(fitSpy.mock.calls[0][1]).toBe(0);
  });
});

// plan 2026-08-06-0900-3 Phase 1（multi-audit P2-7）：fill 分支零尺寸方向兜底。
// 失败用例（修复前）：fill 分支 `clampScale(Math.max(size.width/bounds.width, ...))` 无 1e-6 floor，
// bounds={0,0} → size/0 = Infinity → clampScale(Infinity) = MIN_SCALE（zoom OUT），
// 与 contain/fit 分支（viewport.ts:65-67 有 floor → MAX_SCALE zoom IN）对零尺寸内容方向相反。
// 修复后：补 Math.max(1e-6, bounds.width/height) floor，零尺寸收敛到 MAX_SCALE（与 contain 方向一致）。
describe('useScadaConfigSync applyInitialViewport fill branch zero-size floor (plan 2026-08-06-0900-3 Phase 1 / multi P2-7)', () => {
  // 零尺寸 symbol：bounds = {x:0, y:0, width:0, height:0}（rect 无 width/height 默认 0）。
  const zeroSizeSym = (): ScadaSymbolNode => ({ id: 'zero', type: 'scada-rect', x: 0, y: 0 });

  it('Proof: fill 分支零尺寸 bounds → setViewport 收到 scale === MAX_SCALE（与 contain 方向一致，非 MIN_SCALE）', () => {
    const setViewport = vi.fn();
    const reset = vi.fn();
    const applyDiff = vi.fn();
    const reload = vi.fn();
    const runtime = {
      engine: {
        reset,
        applyDiff,
        setViewport,
        getSize: () => ({ width: 800, height: 600 }),
      },
    };

    renderHook(
      (props: { config: ScadaConfig; runtime: typeof runtime }) =>
        useScadaConfigSync({
          config: props.config,
          runtime: props.runtime as unknown as ScadaCanvasRuntime,
          reloadBindings: reload,
          viewport: { fit: 'fill' },
        }),
      { initialProps: { config: { version: 1, variables: [], symbols: [zeroSizeSym()] }, runtime } },
    );

    expect(reset).toHaveBeenCalledTimes(1);
    expect(setViewport).toHaveBeenCalledTimes(1);
    const state = setViewport.mock.calls[0][0];
    // 修复前：clampScale(Infinity) = MIN_SCALE（0.1，zoom OUT，与 contain 方向相反）。
    // 修复后：1e-6 floor → size/1e-6 = huge → clampScale(huge) = MAX_SCALE（zoom IN，与 contain 一致）。
    expect(state.scale).toBe(MAX_SCALE);
    expect(state.scale).not.toBe(MIN_SCALE);
    // x/y 仍有限（零尺寸内容收敛到 MAX_SCALE 不应产 NaN 视口）
    expect(Number.isFinite(state.x)).toBe(true);
    expect(Number.isFinite(state.y)).toBe(true);
  });
});
