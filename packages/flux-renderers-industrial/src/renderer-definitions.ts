import type { RendererDefinition } from '@nop-chaos/flux-core';
import type { ScadaCanvasSchema } from './schemas.js';
import { ScadaCanvasPlaceholder } from './scada-canvas-placeholder.js';

/**
 * `scada-canvas` 空壳定义（I4.2）：type/displayName/category/sourcePackage/defaultSchema
 * 已就位，fields/events 随 I10.2 补全（契约 `design-renderer.md` §5 字段分类表）。
 */
export const industrialRendererDefinitions: RendererDefinition[] = [
  {
    type: 'scada-canvas',
    displayName: 'Scada Canvas',
    category: 'industrial',
    sourcePackage: '@nop-chaos/flux-renderers-industrial',
    defaultSchema: { type: 'scada-canvas' },
    component: ScadaCanvasPlaceholder,
    // fields/events 留空：I10.2 按 design-renderer.md §5 落地
    // `config: { kind: 'prop' }`、`loading/empty: { kind: 'region' }`、`events.*: { kind: 'event' }`。
    fields: [],
  },
];

export type IndustrialRendererSchema = ScadaCanvasSchema;
