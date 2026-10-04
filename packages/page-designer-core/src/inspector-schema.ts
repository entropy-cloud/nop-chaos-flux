/**
 * 兼容再导出（P4.2，plan 556）：inspector schema 生成器已迁至共享域
 * `@nop-chaos/flux-core/src/authoring/`（归宿裁定：authoring contract 同层，全家族零新增依赖）。
 * 本文件仅选择性具名再导出保留旧 import 路径（禁 `export *` 整面透传 flux-core 公共面）；
 * 新消费请直接使用 `@nop-chaos/flux-core`。
 */
export {
  INSPECTOR_ADAPTER_KEY,
  INSPECTOR_EDITOR_TYPE_KEY,
  INSPECTOR_EVENTS_KEY,
  INSPECTOR_RAW_JSON_FIELD,
  INSPECTOR_READONLY_KEY,
  buildInspectorSchema,
  deriveControlFromShape,
  resolveInspectorRoutedKeys,
  type InspectorBuildOptions,
  type InspectorControlAdapter,
} from '@nop-chaos/flux-core';
