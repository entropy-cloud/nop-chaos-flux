export type RendererCategory =
  | 'layout'
  | 'content'
  | 'actions'
  | 'logic'
  | 'advanced'
  | 'form'
  | 'data'
  | 'domain';

export interface RendererRouteEntry {
  id: string;
  title: string;
  category: RendererCategory;
  sourcePackage: string;
  description: string;
}

export interface DomainRouteEntry {
  id: string;
  title: string;
  description: string;
  eyebrow: string;
}

export const BASIC_RENDERER_ROUTES: RendererRouteEntry[] = [
  {
    id: 'page',
    title: 'Page',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    description: 'Root page container with header, body, and footer regions.',
  },
  {
    id: 'container',
    title: 'Container',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    description: 'Generic layout container with body, header, and footer regions.',
  },
  {
    id: 'fragment',
    title: 'Fragment',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    description: 'Scope-isolated fragment; optionally injects extra data into child scope.',
  },
  {
    id: 'flex',
    title: 'Flex',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    description: 'Flexbox container for horizontal or vertical child layout.',
  },
  {
    id: 'dialog',
    title: 'Dialog',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    description: 'Modal dialog with body and actions regions.',
  },
  {
    id: 'drawer',
    title: 'Drawer',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    description: 'Side-panel drawer with body and actions regions.',
  },
  {
    id: 'tabs',
    title: 'Tabs',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    description: 'Tabbed navigation with per-item body regions.',
  },
  {
    id: 'loop',
    title: 'Loop',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    description: 'Iterates over an array and renders each item via a body region.',
  },
  {
    id: 'recurse',
    title: 'Recurse',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    description:
      'Recursive tree renderer that walks nested item arrays to a configurable max depth.',
  },
  {
    id: 'text',
    title: 'Text',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    description: 'Renders a text string from schema or scope expression.',
  },
  {
    id: 'icon',
    title: 'Icon',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    description: 'Renders a named Lucide icon.',
  },
  {
    id: 'badge',
    title: 'Badge',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    description: 'Renders a styled badge/tag from text and semantic level.',
  },
  {
    id: 'button',
    title: 'Button',
    category: 'actions',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    description: 'Action button with configurable variant, size, and onClick handler.',
  },
  {
    id: 'scope-debug',
    title: 'Scope Debug',
    category: 'advanced',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    description:
      'Debug-only JSON viewer that reacts to current scope changes and can be inserted at any schema position.',
  },
  {
    id: 'dynamic-renderer',
    title: 'Dynamic Renderer',
    category: 'advanced',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    description: 'Renders a schema node whose type is resolved at runtime from the current scope.',
  },
  {
    id: 'reaction',
    title: 'Reaction',
    category: 'logic',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    description: 'Side-effect trigger: fires actions when watched scope values change.',
  },
];

import { FORM_RENDERER_ROUTES } from './form-route-entries.js';
export { FORM_RENDERER_ROUTES };

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
    id: 'service',
    title: 'Service',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    description:
      'Visual data-composition shell that reads already-loaded data from scope via the items expression. Owns NO request protocol (request-sink contract: api/initFetch/interval/sendOn belong to <data-source>).',
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
];

