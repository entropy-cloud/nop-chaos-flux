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
    propContracts: {
      direction: {
        displayName: 'Direction',
        description: 'OA-14: locked to "down" (pull-up loading belongs to infinite-scroll).',
        shape: { kind: 'literal', value: 'down' },
        editorType: 'select',
        defaultValue: 'down',
      },
      disabled: { displayName: 'Disabled', shape: { kind: 'boolean' } },
    },
    eventContracts: {
      onRefresh: {
        displayName: 'On Refresh',
        description:
          'Dispatched when a completed downward pull passes the threshold. Payload: { type, direction, threshold } — direction is always "down" (OA-14); threshold is the configured trigger distance in px.',
        payload: {
          kind: 'object',
          fields: {
            type: { kind: 'string' },
            direction: { kind: 'string' },
            threshold: { kind: 'number' },
          },
        },
      },
    },
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
    propContracts: {
      disabled: { displayName: 'Disabled', shape: { kind: 'boolean' } },
      immediateCheck: { displayName: 'Immediate Check', shape: { kind: 'boolean' } },
      hasMore: { displayName: 'Has More', shape: { kind: 'boolean' } },
      loading: { displayName: 'Loading', shape: { kind: 'boolean' } },
    },
    eventContracts: {
      onLoadMore: {
        displayName: 'On Load More',
        description:
          'Dispatched when the list requests another page. Payload: { type, source } — source discriminates the trigger path: "intersection" (sentinel reached), "immediate" (immediateCheck on mount) or "retry" (user clicked the error retry button).',
        payload: {
          kind: 'object',
          fields: {
            type: { kind: 'string' },
            source: { kind: 'string' },
          },
        },
      },
    },
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
    propContracts: {
      direction: {
        displayName: 'Direction',
        shape: {
          kind: 'union',
          anyOf: ['left', 'right', 'both'].map((v) => ({ kind: 'literal', value: v })),
        },
        editorType: 'select',
        defaultValue: 'right',
      },
      disabled: { displayName: 'Disabled', shape: { kind: 'boolean' } },
      closeOnOutside: { displayName: 'Close On Outside', shape: { kind: 'boolean' } },
    },
    eventContracts: {
      onAction: {
        displayName: 'On Action',
        description:
          'Dispatched when an interactive control inside a revealed action region is clicked. Payload: { type, side } — side is "open-left" (left region revealed) or "open-right" (right region revealed). The cell auto-rebounds after the dispatch.',
        payload: {
          kind: 'object',
          fields: {
            type: { kind: 'string' },
            side: { kind: 'string' },
          },
        },
      },
      onOpen: {
        displayName: 'On Open',
        description:
          'Dispatched when a swipe commits the cell open. Payload: { type, side } — side is "open-left" or "open-right".',
        payload: {
          kind: 'object',
          fields: {
            type: { kind: 'string' },
            side: { kind: 'string' },
          },
        },
      },
      onClose: {
        displayName: 'On Close',
        description:
          'Dispatched when the cell closes (outside pointer, action click, or sub-threshold drag). Payload: { type, side } — side reports the previously open side.',
        payload: {
          kind: 'object',
          fields: {
            type: { kind: 'string' },
            side: { kind: 'string' },
          },
        },
      },
    },
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
    propContracts: {
      millisecond: { displayName: 'Millisecond', shape: { kind: 'boolean' } },
      paused: { displayName: 'Paused', shape: { kind: 'boolean' } },
      autoStart: { displayName: 'Auto Start', shape: { kind: 'boolean' } },
    },
    eventContracts: {
      onFinish: {
        displayName: 'On Finish',
        description:
          'Dispatched exactly once when the countdown reaches zero (time or targetTime elapsed). Payload: { type: "finish" }.',
        payload: {
          kind: 'object',
          fields: {
            type: { kind: 'string' },
          },
        },
      },
    },
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
    propContracts: {
      scrollable: { displayName: 'Scrollable', shape: { kind: 'boolean' } },
      direction: {
        displayName: 'Direction',
        shape: {
          kind: 'union',
          anyOf: ['left', 'right'].map((v) => ({ kind: 'literal', value: v })),
        },
        editorType: 'select',
        defaultValue: 'left',
      },
      loop: { displayName: 'Loop', shape: { kind: 'boolean' } },
      closable: { displayName: 'Closable', shape: { kind: 'boolean' } },
      variant: {
        displayName: 'Variant',
        shape: {
          kind: 'union',
          anyOf: ['info', 'warning', 'success', 'error'].map((v) => ({
            kind: 'literal',
            value: v,
          })),
        },
        editorType: 'select',
        defaultValue: 'info',
      },
    },
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
