import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openDingtalkDesigner(page: import('@playwright/test').Page) {
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
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 30000 });

  const exampleTab = page.getByRole('tab', { name: '钉钉审批流' });
  if (await exampleTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await exampleTab.click();
  }

  await page.waitForTimeout(2000);
}

test('dingtalk cards render schema body data-slot/variant attributes (CSS hooks present)', async ({ page }) => {
  await openDingtalkDesigner(page);

  const root = page.locator('[data-slot="dt-node"]').first();
  await expect(root).toBeVisible({ timeout: 10000 });

  const variant = await root.getAttribute('data-node-variant');
  expect(variant).toBe('initiator');

  const variants = await page.locator('[data-slot="dt-node"]').evaluateAll((els) =>
    [...new Set(els.map((el) => el.getAttribute('data-node-variant')))].sort(),
  );
  // dt-end is a terminal node: it renders via the tree-mode terminal branch
  // (circle dot + label), not the schema body, so it has no dt-node body hook.
  expect(variants).toEqual(['approval', 'cc', 'condition', 'initiator', 'parallel', 'subprocess']);

  await assertTrackedPageErrors(page);
});

test('dingtalk card header colors match the CSS contract per variant', async ({ page }) => {
  await openDingtalkDesigner(page);
  await expect(page.locator('[data-slot="dt-node"]').first()).toBeVisible({ timeout: 10000 });

  const headers = await page.evaluate(() => {
    const toHex = (value: string | null): string | null => {
      if (!value) return null;
      const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return null;
      return `#${[m[1], m[2], m[3]].map((c) => Number(c).toString(16).padStart(2, '0')).join('')}`;
    };
    const result: Record<string, string | null> = {};
    for (const el of document.querySelectorAll('[data-slot="dt-node"]')) {
      const variant = el.getAttribute('data-node-variant');
      if (!variant || result[variant]) continue;
      const header = el.querySelector('[data-slot="dt-node-header"]');
      const title = el.querySelector('[data-slot="dt-node-title"]');
      if (header && title) {
        const headerBg = getComputedStyle(header).backgroundColor;
        const titleColor = getComputedStyle(title).color;
        result[`${variant}:header`] = toHex(headerBg);
        result[`${variant}:title`] = toHex(titleColor);
      }
    }
    return result;
  });

  const headerExpectations: Record<string, string> = {
    'initiator:header': '#576a95',
    'approval:header': '#ff943e',
    'cc:header': '#3296fa',
    'parallel:header': '#6366f1',
    'subprocess:header': '#8b5cf6',
  };
  for (const [key, expected] of Object.entries(headerExpectations)) {
    expect(headers[key], `${key} should be ${expected}`).toBe(expected);
  }

  // condition card: green title on white card (demo parity)
  expect(headers['condition:title']).toBe('#15bc83');

  // header text must be white on the colored bands (demo parity)
  for (const key of ['initiator:title', 'approval:title', 'cc:title', 'parallel:title', 'subprocess:title']) {
    expect(headers[key], `${key} should be white`).toBe('#ffffff');
  }

  await assertTrackedPageErrors(page);
});

test('dingtalk end node renders as terminal circle dot with label', async ({ page }) => {
  await openDingtalkDesigner(page);

  const endNode = page.locator('.react-flow__node').filter({ hasText: '结束' }).first();
  await expect(endNode).toBeVisible({ timeout: 10000 });

  const shape = await endNode.evaluate((el) => {
    const circle = el.querySelector('.rounded-full');
    if (!circle) return null;
    const style = window.getComputedStyle(circle as HTMLElement);
    return {
      width: parseFloat(style.width),
      height: parseFloat(style.height),
      borderRadius: style.borderRadius,
      background: style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent',
    };
  });
  expect(shape).not.toBeNull();
  expect(shape!.width).toBeGreaterThan(0);
  expect(shape!.height).toBeGreaterThan(0);
  // Tailwind v4 rounded-full computes to calc(infinity * 1px); accept any
  // effectively-round value (50% or a very large pixel radius).
  const radius = parseFloat(shape!.borderRadius);
  expect(shape!.borderRadius === '50%' || radius > 1000).toBe(true);
  expect(shape!.background).toBe(true);

  await assertTrackedPageErrors(page);
});

