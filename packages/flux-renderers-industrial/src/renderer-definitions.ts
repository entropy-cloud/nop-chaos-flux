import type { RendererDefinition } from '@nop-chaos/flux-core';
import type { ScadaCanvasSchema } from './schemas.js';
import { ScadaCanvasRenderer } from './renderer/scada-canvas.js';

/**
 * `scada-canvas` 定义（I4.2 空壳 → I10.1 组件替换 → I10.2 fields/events/regions 完整注册）。
 * 字段分类契约：`design-renderer.md` §5 字段分类表——
 * `config/width/height/viewport: { kind: 'prop' }`、`loading/empty: { kind: 'region' }`、
 * `events`（§5 的 `events.*` event 分类）：平台 compiler 仅按顶层 key 分类字段（flux-compiler
 * `classifyField` 精确匹配，无点号路径支持，probe 实测 eventPlans 为空），故 `events` 对象整体注册为
 * prop（ActionSchema 字面量经 props 通道保留），事件派发由 renderer 桥接层经
 * `createNormalizedActionEvent` + `helpers.dispatch` 落地（见 renderer-boundary-audit.md 契约边界 D）。
 */
export const industrialRendererDefinitions: RendererDefinition[] = [
  {
    type: 'scada-canvas',
    displayName: 'Scada Canvas',
    category: 'industrial',
    sourcePackage: '@nop-chaos/flux-renderers-industrial',
    defaultSchema: { type: 'scada-canvas' },
    component: ScadaCanvasRenderer,
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

export type IndustrialRendererSchema = ScadaCanvasSchema;
