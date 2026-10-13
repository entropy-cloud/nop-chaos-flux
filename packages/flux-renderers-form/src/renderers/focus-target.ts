/**
 * Shared addressing helper for the getFocusTarget compensation family (plan
 * 589 G5 ruling): the ui focusable primitives do not forward a focusable ref,
 * so composite field renderers address their interactive element by scoping a
 * selector to the field root and fall back to the root element itself when the
 * selector misses (the root is focusable/tab-worthy in every current call
 * site). The root-cause fix (ui primitives forwarding refs) stays with the
 * successor — see Non-Blocking Follow-ups.
 */
export function queryFocusTarget(
  root: HTMLElement | null,
  selector: string,
): HTMLElement | null {
  return root?.querySelector<HTMLElement>(selector) ?? root;
}
