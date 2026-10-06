import { test, expect, assertTrackedPageErrors, type Page } from './fixtures.js';

// plan 531 S2：SCADA 拖拽便捷性与 palette e2e（程序化断言，无截图判据）：
// - palette 检索过滤 / 分组折叠交互；
// - drop 落点吸附 + 自动选中（真实 HTML5 拖拽链路）；
// - 方向键 nudge 批量单 undo entry（判别性：旧逐节点实现增量 = N 必挂）；
// - 拖拽结束吸附不变量（网格或对齐候选）。

interface EditorHandleShape {
  engine: {
    getViewportPoint(p: { x: number; y: number }): { x: number; y: number };
    getViewport(): { x: number; y: number; scale: number };
    getSymbol(id: string): { node: Record<string, unknown> } | undefined;
  };
  session: {
    workingConfig: { symbols: Array<{ id: string; type: string; x?: number; y?: number; width?: number; height?: number }> };
    selection: string[];
  };
  setSelection(ids: string[]): void;
  toolbox: { fit(): boolean };
  undoRedo: {
    undo(): void;
    getStackState(): { canUndo: boolean; canRedo: boolean; undoStackDepth: number; redoStackDepth: number; topOperationKind?: string };
  };
}

async function gotoEditorDemo(page: Page): Promise<number> {
  await page.goto('/#/scada-editor-demo', { waitUntil: 'load' });
  const canvas = page.locator('[data-slot="scada-editor-canvas"]');
  await expect(canvas).toBeVisible({ timeout: 60_000 });
  await expect(canvas).toHaveAttribute('data-status', 'ready', { timeout: 60_000 });
  for (let attempt = 0; attempt < 40; attempt++) {
    const cid = await canvas.getAttribute('data-cid');
    if (cid) {
      const mounted = await page.evaluate(
        ({ key }) => Boolean((window as unknown as Record<string, unknown>)[key]),
        { key: `__flux_scada_editor_${cid}` },
      );
      if (mounted) return Number(cid);
    }
    await page.waitForTimeout(250);
  }
  throw new Error('editor test handle not mounted');
}

/** 句柄方法不可跨 evaluate 边界（结构化克隆丢函数）——只回传纯数据快照，操作在 evaluate 内执行。 */
async function readSnapshot(page: Page, cid: number): Promise<{
  symbols: Array<{ id: string; type: string; x?: number; y?: number; width?: number; height?: number }>;
  selection: string[];
  stack: { canUndo: boolean; canRedo: boolean; undoStackDepth: number; redoStackDepth: number; topOperationKind?: string };
}> {
  return page.evaluate((key) => {
    const handle = (window as unknown as Record<string, unknown>)[key] as EditorHandleShape;
    return {
      symbols: handle.session.workingConfig.symbols,
      selection: handle.session.selection,
      stack: handle.undoRedo.getStackState(),
    };
  }, `__flux_scada_editor_${cid}`);
}

