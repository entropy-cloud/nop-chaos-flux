/**
 * 空容器投影（ux-r5 PD-1）。
 *
 * 设计器侧只读 DOM 投影（与 `data-psid` 锚点同模式，零污染运行时公共路径）：
 * 编辑态下「全部 drop region 均为空」的容器节点，其锚点元素获得
 * `data-pd-empty` + 类型标签 + 行内最小高度——真实 DOM 盒子因此可命中
 * （点击选中 / dragover 落点计算）且对 overlay 可见。预览态锚点收敛为零，
 * 投影随之消失。
 */

import { isSchema } from '@nop-chaos/flux-core';
import type { RendererRegistry, SchemaInput } from '@nop-chaos/flux-core';
import { classifyNode, getDropRegionKeys, getRegionChildren, getSessionId } from '@nop-chaos/page-designer-core';
import type { SessionNodeId } from '@nop-chaos/page-designer-core';
import { NODE_ANCHOR_ATTRIBUTE } from './constants.js';

const EMPTY_CONTAINER_ATTRIBUTE = 'data-pd-empty';
const EMPTY_CONTAINER_LABEL_ATTRIBUTE = 'data-pd-empty-label';
const EMPTY_CONTAINER_MIN_HEIGHT = '44px';

export interface EmptyContainerInfo {
  sid: SessionNodeId;
  type: string;
}

/** 文档树 → 空容器清单（根节点除外：整页空态由 page 级提示 chip 负责）。 */
export function collectEmptyContainers(doc: SchemaInput, registry: RendererRegistry): EmptyContainerInfo[] {
  const out: EmptyContainerInfo[] = [];
  const walk = (node: unknown, isRoot: boolean): void => {
    if (!isSchema(node)) return;
    const schema = node as unknown as Record<string, unknown>;
    const sid = getSessionId(node);
    const type = schema.type as string;
    const definition = registry.get(type);
    const regions = getDropRegionKeys(definition);
    const isContainer = regions.length > 0 && definition != null && classifyNode(definition) !== 'opaque-leaf';
    if (sid && isContainer && !isRoot && regions.every((key) => getRegionChildren(node, key).length === 0)) {
      out.push({ sid, type });
    }
    for (const key of regions) {
      getRegionChildren(node, key).forEach((child) => walk(child, false));
    }
  };
  if (Array.isArray(doc)) {
    doc.forEach((item) => walk(item, true));
  } else {
    walk(doc, true);
  }
  return out;
}

/** 把空容器清单投影到锚点元素（带清除：容器非空时移除投影）。 */
export function syncEmptyContainerPresentation(root: Element, empty: readonly EmptyContainerInfo[]): void {
  const bySid = new Map(empty.map((info) => [info.sid, info]));
  for (const element of root.querySelectorAll(`[${NODE_ANCHOR_ATTRIBUTE}]`)) {
    const sid = element.getAttribute(NODE_ANCHOR_ATTRIBUTE);
    const info = sid ? bySid.get(sid) : undefined;
    if (info) {
      if (element.getAttribute(EMPTY_CONTAINER_ATTRIBUTE) !== 'true') {
        element.setAttribute(EMPTY_CONTAINER_ATTRIBUTE, 'true');
      }
      if (element.getAttribute(EMPTY_CONTAINER_LABEL_ATTRIBUTE) !== info.type) {
        element.setAttribute(EMPTY_CONTAINER_LABEL_ATTRIBUTE, info.type);
      }
      const htmlElement = element as HTMLElement;
      if (htmlElement.style.minHeight !== EMPTY_CONTAINER_MIN_HEIGHT) {
        htmlElement.style.minHeight = EMPTY_CONTAINER_MIN_HEIGHT;
      }
    } else if (element.hasAttribute(EMPTY_CONTAINER_ATTRIBUTE)) {
      element.removeAttribute(EMPTY_CONTAINER_ATTRIBUTE);
      element.removeAttribute(EMPTY_CONTAINER_LABEL_ATTRIBUTE);
      (element as HTMLElement).style.minHeight = '';
    }
  }
}
