import { expect, test, assertTrackedPageErrors } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C7 Phase 3 host scenarios (real browser, programmatic DOM asserts).
 *
 * Touch gestures are injected through the Chromium CDP input pipeline
 * (Input.dispatchTouchEvent) — the same trusted-touch path Playwright's
 * touchscreen uses — because JS-dispatched synthetic TouchEvents do not reach
 * React's delegated touch listeners in this app (verified during C7 Phase 3).
 *
 * 1. host-pr-dialog (bug 73 pattern): pull-refresh inside an openDialog surface —
 *    a CDP touch pull past the threshold dispatches onRefresh and the action
 *    args resolve ${direction}|${threshold} from the event payload
 *    (P1 evaluationBindings proof in a real browser).
 * 2. host-is-dialog (bug 73 pattern): infinite-scroll inside the same dialog —
 *    immediateCheck fires onLoadMore with ${source} = 'immediate'.
 * 3. host-is-retry: error:true renders the error state + retry button; clicking
 *    retry resumes loading with ${source} = 'retry'.
 * 4. host-sw-action: repeated list rows with swipe-cell — a CDP swipe reveals
 *    the left action region and clicking the action button dispatches onAction
 *    with ${side}|${index} resolved (row-scope isolation).
 * 5. host-cd-finish: a 1.5s countdown reaches zero — data-finished flips and
 *    onFinish dispatches ${type} = 'finish'.
 * 6. host-nb-close / host-nb-click: closable bar hides after onClose; clickable
 *    bar is role=button and dispatches onClick; static bar stays role=status.
 */

// hasTouch is required for the CDP touch injection used by the drag scenarios;
// isMobile is intentionally NOT used (it squeezes the lab layout so the
// scenario content becomes hidden in a 390px viewport).
test.use({ hasTouch: true });

async function cdpTouchDrag(
  page: import('@playwright/test').Page,
  selector: string,
  from: { x: number; y: number },
  to: { x: number; y: number },
  index = 0,
): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  const box = await page.locator(selector).nth(index).boundingBox();
  expect(box, `bounding box for ${selector}[${index}]`).not.toBeNull();
  if (!box) return;
  // The dialog opens with an entrance animation that moves the target; wait
  // until the target's rect is STABLE across consecutive polls (animation
  // fully settled) AND hit-testing at its current position lands inside it,
  // then re-read the settled box before dispatching.
  await page.waitForFunction(
    ({ sel, idx }) => {
      const el = document.querySelectorAll(sel)[idx];
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      const at = document.elementFromPoint(rect.left + 100, rect.top + 10);
      if (!at || !el.contains(at)) return false;
      const key = `${rect.left},${rect.top},${rect.width},${rect.height}`;
      const w = window as unknown as { __c7RectKey?: string };
      if (w.__c7RectKey === key) return true;
      w.__c7RectKey = key;
      return false;
    },
    { sel: selector, idx: index },
    { timeout: 5_000 },
  );
  await page.evaluate(() => {
    delete (window as unknown as { __c7RectKey?: string }).__c7RectKey;
  });
  const settled = await page.locator(selector).nth(index).boundingBox();
  expect(settled, `settled bounding box for ${selector}[${index}]`).not.toBeNull();
  if (!settled) return;
  const start = { x: settled.x + from.x, y: settled.y + from.y };
  const end = { x: settled.x + to.x, y: settled.y + to.y };
  try {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [start],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: start.x + (end.x - start.x) * 0.4, y: start.y + (end.y - start.y) * 0.4 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [end],
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally {
    await cdp.detach();
  }
}

async function readProbe(
  page: import('@playwright/test').Page,
  method: string,
): Promise<string | undefined> {
  return page.evaluate(
    (key) => (window as unknown as Record<string, string | undefined>)[key],
    `__c7${method}`,
  );
}

test('mobile-host: dialog-rendered pull-refresh dispatches onRefresh payload (host-pr-dialog, bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('pull-refresh');

  const slug = scenarioSlug('Host pull-refresh in dialog + onRefresh payload (C7 bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  await stage.locator('[data-testid="c7-dialog-open"]').click();
  const pr = page.locator('[data-testid="c7-dialog-pr"]');
  await expect(pr).toBeVisible({ timeout: 10_000 });
  await expect(pr).toHaveAttribute('data-status', 'normal');

  // A 150px downward pull (threshold is 50) via the CDP touch pipeline.
  await cdpTouchDrag(page, '[data-testid="c7-dialog-pr"]', { x: 100, y: 10 }, { x: 100, y: 170 });

  // P1: ${direction}|${threshold} resolve from the onRefresh payload.
  await expect.poll(async () => readProbe(page, 'refresh'), { timeout: 10_000 }).toBe('down|50');
  // The state machine returns to rest after the refresh settles.
  await expect.poll(async () => pr.getAttribute('data-status'), { timeout: 10_000 }).toBe('normal');

  await assertTrackedPageErrors(page);
});

