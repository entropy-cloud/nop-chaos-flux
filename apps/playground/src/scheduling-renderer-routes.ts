import type { RendererRouteEntry } from './route-model.js';

/**
 * C9 scheduling-family lab routes
 * (gantt / kanban / calendar / barcode-input).
 * Extracted from route-model.ts to keep files within the lint max-lines budget
 * (content-renderer-routes.ts precedent).
 */
export const SCHEDULING_RENDERER_ROUTES: RendererRouteEntry[] = [
  {
    id: 'gantt',
    title: 'Gantt',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-scheduling',
    description:
      'Task timeline grid with drag/resize/links and schema events dispatching the { event, evaluationBindings, scope } ctx; reaction fields (zoomIn/zoomOut/scrollToToday/scrollToTask) wired via component handles.',
  },
  {
    id: 'kanban',
    title: 'Kanban',
    category: 'scheduling',
    sourcePackage: '@nop-chaos/flux-renderers-scheduling',
    description:
      'Column/card board with DnD + keyboard drag, three-way collapsed ownership and schema events dispatching the dispatch ctx.',
  },
  {
    id: 'calendar',
    title: 'Calendar',
    category: 'scheduling',
    sourcePackage: '@nop-chaos/flux-renderers-scheduling',
    description:
      'Month/week/day scheduling grid with drag-create, view/date ownership, loadAction and schema events dispatching the dispatch ctx.',
  },
  {
    id: 'barcode-input',
    title: 'Barcode Input',
    category: 'scheduling',
    sourcePackage: '@nop-chaos/flux-renderers-scheduling',
    description:
      'Form field with camera scanner overlay: value writeback, form-model validation participation and RendererEnv-backed WASM loading (INV-1).',
  },
];
