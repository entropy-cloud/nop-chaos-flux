import { registerRendererDefinitions, type RendererRegistry } from '@nop-chaos/flux-core';
import { industrialEditorRendererDefinitions } from './renderer-definitions.js';

/**
 * 编辑器 subpath 入口（`@nop-chaos/flux-renderers-industrial/editor`，E4.2 落地 / E5.1+ 完整实现）。
 *
 * **包结构裁定**：方案 A（design-architecture.md §4.4.1）——编辑器实现放入既有
 * `flux-renderers-industrial` 的 `src/editor/` subpath，经独立注册函数 + subpath `/editor` export +
 * 模块图隔离（主入口 `src/index.ts` 不 import 本模块），保证 `@leafer-in/editor` 不污染 runtime bundle。
 *
 * **公共面**（design-renderer.md §11）：
 * - 注册入口：`registerScadaEditorRenderers`（独立于 runtime `registerScadaRenderers`）
 * - 类型：`ScadaEditorCanvasSchema` / `ScadaEditorCanvasEvents` / `ScadaEditorTestHandle`
 */
export type { ScadaEditorCanvasSchema, ScadaEditorCanvasEvents, ScadaEditorViewportPolicy } from './schemas.js';
export type { ScadaEditorTestHandle } from './editor-test-handle.js';
export type { ScadaEditorSession, ScadaEditorMode, ScadaCommitPolicy } from './editor-session.js';

/**
 * `scada-editor-canvas` renderer 注册入口（design-renderer.md §11）。
 *
 * 注册 `scada-editor-canvas` renderer 定义（E5.1 完整 fields/regions）。
 * 与 runtime `registerScadaRenderers`（主入口 `src/index.ts`）**完全独立**——
 * 不注册 runtime 内置图元（图元库面板经 runtime `registerScadaSymbols` 复用，design-renderer.md §3）。
 */
export function registerScadaEditorRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, industrialEditorRendererDefinitions);
}
