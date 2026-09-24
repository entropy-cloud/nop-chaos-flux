import { expect, type Page } from '@playwright/test';

/**
 * Selector-parametrized actions-alignment snapshot + contract assertions
 * (plan 501 Phase 1 item ④ — discharges the plan 499 handover
 * "lab-dropdown-button 菜单 actions 探针增强（Escape 前探测菜单内 actions）").
 *
 * The R2-3b recheck could never observe dropdown-menu actions because the
 * interaction registry presses Escape before its fixed probe runs. This helper
 * inverts the control: callers collect/assert on ANY container selector at ANY
 * moment — including while a dropdown menu / dialog / drawer overlay is still
 * open, before any dismissal step. `form-actions-alignment.ts` builds the two
 * known slot contracts on top of these primitives.
 *
 * Contract semantics (mirrors the validated recheck probe):
 * - justify/flexDirection/min-width violations are checked on every matched
 *   container (computed styles resolve even for display:none subtrees);
 * - the rightmost-button check needs geometry, so it only runs on visible
 *   containers with >= 2 buttons;
 * - `skipHidden` (default true) short-circuits hidden containers entirely.
 */

export interface AlignmentButtonSnapshot {
  text: string;
  /** viewport-space x of the button's left edge, rounded */
  x: number;
  /** parsed computed min-width in px; -1 when unparseable */
  minWidthPx: number;
  minWidthRaw: string;
}

export interface AlignmentSnapshot {
  index: number;
  justify: string;
  flexDirection: string;
  display: string;
  /** bounding-box width > 0 */
  visible: boolean;
  buttons: AlignmentButtonSnapshot[];
}

export interface AlignmentContract {
  /** expected justify-content, e.g. 'flex-end'. Undefined = not checked. */
  justify?: string;
  /** expected flex-direction, e.g. 'row'. Undefined = not checked. */
  flexDirection?: string;
  /** minimum button min-width in px (default 72 for the form-actions ladder). */
  minButtonWidth?: number;
  /** geometry tolerance in px (plan 501 Failure Paths: ±2px). Default 2. */
  tolerancePx?: number;
  /** last DOM-order button must own the max x (confirm-primary position). */
  requireRightmostLast?: boolean;
  /** violation when a matched container is hidden. Default false. */
  requireVisible?: boolean;
  /** skip hidden containers entirely (dialog-footer semantics). Default true. */
  skipHidden?: boolean;
}

export async function collectAlignmentSnapshot(page: Page, selector: string): Promise<AlignmentSnapshot[]> {
  return page.evaluate((sel) => {
    const containers = Array.from(document.querySelectorAll(sel));
    return containers.map((el, index) => {
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const buttons = Array.from(el.querySelectorAll('button')).map((b) => {
        const br = b.getBoundingClientRect();
        const raw = getComputedStyle(b).minWidth;
        const parsed = Number.parseFloat(raw);
        return {
          text: (b.textContent || '').trim().slice(0, 24),
          x: Math.round(br.x),
          minWidthPx: Number.isFinite(parsed) ? parsed : -1,
          minWidthRaw: raw,
        };
      });
      return {
        index,
        justify: cs.justifyContent,
        flexDirection: cs.flexDirection,
        display: cs.display,
        visible: rect.width > 0,
        buttons,
      };
    });
  }, selector);
}

/** Pure contract evaluation — unit-testable without a browser. */
export function alignmentViolations(snapshot: AlignmentSnapshot, contract: AlignmentContract): string[] {
  if (!snapshot.visible && contract.skipHidden !== false) return [];
  const violations: string[] = [];
  if (contract.requireVisible && !snapshot.visible) {
    violations.push(`container hidden (display=${snapshot.display})`);
  }
  if (contract.flexDirection !== undefined && snapshot.flexDirection !== contract.flexDirection) {
    violations.push(`flex-direction=${snapshot.flexDirection} (expected ${contract.flexDirection})`);
  }
  if (contract.justify !== undefined && snapshot.justify !== contract.justify) {
    violations.push(`justify-content=${snapshot.justify} (expected ${contract.justify})`);
  }
  if (contract.minButtonWidth !== undefined) {
    const floor = contract.minButtonWidth - (contract.tolerancePx ?? 2);
    for (const b of snapshot.buttons) {
      if (!(b.minWidthPx >= floor)) {
        violations.push(`button "${b.text}" min-width ${b.minWidthRaw} below ${floor}px floor`);
      }
    }
  }
  if (contract.requireRightmostLast && snapshot.visible && snapshot.buttons.length >= 2) {
    const last = snapshot.buttons[snapshot.buttons.length - 1];
    if (!snapshot.buttons.every((b) => b.x <= last.x)) {
      violations.push('last DOM-order button is not rightmost (confirm-primary position violated)');
    }
  }
  return violations;
}

export interface AssertAlignmentOptions {
  note?: string;
  /** fail when fewer than minCount containers match the selector. Default 0. */
  minCount?: number;
}

export async function assertAlignment(
  page: Page,
  selector: string,
  contract: AlignmentContract,
  options: AssertAlignmentOptions = {},
): Promise<AlignmentSnapshot[]> {
  const snapshots = await collectAlignmentSnapshot(page, selector);
  expect(
    snapshots.length,
    `selector "${selector}" should match >= ${options.minCount ?? 0} container(s)${options.note ? ` — ${options.note}` : ''}`,
  ).toBeGreaterThanOrEqual(options.minCount ?? 0);
  const failures: string[] = [];
  snapshots.forEach((snapshot) => {
    for (const violation of alignmentViolations(snapshot, contract)) {
      failures.push(`[container ${snapshot.index}] ${violation}`);
    }
  });
  expect(
    failures,
    `actions alignment contract violated${options.note ? ` — ${options.note}` : ''}:\n${failures.join('\n')}`,
  ).toEqual([]);
  return snapshots;
}
