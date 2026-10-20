import { registerRendererDefinitions, type RendererRegistry } from '@nop-chaos/flux-core';
import { mobileRendererDefinitions } from './mobile-renderer-definitions.js';

export type {
  PickerViewSchema,
  WheelPickerOption,
  WheelPickerSchema,
  WheelDatePickerSchema,
  WheelTimePickerSchema,
  WheelCascaderOption,
  WheelCascaderSchema,
  FloatingPanelSchema,
  FloatingBubbleSchema,
  ActionSheetItem,
  ActionSheetSchema,
  ImageViewerSchema,
  IndexBarItem,
  IndexBarSchema,
  ScrollMaskAxis,
  PullRefreshSchema,
  InfiniteScrollSchema,
  SwipeCellSchema,
  CountdownSchema,
  NoticeBarSchema,
  NoticeBarVariant,
} from './schemas.js';

export { PullRefreshRenderer } from './pull-refresh.js';
export { InfiniteScrollRenderer } from './infinite-scroll.js';
export { SwipeCellRenderer } from './swipe-cell.js';
export { CountdownRenderer } from './countdown.js';
export { NoticeBarRenderer } from './notice-bar.js';

export { WheelPickerRenderer } from './wheel-picker.js';
export { WheelDatePickerRenderer } from './wheel-date-picker.js';
export { WheelTimePickerRenderer } from './wheel-time-picker.js';
export { WheelCascaderRenderer } from './wheel-cascader.js';
export { FloatingPanelRenderer } from './floating-panel.js';
export { FloatingBubbleRenderer } from './floating-bubble.js';
export { ActionSheetRenderer } from './action-sheet.js';
export { ImageViewerRenderer } from './image-viewer.js';
export { IndexBarRenderer } from './index-bar.js';
export { PickerViewRenderer } from './picker-view.js';

export { mobileRendererDefinitions } from './mobile-renderer-definitions.js';
export type { MobileRendererSchema } from './mobile-renderer-definitions.js';

export { useTouch } from './hooks/use-touch.js';
export type {
  TouchState,
  TouchDirection,
  UseTouchOptions,
  UseTouchReturn,
} from './hooks/use-touch.js';

// M6 gesture infrastructure (plan 664): shared algorithm layer for the
// mobile package's own surfaces (M7 picker / M8 panels) and for hosts
// building custom mobile interactions.
export {
  rubberband,
  nearest,
  momentumDistance,
  momentumDuration,
  quartEaseOut,
  RUBBERBAND_CONSTANT,
  MOMENTUM_DECELERATION,
} from './hooks/gesture-math.js';
export { VelocityTracker } from './hooks/velocity-tracker.js';
export { MomentumAnimator } from './hooks/momentum-animator.js';
export type { MomentumAnimationOptions } from './hooks/momentum-animator.js';
export { supportsPassiveEvents } from './hooks/supports-passive.js';
export { suppressClickAfterDrag } from './hooks/click-suppression.js';
export { useLockScroll } from './hooks/use-lock-scroll.js';
export type { UseLockScrollOptions } from './hooks/use-lock-scroll.js';

export function registerMobileRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, mobileRendererDefinitions);
}
