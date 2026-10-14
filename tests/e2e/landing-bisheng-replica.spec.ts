import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// Smoke validation for the two page-form-factor replicas added after the
// 41-archetype audit:
//   - content-landing: marketing landing + embedded docs shell + portal tiles
//   - bisheng-build:   bisheng (毕昇) workflow-builder chrome on designer-page
// Assertions are programmatic (counts / structure / text), never screenshots.

async function gotoPage(page: import('@playwright/test').Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
}

test.describe('landing / docs / portal form factor', () => {
  test('marketing landing renders hero, features grid, docs shell, portal tiles and footer', async ({ page }) => {
    await gotoPage(page, '/#/complex-pages/content-landing');

    await expect(page.getByTestId('content-landing-page')).toBeVisible({ timeout: 20_000 });

    // nav + hero (marketing form)
    await expect(page.getByTestId('lp-brand')).toBeVisible();
    const heroTitle = await page.getByTestId('lp-hero-title').innerText();
    expect(heroTitle.replace(/\s+/g, ''), 'hero headline renders as one phrase').toContain('一份JSON');
    await expect(page.getByTestId('lp-hero-cta')).toBeVisible();
    await expect(page.getByTestId('lp-browser-mockup')).toBeVisible();

    // mini dashboard inside the browser mockup proves nested page composition
    const miniRows = await page.evaluate(
      () => document.querySelectorAll('[data-testid="lp-mini-table"] .lp-mini-row').length,
    );
    expect(miniRows, 'mockup table rows render').toBe(5);

    // features grid: 6 loop-rendered cards
    const featureCards = await page.evaluate(
      () => document.querySelectorAll('[data-testid="lp-feature-card"]').length,
    );
    expect(featureCards, 'six feature cards rendered by the loop').toBe(6);

    // docs-site form: markdown body renders GFM code + table-free content
    const docsText = await page.getByTestId('lp-docs-markdown').innerText();
    expect(docsText).toContain('五分钟安装');
    expect(docsText).toContain('registerBasicRenderers');

    // portal form: 8 tiles
    const tiles = await page.evaluate(
      () => document.querySelectorAll('[data-testid="lp-portal-tile"]').length,
    );
    expect(tiles, 'eight portal tiles rendered by the loop').toBe(8);

    // stats band + footer columns
    const stats = await page.evaluate(
      () => document.querySelectorAll('[data-testid="lp-stat"]').length,
    );
    expect(stats, 'four stats rendered by the loop').toBe(4);
    await expect(page.getByTestId('lp-footer')).toBeVisible();

    await assertTrackedPageErrors(page);
  });
});

