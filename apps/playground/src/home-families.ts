/**
 * Home information architecture (plan `2026-10-14-playground-home-ia`).
 *
 * The playground home page used to render one flat card per `DOMAIN_RENDERER_ROUTES`
 * entry (plan 502/L0.1 made cards a pure derivation, which grew the grid to 80
 * cards). This module re-introduces the missing "scenario family" layer that
 * `docs/architecture/playground-experience.md` requires: every home-visible
 * domain entry belongs to exactly one family, and the home page renders one
 * labelled section per family.
 *
 * The mapping lives here — not on the route entries — so the already-large
 * `domain-route-entries.ts` stays untouched and the home IA is owned by the home
 * layer. `route-matrix.test.ts` pins the derivation in both directions (every
 * home-visible entry has a family; no unknown ids).
 *
 * `ai` is an aggregate family: its 14 demo pages collapse into a single
 * "AI Scenarios" card that opens the dedicated AI gallery shell
 * (`apps/playground/src/ai-gallery/`) instead of flooding the grid.
 */

export type HomeFamilyId =
  | 'core'
  | 'forms'
  | 'content'
  | 'data'
  | 'scheduling'
  | 'graph-bi'
  | 'designers'
  | 'mobile'
  | 'ai'
  | 'industrial'
  | 'performance'
  | 'diagnostics';

export interface HomeFamilyMeta {
  id: HomeFamilyId;
  label: string;
  description: string;
}

/**
 * Home display order: prominence/usage first (core → forms/data/content →
 * headline designers & AI), then scheduling/graph/mobile, and niche + ops
 * families last.
 */
export const HOME_FAMILY_ORDER: HomeFamilyId[] = [
  'core',
  'forms',
  'data',
  'content',
  'designers',
  'ai',
  'scheduling',
  'graph-bi',
  'mobile',
  'industrial',
  'performance',
  'diagnostics',
];

export const HOME_FAMILY_META: Record<HomeFamilyId, HomeFamilyMeta> = {
  core: {
    id: 'core',
    label: 'Core Basics',
    description: 'Framework fundamentals and the end-to-end baseline host page.',
  },
  forms: {
    id: 'forms',
    label: 'Forms & Inputs',
    description: 'Form atoms, advanced inputs, date family, and composition controls.',
  },
  content: {
    id: 'content',
    label: 'Content & Layout',
    description: 'Display, layout, value-mapping, and multimedia renderers.',
  },
  data: {
    id: 'data',
    label: 'Data & Tables',
    description: 'Data-source mechanics, table surfaces, and tree display.',
  },
  scheduling: {
    id: 'scheduling',
    label: 'Scheduling',
    description: 'Gantt, Kanban, Calendar, diff view, and barcode scenarios.',
  },
  'graph-bi': {
    id: 'graph-bi',
    label: 'Graph, Map & BI',
    description: 'Graph viewer, OpenLayers map, pivot table, and dashboard editor.',
  },
  designers: {
    id: 'designers',
    label: 'Designers & Editors',
    description: 'Flow / TaskFlow / Report / Spreadsheet / Page / Print designers, code and document editors.',
  },
  mobile: {
    id: 'mobile',
    label: 'Mobile',
    description: 'Mobile infrastructure, native components, and M1–M5 responsive / touch scenarios.',
  },
  ai: {
    id: 'ai',
    label: 'AI Scenarios',
    description: 'AI conversation, agentic tools, widgets, multimodal input, and coverage — bundled into one gallery.',
  },
  industrial: {
    id: 'industrial',
    label: 'Industrial & 3D',
    description: 'SCADA HMI and three.js 3D rendering scenarios.',
  },
  performance: {
    id: 'performance',
    label: 'Performance Benchmarks',
    description: 'High-scale stress and same-environment measurement pages.',
  },
  diagnostics: {
    id: 'diagnostics',
    label: 'Diagnostics & Contracts',
    description: 'Debugger, component handles, and event-prevention capability contracts.',
  },
};

