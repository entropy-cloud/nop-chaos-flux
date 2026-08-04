import type { RendererRouteEntry } from './route-model.js';

/**
 * C5.1 layout grid/flow family lab routes + C5.2 layout action/process family
 * (button-group/dropdown-button/steps/timeline) — complete (2026-08-04).
 * Extracted from route-model.ts to keep both files within the lint max-lines
 * budget.
 */
export const LAYOUT_RENDERER_ROUTES: RendererRouteEntry[] = [
  {
    id: 'grid',
    title: 'Grid',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-layout',
    description:
      'Explicit 2D grid layout (columns + colSpan/rowSpan) with responsive breakpoint columns.',
  },
  {
    id: 'collapse',
    title: 'Collapse',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-layout',
    description:
      'Collapsible content group with local/controlled/scope expand-state ownership.',
  },
  {
    id: 'wizard',
    title: 'Wizard',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-layout',
    description:
      'Layered wizard: interaction (step switching) + lifecycle (commit/validate/complete) state.',
  },
  {
    id: 'button-group',
    title: 'Button Group',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-layout',
    description:
      'Action button group with none/single/multiple selection modes; seed-only non-reactive value.',
  },
  {
    id: 'dropdown-button',
    title: 'Dropdown Button',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-layout',
    description:
      'Button with a dropdown menu of actions; click/hover trigger; item actions compile as preserved event templates.',
  },
  {
    id: 'steps',
    title: 'Steps',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-layout',
    description:
      'Step progress display with local/controlled/scope current-step ownership and scope-degrade fallback.',
  },
  {
    id: 'timeline',
    title: 'Timeline',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-layout',
    description:
      'Event timeline display collection with mode/orientation/reverse options; display-only, no owner state.',
  },
];