test.describe('bisheng build-page replica', () => {
  test('builder chrome renders top bar, palette, designer canvas and inspector', async ({ page }) => {
    await gotoPage(page, '/#/complex-pages/bisheng-build');

    await expect(page.getByTestId('bisheng-build-page')).toBeVisible({ timeout: 20_000 });

    // top bar chrome (toolbar region override)
    await expect(page.getByTestId('bs-logo-name')).toHaveText('bisheng');
    await expect(page.getByTestId('bs-app-name')).toHaveText('客服工单助手');
    await expect(page.getByTestId('bs-btn-publish')).toBeVisible();

    // node palette: bisheng groups render (输入输出 / 模型 / 技能 / 逻辑)
    const paletteText = await page.evaluate(() => {
      const panel = document.querySelector('.bs-root');
      return panel?.textContent ?? '';
    });
    for (const group of ['输入输出', '模型', '技能', '逻辑']) {
      expect(paletteText, `palette group ${group} renders`).toContain(group);
    }

    // designer canvas: bisheng flow nodes render as React Flow nodes
    const nodes = await page.evaluate(() => ({
      flowNodes: document.querySelectorAll('.react-flow__node').length,
      edges: document.querySelectorAll('.react-flow__edge').length,
      llmLabel: [...document.querySelectorAll('.bs-node-card-title')].map((el) => el.textContent ?? ''),
    }));
    expect(nodes.flowNodes, 'six canvas nodes render').toBe(6);
    expect(nodes.edges, 'six edges render').toBe(6);
    expect(nodes.llmLabel.join('|')).toContain('azure_gpt_4');
    expect(nodes.llmLabel.join('|')).toContain('deepseek-chat');

    // inspector region override (bisheng node-params panel)
    await expect(page.getByTestId('bs-inspector-title')).toHaveText('azure_gpt_4');
    await expect(page.getByTestId('bs-run-node')).toBeVisible();
    await expect(page.getByTestId('bs-delete-node')).toBeVisible();

    // bottom debug panel: collapsed by default (resizable panel
    // defaultCollapsed) so the canvas gets the vertical budget; the
    // component:toggle button and the drag handle both expand/collapse it.
    // (Collapse clips via the panel's overflow-hidden strip, so height — not
    // input visibility — is the observable signal.)
    const debugHeight = () =>
      page.evaluate(() => {
        const el = document.querySelector('[data-testid="bs-debug"]');
        return el ? Math.round(el.getBoundingClientRect().height) : -1;
      });
    const collapsedHeight = await debugHeight();
    expect(collapsedHeight, 'debug panel starts collapsed').toBeGreaterThan(0);
    expect(collapsedHeight, 'debug panel starts collapsed').toBeLessThan(70);

    await page.getByTestId('bs-debug-toggle').click();
    await page.waitForTimeout(300);
    const expandedViaButton = await debugHeight();
    expect(expandedViaButton, 'component:toggle expands the debug panel').toBeGreaterThan(
      collapsedHeight,
    );
    await expect(page.getByTestId('bs-msg-user')).toContainText('订单还没发货');

    await page.getByTestId('bs-debug-toggle').click();
    await page.waitForTimeout(300);
    expect(await debugHeight(), 'component:toggle collapses the debug panel').toBeLessThan(
      expandedViaButton,
    );

    // vertical drag-resize: dragging the split handle up expands the debug
    // panel (canvas shrinks), dragging down past min collapses it to the
    // collapsedSize strip.
    const handle = page.locator('[data-slot="resizable-panel-handle"]').first();
    await expect(handle).toBeVisible();
    const box = await handle.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y - 120, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const expandedHeight = await debugHeight();
    expect(expandedHeight, 'dragging the handle up expands the debug panel').toBeGreaterThan(
      collapsedHeight + 40,
    );

    // canvas pan: left-drag on empty canvas pans the viewport (bisheng /
    // React Flow default — multiSelect disabled so left-drag is not box-select)
    const viewportTransform = () =>
      page.evaluate(() => document.querySelector('.react-flow__viewport')?.style.transform ?? '');
    const beforePan = await viewportTransform();
    const pane = page.locator('.react-flow__pane').first();
    const paneBox = await pane.boundingBox();
    expect(paneBox).toBeTruthy();
    if (paneBox) {
      await page.mouse.move(paneBox.x + paneBox.width * 0.5, paneBox.y + paneBox.height * 0.72);
      await page.mouse.down();
      await page.mouse.move(paneBox.x + paneBox.width * 0.5 + 120, paneBox.y + paneBox.height * 0.72 - 60, {
        steps: 12,
      });
      await page.mouse.up();
      await page.waitForTimeout(300);
    }
    const afterPan = await viewportTransform();
    expect(afterPan, 'left-drag on the canvas pans the viewport').not.toBe(beforePan);

    // publish button dispatches without page errors (simulated toast path)
    await page.getByTestId('bs-btn-publish').click();
    await page.waitForTimeout(400);
    const toast = await page.evaluate(
      () => [...document.querySelectorAll('[data-sonner-toast]')].map((el) => el.textContent ?? '').join(''),
    );
    expect(toast).toContain('发布流程');

    await assertTrackedPageErrors(page);
  });
});
