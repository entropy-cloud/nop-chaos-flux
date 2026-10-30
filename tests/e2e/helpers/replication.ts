import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Shared e2e helpers for the business-replication page family (plan 798
 * Phase 1, D1 §3/§4 MIN-7/MAJ-C six-piece suite). One helper per recurring
 * pattern so the 21 replication specs do not each hand-roll their own copy:
 *
 * 1. openReplicationPage       — goto + title + page root testid
 * 2. REPLICATION_MOBILE_CONTEXT — whole context options for test.use (branch B)
 * 3. dragReplicationCard        — real pointer drag (kanban-demo mouse steps 12)
 * 4. swipeReplicationCell       — left/right swipe gesture for swipe-cell
 * 5. assertDialogFocusRoundTrip — dialog focus in + Esc back to trigger
 * 6. expectEndpointCall         — __repl*Calls counter assertion
 */

/**
 * Mobile-canvas context options (D1 §4 branch B). `hasTouch` is REQUIRED for
 * the mobile gesture family: swipe-cell / pull-refresh are TouchEvent driven,
 * and with hasTouch enabled Playwright's mouse down/move/up emit
 * touchstart/touchmove/touchend (precedent: mobile-components.spec.ts
 * "hasTouch is required" + mobile-gesture-lab desktop-viewport+hasTouch).
 * Consume via `test.use(REPLICATION_MOBILE_CONTEXT)`.
 */
export const REPLICATION_MOBILE_CONTEXT = {
  viewport: { width: 375, height: 667 },
  hasTouch: true,
} as const;

interface OpenReplicationPageOptions {
  /** Expected complex-page-title text (defaults to "contains pageId title" skip). */
  title?: string;
  /** Page main testid (defaults to `<pageId>-root`). */
  rootTestid?: string;
}

/**
 * D1-决策④ open helper: goto the complex-pages hash route, wait for the
 * shell title, then wait for the page's main testid (crud-demo.spec.ts
 * openCrudDemo precedent).
 */
export async function openReplicationPage(
  page: Page,
  pageId: string,
  options: OpenReplicationPageOptions = {},
): Promise<void> {
  await page.goto(`#/complex-pages/${pageId}`, { waitUntil: 'commit' });
  if (options.title) {
    await expect(page.getByTestId('complex-page-title')).toContainText(options.title, {
      timeout: 30_000,
    });
  } else {
    await expect(page.getByTestId('complex-page-title')).toBeVisible({ timeout: 30_000 });
  }
  await expect(page.getByTestId(options.rootTestid ?? `${pageId}-root`)).toBeVisible({
    timeout: 30_000,
  });
}

/**
 * Real pointer drag between two locators (kanban-demo.spec.ts mouse steps 12
 * precedent; D6 MIN-4: synthetic dispatchEvent does not drive the pointer dnd
 * pipeline). The trailing settle wait absorbs the React Compiler dev
 * double-mount lag noted in linear-replica-interactions.spec.ts L452.
 */
export async function dragReplicationCard(
  page: Page,
  source: Locator,
  target: Locator,
): Promise<void> {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  expect(sourceBox, 'drag source must have a bounding box').toBeTruthy();
  expect(targetBox, 'drag target must have a bounding box').toBeTruthy();

  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + 10);
  await page.mouse.down();
  await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + 60, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(400);
}

interface SwipeCellOptions {
  /** Swipe distance in px (defaults to 140 — beyond the default 30px threshold). */
  distance?: number;
  /** Pointer steps (defaults to 8). */
  steps?: number;
}

/**
 * Synthesize a touch drag via CDP `Input.dispatchTouchEvent`. Mouse-event
 * synthesis (down/move/up) does NOT reliably produce TouchEvents in headless
 * Chromium (mobile-components.spec.ts MA-20 note), so the gesture helpers go
 * through the CDP touch channel directly.
 */
async function cdpTouchDrag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps: number,
): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: Math.round(from.x), y: Math.round(from.y) }],
  });
  for (let i = 1; i <= steps; i += 1) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: Math.round(x), y: Math.round(y) }],
    });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

/**
 * Horizontal swipe gesture over a swipe-cell (or any touch-gesture surface).
 * Starts near the trailing edge and drags past the cell's midline so the
 * release decision commits (static threshold + velocity throw).
 */
export async function swipeReplicationCell(
  page: Page,
  cell: Locator,
  direction: 'left' | 'right',
  options: SwipeCellOptions = {},
): Promise<void> {
  const box = await cell.boundingBox();
  expect(box, 'swipe cell must have a bounding box').toBeTruthy();

  const y = box!.y + box!.height / 2;
  const distance = options.distance ?? 140;
  const steps = options.steps ?? 8;
  const startX = direction === 'left' ? box!.x + box!.width * 0.9 : box!.x + box!.width * 0.1;
  const endX = direction === 'left' ? startX - distance : startX + distance;

  await cdpTouchDrag(page, { x: startX, y }, { x: endX, y }, steps);
  await page.waitForTimeout(400);
}

/**
 * Vertical pull gesture over a pull-refresh surface (down only, OA-14).
 * Drags past the threshold so the release commits onRefresh.
 */
export async function pullReplicationRefresh(
  page: Page,
  surface: Locator,
  options: SwipeCellOptions = {},
): Promise<void> {
  const box = await surface.boundingBox();
  expect(box, 'pull-refresh surface must have a bounding box').toBeTruthy();

  const x = box!.x + box!.width / 2;
  const startY = box!.y + 40;
  const distance = options.distance ?? 160;
  const steps = options.steps ?? 10;

  await cdpTouchDrag(page, { x, y: startY }, { x, y: startY + distance }, steps);
  await page.waitForTimeout(400);
}

