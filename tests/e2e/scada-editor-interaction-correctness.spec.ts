import { test, expect, type Page } from './fixtures.js';

// plan 2026-08-08-0900-1 Phase 4 / P2 #1 + #40：交互正确性浏览器复核（程序化断言、禁截图）。
// 三项均标注「需浏览器验证」：先 Proof 复现/证伪，确认才 Fix，不可复现则 adjudicate 为 residual。

async function getEditorCid(page: Page): Promise<string> {
  const canvas = page.locator('[data-slot="scada-editor-canvas"]');
  await expect(canvas).toBeVisible({ timeout: 60_000 });
  await expect(canvas).toHaveAttribute('data-status', 'ready', { timeout: 60_000 });
  const cid = await canvas.getAttribute('data-cid');
  expect(cid).toBeTruthy();
  return cid!;
}

async function gotoEditorDemo(page: Page): Promise<string> {
  await page.goto('/#/scada-editor-demo', { waitUntil: 'load' });
  return getEditorCid(page);
}

async function loadConfig(page: Page, cid: string, config: unknown): Promise<void> {
  await page.evaluate(
    ({ key, config }) => {
      const handle = (window as unknown as Record<string, unknown>)[key] as { load(c: unknown): void };
      handle.load(config);
    },
    { key: `__flux_scada_editor_${cid}`, config },
  );
  await page.waitForTimeout(300);
}

test.describe('scada-editor interaction correctness (plan 2026-08-08-0900-1 Phase 4)', () => {
  test('#40 leafer canvas does not overlap sibling palette/inspector panels', async ({ page }) => {
    await page.goto('/#/scada-editor-demo', { waitUntil: 'load' });
    await expect(page.locator('[data-slot="scada-editor-canvas"]')).toHaveAttribute('data-status', 'ready', { timeout: 60_000 });

    const palette = page.locator('[data-slot="scada-editor-palette"]');
    const inspector = page.locator('[data-slot="scada-editor-inspector"]');

    const paletteBox = await palette.boundingBox();
    const inspectorBox = await inspector.boundingBox();

    expect(paletteBox).toBeTruthy();
    expect(inspectorBox).toBeTruthy();

    // 程序化断言：canvas 区（data-slot="scada-editor-canvas"，含 overflow:hidden containment）
    // 不应与兄弟 palette/inspector panel 水平重叠。leafer <canvas>（整数 px inline width）
    // 由容器 overflow:hidden 视觉裁剪；此处断言布局面的 canvas 区不重叠兄弟 panel。
    const hOverlap = (a: { x: number; width: number }, b: { x: number; width: number }) =>
      a.x < b.x + b.width && a.x + a.width > b.x;

    const canvasArea = page.locator('[data-slot="scada-editor-canvas"]');
    const canvasAreaBox = await canvasArea.boundingBox();
    expect(canvasAreaBox).toBeTruthy();

    expect(
      hOverlap(canvasAreaBox!, paletteBox!),
      'canvas-area should not horizontally overlap the palette panel',
    ).toBe(false);
    expect(
      hOverlap(canvasAreaBox!, inspectorBox!),
      'canvas-area should not horizontally overlap the inspector panel',
    ).toBe(false);
  });

  test('#1 connection pointer-down drag does not pan the viewport (no gesture conflict)', async ({ page }) => {
    const cid = await gotoEditorDemo(page);
    // 装入 pipe-junction + 目标设备场景，让连线拖拽路径可触发。
    await loadConfig(page, cid, {
      version: 1,
      variables: [],
      symbols: [
        { id: 'j1', type: 'scada-pipe-junction', x: 200, y: 200, width: 80, height: 40, custom: { connections: [] } },
        { id: 'dev', type: 'scada-rect', x: 500, y: 200, width: 100, height: 100 },
      ],
    });

    const vpBefore = await page.evaluate((key) => {
      const handle = (window as unknown as Record<string, unknown>)[key] as {
        engine: { getViewport: () => { x: number; y: number; scale: number } };
      };
      return handle.engine.getViewport();
    }, `__flux_scada_editor_${cid}`);

    // 在 junction 上 pointerdown + 拖拽到空白区 + up（模拟连线端点拖动到无吸附候选）。
    const canvas = page.locator('[data-slot="scada-editor-canvas-canvas"]');
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    // junction 中心世界坐标 (240, 220) → 视口坐标（默认 viewport {0,0,1}）。
    const startX = box!.x + 240;
    const startY = box!.y + 220;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // 拖到远处的空白区（无图元吸附）。
    await page.mouse.move(box!.x + 50, box!.y + 50, { steps: 5 });
    await page.mouse.up();

    const vpAfter = await page.evaluate((key) => {
      const handle = (window as unknown as Record<string, unknown>)[key] as {
        engine: { getViewport: () => { x: number; y: number; scale: number } };
      };
      return handle.engine.getViewport();
    }, `__flux_scada_editor_${cid}`);

    // 断言：连线端点拖动期间 viewport 不被平移（无手势冲突）。
    expect(vpAfter).toEqual(vpBefore);
  });
});

