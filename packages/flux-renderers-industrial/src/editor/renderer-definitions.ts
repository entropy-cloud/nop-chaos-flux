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
    propContracts: {
      config: {
        shape: { kind: 'unknown' },
        displayName: 'Config',
        description:
          'Initial scene config JSON (string JSON-text or parsed object). Validated at runtime via parseScadaConfig/validateScadaConfig.',
        editorType: 'code',
        required: false,
      },
      width: {
        shape: { kind: 'number' },
        displayName: 'Width',
        description: 'Canvas width in px; omit to fill container.',
        editorType: 'number',
      },
      height: {
        shape: { kind: 'number' },
        displayName: 'Height',
        description: 'Canvas height in px; omit to fill container.',
        editorType: 'number',
      },
      mode: {
        shape: { kind: 'union', anyOf: [{ kind: 'literal', value: 'edit' }, { kind: 'literal', value: 'preview' }] },
        displayName: 'Mode',
        description: 'Editor mode (edit ↔ preview).',
      },
      commitPolicy: {
        shape: { kind: 'union', anyOf: [{ kind: 'literal', value: 'manual' }, { kind: 'literal', value: 'auto' }] },
        displayName: 'Commit Policy',
        description: 'Commit policy (manual default / auto).',
      },
      viewport: {
        shape: {
          kind: 'object',
          fields: {
            fit: { kind: 'union', anyOf: [{ kind: 'literal', value: 'contain' }, { kind: 'literal', value: 'fill' }] },
            center: { kind: 'boolean' },
          },
          optional: ['fit', 'center'],
        },
        displayName: 'Viewport',
        description: 'Initial viewport policy (fit/center), applied once on mount.',
      },
      events: {
        shape: { kind: 'unknown' },
        displayName: 'Events',
        description:
          'Schema-level event hooks (onReady/onError/onSelectionChange/onModeChange/onSessionChange/onSave/onLoad). Dispatched via createNormalizedActionEvent + helpers.dispatch.',
      },
    },
    eventContracts: {
      onReady: {
        displayName: 'Ready',
        description: 'Fires when the editor mounts and the initial config is loaded (scada-editor:ready).',
      },
      onError: {
        displayName: 'Error',
        description: 'Fires on config validation/build failure (scada-editor:error).',
        payload: {
          kind: 'object',
          fields: {
            code: { kind: 'string' },
            message: { kind: 'string' },
          },
        },
      },
      onSelectionChange: {
        displayName: 'Selection Change',
        description: 'Fires when the symbol selection changes (scada-editor:selectionChange).',
        payload: {
          kind: 'object',
          fields: {
            listNodeIds: { kind: 'array', item: { kind: 'string' } },
          },
        },
      },
      onModeChange: {
        displayName: 'Mode Change',
        description: 'Fires when the editor switches between edit/preview (scada-editor:modeChange).',
        payload: {
          kind: 'object',
          fields: {
            mode: { kind: 'union', anyOf: [{ kind: 'literal', value: 'edit' }, { kind: 'literal', value: 'preview' }] },
          },
        },
      },
      onSessionChange: {
        displayName: 'Session Change',
        description: 'Fires on any working-copy mutation: property edit, move, undo/redo (scada-editor:sessionChange).',
        payload: {
          kind: 'object',
          fields: {
            canUndo: { kind: 'boolean' },
            canRedo: { kind: 'boolean' },
            selection: { kind: 'array', item: { kind: 'string' } },
            mode: { kind: 'string' },
          },
        },
      },
      onSave: {
        displayName: 'Save',
        description: 'Fires on manual save; payload contains the serialized config (scada-editor:save).',
        payload: {
          kind: 'object',
          fields: {
            serializedConfig: { kind: 'string' },
          },
        },
      },
      onLoad: {
        displayName: 'Load',
        description: 'Fires when an external config is loaded via the load handle (scada-editor:load).',
        payload: {
          kind: 'object',
          fields: {
            config: { kind: 'unknown' },
          },
        },
      },
    },
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
