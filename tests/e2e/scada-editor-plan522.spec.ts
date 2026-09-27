import { test, expect, type Page } from './fixtures.js';

// plan 522 / L5.3 + L5.4 + L5.5 demo 页定向 e2e（程序化断言，无截图）：
// - L5.3 绑定面板：inspector binding 结构化编辑面（点引用选择器）→ working copy → save 序列化可见；
// - L5.4 模板库/站点画面：toolbox 弹层（保存选区为模板 → 插入；建站建画面 → 切换往返 = 多 serialization 文档切换）；
// - L5.5 预览态数据注入：previewMock 自动注入（绑定点位文本随模拟源变化）+ previewInject 句柄通道 +
//   edit 态注入门控 + 切回 edit 场景还原（R5 不泄漏 #5）。

async function gotoEditorDemo(page: Page): Promise<string> {
  await page.goto('/#/scada-editor-demo', { waitUntil: 'load' });
  const canvas = page.locator('[data-slot="scada-editor-canvas"]');
  await expect(canvas).toBeVisible({ timeout: 60_000 });
  await expect(canvas).toHaveAttribute('data-status', 'ready', { timeout: 60_000 });
  // remount-safe：轮询等待「当前 data-cid 对应的测试句柄」真实挂载
  //（ready 派发与句柄挂载/React 提交之间存在竞态窗口，单次 getAttribute 可能读到未挂载句柄的 cid）。
  for (let attempt = 0; attempt < 40; attempt++) {
    const cid = await canvas.getAttribute('data-cid');
    if (cid) {
      const mounted = await page.evaluate(
        ({ key }) => Boolean((window as unknown as Record<string, unknown>)[key]),
        { key: `__flux_scada_editor_${cid}` },
      );
      if (mounted) return cid;
    }
    await page.waitForTimeout(250);
  }
  const keys = await page.evaluate(() =>
    Object.keys(window as unknown as Record<string, unknown>).filter((k) => k.startsWith('__flux_scada_editor')),
  );
  throw new Error(`editor test handle not mounted; data-cid=${await canvas.getAttribute('data-cid')}; window keys=${keys.join(',')}`);
}

function handleKey(cid: string): string {
  return `__flux_scada_editor_${cid}`;
}

test.describe('scada-editor plan 522 (L5.3 binding panel)', () => {
  test('structured binding editor: point-ref row writes bindings into the working copy and save output', async ({ page }) => {
    const cid = await gotoEditorDemo(page);

    // 选中 demo-pump → inspector 渲染 binding 结构化编辑面（此前为裸 json-editor textarea）。
    await page.evaluate((k) => {
      const handle = (window as unknown as Record<string, unknown>)[k] as {
        setSelection(ids: string[]): void;
      };
      handle.setSelection(['demo-pump']);
    }, handleKey(cid));

    const bindingEditor = page.locator('[data-slot="scada-editor-binding-editor"]');
    await expect(bindingEditor).toBeVisible({ timeout: 15_000 });

    // 结构化行编辑：property=fill / 来源=点 / 点引用=tank_level（变量表声明点，datalist 候选）。
    await page.click('[data-testid="binding-editor-add-row"]');
    await page.selectOption('[data-testid="binding-row-0-property"]', 'fill');
    await page.selectOption('[data-testid="binding-row-0-mode"]', 'point');
    await page.fill('[data-testid="binding-row-0-point"]', 'tank_level');

    // Save → serializedConfig 内可见 bindings 声明（面板只写声明结构，运行时装配零改动）。
    await page.click('[data-testid="editor-btn-save"]');
    await expect(page.locator('[data-testid="editor-output-save"]')).toContainText('tank_level', {
      timeout: 15_000,
    });
    await expect(page.locator('[data-testid="editor-output-save"]')).toContainText('"point"', {
      timeout: 15_000,
    });
  });
});

