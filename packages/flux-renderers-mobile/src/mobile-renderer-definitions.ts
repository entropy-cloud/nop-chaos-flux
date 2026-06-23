import type { RendererDefinition } from '@nop-chaos/flux-core';
import type {
  CountdownSchema,
  InfiniteScrollSchema,
  NoticeBarSchema,
  PullRefreshSchema,
  SwipeCellSchema,
} from './schemas.js';
import { CountdownRenderer } from './countdown.js';
import { InfiniteScrollRenderer } from './infinite-scroll.js';
import { NoticeBarRenderer } from './notice-bar.js';
import { PullRefreshRenderer } from './pull-refresh.js';
import { SwipeCellRenderer } from './swipe-cell.js';

export const mobileRendererDefinitions: RendererDefinition[] = [
  {
    type: 'pull-refresh',
    displayName: 'Pull Refresh',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-mobile',
    defaultSchema: { type: 'pull-refresh', body: [] },
    component: PullRefreshRenderer,
    fields: [
      { key: 'body', kind: 'region', regionKey: 'body' },
      // OA-14: `direction` is locked to 'down' (pull-up loading belongs to
      // `infinite-scroll`). Kept as a field so existing schemas with
      // `direction: 'down'` remain valid; `'up'` is now a TS compile error.
      { key: 'direction', kind: 'prop' },
      { key: 'threshold', kind: 'prop' },
      { key: 'loadingText', kind: 'prop' },
      { key: 'pullingText', kind: 'prop' },
      { key: 'loosingText', kind: 'prop' },
      { key: 'successText', kind: 'prop' },
      { key: 'successDuration', kind: 'prop' },
      { key: 'animationDuration', kind: 'prop' },
      { key: 'disabled', kind: 'prop', valueType: 'boolean' },
      { key: 'onRefresh', kind: 'event' },
    ],
  },
  {
    type: 'infinite-scroll',
    displayName: 'Infinite Scroll',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-mobile',
    defaultSchema: { type: 'infinite-scroll', body: [] },
    component: InfiniteScrollRenderer,
    fields: [
      { key: 'body', kind: 'region', regionKey: 'body' },
      { key: 'distance', kind: 'prop' },
      { key: 'disabled', kind: 'prop', valueType: 'boolean' },
      { key: 'loadingText', kind: 'prop' },
      { key: 'finishedText', kind: 'prop' },
      { key: 'errorText', kind: 'prop' },
      { key: 'immediateCheck', kind: 'prop', valueType: 'boolean' },
      { key: 'hasMore', kind: 'prop', valueType: 'boolean' },
      { key: 'loading', kind: 'prop', valueType: 'boolean' },
      { key: 'error', kind: 'prop' },
      { key: 'onLoadMore', kind: 'event' },
    ],
  },
  {
    type: 'swipe-cell',
    displayName: 'Swipe Cell',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-mobile',
    defaultSchema: { type: 'swipe-cell', body: [] },
    component: SwipeCellRenderer,
    fields: [
      { key: 'body', kind: 'region', regionKey: 'body' },
      { key: 'left', kind: 'region', regionKey: 'left' },
      { key: 'right', kind: 'region', regionKey: 'right' },
      { key: 'threshold', kind: 'prop' },
      { key: 'direction', kind: 'prop' },
      { key: 'disabled', kind: 'prop', valueType: 'boolean' },
      { key: 'closeOnOutside', kind: 'prop', valueType: 'boolean' },
      { key: 'onAction', kind: 'event' },
      { key: 'onOpen', kind: 'event' },
      { key: 'onClose', kind: 'event' },
    ],
  },
  {
    type: 'countdown',
    displayName: 'Countdown',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-mobile',
    defaultSchema: { type: 'countdown', time: 60_000 },
    component: CountdownRenderer,
    fields: [
      { key: 'time', kind: 'prop' },
      { key: 'targetTime', kind: 'prop' },
      { key: 'format', kind: 'prop' },
      { key: 'millisecond', kind: 'prop', valueType: 'boolean' },
      { key: 'paused', kind: 'prop', valueType: 'boolean' },
      { key: 'autoStart', kind: 'prop', valueType: 'boolean' },
      { key: 'prefix', kind: 'prop' },
      { key: 'suffix', kind: 'prop' },
      { key: 'onFinish', kind: 'event' },
    ],
  },
  {
    type: 'notice-bar',
    displayName: 'Notice Bar',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-mobile',
    defaultSchema: { type: 'notice-bar', text: 'Notice' },
    component: NoticeBarRenderer,
    fields: [
      { key: 'text', kind: 'prop' },
      { key: 'scrollable', kind: 'prop', valueType: 'boolean' },
      { key: 'speed', kind: 'prop' },
      { key: 'direction', kind: 'prop' },
      { key: 'loop', kind: 'prop', valueType: 'boolean' },
      { key: 'closable', kind: 'prop', valueType: 'boolean' },
      { key: 'icon', kind: 'prop' },
      { key: 'variant', kind: 'prop' },
      { key: 'onClick', kind: 'event' },
      { key: 'onClose', kind: 'event' },
    ],
  },
];

export type MobileRendererSchema =
  | PullRefreshSchema
  | InfiniteScrollSchema
  | SwipeCellSchema
  | CountdownSchema
  | NoticeBarSchema;
