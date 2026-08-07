import type { RendererRouteEntry } from './route-model.js';

export const DATA_RENDERER_ROUTES: RendererRouteEntry[] = [
  {
    id: 'crud',
    title: 'Crud',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    description: 'Composite data workflow with query form, toolbar, bulk actions, and table shell.',
  },
  {
    id: 'table',
    title: 'Table',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    description: 'Data table with sorting, pagination, selection, and expandable rows.',
  },
  {
    id: 'tree',
    title: 'Tree',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    description: 'Hierarchical tree view with expand/collapse and optional custom node templates.',
  },
  {
    id: 'list',
    title: 'List',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    description:
      'Ordered collection renderer with an item region, empty state, and local controlled selection (single/multiple/none).',
  },
  {
    id: 'pagination',
    title: 'Pagination',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    description:
      'Standalone pagination interaction owner. Reuses ui Pagination; normalizes out-of-range currentPage; page-size change resets to page 1.',
  },
  {
    id: 'data-source',
    title: 'Data Source',
    category: 'logic',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    description: 'Logic-only renderer: loads remote data and injects results into the scope.',
  },
  {
    id: 'chart',
    title: 'Chart',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    description: 'Recharts-based chart driven by source data, configured axes, and series.',
  },
  {
    id: 'statistics',
    title: 'Statistics',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    description: 'Compact numeric statistics display (total/count) for dashboards and summaries.',
  },
];