test('add-branch overlay center sits exactly on a split/merge line', async ({ page }) => {
  await openDingtalkDesigner(page);
  await expect(page.locator('[data-slot="dt-node"]').first()).toBeVisible({ timeout: 10000 });

  const geometry = await page.evaluate(() => {
    const surface = document.querySelector('.fd-xyflow-surface')?.getBoundingClientRect();
    const vp = document.querySelector('.react-flow__viewport');
    const tf = vp ? new DOMMatrixReadOnly(vp.style.transform) : null;
    const toFlow = (x: number, y: number) => {
      if (!tf || !surface) return { x, y };
      return { x: (x - surface.x - tf.e) / tf.a, y: (y - surface.y - tf.f) / tf.d };
    };

    const lineYs: number[] = [];
    for (const path of document.querySelectorAll('.react-flow__edge-path')) {
      const d = path.getAttribute('d') ?? '';
      const m = d.match(/M[-\d.]+ [-\d.]+L[-\d.]+ ([-\d.]+)L[-\d.]+ \1L[-\d.]+ [-\d.]+/);
      if (m) {
        lineYs.push(parseFloat(m[1]));
      }
    }
    const uniqueLineYs = [...new Set(lineYs.map((y) => Math.round(y)))].sort((a, b) => a - b);

    const buttons: Array<{ x: number; y: number }> = [];
    for (const el of document.querySelectorAll('.react-flow__viewport button[aria-label="添加分支"]')) {
      const r = el.getBoundingClientRect();
      const c = toFlow(r.x + r.width / 2, r.y + r.height / 2);
      buttons.push({ x: Math.round(c.x), y: Math.round(c.y) });
    }
    return { lineYs: uniqueLineYs, buttons };
  });

  expect(geometry.lineYs.length).toBeGreaterThan(0);
  // one add-branch button per branch-group owner (条件路由 + 并行处理)
  expect(geometry.buttons.length).toBe(2);

  for (const button of geometry.buttons) {
    const onLine = geometry.lineYs.some((y) => Math.abs(button.y - y) <= 2);
    expect(onLine, `button y ${button.y} should sit on one of the lines ${geometry.lineYs.join(',')}`).toBe(true);
  }

  await assertTrackedPageErrors(page);
});

test('branch labels render on split lines above the branch legs', async ({ page }) => {
  await openDingtalkDesigner(page);
  await expect(page.locator('[data-slot="dt-node"]').first()).toBeVisible({ timeout: 10000 });

  const labels = await page.evaluate(() => {
    const surface = document.querySelector('.fd-xyflow-surface')?.getBoundingClientRect();
    const vp = document.querySelector('.react-flow__viewport');
    const tf = vp ? new DOMMatrixReadOnly(vp.style.transform) : null;
    const toFlow = (x: number, y: number) => {
      if (!tf || !surface) return { x, y };
      return { x: (x - surface.x - tf.e) / tf.a, y: (y - surface.y - tf.f) / tf.d };
    };
    const out: Array<{ text: string; x: number; y: number }> = [];
    for (const el of document.querySelectorAll('div[aria-hidden="true"]')) {
      if (!el.textContent) continue;
      const t = el.textContent.trim();
      if (!['长期请假', '短期请假', '并行分支1', '并行分支2'].includes(t)) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      const c = toFlow(r.x + r.width / 2, r.y + r.height / 2);
      out.push({ text: t, x: Math.round(c.x), y: Math.round(c.y) });
    }
    return out;
  });

  expect(labels.length).toBe(4);

  // every label sits on a horizontal line (its own branch split line)
  const lineYs = await page.evaluate(() => {
    const ys: number[] = [];
    for (const path of document.querySelectorAll('.react-flow__edge-path')) {
      const d = path.getAttribute('d') ?? '';
      const m = d.match(/M[-\d.]+ [-\d.]+L[-\d.]+ ([-\d.]+)L[-\d.]+ \1L[-\d.]+ [-\d.]+/);
      if (m) ys.push(Math.round(parseFloat(m[1])));
    }
    return [...new Set(ys)];
  });
  expect(lineYs.length).toBeGreaterThan(0);
  for (const label of labels) {
    expect(lineYs.some((y) => Math.abs(label.y - y) <= 2), `label ${label.text} y ${label.y} on line`).toBe(true);
  }

  await assertTrackedPageErrors(page);
});

test('minimap renders bottom-right and controls render top-left', async ({ page }) => {
  await openDingtalkDesigner(page);
  await expect(page.locator('.react-flow__minimap')).toBeVisible({ timeout: 10000 });

  const positions = await page.evaluate(() => {
    const surface = document.querySelector('.fd-xyflow-surface');
    const surfaceRect = surface?.getBoundingClientRect();
    const minimap = document.querySelector('.react-flow__minimap')?.getBoundingClientRect();
    const controls = document.querySelector('.react-flow__controls')?.getBoundingClientRect();
    if (!surfaceRect || !minimap || !controls) return null;
    return {
      minimap: { right: surfaceRect.right - minimap.right, bottom: surfaceRect.bottom - minimap.bottom },
      controls: { left: controls.left - surfaceRect.left, top: controls.top - surfaceRect.top },
    };
  });

  expect(positions).not.toBeNull();
  expect(positions!.minimap.right).toBeGreaterThan(0);
  expect(positions!.minimap.bottom).toBeGreaterThan(0);
  expect(positions!.controls.left).toBeGreaterThanOrEqual(0);
  expect(positions!.controls.left).toBeLessThan(40);
  expect(positions!.controls.top).toBeLessThan(40);

  await assertTrackedPageErrors(page);
});
