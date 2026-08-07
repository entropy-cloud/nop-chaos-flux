import type { ActionSchema, BaseSchema, SchemaObject } from '@nop-chaos/flux-core';
import type { ScadaConfig } from '../serialization/config-types.js';

export type { ScadaConfig } from '../serialization/config-types.js';

/**
 * 视口策略（复用 runtime ScadaCanvasSchema.viewport 语义，design-renderer.md §4.1）。
 */
export type ScadaEditorViewportPolicy = { fit?: 'contain' | 'fill'; center?: boolean };

/**
 * `scada-editor-canvas` renderer schema 完整版（E5.1，design-renderer.md §4.1）。
 *
 * config/width/height/mode/commitPolicy/viewport 为 prop；
 * palette/inspector/toolbox/statusBar 为 region；
 * events 为**整体 prop**（D-1 裁定，非 events.* event 规则——flux-compiler classifyField
 * 仅匹配顶层 key，ActionSchema 字面量经 props 通道保留）。
 */
export interface ScadaEditorCanvasSchema extends BaseSchema {
  type: 'scada-editor-canvas';
  /** 编辑会话初始组态（启动编辑器时装载的画面）；缺省为空场景。 */
  config?: string | (ScadaConfig & SchemaObject);
  /** 画布尺寸（px）；缺省填满容器。 */
  width?: number;
  height?: number;
  /** 编辑模式（edit ↔ preview）；缺省 edit。 */
  mode?: 'edit' | 'preview';
  /** 提交策略（manual 缺省 / auto）；缺省 manual。 */
  commitPolicy?: 'manual' | 'auto';
  /** 视口策略（fit/center，复用 runtime 引擎命令）。 */
  viewport?: ScadaEditorViewportPolicy;
  /** 图元库面板 region（E5.2）。 */
  palette?: SchemaObject;
  /** 属性面板 region（E5.3）。 */
  inspector?: SchemaObject;
  /** 工具箱 region（E9.1，M1 占位不渲染内容）。 */
  toolbox?: SchemaObject;
  /** 状态栏 region（含 undo/redo 边界提示，M1 占位）。 */
  statusBar?: SchemaObject;
  /** schema 级事件（整体 prop，D-1 裁定）。 */
  events?: ScadaEditorCanvasEvents;
}

/**
 * `scada-editor-canvas` schema 级事件（design-renderer.md §4.1 完整版）。
 * 经 `createNormalizedActionEvent` + `helpers.dispatch` 派发（与 runtime scada-canvas 同通道）。
 */
export interface ScadaEditorCanvasEvents extends SchemaObject {
  /** 编辑会话变更（selection/mode/canUndo/canRedo）。 */
  onSessionChange?: ActionSchema;
  /** 保存（manual 提交：载荷含 serializedConfig）。 */
  onSave?: ActionSchema;
  /** 装入外部 config（load 句柄触发）。 */
  onLoad?: ActionSchema;
  /** 模式切换（edit ↔ preview）。 */
  onModeChange?: ActionSchema;
  /** 选区变更（载荷含 listNodeIds）。 */
  onSelectionChange?: ActionSchema;
  /** Editor 装配 + 初始 config 装载完成。 */
  onReady?: ActionSchema;
  /** 错误（config 校验/构建失败，载荷含 code/message）。 */
  onError?: ActionSchema;
}