test.describe('scada-editor plan 522 (L5.4 template + station)', () => {
  test('template dialog: save selection as template → list → instantiate inserts new ids', async ({ page }) => {
    const cid = await gotoEditorDemo(page);
    const key = handleKey(cid);

    const before = await page.evaluate((k) => {
      const handle = (window as unknown as Record<string, unknown>)[k] as {
        session: { workingConfig: { symbols: unknown[] } };
        setSelection(ids: string[]): void;
      };
      handle.setSelection(['demo-pump']);
      return handle.session.workingConfig.symbols.length;
    }, key);

    await page.click('[data-testid="toolbox-btn-template"]');
    const dialog = page.locator('[data-slot="scada-editor-toolbox-template"]');
    await expect(dialog).toBeVisible();
    await expect(page.locator('[data-testid="toolbox-template-empty"]')).toBeVisible();

    await page.fill('[data-testid="toolbox-template-name"]', 'pump unit');
    await page.click('[data-testid="toolbox-template-save"]');
    await expect(page.locator('[data-testid="toolbox-template-row"]')).toHaveCount(1, { timeout: 15_000 });
    await expect(page.locator('[data-testid="toolbox-template-row"]')).toContainText('pump unit');

    await page.click('[data-testid="toolbox-template-insert"]');
    await expect(page.locator('[data-testid="toolbox-template-status"]')).toContainText('1');

    const after = await page.evaluate((k) => {
      const handle = (window as unknown as Record<string, unknown>)[k] as {
        session: { workingConfig: { symbols: Array<{ id: string }> } };
      };
      return handle.session.workingConfig.symbols;
    }, key);
    expect(after.length).toBe(before + 1);
  });

  test('station dialog: create station/screens; switching round-trips serialization documents', async ({ page }) => {
    const cid = await gotoEditorDemo(page);
    const key = handleKey(cid);

    await page.click('[data-testid="toolbox-btn-station"]');
    const dialog = page.locator('[data-slot="scada-editor-toolbox-station"]');
    await expect(dialog).toBeVisible();

    // 新建站点 → 新建画面 A（成为当前画面）→ 再建画面 B。
    await page.fill('[data-testid="toolbox-station-name"]', 'demo-station');
    await page.click('[data-testid="toolbox-station-create"]');
    await expect(page.locator('[data-testid="toolbox-station-add-screen"]')).toBeVisible({ timeout: 15_000 });
    await page.fill('[data-testid="toolbox-station-screen-name"]', 'screen-A');
    await page.click('[data-testid="toolbox-station-add-screen"]');
    await expect(page.locator('[data-testid="toolbox-station-row"]')).toHaveCount(1, { timeout: 15_000 });
    await page.fill('[data-testid="toolbox-station-screen-name"]', 'screen-B');
    await page.click('[data-testid="toolbox-station-add-screen"]');
    await expect(page.locator('[data-testid="toolbox-station-row"]')).toHaveCount(2, { timeout: 15_000 });
    // 新建画面成为当前画面（B），画布内容暂不切换（A/B 文档均为空）。
    expect(await page.locator('[data-testid="toolbox-station-row"]').nth(1).getAttribute('data-current')).toBe('true');

    // 关闭弹层，向画布加一个图元（经测试句柄 addSymbol）。
    await page.click('[data-testid="toolbox-station-close"]');
    await page.evaluate((k) => {
      const handle = (window as unknown as Record<string, unknown>)[k] as {
        addSymbol(node: { id: string; type: string; x: number; y: number; width: number; height: number }): void;
      };
      handle.addSymbol({ id: 'plan522-marker', type: 'scada-rect', x: 10, y: 10, width: 40, height: 40 });
    }, key);

    // 重新打开弹层。注：重开时当前画面缺省回落 screens[0]（design-template-station.md §4.2——
    // 当前画面 id 属弹层本地 state），故点击「非当前行」的切换按钮（当前行 disabled）。
    await page.click('[data-testid="toolbox-btn-station"]');
    await expect(page.locator('[data-testid="toolbox-station-row"]')).toHaveCount(2);
    // 经 DOM click（模态遮罩 backdrop-filter 动画下 Playwright 稳定性检查持续报 unstable，DOM click 确定性等价）。
    const switchNonCurrent = () =>
      page.evaluate(() => {
        const rows = document.querySelectorAll<HTMLElement>('[data-testid="toolbox-station-row"]');
        for (const row of rows) {
          if (row.getAttribute('data-current') !== 'true') {
            const btn = row.querySelector<HTMLButtonElement>('[data-testid="toolbox-station-switch"]');
            if (btn && !btn.disabled) {
              btn.click();
              return;
            }
          }
        }
        throw new Error('no enabled non-current screen switch button');
      });
    await switchNonCurrent();
    await expect(page.locator('[data-testid="toolbox-station-status"]')).toContainText('已切换', { timeout: 15_000 });

    const idsAfterSwitchToA = await page.evaluate((k) => {
      const handle = (window as unknown as Record<string, unknown>)[k] as {
        session: { workingConfig: { symbols: Array<{ id: string }> } };
      };
      return handle.session.workingConfig.symbols.map((s) => s.id);
    }, key);
    expect(idsAfterSwitchToA).not.toContain('plan522-marker');

    // 切换回另一画面：当前画面（已为空场景）先自动保存 → 装入含 marker 文档 → 图元往返恢复（多文档切换语义）。
    await switchNonCurrent();
    await expect(page.locator('[data-testid="toolbox-station-status"]')).toContainText('已切换', { timeout: 15_000 });

    const idsAfterSwitchToB = await page.evaluate((k) => {
      const handle = (window as unknown as Record<string, unknown>)[k] as {
        session: { workingConfig: { symbols: Array<{ id: string }> } };
      };
      return handle.session.workingConfig.symbols.map((s) => s.id);
    }, key);
    expect(idsAfterSwitchToB).toContain('plan522-marker');
  });
});

