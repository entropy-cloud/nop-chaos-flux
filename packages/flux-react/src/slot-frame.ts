import type { SlotFrame } from '@nop-chaos/flux-core';

const SLOT_KEY = '$slot';

/**
 * Build the $slot frame object for a parameterized region instantiation.
 *
 * The frame wraps declared param bindings and threads the outer slot frame
 * through $parent to support nested slot ancestry.
 *
 * @param bindings - The concrete slot binding values (e.g. { item, index })
 * @param outerSlotFrame - The current $slot frame from the parent scope (for nesting)
 * @returns A new SlotFrame object: { ...bindings, $parent: outerSlotFrame }
 */
export function buildSlotFrame(
  bindings: Record<string, unknown>,
  outerSlotFrame: SlotFrame | undefined
): SlotFrame {
  return outerSlotFrame !== undefined
    ? { ...bindings, $parent: outerSlotFrame }
    : { ...bindings };
}

/**
 * Read the current $slot frame from a scope snapshot, if present.
 */
export function readSlotFrame(scopeData: Record<string, unknown>): SlotFrame | undefined {
  const candidate = scopeData[SLOT_KEY];

  if (candidate !== null && typeof candidate === 'object') {
    return candidate as SlotFrame;
  }

  return undefined;
}

export { SLOT_KEY };
