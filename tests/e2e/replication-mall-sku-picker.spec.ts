import type { Page } from '@playwright/test';
import { assertTrackedPageErrors, expect, test } from './fixtures.js';
import {
  dragTouchReplication,
  expectEndpointCall,
  openReplicationPage,
  readEndpointCalls,
  seedReplicationCounters,
} from './helpers/replication.js';

// Plan 812 — S1 商城商品 SKU 选择页 focused e2e (D4 §5 S1 断言清单 + focus ①-③).
// Pillar one (programmatic interactions, __replMallCalls evidence) + pillar
// three (focus). Pillar two (axe) lives in a11y-axe-baseline.spec.ts (branch B).
//
// hasTouch is required for the picker-view/pull-refresh gesture family. The
// canvas is the fixed 375×667 host frame; the spec viewport is 1280×1080 so
// the desktop shell header + canvas stay unclipped for CDP gestures (M3
// viewport lesson).
//
// Mock seed math (mock-backend-repl-mall.ts): skuMatrix 3 colors × 3 sizes,
// sku-001..009, 白色 512G (sku-006) sold out; purchaseLimit 2 (交互② 钳制面);
// goodsFeed 27 cards (≥3 pages, 交互⑥ asserts ≥2 pages); flash-sale deadline
// fixed future epoch-ms until advanceFlashSaleClock shifts it (交互③ 重进页
// 触发 goodsDetail 重取 → targetTime 变过去 → onFinish → flashSaleSession+1).
//
// 求交 (G16): both picker-wheels start at index 0 (曜石黑/128G) but the
// scope values stay '' until a wheel FIRES onChange — drag each wheel once so
// both scope values land, then the expression faces resolve (sku/price/stock).

const COUNTERS_KEY = '__replMallCalls';
const HOOKS_KEY = '__replMallTestHooks';

const PANEL = '[data-testid="mall-sku-picker-panel"]';

async function callCount(page: Page, endpoint: string): Promise<number> {
  return (await readEndpointCalls(page, COUNTERS_KEY))[endpoint] ?? 0;
}

async function readHook<T = Record<string, unknown>>(page: Page, hookKey: string): Promise<T> {
  return page.evaluate(
    (k) =>
      (((window as unknown as Record<string, Record<string, unknown>>).__replMallTestHooks ?? {})[
        k
      ] ?? {}) as T,
    hookKey,
  );
}

async function openS1(page: Page): Promise<void> {
  await seedReplicationCounters(page, COUNTERS_KEY, HOOKS_KEY);
  await openReplicationPage(page, 'mall-sku-picker', {
    title: '商城商品 SKU 选择页',
  });
  // goodsDetail + flashSaleSession + first feed window settled.
  await expect(page.locator('[data-testid="mall-sku-picker-feed-image"]').first()).toBeVisible({
    timeout: 30_000,
  });
}

/** U9 后 polish（plan 855 交互裁决，语义不弱化）：规格选择器由 picker-view 双轮
 * 改为 button-group-select 芯片（拼多多式）——选择语义（selectedColor/selectedSize
 * → skuId 前端求交）不变，输入模态从拖拽换为点击；断言对象（sku/价格/库存/
 * 缺货闸/payload 镜像）全部保留。点击芯片直至其被选中（确定性，替代拖拽 snap 重试）。 */
async function clickSpecChip(page: Page, groupTid: string, label: string): Promise<string> {
  const chip = page
    .getByTestId(groupTid)
    .locator('[data-slot="button-group-select-item"]')
    .filter({ hasText: label });
  await chip.click();
  await expect(chip).toHaveAttribute('aria-pressed', 'true', { timeout: 5_000 });
  await page.waitForTimeout(400);
  return label;
}

/** Open the SKU panel and select both spec chips so selectedColor/selectedSize land. */
/** buildMallSkuMatrix wire facts (price 3999+n*100, stock 20-n; sku-006 白512G sold out). */
const SKU_FACTS: Record<string, { price: number; stock: number }> = {
  'sku-001': { price: 4099, stock: 19 },
  'sku-002': { price: 4199, stock: 18 },
  'sku-003': { price: 4299, stock: 17 },
  'sku-004': { price: 4399, stock: 16 },
  'sku-005': { price: 4499, stock: 15 },
  'sku-006': { price: 4599, stock: 0 },
  'sku-007': { price: 4699, stock: 13 },
  'sku-008': { price: 4799, stock: 12 },
  'sku-009': { price: 4899, stock: 11 },
};

