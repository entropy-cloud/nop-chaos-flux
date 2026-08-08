import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// Host-page spec for the real report-designer-page renderer: toolbar action dispatch
// (undo/redo/save/preview), canvas sync, field panel keyboard insert, inspector shell,
// dirty lifecycle, and empty-template fallback. Shares one cold-started host, serial.
test.describe.configure({ mode: 'serial' });
test.setTimeout(60_000);

async function openHostDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/report-designer-host', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Report Designer Host Playground', level: 1 }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.locator('[data-slot="report-designer-host"]')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('[data-slot="report-designer-toolbar"]')).toBeVisible({
    timeout: 15000,
  });
  await assertTrackedPageErrors(page);
}

test('renders the report-designer host page surfaces', async ({ page }) => {
  await openHostDemo(page);

  await expect(page.locator('[data-slot="report-designer-header"]')).toBeVisible();
  await expect(page.locator('[data-slot="report-designer-status"]')).toContainText('字段');
  await expect(page.locator('[data-slot="workbench-left-panel"]')).toBeVisible();
  await expect(page.locator('[data-slot="report-field-panel-shell"]')).toBeVisible();
  await expect(page.locator('[data-slot="report-field-panel-item"]')).toHaveCount(4);
  await expect(page.locator('[data-slot="workbench-canvas"]')).toBeVisible();
  await expect(page.locator('[data-slot="report-designer-spreadsheet-canvas"]')).toBeVisible();
  await expect(page.locator('[data-slot="spreadsheet-grid"]')).toBeVisible();
  await expect(page.locator('[data-slot="workbench-right-panel"]')).toBeVisible();
  await expect(page.locator('[data-slot="report-designer-inspector-shell"]')).toBeVisible();

  const undoButton = page.getByTestId('report-toolbar-undo');
  const redoButton = page.getByTestId('report-toolbar-redo');
  await expect(undoButton).toBeVisible();
  await expect(undoButton).toBeDisabled();
  await expect(redoButton).toBeDisabled();
  await expect(page.getByTestId('report-toolbar-preview')).toBeVisible();
  await expect(page.getByTestId('report-toolbar-save')).toBeVisible();
});

test('undo/redo round-trip propagates to the spreadsheet canvas (P1-111 e2e confirmation)', async ({
  page,
}) => {
  await openHostDemo(page);

  const cellA1 = page.locator('td.ss-cell[data-row="0"][data-col="0"]');
  await expect(cellA1).toBeVisible();
  await expect(cellA1).toContainText('Alpha');

  await cellA1.dblclick();
  const editor = page.locator('[data-slot="spreadsheet-cell-editor-input"]');
  await expect(editor).toBeVisible();
  await editor.fill('v1');
  await editor.press('Enter');

  await expect(cellA1).toContainText('v1');
  await expect(page.locator('[data-testid="host-dirty-probe"]')).toHaveAttribute(
    'data-dirty',
    'true',
  );

  const undoButton = page.getByTestId('report-toolbar-undo');
  await expect(undoButton).toBeEnabled();
  await undoButton.click();

  await expect(cellA1).toContainText('Alpha', { timeout: 10000 });

  const redoButton = page.getByTestId('report-toolbar-redo');
  await expect(redoButton).toBeEnabled();
  await redoButton.click();

  await expect(cellA1).toContainText('v1', { timeout: 10000 });
});

test('save clears the aggregated dirty state', async ({ page }) => {
  await openHostDemo(page);

  const cellA1 = page.locator('td.ss-cell[data-row="0"][data-col="0"]');
  const dirtyProbe = page.locator('[data-testid="host-dirty-probe"]');
  await expect(dirtyProbe).toHaveAttribute('data-dirty', 'false');

  await cellA1.dblclick();
  const editor = page.locator('[data-slot="spreadsheet-cell-editor-input"]');
  await expect(editor).toBeVisible();
  await editor.fill('v2');
  await editor.press('Enter');

  await expect(dirtyProbe).toHaveAttribute('data-dirty', 'true');

  await page.getByTestId('report-toolbar-save').click();

  await expect(dirtyProbe).toHaveAttribute('data-dirty', 'false', { timeout: 10000 });
});

test('preview runs the host preview adapter and exposes the stop control while running', async ({
  page,
}) => {
  await openHostDemo(page);

  await page.evaluate(() => {
    const host = window as unknown as {
      __REPORT_DESIGNER_HOST__?: { getPreviewCalls: () => unknown[] };
    };
    if (host.__REPORT_DESIGNER_HOST__) {
      host.__REPORT_DESIGNER_HOST__.getPreviewCalls().length = 0;
    }
  });

  await page.getByTestId('report-toolbar-preview').click();

  await expect(page.getByTestId('report-toolbar-stopPreview')).toBeVisible({ timeout: 5000 });

  const previewCalls = await page.evaluate(() => {
    const host = window as unknown as {
      __REPORT_DESIGNER_HOST__?: { getPreviewCalls: () => unknown[] };
    };
    return host.__REPORT_DESIGNER_HOST__?.getPreviewCalls() ?? [];
  });
  expect(previewCalls.length).toBeGreaterThanOrEqual(1);
  expect(previewCalls[0]).toMatchObject({ mode: 'inline' });

  await expect(page.getByTestId('report-toolbar-stopPreview')).toBeHidden({ timeout: 5000 });
});

test('empty template fallback renders without crashing', async ({ page }) => {
  await openHostDemo(page);

  await page.getByTestId('toggle-invalid-document').click();

  await expect(
    page.locator('[data-slot="report-designer-header"] h2'),
  ).toContainText('未命名报表', { timeout: 10000 });
  await expect(page.locator('[data-slot="report-designer-spreadsheet-canvas"]')).toBeVisible();
  await assertTrackedPageErrors(page);
});
