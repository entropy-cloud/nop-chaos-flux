import { Group } from 'leafer-ui';
import type { ScadaSymbolNode } from '../serialization/config-types.js';
import { deepEqual } from '../serialization/equality.js';
import { getScadaSymbolDefinition } from './symbol-registry.js';
import { instantiateSymbol } from './symbol-factory.js';
import type {
  LeafNode,
  ScadaSymbolDefinition,
  ScadaSymbolProps,
  SymbolCreateContext,
} from './symbol-types.js';
import { toShapeAttrs } from './base-shapes/common.js';

export const scadaGroupType = 'scada-group';

/**
 * 复合图元（I8.3，design-symbols.md §4.3）：
 * - group：子图元组合（相对坐标 + 相对旋转），与 leafer `Group` 节点一一映射；
 * - instance：注册符号模板复用（参数化实例），实例属性覆盖深合并，
 *   优先级链 `defaults` ← 实例 JSON 属性 ← 绑定/动画/事件声明层；`scale` 整体缩放；`custom` 透传。
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** 深合并（实例优先；对象递归合并，数组/基元整体替换）。 */
export function deepMergeInstanceProps(
  base: ScadaSymbolProps | undefined,
  instance: ScadaSymbolProps,
): ScadaSymbolProps {
  const baseRecord = (base ?? {}) as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = { ...baseRecord };
  for (const [key, value] of Object.entries(instance as unknown as Record<string, unknown>)) {
    if (value === undefined) continue;
    const baseValue = baseRecord[key];
    if (isPlainObject(value) && isPlainObject(baseValue)) {
      out[key] = deepMergeInstanceProps(
        baseValue as unknown as ScadaSymbolProps,
        value as unknown as ScadaSymbolProps,
      );
    } else {
      out[key] = value;
    }
  }
  return out as unknown as ScadaSymbolProps;
}

/** 实例属性覆盖深合并（type → 注册符号 defaults，未注册抛错）。 */
export function mergeInstanceProps(type: string, instanceProps: ScadaSymbolProps): ScadaSymbolProps {
  const definition = getScadaSymbolDefinition(type);
  if (!definition) {
    throw new Error(`unknown scada symbol type: ${type}`);
  }
  return deepMergeInstanceProps(definition.defaults, instanceProps);
}

/** 实例化模板复用：type 指向已注册符号 + 属性覆盖深合并后经 symbol-factory create。 */
export function instantiateInstance(type: string, ctx: SymbolCreateContext): LeafNode {
  const props = mergeInstanceProps(type, ctx.props);
  return instantiateSymbol(type, { ...ctx, props });
}

/** 实例属性覆盖集（diff 于 defaults）：序列化输出最小覆盖集（serialization-instance-drift Failure Path）。 */
export function diffInstanceProps(
  node: ScadaSymbolNode,
  definition: ScadaSymbolDefinition,
): Partial<ScadaSymbolNode> {
  const defaults = (definition.defaults ?? {}) as unknown as Record<string, unknown>;
  const overrides: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node as unknown as Record<string, unknown>)) {
    if (key === 'id' || key === 'type' || key === 'children') continue;
    if (value === undefined) continue;
    // plan 2026-08-05-0653-4 C2：与 `diff.valuesEqual` 共享 `serialization/equality.ts deepEqual`
    // （own-keys 递归 stable，key 序不影响判等）。旧 `JSON.stringify(a) === JSON.stringify(b)`
    // 在第三方 registerScadaSymbol object-typed defaults 与 instance key 序不同时假阴性（判不等），
    // 把等值 object 当 override 写入序列化输出（非最小覆盖集）。共享实现消除该隐患。
    if (deepEqual(value, defaults[key])) continue;
    overrides[key] = value;
  }
  return overrides as Partial<ScadaSymbolNode>;
}

export const scadaGroupDefinition: ScadaSymbolDefinition = {
  type: scadaGroupType,
  name: 'Group',
  category: 'shape',
  props: {
    x: { type: 'number' },
    y: { type: 'number' },
    rotation: { type: 'number' },
    scale: { type: 'number' },
    visible: { type: 'boolean' },
    opacity: { type: 'number' },
  },
  defaults: { x: 0, y: 0 },
  create: ({ props }: SymbolCreateContext) => new Group(toShapeAttrs(props)),
};
