import { expect, test, assertTrackedPageErrors } from './fixtures.js';

/**
 * plan 529 — AI 对话控件现代化 e2e（程序化断言，零截图）：
 * 代码块语言标签头、思考态三点、sender 同位切换 + 自增高、操作栏 hover 浮现、
 * 会话检索、用户消息 copy。
 */

test.describe('ai chat ux-visual (plan 529)', () => {
  // Phase 3：代码块语言标签头（v10 以 language-* 类标记围栏；无语言围栏走
  // inline 分支不渲染 chip——单测按该契约断言）。
  test('code blocks render a language label header', async ({ page }) => {
    await page.goto('/#/ai-coverage', { waitUntil: 'commit' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    const bubble = page.locator('[data-testid="cov-bubble-markdown"][data-slot="ai-bubble"]');
    await expect(bubble).toBeVisible({ timeout: 30_000 });

    const code = bubble.locator('[data-slot="ai-bubble-code"]');
    await expect(code).toBeVisible();
    await expect(code.locator('[data-slot="ai-bubble-code-lang"]')).toHaveText(/ts/i);

    await assertTrackedPageErrors(page);
  });

  // Phase 3：思考态三点交错脉冲——slow fixture 首块前的 loading 窗口内可见。
  test('thinking state shows the three-dot pulse', async ({ page }) => {
    await page.goto('/#/ai-coverage', { waitUntil: 'commit' });
    const chat = page.locator('[data-testid="cov-chat-slow"]');
    await expect(chat).toBeVisible({ timeout: 15_000 });

    await chat.locator('[data-slot="ai-sender-input"] textarea').fill('dots please');
    await chat.locator('[data-slot="ai-sender-submit"]').click();

    const dots = chat.locator('[data-slot="ai-bubble-loading-dots"]');
    await expect(dots).toBeVisible({ timeout: 10_000 });
    expect(await dots.locator('i').count()).toBe(3);

    await assertTrackedPageErrors(page);
  });

  // Phase 1：sender 同位切换 + textarea 自增高（多行输入高度增长，封顶 12rem）。
  test('sender auto-grows and swaps send/stop in place', async ({ page }) => {
    await page.goto('/#/ai-coverage', { waitUntil: 'commit' });
    const chat = page.locator('[data-testid="cov-chat-slow"]');
    await expect(chat).toBeVisible({ timeout: 15_000 });

    const textarea = chat.locator('[data-slot="ai-sender-input"] textarea');
    const heightBefore = await textarea.evaluate((el) => el.getBoundingClientRect().height);

    await textarea.fill('line1\nline2\nline3\nline4');
    const heightAfter = await textarea.evaluate((el) => el.getBoundingClientRect().height);
    expect(heightAfter).toBeGreaterThan(heightBefore);
    expect(heightAfter).toBeLessThanOrEqual(192 + 2);

    await chat.locator('[data-slot="ai-sender-submit"]').click();
    const cancel = chat.locator('[data-slot="ai-sender-cancel"]');
    await expect(cancel).toBeVisible({ timeout: 10_000 });
    await expect(chat.locator('[data-slot="ai-sender-submit"]')).toHaveCount(0);
    await cancel.click();
    await expect(chat.locator('[data-slot="ai-sender-submit"]')).toBeVisible({ timeout: 10_000 });

    await assertTrackedPageErrors(page);
  });

  // Phase 2：操作栏 hover 浮现——非 hover 态 opacity 0，hover 态 1
  //（opacity/transform 机制，computed style 断言）。
  test('assistant action bar reveals on hover', async ({ page }) => {
    await page.goto('/#/ai-coverage', { waitUntil: 'commit' });
    const bubble = page.locator('[data-testid="cov-bubble-markdown"][data-slot="ai-bubble"]');
    await expect(bubble).toBeVisible({ timeout: 15_000 });

    const actions = bubble.locator('[data-slot="ai-assistant-actions"]');
    await expect(actions).toBeAttached();

    await page.mouse.move(4, 4);
    await page.waitForTimeout(200);
    const opacityBefore = await actions.evaluate((el) => getComputedStyle(el).opacity);

    await bubble.hover();
    await page.waitForTimeout(250);
    const opacityAfter = await actions.evaluate((el) => getComputedStyle(el).opacity);

    expect(parseFloat(opacityBefore)).toBeLessThan(0.1);
    expect(parseFloat(opacityAfter)).toBeGreaterThan(0.9);

    await assertTrackedPageErrors(page);
  });

  // Phase 4：会话检索——不匹配 → 空态；清除 → 恢复。
  test('conversations search filters with empty state', async ({ page }) => {
    await page.goto('/#/ai-conversations', { waitUntil: 'commit' });
    const panel = page.locator('.nop-ai-conversations');
    await expect(panel).toBeVisible({ timeout: 30_000 });

    // demo 冷启动无会话（useConversation 无 storage/initial）：点击 + 经
    // ai:createConversation action 真建一条，再对真实数据检索。
    const create = panel.locator('[data-slot="ai-conversations-create"]');
    await expect(create).toBeVisible({ timeout: 30_000 });
    await create.click();
    const items = panel.locator('[data-slot="ai-conversations-item"]');
    await expect(items.first()).toBeVisible({ timeout: 30_000 });
    const total = await items.count();
    expect(total).toBeGreaterThanOrEqual(1);

    const search = page.getByTestId('ai-conversations-search');
    await search.fill('zzz-不存在');
    await expect(items).toHaveCount(0);
    await expect(page.getByTestId('ai-conversations-empty')).toBeVisible();

    await search.fill('');
    await expect(items).toHaveCount(total);

    await assertTrackedPageErrors(page);
  });

});
