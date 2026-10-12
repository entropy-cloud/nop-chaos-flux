/**
 * 元素级剪贴板纯逻辑（plan 527 Phase 2）——复制深拷贝、粘贴目标解析。
 * sid 重生成由 core insertNode 契约承担（INV-D：新落子树整体重新注入新 sid），
 * 本模块只负责"剪贴板内容与宿主文档解耦"与"插入上下文解析"两个纯面。
 */

import { cloneDeep } from '@nop-chaos/flux-core';
import { isSchema } from '@nop-chaos/flux-core';
import type { RendererRegistry, SchemaInput } from '@nop-chaos/flux-core';
import type { SessionNodeId } from '@nop-chaos/page-designer-core';
import {
  findNodeById,
  getDropRegionKeys,
  getSessionId,
  locateNode,
} from '@nop-chaos/page-designer-core';
import { getSchemaType } from './schema-type.js';

/** 复制：深拷贝剪贴板子树，与宿主文档完全解耦（后续编辑不别名）。 */
export function copyNodeToClipboard(node: SchemaInput): SchemaInput {
  return cloneDeep(node);
}

interface ResolvePasteTargetArgs {
  working: SchemaInput;
  registry: RendererRegistry;
  /** 显式粘贴目标（右键节点）；缺省回退当前选中，再回退根 region。 */
  targetNodeId?: SessionNodeId | null;
  selectedNodeId: SessionNodeId | null;
}

interface ResolvedPasteTarget {
  parentId: SessionNodeId;
  regionKey: string;
}

/** 粘贴插入上下文解析（与 insertIntoContext/handlePaste 的三分支一致）：显式目标
 * 或选中节点可容纳 → inside；叶子 → 父容器原位；否则根首个 region。 */
export function resolvePasteTarget(args: ResolvePasteTargetArgs): ResolvedPasteTarget | null {
  const { working, registry, targetNodeId, selectedNodeId } = args;
  const root = working;
  const rootSid = isSchema(root) ? (getSessionId(root) ?? null) : null;

  const effectiveTargetId = targetNodeId ?? selectedNodeId;
  const effectiveTargetNode = effectiveTargetId
    ? (findNodeById(working, effectiveTargetId, registry) ?? null)
    : null;
  if (effectiveTargetId && effectiveTargetNode) {
    const definition = registry.get(getSchemaType(effectiveTargetNode) ?? '');
    const regions = getDropRegionKeys(definition);
    if (regions.length > 0) {
      return { parentId: effectiveTargetId, regionKey: regions[0] };
    }
    const location = locateNode(working, effectiveTargetId, registry);
    if (location?.parent && location.containerKey) {
      const parentSid = getSessionId(location.parent);
      if (parentSid) {
        return { parentId: parentSid, regionKey: location.containerKey };
      }
    }
    return null;
  }

  if (!rootSid) return null;
  const rootRegions = isSchema(root)
    ? getDropRegionKeys(registry.get(getSchemaType(root) ?? ''))
    : [];
  if (rootRegions.length === 0) return null;
  return { parentId: rootSid, regionKey: rootRegions[0] };
}