/**
 * Tap a touch-gesture surface (e.g. floating-bubble, which only binds touch
 * handlers) via CDP `Input.dispatchTouchEvent` — mouse clicks do not produce
 * TouchEvents in headless Chromium (mobile-components.spec.ts MA-20 note).
 */
export async function tapReplicationTarget(page: Page, target: Locator): Promise<void> {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  expect(box, 'tap target must have a bounding box').toBeTruthy();

  // Clamp into the viewport: fixed-position canvas elements can straddle the
  // viewport fold, and CDP touch coordinates outside the visible area hit
  // nothing.
  const viewport = page.viewportSize() ?? { width: 1280, height: 800 };
  const clamp = (v: number, max: number) => Math.max(0, Math.min(Math.round(v), max - 1));
  const x = clamp(box!.x + box!.width / 2, viewport.width);
  const y = clamp(box!.y + box!.height / 2, viewport.height);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y }],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(400);
}

/**
 * PH-18 focus round trip for the dialog family (D1 §3 pillar three; pattern
 * repeated ~15× across D2-D4 pages, so it lives here). Focus must land inside
 * the opened `[data-slot="dialog-surface"]` (Base UI focuses the popup or its
 * first focusable), Esc closes it, and focus returns to the trigger element.
 *
 * Plan 802 (C2): drawer surfaces (openDrawer) render `[data-slot="drawer-surface"]`
 * instead — pass `surfaceSlot: 'drawer-surface'` for the drawer variant (same
 * focus-in / Esc-back / trigger-return contract).
 */
export async function assertDialogFocusRoundTrip(
  page: Page,
  trigger: Locator,
  options: { surfaceSlot?: 'dialog-surface' | 'drawer-surface' } = {},
): Promise<void> {
  const surfaceSlot = options.surfaceSlot ?? 'dialog-surface';
  await trigger.click();

  const surface = page.locator(`[data-slot="${surfaceSlot}"]`).last();
  await expect(surface).toBeVisible({ timeout: 5_000 });
  await expect
    .poll(
      () =>
        page.evaluate(
          (slot) => {
            const surfaces = document.querySelectorAll(`[data-slot="${slot}"]`);
            const top = surfaces[surfaces.length - 1] as HTMLElement | undefined;
            const active = document.activeElement;
            if (!top || !active) return false;
            if (top === active || top.contains(active)) return true;
            // Drawer variant: Base UI focuses the popup layer that WRAPS the
            // drawer content (ui Drawer renders DrawerContent inside
            // DrawerPrimitive.Popup), so popup-level focus counts as landed.
            if (slot === 'drawer-surface') {
              const popup = top.closest('[data-slot="drawer-popup"]');
              return !!popup && (active === popup || popup.contains(active));
            }
            return false;
          },
          surfaceSlot,
        ),
      { timeout: 5_000 },
    )
    .toBe(true);

  await page.keyboard.press('Escape');
  await expect(surface).toHaveCount(0);
  await expect(trigger).toBeFocused();
}

/** Read the whole opt-in endpoint counter global (`window.__repl<Domain>Calls`). */
export async function readEndpointCalls(
  page: Page,
  countersKey: string,
): Promise<Record<string, number>> {
  return page.evaluate(
    (key) =>
      (window as unknown as Record<string, Record<string, number> | undefined>)[key] ?? {},
    countersKey,
  );
}

interface ExpectEndpointCallOptions {
  /** Assert the counter grew by exactly/at-least this delta from the current value. */
  delta?: number;
  /** Absolute floor (defaults to 1). Ignored when `delta` is given. */
  atLeast?: number;
  timeout?: number;
}

/**
 * Assert an endpoint was actually called via the opt-in counter global
 * (D1 §3 pillar one: "__repl<Domain>Calls 计数断言'动作真的发生了'"). Requires
 * the spec to pre-create the counter with `seedReplicationCounters` before
 * navigation (opt-in pattern: production never sets the global).
 */
export async function expectEndpointCall(
  page: Page,
  countersKey: string,
  endpoint: string,
  options: ExpectEndpointCallOptions = {},
): Promise<number> {
  if (options.delta != null) {
    const before = await readCallCount(page, countersKey, endpoint);
    const target = before + options.delta;
    await expect
      .poll(() => readCallCount(page, countersKey, endpoint), { timeout: options.timeout ?? 5_000 })
      .toBeGreaterThanOrEqual(target);
  } else {
    const floor = options.atLeast ?? 1;
    await expect
      .poll(() => readCallCount(page, countersKey, endpoint), { timeout: options.timeout ?? 5_000 })
      .toBeGreaterThanOrEqual(floor);
  }
  return readCallCount(page, countersKey, endpoint);
}

async function readCallCount(page: Page, countersKey: string, endpoint: string): Promise<number> {
  const calls = await readEndpointCalls(page, countersKey);
  return calls[endpoint] ?? 0;
}

/**
 * Pre-create the opt-in counter + hooks globals before navigation
 * (airtable-replica-interactions.spec.ts trackEndpointCalls precedent).
 */
export async function seedReplicationCounters(
  page: Page,
  countersKey: string,
  hooksKey: string,
): Promise<void> {
  await page.addInitScript(
    ({ countersKey, hooksKey }) => {
      (window as unknown as Record<string, unknown>)[countersKey] = {};
      (window as unknown as Record<string, unknown>)[hooksKey] = {};
    },
    { countersKey, hooksKey },
  );
}
