import { Line, Rect } from 'leafer-ui';
import { applyCompositeProps, compositePropSchema } from '../composite.js';
import type { LeafNode, ScadaSymbolDefinition, ScadaSymbolProps, SymbolCreateContext } from '../symbol-types.js';
import type { CompositeParts } from '../composite.js';
import type { ScadaStateDeclaration } from '../../serialization/config-types.js';

/**
 * 电气族符号装配器（559 Phase 1，对标 ThingsBoard HP 通用件 / FUXA Electrical 类）：
 - 复合装配/applyProps 角色路由复用 `symbols/composite.ts`；
 - 电气惯例状态色：closed/run=绿 / open/off=灰 / trip=红+闪烁。
 */

export type { CompositeParts } from '../composite.js';
export { createCompositeGroup, setAttrs } from '../composite.js';

export const electricalPropSchema = compositePropSchema;

/** 电气族默认状态声明（closed=绿/open=灰/trip=红+闪烁；布尔 true→closed）。 */
export const electricalStates: ScadaStateDeclaration = {
  states: {
    closed: { style: { fill: '#00cc66' } },
    open: { style: { fill: '#9e9e9e' } },
    trip: { style: { fill: '#e53935' }, animations: [{ kind: 'blink', period: 400, from: 1, to: 0.25 }] },
  },
  booleanMap: { true: 'closed', false: 'open' },
};

export interface ElectricalSymbolOptions {
  type: string;
  name: string;
  defaults?: Partial<ScadaSymbolProps>;
  build: (ctx: SymbolCreateContext) => { root: LeafNode; parts: CompositeParts };
  applyProps?: (node: LeafNode, parts: CompositeParts, props: Partial<ScadaSymbolProps>) => void;
}

/** 电气族符号定义装配器：parts WeakMap 绑定 + 统一 applyProps 路由（category: electrical）。 */
export function createElectricalSymbol(options: ElectricalSymbolOptions): ScadaSymbolDefinition {
  const partsOf = new WeakMap<LeafNode, CompositeParts>();
  return {
    type: options.type,
    name: options.name,
    category: 'electrical',
    props: compositePropSchema,
    defaults: {
      x: 0,
      y: 0,
      fill: '#455a64',
      stroke: '#263238',
      strokeWidth: 2,
      states: electricalStates,
      ...options.defaults,
    },
    create: (ctx) => {
      const { root, parts } = options.build(ctx);
      partsOf.set(root, parts);
      return root;
    },
    applyProps: (node, props) => {
      const parts = partsOf.get(node);
      if (!parts) return;
      options.applyProps?.(node, parts, props);
      applyCompositeProps(node, parts, props, { rotationTarget: 'root' });
    },
  };
}

/** 电气接线端子（左右引出线 + 端子小方块）。 */
export function buildTerminals(
  width: number,
  height: number,
  stroke: string | undefined,
): { wireL: LeafNode; wireR: LeafNode; padL: LeafNode; padR: LeafNode } {
  const midY = height / 2;
  const wireL = new Line({
    name: 'wire-left',
    points: [0, midY, width * 0.14, midY],
    stroke: stroke ?? '#263238',
    strokeWidth: 2,
  }) as LeafNode;
  const wireR = new Line({
    name: 'wire-right',
    points: [width * 0.86, midY, width, midY],
    stroke: stroke ?? '#263238',
    strokeWidth: 2,
  }) as LeafNode;
  const padL = new Rect({
    name: 'pad-left',
    x: width * 0.14,
    y: midY - height * 0.06,
    width: width * 0.07,
    height: height * 0.12,
    fill: '#ffb300',
    stroke: '#263238',
    strokeWidth: 1,
  }) as LeafNode;
  const padR = new Rect({
    name: 'pad-right',
    x: width * 0.79,
    y: midY - height * 0.06,
    width: width * 0.07,
    height: height * 0.12,
    fill: '#ffb300',
    stroke: '#263238',
    strokeWidth: 1,
  }) as LeafNode;
  return { wireL, wireR, padL, padR };
}
