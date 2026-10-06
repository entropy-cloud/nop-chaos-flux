import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openAiVirtualScrollDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/ai-virtual-scroll', { waitUntil: 'commit' });
  await expect(page.locator('[data-slot="ai-chat-root"]')).toBeVisible({ timeout: 15_000 });
}

test.describe('AI virtual scroll — A-8 windowed rendering (1000 messages)', () => {
  test('only the viewport window is mounted in the DOM', async ({ page }) => {
    await openAiVirtualScrollDemo(page);

    const list = page.locator('[data-slot="ai-message-list"]');
    await expect(list).toBeVisible({ timeout: 15_000 });

    // Virtualization is enabled (crosses the 200-message threshold).
    await expect(list).toHaveAttribute('data-virtual');

    // 1000 messages are seeded, but only the visible window (+overscan) is
    // mounted as bubble DOM nodes — far fewer than 1000.
    const bubbleCount = await page.evaluate(() => {
      return document.querySelectorAll('[data-slot="ai-bubble"]').length;
    });
    expect(bubbleCount).toBeLessThan(100);
    expect(bubbleCount).toBeGreaterThan(0);

    await assertTrackedPageErrors(page);
  });

  // plan 529 Phase 4：note 可达性——虚拟模式下产生尾部 AbortedNote（发送后立即
  // 停止 → requestState='aborted'，note 渲染于虚拟窗口后的常规流内）；跳底后
  // note 必须落在可视区内（不被 spacer 遮挡）。判定：note 与容器底缘距离 ≤ 64px
  // 且纵向上与可视区相交。
  test('aborted note is reachable at the bottom of the virtual list', async ({ page }) => {
    await openAiVirtualScrollDemo(page);

    const list = page.locator('[data-slot="ai-message-list"]');
    await expect(list).toHaveAttribute('data-virtual', { timeout: 15_000 });

    // 发送 → 立即停止：制造 requestState='aborted' 的尾部 note
    const textarea = page.locator('[data-slot="ai-sender-input"] textarea');
    await textarea.fill('trigger abort note');
    await page.locator('[data-slot="ai-sender-submit"]').click();
    const cancel = page.locator('[data-slot="ai-sender-cancel"]');
    await expect(cancel).toBeVisible({ timeout: 10_000 });
    await cancel.click();
    await expect(page.locator('[data-slot="ai-message-list-aborted"]')).toBeVisible({
      timeout: 10_000,
    });

    // 程序化跳底（pinned 滚动语义：直接置 scrollTop 到底）
    await page.evaluate(() => {
      const container = document.querySelector('[data-slot="ai-message-list"]');
      if (!(container instanceof HTMLElement)) return;
      const scroller =
        container.scrollHeight > container.clientHeight
          ? container
          : ((container.querySelector('[data-virtual]') as HTMLElement | null) ??
            (container.firstElementChild as HTMLElement | null));
      if (scroller instanceof HTMLElement) {
        scroller.scrollTop = scroller.scrollHeight;
      }
    });
    await page.waitForTimeout(300);

    const reachability = await page.evaluate(() => {
      const container = document.querySelector('[data-slot="ai-message-list"]');
      if (!(container instanceof HTMLElement)) return null;
      const scroller =
        container.scrollHeight > container.clientHeight
          ? container
          : ((container.querySelector('[data-virtual]') as HTMLElement | null) ??
            (container.firstElementChild as HTMLElement | null));
      if (!(scroller instanceof HTMLElement)) return null;
      const note = document.querySelector('[data-slot="ai-message-list-aborted"]');
      if (!(note instanceof HTMLElement)) return { noteFound: false };
      const noteRect = note.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      return {
        noteFound: true,
        visible: noteRect.bottom > containerRect.top && noteRect.top < containerRect.bottom,
        distanceFromBottom: Math.abs(noteRect.bottom - containerRect.bottom),
      };
    });

    expect(reachability).toBeTruthy();
    expect(reachability!.noteFound).toBe(true);
    expect(reachability!.visible).toBe(true);
    expect(reachability!.distanceFromBottom).toBeLessThanOrEqual(64);

    await assertTrackedPageErrors(page);
  });
});