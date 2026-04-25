import { registerRendererDefinitions, type RendererDefinition, type RendererRegistry } from '@nop-chaos/flux-core';
import { PageRenderer } from './page';
import { ContainerRenderer } from './container';
import { FlexRenderer } from './flex';
import { TextRenderer } from './text';
import { ButtonRenderer } from './button';
import { IconRenderer } from './icon';
import { BadgeRenderer } from './badge';
import { DynamicRenderer } from './dynamic-renderer';
import { ReactionRenderer } from './reaction';
import { DialogRenderer } from './dialog';
import { DrawerRenderer } from './drawer';
import { TabsRenderer } from './tabs';
import { FragmentRenderer } from './fragment';
import { LoopRenderer } from './loop';
import { RecurseRenderer } from './recurse';
import { ScopeDebugRenderer } from './scope-debug';

export * from './schemas';
export { PageRenderer } from './page';
export { ContainerRenderer } from './container';
export { FlexRenderer } from './flex';
export { TextRenderer } from './text';
export { ButtonRenderer } from './button';
export { IconRenderer } from './icon';
export { BadgeRenderer } from './badge';
export { DynamicRenderer } from './dynamic-renderer';
export { ReactionRenderer } from './reaction';
export { DialogRenderer } from './dialog';
export { DrawerRenderer } from './drawer';
export { TabsRenderer } from './tabs';
export { FragmentRenderer } from './fragment';
export { LoopRenderer } from './loop';
export { RecurseRenderer } from './recurse';
export { ScopeDebugRenderer } from './scope-debug';
export { resolveGap } from './utils';

export const basicRendererDefinitions: RendererDefinition[] = [
  {
    type: 'page',
    displayName: 'Page',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    defaultSchema: { type: 'page', body: [] },
    component: PageRenderer,
    injectedLocals: {
      '$page': {
        kind: 'injected-local'
      }
    },
    regions: ['body', 'header', 'footer'],
    fields: [{ key: 'title', kind: 'value-or-region', regionKey: 'title' }, { key: 'modalContainer', kind: 'prop' }, { key: 'statusPath', kind: 'prop' }]
  },
  {
    type: 'container',
    displayName: 'Container',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    defaultSchema: { type: 'container', body: [] },
    component: ContainerRenderer,
    regions: ['body', 'header', 'footer'],
    staticCapable: true
  },
  {
    type: 'fragment',
    displayName: 'Fragment',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    defaultSchema: { type: 'fragment', body: [] },
    component: FragmentRenderer,
    regions: ['body'],
    fields: [
      { key: 'data', kind: 'prop' },
      { key: 'isolate', kind: 'prop' }
    ],
    staticCapable: true
  },
  {
    type: 'loop',
    displayName: 'Loop',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    defaultSchema: { type: 'loop', body: [] },
    component: LoopRenderer,
    regions: ['empty'],
    fields: [
      { key: 'items', kind: 'prop' },
      { key: 'itemName', kind: 'prop' },
      { key: 'indexName', kind: 'prop' },
      { key: 'keyName', kind: 'prop' },
      { key: 'itemData', kind: 'prop' },
      { key: 'keyBy', kind: 'prop' },
      { key: 'body', kind: 'region', params: ['item', 'index'] }
    ]
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
      { key: 'itemData', kind: 'prop' },
      { key: 'keyBy', kind: 'prop' },
      { key: 'maxDepth', kind: 'prop' }
    ]
  },
  {
    type: 'flex',
    displayName: 'Flex',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    defaultSchema: { type: 'flex', body: [] },
    component: FlexRenderer,
    regions: ['body', 'items'],
    staticCapable: true
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
      { key: 'body', kind: 'prop' }
    ],
    staticCapable: true
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
        defaultValue: 'Button'
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
            { kind: 'literal', value: 'link' }
          ]
        },
        displayName: 'Variant',
        editorType: 'select',
        defaultValue: 'default'
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
            { kind: 'literal', value: 'icon-lg' }
          ]
        },
        displayName: 'Size',
        editorType: 'select',
        defaultValue: 'default'
      },
      disabled: {
        shape: { kind: 'boolean' },
        displayName: 'Disabled',
        description: 'Disables user interaction when true.',
        editorType: 'switch'
      }
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
            target: { kind: 'unknown' }
          },
          optional: ['nativeEvent', 'currentTarget', 'target']
        }
      }
    },
    component: ButtonRenderer,
    fields: [{ key: 'onClick', kind: 'event' }]
  },
  {
    type: 'icon',
    displayName: 'Icon',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    component: IconRenderer,
    staticCapable: true
  },
  {
    type: 'badge',
    displayName: 'Badge',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    component: BadgeRenderer,
    staticCapable: true
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
      { key: 'defaultExpand', kind: 'prop' }
    ]
  },
  {
    type: 'dynamic-renderer',
    displayName: 'Dynamic Renderer',
    category: 'advanced',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    component: DynamicRenderer,
    regions: ['body']
  },
  {
    type: 'reaction',
    displayName: 'Reaction',
    category: 'logic',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    component: ReactionRenderer,
    fields: [
      { key: 'watch', kind: 'prop' },
      { key: 'when', kind: 'prop' },
      { key: 'immediate', kind: 'prop' },
      { key: 'debounce', kind: 'prop' },
      { key: 'once', kind: 'prop' },
      { key: 'actions', kind: 'prop' }
    ]
  },
  {
    type: 'dialog',
    displayName: 'Dialog',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    component: DialogRenderer,
    regions: ['body', 'actions'],
    fields: [
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
      { key: 'onOpen', kind: 'event' },
      { key: 'onClose', kind: 'event' },
      { key: 'container', kind: 'prop' },
      { key: 'showMask', kind: 'prop' }
    ]
  },
  {
    type: 'drawer',
    displayName: 'Drawer',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    component: DrawerRenderer,
    regions: ['body', 'actions'],
    fields: [
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
      { key: 'onOpen', kind: 'event' },
      { key: 'onClose', kind: 'event' },
      { key: 'container', kind: 'prop' },
      { key: 'showMask', kind: 'prop' }
    ]
  },
  {
    type: 'tabs',
    displayName: 'Tabs',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-basic',
    component: TabsRenderer,
    regions: ['toolbar'],
    fields: [
      { key: 'onChange', kind: 'event' },
      { key: 'items', kind: 'prop' }
    ]
  }
];

export function registerBasicRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, basicRendererDefinitions);
}
