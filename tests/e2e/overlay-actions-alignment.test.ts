import { expect, test } from '@playwright/test';
import {
  alignmentViolations,
  type AlignmentSnapshot,
} from './helpers/overlay-actions-alignment';
import {
  dialogFooterContract,
  formActionsContract,
  FORM_ACTIONS_SELECTOR,
  DIALOG_FOOTER_SELECTOR,
} from './helpers/form-actions-alignment';

/**
 * Focused unit tests for the actions-alignment contract evaluation
 * (plan 501 Phase 1). `alignmentViolations` is pure — snapshots are fixtures
 * shaped exactly like what `collectAlignmentSnapshot` returns from the
 * browser, so the contract semantics (including the plan 499 recheck probe's
 * hidden-container and rightmost-button rules and the ±2px geometry
 * tolerance from the plan 501 Failure Paths) are pinned without a browser.
 */

function snapshot(overrides: Partial<AlignmentSnapshot> = {}): AlignmentSnapshot {
  return {
    index: 0,
    justify: 'flex-end',
    flexDirection: 'row',
    display: 'flex',
    visible: true,
    buttons: [
      { text: 'Cancel', x: 100, minWidthPx: 72, minWidthRaw: '72px' },
      { text: '确定', x: 200, minWidthPx: 72, minWidthRaw: '72px' },
    ],
    ...overrides,
  };
}

test.describe('alignmentViolations (generic overlay contract)', () => {
  const strict: Parameters<typeof alignmentViolations>[1] = {
    justify: 'flex-end',
    flexDirection: 'row',
    minButtonWidth: 72,
    tolerancePx: 2,
    requireRightmostLast: true,
  };

  test('a plan-499-compliant container has zero violations', () => {
    expect(alignmentViolations(snapshot(), strict)).toEqual([]);
  });

  test('direction and justify violations are reported', () => {
    expect(alignmentViolations(snapshot({ flexDirection: 'column' }), strict)).toEqual([
      'flex-direction=column (expected row)',
    ]);
    expect(alignmentViolations(snapshot({ justify: 'flex-start' }), strict)).toEqual([
      'justify-content=flex-start (expected flex-end)',
    ]);
  });

  test('min-width floor is 72px minus tolerance (70 passes, 69 fails, unparseable fails)', () => {
    const wide = snapshot({
      buttons: [{ text: 'OK', x: 0, minWidthPx: 70, minWidthRaw: '70px' }],
    });
    expect(alignmentViolations(wide, strict)).toEqual([]);
    const narrow = snapshot({
      buttons: [{ text: 'OK', x: 0, minWidthPx: 69, minWidthRaw: '69px' }],
    });
    expect(alignmentViolations(narrow, strict)).toEqual(['button "OK" min-width 69px below 70px floor']);
    const unparseable = snapshot({
      buttons: [{ text: 'OK', x: 0, minWidthPx: -1, minWidthRaw: 'min-content' }],
    });
    expect(alignmentViolations(unparseable, strict)).toEqual([
      'button "OK" min-width min-content below 70px floor',
    ]);
  });

  test('rightmost rule: last DOM-order button must own the max x; ties allowed; skipped for <2 buttons or hidden', () => {
    expect(
      alignmentViolations(snapshot({ buttons: [snapshot().buttons[1], snapshot().buttons[0]] }), strict),
    ).toEqual(['last DOM-order button is not rightmost (confirm-primary position violated)']);
    const tied = snapshot({
      buttons: [
        { text: 'A', x: 50, minWidthPx: 72, minWidthRaw: '72px' },
        { text: 'B', x: 50, minWidthPx: 72, minWidthRaw: '72px' },
      ],
    });
    expect(alignmentViolations(tied, strict)).toEqual([]);
    const single = snapshot({ buttons: [{ text: 'OK', x: 8, minWidthPx: 72, minWidthRaw: '72px' }] });
    expect(alignmentViolations(single, strict)).toEqual([]);
  });

  test('skipHidden default silences hidden containers; skipHidden:false still checks computed contract', () => {
    const hidden = snapshot({ visible: false, display: 'none' });
    expect(alignmentViolations(hidden, strict)).toEqual([]);
    const hiddenBad = snapshot({ visible: false, display: 'none', justify: 'flex-start' });
    expect(alignmentViolations(hiddenBad, { ...strict, skipHidden: false })).toEqual([
      'justify-content=flex-start (expected flex-end)',
    ]);
    expect(alignmentViolations(hiddenBad, { ...strict, requireVisible: true, skipHidden: false })).toEqual([
      'container hidden (display=none)',
      'justify-content=flex-start (expected flex-end)',
    ]);
  });

  test('undefined contract fields are not checked', () => {
    expect(alignmentViolations(snapshot({ justify: 'space-between', flexDirection: 'column' }), {})).toEqual([]);
  });
});

test.describe('slot contracts (form-actions / dialog-footer)', () => {
  test('form-actions contract pins the plan 499 desktop ladder', () => {
    expect(formActionsContract()).toEqual({
      justify: 'flex-end',
      flexDirection: 'row',
      minButtonWidth: 72,
      tolerancePx: 2,
      requireRightmostLast: true,
      skipHidden: false,
    });
    expect(formActionsContract({ tolerancePx: 0, minButtonWidth: 64 }).tolerancePx).toBe(0);
  });

  test('dialog-footer contract only requires justify-end on visible channels', () => {
    expect(dialogFooterContract()).toEqual({ justify: 'flex-end', skipHidden: true });
    const footer = snapshot({ buttons: [] });
    expect(alignmentViolations(footer, dialogFooterContract())).toEqual([]);
    const badFooter = snapshot({ justify: 'flex-start' });
    expect(alignmentViolations(badFooter, dialogFooterContract())).toEqual([
      'justify-content=flex-start (expected flex-end)',
    ]);
    const hiddenFooter = snapshot({ visible: false, display: 'none', justify: 'flex-start' });
    expect(alignmentViolations(hiddenFooter, dialogFooterContract())).toEqual([]);
  });

  test('slot selectors stay bound to the plan 499 probe DOM', () => {
    expect(FORM_ACTIONS_SELECTOR).toBe("[data-slot='form-actions']");
    expect(DIALOG_FOOTER_SELECTOR).toBe("[data-slot='dialog-footer']");
  });
});
