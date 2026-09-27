/**
 * 文档树寻址与 region 投影（design: docs/components/page-designer/design-architecture.md §5.3/§7.2）。
 *
 * 插入位置由 `definition.fields` 驱动：含 `kind: 'region'` 规则的 type 是容器。
 * region 内容在授权态 schema 上存于 `regionKey`（`rule.regionKey ?? rule.key`）键下，
 * 形态为数组（`body: [...]`）或单节点（`header: {...}`）。
 *
 * 寻址两层各司其职（S1 §7.1）：patch 的 path 是单条命令内的位置寻址；
 * selection/画布锚点用跨结构变换稳定的 sid（`xui:sid`，S1 §6）。
 */

import { isSchema } from '@nop-chaos/flux-core';
import type {
  BaseSchema,
  RendererDefinition,
  RendererRegistry,
  SchemaFieldRule,
  SchemaInput,
} from '@nop-chaos/flux-core';
import { getSessionId } from './round-trip.js';
import type { SessionNodeId } from './types.js';

function isStructuralKind(rule: SchemaFieldRule): boolean {
  return rule.kind === 'region' || rule.kind === 'value-or-region';
}

/**
 * 结构 region 键（`kind: 'region'`，S1 §5.3 容器判定 + insert 的合法落点）。
 */
export function getDropRegionKeys(definition: RendererDefinition | undefined): string[] {
  if (!definition?.fields) return [];
  return definition.fields
    .filter((rule) => rule.kind === 'region')
    .map((rule) => rule.regionKey ?? rule.key ?? '');
}

/**
 * 结构容器键（`region` + `value-or-region`，树遍历/删除/移动/替换的容器超集——
 * value-or-region 在 region 形态下同样承载子树）。
 */
export function getContainerKeys(definition: RendererDefinition | undefined): string[] {
  if (!definition?.fields) return [];
  return definition.fields.filter(isStructuralKind).map((rule) => rule.regionKey ?? rule.key ?? '');
}

/** 含 `kind: 'region'` 规则的 type 是容器（S1 §5.3）。 */
export function isContainerDefinition(definition: RendererDefinition | undefined): boolean {
  return getDropRegionKeys(definition).length > 0;
}

/**
 * 节点的子容器键。已注册 definition → fields 规则（权威契约面）；
 * 未注册（导入校验拒后的残缺树等防御路径）→ 全部「值为 schema 节点/节点数组」的自有键兜底。
 */
export function getChildContainerKeys(
  node: BaseSchema,
  registry: RendererRegistry,
): { keys: string[]; fromDefinition: boolean } {
  const definition = registry.get(node.type);
  if (definition) {
    return { keys: getContainerKeys(definition), fromDefinition: true };
  }
  const keys = Object.keys(node).filter((key) => {
    const value: unknown = node[key];
    if (Array.isArray(value)) return value.some((item) => isSchema(item));
    return isSchema(value);
  });
  return { keys, fromDefinition: false };
}

/**
 * 定位帧（根→节点路径上的一跳）。
 * - 数组形态：`items` 为数组副本来源，`owner`/`ownerKey` 记录数组挂载点
 *   （根数组时 `owner = null`）。
 * - 键形态：`node[key]` 为单节点 region。
 */
export type NodeFrame =
  | { kind: 'array'; items: BaseSchema[]; index: number; owner: BaseSchema | null; ownerKey: string | null }
  | { kind: 'key'; node: BaseSchema; key: string };

export interface NodeLocation {
  node: BaseSchema;
  /** 直接持有者：数组容器为其父节点（根数组时 `null`）；单节点容器为父节点；根节点为 `null`。 */
  parent: BaseSchema | null;
  /** 数组容器键（挂载于父节点的 regionKey）；单节点容器为该键；根节点为 `null`。 */
  containerKey: string | null;
  /** 数组容器内下标；单节点容器恒 0；根节点恒 0。 */
  index: number;
  /** 根→节点帧序列（不含节点自身）。 */
  frames: NodeFrame[];
}

function frameParent(frame: NodeFrame): BaseSchema | null {
  if (frame.kind === 'key') return frame.node;
  return frame.owner;
}

function frameContainerKey(frame: NodeFrame): string | null {
  if (frame.kind === 'key') return frame.key;
  return frame.ownerKey;
}