// plan 521 / W7：demo 页 M2/M3 功能叙事级覆盖——初始 config 直含 junction + 设备图元（W1），
// 经 editor-test-handle（connection.connect / undoRedo / toolbox）断言连线提交、undo 往返、
// toolbox 三弹层（连接管理/撤销历史/图层树）可达 + statusBar + 受控模式切换。
test.describe('scada-editor demo M2/M3 narrative (plan 521 W7)', () => {
  test('demo initial scene has junction + device; programmatic connect writes custom.connections (W1)', async ({ page }) => {
    const cid = await gotoEditorDemo(page);
    const key = `__flux_scada_editor_${cid}`;

    const scene = await page.evaluate((k) => {
      const handle = (window as unknown as Record<string, unknown>)[k] as {
        session: { workingConfig: { symbols: Array<{ id: string; type: string }> } };
      };
      return handle.session.workingConfig.symbols.map((s) => ({ id: s.id, type: s.type }));
    }, key);
    expect(scene.some((s) => s.id === 'demo-junction' && s.type === 'scada-pipe-junction')).toBe(true);
    expect(scene.some((s) => s.id === 'demo-pump')).toBe(true);

    // 程序化连线（test handle connection.connect）→ junction custom.connections 写入。
    await page.evaluate((k) => {
      const handle = (window as unknown as Record<string, unknown>)[k] as {
        connection: {
          connect(args: {
            junctionId: string;
            connectionId: string;
            targetNodeId: string;
            targetAnchor: { x: number; y: number };
          }): void;
        };
      };
      handle.connection.connect({
        junctionId: 'demo-junction',
        connectionId: 'demo-junction-conn-0',
        targetNodeId: 'demo-pump',
        targetAnchor: { x: 0.5, y: 0.5 },
      });
    }, key);

    const connections = await page.evaluate((k) => {
      const handle = (window as unknown as Record<string, unknown>)[k] as {
        connection: {
          listConnections(): Array<{
            junctionId: string;
            connection: { id: string; target?: string };
            dangling: boolean;
          }>;
        };
      };
      return handle.connection.listConnections();
    }, key);
    expect(connections).toHaveLength(1);
    expect(connections[0].junctionId).toBe('demo-junction');
    expect(connections[0].connection.target).toBe('demo-pump');
    expect(connections[0].dangling).toBe(false);
  });

  test('connection write enters undo stack; undo/redo round-trip restores connections (W7)', async ({ page }) => {
    const cid = await gotoEditorDemo(page);
    const key = `__flux_scada_editor_${cid}`;

    const connect = () =>
      page.evaluate((k) => {
        const handle = (window as unknown as Record<string, unknown>)[k] as {
          connection: {
            connect(args: {
              junctionId: string;
              connectionId: string;
              targetNodeId: string;
              targetAnchor: { x: number; y: number };
            }): void;
          };
        };
        handle.connection.connect({
          junctionId: 'demo-junction',
          connectionId: 'demo-junction-conn-0',
          targetNodeId: 'demo-pump',
          targetAnchor: { x: 0.5, y: 0.5 },
        });
      }, key);

    await connect();
    const stackAfterConnect = await page.evaluate((k) => {
      const handle = (window as unknown as Record<string, unknown>)[k] as {
        undoRedo: {
          getStackState(): { canUndo: boolean; undoStackDepth: number; topOperationKind?: string };
        };
      };
      return handle.undoRedo.getStackState();
    }, key);
    expect(stackAfterConnect.canUndo).toBe(true);
    expect(stackAfterConnect.undoStackDepth).toBe(1);
    expect(stackAfterConnect.topOperationKind).toBe('connection-update');

    // undo → connections 清空。
    await page.evaluate((k) => {
      const handle = (window as unknown as Record<string, unknown>)[k] as { undoRedo: { undo(): void } };
      handle.undoRedo.undo();
    }, key);
    const afterUndo = await page.evaluate((k) => {
      const handle = (window as unknown as Record<string, unknown>)[k] as {
        connection: { listConnections(): Array<unknown> };
      };
      return handle.connection.listConnections();
    }, key);
    expect(afterUndo).toHaveLength(0);

    // redo → 连线恢复。
    await page.evaluate((k) => {
      const handle = (window as unknown as Record<string, unknown>)[k] as { undoRedo: { redo(): void } };
      handle.undoRedo.redo();
    }, key);
    const afterRedo = await page.evaluate((k) => {
      const handle = (window as unknown as Record<string, unknown>)[k] as {
        connection: { listConnections(): Array<{ connection: { id: string; target?: string } }> };
      };
      return handle.connection.listConnections();
    }, key);
    expect(afterRedo).toHaveLength(1);
    expect(afterRedo[0].connection.id).toBe('demo-junction-conn-0');
    expect(afterRedo[0].connection.target).toBe('demo-pump');
  });

  test('toolbox dialogs reachable (connections/history/layers) + clipboard copy/paste round-trip', async ({ page }) => {
    await gotoEditorDemo(page);

    // U1 连接管理弹层。
    await page.click('[data-testid="toolbox-btn-connections"]');
    await expect(page.locator('[data-slot="scada-editor-toolbox-connections"]')).toBeVisible();
    await page.click('[data-testid="toolbox-connections-close"]');

    // U2 撤销历史面板（只读档）。
    await page.click('[data-testid="toolbox-btn-history"]');
    await expect(page.locator('[data-slot="scada-editor-toolbox-history"]')).toBeVisible();
    await page.click('[data-testid="toolbox-history-close"]');

    // U3 图层树弹层。
    await page.click('[data-testid="toolbox-btn-layers"]');
    await expect(page.locator('[data-slot="scada-editor-toolbox-layers"]')).toBeVisible();
    await page.click('[data-testid="toolbox-layers-close"]');

    // 内部剪贴板 copy → paste 往返（test handle toolbox 子句柄）。
    const cid = await getEditorCid(page);
    const copied = await page.evaluate((k) => {
      const handle = (window as unknown as Record<string, unknown>)[k] as {
        setSelection(ids: string[]): void;
        toolbox: { copy(): number; paste(): string[] };
      };
      handle.setSelection(['demo-ellipse']);
      return handle.toolbox.copy();
    }, `__flux_scada_editor_${cid}`);
    expect(copied).toBe(1);
    const pasted = await page.evaluate((k) => {
      const handle = (window as unknown as Record<string, unknown>)[k] as {
        toolbox: { paste(): string[] };
      };
      return handle.toolbox.paste();
    }, `__flux_scada_editor_${cid}`);
    expect(pasted).toHaveLength(1);
    expect(pasted[0]).not.toBe('demo-ellipse');
  });

  test('statusBar summarizes mode/viewport/selection; controlled Edit/Preview switch works (W4 + U4)', async ({ page }) => {
    await gotoEditorDemo(page);

    // U4 statusBar fallback 有真实内容（此前空 div）。
    const statusBar = page.locator('[data-slot="scada-editor-status-bar"]');
    await expect(statusBar).toBeVisible();
    await expect(statusBar.locator('[data-testid="editor-status-mode"]')).toContainText('edit');

    // W4 受控模式切换：Edit/Preview 按钮组 → mode prop 推回 → data-mode + statusBar 同步。
    await page.click('[data-testid="editor-mode-preview"]');
    await expect(page.locator('[data-slot="scada-editor-canvas"]')).toHaveAttribute('data-mode', 'preview', {
      timeout: 15_000,
    });
    await expect(statusBar.locator('[data-testid="editor-status-mode"]')).toContainText('preview');
    await page.click('[data-testid="editor-mode-edit"]');
    await expect(page.locator('[data-slot="scada-editor-canvas"]')).toHaveAttribute('data-mode', 'edit', {
      timeout: 15_000,
    });
  });

  test('Save dispatches onSave; export button surfaces JSON into collapsible output (W2 + W3)', async ({ page }) => {
    await gotoEditorDemo(page);

    // W3：导出配置到页面 → collapse 输出区可见 JSON。
    await page.click('[data-testid="editor-btn-export"]');
    const exportOutput = page.locator('[data-testid="editor-output-export"]');
    await expect(exportOutput).toContainText('demo-junction', { timeout: 15_000 });

    // W2：Save → onSave → 输出区展示 serializedConfig 摘要。
    await page.click('[data-testid="editor-btn-save"]');
    const saveOutput = page.locator('[data-testid="editor-output-save"]');
    await expect(saveOutput).toContainText('demo-pump', { timeout: 15_000 });
  });
});