/**
 * Families whose entries are collapsed into one aggregate card instead of one
 * card per entry. `route-matrix.test.ts` exempts these from the "every
 * home-visible entry has a home card" invariant.
 */
export const HOME_AGGREGATE_FAMILIES: HomeFamilyId[] = ['ai'];

export function isAggregateFamily(family: HomeFamilyId): boolean {
  return HOME_AGGREGATE_FAMILIES.includes(family);
}

/** One family per home-visible domain entry. Hidden entries (`homeVisible:false`) are absent. */
export const DOMAIN_HOME_FAMILY: Record<string, HomeFamilyId> = {
  'flux-basic': 'core',

  'condition-builder': 'forms',
  'condition-builder-formula': 'forms',
  'form-input-enhancements': 'forms',
  'input-suggest': 'forms',
  'boolean-control-value-contract': 'forms',
  'w2b-date-family': 'forms',
  'w3d-advanced-input-family': 'forms',
  'w4c-composite-form-family': 'forms',

  'w1a-content': 'content',
  'w1b-content': 'content',
  'w2a-data-composition': 'content',
  'w3a-w3b-layout-action-family': 'content',
  'w3c-value-mapping': 'content',
  'w4a-multimedia': 'content',
  'w4b-process-display': 'content',
  'layout-family-enhancements': 'content',
  'text-icon-visual-fields': 'content',

  'data-verify': 'data',
  'env-stream': 'data',
  'performance-table': 'data',
  'table-popover': 'data',
  'table-column-width': 'data',
  'tree-display-ux': 'data',

  gantt: 'scheduling',
  'gantt-states': 'scheduling',
  kanban: 'scheduling',
  'scheduling-calendar': 'scheduling',
  'barcode-input': 'scheduling',
  'diff-view': 'scheduling',

  'graph-demo': 'graph-bi',
  'map-demo': 'graph-bi',
  'pivot-table-demo': 'graph-bi',
  'dashboard-demo': 'graph-bi',

  'flow-designer': 'designers',
  'taskflow-designer': 'designers',
  'report-designer': 'designers',
  'report-designer-host': 'designers',
  spreadsheet: 'designers',
  'page-designer': 'designers',
  'print-designer': 'designers',
  'code-editor': 'designers',
  'word-editor': 'designers',
  'scada-editor-demo': 'designers',

  'mobile-infrastructure': 'mobile',
  'mobile-components': 'mobile',
  'm1-responsive': 'mobile',
  'm2-touch': 'mobile',
  'm3-layout': 'mobile',
  'm4-data': 'mobile',
  'm5-showcase': 'mobile',
  'm6-gesture-lab': 'mobile',
  'm7-wheel-pickers': 'mobile',
  'm8-bottom-panels': 'mobile',
  'm9-image-signature': 'mobile',

  'ai-chat': 'ai',
  'ai-conversations': 'ai',
  'ai-tools': 'ai',
  'ai-attachments': 'ai',
  'ai-component-handle': 'ai',
  'ai-virtual-scroll': 'ai',
  'ai-persistence': 'ai',
  'ai-citations': 'ai',
  'ai-hitl': 'ai',
  'ai-p4': 'ai',
  'ai-linkage': 'ai',
  'ai-rich-text': 'ai',
  'ai-widgets': 'ai',
  'ai-coverage': 'ai',

  'scada-demo': 'industrial',
  'scada-gallery': 'industrial',
  'scada-pressure-demo': 'industrial',
  'scada-edge-cases': 'industrial',
  'three-canvas-demo': 'industrial',
  'three-gallery': 'industrial',
  'three-industrial-demo': 'industrial',

  'calendar-perf-scale': 'performance',
  'kanban-perf-scale': 'performance',
  'gantt-perf-scale': 'performance',
  'diff-perf-scale': 'performance',
  'scada-perf-scale': 'performance',

  'debugger-lab': 'diagnostics',
  'component-handles': 'diagnostics',
  'event-prevention': 'diagnostics',
  'xlang-debug': 'diagnostics',
};
