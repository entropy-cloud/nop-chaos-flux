import { describe, it, expect } from 'vitest';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createDefaultEnv } from '@nop-chaos/flux-react';
import { ReverseIndex, collectBindingPointIds } from './reverse-index.js';
import type { ScadaSymbolNode } from '../serialization/config-types.js';

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());
const env = createDefaultEnv();
const evalContext = { compiler: expressionCompiler, env };

const symbolTree: ScadaSymbolNode[] = [
  {
    id: 'pump-1',
    type: 'scada-rect',
    x: 0,
    y: 0,
    bindings: {
      fill: { expression: '${level > 50 ? \'#f00\' : \'#0f0\'}' },
      rotation: { point: 'speed' },
    },
  },
  {
    id: 'valve-group',
    type: 'scada-group',
    x: 0,
    y: 0,
    children: [
      {
        id: 'valve-1',
        type: 'scada-rect',
        x: 0,
        y: 0,
        bindings: {
          text: { point: 'open' },
          opacity: { expression: '${fault ? 0.5 : 1}' },
        },
      },
    ],
  },
];

describe('collectBindingPointIds (I18 flux probe)', () => {
  it('should union point refs and expression probe paths', () => {
    expect(collectBindingPointIds({ point: 'v1' }, evalContext)).toEqual(['v1']);
    expect(collectBindingPointIds({ expression: '${v1 + v2}' }, evalContext).sort()).toEqual(['v1', 'v2']);
    expect(collectBindingPointIds({ point: 'v1', expression: '${v2 + v1}' }, evalContext).sort()).toEqual(['v1', 'v2']);
    expect(collectBindingPointIds({ map: { a: 'x' } }, evalContext)).toEqual([]);
  });

  it('should return [] for expression bindings without compiler context', () => {
    expect(collectBindingPointIds({ expression: '${v1 + v2}' })).toEqual([]);
    expect(collectBindingPointIds({ point: 'v1' })).toEqual(['v1']);
  });
});

describe('ReverseIndex (I18 flux probe)', () => {
  it('should build pointId -> [{symbolId, property}] from symbol tree (递归扫描)', () => {
    const index = new ReverseIndex(symbolTree, evalContext);
    expect(index.lookup('level')).toEqual([{ symbolId: 'pump-1', property: 'fill' }]);
    expect(index.lookup('speed')).toEqual([{ symbolId: 'pump-1', property: 'rotation' }]);
    expect(index.lookup('open')).toEqual([{ symbolId: 'valve-1', property: 'text' }]);
    expect(index.lookup('fault')).toEqual([{ symbolId: 'valve-1', property: 'opacity' }]);
    expect(index.lookup('unknown')).toEqual([]);
  });

  it('should skip symbols without bindings (空绑定不产生索引项)', () => {
    const index = new ReverseIndex([
      { id: 'plain', type: 'scada-rect', x: 0, y: 0 },
      { id: 'empty-binding', type: 'scada-rect', x: 0, y: 0, bindings: {} },
    ]);
    expect(index.pointIds()).toEqual([]);
    expect(index.lookup('x')).toEqual([]);
  });

  it('should maintain incrementally on add/remove/update (applyDiff 场景)', () => {
    const index = new ReverseIndex(symbolTree, evalContext);
    index.addSymbol({ id: 'fan-1', type: 'scada-rect', x: 0, y: 0, bindings: { fill: { point: 'level' } } });
    expect(index.lookup('level')).toContainEqual({ symbolId: 'fan-1', property: 'fill' });

    index.removeSymbol('fan-1');
    expect(index.lookup('level')).not.toContainEqual({ symbolId: 'fan-1', property: 'fill' });

    index.updateSymbol({ id: 'pump-1', type: 'scada-rect', x: 0, y: 0, bindings: { opacity: { point: 'level' } } });
    expect(index.lookup('level')).toContainEqual({ symbolId: 'pump-1', property: 'opacity' });
    expect(index.lookup('level')).not.toContainEqual({ symbolId: 'pump-1', property: 'fill' });
    expect(index.lookup('speed')).toEqual([]);
  });

  it('should rebuild from scratch via build()', () => {
    const index = new ReverseIndex(symbolTree, evalContext);
    index.build([
      { id: 'a', type: 'scada-rect', x: 0, y: 0, bindings: { x: { point: 'p1' } } },
    ]);
    expect(index.lookup('level')).toEqual([]);
    expect(index.lookup('p1')).toEqual([{ symbolId: 'a', property: 'x' }]);
  });

  it('removeSymbol on unknown id should be a no-op', () => {
    const index = new ReverseIndex(symbolTree, evalContext);
    index.removeSymbol('ghost');
    expect(index.lookup('level')).toEqual([{ symbolId: 'pump-1', property: 'fill' }]);
  });

  it('should work without evalContext (point bindings only, no expression refs)', () => {
    const index = new ReverseIndex([
      {
        id: 'sym',
        type: 'scada-rect',
        x: 0,
        y: 0,
        bindings: {
          fill: { point: 'level' },
          text: { expression: '${v1 + v2}' },
        },
      },
    ]);
    expect(index.lookup('level')).toEqual([{ symbolId: 'sym', property: 'fill' }]);
    expect(index.lookup('v1')).toEqual([]);
  });
});