/** Drag the SKU panel to its top anchor (480): below the top anchor the
 * floating-panel owns ALL vertical gestures (touchmove arbitration) and the
 * picker-view wheels never receive the spin — at the top anchor the panel
 * hands content moves back and the wheels self-own (touchAction). */
async function dragPanelToTopAnchor(page: Page): Promise<void> {
  const panel = page.locator(PANEL);
  const hb = await page.locator('[data-slot="floating-panel-handle"]').boundingBox();
  await dragTouchReplication(
    page,
    { x: hb!.x + hb!.width / 2, y: hb!.y + hb!.height / 2 },
    { x: hb!.x + hb!.width / 2, y: hb!.y + hb!.height / 2 - 280 },
    { steps: 12 },
  );
  await expect(panel).toHaveAttribute('data-anchor', '1', { timeout: 10_000 });
}

async function readResolvedSku(page: Page): Promise<{ skuId: string; price: number; stock: number }> {
  const skuText = await page.getByTestId('mall-sku-picker-sku').textContent({ timeout: 10_000 });
  const skuId = (skuText ?? '').match(/sku-\d{3}/)?.[0] ?? '';
  expect(skuId).toMatch(/^sku-\d{3}$/);
  return { skuId, ...SKU_FACTS[skuId] };
}

/**
 * Select both spec wheels and land on an IN-STOCK SKU. The wheel snap
 * decides the final row (a fling may advance more than one row), and the
 * fixture has one sold-out combination — so instead of skipping the payload
 * assertions when the snap lands there (plan 819 P1 F4-1: that silently
 * passed), re-spin the size wheel (bounded) and hard-assert the stock.
 */
async function selectFullSpec(page: Page): Promise<{ skuId: string; price: number; stock: number }> {
  const panel = page.locator(PANEL);
  await expect(panel).toHaveAttribute('data-anchor', '0', { timeout: 10_000 });
  await dragPanelToTopAnchor(page);
  await clickSpecChip(page, 'mall-sku-picker-spec-color', '曜石黑');
  // sold-out 组合是 冰川白+512G（sku-006）——曜石黑下任一容量均有货。
  await clickSpecChip(page, 'mall-sku-picker-spec-size', '128G');
  const resolved = await readResolvedSku(page);
  expect(resolved.stock, `selected SKU ${resolved.skuId} must be in stock`).toBeGreaterThan(0);
  return resolved;
}

