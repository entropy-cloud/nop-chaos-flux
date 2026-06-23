import { registerRendererDefinitions, type RendererRegistry } from '@nop-chaos/flux-core';
import { mobileRendererDefinitions } from './mobile-renderer-definitions.js';

export type {
  PullRefreshSchema,
  InfiniteScrollSchema,
  SwipeCellSchema,
  CountdownSchema,
  NoticeBarSchema,
  NoticeBarVariant,
} from './schemas.js';

export { useTouch } from './hooks/use-touch.js';
export type {
  TouchState,
  TouchDirection,
  UseTouchOptions,
  UseTouchReturn,
} from './hooks/use-touch.js';

export { PullRefreshRenderer } from './pull-refresh.js';
export { InfiniteScrollRenderer } from './infinite-scroll.js';
export { SwipeCellRenderer } from './swipe-cell.js';
export { CountdownRenderer, useCountdownTimer, formatCountdown } from './countdown.js';
export type { CountdownTimerOptions, CountdownTimerResult } from './countdown.js';
export { NoticeBarRenderer } from './notice-bar.js';

export { mobileRendererDefinitions } from './mobile-renderer-definitions.js';
export type { MobileRendererSchema } from './mobile-renderer-definitions.js';

export function registerMobileRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, mobileRendererDefinitions);
}