test.describe('scada-editor plan 522 (L5.5 preview data injection)', () => {
  test('previewMock auto-injects in preview; edit restores scene and gates injection (R5 #5)', async ({ page }) => {
    const cid = await gotoEditorDemo(page);
    const key = handleKey(cid);

    const textBefore = await page.evaluate((k) => {
      const handle = (window as unknown as Record<string, unknown>)[k] as {
        engine: { getSymbolProps(id: string): { text?: unknown } | undefined };
      };
      return String(handle.engine.getSymbolProps('demo-live-text')?.text ?? '');
    }, key);
    expect(textBefore).toBe('LIVE');

    // previewMock（intervalMs=800）：进入 preview 自动随机游走注入 → 绑定文本随 tank_level 变化。
    await page.click('[data-testid="editor-mode-preview"]');
    await expect(page.locator('[data-slot="scada-editor-canvas"]')).toHaveAttribute('data-mode', 'preview', {
      timeout: 15_000,
    });
    await expect
      .poll(
        async () =>
          page.evaluate((k) => {
            const handle = (window as unknown as Record<string, unknown>)[k] as {
              engine: { getSymbolProps(id: string): { text?: unknown } | undefined };
            };
            return String(handle.engine.getSymbolProps('demo-live-text')?.text ?? '');
          }, key),
        { timeout: 15_000, intervals: [500, 1_000, 1_000] },
      )
      .not.toBe('LIVE');

    // 句柄通道：previewInject 返回应用属性数 > 0；previewClear 还原。
    // （tank_level 模拟源是 42..78 正弦——42 为波形下极值，注入前若文本恰为 '42' 会命中
    // 注入通道的等值短路返回 0；为消除断言与波形的竞态，先 clear 再注入。）
    const applied = await page.evaluate((k) => {
      const handle = (window as unknown as Record<string, unknown>)[k] as {
        preview: {
          inject(values: Record<string, number | boolean>): number;
          clear(): void;
          isMockRunning(): boolean;
        };
      };
      handle.preview.clear();
      return handle.preview.inject({ tank_level: 42 });
    }, key);
    expect(applied).toBeGreaterThan(0);
    expect(
      await page.evaluate((k) => {
        const handle = (window as unknown as Record<string, unknown>)[k] as {
          preview: { isMockRunning(): boolean };
        };
        return handle.preview.isMockRunning();
      }, key),
    ).toBe(true);

    // 切回 edit：模拟源停止 + touched 场景还原（文本回 working copy 静态值）。
    await page.click('[data-testid="editor-mode-edit"]');
    await expect(page.locator('[data-slot="scada-editor-canvas"]')).toHaveAttribute('data-mode', 'edit', {
      timeout: 15_000,
    });
    await expect
      .poll(
        async () =>
          page.evaluate((k) => {
            const handle = (window as unknown as Record<string, unknown>)[k] as {
              engine: { getSymbolProps(id: string): { text?: unknown } | undefined };
            };
            return String(handle.engine.getSymbolProps('demo-live-text')?.text ?? '');
          }, key),
        { timeout: 15_000 },
      )
      .toBe('LIVE');

    // edit 态注入门控：inject no-op 返回 0（R5 注入只发生在 preview 态）。
    const gated = await page.evaluate((k) => {
      const handle = (window as unknown as Record<string, unknown>)[k] as {
        preview: { inject(values: Record<string, number | boolean>): number };
      };
      return handle.preview.inject({ tank_level: 7 });
    }, key);
    expect(gated).toBe(0);
  });

  test('component:previewInject schema action injects static values in preview', async ({ page }) => {
    await gotoEditorDemo(page);

    await page.click('[data-testid="editor-mode-preview"]');
    await expect(page.locator('[data-slot="scada-editor-canvas"]')).toHaveAttribute('data-mode', 'preview', {
      timeout: 15_000,
    });
    // 模拟源先跑起来（>1 tick），再注入静态 42 → 文本变为 '42'。
    await page.waitForTimeout(1_200);
    await page.click('[data-testid="editor-btn-inject"]');
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const handles = Object.entries(window as unknown as Record<string, unknown>).filter(([k]) =>
              k.startsWith('__flux_scada_editor_'),
            );
            for (const [, value] of handles) {
              const handle = value as { engine: { getSymbolProps(id: string): { text?: unknown } | undefined } };
              const text = handle.engine.getSymbolProps('demo-live-text')?.text;
              if (text !== undefined) return String(text);
            }
            return '';
          }),
        { timeout: 10_000 },
      )
      .toBe('42');
  });
});
