import { registerRendererDefinitions, type RendererRegistry } from '@nop-chaos/flux-core';
import { industrialEditorRendererDefinitions } from './renderer-definitions.js';

/**
 * 编辑器 subpath 入口（`@nop-chaos/flux-renderers-industrial/editor`，E4.2 落地）。
 *
 * **包结构裁定**：方案 A（design-architecture.md §4.4.1，2026-08-06 E4.1）——编辑器实现放入
 * 既有 `flux-renderers-industrial` 的 `src/editor/` subpath，经独立注册函数 +
 * subpath `/editor` export + 模块图隔离（主入口 `src/index.ts` 不 import 本模块），
 * 保证 `@leafer-in/editor` 不污染 runtime `scada-canvas` bundle。
 *
 * **公共面**（design-renderer.md §11）：
 * - 注册入口：`registerScadaEditorRenderers`（独立于 runtime `registerScadaRenderers`）
 * - 类型：`ScadaEditorCanvasSchema` / `ScadaEditorCanvasEvents`
 *
 * E5.1+ 在此 subpath 内落地 Editor 装配 + 编辑会话模型 + 适配层 + 句柄扩展。
 * 调用方经 subpath import：`import { registerScadaEditorRenderers } from '@nop-chaos/flux-renderers-industrial/editor'`，
 * **禁从主入口 re-export**（违反隔离目标）。
 */
export type { ScadaEditorCanvasSchema, ScadaEditorCanvasEvents } from './schemas.js';

/**
 * `scada-editor-canvas` renderer 注册入口（design-renderer.md §11）。
 *
 * 注册 `scada-editor-canvas` renderer 定义（空壳期最小 fields，完整契约属 E5.1+）。
 * 与 runtime `registerScadaRenderers`（主入口 `src/index.ts`）**完全独立**——
 * 不注册 runtime 内置图元（图元库面板在 E5.2 经 runtime `registerScadaSymbols` 复用）。
 */
export function registerScadaEditorRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, industrialEditorRendererDefinitions);
}
