import type { RendererRouteEntry } from './route-model.js';

export const DATA_RENDERER_ROUTES: RendererRouteEntry[] = [
  {
    id: 'batch-bar',
    title: 'Batch Bar',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    description:
      'Selection-set-driven batch-operation bar semantic component: count template, action area, built-in clear (crud clearSelection / table setSelection facade), and a built-in non-empty visibility gate.',
  },
  {
    id: 'query-filter',
    title: 'Query Filter',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    description:
      'Standalone query-region semantic component: embedded form with search/reset built in, grid layout, and optional expand/collapse (usable outside crud).',
  },
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
  {
    id: 'stat-tile',
    title: 'Stat Tile',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    description:
      'BI KPI 卡片：大数字 + 标签 + 同比/环比（delta）+ sparkline 迷你趋势，涨跌色语义。',
  },
  {
    id: 'sparkline',
    title: 'Sparkline',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    description:
      '自绘 SVG 迷你趋势图原子组件：data/${expr}、静态色或 { status } 趋势语义色、fill 渐变、smooth 平滑、min/max 显式 Y 域。',
  },
  {
    id: 'dashboard-filter',
    title: 'Dashboard Filter',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    description:
      'BI 筛选联动编排约定示例：筛选表单经 valuesPath 发布到共享 filter.* 作用域，消费端 data-source 自动重载联动 chart/table/stat-tile。',
  },
];
