import { expect, test } from './fixtures.js';

const ARTIFACTS_DIR = 'tests/e2e/artifacts/linear-replica';

function rowCheckboxes(page: import('@playwright/test').Page) {
  return page.locator(
    '[data-testid="linear-issues-table"] [data-slot="table-select-cell"] [data-slot="checkbox"]',
  );
}

function tableRows(page: import('@playwright/test').Page) {
  return page.locator('[data-testid="linear-issues-table"] [data-slot="table-row"]');
}

async function clickRowCheckbox(page: import('@playwright/test').Page, index: number) {
  await rowCheckboxes(page).nth(index).click();
}

async function openPage(page: import('@playwright/test').Page, pageId: string, label: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`#/complex-pages/${pageId}`, { waitUntil: 'commit' });
  await expect(page.getByTestId('complex-page-title')).toContainText(label, { timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(800);
}

test.describe('Linear issues — L5 键盘通道（plan 517）', () => {
  test('19 L5 G-chord navigates via the keyboard binding; chords stay gated inside the cmdk input', async ({
    page,
  }) => {
    await openPage(page, 'linear-issues', '问题追踪 · 列表视图');

    // chord "g i" = 打开收件箱（与命令面板 cmd-nav-inbox 同语义同落点）
    await page.keyboard.press('g');
    await page.keyboard.press('i');
    await expect(page.getByTestId('complex-page-title')).toContainText('问题追踪 · 收件箱', {
      timeout: 10_000,
    });

    // chord-in-input Failure Path: 焦点在命令面板输入框内按键不触发绑定（allowInInput 缺省 false）
    await openPage(page, 'linear-issues', '问题追踪 · 列表视图');
    await page.getByTestId('linear-issues-cmdk-trigger').click();
    const input = page.getByTestId('linear-issues-cmdk-input');
    await input.click();
    await page.keyboard.type('gi');
    await expect(input).toHaveValue('gi');
    await expect(page.getByTestId('complex-page-title')).toContainText('问题追踪 · 列表视图');
  });

  test('20 L5 J/K moves the optionRow highlight pointer without touching the selection', async ({
    page,
  }) => {
    await openPage(page, 'linear-issues', '问题追踪 · 列表视图');

    // 高亮指针契约：j = 下移一行、k = 上移一行，选择集保持空（bulk-bar 隐藏）。
    // 起始指针随时序可能在未设/0 之间漂移，因此只断言相对位移，不钉绝对行号。
    const highlightedIdx = () =>
      page.evaluate(() => {
        const rows = [
          ...document.querySelectorAll(
            '[data-testid="linear-issues-table"] [data-slot="table-row"]',
          ),
        ];
        return rows.findIndex((r) => r.className.includes('ln-row-highlight'));
      });
    const highlightedAriaSelected = () =>
      page.evaluate(() => {
        const row = document.querySelector(
          '[data-testid="linear-issues-table"] [data-slot="table-row"].ln-row-highlight',
        );
        return row?.getAttribute('aria-selected');
      });

    await page.keyboard.press('j');
    await expect.poll(highlightedIdx, { timeout: 5_000 }).toBeGreaterThanOrEqual(0);
    const first = await highlightedIdx();
    expect(await highlightedAriaSelected()).toBe('true');

    await page.keyboard.press('j');
    await expect.poll(highlightedIdx, { timeout: 5_000 }).toBe(first + 1);

    // k：回移上一行
    await page.keyboard.press('k');
    await expect.poll(highlightedIdx, { timeout: 5_000 }).toBe(first);

    await expect(page.getByTestId('linear-issues-bulk-bar')).toBeHidden();
  });

  test('21 L5 modifier gestures: shift-click range union, mod+A select-all, mod-click toggle', async ({
    page,
  }) => {
    await openPage(page, 'linear-issues', '问题追踪 · 列表视图');
    const count = page.getByTestId('linear-issues-bulk-count');

    // 无修饰键点击 = 锚点行（modifierSelect 开启后锚点随未修饰变更移动）
    await clickRowCheckbox(page, 2);
    await expect(count).toContainText('已选 1 项');

    // ⇧click：anchor..clicked 加法区间并集（2..5 → 4 行），从不清除
    await rowCheckboxes(page)
      .nth(5)
      .click({ modifiers: ['Shift'] });
    await expect(count).toContainText('已选 4 项');

    // ⌘/ctrl+A：表内容器 keydown 中继全选；selectAllMode 'all' → 源数据全量 34 行
    await page.getByTestId('linear-issues-table').press('ControlOrMeta+a');
    await expect(count).toContainText('已选 34 项');

    // ⌘/ctrl-click：独立切换（不清空选择集）
    await rowCheckboxes(page)
      .nth(2)
      .click({ modifiers: ['Meta'] });
    await expect(count).toContainText('已选 33 项');
  });
});
