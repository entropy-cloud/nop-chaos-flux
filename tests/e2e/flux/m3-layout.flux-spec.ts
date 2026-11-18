import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * M3 layout — mobile page skeleton patterns (tabbar / navbar / actionbar /
 * submitbar / sticky), mobile viewport 390x844 + desktop 1280x800 check.
 *
 * Migrated from tests/e2e/m3-layout.spec.ts (E3 batch 2, engine swap +
 * locator.evaluate className reads kept as explicit attr() checks, and the
 * keyboard-offset waitForFunction replaced by an explicit ft.evaluate poll
 * loop with the same 5s budget and a failure message; kernel white-box
 * expectNoPageErrors added per viewport branch — stricter than the old suite).
 * Per-case isolation: each old Playwright test ran on a fresh page; here
 * openM3() bounces through '/#/' with a stability gate so the route remounts.
 */

async function openM3(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.goto('/#/m3-layout');
  await ft.expectWeb(
    ft.getByRole('heading', { name: /M3a 移动端页面骨架模式/, level: 1 }),
  ).toBeVisible({ timeoutMs: 15_000 });
}

export default async function m3Layout(ft: FtGlobal): Promise<{ cases: number }> {
  // ---- mobile viewport branch (old describe: viewport 390x844) ----
  await ft.setViewportSize(390, 844);

  // Case 1: Tabbar footer region renders and navigate button fires toast
  // (≠ tabs content switch)
  await openM3(ft);

  const tabbarRoot = ft.locator('[data-testid="m3-tabbar-root"]');
  await ft.expectWeb(tabbarRoot).toBeVisible({ timeoutMs: 10_000 });

  const footer = tabbarRoot.locator('[data-slot="page-footer"]');
  await ft.expectWeb(footer).toBeVisible({ timeoutMs: 5_000 });
  const footerClass = (await footer.attr('class')) ?? '';
  if (!footerClass.includes('nop-tabbar')) {
    throw new Error(`tabbar footer: class should contain "nop-tabbar", got "${footerClass}"`);
  }

  const homeButton = ft.getByTestId('m3-tabbar-home');
  await ft.expectWeb(homeButton).toBeVisible({ timeoutMs: 5_000 });

  await homeButton.click();
  await ft.expectWeb(ft.locator('body')).toContainText('navigate → /home', { timeoutMs: 5_000 });

  await expectNoPageErrors(ft, 'm3:tabbar');

  // Case 2: NavBar header region renders back button + title + right action
  await openM3(ft);

  const navbarRoot = ft.locator('[data-testid="m3-navbar-root"]');
  await ft.expectWeb(navbarRoot).toBeVisible({ timeoutMs: 10_000 });

  const toolbar = navbarRoot.locator('[data-slot="page-toolbar"]');
  await ft.expectWeb(toolbar).toBeVisible({ timeoutMs: 5_000 });

  const backButton = ft.getByTestId('m3-navbar-back');
  await ft.expectWeb(backButton).toBeVisible({ timeoutMs: 5_000 });

  await backButton.click();
  await ft.expectWeb(ft.locator('body')).toContainText('navigate → -1', { timeoutMs: 5_000 });

  await expectNoPageErrors(ft, 'm3:navbar');

  // Case 3: ActionBar footer region renders icon group + CTA buttons
  await openM3(ft);

  const actionBarRoot = ft.locator('[data-testid="m3-actionbar-root"]');
  await ft.expectWeb(actionBarRoot).toBeVisible({ timeoutMs: 10_000 });

  const actionBarFooter = actionBarRoot.locator('[data-slot="page-footer"]');
  await ft.expectWeb(actionBarFooter).toBeVisible({ timeoutMs: 5_000 });

  await ft.expectWeb(ft.getByTestId('m3-actionbar-cart')).toBeVisible({ timeoutMs: 5_000 });
  await ft.expectWeb(ft.getByTestId('m3-actionbar-buy')).toBeVisible({ timeoutMs: 5_000 });
  // locator.getByText is not in the driver API; root-level containText is equivalent
  await ft.expectWeb(actionBarRoot).toContainText('客服');
  await ft.expectWeb(actionBarRoot).toContainText('收藏');

  await expectNoPageErrors(ft, 'm3:actionbar');

  // Case 4: SubmitBar footer region renders checkbox + price + submit CTA
  await openM3(ft);

  const submitBarRoot = ft.locator('[data-testid="m3-submitbar-root"]');
  await ft.expectWeb(submitBarRoot).toBeVisible({ timeoutMs: 10_000 });

  const submitBarFooter = submitBarRoot.locator('[data-slot="page-footer"]');
  await ft.expectWeb(submitBarFooter).toBeVisible({ timeoutMs: 5_000 });

  await ft.expectWeb(submitBarRoot).toContainText('合计：');
  await ft.expectWeb(submitBarRoot).toContainText('¥199.00');
  await ft.expectWeb(ft.getByTestId('m3-submitbar-submit')).toBeVisible({ timeoutMs: 5_000 });

  await expectNoPageErrors(ft, 'm3:submitbar');

  // Case 5: Sticky container renders with sticky top-0 marker
  await openM3(ft);

  const stickyRoot = ft.locator('[data-testid="m3-sticky-root"]');
  await ft.expectWeb(stickyRoot).toBeVisible({ timeoutMs: 10_000 });

  const stickyContainer = stickyRoot.locator('.nop-sticky').first();
  await ft.expectWeb(stickyContainer).toBeVisible({ timeoutMs: 5_000 });
  const stickyClass = (await stickyContainer.attr('class')) ?? '';
  if (!stickyClass.includes('sticky')) throw new Error(`sticky: class should contain "sticky", got "${stickyClass}"`);
  if (!stickyClass.includes('top-0')) throw new Error(`sticky: class should contain "top-0", got "${stickyClass}"`);

  await expectNoPageErrors(ft, 'm3:sticky');

  // Case 6: fixed footer gets VisualViewport bottom style when keyboard opens
  await openM3(ft);

  const tabbarRoot2 = ft.locator('[data-testid="m3-tabbar-root"]');
  const keyboardFooter = tabbarRoot2.locator('[data-slot="page-footer"]').first();
  await ft.expectWeb(keyboardFooter).toBeVisible({ timeoutMs: 10_000 });

  // TODO(migrate-debt): evaluate fallback (mocks the visualViewport DOM object
  // and dispatches resize — no driver-level equivalent)
  await ft.evaluate(
    `(() => { const vv = window.visualViewport; if (!vv) return; Object.defineProperty(vv, 'height', { configurable: true, value: window.innerHeight - 300 }); vv.dispatchEvent(new Event('resize')); })()`,
  );

  // same 5s budget as the old waitForFunction; offset must become a positive number
  let keyboardOffsetOk = false;
  let lastOffset: string | null = null;
  for (let i = 0; i < 50; i++) {
    lastOffset = await ft.evaluate(
      `(() => { const el = document.querySelector('[data-testid="m3-tabbar-root"] [data-slot="page-footer"]'); return el ? el.getAttribute('data-keyboard-offset') : null; })()`,
    );
    if (lastOffset !== null && Number(lastOffset) > 0) {
      keyboardOffsetOk = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!keyboardOffsetOk) {
    throw new Error(`keyboard offset never became positive, last value: ${JSON.stringify(lastOffset)}`);
  }

  await expectNoPageErrors(ft, 'm3:keyboard-offset');

  // ---- desktop viewport branch (old describe: viewport 1280x800) ----
  await ft.setViewportSize(1280, 800);

  // Case 7: 5 skeleton sections render without mobile-only artifacts
  await openM3(ft);
  for (const id of ['m3-tabbar', 'm3-navbar', 'm3-actionbar', 'm3-submitbar', 'm3-sticky']) {
    await ft.expectWeb(ft.locator(`[data-testid="${id}-root"]`)).toBeVisible({ timeoutMs: 10_000 });
  }

  await expectNoPageErrors(ft, 'm3:desktop-skeleton');

  return { cases: 7 };
}
