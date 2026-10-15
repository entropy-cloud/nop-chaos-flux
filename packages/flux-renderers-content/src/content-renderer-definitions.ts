import { defineRendererFamily } from '@nop-chaos/flux-core';
import type { RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { AlertRenderer } from './alert-renderer.js';
import { AudioRenderer } from './audio.js';
import { CardRenderer } from './card.js';
import { CardsRenderer } from './cards-renderer.js';
import { CarouselRenderer } from './carousel.js';
import { EmptyRenderer } from './empty.js';
import { HtmlRenderer } from './html.js';
import { ImageRenderer } from './image.js';
import { JsonViewRenderer } from './json-view.js';
import { LinkRenderer } from './link.js';
import { MappingRenderer } from './mapping.js';
import { MarkdownRenderer } from './markdown.js';
import { ProgressRenderer } from './progress.js';
import { QrCodeRenderer } from './qrcode.js';
import { diffViewRendererDefinition } from './diff-view/diff-view-definition.js';
import { ResultRenderer } from './result.js';
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
  ResultSchema,
  SeparatorSchema,
  SpinnerSchema,
  StatusSchema,
  VideoSchema,
} from './schemas.js';

const defineContentRenderer = defineRendererFamily({
  sourcePackage: '@nop-chaos/flux-renderers-content',
  defaultSchema: (type) => ({ type }),
});

