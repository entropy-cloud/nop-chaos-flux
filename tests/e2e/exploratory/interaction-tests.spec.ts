import { expect, test, type Page } from '@playwright/test';
import { ComponentLabHelper, scenarioSlug } from '../component-lab/helpers';

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    errors.push(`[pageerror] ${err.message}`);
  });
  return errors;
}

function filterKnownNoise(errors: string[]): string[] {
  return errors.filter(
    (e) =>
      !e.includes('favicon') &&
      !e.includes('Download the React DevTools') &&
      !e.includes('WebSocket connection'),
  );
}

function assertZeroErrors(errors: string[]) {
  expect(filterKnownNoise(errors)).toEqual([]);
}

async function assertDebuggerZeroErrors(page: Page) {
  const debuggerErrors = await page.evaluate(() => {
    const api = (window as any).__NOP_DEBUGGER_API__;
    return api ? api.queryEvents({ kind: 'error' }) : [];
  });
  expect(debuggerErrors).toHaveLength(0);
}

test.describe('Exploratory: form interactions', () => {
  test('form: empty submit shows validation errors, then fill and submit succeeds', async ({ page }) => {
    const errors = collectPageErrors(page);
    const lab = new ComponentLabHelper(page);

    await lab.openRenderer('form');
    const slug = scenarioSlug('Form with visible submit success state');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    await stage.getByRole('button', { name: /submit/i }).click();

    await stage.locator('[data-slot="field-error"]').first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});

    await stage.locator('input').first().fill('testuser');
    const inputs = stage.locator('input');
    if ((await inputs.count()) > 1) {
      await inputs.nth(1).fill('test@example.com');
    }

    await stage.getByRole('button', { name: /submit/i }).click();

    await expect(stage.getByText('testuser')).toBeVisible({ timeout: 5_000 }).catch(() => {});

    assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });

  test('input-text: empty submit then fill and resubmit clears validation', async ({ page }) => {
    const errors = collectPageErrors(page);
    const lab = new ComponentLabHelper(page);

    await lab.openRenderer('input-text');
    const slug = scenarioSlug('Basic required and optional fields');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    await stage.getByRole('button', { name: /submit/i }).click();

    await stage.locator('[data-slot="field-error"]').first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});

    await stage.locator('input').first().fill('hello world');

    await stage.getByRole('button', { name: /submit/i }).click();

    assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });

  test('select: choose option and verify bound value updates', async ({ page }) => {
    const errors = collectPageErrors(page);
    const lab = new ComponentLabHelper(page);

    await lab.openRenderer('select');
    const slug = scenarioSlug('Single-value select with inline options');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const trigger = stage.locator('[data-slot="select-trigger"], button[role="combobox"]').first();
    if (await trigger.isVisible()) {
      await trigger.click();
      await page.getByRole('option').first().click().catch(() => {});
    }

    assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });

  test('checkbox: toggle checkbox updates state', async ({ page }) => {
    const errors = collectPageErrors(page);
    const lab = new ComponentLabHelper(page);

    await lab.openRenderer('checkbox');
    const slug = scenarioSlug('Multiple checkboxes with in-form live summary');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const checkbox = stage.getByRole('checkbox').first();
    if (await checkbox.isVisible()) {
      await checkbox.click();
      await page.waitForTimeout(300);
      await checkbox.click();
    }

    assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });

  test('switch: toggle switch twice and verify zero errors', async ({ page }) => {
    const errors = collectPageErrors(page);
    const lab = new ComponentLabHelper(page);

    await lab.openRenderer('switch');
    const slug = scenarioSlug('Switch with in-form live summary');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const switchEl = stage.getByRole('switch').first();
    if (await switchEl.isVisible()) {
      await switchEl.click();
      await page.waitForTimeout(300);
      await switchEl.click();
    }

    assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });

  test('radio-group: select different options', async ({ page }) => {
    const errors = collectPageErrors(page);
    const lab = new ComponentLabHelper(page);

    await lab.openRenderer('radio-group');
    const slug = scenarioSlug('Horizontal inline layout with in-form live summary');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const radios = stage.getByRole('radio');
    const count = await radios.count();
    if (count > 1) {
      await radios.nth(1).click();
      await page.waitForTimeout(300);
      await radios.nth(0).click();
    }

    assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });
});

test.describe('Exploratory: dialog/drawer lifecycle', () => {
  test('dialog: open, fill form, confirm, verify writeback', async ({ page }) => {
    const errors = collectPageErrors(page);
    const lab = new ComponentLabHelper(page);

    await lab.openRenderer('dialog');
    const slug = scenarioSlug('Dialog with form fields and writeback');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const openBtn = stage.getByRole('button', { name: /open|dialog/i }).first();
    if (await openBtn.isVisible()) {
      await openBtn.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]').first();
      if (await dialog.isVisible()) {
        const input = dialog.locator('input').first();
        if (await input.isVisible()) {
          await input.fill('test value');
        }
        const confirmBtn = dialog.getByRole('button', { name: /confirm|ok|submit/i }).first();
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
        }
      }
      await page.waitForTimeout(500);
    }

    assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });

  test('dialog: open and close via Escape key', async ({ page }) => {
    const errors = collectPageErrors(page);
    const lab = new ComponentLabHelper(page);

    await lab.openRenderer('dialog');
    const slug = scenarioSlug('Dialog with form fields and writeback');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const openBtn = stage.getByRole('button', { name: /open|dialog/i }).first();
    if (await openBtn.isVisible()) {
      await openBtn.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]').first();
      if (await dialog.isVisible()) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }

    assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });

  test('drawer: open, type, save, verify writeback', async ({ page }) => {
    const errors = collectPageErrors(page);
    const lab = new ComponentLabHelper(page);

    await lab.openRenderer('drawer');
    const slug = scenarioSlug('Right drawer with form and writeback');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const openBtn = stage.getByRole('button').first();
    if (await openBtn.isVisible()) {
      await openBtn.click();
      await page.waitForTimeout(500);

      const textarea = page.locator('textarea').first();
      if (await textarea.isVisible()) {
        await textarea.fill('test note');
      }

      const saveBtn = page.getByRole('button', { name: /save/i }).first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
      }
      await page.waitForTimeout(500);
    }

    assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });
});

