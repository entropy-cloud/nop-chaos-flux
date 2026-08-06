import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { ScadaEditorCanvasSchema } from './schemas.js';

/**
 * `scada-editor-canvas` 空壳渲染组件（E4.2）。
 *
 * 这是一个**首期空壳**——渲染最小 DOM 根容器（`data-slot="scada-editor-canvas"`），
 * 不装配 leafer Editor 实例、不挂编辑会话、不接适配层。空壳目的：
 *  1. 验证 `scada-editor-canvas` renderer type 注册链路 + subpath `/editor` 隔离可行；
 *  2. 为 E5.1（编辑态画布组件 + 双态切换）提供可替换的落点。
 *
 * **隔离纪律**：本模块（`src/editor/`）是 `@leafer-in/editor` 的唯一消费侧（E5.1 落地后）；
 * 主入口 `src/index.ts`（runtime `registerScadaRenderers`）不 import 本模块，故
 * `@leafer-in/editor` 永不进入 runtime `scada-canvas` bundle（design-architecture.md §4.4.1）。
 *
 * E5.1 将替换本组件为真正的编辑态画布（Editor 装配 + 编辑会话模型 + 双态切换 UI）。
 */
export function ScadaEditorCanvasRenderer(_props: RendererComponentProps<ScadaEditorCanvasSchema>) {
  // 空壳：E5.1 落地 Editor 装配 + 编辑会话 + 双态切换。
  // data-status="shell" 标识空壳态（smoke 测试可区分 E4.2 空壳 vs E5.1 实现）。
  return (
    <div
      data-slot="scada-editor-canvas"
      data-status="shell"
      className="nop-scada-editor-canvas"
    />
  );
}
