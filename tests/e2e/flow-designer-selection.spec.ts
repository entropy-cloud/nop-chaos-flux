import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// RF 默认 multiSelectionKeyCode 在 macOS 是 Meta、其余平台是 Control（v12 内建默认，
// 画布 multiSelect 开启时透传 undefined 走默认）。
const MULTI_MODIFIER = process.platform === 'darwin' ? ('Meta' as const) : ('Control' as const);

// RF 的 multiSelectionActive 经 React effect 异步写入 store，按键到点击之间需留出
// flush 间隙；显式 down/等待/up 复刻真实用户的按键时序。
async function multiClick(
  page: import('@playwright/test').Page,
  locator: import('@playwright/test').Locator,
) {
  await page.keyboard.down(MULTI_MODIFIER);
  await page.waitForTimeout(300);
  await locator.click();
  await page.waitForTimeout(100);
  await page.keyboard.up(MULTI_MODIFIER);
  await page.waitForTimeout(100);
}

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

async function selectedNodeIds(page: import('@playwright/test').Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('.react-flow__node.selected'))
      .map((el) => el.getAttribute('data-id'))
      .filter((id): id is string => id !== null)
      .sort(),
  );
}

test.describe('flow designer selection system', () => {
  // plan 475 Phase 1：multiSelect 默认开 → selectionOnDrag 默认开，左键空白拖动 = 框选。
  // 期望集由拖拽矩形与节点包围盒求交计算（fitView 变换下的几何断言，不钉死节点名）。
  test('left-drag on empty pane box-selects exactly the intersected nodes', async ({ page }) => {
    await openFlowDesigner(page);

    const pane = page.locator('.react-flow__pane').first();
    const paneBox = await pane.boundingBox();
    expect(paneBox).toBeTruthy();

    const dragRect = {
      x: paneBox!.x + 30,
      y: paneBox!.y + paneBox!.height / 2 - 60,
      width: 620,
      height: 140,
    };

    const expected = await page.evaluate((rect) => {
      const bounds = rect;
      return Array.from(document.querySelectorAll<HTMLElement>('.react-flow__node'))
        .map((el) => ({ id: el.getAttribute('data-id'), box: el.getBoundingClientRect() }))
        .filter(
          ({ box }) =>
            box.left < bounds.x + bounds.width &&
            box.right > bounds.x &&
            box.top < bounds.y + bounds.height &&
            box.bottom > bounds.y,
        )
        .map(({ id }) => id)
        .filter((id): id is string => id !== null)
        .sort();
    }, dragRect);
    expect(expected.length).toBeGreaterThanOrEqual(2);

    await page.mouse.move(dragRect.x, dragRect.y);
    await page.mouse.down();
    await page.mouse.move(dragRect.x + dragRect.width, dragRect.y + dragRect.height, { steps: 8 });

    // L2 几何断言：拖拽中框选矩形可见且为矩形。
    const selectionRect = page.locator('.react-flow__selection');
    await expect(selectionRect).toBeVisible();
    const rectBox = await selectionRect.boundingBox();
    expect(rectBox).toBeTruthy();
    expect(rectBox!.width).toBeGreaterThan(300);
    expect(rectBox!.height).toBeGreaterThan(60);

    await page.mouse.up();

    await expect.poll(() => selectedNodeIds(page), { timeout: 10000 }).toEqual(expected);
    await assertTrackedPageErrors(page);
  });

  test('modifier-click accumulates multi-select without collapse', async ({ page }) => {
    await openFlowDesigner(page);

    const startNode = page.locator('.react-flow__node[data-id="start-1"]').first();
    const taskNode = page.locator('.react-flow__node[data-id="task-1"]').first();
    const conditionNode = page.locator('.react-flow__node[data-id="condition-1"]').first();

    await startNode.click();
    await expect.poll(() => selectedNodeIds(page), { timeout: 10000 }).toEqual(['start-1']);

    await multiClick(page, taskNode);
    await multiClick(page, conditionNode);

    await expect
      .poll(() => selectedNodeIds(page), { timeout: 10000 })
      .toEqual(['condition-1', 'start-1', 'task-1']);

    // 再次修饰键点击已选节点 = 取消该节点选择，不坍缩他人。
    await multiClick(page, taskNode);
    expect(await selectedNodeIds(page)).toEqual(['condition-1', 'start-1']);
    await assertTrackedPageErrors(page);
  });

  test('multi-selection batch delete removes all selected nodes in one undo step', async ({
    page,
  }) => {
    await openFlowDesigner(page);

    const startNode = page.locator('.react-flow__node[data-id="start-1"]').first();
    const taskNode = page.locator('.react-flow__node[data-id="task-1"]').first();

    await startNode.click();
    await multiClick(page, taskNode);
    await expect
      .poll(() => selectedNodeIds(page), { timeout: 10000 })
      .toEqual(['start-1', 'task-1']);

    // RF 默认 deleteKeyCode 是 Backspace（Mac 键盘的 Delete 键即 Backspace）。
    await page.keyboard.press('Backspace');
    await expect(page.locator('.react-flow__node[data-id="start-1"]')).toHaveCount(0, { timeout: 10000 });
    await expect(page.locator('.react-flow__node[data-id="task-1"]')).toHaveCount(0, { timeout: 10000 });
    await expect(page.locator('.react-flow__node')).toHaveCount(4, { timeout: 10000 });

    // 单次 undo 同时恢复两节点（beginTransaction 粒度断言）。
    // 删除后焦点回落 body，undo 快捷键要求事件 target 在设计器内，先聚焦画布区域。
    await page.getByRole('region', { name: 'Flow designer canvas' }).first().focus();
    await page.keyboard.press('Control+z');
    await expect(page.locator('.react-flow__node[data-id="start-1"]')).toHaveCount(1, { timeout: 10000 });
    await expect(page.locator('.react-flow__node[data-id="task-1"]')).toHaveCount(1, { timeout: 10000 });
    await assertTrackedPageErrors(page);
  });
});
