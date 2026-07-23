import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openP4(page: import('@playwright/test').Page) {
  await page.goto('/#/ai-p4', { waitUntil: 'commit' });
  await expect(page.locator('[data-testid="p4-voice"]')).toBeVisible({ timeout: 15_000 });
}

test.describe('AI P4 widgets — voice / token / suggestions', () => {
  test('ai-token-usage renders the token counts from metadata.usage', async ({ page }) => {
    await openP4(page);
    const token = page.locator('[data-testid="p4-token"]');
    await expect(token).toBeVisible();
    // The mock message carries total_tokens=500.
    await expect(token.locator('[data-slot="ai-token-usage-total"]')).toContainText('500');
    await expect(token.locator('[data-slot="ai-token-usage-ring"]')).toBeVisible();
    await assertTrackedPageErrors(page);
  });

  test('ai-suggestions renders items in expand mode and a popover overflow trigger', async ({ page }) => {
    await openP4(page);
    const expand = page.locator('[data-testid="p4-suggestions"]');
    await expect(expand).toBeVisible();
    await expect(expand.locator('[data-slot="ai-suggestions-item"]')).toHaveCount(5);

    const popover = page.locator('[data-testid="p4-suggestions-popover"]');
    // maxVisible=2 → 2 inline pills + a +3 overflow trigger.
    await expect(popover.locator('[data-slot="ai-suggestions-item"]')).toHaveCount(2);
    await expect(popover.locator('[data-slot="ai-suggestions-overflow"]')).toContainText('+3');
    await assertTrackedPageErrors(page);
  });

  test('ai-voice-input renders the marker button (unsupported browsers degrade gracefully)', async ({ page }) => {
    await openP4(page);
    const voice = page.locator('[data-testid="p4-voice"]');
    await expect(voice).toBeVisible();
    // Headless chromium has no SpeechRecognition → the button degrades to disabled.
    // Assert the marker exists either way (state is browser-dependent).
    await expect(voice).toHaveAttribute('data-slot', 'ai-voice-input');
    await assertTrackedPageErrors(page);
  });
});
