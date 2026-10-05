import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// plan 526：flow designer 拖拽与状态视觉修正——选中态 ring/shadow、连接合法性反馈、
// palette 搜索、方向键 nudge、多选簇吸附、右键上下文菜单的 e2e 验收面。

const MULTI_MODIFIER = process.platform === 'darwin' ? ('Meta' as const) : ('Control' as const);

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

async function readViewportZoom(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => {
    const match =
      document.querySelector('.react-flow__viewport')?.getAttribute('style')?.match(/scale\(([\d.]+)\)/) ??
      null;
    return match ? parseFloat(match[1]) : 1;
  });
}

// init 后 300ms 的二次 fitView 之前 ELK 自动布局异步落位会整体平移节点；
// 断言几何前必须等布局稳定（连续两次读数一致）。
async function waitForLayoutSettle(page: import('@playwright/test').Page) {
  const readPositions = () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('.react-flow__node'))
        .map((el) => el.getAttribute('style') ?? '')
        .sort()
        .join('|'),
    );
  let previous = await readPositions();
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await page.waitForTimeout(300);
    const next = await readPositions();
    if (next === previous) {
      return;
    }
    previous = next;
  }
}

test.describe('flow designer ux-visual (plan 526)', () => {
  // Phase 1：选中节点从无 box-shadow 升级为 2px ring + shadow（业界公式）。
  test('selected node gets a 2px ring box-shadow', async ({ page }) => {
    await openFlowDesigner(page);

    // worker 鼠标位置跨测试残留：上一 spec 留在画布上的指针会给节点 :hover 1px ring，
    // 先把指针移出画布区再断言初始态全 none。
    await page.mouse.move(4, 4);
    await page.waitForTimeout(150);

    const shadowsBefore = await page
      .locator('.react-flow__node')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).boxShadow));
    expect(shadowsBefore.every((shadow) => shadow === 'none')).toBe(true);

    const nodeShell = page.locator('.react-flow__node[data-id="task-1"] .nop-designer-node');
    await nodeShell.focus();
    await page.keyboard.press('Enter');

    const selectedWrapper = page.locator('.react-flow__node.selected');
    await expect(selectedWrapper).toHaveCount(1);

    const shadow = await selectedWrapper.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(shadow).not.toBe('none');
    expect(shadow).toContain('2px');

    await assertTrackedPageErrors(page);
  });

  // Phase 1：连接合法性即时反馈——合法目标 handle 命中 connectingto valid（绿/crosshair），
  // 悬停自身 source handle（非法）命中 connectingto 无 valid（红/not-allowed）。
  test('connection drag marks hovered handles valid or invalid', async ({ page }) => {
    await openFlowDesigner(page);
    await waitForLayoutSettle(page);

    const sourceHandle = page
      .locator('.react-flow__node[data-id="task-1"] [data-testid^="designer-handle-source"]')
      .first();
    const targetHandle = page
      .locator('.react-flow__node[data-id="end-1"] [data-testid^="designer-handle-target"]')
      .first();
    await expect(sourceHandle).toBeVisible();
    await expect(targetHandle).toBeVisible();

    // 拖线进行中 xyflow 的连接层会拦 Playwright hover 的 actionability 检查，
    // 改用 mouse 坐标移动（不做 actionability 检查）。
    const sourceBox = await sourceHandle.boundingBox();
    const targetBox = await targetHandle.boundingBox();
    expect(sourceBox).toBeTruthy();
    expect(targetBox).toBeTruthy();

    await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      targetBox!.x + targetBox!.width / 2,
      targetBox!.y + targetBox!.height / 2,
      { steps: 8 },
    );
    await page.waitForTimeout(120);
    await expect(targetHandle).toHaveClass(/connectingto/);
    await expect(targetHandle).toHaveClass(/\bvalid\b/);
    expect(await targetHandle.evaluate((el) => getComputedStyle(el).cursor)).toBe('crosshair');

    // 非法目标：拖回发起连线自身的 source handle（source→source 不合法）
    await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2, {
      steps: 4,
    });
    await page.waitForTimeout(120);
    await expect(sourceHandle).toHaveClass(/connectingto/);
    const sourceClass = await sourceHandle.getAttribute('class');
    expect(sourceClass).not.toMatch(/\bvalid\b/);
    expect(await sourceHandle.evaluate((el) => getComputedStyle(el).cursor)).toBe('not-allowed');

    await page.mouse.up();
    // 非法落点不产生新边
    await expect(page.locator('.react-flow__edge')).toHaveCount(6);
    await assertTrackedPageErrors(page);
  });

  // Phase 2：palette 搜索过滤 + 空态 + 清除。
  test('palette search filters node types and shows empty state', async ({ page }) => {
    await openFlowDesigner(page);

    const items = page.locator('[data-slot="designer-palette-item"]');
    await expect(items).toHaveCount(6);

    const search = page.getByTestId('designer-palette-search');
    await search.fill('开始节点');
    await expect(items).toHaveCount(1);

    await search.fill('zzz-不存在');
    await expect(page.getByTestId('designer-palette-empty')).toBeVisible();
    await expect(items).toHaveCount(0);

    await page.getByRole('button', { name: '清除搜索' }).click();
    await expect(search).toHaveValue('');
    await expect(items).toHaveCount(6);

    await assertTrackedPageErrors(page);
  });

  // Phase 3：方向键微调采用 xyflow 12.10 原生能力（NodeWrapper onKeyDown：snapToGrid
  // 时按 snapGrid=16 步进并吸附、Shift ×4；位置经 dragging:false change 落到本仓库
  // moveNode 提交链）。本用例为原生路径的回归守卫 + 单步无双移判别（此前自实现
  // nudge 与原生叠加曾造成一步双移）。
  test('arrow keys nudge the selected node natively without double-move', async ({ page }) => {
    await openFlowDesigner(page);

    const readTaskPos = () =>
      page.evaluate(() => {
        const transform = document
          .querySelector('.react-flow__node[data-id="task-1"]')
          ?.getAttribute('style')
          ?.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
        return transform ? { x: parseFloat(transform[1]), y: parseFloat(transform[2]) } : null;
      });

    const nodeShell = page.locator('.react-flow__node[data-id="task-1"] .nop-designer-node');
    await nodeShell.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);

    const before = await readTaskPos();
    expect(before).not.toBeNull();

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(150);
    const afterOne = await readTaskPos();
    // 原生步进 = snapGrid（16）且结果吸附到网格：+20/-4 的合成位移即单步无双移的判别
    //（此前自实现 nudge 与原生叠加曾一步 +21）
    expect(afterOne!.x % 16).toBe(0);
    expect(afterOne!.y % 16).toBe(0);
    expect(afterOne!.x).toBeGreaterThan(before!.x);

    const xAligned = afterOne!.x;
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(150);
    // 已对齐网格后，后续每步恰 +16（无双移）
    expect((await readTaskPos())!.x).toBeCloseTo(xAligned + 16, 5);

    await page.keyboard.press('Shift+ArrowRight');
    await page.waitForTimeout(150);
    // Shift ×4 = 64
    expect((await readTaskPos())!.x).toBeCloseTo(xAligned + 16 + 64, 5);

    await assertTrackedPageErrors(page);
  });

  // Phase 3：多选簇拖拽吸附——框选/修饰键多选后拖动整簇，参考轴对齐线照常出现
  //（修正前多选拖拽显式清空 guides，本断言为行为变化的判别性验收）。
  test('multi-select cluster drag shows alignment guides', async ({ page }) => {
    await openFlowDesigner(page);

    const readFlowX = (id: string) =>
      page.evaluate((nodeId) => {
        const transform = document
          .querySelector(`.react-flow__node[data-id="${nodeId}"]`)
          ?.getAttribute('style')
          ?.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
        return transform ? parseFloat(transform[1]) : null;
      }, id);

    // 修饰键多选 task-1 + condition-1（复刻 selection spec 的按键时序）
    for (const id of ['task-1', 'condition-1']) {
      await page.keyboard.down(MULTI_MODIFIER);
      await page.waitForTimeout(300);
      await page.locator(`.react-flow__node[data-id="${id}"]`).click();
      await page.waitForTimeout(100);
      await page.keyboard.up(MULTI_MODIFIER);
      await page.waitForTimeout(100);
    }

    await expect(page.locator('.react-flow__node.selected')).toHaveCount(2);

    const zoom = await readViewportZoom(page);
    const taskScreen = await page.locator('.react-flow__node[data-id="task-1"]').boundingBox();
    expect(taskScreen).toBeTruthy();

    // 拖起（drag-start 会做一次网格吸附），再按实时坐标二段移动到最近对齐位：
    // task-1 左缘对齐 start-1 右缘（flow x=272，16 的倍数）——吸附后参考线稳定停驻。
    await page.mouse.move(taskScreen!.x + taskScreen!.width / 2, taskScreen!.y + taskScreen!.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(200);

    const liveX = await readFlowX('task-1');
    expect(liveX).not.toBeNull();
    const targetFlowX = 272;
    const dxScreen = (targetFlowX - liveX!) * zoom;
    await page.mouse.move(
      taskScreen!.x + taskScreen!.width / 2 + dxScreen,
      taskScreen!.y + taskScreen!.height / 2,
      { steps: 6 },
    );
    await page.waitForTimeout(200);

    const guide = page.locator('[data-testid="fd-alignment-guide-v"]');
    await expect(guide).toBeVisible();
    await expect(guide).toHaveCSS('pointer-events', 'none');

    await page.mouse.up();
    await expect(guide).toHaveCount(0, { timeout: 5000 });
    await assertTrackedPageErrors(page);
  });

  // Phase 4：右键上下文菜单——节点菜单（选中/复制副本/删除）与空白菜单
  //（全选/粘贴/适应画布）、Escape 关闭。
  test('context menus dispatch node and pane commands', async ({ page }) => {
    await openFlowDesigner(page);

    // 节点右键菜单：删除节点
    await page.locator('.react-flow__node[data-id="task-1"]').click({ button: 'right' });
    const menu = page.getByTestId('designer-context-menu');
    await expect(menu).toBeVisible();
    await expect(menu).toHaveAttribute('data-context-node', 'task-1');
    await expect(page.getByTestId('designer-context-select-node')).toBeVisible();
    await expect(page.getByTestId('designer-context-duplicate-node')).toBeVisible();
    await page.getByTestId('designer-context-delete-node').click();
    await expect(menu).toBeHidden();
    await expect(page.locator('.react-flow__node')).toHaveCount(5);

    // 撤销恢复——菜单关闭后焦点回落 body，需先聚焦画布内元素过 isInsideDesigner 判定
    await page.locator('.react-flow__node[data-id="end-1"] .nop-designer-node').focus();
    await page.keyboard.press('Control+z');
    await expect(page.locator('.react-flow__node')).toHaveCount(6);

    // 空白右键菜单：Escape 关闭（点击画布空白角落，避免落在节点上派发节点菜单）
    const paneBox = await page.locator('.react-flow__pane').boundingBox();
    expect(paneBox).toBeTruthy();
    await page.mouse.click(paneBox!.x + 40, paneBox!.y + paneBox!.height - 60, { button: 'right' });
    await expect(menu).toBeVisible();
    await expect(menu).not.toHaveAttribute('data-context-node');
    await expect(page.getByTestId('designer-context-select-all')).toBeVisible();
    await expect(page.getByTestId('designer-context-paste')).toBeVisible();
    await expect(page.getByTestId('designer-context-fit-view')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();

    // 复制 → 空白菜单粘贴产生新节点
    const taskNode = page.locator('.react-flow__node[data-id="task-1"] .nop-designer-node');
    await taskNode.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Control+c');
    await page.mouse.click(paneBox!.x + 40, paneBox!.y + paneBox!.height - 60, { button: 'right' });
    await expect(menu).toBeVisible();
    await page.getByTestId('designer-context-paste').click();
    await expect(page.locator('.react-flow__node')).toHaveCount(7);

    await page.locator('.react-flow__node[data-id="end-1"] .nop-designer-node').focus();
    await page.keyboard.press('Control+z');
    await expect(page.locator('.react-flow__node')).toHaveCount(6);
    await assertTrackedPageErrors(page);
  });
});
