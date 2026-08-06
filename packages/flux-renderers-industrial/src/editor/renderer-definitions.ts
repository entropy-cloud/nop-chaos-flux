import type { RendererDefinition } from '@nop-chaos/flux-core';
import { ScadaEditorCanvasRenderer } from './scada-editor-canvas.js';

/**
 * `scada-editor-canvas` 空壳 renderer 定义（E4.2）。
 *
 * 契约：`docs/components/industrial-hmi-editor/design-renderer.md` §4.1 + §4.3 完整版。
 * E4.2 首期空壳只声明最小字段（config/width/height，对齐 plan 2026-08-06-2118-2 Phase 2），
 * 完整 fields/events/regions/handles（mode/commitPolicy/viewport/palette/inspector/toolbox/
 * statusBar/events + 9 runtime 句柄 + 8 编辑扩展句柄）随 E5.1/E5.4/E7/E9 补全。
 *
 * **隔离纪律**：本定义数组经 `registerScadaEditorRenderers`（`src/editor/index.ts`）独立注册，
 * **不并入** runtime `registerScadaRenderers`（`src/index.ts`），保证 runtime bundle 不拉入
 * `@leafer-in/editor`（design-architecture.md §4.4.1 模块图隔离证明）。
 *
 * defaultSchema 含合法空场景 config（{ version:1, variables:[], symbols:[] }，对齐 runtime
 * EMPTY_SCADA_CONFIG），保证 author-less schema 不永久 loading + `__FLUX_STRICT_VALIDATION__`
 * 不拦截空壳。
 */
export const industrialEditorRendererDefinitions: RendererDefinition[] = [
  {
    type: 'scada-editor-canvas',
    displayName: 'Scada Editor Canvas',
    category: 'industrial',
    sourcePackage: '@nop-chaos/flux-renderers-industrial',
    // 空场景 config（对齐 runtime EMPTY_SCADA_CONFIG 结构），保证空壳 smoke 不抛错 +
    // __FLUX_STRICT_VALIDATION__ 不拦截。完整 defaultSchema（含 mode/commitPolicy）属 E5.1。
    defaultSchema: {
      type: 'scada-editor-canvas',
      config: { version: 1, variables: [], symbols: [] },
    },
    rendererClass: 'instance-renderer',
    component: ScadaEditorCanvasRenderer,
    // E4.2 空壳期最小 fields（完整 fields 属 E5.1，对齐 design-renderer.md §4.3）。
    fields: [
      { key: 'config', kind: 'prop' },
      { key: 'width', kind: 'prop' },
      { key: 'height', kind: 'prop' },
    ],
  },
];
