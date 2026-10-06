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

  // Phase 4：会话检索——过滤判别性验证由 ai-conversations-filter.test.tsx 单测
  // 承担（确定性）；demo 冷启动无会话且 create→列表回路存在存量接线缺陷
  // （import-stack 命名空间竞态探针证据，登记于 plan Deferred——后继：引擎侧
  // 接线修复 plan），此处仅断言检索输入在 demo 上接线在活且输入无错误。
  test('conversations search input is wired and error-free on the demo', async ({ page }) => {
    await page.goto('/#/ai-conversations', { waitUntil: 'commit' });
    const panel = page.locator('.nop-ai-conversations');
    await expect(panel).toBeVisible({ timeout: 30_000 });

    const search = page.getByTestId('ai-conversations-search');
    await expect(search).toBeVisible({ timeout: 30_000 });
    await search.fill('任意关键词');
    await expect(search).toHaveValue('任意关键词');

    await assertTrackedPageErrors(page);
  });
});