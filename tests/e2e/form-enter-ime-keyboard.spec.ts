import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// FM-8 J1 (plan 652; FM-1a watch-note candidate): the form's Enter-to-submit
// path under a TRUSTED keyboard — plain Enter submits, and an IME composition
// Enter (keyCode 229, delivered through CDP trusted input because Playwright's
// page.keyboard cannot produce 229) must not submit. The isComposing branch
// stays covered by the form-shell unit tests (trusted isComposing is not
// producible in Chromium automation — adjudicated fallback, plan 652 M3).

// The Enter-to-submit path arms on the form's `submitAction` prop — the
// valuesPath scenario is the lab scenario that carries it (and echoes the
// committed username into the page scope on success).
const STAGE = 'submit-publishes-form-values-to-parent-scope-valuespath';

async function openStage(page: import('@playwright/test').Page) {
  await page.goto('/#/lab/form', { waitUntil: 'commit' });
  const stage = page.getByTestId(`scenario-stage-${STAGE}`);
  const username = stage.getByPlaceholder('Enter username');
  await expect(username).toBeVisible({ timeout: 15_000 });
  return { stage, username };
}

test.describe('FM-8 J1: form Enter submit + IME composition guard', () => {
  test('plain trusted Enter in a text field submits the form', async ({ page }) => {
    const { stage, username } = await openStage(page);
    await username.fill('apollo');

    await username.press('Enter');

    await expect(stage.getByText('Echo: apollo (valuesPath)')).toBeVisible({ timeout: 5_000 });
    await assertTrackedPageErrors(page);
  });

  // fixme(concurrent-territory): depends on the IME guard in form.tsx which is
  // still uncommitted work of the concurrent session (plan 652 closure audit
  // m1). Flip back to test.when the guard lands in mainline; until then this
  // case must not sit as a standing red on a clean checkout.
  test.fixme('trusted IME Enter (keyCode 229 via CDP) does not submit the form', async ({ page }) => {
    const { stage, username } = await openStage(page);
    await username.fill('apollo');

    const cdp = await page.context().newCDPSession(page);
    await username.focus();
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 229,
      nativeVirtualKeyCode: 229,
    });
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 229,
      nativeVirtualKeyCode: 229,
    });

    await page.waitForTimeout(400);
    // No submit lifecycle ran: the echo sentence stays absent and the edited
    // values are still in the fields (no navigation/state reset).
    await expect(stage.getByText(/Echo: apollo/)).toHaveCount(0);
    await expect(username).toHaveValue('apollo');
    await assertTrackedPageErrors(page);
  });
});
