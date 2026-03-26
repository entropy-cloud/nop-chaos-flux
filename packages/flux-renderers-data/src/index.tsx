import type { RendererDefinition, RendererRegistry } from '@nop-chaos/flux-core';
import { registerRendererDefinitions } from '@nop-chaos/flux-runtime';
import { TableRenderer } from './table-renderer';
import { DataSourceRenderer } from './data-source-renderer';

export * from './schemas';
export { TableRenderer } from './table-renderer';
export { DataSourceRenderer } from './data-source-renderer';

export const dataRendererDefinitions: RendererDefinition[] = [
  {
    type: 'table',
    component: TableRenderer,
    fields: [
      { key: 'onRowClick', kind: 'event' },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' }
    ]
  },
  {
    type: 'data-source',
    component: DataSourceRenderer,
    regions: ['body']
  }
];

export function registerDataRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, dataRendererDefinitions);
}
