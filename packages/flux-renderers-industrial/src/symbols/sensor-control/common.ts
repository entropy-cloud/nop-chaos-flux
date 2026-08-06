import { applyCompositeProps, compositePropSchema, type CompositeParts } from '../composite.js';
import type { LeafNode, ScadaSymbolDefinition, ScadaSymbolProps, SymbolCreateContext } from '../symbol-types.js';
import type { ScadaStateDeclaration } from '../../serialization/config-types.js';

/**
 * 传感控制族符号装配器（I9.3）：
 * - 复合装配/applyProps 角色路由复用 `symbols/composite.ts`；
 * - 默认状态声明：run=绿/stop=灰/fault=红+闪烁（design-data-binding.md §10 惯例色），
 *   消费 I6.3 状态判定 → StateVisualApplier 样式 + animator blink 联动；
 * - 开关/按钮交互外观静态区分（custom.on 等），事件联动归 I11.1。
 */

export type { CompositeParts } from '../composite.js';
export { createCompositeGroup, setAttrs } from '../composite.js';

/** 传感控制族默认状态声明（run=绿/stop=灰/fault=红+闪烁）。 */
export const sensorControlStates: ScadaStateDeclaration = {
  states: {
    run: { style: { fill: '#00cc66' } },
    stop: { style: { fill: '#9e9e9e' } },
    fault: { style: { fill: '#e53935' }, animations: [{ kind: 'blink', period: 500, from: 1, to: 0.2 }] },
  },
  booleanMap: { true: 'run', false: 'stop' },
};

export interface SensorControlSymbolOptions {
  type: string;
  name: string;
  defaults?: Partial<ScadaSymbolProps>;
  build: (ctx: SymbolCreateContext) => { root: LeafNode; parts: CompositeParts };
  /** 图元专属增量钩子（如开关拨杆位置路由），先于通用路由执行。 */
  applyProps?: (node: LeafNode, parts: CompositeParts, props: Partial<ScadaSymbolProps>) => void;
}

/** 传感控制族符号定义装配器：parts WeakMap 绑定 + 统一 applyProps 路由。 */
export function createSensorControlSymbol(options: SensorControlSymbolOptions): ScadaSymbolDefinition {
  const partsOf = new WeakMap<LeafNode, CompositeParts>();
  return {
    type: options.type,
    name: options.name,
    category: 'sensor-control',
    props: compositePropSchema,
    defaults: {
      x: 0,
      y: 0,
      fill: '#607d8b',
      stroke: '#37474f',
      strokeWidth: 2,
      states: sensorControlStates,
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
      applyCompositeProps(node, parts, props);
    },
  };
}
