import type { RendererDefinition } from '@nop-chaos/flux-core';
import { extractNestedSchemaRegions } from '@nop-chaos/flux-core';
import { GridRenderer } from './grid-renderer.js';
import { CollapseRenderer } from './collapse-renderer.js';
import { ButtonGroupRenderer } from './button-group-renderer.js';
import { DropdownButtonRenderer } from './dropdown-button-renderer.js';
import { WizardRenderer } from './wizard-renderer.js';
import { stepsRendererDefinition, timelineRendererDefinition } from './process-display-definitions.js';

export const layoutRendererDefinitions: RendererDefinition[] = [
  {
    type: 'wizard',
    displayName: 'Wizard',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-layout',
    component: WizardRenderer,
    propContracts: {
      steps: {
        shape: { kind: 'array', item: { kind: 'unknown' } },
        displayName: 'Steps',
        description:
          'Renderer-owned structured step list. Declaration order = navigation order. Each step carries title/body/actions regions + visible/disabled/optional flags.',
        editorType: 'object-array',
      },
      value: {
        shape: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'number' }] },
        displayName: 'Value',
        description:
          'Current step key or index (1-based index when numeric and no matching key). Local controlled by default.',
        editorType: 'expression',
      },
      defaultValue: {
        shape: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'number' }] },
        displayName: 'Default Value',
        description: 'Initial current step when value is not provided.',
        editorType: 'expression',
      },
      valueOwnership: {
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
      valueStatePath: {
        shape: { kind: 'string' },
        displayName: 'Value State Path',
        description: 'Scope path publishing the writable current-step value.',
        editorType: 'expression',
      },
      statusPath: {
        shape: { kind: 'string' },
        displayName: 'Status Path',
        description:
          'Publishes a read-only wizard summary: { currentStepKey, currentStepIndex, stepCount, canGoNext, canGoPrev, committing, validating, lastCommitStatus, stepError? }. Interaction state and lifecycle state are kept separate per design §6.',
        editorType: 'expression',
      },
      linear: {
        shape: { kind: 'boolean' },
        displayName: 'Linear',
        description:
          'Default true. When true, uncommitted steps cannot be jumped to unless allowStepJump is set.',
        editorType: 'switch',
        defaultValue: true,
      },
      allowStepJump: {
        shape: { kind: 'boolean' },
        displayName: 'Allow Step Jump',
        description: 'Allow non-linear step jumping even when linear=true.',
        editorType: 'switch',
        defaultValue: false,
      },
      mountOnEnter: {
        shape: { kind: 'boolean' },
        displayName: 'Mount On Enter',
        description: 'Mount step body on first enter (keep mounted after).',
        editorType: 'switch',
        defaultValue: false,
      },
      unmountOnExit: {
        shape: { kind: 'boolean' },
        displayName: 'Unmount On Exit',
        description: 'Unmount step body when it exits.',
        editorType: 'switch',
        defaultValue: false,
      },
    },
    eventContracts: {
      onChange: {
        displayName: 'On Change',
        description:
          'Navigation event (interaction layer). Dispatched when currentStepIndex changes via Next/Prev/step-click. Payload: { currentStepKey, currentStepIndex }.',
        payload: {
          kind: 'object',
          fields: {
            currentStepKey: { kind: 'unknown' },
            currentStepIndex: { kind: 'number' },
          },
        },
      },
      onStepCommit: {
        displayName: 'On Step Commit',
        description:
          'Semantic step-commit event (lifecycle layer). Dispatched when Next is clicked, BEFORE advancing. May validate or submit; failures surface as lastCommitStatus=error and prevent advancement.',
        payload: {
          kind: 'object',
          fields: {
            currentStepKey: { kind: 'unknown' },
            currentStepIndex: { kind: 'number' },
          },
        },
      },
      onComplete: {
        displayName: 'On Complete',
        description:
          'Lifecycle event dispatched when the final step is committed successfully. Payload: { currentStepKey, currentStepIndex }.',
        payload: {
          kind: 'object',
          fields: {
            currentStepKey: { kind: 'unknown' },
            currentStepIndex: { kind: 'number' },
          },
        },
      },
      onStepError: {
        displayName: 'On Step Error',
        description:
          'Lifecycle event dispatched when step commit fails or throws. Payload: { currentStepKey, currentStepIndex, reason, error? }.',
        payload: {
          kind: 'object',
          fields: {
            currentStepKey: { kind: 'unknown' },
            currentStepIndex: { kind: 'number' },
            reason: { kind: 'string' },
          },
        },
      },
    },
    deepFields: [
      {
        key: 'steps',
        nestedRegions: [
          {
            key: 'title',
            regionKeySuffix: 'title',
            compiledKey: 'titleRegionKey',
            params: ['step', 'index', 'key'],
            isolate: false,
          },
          {
            key: 'body',
            regionKeySuffix: 'body',
            compiledKey: 'bodyRegionKey',
            params: ['step', 'index', 'key'],
            isolate: false,
          },
          {
            key: 'actions',
            regionKeySuffix: 'actions',
            compiledKey: 'actionsRegionKey',
            params: ['step', 'index', 'key'],
            isolate: false,
          },
        ],
        booleanKeys: ['disabled', 'optional'],
        normalize(input) {
          if (!Array.isArray(input.value)) {
            return input.value;
          }

          return input.value.map((item, index) => {
            if (!item || typeof item !== 'object') {
              return item;
            }

            const normalized = extractNestedSchemaRegions({
              candidate: item as Record<string, unknown>,
              itemRegionPath: `${input.path}.steps[${index}]`,
              itemRegionKeyPrefix: `steps.${index}`,
              rules: [
                {
                  key: 'title',
                  regionKeySuffix: 'title',
                  compiledKey: 'titleRegionKey',
                  params: ['step', 'index', 'key'] as readonly string[],
                  isolate: false,
                },
                {
                  key: 'body',
                  regionKeySuffix: 'body',
                  compiledKey: 'bodyRegionKey',
                  params: ['step', 'index', 'key'] as readonly string[],
                  isolate: false,
                },
                {
                  key: 'actions',
                  regionKeySuffix: 'actions',
                  compiledKey: 'actionsRegionKey',
                  params: ['step', 'index', 'key'] as readonly string[],
                  isolate: false,
                },
              ],
              regions: input.regions,
              compileSchema: input.compileSchema,
            }).value as Record<string, unknown>;

            for (const booleanKey of ['disabled', 'optional']) {
              if (normalized[booleanKey] !== undefined) {
                normalized[booleanKey] = {
                  __nopPreserveLiteral: true,
                  value: normalized[booleanKey] === true,
                };
              }
            }

            return normalized;
          });
        },
      },
    ],
    fields: [
      { key: 'steps', kind: 'prop' },
      { key: 'value', kind: 'prop' },
      { key: 'defaultValue', kind: 'prop' },
      { key: 'valueOwnership', kind: 'prop' },
      { key: 'valueStatePath', kind: 'prop' },
      { key: 'statusPath', kind: 'prop' },
      { key: 'linear', kind: 'prop', valueType: 'boolean' },
      { key: 'allowStepJump', kind: 'prop', valueType: 'boolean' },
      { key: 'mountOnEnter', kind: 'prop', valueType: 'boolean' },
      { key: 'unmountOnExit', kind: 'prop', valueType: 'boolean' },
      { key: 'onChange', kind: 'event' },
      { key: 'onStepCommit', kind: 'event' },
      { key: 'onComplete', kind: 'event' },
      { key: 'onStepError', kind: 'event' },
    ],
  },
  {
    type: 'grid',
    displayName: 'Grid',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-layout',
    component: GridRenderer,
    propContracts: {
      columns: {
        shape: { kind: 'union', anyOf: [{ kind: 'number' }, { kind: 'string' }] },
        displayName: 'Columns',
        description:
          'Number of columns (→ repeat(N, minmax(0,1fr))) or raw CSS grid-template-columns string.',
        editorType: 'expression',
      },
      gap: {
        shape: { kind: 'union', anyOf: [{ kind: 'number' }, { kind: 'string' }] },
        displayName: 'Gap',
        description: 'Gap between grid items (number → px, string → raw CSS).',
        editorType: 'expression',
      },
      autoFlow: {
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
      alignItems: {
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
      justifyItems: {
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
      items: {
        shape: { kind: 'array', item: { kind: 'unknown' } },
        displayName: 'Items',
        description:
          'Grid item collection. Each item carries a body region plus optional colSpan/rowSpan.',
        editorType: 'object-array',
      },
    },
    deepFields: [
      {
        key: 'items',
        nestedRegions: [
          {
            key: 'body',
            regionKeySuffix: 'body',
            compiledKey: 'bodyRegionKey',
            params: ['item', 'index', 'key'],
            isolate: false,
          },
        ],
        normalize(input) {
          if (!Array.isArray(input.value)) return input.value;
          return input.value.map((item, index) => {
            if (!item || typeof item !== 'object') return item;
            return extractNestedSchemaRegions({
              candidate: item as Record<string, unknown>,
              itemRegionPath: `${input.path}.items[${index}]`,
              itemRegionKeyPrefix: `items.${index}`,
              rules: [
                {
                  key: 'body',
                  regionKeySuffix: 'body',
                  compiledKey: 'bodyRegionKey',
                  params: ['item', 'index', 'key'] as readonly string[],
                  isolate: false,
                },
              ],
              regions: input.regions,
              compileSchema: input.compileSchema,
            }).value as Record<string, unknown>;
          });
        },
      },
    ],
    fields: [
      { key: 'items', kind: 'prop' },
      { key: 'columns', kind: 'prop' },
      { key: 'gap', kind: 'prop' },
      { key: 'autoFlow', kind: 'prop' },
      { key: 'alignItems', kind: 'prop' },
      { key: 'justifyItems', kind: 'prop' },
    ],
  },
  {
    type: 'collapse',
    displayName: 'Collapse',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-layout',
    component: CollapseRenderer,
    propContracts: {
      items: {
        shape: { kind: 'array', item: { kind: 'unknown' } },
        displayName: 'Items',
        description:
          'Collapse panel collection. Each item carries title + body regions plus key/disabled flags.',
        editorType: 'object-array',
      },
      value: {
        shape: { kind: 'unknown' },
        displayName: 'Value',
        description:
          'Currently expanded key(s): single key when multiple=false, array of keys when multiple=true.',
        editorType: 'expression',
      },
      defaultValue: {
        shape: { kind: 'unknown' },
        displayName: 'Default Value',
        description: 'Initial expanded value when value is not provided.',
        editorType: 'expression',
      },
      valueOwnership: {
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
      valueStatePath: {
        shape: { kind: 'string' },
        displayName: 'Value State Path',
        description: 'Scope path publishing the writable expand-state value (scope ownership).',
        editorType: 'expression',
      },
      multiple: {
        shape: { kind: 'boolean' },
        displayName: 'Multiple',
        description: 'Allow multiple panels open simultaneously (default true).',
        editorType: 'switch',
        defaultValue: true,
      },
      collapsible: {
        shape: { kind: 'boolean' },
        displayName: 'Collapsible',
        description: 'Whether each panel can re-collapse itself (default true).',
        editorType: 'switch',
        defaultValue: true,
      },
    },
    eventContracts: {
      onChange: {
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
    deepFields: [
      {
        key: 'items',
        nestedRegions: [
          {
            key: 'title',
            regionKeySuffix: 'title',
            compiledKey: 'titleRegionKey',
            params: ['item', 'index', 'key'],
            isolate: false,
          },
          {
            key: 'body',
            regionKeySuffix: 'body',
            compiledKey: 'bodyRegionKey',
            params: ['item', 'index', 'key'],
            isolate: false,
          },
        ],
        booleanKeys: ['disabled'],
        normalize(input) {
          if (!Array.isArray(input.value)) return input.value;
          return input.value.map((item, index) => {
            if (!item || typeof item !== 'object') return item;
            const normalized = extractNestedSchemaRegions({
              candidate: item as Record<string, unknown>,
              itemRegionPath: `${input.path}.items[${index}]`,
              itemRegionKeyPrefix: `items.${index}`,
              rules: [
                {
                  key: 'title',
                  regionKeySuffix: 'title',
                  compiledKey: 'titleRegionKey',
                  params: ['item', 'index', 'key'] as readonly string[],
                  isolate: false,
                },
                {
                  key: 'body',
                  regionKeySuffix: 'body',
                  compiledKey: 'bodyRegionKey',
                  params: ['item', 'index', 'key'] as readonly string[],
                  isolate: false,
                },
              ],
              regions: input.regions,
              compileSchema: input.compileSchema,
            }).value as Record<string, unknown>;
            if (normalized.disabled !== undefined) {
              normalized.disabled = {
                __nopPreserveLiteral: true,
                value: normalized.disabled === true,
              };
            }
            return normalized;
          });
        },
      },
    ],
    fields: [
      { key: 'items', kind: 'prop' },
      { key: 'value', kind: 'prop' },
      { key: 'defaultValue', kind: 'prop' },
      { key: 'valueOwnership', kind: 'prop' },
      { key: 'valueStatePath', kind: 'prop' },
      { key: 'multiple', kind: 'prop', valueType: 'boolean' },
      { key: 'collapsible', kind: 'prop', valueType: 'boolean' },
      { key: 'onChange', kind: 'event' },
    ],
  },
  {
    type: 'button-group',
    displayName: 'Button Group',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-layout',
    component: ButtonGroupRenderer,
    propContracts: {
      items: {
        shape: { kind: 'array', item: { kind: 'unknown' } },
        displayName: 'Items',
        description:
          'Button item collection (pure value prop, no nested regions). Each item: { label, action, variant, disabled }.',
        editorType: 'object-array',
      },
      orientation: {
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
      variant: {
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
      size: {
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
      selectionMode: {
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
      value: {
        shape: { kind: 'unknown' },
        displayName: 'Value',
        description: 'Currently selected key(s).',
        editorType: 'expression',
      },
      defaultValue: {
        shape: { kind: 'unknown' },
        displayName: 'Default Value',
        description: 'Initial selected value.',
        editorType: 'expression',
      },
    },
    eventContracts: {
      onChange: {
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
    fields: [
      { key: 'items', kind: 'prop' },
      { key: 'orientation', kind: 'prop' },
      { key: 'variant', kind: 'prop' },
      { key: 'size', kind: 'prop' },
      { key: 'selectionMode', kind: 'prop' },
      { key: 'value', kind: 'prop' },
      { key: 'defaultValue', kind: 'prop' },
      { key: 'onChange', kind: 'event' },
    ],
  },
  {
    type: 'dropdown-button',
    displayName: 'Dropdown Button',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-layout',
    component: DropdownButtonRenderer,
    propContracts: {
      label: {
        shape: { kind: 'unknown' },
        displayName: 'Label',
        description: 'Main button label (value-or-region).',
        editorType: 'expression',
      },
      icon: {
        shape: { kind: 'string' },
        displayName: 'Icon',
        description: 'Lucide icon name for the main button.',
        editorType: 'expression',
      },
      variant: {
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
      size: {
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
      items: {
        shape: { kind: 'array', item: { kind: 'unknown' } },
        displayName: 'Items',
        description:
          'Menu item collection (pure value prop, no nested regions). Each item: { label, action, disabled, destructive }.',
        editorType: 'object-array',
      },
      trigger: {
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
      disabled: {
        shape: { kind: 'boolean' },
        displayName: 'Disabled',
        editorType: 'switch',
        defaultValue: false,
      },
    },
    fields: [
      { key: 'label', kind: 'value-or-region', regionKey: 'label' },
      { key: 'icon', kind: 'prop' },
      { key: 'variant', kind: 'prop' },
      { key: 'size', kind: 'prop' },
      { key: 'items', kind: 'prop' },
      { key: 'trigger', kind: 'prop' },
      { key: 'disabled', kind: 'prop', valueType: 'boolean' },
    ],
  },
  stepsRendererDefinition,
  timelineRendererDefinition,
];