export const DOMAIN_RENDERER_ROUTES: DomainRouteEntry[] = [
  {
    id: 'flux-basic',
    title: 'Flux Basic',
    eyebrow: 'Core Renderers',
    description:
      'Forms, actions, dialogs, tables, data binding, validation, API requests, and renderer fundamentals.',
  },
  {
    id: 'flow-designer',
    title: 'Flow Designer',
    eyebrow: 'Visual Workflow',
    description: 'designer-page, toolbar, inspector, canvas, node palette, edge connections.',
  },
  {
    id: 'taskflow-designer',
    title: 'TaskFlow Designer',
    eyebrow: 'TaskFlow',
    description: 'TaskFlow visual designer with graph and tree modes, nop-task DSL round-trip.',
  },
  {
    id: 'dingtalk-flow-demo',
    title: 'DingTalk Flow Demo',
    eyebrow: 'Style Prototype',
    description: 'Static DingTalk approval flow visual reference with interactive node insertion.',
  },
  {
    id: 'report-designer',
    title: 'Report Designer',
    eyebrow: 'Spreadsheet + Metadata',
    description: 'report-designer-page, field panel, inspector shell, toolbar, spreadsheet canvas.',
  },
  {
    id: 'debugger-lab',
    title: 'Debugger Lab',
    eyebrow: 'DevTools',
    description: 'Debugger API, event timeline, network trace, and automation hooks.',
  },
  {
    id: 'condition-builder',
    title: 'Condition Builder',
    eyebrow: 'Form Control',
    description: 'Standalone condition-builder renderer with embedded and picker modes.',
  },
  {
    id: 'condition-builder-formula',
    title: 'Condition Builder Formula',
    eyebrow: 'Form Control (E3)',
    description:
      'E3 condition-builder formula integration: formulas.enabled expression value slots, formula seed defaults, formulaForIf group if markers.',
  },
  {
    id: 'code-editor',
    title: 'Code Editor',
    eyebrow: 'CodeMirror 6',
    description: 'Code editors for expression, SQL, JSON, JavaScript, CSS, HTML.',
  },
  {
    id: 'word-editor',
    title: 'Word Editor',
    eyebrow: 'Document Template',
    description: 'Word-like editor with canvas 2D rendering and template expressions.',
  },
  {
    id: 'performance-table',
    title: 'Performance Table',
    eyebrow: 'Large Data Stress',
    description:
      'Same-environment comparative page for a 1000-row paged table baseline plus aggregate, loop, selection, pagination, and editable-form stress scenarios.',
  },
  {
    id: 'component-handles',
    title: 'Component Handles',
    eyebrow: 'Capability Contracts',
    description:
      'Live demo of the X1 unified component:<method> vocabulary: focus/clear/reset on inputs, open/close/toggle on dialog/drawer, focus on button.',
  },
  {
    id: 'event-prevention',
    title: 'Event Prevention',
    eyebrow: 'Schema-Driven preventDefault',
    description:
      'Live demo of the X2 schema-driven preventDefault / stopPropagation fields on action nodes across native form submit, link navigation, and keydown blocking.',
  },
  {
    id: 'boolean-control-value-contract',
    title: 'Boolean Control Value Contract',
    eyebrow: 'Form Control (E3)',
    description:
      'E3 boolean control value contract: checkbox/switch schema-driven trueValue/falseValue mapping with default true/false fallback.',
  },
  {
    id: 'text-icon-visual-fields',
    title: 'Text / Icon Visual Fields',
    eyebrow: 'Basic Display (E3)',
    description:
      'E3 text copyable/maxLine + icon schema size/color: text one-click copy with toast feedback, line-clamp truncation, and schema-driven icon dimensions.',
  },
  {
    id: 'layout-family-enhancements',
    title: 'Layout Family Enhancements',
    eyebrow: 'Layout (E3)',
    description:
      'E3 flex/page/tabs layout family: flex reverse/evenly/baseline/alignContent enums, page aside region + subTitle/remark, tabs per-tab badge/icon + mountOnEnter/unmountOnExit.',
  },
  {
    id: 'form-input-enhancements',
    title: 'Form Input Enhancements',
    eyebrow: 'Form Input (E3)',
    description:
      'E3 form input controls: input-number long-press continuous stepping + clamp, array-editor/key-value configurable minItems/maxItems + up/down reorder via moveValue.',
  },
  {
    id: 'input-suggest',
    title: 'Input Autocomplete',
    eyebrow: 'Input Suggest (E3)',
    description:
      'E3 input-text autoComplete successor: data-source composition with refreshSource + sendOn gate, debounced trigger, Popover suggestion list, suggestTemplate region, select writeback.',
  },
  {
    id: 'tree-display-ux',
    title: 'Tree Display UX',
    eyebrow: 'Tree Display (E3)',
    description:
      'E3 tree display: searchable local filter + auto-expand matching ancestors + highlight, node icons via showIcon/iconField, indentation guide-line via showGuideLine.',
  },
  {
    id: 'table-popover',
    title: 'Table popOver Cell',
    eyebrow: 'Table Cell popOver (E3)',
    description:
      'E3 table cell detail popOver: column-level popOver config (trigger/placement/icon/content region/title/showOnOverflow/onEmpty), coexists with copyable icon, content region rendering.',
  },
  {
    id: 'mobile-infrastructure',
    title: 'Mobile Infrastructure',
    eyebrow: 'Mobile Baseline (M0.1)',
    description:
      'M0.1 mobile infra helpers: nop-safe-area, nop-hairline, nop-haptic, global z-index stack — visual + behavioral reference for M1–M5 mobile work.',
  },
  {
    id: 'mobile-components',
    title: 'Mobile Native Components',
    eyebrow: 'Mobile Renderers (M5)',
    description:
      'M5 mobile-native renderers: pull-refresh, infinite-scroll, swipe-cell, countdown, notice-bar — mounted via SchemaRenderer in touch-friendly viewport.',
  },
  {
    id: 'w1b-content',
    title: 'Content & Feedback Family',
    eyebrow: 'Content Renderers (W1b)',
    description:
      'W1b content/feedback renderers: separator, spinner, progress, empty, card — the first wave of the flux-renderers-content package, mounted via SchemaRenderer.',
  },
  {
    id: 'w1a-content',
    title: 'Content Display Family',
    eyebrow: 'Content Renderers (W1a)',
    description:
      'W1a content display renderers: markdown, html, link, image, json-view — with the controlled-rendering XSS sanitize gate (DOMPurify) for html/markdown, mounted via SchemaRenderer.',
  },
  {
    id: 'w2a-data-composition',
    title: 'Data Composition Family',
    eyebrow: 'Data/Layout Renderers (W2a)',
    description:
      'W2a data composition renderers: service (request-sink visual shell over data-source), pagination (standalone interaction owner), cards (card collection), alert (inline feedback), wizard (layered step-switching + commit lifecycle) — first bootstrap of flux-renderers-layout package.',
  },
  {
    id: 'w2b-date-family',
    title: 'Date Family',
    eyebrow: 'Form Renderers (W2b)',
    description:
      'W2b date family: input-date/input-datetime/input-time/date-range on a shared date底层 (no heavy date lib), with date-range converging date/datetime/time via rangeKind.',
  },
  {
    id: 'w3a-w3b-layout-action-family',
    title: 'Layout & Action Family',
    eyebrow: 'Layout Renderers (W3a + W3b)',
    description:
      'W3a/W3b layout + action family: grid (explicit 2D grid), collapse (valueOwnership layered expand), button-group (selectionMode toggle), dropdown-button (trigger/menu actions) — mounted via SchemaRenderer.',
  },
  {
    id: 'w3c-value-mapping',
    title: 'Value Mapping Family',
    eyebrow: 'Content Renderers (W3c)',
    description:
      'W3c value mapping renderers: mapping (value→display-result, hit/miss/defaultLabel/placeholder + item region), status (value→Badge semantic level + label + icon) — mounted via SchemaRenderer.',
  },
  {
    id: 'w3d-advanced-input-family',
    title: 'Advanced Input Family',
    eyebrow: 'Form Renderers (W3d)',
    description:
      'W3d advanced input renderers: period family input-month/quarter/year + markdown-editor (flux-renderers-form), upload family input-file/input-image + editor TipTap WYSIWYG (flux-renderers-form-advanced) — period reuses W2b date底层, upload walks the action-sink bridge, editor reuses the W1a sanitize gate.',
  },
  {
    id: 'w4a-multimedia',
    title: 'Multimedia Family',
    eyebrow: 'Content Renderers (W4a)',
    description:
      'W4a multimedia renderers: audio/video (native media elements + marker, src/poster/autoPlay/loop/controls + muted on video), carousel (reuses ui Carousel/embla, next/prev/setValue handles), qrcode (canvas QR, single canonical name) — mounted via SchemaRenderer.',
  },
  {
    id: 'w4b-process-display',
    title: 'Process Display Family',
    eyebrow: 'Layout Renderers (W4b)',
    description:
      'W4b process display renderers: steps (lightweight step progress, valueOwnership three-state, orientation, value clamp — not a flow submit owner) — mounted via SchemaRenderer.',
  },
  {
    id: 'w4c-composite-form-family',
    title: 'Composite Form Family',
    eyebrow: 'Form Renderers (W4c)',
    description:
      'W4c composite form renderers: combo (repeated composite-item field editor), input-table (tabular object-array field editor), transfer (two-pane shuttle selection), picker (dialog-layer selection) — combo/input-table reuse array-field staged owner + canonical composite handle; transfer/picker add a minimal valueKey/labelKey normalization helper. Main roadmap Wave 1–4 capstone.',
  },
  {
    id: 'm1-responsive',
    title: 'M1 Responsive Controls',
    eyebrow: 'Mobile Responsive (M1)',
    description:
      'M1 high-frequency controls responsive behavior: select/tree-select bottom-sheet, table expand card-stack, dialog fullscreen, drawer bottom, tabs scroll + swipe — switch viewport in DevTools to compare.',
  },
  {
    id: 'm2-touch',
    title: 'M2 Touch Adaptation',
    eyebrow: 'Mobile Touch (M2)',
    description:
      'M2 form control touch adaptation: input/textarea/input-number inputmode + font-size ≥16px + focus scrollIntoView, checkbox/radio/switch ≥44px hit area + small-screen vertical stack, button ≥44px min-height — switch viewport in DevTools to compare.',
  },
  {
    id: 'm3-layout',
    title: 'M3 Layout Skeletons',
    eyebrow: 'Mobile Layout (M3a)',
    description:
      'M3a mobile page skeleton patterns: Tabbar (footer navigate), NavBar (header back+title+action), ActionBar (icon group + CTA), SubmitBar (checkbox + price + CTA), Sticky (container sticky top) — page.header/page.footer region templates, not new renderers. Switch viewport in DevTools to compare.',
  },
  {
    id: 'm4-data',
    title: 'M4 Data Display Responsive',
    eyebrow: 'Mobile Data Display (M4a/M4c)',
    description:
      'M4a crud small-screen toolbar simplification (hide switch-per-page, stack vertically), query region default-collapsed, pagination simplification; M4c chart container-width height clamp + wrapping legend (ResizeObserver, fixed-height fallback). Switch viewport in DevTools to compare.',
  },
];

