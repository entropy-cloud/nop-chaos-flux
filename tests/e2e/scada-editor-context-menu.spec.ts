import { test, expect, assertTrackedPageErrors, type Page } from './fixtures.js';

// plan 532 S3：右键上下文菜单 e2e（程序化断言，无截图判据）：
// - 图元右键：菜单弹出 + duplicate/delete 生效 + 右键选区同步（判别：已选 A 右键 B 删 B）+ undo 回滚；
// - 层级四操作（Ignition layering 语义）：toTop 后 working copy 序变化；
// - 空白右键：全选 / 适应画布；Escape 关闭。

interface EditorHandleShape {
  engine: {
    getViewportPoint(p: { x: number; y: number }): { x: number; y: number };
  };
  session: {
    workingConfig: { symbols: Array<{ id: string; type: string; x?: number; y?: number; width?: number; height?: number }> };
    selection: string[];
  };
  setSelection(ids: string[]): void;
  undoRedo: { undo(): void; getStackState(): { undoStackDepth: number; topOperationKind?: string } };
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

async function readSnapshot(page: Page, cid: number) {
  return page.evaluate((key) => {
    const handle = (window as unknown as Record<string, unknown>)[key] as EditorHandleShape;
    return {
      symbols: handle.session.workingConfig.symbols.map((s) => ({ ...s })),
      selection: handle.session.selection,
      stack: handle.undoRedo.getStackState(),
    };
  }, `__flux_scada_editor_${cid}`);
}

async function fitView(page: Page, cid: number): Promise<void> {
  await page.evaluate((key) => {
    const handle = (window as unknown as Record<string, unknown>)[key] as EditorHandleShape;
    (handle as unknown as { toolbox: { fit(): boolean } }).toolbox.fit();
  }, `__flux_scada_editor_${cid}`);
  await page.waitForTimeout(300);
}

/** 右键图元（世界坐标中心 → viewport 屏幕点）。 */
async function rightClickSymbol(page: Page, cid: number, id: string): Promise<void> {
  const point = await page.evaluate(
    ({ key, symbolId }) => {
      const handle = (window as unknown as Record<string, unknown>)[key] as EditorHandleShape;
      const s = handle.session.workingConfig.symbols.find((n) => n.id === symbolId)!;
      return handle.engine.getViewportPoint({ x: s.x! + (s.width ?? 100) / 2, y: s.y! + (s.height ?? 100) / 2 });
    },
    { key: `__flux_scada_editor_${cid}`, symbolId: id },
  );
  const box = await page.locator('.nop-scada-editor-layout-canvas').boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.click(box!.x + point.x, box!.y + point.y, { button: 'right' });
}

test.describe('scada-editor context menu (plan 532 S3)', () => {
  test('symbol right-click pops the menu; duplicate adds; delete removes with undo roll-back (含右键选区同步判别)', async ({ page }) => {
    const cid = await gotoEditorDemo(page);
    await fitView(page, cid);
    const snap0 = await readSnapshot(page, cid);
    const [a, b] = snap0.symbols;
    expect(a && b).toBeTruthy();

    // 判别断言准备：先选中 A（click 路径经句柄 setSelection 等价），再右键 B。
    await page.evaluate(
      ({ key, ids }) => {
        const handle = (window as unknown as Record<string, unknown>)[key] as EditorHandleShape;
        handle.setSelection(ids);
      },
      { key: `__flux_scada_editor_${cid}`, ids: [a.id] },
    );
    await rightClickSymbol(page, cid, b.id);
    const menu = page.getByTestId('scada-editor-context-menu');
    await expect(menu).toBeVisible();
    // 右键选区同步：命中 B ∉ selection → selection 已同步为 [B]。
    await expect
      .poll(async () => (await readSnapshot(page, cid)).selection, { timeout: 5_000 })
      .toEqual([b.id]);

    // duplicate：symbol +1。
    await page.getByTestId('scada-editor-context-duplicate').click();
    await expect
      .poll(async () => (await readSnapshot(page, cid)).symbols.length, { timeout: 10_000 })
      .toBe(snap0.symbols.length + 1);
    // 删除副本 → delete 生效（判别补强：A 仍存活——右键选区同步下删的是右键目标非先前选区）。
    const afterDup = await readSnapshot(page, cid);
    const dupId = afterDup.symbols[afterDup.symbols.length - 1].id;
    await rightClickSymbol(page, cid, dupId);
    await expect(menu).toBeVisible();
    await page.getByTestId('scada-editor-context-delete').click();
    await expect
      .poll(async () => (await readSnapshot(page, cid)).symbols.length, { timeout: 10_000 })
      .toBe(snap0.symbols.length);
    expect((await readSnapshot(page, cid)).symbols.map((s) => s.id)).toContain(a.id);
    // undo 恢复删除（一次 undo 回一个 diff）。
    await page.evaluate((key) => {
      const handle = (window as unknown as Record<string, unknown>)[key] as EditorHandleShape;
      handle.undoRedo.undo();
    }, `__flux_scada_editor_${cid}`);
    expect((await readSnapshot(page, cid)).symbols.length).toBe(snap0.symbols.length + 1);
    await assertTrackedPageErrors(page);
  });

  test('layering actions reorder the working copy (Ignition toTop 语义)', async ({ page }) => {
    const cid = await gotoEditorDemo(page);
    await fitView(page, cid);
    const snap0 = await readSnapshot(page, cid);
    expect(snap0.symbols.length).toBeGreaterThanOrEqual(2);
    const firstId = snap0.symbols[0].id;

    await rightClickSymbol(page, cid, firstId);
    await expect(page.getByTestId('scada-editor-context-menu')).toBeVisible();
    await page.getByTestId('scada-editor-context-totop').click();

    await expect
      .poll(
        async () => {
          const snap = await readSnapshot(page, cid);
          return snap.symbols.map((s) => s.id).indexOf(firstId);
        },
        { timeout: 10_000 },
      )
      .toBe(snap0.symbols.length - 1);
    await assertTrackedPageErrors(page);
  });

  test('blank right-click: selectAll selects all top-level ids; Escape closes', async ({ page }) => {
    const cid = await gotoEditorDemo(page);
    await fitView(page, cid);
    const snap0 = await readSnapshot(page, cid);

    // 空白处右键（画布左上角，避开图元）。
    const box = await page.locator('.nop-scada-editor-layout-canvas').boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.click(box!.x + 10, box!.y + 10, { button: 'right' });
    const menu = page.getByTestId('scada-editor-context-menu');
    await expect(menu).toBeVisible();
    await page.getByTestId('scada-editor-context-selectall').click();
    await expect
      .poll(async () => (await readSnapshot(page, cid)).selection.length, { timeout: 10_000 })
      .toBe(snap0.symbols.length);

    // Escape 关闭：再弹一个菜单，Escape 后消失。
    await page.mouse.click(box!.x + 10, box!.y + 10, { button: 'right' });
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });

  test('blank right-click fitCanvas applies a viewport fit', async ({ page }) => {
    const cid = await gotoEditorDemo(page);
    // 判别性准备：先程序化 zoom（toolbox.zoomAt ×2）到非 fit 态 → fitCanvas 后 viewport 必须变化。
    await page.evaluate((key) => {
      const handle = (window as unknown as Record<string, unknown>)[key] as {
        toolbox: { zoomAt(factor: number): void };
      };
      handle.toolbox.zoomAt(2);
    }, `__flux_scada_editor_${cid}`);
    await page.waitForTimeout(200);
    const before = await page.evaluate((key) => {
      const handle = (window as unknown as Record<string, unknown>)[key] as {
        engine: { getViewport(): { x: number; y: number; scale: number } };
      };
      return handle.engine.getViewport();
    }, `__flux_scada_editor_${cid}`);
    const box = await page.locator('.nop-scada-editor-layout-canvas').boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.click(box!.x + 10, box!.y + 10, { button: 'right' });
    await expect(page.getByTestId('scada-editor-context-menu')).toBeVisible();
    await page.getByTestId('scada-editor-context-fitcanvas').click();
    // 判别断言：zoom 后的 viewport 与 fit 后不同（scale 或 x/y 至少一项变化）。
    await expect
      .poll(
        async () => {
          const after = await page.evaluate((key) => {
            const handle = (window as unknown as Record<string, unknown>)[key] as {
              engine: { getViewport(): { x: number; y: number; scale: number } };
            };
            return handle.engine.getViewport();
          }, `__flux_scada_editor_${cid}`);
          return (
            Math.abs(after.scale - before.scale) > 1e-6 ||
            Math.abs(after.x - before.x) > 1e-6 ||
            Math.abs(after.y - before.y) > 1e-6
          );
        },
        { timeout: 10_000 },
      )
      .toBe(true);
    const after = await page.evaluate((key) => {
      const handle = (window as unknown as Record<string, unknown>)[key] as {
        engine: { getViewport(): { x: number; y: number; scale: number } };
      };
      const v = handle.engine.getViewport();
      return { x: Number.isFinite(v.x), y: Number.isFinite(v.y), scale: v.scale };
    }, `__flux_scada_editor_${cid}`);
    expect(after.x).toBe(true);
    expect(after.y).toBe(true);
    expect(after.scale).toBeGreaterThan(0);
    await assertTrackedPageErrors(page);
  });
});
