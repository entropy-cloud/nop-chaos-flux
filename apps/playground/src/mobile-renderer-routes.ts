import type { RendererRouteEntry } from './route-model.js';

/**
 * C7 mobile interaction-family lab routes
 * (pull-refresh / infinite-scroll / swipe-cell / countdown / notice-bar).
 * Extracted from route-model.ts to keep files within the lint max-lines budget
 * (content-renderer-routes.ts precedent).
 */
export const MOBILE_RENDERER_ROUTES: RendererRouteEntry[] = [
  {
    id: 'pull-refresh',
    title: 'Pull Refresh',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-mobile',
    description:
      'Touch pull-to-refresh container: pull state machine, OA-14 down-only direction, indicator texts and onRefresh event with payload ctx.',
  },
  {
    id: 'infinite-scroll',
    title: 'Infinite Scroll',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-mobile',
    description:
      'IntersectionObserver sentinel loading: host-controlled hasMore/loading/error, four states, retry path and onLoadMore event with payload ctx.',
  },
  {
    id: 'swipe-cell',
    title: 'Swipe Cell',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-mobile',
    description:
      'Horizontal swipe row revealing left/right action regions: data-state transitions, inert AT gating, onAction/onOpen/onClose events with payload ctx.',
  },
  {
    id: 'countdown',
    title: 'Countdown',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-mobile',
    description:
      'Wall-clock countdown from time/targetTime with format templates, paused/autoStart and onFinish fired exactly once.',
  },
  {
    id: 'notice-bar',
    title: 'Notice Bar',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-mobile',
    description:
      'Notice display: CSS marquee, multi-text carousel, variants, closable onClose and clickable role=button onClick.',
  },
];
