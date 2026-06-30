import { expect, test } from './fixtures.js';

async function openShowcase(page: import('@playwright/test').Page) {
  await page.goto('#/m5-showcase', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: 'M1–M5 移动端组件全景',
      level: 1,
    }),
  ).toBeVisible({ timeout: 15_000 });
}

async function clickTabbar(page: import('@playwright/test').Page, testid: string) {
  const btn = page.getByTestId(testid);
  await btn.scrollIntoViewIfNeeded();
  await btn.click({ force: true });
}

test.describe('M5 mobile showcase — single-JSON app loads', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('page renders phone frame with single schema renderer', async ({ page }) => {
    await openShowcase(page);
    await expect(page.locator('[data-testid="phone-frame"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="showcase-app"]')).toBeVisible({ timeout: 10_000 });
  });

  test('phone frame has notch and home indicator', async ({ page }) => {
    await openShowcase(page);
    const frame = page.locator('[data-testid="phone-frame"]');
    await expect(frame.locator('.bg-black.rounded-full').first()).toBeVisible();
  });

  test('architecture panel explains scope-based tab switching', async ({ page }) => {
    await openShowcase(page);
    await expect(page.getByText('架构说明')).toBeVisible();
    await expect(page.getByText('单个外部 JSON schema')).toBeVisible();
  });

  test('JSON structure panel shows schema tree', async ({ page }) => {
    await openShowcase(page);
    await expect(page.getByText('JSON 结构')).toBeVisible();
  });
});

test.describe('M5 mobile showcase — Home tab (default)', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('home tab: notice-bar renders and is closable', async ({ page }) => {
    await openShowcase(page);
    const noticeBar = page.locator('[data-testid="showcase-home-notice"]');
    await expect(noticeBar).toBeVisible({ timeout: 10_000 });
    const closeBtn = noticeBar.locator('[data-slot="notice-bar-close"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(noticeBar).toHaveCount(0);
  });

  test('home tab: pull-refresh renders with normal status', async ({ page }) => {
    await openShowcase(page);
    const pullRefresh = page.locator('[data-testid="showcase-home-refresh"]');
    await expect(pullRefresh).toBeVisible({ timeout: 10_000 });
    await expect(pullRefresh.getAttribute('data-status')).resolves.toBe('normal');
  });

  test('home tab: inner tabs render with 3 tab triggers', async ({ page }) => {
    await openShowcase(page);
    const tabs = page.locator('[data-testid="showcase-home-inner-tabs"]');
    await expect(tabs).toBeVisible({ timeout: 10_000 });
    await expect(tabs.getByRole('tab', { name: '推荐' })).toBeVisible();
    await expect(tabs.getByRole('tab', { name: '热门' })).toBeVisible();
    await expect(tabs.getByRole('tab', { name: '新品' })).toBeVisible();
  });

  test('home tab: outer tabs render with 4 tab triggers', async ({ page }) => {
    await openShowcase(page);
    const tabs = page.locator('[data-testid="showcase-app-tabs"]');
    await expect(tabs).toBeVisible({ timeout: 10_000 });
    await expect(tabs.getByRole('tab', { name: '首页' })).toBeVisible();
    await expect(tabs.getByRole('tab', { name: '分类' })).toBeVisible();
    await expect(tabs.getByRole('tab', { name: '购物车' })).toBeVisible();
    await expect(tabs.getByRole('tab', { name: '我的' })).toBeVisible();
  });

  test('home tab: product cards render with images', async ({ page }) => {
    await openShowcase(page);
    const frame = page.locator('[data-testid="phone-frame"]');
    const images = frame.locator('img[alt]');
    expect(await images.count()).toBeGreaterThanOrEqual(4);
  });
});

