import { expect, test, assertTrackedPageErrors } from './fixtures.js';
import {
  captureInteractionReadings,
  diffReadings,
  measureControlAnchor,
  readEntityStyles,
  type CaptureOptions,
  type EntityStyleReading,
  type InteractionReadings,
  type RectJSON,
  type ScrollReading,
} from './helpers/interaction-state-probes.js';

// plan 543 Phase 2 (IS-0): living template for interaction-sequence specs.
// Pattern for every IS-track batch spec: capture readings → drive a real
// interaction → recapture → diff → assert on the invariant the sequence must
// preserve (V1–V6, docs/skills/interaction-state-audit-prompt.md). All
// convictions cite programmatic readings; screenshots are corroboration only.

async function openGantt(page: import('@playwright/test').Page) {
  await page.goto('/#/gantt', { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: /Gantt Chart Demo/i })).toBeVisible({ timeout: 25_000 });
  await expect(page.locator('[data-slot="gantt-bar"]').first()).toBeVisible({ timeout: 15_000 });
}

async function openFlowDesigner(page: import('@playwright/test').Page) {
  await page.goto('/');
  const signInButton = page.getByRole('button', { name: 'Sign in' });
  if (await signInButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await signInButton.click();
    if (await signInButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      await page.getByRole('textbox', { name: 'Username' }).fill('admin');
      await page.getByRole('textbox', { name: 'Password' }).fill('123456');
      await signInButton.click();
    }
    if (await signInButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      await page.getByRole('textbox', { name: 'Username' }).fill('nop');
      await page.getByRole('textbox', { name: 'Password' }).fill('123');
      await signInButton.click();
    }
  }
  await expect(signInButton).toHaveCount(0, { timeout: 10_000 });
  await page.locator('button', { hasText: 'Visual Workflow' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(6, { timeout: 30_000 });
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
}

test.describe('interaction-state probe template (plan 543)', () => {
  // V1 liveness: the probe reads live scroll offsets and they are stable
  // across a no-op window — the baseline pattern every scroll-preservation
  // assertion in IS-1..IS-9 builds on. The gantt scroll-sync rewrites
  // scrollLeft asynchronously, so the scenario polls to a settled value
  // before capturing (batches must do the same before diffing).
  test('V1 probe reads live gantt scroll offsets and survives a no-op window', async ({ page }) => {
    await openGantt(page);
    const timeline = page.locator('[data-slot="gantt-scale"]').locator('..');
    await timeline.evaluate((el) => {
      el.scrollLeft = el.scrollWidth / 2;
    });

    let prev = -1;
    await expect
      .poll(
        async () => {
          const current = await timeline.evaluate((el) => el.scrollLeft);
          const settled = current > 0 && current === prev ? current : -1;
          prev = current;
          return settled;
        },
        { timeout: 5_000 },
      )
      .toBeGreaterThan(0);
    const settledValue = prev;

    // `eventSelector` retargets the domain-entity counter (V3 readings):
    // on gantt the draggable bars are the domain entities, not calendar events.
    const options: CaptureOptions = { eventSelector: '[data-slot="gantt-bar"]' };
    const before = await captureInteractionReadings(page, options);
    expect(before.eventCount, 'domain entity counter follows eventSelector').toBeGreaterThan(0);
    expect(
      before.scrollContainers.some((c) => c.scrollLeft === settledValue),
      'generic scan sees the settled scrolled container',
    ).toBe(true);

    await page.waitForTimeout(300);
    const after = await captureInteractionReadings(page, options);
    expect(diffReadings(before, after)).toEqual([]);
    expect(after.scrollContainers.some((c) => c.scrollLeft === settledValue)).toBe(true);
    await assertTrackedPageErrors(page);
  });

  // V2 pattern: a non-viewport-intent interaction (pane click) must not move
  // the canvas — capture → interact → recapture → diff must be empty.
  test('V2 probe shows viewport transform stable across a neutral pane click', async ({ page }) => {
    await openFlowDesigner(page);
    const before = await captureInteractionReadings(page);
    expect(before.viewportTransform, 'flow viewport present').not.toBeNull();
    expect(before.nodeCount).toBe(6);
    expect(before.firstNodeRect).not.toBeNull();

    await page.locator('.react-flow__pane').click({ position: { x: 40, y: 300 } });
    await page.waitForTimeout(200);

    const after = await captureInteractionReadings(page);
    expect(diffReadings(before, after)).toEqual([]);
    await assertTrackedPageErrors(page);
  });

  // V4 probe shape: control/anchor geometry reads real rects with derived
  // center offsets (here: a node measured against the pane anchor).
  test('V4 measureControlAnchor returns real geometry with derived offsets', async ({ page }) => {
    await openFlowDesigner(page);
    const reading = await measureControlAnchor(page, '.react-flow__node', '.react-flow__pane');
    expect(reading.controlRect).not.toBeNull();
    expect(reading.anchorRect).not.toBeNull();
    expect(reading.controlRect?.width).toBeGreaterThan(0);
    expect(typeof reading.centerOffsetX).toBe('number');
    expect(reading.clipped).toBe(false);
    await assertTrackedPageErrors(page);
  });

  // V6 probe shape: computed-style readings are real values usable for
  // state-distinguishability comparisons in batch audits.
  test('V6 readEntityStyles returns real computed styles', async ({ page }) => {
    await openFlowDesigner(page);
    const resting: EntityStyleReading | null = await readEntityStyles(page, '.react-flow__node');
    expect(resting).not.toBeNull();
    expect(resting?.borderWidth).toMatch(/px$/);
    expect(resting?.backgroundColor).toMatch(/^(rgb|rgba)\(/);
    await assertTrackedPageErrors(page);
  });

  // diff utility contract: identical captures → empty; any field drift →
  // named diff entry (the conviction format for V1/V2/V5 findings).
  test('diffReadings flags exactly the drifted fields', async () => {
    const base = {
      url: '#/demo',
      scrollContainers: [{ label: 'a|b|10x10', scrollLeft: 0, scrollTop: 0 }] satisfies ScrollReading[],
      viewportTransform: 'translate(0px, 0px) scale(1)',
      firstNodeRect: {
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        top: 0,
        right: 10,
        bottom: 10,
        left: 0,
      } satisfies RectJSON,
      nodeCount: 1,
      eventCount: 0,
      toasts: [] as string[],
    } satisfies InteractionReadings;
    expect(diffReadings(base, { ...base })).toEqual([]);

    const drifted = {
      ...base,
      scrollContainers: [{ label: 'a|b|10x10', scrollLeft: 120, scrollTop: 0 }],
      viewportTransform: 'translate(10px, 0px) scale(1)',
      toasts: ['已保存'],
    };
    const diffs = diffReadings(base, drifted);
    expect(diffs).toHaveLength(3);
    expect(diffs[0]).toContain('scrollLeft');
    expect(diffs[1]).toContain('viewportTransform');
    expect(diffs[2]).toContain('toasts');
  });
});
