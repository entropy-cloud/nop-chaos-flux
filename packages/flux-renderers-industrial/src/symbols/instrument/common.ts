import { applyCompositeProps, compositePropSchema, type CompositeParts } from '../composite.js';
import type { LeafNode, ScadaSymbolDefinition, ScadaSymbolProps, SymbolCreateContext } from '../symbol-types.js';

/**
 * 仪表族符号装配器（I9.2）：
 * - 复合装配/applyProps 角色路由复用 `symbols/composite.ts`（needle→rotor、liquid/bar→extent、label→text）；
 * - 量程换算（applyScale/formatValue）由绑定声明消费（bindings.rotation/height/width/text 的 scale/format），
 *   本层只负责换算结果的增量路由。
 */

export type { CompositeParts } from '../composite.js';
export { createCompositeGroup } from '../composite.js';

export interface InstrumentSymbolOptions {
  type: string;
  name: string;
  defaults?: Partial<ScadaSymbolProps>;
  build: (ctx: SymbolCreateContext) => { root: LeafNode; parts: CompositeParts };
  /** 图元专属增量钩子（如液位 y 锚定），先于通用路由执行。 */
  applyProps?: (node: LeafNode, parts: CompositeParts, props: Partial<ScadaSymbolProps>) => void;
}

/** 仪表族符号定义装配器：parts WeakMap 绑定 + 统一 applyProps 路由。 */
export function createInstrumentSymbol(options: InstrumentSymbolOptions): ScadaSymbolDefinition {
  const partsOf = new WeakMap<LeafNode, CompositeParts>();
  return {
    type: options.type,
    name: options.name,
    category: 'instrument',
    props: compositePropSchema,
    defaults: {
      x: 0,
      y: 0,
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
