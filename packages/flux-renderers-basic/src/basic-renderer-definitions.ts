import type { RendererDefinition } from '@nop-chaos/flux-core';
import { extractNestedSchemaRegions } from '@nop-chaos/flux-core';
import { BadgeRenderer } from './badge.js';
import { ButtonRenderer } from './button.js';
import { ContainerRenderer } from './container.js';
import { DynamicRenderer } from './dynamic-renderer.js';
import { FlexRenderer } from './flex.js';
import { FragmentRenderer } from './fragment.js';
import { IconRenderer } from './icon.js';
import { LoopRenderer } from './loop.js';
import { PageRenderer } from './page.js';
import { ReactionRenderer } from './reaction.js';
import { RecurseRenderer } from './recurse.js';
import { ScopeDebugRenderer } from './scope-debug.js';
import { TabsRenderer } from './tabs.js';
import { TextRenderer } from './text.js';
import { dialogRendererDefinition, drawerRendererDefinition } from './surface-renderer-definitions.js';

export const basicRendererDefinitions: RendererDefinition[] = [
  {
    type: 'page',
    displayName: 'Page',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    defaultSchema: { type: 'page', body: [] },
    component: PageRenderer,
    injectedLocals: {
      $page: {
        kind: 'injected-local',
      },
    },
    fields: [
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
      { key: 'body', kind: 'region', regionKey: 'body' },
      { key: 'header', kind: 'region', regionKey: 'header' },
      { key: 'footer', kind: 'region', regionKey: 'footer' },
      { key: 'aside', kind: 'region', regionKey: 'aside' },
      { key: 'subTitle', kind: 'prop' },
      { key: 'remark', kind: 'prop' },
      { key: 'asidePosition', kind: 'prop' },
      { key: 'modalContainer', kind: 'prop' },
      { key: 'statusPath', kind: 'prop' },
    ],
    validationDefaults: {
      collectDescendantValidation: true,
    },
  },
  {
    type: 'container',
    displayName: 'Container',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    defaultSchema: { type: 'container', body: [] },
    component: ContainerRenderer,
    fields: [
      { key: 'body', kind: 'region', regionKey: 'body' },
      { key: 'header', kind: 'region', regionKey: 'header' },
      { key: 'footer', kind: 'region', regionKey: 'footer' },
    ],
    staticCapable: true,
  },
  {
    type: 'fragment',
    displayName: 'Fragment',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    defaultSchema: { type: 'fragment', body: [] },
    component: FragmentRenderer,
    fields: [
      { key: 'body', kind: 'region', regionKey: 'body' },
      { key: 'data', kind: 'prop' },
      { key: 'isolate', kind: 'prop' },
    ],
    staticCapable: true,
  },
  {
    type: 'loop',
    displayName: 'Loop',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    defaultSchema: { type: 'loop', body: [] },
    component: LoopRenderer,
    fields: [
      { key: 'empty', kind: 'region', regionKey: 'empty' },
      { key: 'items', kind: 'prop' },
      { key: 'itemName', kind: 'prop' },
      { key: 'indexName', kind: 'prop' },
      { key: 'keyName', kind: 'prop' },
      { key: 'itemData', kind: 'prop', lazyEval: true, params: ['item', 'index', 'key'] },
      { key: 'keyBy', kind: 'prop' },
      { key: 'body', kind: 'region', params: ['item', 'index'] },
    ],
  },
  {
    type: 'recurse',
    displayName: 'Recurse',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    component: RecurseRenderer,
    fields: [
      { key: 'items', kind: 'prop' },
      { key: 'itemName', kind: 'prop' },
      { key: 'indexName', kind: 'prop' },
      { key: 'keyName', kind: 'prop' },
      { key: 'itemData', kind: 'prop', lazyEval: true, params: ['item', 'index', 'key'] },
      { key: 'keyBy', kind: 'prop' },
      { key: 'maxDepth', kind: 'prop' },
    ],
  },
  {
    type: 'flex',
    displayName: 'Flex',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    defaultSchema: { type: 'flex', body: [] },
    component: FlexRenderer,
    fields: [
      { key: 'body', kind: 'region', regionKey: 'body' },
      { key: 'items', kind: 'region', regionKey: 'items' },
    ],
    staticCapable: true,
  },
  {
    type: 'text',
    displayName: 'Text',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    defaultSchema: { type: 'text', text: 'Text' },
    component: TextRenderer,
    fields: [
      { key: 'text', kind: 'prop', allowSource: true },
      { key: 'body', kind: 'prop' },
      { key: 'tag', kind: 'prop' },
      { key: 'copyable', kind: 'prop', valueType: 'boolean' },
      { key: 'maxLine', kind: 'prop' },
      { key: 'maxLineToggle', kind: 'prop', valueType: 'boolean' },
    ],
    staticCapable: true,
  },
  {
    type: 'button',
    displayName: 'Button',
    category: 'actions',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    defaultSchema: { type: 'button', label: 'Button' },
    rendererClass: 'instance-renderer',
    rendererTraits: ['trigger'],
    propContracts: {
      label: {
        shape: { kind: 'string' },
        displayName: 'Label',
        description: 'Button text content.',
        editorType: 'text',
        defaultValue: 'Button',
      },
      variant: {
        shape: {
          kind: 'union',
          anyOf: [
            { kind: 'literal', value: 'default' },
            { kind: 'literal', value: 'destructive' },
            { kind: 'literal', value: 'outline' },
            { kind: 'literal', value: 'secondary' },
            { kind: 'literal', value: 'ghost' },
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
            { kind: 'literal', value: 'icon' },
            { kind: 'literal', value: 'icon-xs' },
            { kind: 'literal', value: 'icon-sm' },
            { kind: 'literal', value: 'icon-lg' },
          ],
        },
        displayName: 'Size',
        editorType: 'select',
        defaultValue: 'default',
      },
      disabled: {
        shape: { kind: 'boolean' },
        displayName: 'Disabled',
        description: 'Disables user interaction when true.',
        editorType: 'switch',
      },
      icon: {
        shape: { kind: 'string' },
        displayName: 'Icon',
        description: 'Lucide icon name rendered before the label.',
        editorType: 'text',
      },
      rightIcon: {
        shape: { kind: 'string' },
        displayName: 'Right Icon',
        description: 'Lucide icon name rendered after the label.',
        editorType: 'text',
      },
      loading: {
        shape: { kind: 'boolean' },
        displayName: 'Loading',
        description:
          'Shows a spinner and forces disabled. Accepts an expression string (subsumes amis loadingOn).',
        editorType: 'switch',
      },
      tooltip: {
        shape: { kind: 'string' },
        displayName: 'Tooltip',
        description: 'Hover tooltip text shown when the button is enabled.',
        editorType: 'text',
      },
      disabledTip: {
        shape: { kind: 'string' },
        displayName: 'Disabled Tip',
        description: 'Tooltip text shown when the button is disabled (overrides tooltip).',
        editorType: 'text',
      },
      block: {
        shape: { kind: 'boolean' },
        displayName: 'Block',
        description: 'Renders the button at full width.',
        editorType: 'switch',
      },
      active: {
        shape: { kind: 'boolean' },
        displayName: 'Active',
        description: 'Toggle/pressed state. Adds data-active and aria-pressed.',
        editorType: 'switch',
      },
    },
    eventContracts: {
      onClick: {
        displayName: 'Click',
        description: 'Runs when the user activates the button.',
        payload: {
          kind: 'object',
          fields: {
            type: { kind: 'string' },
            nativeEvent: { kind: 'unknown' },
            currentTarget: { kind: 'unknown' },
            target: { kind: 'unknown' },
          },
          optional: ['nativeEvent', 'currentTarget', 'target'],
        },
      },
    },
    component: ButtonRenderer,
    componentCapabilityContracts: [
      {
        handle: 'focus',
        displayName: 'Focus',
        description: 'Focus the button element.',
      },
    ],
    fields: [
      { key: 'disabled', kind: 'meta' },
      { key: 'loading', kind: 'prop', valueType: 'boolean' },
      { key: 'onClick', kind: 'event' },
      { key: 'icon', kind: 'prop' },
      { key: 'rightIcon', kind: 'prop' },
      { key: 'tooltip', kind: 'prop' },
      { key: 'disabledTip', kind: 'prop' },
      { key: 'block', kind: 'prop', valueType: 'boolean' },
      { key: 'active', kind: 'prop', valueType: 'boolean' },
    ],
  },
  {
    type: 'icon',
    displayName: 'Icon',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    component: IconRenderer,
    fields: [
      { key: 'icon', kind: 'prop' },
      { key: 'size', kind: 'prop' },
      { key: 'color', kind: 'prop' },
    ],
    staticCapable: true,
  },
  {
    type: 'badge',
    displayName: 'Badge',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    component: BadgeRenderer,
    staticCapable: true,
  },
  {
    type: 'scope-debug',
    displayName: 'Scope Debug',
    category: 'advanced',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    defaultSchema: { type: 'scope-debug', title: 'Scope Debug', defaultExpand: false },
    component: ScopeDebugRenderer,
    fields: [
      { key: 'title', kind: 'prop' },
      { key: 'defaultExpand', kind: 'prop' },
      { key: 'dataPaths', kind: 'prop' },
    ],
  },
  {
    type: 'dynamic-renderer',
    displayName: 'Dynamic Renderer',
    category: 'advanced',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    component: DynamicRenderer,
    schemaValidator({ schema, emit }) {
      const loadAction = schema.loadAction;
      if (loadAction === undefined) {
        return;
      }

      if (!loadAction || typeof loadAction !== 'object' || Array.isArray(loadAction)) {
        emit({
          code: 'invalid-action-shape',
          path: '/loadAction',
          message: 'Action entries must be objects.',
        });
        return;
      }

      const action = loadAction as Record<string, unknown>;
      if (typeof action.action !== 'string' || action.action.length === 0) {
        emit({
          code: 'invalid-action-shape',
          path: '/loadAction/action',
          message: 'Action objects require a non-empty action field.',
        });
      }

      if (
        action.args !== undefined &&
        (!action.args || typeof action.args !== 'object' || Array.isArray(action.args))
      ) {
        emit({
          code: 'invalid-action-shape',
          path: '/loadAction/args',
          message: 'Action args must be an object when provided.',
        });
      }
    },
    componentCapabilityContracts: [
      {
        handle: 'refresh',
        displayName: 'Refresh',
        description:
          'Re-evaluate loadAction and reload the dynamic schema. Aborts any in-flight request and returns {ok:true} on success or {ok:false, error} when loadAction is missing or evaluation throws.',
      },
    ],
    fields: [
      // NOTE: `loadAction` is intentionally NOT declared as `kind:'event'`. It is a
      // prop whose `${}` templates the compiler pre-compiles into the node's
      // propsProgram (compile-once). The renderer consumes the reactively-resolved
      // value from `props.props.loadAction` and dispatches it itself (with a custom
      // AbortSignal + reload change-detection). Declaring it as an event would be a
      // "lying contract" (compiles an unused RendererEventHandler) and would hide
      // the resolved-action change-detection the renderer relies on for reload
      // reactivity. Its shape is validated by the schemaValidator above.
      { key: 'loadAction', kind: 'prop' },
      { key: 'autoLoad', kind: 'prop', valueType: 'boolean' },
      { key: 'body', kind: 'region', regionKey: 'body' },
    ],
  },
  {
    type: 'reaction',
    displayName: 'Reaction',
    category: 'logic',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    component: ReactionRenderer,
    compilation: {
      artifacts: ['reaction'],
    },
    fields: [
      { key: 'watch', kind: 'prop' },
      { key: 'when', kind: 'prop' },
      { key: 'immediate', kind: 'prop' },
      { key: 'debounce', kind: 'prop' },
      { key: 'once', kind: 'prop' },
      { key: 'actions', kind: 'prop' },
    ],
  },
  dialogRendererDefinition,
  drawerRendererDefinition,
  {
    type: 'tabs',
    displayName: 'Tabs',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    component: TabsRenderer,
    propContracts: {
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
            { kind: 'literal', value: 'line' },
          ],
        },
        displayName: 'Variant',
        editorType: 'select',
        defaultValue: 'default',
      },
    },
    componentCapabilityContracts: [
      {
        handle: 'setValue',
        displayName: 'Set Value',
        description: 'Set the active tab value on the current tabs instance.',
        args: {
          kind: 'object',
          fields: {
            value: { kind: 'unknown' },
          },
          optional: ['value'],
        },
        result: { kind: 'unknown' },
      },
      {
        handle: 'getValue',
        displayName: 'Get Value',
        description: 'Read the current active tab value.',
        result: { kind: 'string' },
      },
    ],
    deepFields: [
      {
        key: 'items',
        nestedRegions: [
          {
            key: 'title',
            regionKeySuffix: 'title',
            compiledKey: 'titleRegionKey',
            params: ['item', 'index', 'key'],
          },
          {
            key: 'body',
            regionKeySuffix: 'body',
            compiledKey: 'bodyRegionKey',
            params: ['item', 'index', 'key'],
          },
          {
            key: 'toolbar',
            regionKeySuffix: 'toolbar',
            compiledKey: 'toolbarRegionKey',
            params: ['item', 'index', 'key'],
          },
        ],
        booleanKeys: ['disabled'],
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
              itemRegionPath: `${input.path}.items[${index}]`,
              itemRegionKeyPrefix: `items.${index}`,
              rules: [
                {
                  key: 'title',
                  regionKeySuffix: 'title',
                  compiledKey: 'titleRegionKey',
                  params: ['item', 'index', 'key'] as readonly string[],
                },
                {
                  key: 'body',
                  regionKeySuffix: 'body',
                  compiledKey: 'bodyRegionKey',
                  params: ['item', 'index', 'key'] as readonly string[],
                },
                {
                  key: 'toolbar',
                  regionKeySuffix: 'toolbar',
                  compiledKey: 'toolbarRegionKey',
                  params: ['item', 'index', 'key'] as readonly string[],
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
      { key: 'toolbar', kind: 'region', regionKey: 'toolbar' },
      { key: 'onChange', kind: 'event' },
      { key: 'items', kind: 'prop' },
      { key: 'value', kind: 'prop' },
      { key: 'defaultValue', kind: 'prop' },
      { key: 'valueOwnership', kind: 'prop' },
      { key: 'valueStatePath', kind: 'prop' },
      { key: 'statusPath', kind: 'prop' },
      { key: 'orientation', kind: 'prop' },
      { key: 'variant', kind: 'prop' },
      { key: 'tabsMode', kind: 'prop' },
      { key: 'sidePosition', kind: 'prop' },
      { key: 'contentClassName', kind: 'prop' },
      { key: 'toolbarClassName', kind: 'prop' },
    ],
  },
];
