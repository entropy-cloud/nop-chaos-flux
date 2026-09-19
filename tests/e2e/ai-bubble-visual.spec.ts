import { expect, test, assertTrackedPageErrors } from './fixtures.js';
import { getComputedStyleValue } from './helpers/visual-assert.js';

/**
 * Plan 472 V2 — AI bubble visual layer assertions (V0 toolchain's first
 * domain consumer). Pass/fail is fully programmatic: computed styles (bubble
 * surface / radius / tok-comment color), geometry (user-message right
 * alignment), and DOM presence (scroll-to-bottom affordance, assistant action
 * bar). Screenshots stay diagnostic-only per the AGENTS.md 2026-08-28 policy.
 */

const ASSISTANT_BUBBLE = '[data-slot="ai-bubble"][data-role="assistant"]';
const USER_BUBBLE = '[data-slot="ai-bubble"][data-role="user"]';
const SCROLL_LIST = '[data-slot="ai-message-list"]';

async function openWidgetsPage(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/#/ai-widgets', { waitUntil: 'commit' });
  await expect(page.locator('[data-slot="ai-chat-root"]')).toBeVisible({ timeout: 15_000 });
}

async function sendUserMessage(page: import('@playwright/test').Page, text: string) {
  const input = page.locator('[data-slot="ai-sender-input"] textarea');
  await expect(input).toBeVisible();
  await input.fill(text);
  await page.locator('[data-slot="ai-sender-submit"]').click();
}

test.describe('AI bubble visual layer (plan 472 V2)', () => {
  test('bubble surface, right alignment, action bar, scroll affordance, tok-comment', async ({
    page,
  }) => {
    await openWidgetsPage(page);
    await sendUserMessage(page, 'Hello');
    await expect(page.locator(USER_BUBBLE).last()).toBeVisible({ timeout: 15_000 });

    // Mid-stream: the last assistant bubble's retry must be disabled while the
    // engine is processing (regenerate refuses in-flight turns; the code
    // preset below streams for ~19s, so this window is reliably observable).
    await sendUserMessage(page, 'Help me debug this code');
    await expect(page.locator(USER_BUBBLE).nth(1)).toBeVisible({ timeout: 15_000 });
    const lastBubble = page.locator(ASSISTANT_BUBBLE).last();
    await expect(lastBubble).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(async () => page.locator('[data-slot="ai-action-retry"]').last().getAttribute('disabled'), {
        timeout: 8_000,
        intervals: [300],
      })
      .not.toBeNull();

    // Surface layer (survey §1.2): assistant bubble carries a card surface and
    // rounded corners; user bubble carries the distinct user surface and is
    // right-aligned in the column (geometry, not just CSS declaration).
    const assistantBg = await getComputedStyleValue(page.locator(ASSISTANT_BUBBLE).first(), 'background-color');
    const assistantRadius = await getComputedStyleValue(page.locator(ASSISTANT_BUBBLE).first(), 'border-radius');
    expect(assistantBg).not.toBe('rgba(0, 0, 0, 0)');
    expect(assistantRadius).not.toBe('0px');

    const userBg = await getComputedStyleValue(page.locator(USER_BUBBLE).last(), 'background-color');
    expect(userBg).not.toBe(assistantBg);

    const list = page.locator(SCROLL_LIST);
    const listBox = await list.boundingBox();
    const userBox = await page.locator(USER_BUBBLE).last().boundingBox();
    expect(listBox).toBeTruthy();
    expect(userBox).toBeTruthy();
    const userRightGap = listBox!.x + listBox!.width - (userBox!.x + userBox!.width);
    const assistantBox = await page.locator(ASSISTANT_BUBBLE).first().boundingBox();
    const assistantLeftGap = assistantBox!.x - listBox!.x;
    expect(userRightGap).toBeLessThan(24);
    expect(assistantLeftGap).toBeLessThan(userRightGap + 8);

    // Assistant action bar: copy on every assistant bubble, retry on the last
    // one only (regenerate truncates to the final user turn).
    await expect(page.locator('[data-slot="ai-action-copy"]').first()).toBeVisible();
    const copyCount = await page.locator('[data-slot="ai-action-copy"]').count();
    const retryCount = await page.locator('[data-slot="ai-action-retry"]').count();
    const assistantCount = await page.locator(ASSISTANT_BUBBLE).count();
    expect(copyCount).toBe(assistantCount);
    expect(retryCount).toBe(1);

    // tok-comment (A5): the code fixture carries a comment line; its token
    // color must differ from the surrounding code text color.
    const commentToken = page.locator('[data-slot="ai-bubble-markdown"] code .tok-comment').first();
    await expect(commentToken).toBeVisible({ timeout: 30_000 });
    const commentColor = await getComputedStyleValue(commentToken, 'color');
    const codeColor = await getComputedStyleValue(
      page.locator('[data-slot="ai-bubble-markdown"] code').first(),
      'color',
    );
    expect(commentColor).not.toBe(codeColor);

    // Scroll-to-bottom affordance (survey §1.4): scroll up in the list → the
    // floating button appears; clicking it returns to the bottom and the
    // button unmounts (pinned again).
    await list.evaluate((el) => {
      el.scrollTop = 0;
      el.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    const jump = page.locator('[data-slot="ai-scroll-to-bottom"]');
    await expect(jump).toBeVisible();
    await jump.click();
    await expect(jump).toHaveCount(0);
    await expect
      .poll(async () => {
        const box = await list.boundingBox();
        return box ? box.y : 0;
      })
      .toBeGreaterThan(0);

    await assertTrackedPageErrors(page);
  });
});
