import { useBreakpoint } from './use-breakpoint.js';

const MOBILE_MEDIA_QUERY = '(max-width: 767px)';

/**
 * Boolean mobile contract (768px threshold): `true` below 768px, `false`
 * otherwise — never null.
 *
 * Delegates to the `useBreakpoint` subscription primitive (plan 587 WA-ui-004);
 * `?? false` keeps the public boolean contract (SSR / matchMedia-less →
 * false).
 *
 * Declared sub-observable deltas vs the legacy self-hosted implementation
 * (plan 587 m4; all ~25 consumers branch on the boolean truthiness and observe
 * neither):
 * 1. Fractional-viewport band 767–768: the legacy hook compared
 *    `window.innerWidth < 768` directly (a fractional width in that band read
 *    as mobile); the media query `(max-width: 767px)` classifies it as
 *    desktop.
 * 2. matchMedia-less environments freeze at `false`; the legacy hook froze at
 *    the first `window.innerWidth` read, which could be `true` below 768px.
 */
export function useIsMobile(): boolean {
  return useBreakpoint(MOBILE_MEDIA_QUERY) ?? false;
}