test('mobile-host: dialog-rendered infinite-scroll fires immediateCheck onLoadMore (host-is-dialog, bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('infinite-scroll');

  const slug = scenarioSlug('Host infinite-scroll in dialog + immediateCheck (C7 bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  await stage.locator('[data-testid="c7-dialog-open"]').click();
  const is = page.locator('[data-testid="c7-dialog-is"]');
  await expect(is).toBeVisible({ timeout: 10_000 });

  // immediateCheck on mount fires onLoadMore with ${source} = 'immediate'.
  await expect.poll(async () => readProbe(page, 'loadMore'), { timeout: 10_000 }).toBe('immediate');

  await assertTrackedPageErrors(page);
});

test('mobile-host: infinite-scroll error state + retry resumes with source=retry (host-is-retry)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('infinite-scroll');

  const slug = scenarioSlug('Host infinite-scroll failure + retry (C7)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const is = stage.locator('[data-testid="c7-retry"]');
  await expect(is).toBeVisible({ timeout: 10_000 });
  await expect(is).toHaveAttribute('data-status', 'error');
  await expect(is.locator('[data-slot="infinite-scroll-status"]')).toContainText('加载失败，点击重试');

  // Only the retry button resumes loading; the args resolve ${source} = 'retry'.
  await is.locator('[data-slot="infinite-scroll-status"] button').click();
  await expect.poll(async () => readProbe(page, 'loadMore'), { timeout: 10_000 }).toBe('retry');

  await assertTrackedPageErrors(page);
});

test('mobile-host: swipe-cell row action dispatches onAction with row-scope payload (host-sw-action)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('swipe-cell');

  const slug = scenarioSlug('Host swipe-cell row action (C7)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const rows = stage.locator('[data-testid="c7-swipe-row"]');
  await expect(rows).toHaveCount(3);

  const firstRow = rows.nth(0);
  await expect(firstRow).toHaveAttribute('data-state', 'closed');

  // A rightward swipe past the 30px threshold opens the LEFT region (CDP touch).
  await cdpTouchDrag(page, '[data-testid="c7-swipe-row"]', { x: 30, y: 10 }, { x: 130, y: 10 }, 0);
  await expect.poll(async () => firstRow.getAttribute('data-state'), { timeout: 10_000 }).toBe('open-left');

  // Clicking the revealed action button dispatches onAction with ${side}|${index}.
  // The revealed region is now truly visible inside the row (NEW-C7-02), so a
  // normal real click works.
  const archive = firstRow.locator('[data-slot="swipe-cell-left"] [data-testid="c7-swipe-archive"]');
  await expect(archive).toBeVisible();
  await archive.click();
  await expect.poll(async () => readProbe(page, 'action'), { timeout: 10_000 }).toBe('open-left|0');
  // Auto-rebound after the action.
  await expect.poll(async () => firstRow.getAttribute('data-state'), { timeout: 10_000 }).toBe('closed');

  await assertTrackedPageErrors(page);
});

test('mobile-host: countdown reaches zero and fires onFinish once (host-cd-finish)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('countdown');

  const slug = scenarioSlug('Host countdown finish (C7)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const cd = stage.locator('[data-testid="c7-countdown"]');
  await expect(cd).toBeVisible({ timeout: 10_000 });
  await expect(cd).toHaveAttribute('data-finished', 'false');

  // 1.5s real-time countdown → zero → finish (data-finished flips + probe).
  await expect.poll(async () => cd.getAttribute('data-finished'), { timeout: 10_000 }).toBe('true');
  await expect.poll(async () => readProbe(page, 'finish'), { timeout: 10_000 }).toBe('finish');
  await expect(cd.locator('[data-slot="countdown-value"]')).toHaveText('00');

  await assertTrackedPageErrors(page);
});

test('mobile-host: notice-bar close hides + click dispatches + static stays status (host-nb-close/click)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('notice-bar');

  const slug = scenarioSlug('Host notice-bar close + click (C7)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  // Closable bar: close button hides the bar and dispatches onClose.
  const closable = stage.locator('[data-testid="c7-notice-close"]');
  await expect(closable).toBeVisible({ timeout: 10_000 });
  await closable.locator('[data-slot="notice-bar-close"]').click();
  await expect(closable).toHaveCount(0);
  await expect.poll(async () => readProbe(page, 'noticeClose'), { timeout: 10_000 }).toBe('closed');

  // Clickable bar: role=button, click dispatches onClick.
  const clickable = stage.locator('[data-testid="c7-notice-click"]');
  await expect(clickable).toHaveAttribute('role', 'button');
  await clickable.click();
  await expect.poll(async () => readProbe(page, 'noticeClick'), { timeout: 10_000 }).toBe('clicked');

  // Static bar: advisory role=status, not focusable.
  const staticBar = stage.locator('[data-testid="c7-notice-static"]');
  await expect(staticBar).toHaveAttribute('role', 'status');
  await expect(staticBar).not.toHaveAttribute('tabindex', '0');

  await assertTrackedPageErrors(page);
});