test.describe('S1 商城商品 SKU 选择页 (#/complex-pages/mall-sku-picker)', () => {
  test.use({ viewport: { width: 1280, height: 1080 }, hasTouch: true });

  test('前置：mobile canvas + 画廊 4 图 + 促销横幅（repl-price/countdown/progress/场次）+ 商品卡首屏 + 三端点计数', async ({
    page,
  }) => {
    await openS1(page);

    const screen = page.getByTestId('mall-sku-picker-screen');
    const box = await screen.boundingBox();
    expect(box?.width).toBe(375);
    expect(box?.height).toBe(667);

    // 画廊：CarouselItemSchema 形状的 images → 4 个 img（硬断言，防静默空帧）。
    await expect(page.locator('[data-slot="carousel-item"] img')).toHaveCount(4, {
      timeout: 15_000,
    });

    // 促销横幅：repl-price 大小字 + 划线价 + 场次徽标。
    const price = page.getByTestId('mall-sku-picker-price');
    await expect(price).toContainText('¥3799');
    await expect(price.evaluate((el) => getComputedStyle(el).fontSize)).resolves.not.toBe('0px');
    const priceClass = (await price.getAttribute('class')) ?? '';
    expect(priceClass).toContain('repl-price');
    await expect(page.getByTestId('mall-sku-picker-price-original')).toContainText('¥4999');
    const originalStyle = await page
      .getByTestId('mall-sku-picker-price-original')
      .evaluate((el) => getComputedStyle(el).textDecorationLine);
    expect(originalStyle).toContain('line-through');
    await expect(page.getByTestId('mall-sku-picker-session-badge')).toContainText('正在进行');

    // countdown + progress + 场次三态控件。
    await expect(page.getByTestId('mall-sku-picker-countdown')).toBeVisible();
    await expect(page.getByTestId('mall-sku-picker-seckill-progress')).toBeVisible();
    await expect(page.getByTestId('mall-sku-picker-session-switch')).toBeVisible();

    // 商品卡首屏（9/页窗口）。
    await expect(page.getByTestId('mall-sku-picker-feed-title').first()).toBeVisible();

    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMall__goodsDetail', { atLeast: 1 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMall__flashSaleSession', { atLeast: 1 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMall__goodsFeed', { atLeast: 1 });
    await assertTrackedPageErrors(page);
  });

  test('交互① 求交：双轮选规格 → sku/价格/库存/缺货闸全脸一致 + skuLocate=0（前端求交证据）', async ({
    page,
  }) => {
    await openS1(page);

    const panel = page.locator(PANEL);
    await expect(panel).toHaveAttribute('data-anchor', '0', { timeout: 10_000 });

    // 未选全初态：求交空集 → 缺货闸拦截（按钮 disabled）。
    await expect(page.getByTestId('mall-sku-picker-stock-badge')).toContainText('缺货');
    await expect(page.getByTestId('mall-sku-picker-add-cart')).toBeDisabled();

    await dragPanelToTopAnchor(page);
    await clickSpecChip(page, 'mall-sku-picker-spec-color', '曜石黑');
    await clickSpecChip(page, 'mall-sku-picker-spec-size', '128G');

    const skuText = await page.getByTestId('mall-sku-picker-sku').textContent({ timeout: 10_000 });
    const skuId = (skuText ?? '').match(/sku-\d{3}/)?.[0] ?? '';
    expect(skuId).toMatch(/^sku-\d{3}$/);
    const resolved = { skuId, ...SKU_FACTS[skuId] };

    // 求交全脸一致：sku/价格/库存同源 + 闸随库存切换。
    await expect(page.getByTestId('mall-sku-picker-sku-price')).toContainText(
      String(resolved.price),
      { timeout: 10_000 },
    );
    await expect(page.getByTestId('mall-sku-picker-stock')).toContainText(
      String(resolved.stock),
      { timeout: 10_000 },
    );
    if (resolved.stock > 0) {
      await expect(page.getByTestId('mall-sku-picker-stock-badge')).toContainText('有货');
      await expect(page.getByTestId('mall-sku-picker-add-cart')).toBeEnabled({ timeout: 10_000 });
    } else {
      await expect(page.getByTestId('mall-sku-picker-stock-badge')).toContainText('缺货');
      await expect(page.getByTestId('mall-sku-picker-add-cart')).toBeDisabled();
    }

    // G16 前端求交证据：skuLocate 备胎计数为 0。
    expect(await callCount(page, 'ReplMall__skuLocate')).toBe(0);
    await assertTrackedPageErrors(page);
  });

  test('交互② 步进超 purchaseLimit 拦截：输入 5 → 失焦钳制到 max=2', async ({ page }) => {
    await openS1(page);

    const quantity = page.getByTestId('mall-sku-picker-quantity').locator('input');
    await quantity.scrollIntoViewIfNeeded();
    await quantity.fill('5');
    await quantity.blur();
    await expect(quantity).toHaveValue('2', { timeout: 10_000 });
    await expect(page.getByTestId('mall-sku-picker-limit-hint')).toContainText('限购 2 件');
    await assertTrackedPageErrors(page);
  });

  test('交互③ 倒计时切态：advanceFlashSaleClock + reload → goodsDetail 重取 → targetTime 过去 → countdown finished + flashSaleSession 供数', async ({
    page,
  }) => {
    await openS1(page);

    // 推进模拟时钟（sessionStorage 累积偏移跨 reload 存续；基线被拉近而
    // 越线——D6 MIN-3 传播路径：改闭包值不自动重解析 scope 绑定，须重取）。
    await page.evaluate(() => {
      const hooks = (window as unknown as Record<string, { advanceFlashSaleClock?: (d: number) => void }>)
        .__replMallTestHooks;
      hooks?.advanceFlashSaleClock?.(7_200_000);
    });
    // 同文档 goto 不触发重取——真实 reload 重放 addInitScript 并重建模块图，
    // goodsDetail 重取读到推进后的基线。注意：addInitScript 重放会把
    // __replMallCalls 计数器归零——reload 后的计数独立成段。
    await page.reload({ waitUntil: 'commit' });
    await expect(page.locator('[data-testid="mall-sku-picker-feed-image"]').first()).toBeVisible({
      timeout: 30_000,
    });

    // targetTime 已过 → countdown finished（once 守卫）；onFinish 链 ajax
    // flashSaleSession + refreshSource goodsDetail。
    await expect(page.getByTestId('mall-sku-picker-countdown')).toHaveAttribute(
      'data-finished',
      'true',
      { timeout: 15_000 },
    );
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMall__flashSaleSession', { atLeast: 1 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMall__goodsDetail', { atLeast: 1 });
    await assertTrackedPageErrors(page);
  });

  test('交互④ 加购：addToCart 计数+1 + toast + 镜像逐字段（skuId/quantity/channel，容忍多余表单键）', async ({
    page,
  }) => {
    await openS1(page);
    const resolved = await selectFullSpec(page);

    await page.getByTestId('mall-sku-picker-add-cart').click();

    await expect(page.getByText('已加入购物车')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMall__addToCart', { atLeast: 1 });

    const body = await readHook(page, 'lastAddToCartBody');
    expect(body.skuId).toBe(resolved.skuId);
    expect(body.quantity).toBe(1);
    expect(body.channel).toBe('seckill');
    expect(body.couponAllowed).toBe(false);
    // includeScope 载荷携带全部表单值（多余键容忍）：activeSession 即其一。
    expect(body.activeSession).toBe('active');
    await assertTrackedPageErrors(page);
  });

  test('交互⑤ 直购：buy-now → placeOrder 计数+1 + 镜像逐字段；钩子强制 SOLD_OUT → 错误 toast', async ({
    page,
  }) => {
    await openS1(page);
    const resolved = await selectFullSpec(page);

    await page.getByTestId('mall-sku-picker-buy-now').click();
    await expect(page.getByText('抢购成功')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMall__placeOrder', { atLeast: 1 });
    const body = await readHook(page, 'lastPlaceOrderBody');
    expect(body.skuId).toBe(resolved.skuId);
    expect(body.quantity).toBe(1);

    // 钩子强制错误分支（consume-once）→ 错误 toast 文案即钩子消息。
    await page.evaluate(() => {
      const hooks = (window as unknown as Record<string, { forcePlaceOrderError?: string }>)
        .__replMallTestHooks;
      if (hooks) hooks.forcePlaceOrderError = 'REPL_MALL_SOLD_OUT';
    });
    await page.getByTestId('mall-sku-picker-buy-now').click();
    await expect(page.getByText('抢购失败：REPL_MALL_SOLD_OUT')).toBeVisible({ timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });

  test('交互⑥ 无限滚动：商品卡增长 ≥2 页（9→18）+ finished 前计数增长', async ({ page }) => {
    await openS1(page);

    await expect(page.getByTestId('mall-sku-picker-feed-title')).toHaveCount(9, {
      timeout: 15_000,
    });
    const before = await callCount(page, 'ReplMall__goodsFeed');

    await page.evaluate(() => {
      const scroller = document.querySelector('[data-testid="mall-sku-picker-pull-refresh"]');
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
    });
    await expect(page.getByTestId('mall-sku-picker-feed-title')).toHaveCount(18, {
      timeout: 15_000,
    });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMall__goodsFeed', { atLeast: before + 1 });
    await assertTrackedPageErrors(page);
  });

  test('交互⑦ carousel onChange + 查看大图 viewer 受控点火 + mask 聚焦 Esc 关闭', async ({
    page,
  }) => {
    await openS1(page);

    // carousel 下一帧控件 → onChange 写 viewerIndex（打开 viewer 时定位该帧）。
    const next = page.locator('[data-testid="mall-sku-picker-gallery"]').getByRole('button').nth(1);
    await next.click();
    await page.getByTestId('mall-sku-picker-viewer-open').click();

    const viewer = page.locator('[data-slot="image-viewer"]');
    await expect(viewer).toBeVisible({ timeout: 10_000 });
    // 画廊帧图（fixture G41-G44 种子）任一可见即定位面成立；轮物理决定的
    // activeIndex 落点由 viewer-index 显示面记载。
    await expect(viewer.locator('img[src*="G4"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('mall-sku-picker-viewer-index')).toContainText(/查看位置：\d/);

    // viewer Esc 处理在自有 keydown——mask 聚焦后 Esc 关闭（M3 勘误 4 口径）。
    await viewer.locator('[data-slot="image-viewer-mask"]').focus();
    await page.keyboard.press('Escape');
    await expect(viewer).toHaveCount(0, { timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });

  test('交互⑧ 场次三态切换：button-group-select → 场次徽标文案跟随', async ({ page }) => {
    await openS1(page);

    await expect(page.getByTestId('mall-sku-picker-session-badge')).toContainText('正在进行');
    await page.getByTestId('mall-sku-picker-session-switch').getByText('即将开始').click();
    await expect(page.getByTestId('mall-sku-picker-session-badge')).toContainText('即将开始', {
      timeout: 10_000,
    });
    await page.getByTestId('mall-sku-picker-session-switch').getByText('已结束').click();
    await expect(page.getByTestId('mall-sku-picker-session-badge')).toContainText('已结束', {
      timeout: 10_000,
    });
    await assertTrackedPageErrors(page);
  });

  test('focus ① SKU 面板展开焦点入面板（D2 勘误 7 口径：非首项，Tab 兜底）', async ({ page }) => {
    await openS1(page);

    // 面板内 picker-view 容器可聚焦（tabindex）——面板是手势面，命中点击
    // 可能被内容层截获：force 交付后以有界 Tab 循环兜底（D2 勘误 7 口径：
    // 焦点驻留面板内即成立）。
    await page.getByTestId('mall-sku-picker-spec-color').click({ force: true });
    const focusInsidePanel = (): Promise<boolean> =>
      page.evaluate(() => {
        const active = document.activeElement;
        const panel = document.querySelector('[data-testid="mall-sku-picker-panel"]');
        return !!active && !!panel && panel.contains(active);
      });
    let landed = await focusInsidePanel();
    for (let i = 0; i < 250 && !landed; i += 1) {
      await page.keyboard.press('Tab');
      landed = await focusInsidePanel();
    }
    expect(landed).toBe(true);
    await assertTrackedPageErrors(page);
  });

  test('focus ② buy-now tab 可达（选满规格解除闸后，吸底双按钮键盘序）', async ({ page }) => {
    await openS1(page);
    // 未选满规格时缺货闸 disabled 按钮不出 Tab 序（OA-08 同族）——先选满。
    await selectFullSpec(page);

    let reached = false;
    for (let i = 0; i < 250 && !reached; i += 1) {
      await page.keyboard.press('Tab');
      reached = await page.evaluate(
        () => document.activeElement?.getAttribute('data-testid') === 'mall-sku-picker-buy-now',
      );
    }
    expect(reached).toBe(true);
    await assertTrackedPageErrors(page);
  });

  test('focus ③ image-viewer Esc 关闭返回页面', async ({ page }) => {
    await openS1(page);

    await page.getByTestId('mall-sku-picker-viewer-open').click();
    const viewer = page.locator('[data-slot="image-viewer"]');
    await expect(viewer).toBeVisible({ timeout: 10_000 });

    await viewer.locator('[data-slot="image-viewer-mask"]').focus();
    await page.keyboard.press('Escape');
    await expect(viewer).toHaveCount(0, { timeout: 10_000 });
    const focusBack = await page.evaluate(() => {
      const active = document.activeElement;
      return !active || !active.closest('[data-slot="image-viewer"]');
    });
    expect(focusBack).toBe(true);
    await assertTrackedPageErrors(page);
  });
});
