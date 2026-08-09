import type { RendererDefinition } from '@nop-chaos/flux-core';
import { ScadaCanvasRenderer } from './renderer/scada-canvas.js';

/**
 * 事件载荷共享 shape（design-renderer.md §8.2 `ScadaSymbolEventPayload`）：
 * 图元点击/双击/悬停事件载荷规范化结构。
 */
const symbolEventPayloadShape = {
  kind: 'object' as const,
  fields: {
    symbolId: { kind: 'string' as const },
    symbolType: { kind: 'string' as const },
    pointValues: { kind: 'record' as const, value: { kind: 'unknown' as const } },
    world: {
      kind: 'object' as const,
      fields: {
        x: { kind: 'number' as const },
        y: { kind: 'number' as const },
      },
    },
    viewport: {
      kind: 'object' as const,
      fields: {
        x: { kind: 'number' as const },
        y: { kind: 'number' as const },
      },
    },
  },
  optional: ['pointValues', 'world', 'viewport'],
};

/**
 * `scada-canvas` 定义（I4.2 空壳 → I10.1 组件替换 → I10.2 fields/events/regions 完整注册）。
 *
 * 字段分类契约：`design-renderer.md` §5 字段分类表——
 * `config/width/height/viewport: { kind: 'prop' }`、`loading/empty: { kind: 'region' }`、
 * `events`（§5 的 `events.*` event 分类）：平台 compiler 仅按顶层 key 分类字段（flux-compiler
 * `classifyField` 精确匹配，无点号路径支持，probe 实测 eventPlans 为空），故 `events` 对象整体注册为
 * prop（ActionSchema 字面量经 props 通道保留），事件派发由 renderer 桥接层经
 * `createNormalizedActionEvent` + `helpers.dispatch` 落地（见 renderer-boundary-audit.md 契约边界 D）。
 *
 * 静态元数据（plan 2026-08-04-1558-1 Phase 3）：补齐 `rendererClass`/`propContracts`/
 * `eventContracts`/`componentCapabilityContracts`，工具链（authoring-contract resolver、shape-validation、
 * 文档导出）可发现 5 events + 9 handles，无需运行 renderer 实例。
 */
export const industrialRendererDefinitions: RendererDefinition[] = [
  {
    type: 'scada-canvas',
    displayName: 'Scada Canvas',
    category: 'industrial',
    sourcePackage: '@nop-chaos/flux-renderers-industrial',
    // defaultSchema 含合法 config（author-less schema 不再永久 loading——Phase 3 renderer 兜底）。
    // 平台不 merge defaultSchema 到 props，行为修复在 renderer 侧 parseAndValidateConfig 空场景兜底。
    // config 字面量与 scada-canvas.tsx EMPTY_SCADA_CONFIG 结构一致（{ version:1, variables:[], symbols:[] }）。
    defaultSchema: { type: 'scada-canvas', config: { version: 1, variables: [], symbols: [] } },
    rendererClass: 'instance-renderer',
    component: ScadaCanvasRenderer,
    propContracts: {
      config: {
        // 组态 JSON：内嵌字符串（JSON 文本）或对象（已解析）；source-enabled。
        shape: { kind: 'unknown' },
        displayName: 'Config',
        description:
          'Scada scene config JSON (string JSON-text or parsed object). Validated at runtime via parseScadaConfig/validateScadaConfig. Supports expression binding.',
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
        description: 'Initial viewport policy (fit/center).',
      },
      events: {
        // ActionSchema 对象整体（onSymbolClick/onSymbolDblClick/onSymbolHover/onReady/onError）。
        shape: { kind: 'unknown' },
        displayName: 'Events',
        description:
          'Schema-level event hooks (onSymbolClick/onSymbolDblClick/onSymbolHover/onReady/onError). Dispatched via createNormalizedActionEvent + helpers.dispatch (see eventContracts for payload shapes).',
      },
    },
    eventContracts: {
      onSymbolClick: {
        displayName: 'Symbol Click',
        description: 'Fires when a symbol is clicked (global hook outside per-symbol event declarations).',
        payload: symbolEventPayloadShape,
      },
      onSymbolDblClick: {
        displayName: 'Symbol Double Click',
        description: 'Fires when a symbol is double-clicked.',
        payload: symbolEventPayloadShape,
      },
      onSymbolHover: {
        displayName: 'Symbol Hover',
        description: 'Fires when the pointer enters a symbol.',
        payload: symbolEventPayloadShape,
      },
      onReady: {
        displayName: 'Ready',
        description:
          'Fires when the scene build completes (scada:ready). Change-baseline guarded: empty-diff reruns do not fire (P1-3).',
      },
      onError: {
        displayName: 'Error',
        description:
          'Fires on config validation/build failure (scada:error). Runtime data errors do NOT escalate to canvas error (P1-8).',
        payload: {
          kind: 'object',
          fields: {
            code: { kind: 'string' },
            message: { kind: 'string' },
          },
        },
      },
    },
    // 9 component handles（design-renderer.md §8.5 表；use-scada-handles.ts SCADA_HANDLE_METHODS）。
    componentCapabilityContracts: [
      {
        handle: 'fit',
        displayName: 'Fit',
        description: 'Fit the viewport to the scene bounds.',
      },
      {
        handle: 'center',
        displayName: 'Center',
        description: 'Center the scene at the current scale.',
      },
      {
        handle: 'getSymbols',
        displayName: 'Get Symbols',
        description: 'Read-only scene tree snapshot (id + type per symbol).',
        result: {
          kind: 'array',
          item: {
            kind: 'object',
            fields: { id: { kind: 'string' }, type: { kind: 'string' } },
          },
        },
      },
      {
        handle: 'getSymbol',
        displayName: 'Get Symbol',
        description: 'Read a single symbol resolved props by id.',
        args: { kind: 'object', fields: { id: { kind: 'string' } } },
      },
      {
        handle: 'setPointValue',
        displayName: 'Set Point Value',
        description: 'Write a point value (through the point store + refresh pipeline).',
        args: {
          kind: 'object',
          fields: { pointId: { kind: 'string' }, value: { kind: 'unknown' } },
        },
      },
      {
        handle: 'getPointTable',
        displayName: 'Get Point Table',
        description: 'Point table snapshot (all declared points with current values).',
        result: { kind: 'record', value: { kind: 'unknown' } },
      },
      {
        handle: 'exportConfig',
        displayName: 'Export Config',
        description: 'Serialize the current scene config.',
      },
      {
        handle: 'importConfig',
        displayName: 'Import Config',
        description: 'Parse + validate + apply a new config (full rebuild).',
        args: { kind: 'object', fields: { config: { kind: 'unknown' } } },
      },
      {
        handle: 'destroy',
        displayName: 'Destroy',
        description: 'Imperatively tear down the engine (canvas/events/test handle).',
      },
    ],
    fields: [
      { key: 'config', kind: 'prop' },
      { key: 'width', kind: 'prop' },
      { key: 'height', kind: 'prop' },
      { key: 'viewport', kind: 'prop' },
      { key: 'events', kind: 'prop' },
      { key: 'loading', kind: 'region', regionKey: 'loading' },
      { key: 'empty', kind: 'region', regionKey: 'empty' },
    ],
  },
];
