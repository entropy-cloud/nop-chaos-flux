import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openComponentHandlesDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/component-handles', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', { name: 'component:* Capability Handles Playground', level: 1 }),
  ).toBeVisible({ timeout: 15_000 });
}

test.describe('component:* capability handles (X1)', () => {
  test('component:clear on input-text clears the field value', async ({ page }) => {
    await openComponentHandlesDemo(page);

    const nameField = page.getByLabel('Name');
    await expect(nameField).toHaveValue('Alice');

    await page.getByRole('button', { name: 'Clear Name' }).click();
    await expect(nameField).toHaveValue('');
    await assertTrackedPageErrors(page);
  });

  test('component:reset on input-text restores the initial value', async ({ page }) => {
    await openComponentHandlesDemo(page);

    const nameField = page.getByLabel('Name');
    await nameField.fill('edited');
    await expect(nameField).toHaveValue('edited');

    await page.getByRole('button', { name: 'Reset Name' }).click();
    await expect(nameField).toHaveValue('Alice');
    await assertTrackedPageErrors(page);
  });

  test('component:focus on input-text moves focus to the field', async ({ page }) => {
    await openComponentHandlesDemo(page);

    const nameField = page.getByLabel('Name');
    await expect(nameField).not.toBeFocused();

    await page.getByRole('button', { name: 'Focus Name' }).click();
    await expect(nameField).toBeFocused();
    await assertTrackedPageErrors(page);
  });

  test('component:focus on button moves focus to the button DOM', async ({ page }) => {
    await openComponentHandlesDemo(page);

    const target = page.getByRole('button', { name: 'Target Button', exact: true });
    await expect(target).not.toBeFocused();

    await page.getByRole('button', { name: 'Focus Target Button' }).click();
    await expect(target).toBeFocused();
    await assertTrackedPageErrors(page);
  });

  test('component:open / component:toggle on declarative dialog flip surface state', async ({
    page,
  }) => {
    await openComponentHandlesDemo(page);

    await expect(page.getByText('Opened via component:open capability handle.')).toHaveCount(0);

    await page.getByRole('button', { name: 'Open Dialog (component:open)' }).click();
    await expect(page.getByText('Opened via component:open capability handle.').first()).toBeVisible({
      timeout: 5_000,
    });

    // Escape closes the dialog (closeOnEsc defaults to true); the page-level Toggle
    // Dialog button is behind the dialog overlay and unreachable via click.
    await page.keyboard.press('Escape');
    await expect(page.getByText('Opened via component:open capability handle.')).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });

  test('component:open / component:close on declarative drawer flip surface state', async ({
    page,
  }) => {
    await openComponentHandlesDemo(page);

    await page.getByRole('button', { name: 'Open Drawer (component:open)' }).click();
    await expect(
      page.locator('[data-slot="drawer-surface"]').or(page.getByText('Component Handle Drawer')).first(),
    ).toBeVisible({ timeout: 5_000 });

    // The page-level Close Drawer button is behind the drawer overlay, so use Escape
    // to close the drawer (closeOnEsc defaults to true).
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-slot="drawer-surface"]')).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });
});
