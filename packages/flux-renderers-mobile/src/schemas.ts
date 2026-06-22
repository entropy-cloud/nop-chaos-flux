import type { BaseSchema, SchemaValue } from '@nop-chaos/flux-core';
import type { ActionSchema } from '@nop-chaos/flux-core';

export interface PullRefreshSchema extends BaseSchema {
  type: 'pull-refresh';
  direction?: 'down' | 'up';
  threshold?: number;
  loadingText?: string;
  pullingText?: string;
  loosingText?: string;
  successText?: string;
  successDuration?: number;
  animationDuration?: number;
  disabled?: boolean;
  onRefresh?: ActionSchema;
}

export interface InfiniteScrollSchema extends BaseSchema {
  type: 'infinite-scroll';
  distance?: number;
  disabled?: boolean;
  loadingText?: string;
  finishedText?: string;
  errorText?: string;
  immediateCheck?: boolean;
  onLoadMore?: ActionSchema;
}

export interface SwipeCellSchema extends BaseSchema {
  type: 'swipe-cell';
  threshold?: number;
  direction?: 'left' | 'right' | 'both';
  disabled?: boolean;
  closeOnOutside?: boolean;
  onAction?: ActionSchema;
  onOpen?: ActionSchema;
  onClose?: ActionSchema;
}

export interface CountdownSchema extends BaseSchema {
  type: 'countdown';
  time?: number;
  targetTime?: number;
  format?: string;
  millisecond?: boolean;
  paused?: boolean;
  autoStart?: boolean;
  prefix?: string;
  suffix?: string;
  onFinish?: ActionSchema;
}

export type NoticeBarVariant = 'info' | 'warning' | 'success' | 'error';

export interface NoticeBarSchema extends BaseSchema {
  type: 'notice-bar';
  text?: string | string[];
  scrollable?: boolean;
  speed?: number;
  direction?: 'left' | 'right';
  loop?: boolean;
  closable?: boolean;
  icon?: SchemaValue;
  variant?: NoticeBarVariant;
  onClick?: ActionSchema;
  onClose?: ActionSchema;
}
