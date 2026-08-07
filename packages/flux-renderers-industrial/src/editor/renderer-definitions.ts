import type { RendererDefinition } from '@nop-chaos/flux-core';
import { ScadaEditorCanvasRenderer } from './scada-editor-canvas.js';

/**
 * `scada-editor-canvas` renderer 定义（E5.1 完整 fields，design-renderer.md §4.3 D-1 裁定）。
 *
 * 完整 fields（对齐 design-renderer.md §4.3）：
 * - props：config/width/height/mode/commitPolicy/viewport + events（整体 prop，D-1）。
 * - regions：palette/inspector/toolbox/statusBar（kind:'region'）。
 * - meta：id/className/disabled/visible/hidden/testid（BaseSchema 元数据通道）。
 *
 * **隔离纪律**：本定义数组经 `registerScadaEditorRenderers`（`src/editor/index.ts`）独立注册，
 * **不并入** runtime `registerScadaRenderers`（`src/index.ts`），保证 runtime bundle 不拉入
 * `@leafer-in/editor`（design-architecture.md §4.4.1 模块图隔离证明）。
 */
export const industrialEditorRendererDefinitions: RendererDefinition[] = [
  {
    type: 'scada-editor-canvas',
    displayName: 'Scada Editor Canvas',
    category: 'industrial',
    sourcePackage: '@nop-chaos/flux-renderers-industrial',
    defaultSchema: {
      type: 'scada-editor-canvas',
      config: { version: 1, variables: [], symbols: [] },
      mode: 'edit',
      commitPolicy: 'manual',
    },
    rendererClass: 'instance-renderer',
    component: ScadaEditorCanvasRenderer,
    fields: [
      { key: 'config', kind: 'prop' },
      { key: 'width', kind: 'prop' },
      { key: 'height', kind: 'prop' },
      { key: 'mode', kind: 'prop' },
      { key: 'commitPolicy', kind: 'prop' },
      { key: 'viewport', kind: 'prop' },
      // D-1 裁定：events 为整体 prop（非 events.* event 规则）——flux-compiler classifyField 仅匹配顶层 key。
      { key: 'events', kind: 'prop' },
      { key: 'palette', kind: 'region' },
      { key: 'inspector', kind: 'region' },
      { key: 'toolbox', kind: 'region' },
      { key: 'statusBar', kind: 'region' },
      // plan 2026-08-08-0900-1 Phase 3 / P2 #12：注册 loading/empty/error regions——
      // 此前 canvas 读 regions.loading/empty 但未注册（恒 undefined，host 无法覆盖）。注册使三态显示可被 host 覆盖。
      { key: 'loading', kind: 'region' },
      { key: 'empty', kind: 'region' },
      { key: 'error', kind: 'region' },
    ],
  },
];
