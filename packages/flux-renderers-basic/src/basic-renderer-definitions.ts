import type { RendererDefinition } from '@nop-chaos/flux-core';
import { BadgeRenderer } from './badge';
import { ButtonRenderer } from './button';
import { ContainerRenderer } from './container';
import { DialogRenderer } from './dialog';
import { DrawerRenderer } from './drawer';
import { DynamicRenderer } from './dynamic-renderer';
import { FlexRenderer } from './flex';
import { FragmentRenderer } from './fragment';
import { IconRenderer } from './icon';
import { LoopRenderer } from './loop';
import { PageRenderer } from './page';
import { ReactionRenderer } from './reaction';
import { RecurseRenderer } from './recurse';
import { ScopeDebugRenderer } from './scope-debug';
import { TabsRenderer } from './tabs';
import { TextRenderer } from './text';

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
      { key: 'itemData', kind: 'prop' },
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
      { key: 'itemData', kind: 'prop' },
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
    fields: [{ key: 'onClick', kind: 'event' }],
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
    fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
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
    fields: [
      { key: 'toolbar', kind: 'region', regionKey: 'toolbar' },
      { key: 'onChange', kind: 'event' },
      { key: 'items', kind: 'prop' },
    ],
  },
];
