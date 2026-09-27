import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetLeaferMock } from '../../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../register-builtin.js';
import { clearScadaSymbolRegistry, getScadaSymbolDefinition } from '../symbol-registry.js';
import { instantiateSymbol } from '../symbol-factory.js';
import { measureTextWidth } from './text.js';
import type { ScadaSymbolProps } from '../symbol-types.js';

vi.mock('leafer-ui', () => import('../../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

const instantiate = (type: string, props: Record<string, unknown> = {}) =>
  instantiateSymbol(type, {
    id: 's',
    props: { x: 0, y: 0, ...props } as unknown as ScadaSymbolProps,
    engine: {},
    config: { world: { x: 0, y: 0, scale: 1 } },
  }) as unknown as Record<string, unknown>;

beforeEach(() => {
  resetLeaferMock();
  clearScadaSymbolRegistry();
  registerBuiltinScadaSymbols();
});

describe('line/arrow/pipe — create width/height fallbacks (plan 2026-08-05-0653-3 B2 同构)', () => {
  it('scada-line falls back to default geometry when width/height are omitted', () => {
    const node = instantiate('scada-line');
    expect(node.points).toEqual([0, 0, 100, 0]);
  });

  it('scada-arrow keeps endArrow and falls back to default geometry', () => {
    const node = instantiate('scada-arrow');
    expect(node.points).toEqual([0, 0, 100, 0]);
    expect(node.endArrow).toBe(true);
  });

  it('scada-pipe derives stroke from fill when stroke is absent and uses default geometry', () => {
    // 绕过 defaults 深合并（stroke 缺省恒存在）：直调 definition.create 验证 fill→stroke 兜底。
    const created = getScadaSymbolDefinition('scada-pipe')!.create({
      id: 's',
      props: { fill: '#ff0000', x: 0, y: 0 } as unknown as ScadaSymbolProps,
      engine: {},
      config: { world: { x: 0, y: 0, scale: 1 } },
    }) as unknown as Record<string, unknown>;
    expect(created.points).toEqual([0, 0, 100, 0]);
    expect(created.strokeCap).toBe('round');
    expect(created.stroke).toBe('#ff0000');
    // fill + stroke 并存 → 不覆盖显式 stroke。
    const both = instantiate('scada-pipe', { fill: '#ff0000', stroke: '#0000ff' });
    expect(both.stroke).toBe('#0000ff');
  });
});

function applyPropsOf(type: string) {
  return getScadaSymbolDefinition(type)!.applyProps!;
}

function geometryNode(points?: number[]): Record<string, unknown> {
  return {
    points,
    set: vi.fn(),
  };
}

describe('line/arrow/pipe — applyProps width/height recompute (B2)', () => {
  it('recomputes points from the other axis when only one dimension is patched (points present)', () => {
    for (const type of ['scada-line', 'scada-arrow', 'scada-pipe']) {
      const node = geometryNode([0, 0, 80, 12]);
      applyPropsOf(type)(node as never, { width: 200 });
      expect(node.set).toHaveBeenCalledWith({ points: [0, 0, 200, 12] });
      const node2 = geometryNode([0, 0, 80, 12]);
      applyPropsOf(type)(node2 as never, { height: 30 });
      expect(node2.set).toHaveBeenCalledWith({ points: [0, 0, 80, 30] });
    }
  });

  it('falls back to default geometry when points are absent and only one dimension is patched', () => {
    for (const type of ['scada-line', 'scada-arrow', 'scada-pipe']) {
      const node = geometryNode(undefined);
      applyPropsOf(type)(node as never, { width: 150 });
      expect(node.set).toHaveBeenCalledWith({ points: [0, 0, 150, 0] });
      const node2 = geometryNode(undefined);
      applyPropsOf(type)(node2 as never, { height: 9 });
      expect(node2.set).toHaveBeenCalledWith({ points: [0, 0, 100, 9] });
    }
  });

  it('applies the non-geometry patch via toNodePatch and skips empty patches', () => {
    const node = geometryNode([0, 0, 10, 10]);
    applyPropsOf('scada-line')(node as never, { stroke: '#123456' });
    expect(node.set).toHaveBeenCalledWith({ stroke: '#123456' });
    // 仅几何维度 → rest 为空 → 不再调用第二次 set。
    const geoOnly = geometryNode([0, 0, 10, 10]);
    applyPropsOf('scada-line')(geoOnly as never, { width: 42 });
    expect(geoOnly.set).toHaveBeenCalledTimes(1);
  });
});

describe('line/arrow/pipe — defaultGeometryPoints width/height fallback', () => {
  it('uses node width/height when present and defaults when absent', () => {
    for (const [type, w, h] of [
      ['scada-line', 100, 0],
      ['scada-arrow', 100, 0],
      ['scada-pipe', 100, 0],
    ] as const) {
      const def = getScadaSymbolDefinition(type)!;
      expect(def.defaultGeometryPoints!({ width: 40, height: 7 } as never)).toEqual([0, 0, 40, 7]);
      expect(def.defaultGeometryPoints!({} as never)).toEqual([0, 0, w, h]);
    }
  });
});

describe('measureTextWidth (plan 2026-08-04-2243-2 D2)', () => {
  it('uses canvas measureText when a 2d context is available (font string carries weight)', () => {
    const realCreate = document.createElement.bind(document);
    const ctx = {
      font: '',
      measureText: vi.fn(() => ({ width: 42 })),
    };
    const spy = vi
      .spyOn(document, 'createElement')
      .mockImplementation(((tag: string) =>
        tag === 'canvas'
          ? { getContext: () => ctx }
          : realCreate(tag)) as unknown as typeof document.createElement);
    try {
      expect(measureTextWidth('AB', 14, 'Arial', 'bold')).toBe(42);
      expect(ctx.font).toBe('bold 14px Arial');
      // 无 weight → 前缀省略；无 fontFamily → sans-serif 兜底。
      expect(measureTextWidth('AB', 14)).toBe(42);
      expect(ctx.font).toBe('14px sans-serif');
    } finally {
      spy.mockRestore();
    }
  });

  it('falls back to the deterministic heuristic for non-finite, non-positive, or missing metrics', () => {
    const realCreate = document.createElement.bind(document);
    for (const metrics of [{ width: Number.NaN }, { width: -1 }, { width: 'x' }, {}]) {
      const ctx = { font: '', measureText: vi.fn(() => metrics) };
      const spy = vi
        .spyOn(document, 'createElement')
        .mockImplementation(((tag: string) =>
          tag === 'canvas' ? { getContext: () => ctx } : realCreate(tag)) as unknown as typeof document.createElement);
      try {
        expect(measureTextWidth('abc', 10)).toBe(18); // 3 * 10 * 0.6
      } finally {
        spy.mockRestore();
      }
    }
  });

  it('falls back to the heuristic when getContext throws (canvas unavailable)', () => {
    const realCreate = document.createElement.bind(document);
    const spy = vi
      .spyOn(document, 'createElement')
      .mockImplementation(((tag: string) =>
        tag === 'canvas'
          ? {
              getContext: () => {
                throw new Error('no canvas');
              },
            }
          : realCreate(tag)) as unknown as typeof document.createElement);
    try {
      expect(measureTextWidth('abcd', 10)).toBe(24); // 4 * 10 * 0.6
    } finally {
      spy.mockRestore();
    }
  });

  it('skips the canvas path entirely when document is unavailable', () => {
    const doc = globalThis.document;
    // @ts-expect-error 测试专用：模拟无 document 环境。
    globalThis.document = undefined;
    try {
      expect(measureTextWidth('ab', 10)).toBe(12); // 2 * 10 * 0.6
    } finally {
      globalThis.document = doc;
    }
  });
});

describe('scada-text create — auto-width alignment (D2)', () => {
  it('centers/right-aligns by measuring content and shifting the origin when width is auto', () => {
    // happy-dom 无 canvas → 确定性启发式 'AB' @20 = 24。
    const center = instantiate('scada-text', { text: 'AB', textSize: 20, align: 'center', x: 100 });
    expect(center.width).toBe(24);
    expect(center.x).toBe(100 - 12);
    const right = instantiate('scada-text', { text: 'AB', textSize: 20, align: 'right', x: 100 });
    expect(right.width).toBe(24);
    expect(right.x).toBe(100 - 24);
  });

  it('keeps explicit width and left/default align untouched by the measurement path', () => {
    const explicit = instantiate('scada-text', { text: 'AB', align: 'center', width: 80, x: 5 });
    expect(explicit.width).toBe(80);
    expect(explicit.x).toBe(5);
    const left = instantiate('scada-text', { text: 'AB', x: 5 });
    expect(left.x).toBe(5);
    expect(left.width).toBeUndefined();
  });

  it('coerces non-string text and non-numeric font size to deterministic fallbacks', () => {
    const weird = instantiate('scada-text', {
      text: 123 as unknown as string,
      align: 'center',
      fontFamily: 9 as unknown as string,
      fontWeight: true as unknown as string,
      x: 50,
    });
    // text 非 string → ''；fontSize 缺省 14 → 宽 0，x 不动。
    expect(weird.width).toBe(0);
    expect(weird.x).toBe(50);
  });

  it('applies optional text attrs (textSize/align/fontFamily/fontWeight/textColor) only when present', () => {
    const full = instantiate('scada-text', {
      text: 'hi',
      textSize: 18,
      align: 'left',
      fontFamily: 'Georgia',
      fontWeight: 'bold',
      textColor: '#00ff00',
    });
    expect(full.fontSize).toBe(18);
    expect(full.textAlign).toBe('left');
    expect(full.fontFamily).toBe('Georgia');
    expect(full.fontWeight).toBe('bold');
    expect(full.fill).toBe('#00ff00');
    // fill 已定义 → textColor 不参与（attrs.fill 优先）。
    const withFill = instantiate('scada-text', { text: 'hi', fill: '#ff0000', textColor: '#00ff00' });
    expect(withFill.fill).toBe('#ff0000');
  });
});