export const contentRendererDefinitions: RegisteredRendererDefinition[] = [
  defineContentRenderer({
    type: 'separator',
    displayName: 'Separator',
    category: 'content',
    component: SeparatorRenderer,
    fields: [
      {
        key: 'orientation',
        kind: 'prop',
        contract: {
          displayName: 'Orientation',
          shape: {
            kind: 'union',
            anyOf: ['horizontal', 'vertical'].map((v) => ({ kind: 'literal', value: v })),
          },
          editorType: 'select',
          defaultValue: 'horizontal',
        },
      },
      {
        key: 'decorative',
        kind: 'prop',
        valueType: 'boolean',
        contract: { displayName: 'Decorative', shape: { kind: 'boolean' } }
      },
      { key: 'label', kind: 'value-or-region', regionKey: 'label' },
    ],
  }),
  defineContentRenderer({
    type: 'spinner',
    displayName: 'Spinner',
    category: 'content',
    component: SpinnerRenderer,
    fields: [
      { key: 'label', kind: 'value-or-region', regionKey: 'label' },
      { key: 'size', kind: 'prop' },
      { key: 'visible', kind: 'meta' },
    ],
  }),
  defineContentRenderer({
    type: 'progress',
    displayName: 'Progress',
    category: 'content',
    defaultSchema: { type: 'progress', value: 0 },
    component: ProgressRenderer,
    fields: [
      { key: 'value', kind: 'prop' },
      { key: 'max', kind: 'prop' },
      { key: 'label', kind: 'value-or-region', regionKey: 'label' },
      { key: 'variant', kind: 'prop' },
      { key: 'showValue', kind: 'prop', valueType: 'boolean' },
    ],
  }),
  defineContentRenderer({
    type: 'empty',
    displayName: 'Empty',
    category: 'content',
    component: EmptyRenderer,
    fields: [
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
      { key: 'description', kind: 'value-or-region', regionKey: 'description' },
      { key: 'image', kind: 'prop' },
      { key: 'actions', kind: 'region', regionKey: 'actions' },
    ],
  }),
  defineContentRenderer({
    type: 'result',
    displayName: 'Result',
    category: 'content',
    component: ResultRenderer,
    fields: [
      {
        key: 'status',
        kind: 'prop',
        contract: {
          // 09-01 (plan 483 Phase 7 batch c) adjudicated as an open string:
          // a closed union here makes the runtime strip unknown values before
          // render, which defeats the render-visible dev-warn contract below
          // and the result-status-invalid regression test.
          shape: { kind: 'string' },
          displayName: 'Status',
          description:
            "Final-state semantics mapping to the default icon and semantic color. Defaults to 'info'; unknown values degrade to info with a dev warning (validated at render, not by the shape gate, so authoring mistakes stay visible).",
          editorType: 'select',
          defaultValue: 'info',
        },
      },
      {
        key: 'icon',
        kind: 'prop',
        contract: {
          shape: { kind: 'string' },
          displayName: 'Icon',
          description: 'Optional lucide icon name; overrides the status default icon.',
          editorType: 'expression',
        },
      },
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
      { key: 'description', kind: 'value-or-region', regionKey: 'description' },
      { key: 'actions', kind: 'region', regionKey: 'actions' },
    ],
  }),
  defineContentRenderer({
    type: 'card',
    displayName: 'Card',
    category: 'layout',
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
  }),
  defineContentRenderer({
    type: 'link',
    displayName: 'Link',
    category: 'content',
    component: LinkRenderer,
    fields: [
      { key: 'label', kind: 'value-or-region', regionKey: 'label' },
      { key: 'href', kind: 'prop' },
      {
        key: 'target',
        kind: 'prop',
        contract: {
          displayName: 'Target',
          shape: {
            kind: 'union',
            anyOf: ['_self', '_blank', '_parent', '_top'].map((v) => ({
              kind: 'literal',
              value: v,
            })),
          },
          editorType: 'select',
          defaultValue: '_self',
        },
      },
      { key: 'rel', kind: 'prop' },
      { key: 'download', kind: 'prop' },
      { key: 'onClick', kind: 'event' },
    ],
  }),
  defineContentRenderer({
    type: 'image',
    displayName: 'Image',
    category: 'content',
    component: ImageRenderer,
    fields: [
      { key: 'src', kind: 'prop' },
      { key: 'alt', kind: 'prop' },
      { key: 'title', kind: 'prop' },
      {
        key: 'preview',
        kind: 'prop',
        valueType: 'boolean',
        contract: { displayName: 'Preview', shape: { kind: 'boolean' } }
      },
      { key: 'fit', kind: 'prop' },
      { key: 'width', kind: 'prop' },
      { key: 'height', kind: 'prop' },
      {
        key: 'lazy',
        kind: 'prop',
        valueType: 'boolean',
        contract: { displayName: 'Lazy', shape: { kind: 'boolean' } }
      },
      { key: 'fetcher', kind: 'prop' },
      { key: 'onClick', kind: 'event' },
      { key: 'onLoadError', kind: 'event' },
    ],
  }),
  defineContentRenderer({
    type: 'json-view',
    displayName: 'JSON View',
    category: 'content',
    component: JsonViewRenderer,
    fields: [
      { key: 'value', kind: 'prop' },
      { key: 'collapsed', kind: 'prop' },
      { key: 'showCopy', kind: 'prop', valueType: 'boolean' },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
    ],
  }),
  defineContentRenderer({
    type: 'markdown',
    displayName: 'Markdown',
    category: 'content',
    component: MarkdownRenderer,
    fields: [
      { key: 'content', kind: 'prop' },
      { key: 'src', kind: 'prop' },
      { key: 'allowHtml', kind: 'prop', valueType: 'boolean' },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
    ],
  }),
  defineContentRenderer({
    type: 'html',
    displayName: 'HTML',
    category: 'content',
    component: HtmlRenderer,
    fields: [
      { key: 'content', kind: 'prop' },
      { key: 'sanitize', kind: 'prop', valueType: 'boolean' },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
    ],
  }),
  defineContentRenderer({
    type: 'cards',
    displayName: 'Cards',
    category: 'data',
    component: CardsRenderer,
    fields: [
      {
        key: 'items',
        kind: 'prop',
        contract: {
          shape: { kind: 'array', item: { kind: 'unknown' } },
          displayName: 'Items',
          description:
            'The single collection field: the array of records rendered through the card region.',
          editorType: 'expression',
        },
      },
      { key: 'columns', kind: 'prop' },
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
            'Selection ownership is local controlled state. "none" disables selection, "single" is mutually exclusive, "multiple" accumulates.',
          editorType: 'select',
          defaultValue: 'none',
        },
      },
      {
        key: 'keyField',
        kind: 'prop',
        contract: {
          shape: { kind: 'string' },
          displayName: 'Key Field',
          description: 'Field used to derive a stable per-card key. Falls back to the card index when absent.',
          editorType: 'expression',
          defaultValue: 'id',
        },
      },
      {
        key: 'onItemClick',
        kind: 'event',
        contract: {
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
      },
      {
        key: 'onSelectionChange',
        kind: 'event',
        contract: {
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
      { key: 'card', kind: 'region', params: ['item', 'index'], isolate: false },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
    ],
  }),
  defineContentRenderer({
    type: 'alert',
    displayName: 'Alert',
    category: 'content',
    component: AlertRenderer,
    fields: [
      {
        key: 'level',
        kind: 'prop',
        contract: {
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
      },
      {
        key: 'icon',
        kind: 'prop',
        contract: {
          shape: { kind: 'string' },
          displayName: 'Icon',
          description: 'Optional lucide icon name; overrides the level-default icon.',
          editorType: 'expression',
        },
      },
      {
        key: 'closable',
        kind: 'prop',
        valueType: 'boolean',
        contract: {
          shape: { kind: 'boolean' },
          displayName: 'Closable',
          description: 'When true, renders a close button that fires onClose and hides the alert.',
          editorType: 'switch',
          defaultValue: false,
        },
      },
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
      { key: 'body', kind: 'value-or-region', regionKey: 'body' },
      { key: 'actions', kind: 'region', regionKey: 'actions' },
      {
        key: 'onClose',
        kind: 'event',
        contract: {
          displayName: 'On Close',
          description: 'Dispatched when the close button is clicked (closable=true). Payload: { level }.',
          payload: {
            kind: 'object',
            fields: { level: { kind: 'string' } },
          },
        },
      },
    ],
  }),
  defineContentRenderer({
    type: 'mapping',
    displayName: 'Mapping',
    category: 'content',
    component: MappingRenderer,
    fields: [
      {
        key: 'value',
        kind: 'prop',
        contract: {
          shape: { kind: 'unknown' },
          displayName: 'Value',
          description: 'The input value to map. Looked up against the map table (key coerced to string).',
          editorType: 'expression',
        },
      },
      {
        key: 'map',
        kind: 'prop',
        contract: {
          shape: { kind: 'record', value: { kind: 'unknown' } },
          displayName: 'Map',
          description: 'Lookup table: keys are string-coerced values, values are the rendered result (text/badge fragment).',
          editorType: 'expression',
        },
      },
      {
        key: 'defaultLabel',
        kind: 'prop',
        contract: {
          shape: { kind: 'string' },
          displayName: 'Default Label',
          description: 'Shown when the value is present but misses the map; takes precedence over placeholder on miss.',
          editorType: 'expression',
        },
      },
      {
        key: 'placeholder',
        kind: 'prop',
        contract: {
          shape: { kind: 'string' },
          displayName: 'Placeholder',
          description: 'Shown when the value is empty (null/undefined), or when missing with no defaultLabel.',
          editorType: 'expression',
        },
      },
      { key: 'source', kind: 'prop' },
      { key: 'item', kind: 'region', regionKey: 'item' },
    ],
  }),
  defineContentRenderer({
    type: 'status',
    displayName: 'Status',
    category: 'content',
    component: StatusRenderer,
    fields: [
      {
        key: 'value',
        kind: 'prop',
        contract: {
          shape: { kind: 'unknown' },
          displayName: 'Value',
          description: 'The business status value to project onto a labelled, level-colored Badge.',
          editorType: 'expression',
        },
      },
      {
        key: 'labelMap',
        kind: 'prop',
        contract: {
          shape: { kind: 'record', value: { kind: 'unknown' } },
          displayName: 'Label Map',
          description: 'Value→display label table. A value not present here is treated as a miss (placeholder fallback).',
          editorType: 'expression',
        },
      },
      {
        key: 'levelMap',
        kind: 'prop',
        contract: {
          shape: { kind: 'record', value: { kind: 'unknown' } },
          displayName: 'Level Map',
          description: 'Value→semantic level table (success/warning/error/info/default/processing/pending/inactive). Projects to Badge color.',
          editorType: 'expression',
        },
      },
      {
        key: 'iconMap',
        kind: 'prop',
        contract: {
          shape: { kind: 'record', value: { kind: 'unknown' } },
          displayName: 'Icon Map',
          description: 'Value→lucide icon name table. Optional; missing keys render without an icon.',
          editorType: 'expression',
        },
      },
      {
        key: 'placeholder',
        kind: 'prop',
        contract: {
          shape: { kind: 'string' },
          displayName: 'Placeholder',
          description: 'Shown when the value is empty or misses the labelMap.',
          editorType: 'expression',
        },
      },
    ],
  }),
  defineContentRenderer({
    type: 'audio',
    displayName: 'Audio',
    category: 'content',
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
  }),
  defineContentRenderer({
    type: 'video',
    displayName: 'Video',
    category: 'content',
    component: VideoRenderer,
    fields: [
      { key: 'src', kind: 'prop' },
      { key: 'poster', kind: 'prop' },
      { key: 'autoPlay', kind: 'prop', valueType: 'boolean' },
      { key: 'loop', kind: 'prop', valueType: 'boolean' },
      { key: 'controls', kind: 'prop', valueType: 'boolean' },
      { key: 'muted', kind: 'prop', valueType: 'boolean' },
      { key: 'width', kind: 'prop' },
      { key: 'height', kind: 'prop' },
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
      { key: 'onLoadError', kind: 'event' },
    ],
  }),
  defineContentRenderer({
    type: 'carousel',
    displayName: 'Carousel',
    category: 'content',
    component: CarouselRenderer,
    fields: [
      {
        key: 'items',
        kind: 'prop',
        contract: {
          shape: { kind: 'array', item: { kind: 'unknown' } },
          displayName: 'Items',
          description: 'The slide collection: each item may carry image/title/caption.',
          editorType: 'expression',
        },
      },
      { key: 'autoPlay', kind: 'prop', valueType: 'boolean' },
      { key: 'interval', kind: 'prop' },
      { key: 'loop', kind: 'prop', valueType: 'boolean' },
      { key: 'controls', kind: 'prop', valueType: 'boolean' },
      { key: 'indicators', kind: 'prop', valueType: 'boolean' },
      {
        key: 'onChange',
        kind: 'event',
        contract: {
          displayName: 'On Change',
          description:
            'Dispatched when the active slide changes (embla select/autoplay/indicators/handle). Payload: { activeIndex, item } — a single canonical activeIndex key aligned with the schema/state field name.',
          payload: {
            kind: 'object',
            fields: {
              activeIndex: { kind: 'number' },
              item: { kind: 'unknown' },
            },
          },
        },
      },
    ],
  }),
  defineContentRenderer({
    type: 'qrcode',
    displayName: 'QR Code',
    category: 'content',
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
  }),
  diffViewRendererDefinition,
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
  | ResultSchema
  | DiffViewSchema;