export const ALL_SHARED_RENDERER_ROUTES: RendererRouteEntry[] = [
  ...BASIC_RENDERER_ROUTES,
  ...FORM_RENDERER_ROUTES,
  ...DATA_RENDERER_ROUTES,
];

export type RouteSpec =
  | { kind: 'home' }
  | { kind: 'lab' }
  | { kind: 'lab-renderer'; rendererId: string }
  | { kind: 'domain'; domainId: string };

export function readDiagnosticsEnabled(search: string): boolean {
  const normalized = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(normalized).get('diagnostics') === '1';
}

export function parseRoute(hash: string): RouteSpec {
  const path = hash.startsWith('#') ? hash.slice(1) : hash;
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { kind: 'home' };
  }

  if (segments[0] === 'lab') {
    if (segments.length >= 2) {
      return { kind: 'lab-renderer', rendererId: segments[1] };
    }
    return { kind: 'lab' };
  }

  const domainIds = DOMAIN_RENDERER_ROUTES.map((r) => r.id);
  if (segments[0] && domainIds.includes(segments[0])) {
    return { kind: 'domain', domainId: segments[0] };
  }

  return { kind: 'home' };
}

export function buildRoute(spec: RouteSpec): string {
  switch (spec.kind) {
    case 'home':
      return '#/';
    case 'lab':
      return '#/lab';
    case 'lab-renderer':
      return `#/lab/${spec.rendererId}`;
    case 'domain':
      return `#/${spec.domainId}`;
  }
}
