/**
 * page-designer-renderers 公共类型层（design: docs/components/page-designer/design-architecture.md §5）。
 *
 * Bridge 契约按 S1 §5.1：host-owned bridge——设计器不 touch 运行时内部，
 * 选择/锚点经 DOM data 属性投影（编辑装配层），所有文档变更走命令通道
 * （`session.dispatch`，本包不产生任何文档变更）。
 */

import type { RendererEnv, RendererRegistry, SchemaInput } from '@nop-chaos/flux-core';
import type { EditorMode } from '@nop-chaos/editor-core';
import type { SessionNodeId } from '@nop-chaos/page-designer-core';

/** 插入位置指示（S1 §5.1/§5.3）。`invalid` = DropHint 拒绝态（drop-invalid-target 失败路径）。
 * `viaRootFallback`（ux-r5）：hint 来自画布空白处的根容器回退——overlay 据此渲染可辨识的
 * 「插入页面末尾」提示，而非把整个 page 根描边。 */
export type DesignerDropHint =
  | { kind: 'inside'; parentId: SessionNodeId; regionKey: string; index: number; viaRootFallback?: boolean }
  | { kind: 'before'; parentId: SessionNodeId; regionKey: string; index: number }
  | { kind: 'after'; parentId: SessionNodeId; regionKey: string; index: number }
  | { kind: 'invalid' };

/** 拖拽载荷（S1 §5.1）。S2 仅实现 palette 落节点；canvas 内移动留待后续阶段。 */
export type DesignerDragPayload =
  | { source: 'palette'; type: string }
  | { source: 'canvas'; nodeId: SessionNodeId };

/** 画布桥（S1 §5.1 `PageCanvasBridgeProps`）。 */
export interface PageCanvasBridgeProps {
  /** 编辑态真渲染输入（working 投影；预览态由桥内部剥离 sid）。 */
  document: SchemaInput;
  registry: RendererRegistry;
  env: RendererEnv;
  /** `'edit' | 'preview'`，经 core.setMode。 */
  mode: EditorMode;
  selection: readonly SessionNodeId[];
  hoverNodeId: SessionNodeId | null;
  dropHint: DesignerDropHint | null;
  onNodePointerDown(nodeId: SessionNodeId, event: React.PointerEvent): void;
  onNodeHover(nodeId: SessionNodeId | null, event: React.PointerEvent): void;
  onPaneClick(): void;
  onDragOver(hint: DesignerDropHint): void;
  onDragLeave(): void;
  onDrop(payload: DesignerDragPayload, hint: DesignerDropHint): void;
  onRequestDelete(nodeId: SessionNodeId): void;
  onRequestDuplicate(nodeId: SessionNodeId): void;
}