test.describe('scada-editor drag UX (plan 531 S2)', () => {
  test('palette search filters, empties, clears and group collapse toggles', async ({ page }) => {
    await gotoEditorDemo(page);
    const filter = page.getByTestId('scada-editor-palette-filter');
    const items = page.locator('.nop-scada-editor-palette-item');
    await expect(items.first()).toBeVisible({ timeout: 15_000 });
    const allCount = await items.count();
    expect(allCount).toBeGreaterThan(0);

    // 检索过滤（子串语义）：『矩形』命中『矩形』与『圆角矩形』两项。
    await filter.fill('矩形');
    await expect(items).toHaveCount(2);
    // 空态。
    await filter.fill('不存在图元zzz');
    await expect(page.getByTestId('scada-editor-palette-empty')).toBeVisible();
    await expect(items).toHaveCount(0);
    // 清除。
    await page.getByTestId('scada-editor-palette-filter-clear').click();
    await expect(filter).toHaveValue('');
    await expect(items).toHaveCount(allCount);
    await expect(page.getByTestId('scada-editor-palette-empty')).toHaveCount(0);

    // 分组折叠：折叠 shape 组 → 组内条目隐藏，aria-expanded false；再展开还原。
    const shapeGroup = page.getByTestId('scada-editor-palette-group-shape');
    await expect(shapeGroup).toBeVisible();
    await expect(shapeGroup).toHaveAttribute('aria-expanded', 'true');
    const rectItem = page.locator('[data-palette-item="scada-rect"]');
    await expect(rectItem).toBeVisible();
    await shapeGroup.click();
    await expect(shapeGroup).toHaveAttribute('aria-expanded', 'false');
    await expect(rectItem).toHaveCount(0);
    await shapeGroup.click();
    await expect(rectItem).toBeVisible();
    await assertTrackedPageErrors(page);
  });

  test('palette drop lands snapped and auto-selects the new symbol', async ({ page }) => {
    const cid = await gotoEditorDemo(page);
    const canvasArea = page.locator('.nop-scada-editor-layout-canvas');
    await expect(canvasArea).toBeVisible();
    const before = await readSnapshot(page, cid);
    const symbolCountBefore = before.symbols.length;

    // 拖入 scada-rect 到画布空白处（右侧远端，避开既有图元的对齐邻域 → 网格兜底可判定）。
    const box = await canvasArea.boundingBox();
    expect(box).toBeTruthy();
    const target = { x: Math.floor(box!.width * 0.72), y: Math.floor(box!.height * 0.78) };
    await page.dragAndDrop('[data-palette-item="scada-rect"]', '.nop-scada-editor-layout-canvas', {
      targetPosition: target,
    });

    await expect
      .poll(async () => (await readSnapshot(page, cid)).symbols.length, { timeout: 10_000 })
      .toBe(symbolCountBefore + 1);
    const after = await readSnapshot(page, cid);
    const added = after.symbols[symbolCountBefore];
    expect(added.type).toBe('scada-rect');
    expect(Number.isFinite(added.x)).toBe(true);
    expect(Number.isFinite(added.y)).toBe(true);
    // 网格兜底不变量：无对齐邻域时落点在网格上（世界坐标 10 的倍数）。
    expect(added.x! % 10).toBe(0);
    expect(added.y! % 10).toBe(0);
    // drop 后自动选中（resolved id）。
    expect(after.selection).toContain(added.id);
    await assertTrackedPageErrors(page);
  });

  test('arrow-key nudge over a multi-selection produces ONE undo entry (判别性)', async ({ page }) => {
    const cid = await gotoEditorDemo(page);
    const handleBefore = await readSnapshot(page, cid);
    const ids = handleBefore.symbols.slice(0, 2).map((s) => s.id);
    expect(ids.length).toBe(2);
    const positionsBefore = handleBefore.symbols.slice(0, 2).map((s) => ({ x: s.x, y: s.y }));

    await page.evaluate(
      ({ key, ids: selected }) => {
        const handle = (window as unknown as Record<string, unknown>)[key] as EditorHandleShape;
        handle.setSelection(selected);
      },
      { key: `__flux_scada_editor_${cid}`, ids },
    );

    // 键盘层挂在 canvas 区（tabIndex=0 role=application）。
    const canvasArea = page.locator('.nop-scada-editor-layout-canvas');
    await canvasArea.focus();
    const depthBefore = (await readSnapshot(page, cid)).stack.undoStackDepth;
    await page.keyboard.press('ArrowRight');

    const after = await readSnapshot(page, cid);
    const stack = after.stack;
    expect(stack.undoStackDepth - depthBefore).toBe(1);
    expect(stack.topOperationKind).toBe('update-symbol');
    const moved = after.symbols.slice(0, 2);
    expect(moved[0].x).toBe(positionsBefore[0].x! + 1);
    expect(moved[1].x).toBe(positionsBefore[1].x! + 1);

    // 一次 undo 全恢复（批量单 diff 语义）。
    await page.evaluate(
      (key) => {
        const handle = (window as unknown as Record<string, unknown>)[key] as EditorHandleShape;
        handle.undoRedo.undo();
      },
      `__flux_scada_editor_${cid}`,
    );
    const restored = await readSnapshot(page, cid);
    expect(restored.symbols.slice(0, 2).map((s) => s.x)).toEqual(positionsBefore.map((p) => p.x));
    await assertTrackedPageErrors(page);
  });

  test('drag move ends snapped to grid or an alignment candidate', async ({ page }) => {
    const cid = await gotoEditorDemo(page);
    const handle0 = await readSnapshot(page, cid);
    // 拖拽目标取首个非 pipe-junction 图元（junction 命中面是连线端点层，拖动语义不同）。
    const mover = handle0.symbols.find((s) => s.type !== 'scada-pipe-junction')!;
    expect(mover.x !== undefined && mover.y !== undefined).toBe(true);

    const canvasArea = page.locator('.nop-scada-editor-layout-canvas');
    const box = await canvasArea.boundingBox();
    expect(box).toBeTruthy();
    // 先 fitView（demo 世界坐标可能超出窄画布视口——视口外图元点击落空），再 click 选中
    // （leafer Editor 对未选中目标的首次按下是选择语义），最后按下拖动。
    await page.evaluate(
      (key) => {
        const handle = (window as unknown as Record<string, unknown>)[key] as EditorHandleShape;
        handle.toolbox.fit();
      },
      `__flux_scada_editor_${cid}`,
    );
    await page.waitForTimeout(300);
    const startAfterFit = await page.evaluate(
      ({ key, id }) => {
        const handle = (window as unknown as Record<string, unknown>)[key] as EditorHandleShape;
        const s = handle.session.workingConfig.symbols.find((n) => n.id === id)!;
        return handle.engine.getViewportPoint({ x: s.x! + (s.width ?? 100) / 2, y: s.y! + (s.height ?? 100) / 2 });
      },
      { key: `__flux_scada_editor_${cid}`, id: mover.id },
    );
    expect(startAfterFit.x).toBeGreaterThan(0);
    expect(startAfterFit.x).toBeLessThan(box!.width);
    expect(startAfterFit.y).toBeGreaterThan(0);
    expect(startAfterFit.y).toBeLessThan(box!.height);
    await page.mouse.click(box!.x + startAfterFit.x, box!.y + startAfterFit.y);
    await page.mouse.move(box!.x + startAfterFit.x, box!.y + startAfterFit.y);
    await page.mouse.down();
    await page.mouse.move(box!.x + startAfterFit.x + 13, box!.y + startAfterFit.y + 7, { steps: 4 });
    await page.mouse.up();

    // 拖拽落定：位置已离开原点（事务提交）。
    await expect
      .poll(
        async () => {
          const h = await readSnapshot(page, cid);
          const s = h.symbols.find((n) => n.id === mover.id)!;
          return { x: s.x, y: s.y };
        },
        { timeout: 10_000 },
      )
      .not.toEqual({ x: mover.x, y: mover.y });

    const snap0 = await readSnapshot(page, cid);
    const final = snap0.symbols.find((n) => n.id === mover.id)!;
    expect(final.x).not.toBe(mover.x!);
    const siblings = snap0.symbols.filter((n) => n.id !== mover.id);
    const w = final.width ?? 100;
    const h = final.height ?? 100;
    const onGrid = final.x! % 10 === 0 && final.y! % 10 === 0;
    const aligned = siblings.some((s) => {
      const sw = s.width ?? 100;
      const sh = s.height ?? 100;
      const xAxes = [s.x!, s.x! + sw / 2, s.x! + sw];
      const yAxes = [s.y!, s.y! + sh / 2, s.y! + sh];
      const myX = [final.x!, final.x! + w / 2, final.x! + w];
      const myY = [final.y!, final.y! + h / 2, final.y! + h];
      return (
        xAxes.some((a) => myX.some((b) => Math.abs(a - b) <= 8)) ||
        yAxes.some((a) => myY.some((b) => Math.abs(a - b) <= 8))
      );
    });
    expect(onGrid || aligned).toBe(true);
    // 一拖拽 = 一 diff。
    expect(snap0.stack.topOperationKind).toBe('transform-move');
    await assertTrackedPageErrors(page);
  });
});
