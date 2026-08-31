import type { RendererDefinition } from '@nop-chaos/flux-core';
import { TabsRenderer } from './tabs.js';

export const tabsRendererDefinition: RendererDefinition = {
  type: 'tabs',
  displayName: 'Tabs',
  category: 'layout',
  sourcePackage: '@nop-chaos/flux-renderers-basic',
  component: TabsRenderer,
  propContracts: {
    items: {
      shape: {
        kind: 'array',
        item: {
          kind: 'schema-definition',
          fieldRules: {
            title: {
              kind: 'value-or-region',
              regionKey: 'titleRegionKey',
              params: ['item', 'index', 'key'],
            },
            body: {
              kind: 'region',
              regionKey: 'bodyRegionKey',
              params: ['item', 'index', 'key'],
            },
            toolbar: {
              kind: 'region',
              regionKey: 'toolbarRegionKey',
              params: ['item', 'index', 'key'],
            },
            disabled: 'value',
          },
        },
      },
      displayName: 'Items',
      description:
        'Tab item collection. Each item carries title (value-or-region) / body / toolbar regions plus key/disabled flags.',
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
          { kind: 'literal', value: 'line' },
        ],
      },
      displayName: 'Variant',
      editorType: 'select',
      defaultValue: 'default',
    },
    itemsOwnership: {
      shape: {
        kind: 'union',
        anyOf: [
          { kind: 'literal', value: 'local' },
          { kind: 'literal', value: 'controlled' },
          { kind: 'literal', value: 'scope' },
        ],
      },
      displayName: 'Items Ownership',
      description:
        'Collection ownership axis for view management. local: component-session collection after the first management mutation; scope: mutations write back to itemsStatePath; controlled: mutations are refused.',
      editorType: 'select',
      defaultValue: 'local',
    },
    itemsStatePath: {
      shape: { kind: 'string' },
      displayName: 'Items State Path',
      description: "Scope read/write path for the tab item collection under itemsOwnership: 'scope'.",
      editorType: 'expression',
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
    {
      handle: 'addTab',
      displayName: 'Add Tab',
      description:
        'Insert a tab item (value auto-generated when absent; out-of-range index appends). Refused under controlled items ownership.',
      args: {
        kind: 'object',
        fields: {
          item: { kind: 'object', fields: {} },
          index: { kind: 'number' },
        },
        optional: ['index'],
      },
      result: { kind: 'unknown' },
    },
    {
      handle: 'removeTab',
      displayName: 'Remove Tab',
      description:
        'Remove the tab item by value; removing the active tab migrates the active pointer (nearest-right → nearest-left). The last remaining tab is guarded.',
      args: {
        kind: 'object',
        fields: {
          value: { kind: 'string' },
        },
      },
      result: { kind: 'unknown' },
    },
    {
      handle: 'renameTab',
      displayName: 'Rename Tab',
      description: 'Rename the tab item identified by value (blank titles are refused).',
      args: {
        kind: 'object',
        fields: {
          value: { kind: 'string' },
          title: { kind: 'string' },
        },
      },
      result: { kind: 'unknown' },
    },
    {
      handle: 'moveTab',
      displayName: 'Move Tab',
      description: 'Move the tab item identified by value to a target index (clamped to the collection bounds).',
      args: {
        kind: 'object',
        fields: {
          value: { kind: 'string' },
          toIndex: { kind: 'number' },
        },
      },
      result: { kind: 'unknown' },
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
    { key: 'closable', kind: 'prop', valueType: 'boolean' },
    { key: 'draggable', kind: 'prop', valueType: 'boolean' },
    { key: 'addable', kind: 'prop', valueType: 'boolean' },
    { key: 'itemsOwnership', kind: 'prop' },
    { key: 'itemsStatePath', kind: 'prop' },
    { key: 'contentClassName', kind: 'prop' },
    { key: 'toolbarClassName', kind: 'prop' },
    { key: 'onTabAdd', kind: 'event' },
    { key: 'onTabClose', kind: 'event' },
    { key: 'onTabRename', kind: 'event' },
    { key: 'onTabMove', kind: 'event' },
  ],
};