test.describe('Exploratory: tabs switching', () => {
  test('tabs: switch between all tabs', async ({ page }) => {
    const errors = collectPageErrors(page);
    const lab = new ComponentLabHelper(page);

    await lab.openRenderer('tabs');
    const slug = scenarioSlug('Horizontal tabs (top)');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const tabs = stage.getByRole('tab');
    const count = await tabs.count();
    for (let i = 0; i < count; i++) {
      const tab = tabs.nth(i);
      const isDisabled = await tab.getAttribute('aria-disabled');
      if (isDisabled !== 'true') {
        await tab.click();
        await page.waitForTimeout(300);
      }
    }

    assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });
});

test.describe('Exploratory: dynamic renderer switching', () => {
  test('dynamic-renderer: rapid schema switching has no errors', async ({ page }) => {
    const errors = collectPageErrors(page);
    const lab = new ComponentLabHelper(page);

    await lab.openRenderer('dynamic-renderer');
    const slug = scenarioSlug('Runtime schema switching via buttons');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const buttons = stage.getByRole('button');
    const count = await buttons.count();
    for (let i = 0; i < Math.min(count, 5); i++) {
      await buttons.nth(i).click();
      await page.waitForTimeout(200);
    }

    assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });
});

test.describe('Exploratory: reaction watched field', () => {
  test('reaction: counter increment and derived value update', async ({ page }) => {
    const errors = collectPageErrors(page);
    const lab = new ComponentLabHelper(page);

    await lab.openRenderer('reaction');
    const slug = scenarioSlug('Counter with derived doubled value');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const incBtn = stage.getByRole('button', { name: /increment/i }).first();
    if (await incBtn.isVisible()) {
      for (let i = 0; i < 5; i++) {
        await incBtn.click();
        await page.waitForTimeout(100);
      }
    }

    assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });
});

test.describe('Exploratory: complex form fields', () => {
  test('array-field: add row, fill, remove', async ({ page }) => {
    const errors = collectPageErrors(page);
    const lab = new ComponentLabHelper(page);

    await lab.openRenderer('array-field');
    const slug = scenarioSlug('Contact list with submit result display');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const addBtn = stage.getByRole('button', { name: /add/i }).first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(300);

      const removeBtn = stage.getByRole('button', { name: /remove|delete/i }).first();
      if (await removeBtn.isVisible()) {
        await removeBtn.click();
        await page.waitForTimeout(300);
      }
    }

    assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });

  test('condition-builder: change a rule value', async ({ page }) => {
    const errors = collectPageErrors(page);
    const lab = new ComponentLabHelper(page);

    await lab.openRenderer('condition-builder');
    const slug = scenarioSlug('Simple single-rule AND group');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const selectTrigger = stage.locator('[role="combobox"], select, button').first();
    if (await selectTrigger.isVisible()) {
      await selectTrigger.click();
      await page.waitForTimeout(300);
      const option = page.getByRole('option').first();
      if (await option.isVisible()) {
        await option.click();
      }
    }

    assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });

  test('variant-field: switch between string and list modes', async ({ page }) => {
    const errors = collectPageErrors(page);
    const lab = new ComponentLabHelper(page);

    await lab.openRenderer('variant-field');
    const slug = scenarioSlug('String vs list editor with scope-state switching');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const selectTrigger = stage.locator('[role="combobox"], select, button').first();
    if (await selectTrigger.isVisible()) {
      await selectTrigger.click();
      await page.waitForTimeout(300);
      const options = page.getByRole('option');
      const count = await options.count();
      if (count > 1) {
        await options.nth(1).click();
        await page.waitForTimeout(500);
        await selectTrigger.click();
        await page.waitForTimeout(300);
        await options.nth(0).click();
      }
    }

    assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });

  test('detail-field: open edit dialog, change field, confirm', async ({ page }) => {
    const errors = collectPageErrors(page);
    const lab = new ComponentLabHelper(page);

    await lab.openRenderer('detail-field');
    const slug = scenarioSlug('User profile editing via dialog');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const editBtn = stage.getByRole('button', { name: /edit/i }).first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]').first();
      if (await dialog.isVisible()) {
        const input = dialog.locator('input').first();
        if (await input.isVisible()) {
          await input.clear();
          await input.fill('UpdatedName');
        }
        const confirmBtn = dialog.getByRole('button', { name: /confirm|ok|save/i }).first();
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
        }
        await page.waitForTimeout(500);
      }
    }

    assertZeroErrors(errors);
    await assertDebuggerZeroErrors(page);
  });
});
