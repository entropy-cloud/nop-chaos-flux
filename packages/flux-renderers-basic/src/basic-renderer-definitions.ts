import type { RendererDefinition } from '@nop-chaos/flux-core';
import { extractNestedSchemaRegions } from '@nop-chaos/flux-core';
import { BadgeRenderer } from './badge.js';
import { ButtonRenderer } from './button.js';
import { ContainerRenderer } from './container.js';
import { DialogRenderer } from './dialog.js';
import { DrawerRenderer } from './drawer.js';
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
    fields: [
      { key: 'disabled', kind: 'meta' },
      { key: 'onClick', kind: 'event' },
    ],
  },
  {
    type: 'icon',
    displayName: 'Icon',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    component: IconRenderer,
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
    fields: [
      { key: 'loadAction', kind: 'prop' },
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
  {
    type: 'dialog',
    displayName: 'Dialog',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    component: DialogRenderer,
    fields: [
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
      { key: 'body', kind: 'region', regionKey: 'body' },
      { key: 'actions', kind: 'region', regionKey: 'actions' },
      { key: 'onOpen', kind: 'event' },
      { key: 'onClose', kind: 'event' },
      { key: 'data', kind: 'prop' },
      { key: 'container', kind: 'prop' },
      { key: 'showMask', kind: 'prop' },
    ],
  },
  {
    type: 'drawer',
    displayName: 'Drawer',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    component: DrawerRenderer,
    fields: [
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
      { key: 'body', kind: 'region', regionKey: 'body' },
      { key: 'actions', kind: 'region', regionKey: 'actions' },
      { key: 'onOpen', kind: 'event' },
      { key: 'onClose', kind: 'event' },
      { key: 'data', kind: 'prop' },
      { key: 'container', kind: 'prop' },
      { key: 'showMask', kind: 'prop' },
    ],
  },
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
            isolate: true,
          },
          {
            key: 'body',
            regionKeySuffix: 'body',
            compiledKey: 'bodyRegionKey',
            params: ['item', 'index', 'key'],
            isolate: true,
          },
          {
            key: 'toolbar',
            regionKeySuffix: 'toolbar',
            compiledKey: 'toolbarRegionKey',
            params: ['item', 'index', 'key'],
            isolate: true,
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
                  isolate: true,
                },
                {
                  key: 'body',
                  regionKeySuffix: 'body',
                  compiledKey: 'bodyRegionKey',
                  params: ['item', 'index', 'key'] as readonly string[],
                  isolate: true,
                },
                {
                  key: 'toolbar',
                  regionKeySuffix: 'toolbar',
                  compiledKey: 'toolbarRegionKey',
                  params: ['item', 'index', 'key'] as readonly string[],
                  isolate: true,
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
