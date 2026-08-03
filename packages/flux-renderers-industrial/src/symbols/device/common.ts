import { applyCompositeProps, compositePropSchema } from '../composite.js';
import type {
  LeafNode,
  ScadaSymbolDefinition,
  ScadaSymbolProps,
  SymbolCreateContext,
} from '../symbol-types.js';
import type { ScadaAnimation, ScadaStateDeclaration } from '../../serialization/config-types.js';
import type { CompositeParts } from '../composite.js';

/**
 * 设备族符号装配器（I9.1）：
 * - 复合装配/applyProps 角色路由复用 `symbols/composite.ts`；
 * - 设备视觉惯例色（design-data-binding.md §10）：run=绿/stop=灰/fault=红（闪烁）；
 * - 默认旋转动画（run 态转子旋转，消费 I6.3 animator rotate + 状态联动）。
 */

export type { CompositeParts, CompositeApplyOptions } from '../composite.js';
export { applyCompositeProps, createCompositeGroup } from '../composite.js';

export const devicePropSchema = compositePropSchema;

/** 设备族默认状态声明（run=绿/stop=灰/fault=红+闪烁，design-data-binding.md §10 惯例色）。 */
export const deviceStates: ScadaStateDeclaration = {
  states: {
    run: { style: { fill: '#00cc66' } },
    stop: { style: { fill: '#9e9e9e' } },
    fault: { style: { fill: '#e53935' }, animations: [{ kind: 'blink', period: 500, from: 1, to: 0.2 }] },
  },
  booleanMap: { true: 'run', false: 'stop' },
};

/** 设备族默认旋转动画（run 态转子旋转，消费 I6.3 animator rotate + 状态联动）。 */
export const deviceRunRotateAnimation: ScadaAnimation = { kind: 'rotate', period: 1000, when: { state: 'run' } };

export interface DeviceSymbolOptions {
  type: string;
  name: string;
  defaults?: Partial<ScadaSymbolProps>;
  build: (ctx: SymbolCreateContext) => { root: LeafNode; parts: CompositeParts };
  applyOptions?: import('../composite.js').CompositeApplyOptions;
  /** 图元专属增量钩子（如阀芯开度路由），先于通用路由执行。 */
  applyProps?: (node: LeafNode, parts: CompositeParts, props: Partial<ScadaSymbolProps>) => void;
}

/** 设备族符号定义装配器：parts WeakMap 绑定 + 统一 applyProps 路由。 */
export function createDeviceSymbol(options: DeviceSymbolOptions): ScadaSymbolDefinition {
  const partsOf = new WeakMap<LeafNode, CompositeParts>();
  return {
    type: options.type,
    name: options.name,
    category: 'device',
    props: compositePropSchema,
    defaults: {
      x: 0,
      y: 0,
      fill: '#607d8b',
      stroke: '#37474f',
      strokeWidth: 2,
      states: deviceStates,
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
      applyCompositeProps(node, parts, props, options.applyOptions);
    },
  };
}