test.describe('M5 mobile showcase — tabbar buttons exist and are clickable', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('all 4 tabbar buttons render in phone frame', async ({ page }) => {
    await openShowcase(page);
    await expect(page.getByTestId('tabbar-home')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('tabbar-category')).toBeVisible();
    await expect(page.getByTestId('tabbar-cart')).toBeVisible();
    await expect(page.getByTestId('tabbar-profile')).toBeVisible();
  });

  test('clicking tabbar category button dispatches setValue', async ({ page }) => {
    await openShowcase(page);
    await clickTabbar(page, 'tabbar-category');

    const frame = page.locator('[data-testid="phone-frame"]');
    await expect(frame.getByText('商品分类')).toBeVisible({ timeout: 5_000 });
  });

  test('clicking tabbar cart button switches to cart', async ({ page }) => {
    await openShowcase(page);
    await clickTabbar(page, 'tabbar-cart');

    const frame = page.locator('[data-testid="phone-frame"]');
    await expect(frame.getByText('购物车 (3)')).toBeVisible({ timeout: 5_000 });
    await expect(frame.getByText('¥13,196')).toBeVisible();
  });

  test('clicking tabbar profile button switches to profile', async ({ page }) => {
    await openShowcase(page);
    await clickTabbar(page, 'tabbar-profile');

    const frame = page.locator('[data-testid="phone-frame"]');
    await expect(frame.getByText('张三')).toBeVisible({ timeout: 5_000 });
    await expect(frame.getByText('VIP 会员')).toBeVisible();
  });

  test('clicking tabbar home button switches back to home', async ({ page }) => {
    await openShowcase(page);

    await clickTabbar(page, 'tabbar-profile');
    const frame = page.locator('[data-testid="phone-frame"]');
    await expect(frame.getByText('张三')).toBeVisible({ timeout: 5_000 });

    await clickTabbar(page, 'tabbar-home');
    await expect(frame.getByText('全场满 500 减 50')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('M5 mobile showcase — Category tab', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('category page renders icon list', async ({ page }) => {
    await openShowcase(page);
    await clickTabbar(page, 'tabbar-category');

    const frame = page.locator('[data-testid="phone-frame"]');
    await expect(frame.getByText('手机数码')).toBeVisible({ timeout: 5_000 });
    await expect(frame.getByText('电脑办公')).toBeVisible();
    await expect(frame.getByText('家用电器')).toBeVisible();
    await expect(frame.getByText('服饰鞋包')).toBeVisible();
  });
});

test.describe('M5 mobile showcase — Cart tab', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('cart page renders items with checkbox and quantity', async ({ page }) => {
    await openShowcase(page);
    await clickTabbar(page, 'tabbar-cart');

    const cartPanel = page.locator('[data-testid="phone-frame"]').locator('[role="tabpanel"]:visible');
    await expect(cartPanel.getByText('购物车 (3)')).toBeVisible({ timeout: 5_000 });
    await expect(cartPanel.getByText('MagSafe 充电器')).toBeVisible();
  });

  test('cart page renders total and checkout button', async ({ page }) => {
    await openShowcase(page);
    await clickTabbar(page, 'tabbar-cart');

    const frame = page.locator('[data-testid="phone-frame"]');
    await expect(frame.getByText('¥13,196')).toBeVisible({ timeout: 5_000 });
    await expect(frame.getByText('结算(3)')).toBeVisible();
  });
});

test.describe('M5 mobile showcase — Profile tab', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('profile page renders user info and order counts', async ({ page }) => {
    await openShowcase(page);
    await clickTabbar(page, 'tabbar-profile');

    const frame = page.locator('[data-testid="phone-frame"]');
    await expect(frame.getByText('张三')).toBeVisible({ timeout: 5_000 });
    await expect(frame.getByText('待付款')).toBeVisible();
    await expect(frame.getByText('待发货')).toBeVisible();
  });

  test('profile page: collapse panels render', async ({ page }) => {
    await openShowcase(page);
    await clickTabbar(page, 'tabbar-profile');

    const collapse = page.locator('[data-testid="showcase-profile-collapse"]');
    await expect(collapse).toBeVisible({ timeout: 5_000 });
    await expect(collapse.getByText('我的订单')).toBeVisible();
    await expect(collapse.getByText('账户设置')).toBeVisible();
  });

  test('profile page: empty state renders', async ({ page }) => {
    await openShowcase(page);
    await clickTabbar(page, 'tabbar-profile');

    await expect(page.locator('[data-testid="showcase-profile-empty"]')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('M5 mobile showcase — zero console errors', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('app loads and all tabs switch with zero page errors', async ({ page, assertZeroPageErrors }) => {
    await openShowcase(page);
    await page.waitForTimeout(1000);

    for (const tabid of ['tabbar-category', 'tabbar-cart', 'tabbar-profile', 'tabbar-home'] as const) {
      await clickTabbar(page, tabid);
      await page.waitForTimeout(500);
    }

    await assertZeroPageErrors();
  });
});
