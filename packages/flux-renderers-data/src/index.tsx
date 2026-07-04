import { registerRendererDefinitions, type RendererRegistry } from '@nop-chaos/flux-core';
import { dataRendererDefinitions } from './data-renderer-definitions.js';

export * from './schemas.js';
export * from './crud-schema.js';
export { TableRenderer } from './table-renderer.js';
export { DataSourceRenderer } from './data-source-renderer.js';
export { ChartRenderer } from './chart-renderer.js';
export { TreeRenderer } from './tree-renderer.js';
export { ListRenderer } from './list-renderer.js';
export { ServiceRenderer } from './service-renderer.js';
export { PaginationRenderer } from './pagination-renderer.js';
export { StatisticsRenderer } from './statistics-renderer.js';
export { CrudRenderer } from './crud-renderer.js';
export { createCrudNormalizedSourceContext } from './crud-renderer-state.js';
export { crudRendererDefinition, dataRendererDefinitions } from './data-renderer-definitions.js';

export function registerDataRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, dataRendererDefinitions);
}
