/**
 * 画布几何模型与命中检测（S1 §5.1/§5.3）。
 *
 * 纯函数层：输入 = 文档树投影（含锚点矩形），输出 = 命中节点 / DropHint。
 * canvas 层只做「手势→回调翻译与 dropHint 几何计算」，不产生任何文档变更；
 * 落点合法性规则（regionKey 列表）由 core 的 tree-navigation 提供，此处不重复实现。
 *
 * 命中规则：preorder 序中最后一个矩形包含命中点的锚点（深层覆盖浅层）。
 * DropHint：
 * - 命中容器（`getDropRegionKeys` 非空）→ `inside`（追加到首个 region 末尾）；
 * - 命中原子且有父 region → `before`/`after`（按命中点相对命中矩形中线的位置）；
 * - 其余（根级原子/六域不透明叶子内部）→ `invalid`（拒绝态）。
 */

import type { RendererRegistry, SchemaInput } from '@nop-chaos/flux-core';
import { isSchema } from '@nop-chaos/flux-core';
import type { SessionNodeId } from '@nop-chaos/page-designer-core';
import {
  classifyNode,
  getDropRegionKeys,
  getChildContainerKeys,
  getRegionChildren,
  getSessionId,
} from '@nop-chaos/page-designer-core';
import type { DesignerDropHint } from './types.js';

export interface PixelRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 锚点节点投影（画布几何模型的一跳）。 */
export interface AnchorNodeModel {
  sid: SessionNodeId;
  type: string;
  parentSid: SessionNodeId | null;
  /** 父 region 键（根节点为 null）。 */
  containerKey: string | null;
  index: number;
  rect: PixelRect | null;
}

export interface CanvasLayoutModel {
  /** preorder（父先于子）。 */
  nodes: AnchorNodeModel[];
  rootSid: SessionNodeId | null;
}

/** 锚点查询：sid → 元素（桥把 `[data-psid]` 索引注入）。 */
export type AnchorLookup = (sid: SessionNodeId) => Element | null;
/** 矩形解析：元素 → 视口坐标矩形（无锚点/零尺寸 → null）。 */
export type RectResolver = (element: Element) => PixelRect | null;

function walkModel(
  node: unknown,
  registry: RendererRegistry,
  parentSid: SessionNodeId | null,
  containerKey: string | null,
  index: number,
  resolveRect: RectResolver | null,
  anchorOf: AnchorLookup | null,
  out: AnchorNodeModel[],
): void {
  if (!isSchema(node)) return;
  const schema = node as unknown as Record<string, unknown>;
  const sid = getSessionId(node);
  const entry: AnchorNodeModel = {
    sid: sid ?? '',
    type: schema.type as string,
    parentSid,
    containerKey,
    index,
    rect: null,
  };
  if (sid) {
    const element = anchorOf?.(sid);
    if (element && resolveRect) {
      entry.rect = resolveRect(element);
    }
    out.push(entry);
    parentSid = sid;
  }
  const { keys } = getChildContainerKeys(node, registry);
  for (const key of keys) {
    getRegionChildren(node, key).forEach((child, childIndex) => {
      walkModel(child, registry, parentSid, key, childIndex, resolveRect, anchorOf, out);
    });
  }
}

/**
 * 文档 → 锚点模型。`anchorOf`/`resolveRect` 缺省时 rect 全 null（纯树投影，
 * 单测用）；传入后矩形取锚点 `getBoundingClientRect`（视口坐标，与
 * pointer clientX/Y 同一坐标系）。
 */
export function buildCanvasLayoutModel(
  doc: SchemaInput,
  registry: RendererRegistry,
  geometry?: { anchorOf: AnchorLookup; resolveRect: RectResolver },
): CanvasLayoutModel {
  const nodes: AnchorNodeModel[] = [];
  const walk = (item: unknown, index: number) =>
    walkModel(
      item,
      registry,
      null,
      null,
      index,
      geometry?.resolveRect ?? null,
      geometry?.anchorOf ?? null,
      nodes,
    );
  if (Array.isArray(doc)) {
    doc.forEach((item, index) => walk(item, index));
  } else {
    walk(doc, 0);
  }
  return { nodes, rootSid: nodes[0]?.sid ?? null };
}

function rectContainsPoint(rect: PixelRect, x: number, y: number): boolean {
  return x >= rect.left && x <= rect.left + rect.width && y >= rect.top && y <= rect.top + rect.height;
}

export { rectContainsPoint as containsPoint };

/** 命中检测：preorder 序最后一个矩形包含命中点的锚点（深层覆盖浅层）。 */
export function hitTestLayout(
  model: CanvasLayoutModel,
  x: number,
  y: number,
): AnchorNodeModel | null {
  let hit: AnchorNodeModel | null = null;
  for (const node of model.nodes) {
    if (node.rect && rectContainsPoint(node.rect, x, y)) {
      hit = node;
    }
  }
  return hit;
}

export interface DropHintContext {
  model: CanvasLayoutModel;
  registry: RendererRegistry;
  /** sid → 节点（含未锚定节点）。 */
  findNode(sid: SessionNodeId): unknown;
}

/**
 * DropHint 几何计算（S1 §5.3：合法性信息来自 definition.fields，经 core helpers）。
 * 返回 `null` = 画布空白（调用方回退根容器）。
 */
export function computeDropHintAt(ctx: DropHintContext, x: number, y: number): DesignerDropHint | null {
  const hit = hitTestLayout(ctx.model, x, y);
  if (!hit) return null;

  const hitNode = ctx.findNode(hit.sid);
  if (!isSchema(hitNode)) return { kind: 'invalid' };

  const dropRegions = getDropRegionKeys(ctx.registry.get(hit.type));
  const hitDefinition = ctx.registry.get(hit.type);
  const hitIsOpaque = hitDefinition ? classifyNode(hitDefinition) === 'opaque-leaf' : false;
  // opaque-leaf 不展开（S1 §10.1）：六域容器只允许整体替换/兄弟插入，inside 拒绝。
  if (dropRegions.length > 0 && !hitIsOpaque) {
    const regionKey = dropRegions[0];
    const childCount = getRegionChildren(hitNode, regionKey).length;
    return { kind: 'inside', parentId: hit.sid, regionKey, index: childCount };
  }

  if (hit.parentSid && hit.containerKey) {
    const parent = ctx.findNode(hit.parentSid);
    if (isSchema(parent)) {
      const after = y >= hit.rect!.top + hit.rect!.height / 2;
      return {
        kind: after ? 'after' : 'before',
        parentId: hit.parentSid,
        regionKey: hit.containerKey,
        index: after ? hit.index + 1 : hit.index,
      };
    }
  }

  return { kind: 'invalid' };
}

/** 根容器回退 hint（画布空白处落点：插入首个 region 末尾）。 */
export function buildRootDropHint(
  doc: SchemaInput,
  registry: RendererRegistry,
): DesignerDropHint | null {
  const root = Array.isArray(doc) ? doc[0] : doc;
  if (!isSchema(root)) return null;
  const sid = getSessionId(root);
  if (!sid) return null;
  const regions = getDropRegionKeys(registry.get(root['type'] as string));
  if (regions.length === 0) return { kind: 'invalid' };
  return { kind: 'inside', parentId: sid, regionKey: regions[0], index: getRegionChildren(root, regions[0]).length };
}
