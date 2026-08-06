import type { ActionSchema, BaseSchema, SchemaObject } from '@nop-chaos/flux-core';
import type { ScadaConfig } from '../serialization/config-types.js';

export type { ScadaConfig } from '../serialization/config-types.js';

/**
 * `scada-editor-canvas` renderer schema（E4.2 空壳期最小字段）。
 *
 * 契约：`docs/components/industrial-hmi-editor/design-renderer.md` §4.1 完整版
 * （config/width/height/mode/commitPolicy/viewport/palette/inspector/toolbox/statusBar/events）。
 * E4.2 空壳只声明 config/width/height 三项最小字段（对齐 plan 2026-08-06-2118-2 Phase 2），
 * 完整字段（mode/commitPolicy/regions/events）随 E5.1 编辑态画布组件 + 双态切换落地补全。
 *
 * 复用 runtime `ScadaConfig`（serialization/config-types.ts）——编辑会话 working copy 与运行态
 * config 同构，提交时经序列化面（serialize/diff）衔接（design-architecture.md §4.5）。
 */
export interface ScadaEditorCanvasSchema extends BaseSchema {
  type: 'scada-editor-canvas';
  /** 编辑会话初始组态（启动编辑器时装载的画面）；缺省为空场景。完整语义属 E5.1 */
  config?: string | (ScadaConfig & SchemaObject);
  /** 画布尺寸（px）；缺省填满容器 */
  width?: number;
  height?: number;
}

/**
 * `scada-editor-canvas` schema 级事件（design-renderer.md §4.1 完整版）。
 * E4.2 空壳期仅声明类型，事件派发桥接属 E5.1。
 */
export interface ScadaEditorCanvasEvents extends SchemaObject {
  onSessionChange?: ActionSchema;
  onSave?: ActionSchema;
  onLoad?: ActionSchema;
  onModeChange?: ActionSchema;
  onSelectionChange?: ActionSchema;
  onReady?: ActionSchema;
  onError?: ActionSchema;
}
