import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openFlowDesigner(page: import('@playwright/test').Page) {
  await page.goto('/');

  const signInButton = page.getByRole('button', { name: 'Sign in' });
  if (await signInButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await signInButton.click();
    if (await signInButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      await page.getByRole('textbox', { name: 'Username' }).fill('admin');
      await page.getByRole('textbox', { name: 'Password' }).fill('123456');
      await signInButton.click();
    }
    if (await signInButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      await page.getByRole('textbox', { name: 'Username' }).fill('nop');
      await page.getByRole('textbox', { name: 'Password' }).fill('123');
      await signInButton.click();
    }
  }

  await expect(signInButton).toHaveCount(0, { timeout: 10000 });
  await page.locator('button', { hasText: 'Visual Workflow' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(6, { timeout: 15000 });
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await assertTrackedPageErrors(page);
}

test.describe('Flow designer node and edge text rendering', () => {
  test('diagnoses node and edge rendering by dumping actual DOM', async ({
    page,
  }) => {
    await openFlowDesigner(page);

    const startNodeTexts = await page.evaluate(() => {
      const startNode = document.querySelector('[data-testid="rf__node-start-1"]');
      if (!startNode) return [];
      return Array.from(startNode.querySelectorAll('.nop-text')).map((t) => ({
        text: t.textContent?.trim() ?? '',
        className: t.className,
      }));
    });

    console.log('=== NODE NOP-TEXT ELEMENTS ===');
    console.log(JSON.stringify(startNodeTexts, null, 2));

    expect(startNodeTexts.length).toBeGreaterThan(0);
  });

  test('verifies task node title and description expressions resolve', async ({ page }) => {
    await openFlowDesigner(page);

    const taskNode = page.locator('[data-testid="rf__node-task-1"]').first();
    await expect(taskNode).toBeVisible();

    const nodeTexts = await taskNode.evaluate((el) => {
      const card = el.querySelector('.nop-designer-node');
      if (!card) return { error: 'nop-designer-node not found' };

      const texts = Array.from(card.querySelectorAll('.nop-text'));
      const titleEl = texts.find((t) => t.classList.contains('font-semibold'));
      const subtitleEl = texts.find((t) => t.classList.contains('line-clamp-2') && !t.classList.contains('px-2'));

      return {
        title: titleEl?.textContent?.trim() ?? null,
        subtitle: subtitleEl?.textContent?.trim() ?? null,
      };
    });

    expect(nodeTexts).not.toHaveProperty('error');
    expect(nodeTexts.title).toBe('发送欢迎邮件');
    expect(nodeTexts.subtitle).toBe('邮件通知');
  });

  test('verifies condition node expression resolves', async ({ page }) => {
    await openFlowDesigner(page);

    const conditionNode = page.locator('[data-testid="rf__node-condition-1"]').first();
    await expect(conditionNode).toBeVisible();

    const nodeTexts = await conditionNode.evaluate((el) => {
      const card = el.querySelector('.nop-designer-node');
      if (!card) return { error: 'nop-designer-node not found' };

      const texts = Array.from(card.querySelectorAll('.nop-text'));
      const titleEl = texts.find((t) => t.classList.contains('font-semibold'));
      const subtitleEl = texts.find((t) => t.classList.contains('line-clamp-2') && !t.classList.contains('px-2'));

      return {
        title: titleEl?.textContent?.trim() ?? null,
        subtitle: subtitleEl?.textContent?.trim() ?? null,
      };
    });

    expect(nodeTexts).not.toHaveProperty('error');
    expect(nodeTexts.title).toBe('是否企业客户');
    expect(nodeTexts.subtitle).toBe("customerType === 'enterprise'");
  });

  test('verifies edge label expression ${condition} resolves', async ({ page }) => {
    await openFlowDesigner(page);

    const edgeLabels = await page.evaluate(() => {
      const labels = document.querySelectorAll('.fd-edge-label');
      return Array.from(labels).map((label) => ({
        text: label.textContent?.trim() ?? '',
        className: label.className,
        innerHTML: label.innerHTML.substring(0, 300),
      }));
    });

    expect(edgeLabels.length).toBeGreaterThan(0);

    const triggerLabel = edgeLabels.find((l) => l.text.includes('触发'));
    expect(triggerLabel).toBeDefined();
    expect(triggerLabel!.text).toContain('触发');

    const successLabel = edgeLabels.find((l) => l.text.includes('成功'));
    expect(successLabel).toBeDefined();
    expect(successLabel!.text).toContain('成功');
  });

  test('verifies edge labels are not raw expressions', async ({ page }) => {
    await openFlowDesigner(page);

    const edgeLabels = await page.evaluate(() => {
      const labels = document.querySelectorAll('.fd-edge-label');
      return Array.from(labels).map((label) => label.textContent?.trim() ?? '');
    });

    for (const text of edgeLabels) {
      expect(text).not.toContain('${');
      expect(text).not.toContain('${condition}');
    }
  });

  test('verifies node texts are not raw expressions', async ({ page }) => {
    await openFlowDesigner(page);

    const nodes = page.locator('.react-flow__node');
    const count = await nodes.count();

    for (let i = 0; i < count; i++) {
      const raw = await nodes.nth(i).evaluate((el) => el.textContent ?? '');
      expect(raw).not.toContain('${label}');
      expect(raw).not.toContain('${trigger}');
      expect(raw).not.toContain('${description}');
      expect(raw).not.toContain('${expression}');
    }
  });
});
