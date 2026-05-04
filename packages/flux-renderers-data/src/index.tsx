import { registerRendererDefinitions, type RendererRegistry } from '@nop-chaos/flux-core';
import { dataRendererDefinitions } from './data-renderer-definitions';

export * from './schemas';
export * from './crud-schema';
export { TableRenderer } from './table-renderer';
export { DataSourceRenderer } from './data-source-renderer';
export { ChartRenderer } from './chart-renderer';
export { TreeRenderer } from './tree-renderer';
export { CrudRenderer } from './crud-renderer';
export { crudRendererDefinition, dataRendererDefinitions } from './data-renderer-definitions';

export function registerDataRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, dataRendererDefinitions);
}
