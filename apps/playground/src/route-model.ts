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

export const FORM_RENDERER_ROUTES: RendererRouteEntry[] = [
  {
    id: 'form',
    title: 'Form',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description: 'Root form container; manages field values, validation, and submit lifecycle.',
  },
  {
    id: 'input-text',
    title: 'Input Text',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description: 'Single-line text input bound to a form field.',
  },
  {
    id: 'input-email',
    title: 'Input Email',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description: 'Email input with built-in format validation.',
  },
  {
    id: 'input-password',
    title: 'Input Password',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description: 'Password input with masked characters.',
  },
  {
    id: 'input-number',
    title: 'Input Number',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description: 'Numeric input with min/max, precision, stepper, and prefix/suffix support.',
  },
  {
    id: 'textarea',
    title: 'Textarea',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description: 'Multi-line text input bound to a form field.',
  },
  {
    id: 'select',
    title: 'Select',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description: 'Single-value dropdown with inline or async options.',
  },
  {
    id: 'checkbox',
    title: 'Checkbox',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description: 'Boolean toggle bound to a form field.',
  },
  {
    id: 'switch',
    title: 'Switch',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description: 'Toggle switch bound to a form field.',
  },
  {
    id: 'radio-group',
    title: 'Radio Group',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description: 'Single-choice radio group; options from schema or async source.',
  },
  {
    id: 'checkbox-group',
    title: 'Checkbox Group',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description: 'Multi-choice checkbox group; options from schema or async source.',
  },
  {
    id: 'input-tree',
    title: 'Input Tree',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    description: 'Inline tree selector with checkbox and radio modes.',
  },
  {
    id: 'tree-select',
    title: 'Tree Select',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    description: 'Popover-based tree selector with search support.',
  },
  {
    id: 'tag-list',
    title: 'Tag List',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    description: 'Editable list of free-text tags.',
  },
  {
    id: 'key-value',
    title: 'Key Value',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    description: 'Editable list of key-value pairs.',
  },
  {
    id: 'array-editor',
    title: 'Array Editor',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    description: 'Structured array editor with per-item column fields and add/remove controls.',
  },
  {
    id: 'condition-builder',
    title: 'Condition Builder',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    description: 'Visual AND/OR condition tree builder with nested groups.',
  },
  {
    id: 'fieldset',
    title: 'Fieldset',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description: 'Semantic field grouping container with optional legend and collapsible body.',
  },
  {
    id: 'object-field',
    title: 'Object Field',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    description: 'Inline composite field editing a nested object scope.',
  },
  {
    id: 'array-field',
    title: 'Array Field',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    description: 'Inline composite array editing with per-item form regions.',
  },
  {
    id: 'variant-field',
    title: 'Variant Field',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    description: 'Discriminated union field that switches schema based on a type selector.',
  },
  {
    id: 'detail-field',
    title: 'Detail Field',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    description: 'Opens a dialog form to edit a nested object field; writes back on confirm.',
  },
  {
    id: 'detail-view',
    title: 'Detail View',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    description: 'Read-only display of a nested object; expands to a dialog for inline editing.',
  },
];

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
