import { expect, test } from '@playwright/test';

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
  await expect(page.locator('.react-flow__node')).toHaveCount(6, { timeout: 15000 });
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
}

function parseTransform(transform: string) {
  const match = transform.match(
    /translate\(\s*([-\d.]+)\s*(?:px)?\s*,\s*([-\d.]+)\s*(?:px)?\s*\)\s*scale\(\s*([-\d.]+)\s*\)/
  );
  if (!match) return null;
  return { x: parseFloat(match[1]), y: parseFloat(match[2]), zoom: parseFloat(match[3]) };
}

test('dragging on minimap moves canvas viewport significantly', async ({ page }) => {
  await openFlowDesigner(page);

  const minimap = page.locator('.react-flow__minimap');
  await expect(minimap).toBeVisible();

  const viewportEl = page.locator('.react-flow__viewport').first();
  const getViewport = () =>
    viewportEl.evaluate((el) => (el as HTMLElement).style.transform || '');

  const initialTransform = await getViewport();
  const initial = parseTransform(initialTransform);
  expect(initial).not.toBeNull();

  const box = (await minimap.boundingBox())!;
  expect(box).not.toBeNull();

  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(300);

  const dragTransform = await getViewport();
  const after = parseTransform(dragTransform);
  expect(after).not.toBeNull();

  const dx = Math.abs(after!.x - initial!.x);
  const dy = Math.abs(after!.y - initial!.y);
  expect(dx).toBeGreaterThan(1);
  expect(dy).toBeGreaterThan(1);
});

test('clicking on minimap moves canvas viewport to that position', async ({ page }) => {
  await openFlowDesigner(page);

  const minimap = page.locator('.react-flow__minimap');
  await expect(minimap).toBeVisible();

  const viewportEl = page.locator('.react-flow__viewport').first();
  const getViewport = () =>
    viewportEl.evaluate((el) => (el as HTMLElement).style.transform || '');

  const initialTransform = await getViewport();
  const initial = parseTransform(initialTransform);
  expect(initial).not.toBeNull();

  const box = (await minimap.boundingBox())!;
  expect(box).not.toBeNull();

  await page.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.8);
  await page.waitForTimeout(300);

  const clickTransform = await getViewport();
  const after = parseTransform(clickTransform);
  expect(after).not.toBeNull();

  const dx = Math.abs(after!.x - initial!.x);
  const dy = Math.abs(after!.y - initial!.y);
  expect(
    dx > 1 || dy > 1,
    `Expected viewport to move after minimap click, but dx=${dx.toFixed(2)} dy=${dy.toFixed(2)}`
  ).toBeTruthy();
});

test('scrolling on minimap changes canvas zoom', async ({ page }) => {
  await openFlowDesigner(page);

  const minimap = page.locator('.react-flow__minimap');
  await expect(minimap).toBeVisible();

  const viewportEl = page.locator('.react-flow__viewport').first();
  const getViewport = () =>
    viewportEl.evaluate((el) => (el as HTMLElement).style.transform || '');

  const initialTransform = await getViewport();
  const initial = parseTransform(initialTransform);
  expect(initial).not.toBeNull();

  const box = (await minimap.boundingBox())!;
  expect(box).not.toBeNull();

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(300);

  const zoomTransform = await getViewport();
  const after = parseTransform(zoomTransform);
  expect(after).not.toBeNull();

  expect(after!.zoom).toBeGreaterThan(initial!.zoom);
});
