import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetLeaferMock } from '../../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../register-builtin.js';
import { clearScadaSymbolRegistry } from '../symbol-registry.js';
import { instantiateSymbol } from '../symbol-factory.js';
import type { ScadaSymbolProps } from '../symbol-types.js';

vi.mock('leafer-ui', () => import('../../test-support/leafer-ui-mock.js'));

const instantiate = (type: string, props: Partial<ScadaSymbolProps> = {}) =>
  instantiateSymbol(type, {
    id: 's',
    props: { x: 0, y: 0, ...props } as ScadaSymbolProps,
    engine: {},
    config: { world: { x: 0, y: 0, scale: 1 } },
  }) as unknown as Record<string, unknown>;

beforeEach(() => {
  resetLeaferMock();
  clearScadaSymbolRegistry();
  registerBuiltinScadaSymbols();
});

describe('base-shapes style refinement (I8.1: fillStyle/shadow/stroke combos)', () => {
  it('should pass a gradient fillStyle object through to the leafer style system', () => {
    const gradient = {
      type: 'linear',
      from: { x: 0, y: 0 },
      to: { x: 1, y: 1 },
      stops: [
        { offset: 0, color: '#ff0000' },
        { offset: 1, color: '#0000ff' },
      ],
    };
    const node = instantiate('scada-rect', { fillStyle: gradient });
    expect(node.fill).toEqual(gradient);
  });

  it('should pass a string fillStyle through as the leafer fill paint', () => {
    const node = instantiate('scada-ellipse', { fillStyle: 'linear-gradient(45deg, #ff0000, #0000ff)' });
    expect(node.fill).toBe('linear-gradient(45deg, #ff0000, #0000ff)');
  });

  it('fillStyle should take precedence over the fill color shorthand', () => {
    const node = instantiate('scada-round-rect', {
      fill: '#00ff00',
      fillStyle: { type: 'radial', stops: [{ offset: 0, color: '#fff' }] },
    });
    expect(node.fill).toEqual({ type: 'radial', stops: [{ offset: 0, color: '#fff' }] });
  });

  it('should apply the shadow style object on fill shapes', () => {
    const node = instantiate('scada-rect', { shadow: { x: 3, y: 4, blur: 6, color: 'rgba(0,0,0,0.4)' } });
    expect(node.shadow).toEqual({ x: 3, y: 4, blur: 6, color: 'rgba(0,0,0,0.4)' });
  });

  it('should combine strokeWidth with strokeDash on rect/ellipse/polygon', () => {
    const rect = instantiate('scada-rect', { strokeWidth: 4, strokeDash: [8, 4], stroke: '#333' });
    expect(rect.strokeWidth).toBe(4);
    expect(rect.dashPattern).toEqual([8, 4]);
    const ellipse = instantiate('scada-ellipse', { strokeWidth: 2, strokeDash: [2, 2] });
    expect(ellipse.strokeWidth).toBe(2);
    expect(ellipse.dashPattern).toEqual([2, 2]);
    const polygon = instantiate('scada-polygon', { strokeWidth: 3, strokeDash: [6, 3] });
    expect(polygon.strokeWidth).toBe(3);
    expect(polygon.dashPattern).toEqual([6, 3]);
  });

  it('should combine strokeWidth with strokeDash on line/arrow/pipe', () => {
    const line = instantiate('scada-line', { strokeWidth: 2, strokeDash: [4, 4] });
    expect(line.strokeWidth).toBe(2);
    expect(line.dashPattern).toEqual([4, 4]);
    const arrow = instantiate('scada-arrow', { strokeWidth: 1.5, strokeDash: [1, 2] });
    expect(arrow.strokeWidth).toBe(1.5);
    expect(arrow.dashPattern).toEqual([1, 2]);
    const pipe = instantiate('scada-pipe', { strokeWidth: 8, strokeDash: [10, 5] });
    expect(pipe.strokeWidth).toBe(8);
    expect(pipe.dashPattern).toEqual([10, 5]);
  });

  it('should forward dashOffset (flow animation phase) onto the node', () => {
    const node = instantiate('scada-pipe', { dashOffset: 30 });
    expect(node.dashOffset).toBe(30);
  });

  it('should instantiate all 8 shapes with the refined style props without crashing', () => {
    const styleProps: Partial<ScadaSymbolProps> = {
      fillStyle: { type: 'linear', stops: [{ offset: 0, color: '#111' }] },
      shadow: { x: 1, y: 1, blur: 2, color: '#000' },
      strokeWidth: 2,
      strokeDash: [2, 2],
    };
    for (const type of [
      'scada-rect',
      'scada-round-rect',
      'scada-ellipse',
      'scada-line',
      'scada-arrow',
      'scada-pipe',
      'scada-text',
      'scada-polygon',
    ]) {
      const node = instantiate(type, { ...styleProps, text: 'x' });
      expect(node).toBeDefined();
    }
  });
});
