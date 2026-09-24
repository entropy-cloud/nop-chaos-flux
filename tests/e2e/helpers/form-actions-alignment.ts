import type { Page } from '@playwright/test';
import { assertAlignment, type AlignmentContract, type AlignmentSnapshot } from './overlay-actions-alignment';

/**
 * form-actions / dialog-footer computed-style alignment contracts
 * (plan 501 Phase 1, promoted from `_tmp/r2-3b-recheck/recheck-probe.mjs`,
 * plan 499 R2-3b batch recheck).
 *
 * Desktop contract (plan 499 remediation, styling-system.md "Overlay Size
 * Ladder And Anatomy"): every `[data-slot='form-actions']` is a row with
 * justify-end and every button carries the 72px min-width ladder step, confirm
 * button rightmost; every visible `[data-slot='dialog-footer']` (surface
 * channel) is justify-end. Computed styles only — screenshots stay
 * diagnostic-only. Geometry tolerance ±2px (plan 501 Failure Paths).
 *
 * Works on whatever is currently mounted: in-page, inside open dialogs, and —
 * unlike the original recheck flow — inside still-open dropdown menus when the
 * caller snapshots before Escape (see `overlay-actions-alignment.ts`).
 */

export const FORM_ACTIONS_SELECTOR = "[data-slot='form-actions']";
export const DIALOG_FOOTER_SELECTOR = "[data-slot='dialog-footer']";

export interface FormActionsAlignmentOptions {
  tolerancePx?: number;
  minButtonWidth?: number;
}

/** The plan 499 desktop form-actions contract, exposed for unit tests. */
export function formActionsContract(options: FormActionsAlignmentOptions = {}): AlignmentContract {
  return {
    justify: 'flex-end',
    flexDirection: 'row',
    minButtonWidth: options.minButtonWidth ?? 72,
    tolerancePx: options.tolerancePx ?? 2,
    requireRightmostLast: true,
    // Hidden containers (closed-dialog state) still get their computed
    // contract checked, matching the validated recheck probe.
    skipHidden: false,
  };
}

/** The plan 490 dialog-footer surface-channel contract, exposed for unit tests. */
export function dialogFooterContract(): AlignmentContract {
  return {
    justify: 'flex-end',
    skipHidden: true,
  };
}

export async function assertFormActionsAlignment(
  page: Page,
  options: FormActionsAlignmentOptions & { note?: string; minCount?: number } = {},
): Promise<AlignmentSnapshot[]> {
  const { note, minCount, ...contractOptions } = options;
  return assertAlignment(page, FORM_ACTIONS_SELECTOR, formActionsContract(contractOptions), {
    note: note ?? 'form-actions row + flex-end + 72px ladder + confirm rightmost',
    minCount,
  });
}

export async function assertDialogFooterAlignment(
  page: Page,
  options: { note?: string; minCount?: number } = {},
): Promise<AlignmentSnapshot[]> {
  return assertAlignment(page, DIALOG_FOOTER_SELECTOR, dialogFooterContract(), {
    note: options.note ?? 'visible dialog-footer channels are justify-end',
    minCount: options.minCount,
  });
}
