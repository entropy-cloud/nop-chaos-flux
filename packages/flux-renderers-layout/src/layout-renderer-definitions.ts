import type { RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { GridRenderer } from './grid-renderer.js';
import { CollapseRenderer } from './collapse-renderer.js';
import { ButtonGroupRenderer } from './button-group-renderer.js';
import { DropdownButtonRenderer } from './dropdown-button-renderer.js';
import { ResponsiveRenderer } from './responsive-renderer.js';
import { stepsRendererDefinition, timelineRendererDefinition } from './process-display-definitions.js';
import { wizardRendererDefinition } from './wizard-renderer-definition.js';
import { resizableRendererDefinition } from './resizable-renderer-definition.js';

export const layoutRendererDefinitions: RegisteredRendererDefinition[] = [
  wizardRendererDefinition,
  {
    type: 'grid',
    displayName: 'Grid',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-layout',
    component: GridRenderer,
    fields: [
      {
        key: 'items',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'array',
            item: {
              kind: 'schema-definition',
              fieldRules: {
                body: {
                  kind: 'region',
                  regionKey: 'bodyRegionKey',
                  params: ['item', 'index', 'key'],
                  isolate: false,
                },
              },
            },
          },
          displayName: 'Items',
          description:
            'Grid item collection. Each item carries a body region plus optional colSpan/rowSpan.',
          editorType: 'object-array',
        },
      },
      {
        key: 'columns',
        kind: 'prop',
        contract: {
          shape: { kind: 'union', anyOf: [{ kind: 'number' }, { kind: 'string' }] },
          displayName: 'Columns',
          description:
            'Number of columns (→ repeat(N, minmax(0,1fr))) or raw CSS grid-template-columns string.',
          editorType: 'expression',
        },
      },
      { key: 'responsiveColumns', kind: 'prop' },
      {
        key: 'gap',
        kind: 'prop',
        contract: {
          shape: { kind: 'union', anyOf: [{ kind: 'number' }, { kind: 'string' }] },
          displayName: 'Gap',
          description: 'Gap between grid items (number → px, string → raw CSS).',
          editorType: 'expression',
        },
      },
      {
        key: 'autoFlow',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'union',
            anyOf: [
              { kind: 'literal', value: 'row' },
              { kind: 'literal', value: 'column' },
              { kind: 'literal', value: 'dense' },
              { kind: 'literal', value: 'row dense' },
              { kind: 'literal', value: 'column dense' },
            ],
          },
          displayName: 'Auto Flow',
          editorType: 'select',
        },
      },
      {
        key: 'alignItems',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'union',
            anyOf: [
              { kind: 'literal', value: 'start' },
              { kind: 'literal', value: 'end' },
              { kind: 'literal', value: 'center' },
              { kind: 'literal', value: 'stretch' },
            ],
          },
          displayName: 'Align Items',
          editorType: 'select',
        },
      },
      {
        key: 'justifyItems',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'union',
            anyOf: [
              { kind: 'literal', value: 'start' },
              { kind: 'literal', value: 'end' },
              { kind: 'literal', value: 'center' },
              { kind: 'literal', value: 'stretch' },
            ],
          },
          displayName: 'Justify Items',
          editorType: 'select',
        },
      },
    ],
  },
  {
    type: 'collapse',
    displayName: 'Collapse',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-layout',
    component: CollapseRenderer,
    fields: [
      {
        key: 'items',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'array',
            item: {
              kind: 'schema-definition',
              fieldRules: {
                title: {
                  kind: 'value-or-region',
                  regionKey: 'titleRegionKey',
                  params: ['item', 'index', 'key'],
                  isolate: false,
                },
                body: {
                  kind: 'region',
                  regionKey: 'bodyRegionKey',
                  params: ['item', 'index', 'key'],
                  isolate: false,
                },
                leading: {
                  kind: 'region',
                  regionKey: 'leadingRegionKey',
                  params: ['item', 'index', 'key'],
                  isolate: false,
                },
                count: 'value',
                tone: 'literal',
                disabled: 'literal',
              },
            },
          },
          displayName: 'Items',
          description:
            'Collapse panel collection. Each item carries title + body + leading regions plus key/tone/count/disabled flags.',
          editorType: 'object-array',
        },
      },
      {
        key: 'value',
        kind: 'prop',
        contract: {
          shape: { kind: 'unknown' },
          displayName: 'Value',
          description:
            'Currently expanded key(s): single key when multiple=false, array of keys when multiple=true.',
          editorType: 'expression',
        },
      },
      {
        key: 'defaultValue',
        kind: 'prop',
        contract: {
          shape: { kind: 'unknown' },
          displayName: 'Default Value',
          description: 'Initial expanded value when value is not provided.',
          editorType: 'expression',
        },
      },
      {
        key: 'valueOwnership',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'union',
            anyOf: [
              { kind: 'literal', value: 'local' },
              { kind: 'literal', value: 'controlled' },
              { kind: 'literal', value: 'scope' },
            ],
          },
          displayName: 'Value Ownership',
          editorType: 'select',
          defaultValue: 'local',
        },
      },
      {
        key: 'valueStatePath',
        kind: 'prop',
        contract: {
          shape: { kind: 'string' },
          displayName: 'Value State Path',
          description: 'Scope path publishing the writable expand-state value (scope ownership).',
          editorType: 'expression',
        },
      },
      {
        key: 'multiple',
        kind: 'prop',
        valueType: 'boolean',
        contract: {
          shape: { kind: 'boolean' },
          displayName: 'Multiple',
          description: 'Allow multiple panels open simultaneously (default true).',
          editorType: 'switch',
          defaultValue: true,
        },
      },
      {
        key: 'collapsible',
        kind: 'prop',
        valueType: 'boolean',
        contract: {
          shape: { kind: 'boolean' },
          displayName: 'Collapsible',
          description: 'Whether each panel can re-collapse itself (default true).',
          editorType: 'switch',
          defaultValue: true,
        },
      },
      {
        key: 'onChange',
        kind: 'event',
        contract: {
          displayName: 'On Change',
          description:
            'Dispatched when expand state changes. Payload: { value, expandedKeys, multiple }. value is a single key or null when multiple=false, an array when multiple=true.',
          payload: {
            kind: 'object',
            fields: {
              value: { kind: 'unknown' },
              expandedKeys: { kind: 'array', item: { kind: 'string' } },
              multiple: { kind: 'boolean' },
            },
          },
        },
      },
    ],
  },
  {
    type: 'button-group',
    displayName: 'Button Group',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-layout',
    component: ButtonGroupRenderer,
    fields: [
      {
        key: 'items',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'array',
            item: {
              kind: 'schema-definition',
              fieldRules: {
                key: 'value',
                label: 'value',
                action: 'event',
                variant: 'value',
                disabled: 'value',
              },
            },
          },
          displayName: 'Items',
          description:
            'Button item collection. Each item: { label, action, variant, disabled }. action is an event field (template-preserved at compile time).',
          editorType: 'object-array',
        },
      },
      {
        key: 'orientation',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'union',
            anyOf: [
              { kind: 'literal', value: 'horizontal' },
              { kind: 'literal', value: 'vertical' },
            ],
          },
          displayName: 'Orientation',
          editorType: 'select',
          defaultValue: 'horizontal',
        },
      },
      {
        key: 'variant',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'union',
            anyOf: [
              { kind: 'literal', value: 'default' },
              { kind: 'literal', value: 'outline' },
              { kind: 'literal', value: 'secondary' },
              { kind: 'literal', value: 'ghost' },
              { kind: 'literal', value: 'destructive' },
              { kind: 'literal', value: 'link' },
            ],
          },
          displayName: 'Variant',
          editorType: 'select',
          defaultValue: 'outline',
        },
      },
      {
        key: 'size',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'union',
            anyOf: [
              { kind: 'literal', value: 'default' },
              { kind: 'literal', value: 'xs' },
              { kind: 'literal', value: 'sm' },
              { kind: 'literal', value: 'lg' },
            ],
          },
          displayName: 'Size',
          editorType: 'select',
          defaultValue: 'default',
        },
      },
      {
        key: 'selectionMode',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'union',
            anyOf: [
              { kind: 'literal', value: 'none' },
              { kind: 'literal', value: 'single' },
              { kind: 'literal', value: 'multiple' },
            ],
          },
          displayName: 'Selection Mode',
          description:
            'none = pure action buttons; single/multiple = toggle-like local controlled selection with onChange.',
          editorType: 'select',
          defaultValue: 'none',
        },
      },
      {
        key: 'value',
        kind: 'prop',
        contract: {
          shape: { kind: 'unknown' },
          displayName: 'Value',
          description:
            'Initial selected key(s) — seed only. Selection is local controlled state and is NOT reactive to runtime value changes.',
          editorType: 'expression',
        },
      },
      {
        key: 'defaultValue',
        kind: 'prop',
        contract: {
          shape: { kind: 'unknown' },
          displayName: 'Default Value',
          description: 'Initial selected value when value is not provided. Seed only (non-reactive).',
          editorType: 'expression',
        },
      },
      {
        key: 'onChange',
        kind: 'event',
        contract: {
          displayName: 'On Change',
          description:
            'Dispatched when selection changes (selectionMode ≠ none). Payload: { value, selectedKeys, selectionMode }.',
          payload: {
            kind: 'object',
            fields: {
              value: { kind: 'unknown' },
              selectedKeys: { kind: 'array', item: { kind: 'string' } },
              selectionMode: { kind: 'string' },
            },
          },
        },
      },
    ],
  },
  {
    type: 'dropdown-button',
    displayName: 'Dropdown Button',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-layout',
    component: DropdownButtonRenderer,
    fields: [
      { key: 'label', kind: 'value-or-region', regionKey: 'label' },
      {
        key: 'icon',
        kind: 'prop',
        contract: {
          shape: { kind: 'string' },
          displayName: 'Icon',
          description: 'Lucide icon name for the main button.',
          editorType: 'expression',
        },
      },
      {
        key: 'variant',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'union',
            anyOf: [
              { kind: 'literal', value: 'default' },
              { kind: 'literal', value: 'outline' },
              { kind: 'literal', value: 'secondary' },
              { kind: 'literal', value: 'ghost' },
              { kind: 'literal', value: 'destructive' },
              { kind: 'literal', value: 'link' },
            ],
          },
          displayName: 'Variant',
          editorType: 'select',
          defaultValue: 'default',
        },
      },
      {
        key: 'size',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'union',
            anyOf: [
              { kind: 'literal', value: 'default' },
              { kind: 'literal', value: 'xs' },
              { kind: 'literal', value: 'sm' },
              { kind: 'literal', value: 'lg' },
            ],
          },
          displayName: 'Size',
          editorType: 'select',
          defaultValue: 'default',
        },
      },
      {
        key: 'items',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'array',
            item: {
              kind: 'schema-definition',
              fieldRules: {
                label: 'value',
                action: 'event',
                onClick: 'event',
                disabled: 'value',
                destructive: 'value',
                key: 'value',
              },
            },
          },
          displayName: 'Items',
          description:
            'Menu item collection. Each item: { label, action/onClick, disabled, destructive }. action/onClick are event fields (template-preserved at compile time).',
          editorType: 'object-array',
        },
      },
      {
        key: 'trigger',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'union',
            anyOf: [
              { kind: 'literal', value: 'click' },
              { kind: 'literal', value: 'hover' },
            ],
          },
          displayName: 'Trigger',
          editorType: 'select',
          defaultValue: 'click',
        },
      },
      {
        key: 'side',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'union',
            anyOf: [
              { kind: 'literal', value: 'top' },
              { kind: 'literal', value: 'bottom' },
              { kind: 'literal', value: 'left' },
              { kind: 'literal', value: 'right' },
            ],
          },
          displayName: 'Side',
          description: 'Preferred menu placement side; auto-flips when cramped.',
          editorType: 'select',
          defaultValue: 'bottom',
        },
      },
      {
        key: 'align',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'union',
            anyOf: [
              { kind: 'literal', value: 'start' },
              { kind: 'literal', value: 'center' },
              { kind: 'literal', value: 'end' },
            ],
          },
          displayName: 'Align',
          editorType: 'select',
          defaultValue: 'start',
        },
      },
      {
        key: 'sideOffset',
        kind: 'prop',
        valueType: 'number',
        contract: {
          shape: { kind: 'number' },
          displayName: 'Side Offset',
          editorType: 'number',
          defaultValue: 4,
        },
      },
      {
        key: 'disabled',
        kind: 'prop',
        valueType: 'boolean',
        contract: {
          shape: { kind: 'boolean' },
          displayName: 'Disabled',
          editorType: 'switch',
          defaultValue: false,
        },
      },
      {
        key: 'split',
        kind: 'prop',
        valueType: 'boolean',
        contract: {
          shape: { kind: 'boolean' },
          displayName: 'Split',
          description:
            'Split mode: main segment dispatches mainAction, caret segment opens the menu. Defaults to false (merged single-trigger).',
          editorType: 'switch',
          defaultValue: false,
        },
      },
      {
        key: 'mainAction',
        kind: 'event',
        contract: {
          displayName: 'Main Action',
          description:
            'Action dispatched by the main segment in split mode (split: true). Absent → main segment opens the menu.',
        },
      },
      {
        key: 'label',
        kind: 'prop',
        contract: {
          shape: { kind: 'unknown' },
          displayName: 'Label',
          description: 'Main button label (value-or-region).',
          editorType: 'expression',
        },
      },
    ],
  },
  stepsRendererDefinition,
  timelineRendererDefinition,
  {
    type: 'responsive',
    displayName: 'Responsive',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-layout',
    component: ResponsiveRenderer,
    fields: [
      {
        key: 'variants',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'array',
            item: {
              kind: 'schema-definition',
              fieldRules: {
                key: 'literal',
                min: 'literal',
                max: 'literal',
                body: {
                  kind: 'region',
                  regionKey: 'bodyRegionKey',
                  params: ['variant', 'index', 'key'],
                  isolate: false,
                },
              },
            },
          },
          displayName: 'Variants',
          description:
            'Structural responsive variants. First variant whose min/max bounds match wins; otherwise the first variant without bounds (default tree) renders.',
          editorType: 'object-array',
        },
      },
    ],
  },
  resizableRendererDefinition,
];
