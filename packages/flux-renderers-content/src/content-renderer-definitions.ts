import type { RendererDefinition } from '@nop-chaos/flux-core';
import { AlertRenderer } from './alert-renderer.js';
import { AudioRenderer } from './audio.js';
import { CardRenderer } from './card.js';
import { CardsRenderer } from './cards-renderer.js';
import { CarouselRenderer } from './carousel.js';
import { DiffViewRenderer } from './diff-view/diff-view-renderer.js';
import { EmptyRenderer } from './empty.js';
import { HtmlRenderer } from './html.js';
import { ImageRenderer } from './image.js';
import { JsonViewRenderer } from './json-view.js';
import { LinkRenderer } from './link.js';
import { MappingRenderer } from './mapping.js';
import { MarkdownRenderer } from './markdown.js';
import { ProgressRenderer } from './progress.js';
import { QrCodeRenderer } from './qrcode.js';
import { SeparatorRenderer } from './separator.js';
import { SpinnerRenderer } from './spinner.js';
import { StatusRenderer } from './status.js';
import { VideoRenderer } from './video.js';
import type {
  AlertSchema,
  AudioSchema,
  CardSchema,
  CardsSchema,
  CarouselSchema,
  DiffViewSchema,
  EmptySchema,
  HtmlSchema,
  ImageSchema,
  JsonViewSchema,
  LinkSchema,
  MappingSchema,
  MarkdownSchema,
  ProgressSchema,
  QrCodeSchema,
  SeparatorSchema,
  SpinnerSchema,
  StatusSchema,
  VideoSchema,
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
      { key: 'imageClassName', kind: 'prop' },
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
      { key: 'fetcher', kind: 'prop' },
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
      { key: 'src', kind: 'prop' },
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
    },
    fields: [
      { key: 'items', kind: 'prop' },
      { key: 'columns', kind: 'prop' },
      { key: 'selectionMode', kind: 'prop' },
      { key: 'keyField', kind: 'prop' },
      { key: 'onItemClick', kind: 'event' },
      { key: 'onSelectionChange', kind: 'event' },
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
  {
    type: 'mapping',
    displayName: 'Mapping',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    defaultSchema: { type: 'mapping' },
    component: MappingRenderer,
    propContracts: {
      value: {
        shape: { kind: 'unknown' },
        displayName: 'Value',
        description: 'The input value to map. Looked up against the map table (key coerced to string).',
        editorType: 'expression',
      },
      map: {
        shape: { kind: 'record', value: { kind: 'unknown' } },
        displayName: 'Map',
        description: 'Lookup table: keys are string-coerced values, values are the rendered result (text/badge fragment).',
        editorType: 'expression',
      },
      defaultLabel: {
        shape: { kind: 'string' },
        displayName: 'Default Label',
        description: 'Shown when the value is present but misses the map; takes precedence over placeholder on miss.',
        editorType: 'expression',
      },
      placeholder: {
        shape: { kind: 'string' },
        displayName: 'Placeholder',
        description: 'Shown when the value is empty (null/undefined), or when missing with no defaultLabel.',
        editorType: 'expression',
      },
    },
    fields: [
      { key: 'value', kind: 'prop' },
      { key: 'map', kind: 'prop' },
      { key: 'defaultLabel', kind: 'prop' },
      { key: 'placeholder', kind: 'prop' },
      { key: 'source', kind: 'prop' },
      { key: 'item', kind: 'region', regionKey: 'item' },
    ],
  },
  {
    type: 'status',
    displayName: 'Status',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    defaultSchema: { type: 'status' },
    component: StatusRenderer,
    propContracts: {
      value: {
        shape: { kind: 'unknown' },
        displayName: 'Value',
        description: 'The business status value to project onto a labelled, level-colored Badge.',
        editorType: 'expression',
      },
      labelMap: {
        shape: { kind: 'record', value: { kind: 'string' } },
        displayName: 'Label Map',
        description: 'Value→display label table. A value not present here is treated as a miss (placeholder fallback).',
        editorType: 'expression',
      },
      levelMap: {
        shape: { kind: 'record', value: { kind: 'string' } },
        displayName: 'Level Map',
        description: 'Value→semantic level table (success/warning/error/info/default/processing/pending/inactive). Projects to Badge color.',
        editorType: 'expression',
      },
      iconMap: {
        shape: { kind: 'record', value: { kind: 'string' } },
        displayName: 'Icon Map',
        description: 'Value→lucide icon name table. Optional; missing keys render without an icon.',
        editorType: 'expression',
      },
      placeholder: {
        shape: { kind: 'string' },
        displayName: 'Placeholder',
        description: 'Shown when the value is empty or misses the labelMap.',
        editorType: 'expression',
      },
    },
    fields: [
      { key: 'value', kind: 'prop' },
      { key: 'labelMap', kind: 'prop' },
      { key: 'levelMap', kind: 'prop' },
      { key: 'iconMap', kind: 'prop' },
      { key: 'placeholder', kind: 'prop' },
    ],
  },
  {
    type: 'audio',
    displayName: 'Audio',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    defaultSchema: { type: 'audio' },
    component: AudioRenderer,
    fields: [
      { key: 'src', kind: 'prop' },
      { key: 'poster', kind: 'prop' },
      { key: 'autoPlay', kind: 'prop', valueType: 'boolean' },
      { key: 'loop', kind: 'prop', valueType: 'boolean' },
      { key: 'controls', kind: 'prop', valueType: 'boolean' },
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
      { key: 'onLoadError', kind: 'event' },
    ],
  },
  {
    type: 'video',
    displayName: 'Video',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    defaultSchema: { type: 'video' },
    component: VideoRenderer,
    fields: [
      { key: 'src', kind: 'prop' },
      { key: 'poster', kind: 'prop' },
      { key: 'autoPlay', kind: 'prop', valueType: 'boolean' },
      { key: 'loop', kind: 'prop', valueType: 'boolean' },
      { key: 'controls', kind: 'prop', valueType: 'boolean' },
      { key: 'muted', kind: 'prop', valueType: 'boolean' },
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
      { key: 'onLoadError', kind: 'event' },
    ],
  },
  {
    type: 'carousel',
    displayName: 'Carousel',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    defaultSchema: { type: 'carousel' },
    component: CarouselRenderer,
    propContracts: {
      items: {
        shape: { kind: 'array', item: { kind: 'unknown' } },
        displayName: 'Items',
        description: 'The slide collection: each item may carry image/title/caption.',
        editorType: 'expression',
      },
    },
    fields: [
      { key: 'items', kind: 'prop' },
      { key: 'autoPlay', kind: 'prop', valueType: 'boolean' },
      { key: 'interval', kind: 'prop' },
      { key: 'loop', kind: 'prop', valueType: 'boolean' },
      { key: 'controls', kind: 'prop', valueType: 'boolean' },
      { key: 'indicators', kind: 'prop', valueType: 'boolean' },
      { key: 'onChange', kind: 'event' },
    ],
  },
  {
    type: 'qrcode',
    displayName: 'QR Code',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    defaultSchema: { type: 'qrcode' },
    component: QrCodeRenderer,
    fields: [
      { key: 'value', kind: 'prop' },
      { key: 'size', kind: 'prop' },
      { key: 'level', kind: 'prop' },
      { key: 'foreground', kind: 'prop' },
      { key: 'background', kind: 'prop' },
      { key: 'label', kind: 'value-or-region', regionKey: 'label' },
      { key: 'onLoadError', kind: 'event' },
    ],
  },
  {
    type: 'diff-view',
    displayName: 'Diff View',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-content',
    defaultSchema: { type: 'diff-view', viewType: 'split', showLineNumbers: true },
    component: DiffViewRenderer,
    fields: [
      { key: 'oldContent', kind: 'prop' },
      { key: 'newContent', kind: 'prop' },
      { key: 'middleContent', kind: 'prop' },
      { key: 'files', kind: 'prop' },
      { key: 'activeFileIndex', kind: 'prop' },
      { key: 'language', kind: 'prop' },
      { key: 'viewType', kind: 'prop' },
      { key: 'showLineNumbers', kind: 'prop', valueType: 'boolean' },
      { key: 'showInlineDiff', kind: 'prop', valueType: 'boolean' },
      { key: 'defaultCollapsedLines', kind: 'prop' },
      { key: 'wrapLines', kind: 'prop', valueType: 'boolean' },
      { key: 'onLineClick', kind: 'event' },
      { key: 'onHunkExpand', kind: 'event' },
      { key: 'toggleViewType', kind: 'reaction' },
      { key: 'setViewType', kind: 'reaction' },
      { key: 'expandAll', kind: 'reaction' },
      { key: 'collapseAll', kind: 'reaction' },
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
  | AlertSchema
  | MappingSchema
  | StatusSchema
  | AudioSchema
  | VideoSchema
  | CarouselSchema
  | QrCodeSchema
  | DiffViewSchema;
