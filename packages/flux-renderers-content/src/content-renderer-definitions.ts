import type { RendererDefinition } from '@nop-chaos/flux-core';
import { CardRenderer } from './card.js';
import { EmptyRenderer } from './empty.js';
import { ProgressRenderer } from './progress.js';
import { SeparatorRenderer } from './separator.js';
import { SpinnerRenderer } from './spinner.js';
import type {
  CardSchema,
  EmptySchema,
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
];

export type ContentRendererSchema =
  | SeparatorSchema
  | SpinnerSchema
  | ProgressSchema
  | EmptySchema
  | CardSchema;
