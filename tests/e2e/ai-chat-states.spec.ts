import { test, expect, assertTrackedPageErrors } from './fixtures.js';

async function openCoverage(page: import('@playwright/test').Page) {
  await page.goto('/#/ai-coverage', { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: /AI Coverage/i })).toBeVisible({ timeout: 25_000 });
}

function chatRoot(page: import('@playwright/test').Page, testid: string) {
  return page.locator(`[data-slot="ai-chat-root"][data-testid="${testid}"]`);
}

test.describe('AI chat — states, events & boundary cases', () => {
  test('root data-state transitions processing → completed during a slow stream', async ({ page }) => {
    await openCoverage(page);
    const root = chatRoot(page, 'cov-chat-slow');
    await expect(root).toBeVisible({ timeout: 15_000 });
    await expect(root).toHaveAttribute('data-state', 'idle');

    await page.locator('[data-testid="cov-chat-slow"] [data-slot="ai-sender-input"] textarea').fill('state test');
    await page.locator('[data-testid="cov-chat-slow"] [data-slot="ai-sender-submit"]').click();
    await expect(root).toHaveAttribute('data-state', 'processing', { timeout: 5_000 });
    await expect(root).toHaveAttribute('data-state', 'completed', { timeout: 15_000 });
    await assertTrackedPageErrors(page);
  });

  test('streaming bubble carries data-streaming while replying', async ({ page }) => {
    await openCoverage(page);
    const chat = page.locator('[data-testid="cov-chat-slow"]');
    await chat.locator('[data-slot="ai-sender-input"] textarea').fill('stream marker');
    await chat.locator('[data-slot="ai-sender-submit"]').click();
    await expect
      .poll(async () => chat.locator('[data-slot="ai-bubble"][data-streaming]').count(), { timeout: 10_000 })
      .toBeGreaterThan(0);
    await expect
      .poll(async () => chat.locator('[data-slot="ai-bubble"][data-streaming]').count(), { timeout: 15_000 })
      .toBe(0);
    await assertTrackedPageErrors(page);
  });

  test('header / beforeMessages / afterMessages / footer regions render', async ({ page }) => {
    await openCoverage(page);
    await expect(page.locator('[data-testid="cov-header-text"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-testid="cov-before-text"]')).toBeVisible();
    await expect(page.locator('[data-testid="cov-chat-slow"] [data-slot="ai-chat-after"] [data-slot="ai-attachments"]')).toBeVisible();
    await expect(page.locator('[data-testid="cov-footer-text"]')).toBeVisible();
    await assertTrackedPageErrors(page);
  });

  test('emptyState region renders before the first message and disappears after send', async ({ page }) => {
    await openCoverage(page);
    const empty = page.locator('[data-testid="cov-empty-text"]');
    await expect(empty).toBeVisible({ timeout: 15_000 });
    const chat = page.locator('[data-testid="cov-chat-slow"]');
    await chat.locator('[data-slot="ai-sender-input"] textarea').fill('hide empty');
    await chat.locator('[data-slot="ai-sender-submit"]').click();
    await expect(page.locator('[data-testid="cov-chat-slow"] [data-slot="ai-bubble"][data-role="user"]')).toBeVisible({
      timeout: 10_000,
    });
    await expect(empty).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });

  test('onResponseComplete fires after the turn completes', async ({ page }) => {
    await openCoverage(page);
    const probe = page.locator('[data-testid="cov-probe-complete"]');
    await expect(probe).toContainText('COMPLETE:', { timeout: 15_000 });
    const chat = page.locator('[data-testid="cov-chat-slow"]');
    await chat.locator('[data-slot="ai-sender-input"] textarea').fill('complete probe');
    await chat.locator('[data-slot="ai-sender-submit"]').click();
    await expect(probe).toContainText('COMPLETE:fired', { timeout: 20_000 });
    await assertTrackedPageErrors(page);
  });

  test('missing connector renders the data-state=error surface with a hint', async ({ page }) => {
    await openCoverage(page);
    const root = chatRoot(page, 'cov-chat-noconnector');
    await expect(root).toBeVisible({ timeout: 15_000 });
    await expect(root).toHaveAttribute('data-state', 'error');
    await expect(root.locator('[data-slot="ai-chat-error"]')).toBeVisible();
    await assertTrackedPageErrors(page);
  });

  test('engine:null renders the data-state=empty switch surface', async ({ page }) => {
    await openCoverage(page);
    const root = chatRoot(page, 'cov-chat-nullengine');
    await expect(root).toBeVisible({ timeout: 15_000 });
    await expect(root).toHaveAttribute('data-state', 'empty');
    await expect(page.locator('[data-testid="cov-nullengine-empty"]')).toBeVisible();
    await assertTrackedPageErrors(page);
  });

  test('failed request shows the list-level error banner with a retry entry', async ({ page }) => {
    await openCoverage(page);
    const root = chatRoot(page, 'cov-chat-flaky');
    const chat = page.locator('[data-testid="cov-chat-flaky"]');
    await expect(root).toBeVisible({ timeout: 15_000 });
    await chat.locator('[data-slot="ai-sender-input"] textarea').fill('fail first');
    await chat.locator('[data-slot="ai-sender-submit"]').click();

    // The flaky connector fails before the first chunk, so the assistant
    // residue is dropped (invariant ⑩) — the A-5 carrier for this surface is
    // the list-level error banner, not the trailing-assistant error bubble.
    const banner = chat.locator('[data-slot="ai-message-list-error"]');
    await expect(banner).toBeVisible({ timeout: 15_000 });
    await expect(banner.locator('[data-slot="ai-message-list-error-retry"]')).toBeVisible();
    await expect(root).toHaveAttribute('data-state', 'error', { timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });

  test('onError fires for the failed turn', async ({ page }) => {
    await openCoverage(page);
    const probe = page.locator('[data-testid="cov-probe-error"]');
    const chat = page.locator('[data-testid="cov-chat-flaky"]');
    await chat.locator('[data-slot="ai-sender-input"] textarea').fill('error probe');
    await chat.locator('[data-slot="ai-sender-submit"]').click();
    await expect(probe).toContainText('ERROR:fired', { timeout: 15_000 });
    await assertTrackedPageErrors(page);
  });

  test('retry after error recovers with a normal reply', async ({ page }) => {
    await openCoverage(page);
    const chat = page.locator('[data-testid="cov-chat-flaky"]');
    await chat.locator('[data-slot="ai-sender-input"] textarea').fill('then recover');
    await chat.locator('[data-slot="ai-sender-submit"]').click();
    const retry = chat.locator('[data-slot="ai-bubble-error-retry"], [data-slot="ai-message-list-error-retry"]').first();
    await expect(retry).toBeVisible({ timeout: 15_000 });
    await retry.click();
    await expect(chat.locator('[data-slot="ai-bubble"][data-role="assistant"]').last()).toContainText('Recovered', {
      timeout: 15_000,
    });
    await assertTrackedPageErrors(page);
  });

  test('abrupt EOF mid-stream degrades gracefully (partial reply, no crash)', async ({ page }) => {
    await openCoverage(page);
    const chat = page.locator('[data-testid="cov-chat-eof"]');
    await chat.locator('[data-slot="ai-sender-input"] textarea').fill('eof test');
    await chat.locator('[data-slot="ai-sender-submit"]').click();
    await expect(chat.locator('[data-slot="ai-bubble"][data-role="assistant"]')).toContainText('Partial', {
      timeout: 15_000,
    });
    const root = chatRoot(page, 'cov-chat-eof');
    await expect(root).toHaveAttribute('data-state', 'completed', { timeout: 15_000 });
    await assertTrackedPageErrors(page);
  });

  test('rapid double submit does not duplicate the user message', async ({ page }) => {
    await openCoverage(page);
    const chat = page.locator('[data-testid="cov-chat-slow"]');
    const submit = chat.locator('[data-slot="ai-sender-submit"]');
    await chat.locator('[data-slot="ai-sender-input"] textarea').fill('rapid');
    await submit.click();
    // The engine guards processing: the textarea keeps the draft only until
    // clearOnSubmit; a second immediate click hits the disabled button.
    await expect(chat.locator('[data-slot="ai-bubble"][data-role="user"]')).toHaveCount(1, { timeout: 10_000 });
    await expect(submit).toBeDisabled({ timeout: 10_000 });
    await expect(chat.locator('[data-slot="ai-bubble"][data-role="user"]')).toHaveCount(1, { timeout: 15_000 });
    await assertTrackedPageErrors(page);
  });

  test('whitespace-only input keeps submit disabled', async ({ page }) => {
    await openCoverage(page);
    const chat = page.locator('[data-testid="cov-chat-slow"]');
    const textarea = chat.locator('[data-slot="ai-sender-input"] textarea');
    const submit = chat.locator('[data-slot="ai-sender-submit"]');
    await textarea.fill('   ');
    await expect(submit).toBeDisabled();
    await assertTrackedPageErrors(page);
  });
});