function searchNode(
  node: BaseSchema,
  sid: SessionNodeId,
  registry: RendererRegistry,
  frames: NodeFrame[],
  out: NodeLocation[],
): void {
  const { keys } = getChildContainerKeys(node, registry);
  for (const key of keys) {
    const value: unknown = node[key];
    if (Array.isArray(value)) {
      const items = value as unknown[];
      items.forEach((raw, index) => {
        if (!isSchema(raw)) return;
        const childFrames: NodeFrame[] = [
          ...frames,
          { kind: 'array', items: items as BaseSchema[], index, owner: node, ownerKey: key },
        ];
        if (getSessionId(raw) === sid) {
          const frame = childFrames[childFrames.length - 1];
          out.push({
            node: raw,
            parent: frameParent(frame),
            containerKey: frameContainerKey(frame),
            index,
            frames: childFrames,
          });
        }
        searchNode(raw, sid, registry, childFrames, out);
      });
    } else if (isSchema(value)) {
      const childFrames: NodeFrame[] = [...frames, { kind: 'key', node, key }];
      if (getSessionId(value) === sid) {
        const frame = childFrames[childFrames.length - 1];
        out.push({
          node: value,
          parent: frameParent(frame),
          containerKey: key,
          index: 0,
          frames: childFrames,
        });
      }
      searchNode(value, sid, registry, childFrames, out);
    }
  }
}

/** 按 sid 定位节点（前序遍历；注入保证树内唯一，命中多个取首个）。 */
export function locateNode(
  doc: SchemaInput,
  sid: SessionNodeId,
  registry: RendererRegistry,
): NodeLocation | undefined {
  const out: NodeLocation[] = [];
  if (isSchema(doc)) {
    if (getSessionId(doc) === sid) {
      out.push({ node: doc, parent: null, containerKey: null, index: 0, frames: [] });
    }
    searchNode(doc, sid, registry, [], out);
  } else if (Array.isArray(doc)) {
    const items = doc as unknown[];
    items.forEach((raw, index) => {
      if (!isSchema(raw)) return;
      const childFrames: NodeFrame[] = [
        { kind: 'array', items: items as BaseSchema[], index, owner: null, ownerKey: null },
      ];
      if (getSessionId(raw) === sid) {
        out.push({ node: raw, parent: null, containerKey: null, index, frames: childFrames });
      }
      searchNode(raw, sid, registry, childFrames, out);
    });
  }
  return out[0];
}

/** 便捷查询：按 sid 取节点。 */
export function findNodeById(
  doc: SchemaInput,
  sid: SessionNodeId,
  registry: RendererRegistry,
): BaseSchema | undefined {
  return locateNode(doc, sid, registry)?.node;
}

/** 帧内替换：键帧替换 `node[key]`；数组帧替换 `items[index]` 并挂回 owner。 */
function attachToFrame(frame: NodeFrame, value: unknown): unknown {
  if (frame.kind === 'key') {
    return { ...frame.node, [frame.key]: value };
  }
  const arr = [...frame.items];
  arr[frame.index] = value as BaseSchema;
  return frame.owner ? { ...frame.owner, [frame.ownerKey as string]: arr } : arr;
}

/**
 * 不可变更新：按定位帧自底向上重建祖先链（INV-C 结构共享——未触碰子树保持引用）。
 * `updater` 返回替换后的节点值。
 */
export function rebuildAtLocation(
  doc: SchemaInput,
  location: NodeLocation,
  updater: (node: BaseSchema) => unknown,
): SchemaInput {
  let value: unknown = updater(location.node);
  for (let i = location.frames.length - 1; i >= 0; i -= 1) {
    value = attachToFrame(location.frames[i], value);
  }
  return value as SchemaInput;
}

/**
 * 不可变删除：数组容器 splice 该下标；单节点容器删除该 region 键。
 * 根节点（frames 为空）不可删除，调用方须先行校验。返回 `{ doc, removed }`。
 */
export function removeAtLocation(
  doc: SchemaInput,
  location: NodeLocation,
): { doc: SchemaInput; removed: BaseSchema } {
  let value: unknown;
  for (let i = location.frames.length - 1; i >= 0; i -= 1) {
    const frame = location.frames[i];
    if (frame.kind === 'array') {
      const arr = [...frame.items];
      if (i === location.frames.length - 1) {
        value = arr.splice(frame.index, 1)[0];
        value = frame.owner ? { ...frame.owner, [frame.ownerKey as string]: arr } : arr;
        continue;
      }
      arr[frame.index] = value as BaseSchema;
      value = frame.owner ? { ...frame.owner, [frame.ownerKey as string]: arr } : arr;
    } else if (i === location.frames.length - 1) {
      const clone = { ...frame.node };
      delete clone[frame.key];
      value = clone;
    } else {
      value = { ...frame.node, [frame.key]: value };
    }
  }
  return { doc: value as SchemaInput, removed: location.node };
}

/** 读取节点 region 当前子节点投影（数组返回数组；单节点包装为 `[node]`；缺失为 `[]`）。 */
export function getRegionChildren(node: BaseSchema, regionKey: string): BaseSchema[] {
  const value: unknown = node[regionKey];
  if (Array.isArray(value)) return (value as unknown[]).filter(isSchema);
  if (isSchema(value)) return [value];
  return [];
}

/** region 当前形态：`'array' | 'single' | 'absent'`。 */
export function getRegionForm(node: BaseSchema, regionKey: string): 'array' | 'single' | 'absent' {
  const value: unknown = node[regionKey];
  if (Array.isArray(value)) return 'array';
  if (isSchema(value)) return 'single';
  return 'absent';
}
