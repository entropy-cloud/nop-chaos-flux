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
  await expect(page.locator('.react-flow__node')).toHaveCount(6, { timeout: 30000 });
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await assertTrackedPageErrors(page);
}

interface FlowBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// 节点的 DOM transform 即 flow 坐标（translate(xpx, ypx)），宽度需除以 viewport zoom。
async function readFlowBoxes(page: import('@playwright/test').Page): Promise<Record<string, FlowBox>> {
  return page.evaluate(() => {
    const zoomMatch =
      document.querySelector('.react-flow__viewport')?.getAttribute('style')?.match(/scale\(([\d.]+)\)/) ??
      null;
    const zoom = zoomMatch ? parseFloat(zoomMatch[1]) : 1;
    const boxes: Record<string, FlowBox> = {};
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('.react-flow__node'))) {
      const id = el.getAttribute('data-id');
      const transform = el.getAttribute('style')?.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
      if (!id || !transform) continue;
      boxes[id] = {
        id,
        x: parseFloat(transform[1]),
        y: parseFloat(transform[2]),
        width: el.getBoundingClientRect().width / zoom,
        height: el.getBoundingClientRect().height / zoom,
      };
    }
    return boxes;
  });
}

test.describe('flow designer alignment guides', () => {
  // plan 475 Phase 2：拖拽贴近兄弟节点 left/center/right × top/middle/bottom 阈值内
  // 出现 1px 对齐参考线，越出阈值或松手后消失。
  test('shows alignment guide while dragging near a sibling edge and clears on drop', async ({
    page,
  }) => {
    await openFlowDesigner(page);

    const boxes = await readFlowBoxes(page);
    const dragged = boxes['task-1'];
    const sibling = boxes['condition-1'];
    expect(dragged).toBeTruthy();
    expect(sibling).toBeTruthy();

    const zoom = await page.evaluate(() => {
      const match =
        document.querySelector('.react-flow__viewport')?.getAttribute('style')?.match(/scale\(([\d.]+)\)/) ??
        null;
      return match ? parseFloat(match[1]) : 1;
    });

    // 目标：task-1 右缘对齐 condition-1 左缘（阈值 6px 内 → 参考线出现）。
    const targetRight = sibling!.x;
    const currentRight = dragged!.x + dragged!.width;
    const screenDx = (targetRight - currentRight) * zoom;
    const screenDy = 0;

    const startX = 0;
    const taskScreen = await page.locator('.react-flow__node[data-id="task-1"]').boundingBox();
    expect(taskScreen).toBeTruthy();

    await page.mouse.move(
      taskScreen!.x + taskScreen!.width / 2,
      taskScreen!.y + taskScreen!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      taskScreen!.x + taskScreen!.width / 2 + screenDx + startX,
      taskScreen!.y + taskScreen!.height / 2 + screenDy,
      { steps: 12 },
    );
    await page.waitForTimeout(120);

    const guide = page.locator('[data-testid="fd-alignment-guide-v"]');
    await expect(guide).toBeVisible();
    await expect(guide).toHaveCSS('width', '1px');
    await expect(guide).toHaveCSS('pointer-events', 'none');

    await page.mouse.up();
    await expect(guide).toHaveCount(0, { timeout: 5000 });
    await assertTrackedPageErrors(page);
  });

  test('does not show alignment guides when dragging far from siblings', async ({ page }) => {
    await openFlowDesigner(page);

    const taskScreen = await page.locator('.react-flow__node[data-id="task-1"]').boundingBox();
    expect(taskScreen).toBeTruthy();

    await page.mouse.move(
      taskScreen!.x + taskScreen!.width / 2,
      taskScreen!.y + taskScreen!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(taskScreen!.x + taskScreen!.width / 2 + 3, taskScreen!.y - 240, {
      steps: 6,
    });
    await page.waitForTimeout(120);

    await expect(page.locator('[data-testid="fd-alignment-guide-v"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="fd-alignment-guide-h"]')).toHaveCount(0);

    await page.mouse.up();
    await assertTrackedPageErrors(page);
  });
});
