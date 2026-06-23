import type { RendererDefinition } from '@nop-chaos/flux-core';
import { AlertRenderer } from './alert-renderer.js';
import { CardRenderer } from './card.js';
import { CardsRenderer } from './cards-renderer.js';
import { EmptyRenderer } from './empty.js';
import { HtmlRenderer } from './html.js';
import { ImageRenderer } from './image.js';
import { JsonViewRenderer } from './json-view.js';
import { LinkRenderer } from './link.js';
import { MarkdownRenderer } from './markdown.js';
import { ProgressRenderer } from './progress.js';
import { SeparatorRenderer } from './separator.js';
import { SpinnerRenderer } from './spinner.js';
import type {
  AlertSchema,
  CardSchema,
  CardsSchema,
  EmptySchema,
  HtmlSchema,
  ImageSchema,
  JsonViewSchema,
  LinkSchema,
  MarkdownSchema,
  ProgressSchema,
  SeparatorSchema,
  SpinnerSchema,
} from './schemas.js';

export const contentRendererDefinitions: RendererDefinition[] = [
  {
    type: 'separator',
    displayName: 'Separator',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    defaultSchema: { type: 'separator' },
    component: SeparatorRenderer,
    fields: [
      { key: 'orientation', kind: 'prop' },
      { key: 'decorative', kind: 'prop', valueType: 'boolean' },
      { key: 'label', kind: 'value-or-region', regionKey: 'label' },
    ],
  },
  {
    type: 'spinner',
    displayName: 'Spinner',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    defaultSchema: { type: 'spinner' },
    component: SpinnerRenderer,
    fields: [
      { key: 'label', kind: 'value-or-region', regionKey: 'label' },
      { key: 'size', kind: 'prop' },
      { key: 'visible', kind: 'meta' },
    ],
  },
  {
    type: 'progress',
    displayName: 'Progress',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    defaultSchema: { type: 'progress', value: 0 },
    component: ProgressRenderer,
    fields: [
      { key: 'value', kind: 'prop' },
      { key: 'max', kind: 'prop' },
      { key: 'label', kind: 'value-or-region', regionKey: 'label' },
      { key: 'variant', kind: 'prop' },
      { key: 'showValue', kind: 'prop', valueType: 'boolean' },
    ],
  },
  {
    type: 'empty',
    displayName: 'Empty',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    defaultSchema: { type: 'empty' },
    component: EmptyRenderer,
    fields: [
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
      { key: 'description', kind: 'value-or-region', regionKey: 'description' },
      { key: 'image', kind: 'prop' },
      { key: 'actions', kind: 'region', regionKey: 'actions' },
    ],
  },
  {
    type: 'card',
    displayName: 'Card',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    defaultSchema: { type: 'card', body: [] },
    component: CardRenderer,
    fields: [
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
      { key: 'header', kind: 'region', regionKey: 'header' },
      { key: 'body', kind: 'region', regionKey: 'body' },
      { key: 'footer', kind: 'region', regionKey: 'footer' },
      { key: 'actions', kind: 'region', regionKey: 'actions' },
      { key: 'image', kind: 'prop' },
      { key: 'variant', kind: 'prop' },
      { key: 'onClick', kind: 'event' },
    ],
  },
  {
    type: 'link',
    displayName: 'Link',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    defaultSchema: { type: 'link' },
    component: LinkRenderer,
    fields: [
      { key: 'label', kind: 'value-or-region', regionKey: 'label' },
      { key: 'href', kind: 'prop' },
      { key: 'target', kind: 'prop' },
      { key: 'rel', kind: 'prop' },
      { key: 'onClick', kind: 'event' },
    ],
  },
  {
    type: 'image',
    displayName: 'Image',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    defaultSchema: { type: 'image' },
    component: ImageRenderer,
    fields: [
      { key: 'src', kind: 'prop' },
      { key: 'alt', kind: 'prop' },
      { key: 'title', kind: 'prop' },
      { key: 'preview', kind: 'prop', valueType: 'boolean' },
      { key: 'fit', kind: 'prop' },
      { key: 'width', kind: 'prop' },
      { key: 'height', kind: 'prop' },
      { key: 'lazy', kind: 'prop', valueType: 'boolean' },
      { key: 'onClick', kind: 'event' },
      { key: 'onLoadError', kind: 'event' },
    ],
  },
  {
    type: 'json-view',
    displayName: 'JSON View',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    defaultSchema: { type: 'json-view' },
    component: JsonViewRenderer,
    fields: [
      { key: 'value', kind: 'prop' },
      { key: 'collapsed', kind: 'prop' },
      { key: 'showCopy', kind: 'prop', valueType: 'boolean' },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
    ],
  },
  {
    type: 'markdown',
    displayName: 'Markdown',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    defaultSchema: { type: 'markdown' },
    component: MarkdownRenderer,
    fields: [
      { key: 'content', kind: 'prop' },
      { key: 'allowHtml', kind: 'prop', valueType: 'boolean' },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
    ],
  },
  {
    type: 'html',
    displayName: 'HTML',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    defaultSchema: { type: 'html' },
    component: HtmlRenderer,
    fields: [
      { key: 'content', kind: 'prop' },
      { key: 'sanitize', kind: 'prop', valueType: 'boolean' },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
    ],
  },
  {
    type: 'cards',
    displayName: 'Cards',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    defaultSchema: { type: 'cards' },
    component: CardsRenderer,
    propContracts: {
      items: {
        shape: { kind: 'array', item: { kind: 'unknown' } },
        displayName: 'Items',
        description:
          'The single collection field: the array of records rendered through the card region.',
        editorType: 'expression',
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
          'Selection ownership is local controlled state. "none" disables selection, "single" is mutually exclusive, "multiple" accumulates.',
        editorType: 'select',
        defaultValue: 'none',
      },
      keyField: {
        shape: { kind: 'string' },
        displayName: 'Key Field',
        description: 'Field used to derive a stable per-card key. Falls back to the card index when absent.',
        editorType: 'expression',
        defaultValue: 'id',
      },
    },
    eventContracts: {
      onItemClick: {
        displayName: 'On Item Click',
        description:
          'Dispatched when a card is clicked. Payload: { item, index, key }. The action scope is the per-card scope, so item/index are also reachable as scope values.',
        payload: {
          kind: 'object',
          fields: {
            item: { kind: 'unknown' },
            index: { kind: 'number' },
            key: { kind: 'string' },
          },
        },
      },
      onSelectionChange: {
        displayName: 'On Selection Change',
        description: 'Dispatched when the local selection changes. Payload: { selectedKeys, selectionMode }.',
        payload: {
          kind: 'object',
          fields: {
            selectedKeys: { kind: 'array', item: { kind: 'string' } },
            selectionMode: { kind: 'string' },
          },
        },
      },
      onPageChange: {
        displayName: 'On Page Change',
        description:
          'Dispatched when a bridge to an external pagination renderer reports a page change. Payload: { currentPage, pageSize }.',
        payload: {
          kind: 'object',
          fields: {
            currentPage: { kind: 'number' },
            pageSize: { kind: 'number' },
          },
        },
      },
    },
    fields: [
      { key: 'items', kind: 'prop' },
      { key: 'selectionMode', kind: 'prop' },
      { key: 'keyField', kind: 'prop' },
      { key: 'selectionOwnership', kind: 'prop' },
      { key: 'selectionStatePath', kind: 'prop' },
      { key: 'onItemClick', kind: 'event' },
      { key: 'onSelectionChange', kind: 'event' },
      { key: 'onPageChange', kind: 'event' },
      { key: 'card', kind: 'region', params: ['item', 'index'], isolate: false },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
    ],
  },
  {
    type: 'alert',
    displayName: 'Alert',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    defaultSchema: { type: 'alert' },
    component: AlertRenderer,
    propContracts: {
      level: {
        shape: {
          kind: 'union',
          anyOf: [
            { kind: 'literal', value: 'info' },
            { kind: 'literal', value: 'success' },
            { kind: 'literal', value: 'warning' },
            { kind: 'literal', value: 'error' },
          ],
        },
        displayName: 'Level',
        description: 'Feedback level mapping to visual variant + default icon. Defaults to "info".',
        editorType: 'select',
        defaultValue: 'info',
      },
      icon: {
        shape: { kind: 'string' },
        displayName: 'Icon',
        description: 'Optional lucide icon name; overrides the level-default icon.',
        editorType: 'expression',
      },
      closable: {
        shape: { kind: 'boolean' },
        displayName: 'Closable',
        description: 'When true, renders a close button that fires onClose and hides the alert.',
        editorType: 'switch',
        defaultValue: false,
      },
    },
    eventContracts: {
      onClose: {
        displayName: 'On Close',
        description: 'Dispatched when the close button is clicked (closable=true). Payload: { level }.',
        payload: {
          kind: 'object',
          fields: { level: { kind: 'string' } },
        },
      },
    },
    fields: [
      { key: 'level', kind: 'prop' },
      { key: 'icon', kind: 'prop' },
      { key: 'closable', kind: 'prop', valueType: 'boolean' },
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
      { key: 'body', kind: 'value-or-region', regionKey: 'body' },
      { key: 'actions', kind: 'region', regionKey: 'actions' },
      { key: 'onClose', kind: 'event' },
    ],
  },
];

export type ContentRendererSchema =
  | SeparatorSchema
  | SpinnerSchema
  | ProgressSchema
  | EmptySchema
  | CardSchema
  | LinkSchema
  | ImageSchema
  | JsonViewSchema
  | MarkdownSchema
  | HtmlSchema
  | CardsSchema
  | AlertSchema;
