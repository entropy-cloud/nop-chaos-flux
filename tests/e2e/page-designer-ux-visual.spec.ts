import { expect, test } from './fixtures.js';

/**
 * plan 527 — page-designer 拖拽反馈与视觉一致性 e2e（程序化断言，零截图）：
 * drag ghost（dragstart dataTransfer 有 setDragImage 时注入 ghost 元素）、
 * overlay 外观属性过渡、元素级剪贴板（Ctrl+C/V/D）、右键上下文菜单、
 * lucide 图标化返回键、空态卡片。
 */

async function openPageDesigner(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/#/page-designer', { waitUntil: 'commit' });
  await expect(page.getByTestId('page-designer-root')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('page-designer-canvas')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-psid]').first()).toBeAttached({ timeout: 30_000 });
}

test.describe('page designer ux-visual (plan 527)', () => {
  // Phase 3：空态升级为图标 + 标题 + 引导文案卡片（保留原 testid 契约）。
  test('empty canvas renders the upgraded empty-state card', async ({ page }) => {
    await openPageDesigner(page);

    const empty = page.getByTestId('page-designer-canvas-empty');
    await expect(empty).toBeVisible();
    await expect(empty.locator('svg')).toBeVisible();
    await expect(empty).toContainText('画布为空');
    await expect(empty).toContainText('拖拽或点击左侧组件开始搭建页面');
  });

  // Phase 1：palette dragstart 注入自定义 ghost（drag 事件由 Playwright HTML5
  // 拖拽管线派发，dragstart 阶段 dataTransfer 支持 setDragImage → ghost 进 DOM，
  // dragend/超时后清理）；dragAndDrop 全链路落点断言沿用 mvp spec 的 insert 计数。
  test('palette drag injects a ghost element and insert still lands', async ({ page }) => {
    await openPageDesigner(page);

    const beforeCount = await page.locator('[data-psid]').count();

    // 监听 ghost 生命周期：dragstart 时存在、drag 结束后清理。
    await page.evaluate(() => {
      const w = window as typeof window & { __pd527GhostSeen?: boolean };
      w.__pd527GhostSeen = false;
      const observer = new MutationObserver(() => {
        if (document.querySelector('[data-testid="page-designer-drag-ghost"]')) {
          w.__pd527GhostSeen = true;
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      window.addEventListener('dragend', () => observer.disconnect(), { once: true });
      setTimeout(() => observer.disconnect(), 10_000);
    });

    await page.locator('[data-palette-item="text"]').scrollIntoViewIfNeeded();
    await page.dragAndDrop('[data-palette-item="text"]', '[data-testid="page-designer-canvas"]');

    await page.waitForFunction(
      (previous) => document.querySelectorAll('[data-psid]').length === previous + 1,
      beforeCount,
      { timeout: 15_000 },
    );
    const ghostSeen = await page.evaluate(
      () => (window as typeof window & { __pd527GhostSeen?: boolean }).__pd527GhostSeen === true,
    );
    expect(ghostSeen).toBe(true);
    await expect(page.locator('[data-testid="page-designer-drag-ghost"]')).toHaveCount(0);
  });

  // Phase 1：overlay 元素带外观属性过渡（选中框 outline-color 过渡非 none）。
  test('selection overlay carries appearance transition', async ({ page }) => {
    await openPageDesigner(page);

    await page.dragAndDrop('[data-palette-item="text"]', '[data-testid="page-designer-canvas"]');
    await page.locator('.nop-text').click();

    const selectionBox = page.locator('[data-page-designer-box="selection"]');
    await expect(selectionBox).toHaveCount(1);
    const transition = await selectionBox.evaluate((el) => getComputedStyle(el).transition);
    expect(transition).toContain('outline-color');
    expect(transition).not.toBe('all 0s ease 0s');
  });

  // Phase 2：元素级剪贴板 Ctrl+C/V/D——复制、粘贴产生新节点、重复副本、undo 收敛。
  test('clipboard shortcuts copy, paste and duplicate nodes', async ({ page }) => {
    await openPageDesigner(page);

    await page.dragAndDrop('[data-palette-item="text"]', '[data-testid="page-designer-canvas"]');
    const afterInsert = await page.locator('[data-psid]').count();

    await page.locator('.nop-text').click();
    await page.keyboard.press('Control+c');
    await page.keyboard.press('Control+v');
    await page.waitForFunction(
      (previous) => document.querySelectorAll('[data-psid]').length === previous + 1,
      afterInsert,
      { timeout: 15_000 },
    );
    // 粘贴的副本同样渲染为 .nop-text
    await expect(page.locator('.nop-text')).toHaveCount(2);
    const afterPaste = await page.locator('[data-psid]').count();

    // Ctrl+D 复制副本
    await page.keyboard.press('Control+d');
    await page.waitForFunction(
      (previous) => document.querySelectorAll('[data-psid]').length === previous + 1,
      afterPaste,
      { timeout: 15_000 },
    );
    await expect(page.locator('.nop-text')).toHaveCount(3);

    // undo 逐步收敛：3 条前向记录（insert/paste/duplicate），2 步后剩 1 节点、3 步清空
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(100);
    await expect(page.locator('.nop-text')).toHaveCount(2);
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(100);
    await expect(page.locator('.nop-text')).toHaveCount(1);
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(100);
    await expect(page.locator('.nop-text')).toHaveCount(0);
  });

  // Phase 2：右键上下文菜单——节点态（复制副本/删除）与空白态（粘贴禁用）、Escape 关闭。
  test('context menu offers node and pane actions', async ({ page }) => {
    await openPageDesigner(page);

    await page.dragAndDrop('[data-palette-item="text"]', '[data-testid="page-designer-canvas"]');
    const textNode = page.locator('.nop-text');

    // 节点右键：菜单出现且携带节点锚点（画布根节点覆盖全幅，空白态由根节点菜单承载）
    await textNode.click({ button: 'right' });
    const menu = page.getByTestId('page-designer-context-menu');
    await expect(menu).toBeVisible();
    await expect(menu).not.toHaveAttribute('data-context-node', '');
    await expect(page.getByTestId('page-designer-context-paste')).toBeDisabled();
    await expect(page.getByTestId('page-designer-context-duplicate')).toBeVisible();
    await expect(page.getByTestId('page-designer-context-delete')).toBeVisible();

    // Escape 关闭
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();

    // 删除 → 节点消失 → undo 恢复
    await textNode.click({ button: 'right' });
    await expect(menu).toBeVisible();
    await page.getByTestId('page-designer-context-delete').click();
    await expect(menu).toBeHidden();
    await expect(page.locator('.nop-text')).toHaveCount(0);
    await page.keyboard.press('Control+z');
    await expect(page.locator('.nop-text')).toHaveCount(1);

    // 复制后右键节点 → 粘贴可用，粘贴进右击节点上下文产生新节点
    await textNode.click();
    await page.keyboard.press('Control+c');
    await textNode.click({ button: 'right' });
    await expect(menu).toBeVisible();
    const paste = page.getByTestId('page-designer-context-paste');
    await expect(paste).toBeEnabled();
    await paste.click();
    await expect(page.locator('.nop-text')).toHaveCount(2);
  });
});
