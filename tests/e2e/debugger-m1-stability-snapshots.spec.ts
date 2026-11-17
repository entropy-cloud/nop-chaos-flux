import { expect, test } from '@playwright/test';

// M1 (plan 2026-11-18-m1): StabilityTracker + ForestSnapshot + automation V2.
// Programmatic assertions only (page.evaluate). Scope writes happen on the
// flux-basic renderer playground, so forest-snapshot epochs are asserted there.

async function openFluxBasicPage(page: import('@playwright/test').Page) {
  await page.goto('/#/flux-basic');
  await page
    .getByRole('heading', { name: 'Renderer Playground', level: 1 })
    .waitFor({ state: 'visible', timeout: 15000 });
}

async function openDebuggerLab(page: import('@playwright/test').Page) {
  await page.goto('/#/debugger-lab');
  await page
    .getByRole('heading', { name: 'Debugger Lab' })
    .waitFor({ state: 'visible', timeout: 15000 });
}

interface V2Api {
  getStability?: () => { stable: boolean; counters: Record<string, number> };
  getSnapshotEpochs?: () => number[];
  getSnapshotAt?: (epoch: number) => unknown | null;
}

function getApi(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const api = (window as unknown as { __NOP_DEBUGGER_API__?: V2Api }).__NOP_DEBUGGER_API__;
    if (!api?.getStability || !api.getSnapshotEpochs || !api.getSnapshotAt) {
      return null;
    }
    return api;
  });
}

test('automation V2 exposes stability probes and reports stable after settling (M3: waits via waitFor stability)', async ({ page }) => {
  await openFluxBasicPage(page);
  await page.evaluate(async () => {
    const api = (window as unknown as { __NOP_DEBUGGER_API__?: { waitFor?: (p: unknown, o?: object) => Promise<unknown> } }).__NOP_DEBUGGER_API__;
    await api?.waitFor?.({ type: 'stability' }, { timeoutMs: 5000, stableGate: false });
  });

  const api = await getApi(page);
  expect(api).not.toBeNull();

  const stability = await page.evaluate(() => {
    const probe = ((window as unknown as { __NOP_DEBUGGER_API__?: V2Api }).__NOP_DEBUGGER_API__ as V2Api)
      .getStability!();
    return probe;
  });
  expect(stability.stable).toBe(true);
  expect(Object.keys(stability.counters).length).toBeGreaterThan(0);
});

test('forest snapshots are collected on scope writes and getSnapshotAt resolves them', async ({ page }) => {
  await openDebuggerLab(page);
  await page.evaluate(async () => {
    const api = (window as unknown as { __NOP_DEBUGGER_API__?: { waitFor?: (p: unknown, o?: object) => Promise<unknown> } }).__NOP_DEBUGGER_API__;
    await api?.waitFor?.({ type: 'stability' }, { timeoutMs: 5000, stableGate: false });
  });

  // trigger a real scope write through the runtime (lab demo button)
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find(
      (candidate) => candidate.textContent?.trim() === 'Trigger Scope Write',
    );
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(300);

  const result = await page.evaluate(() => {
    const api = (window as unknown as { __NOP_DEBUGGER_API__?: V2Api }).__NOP_DEBUGGER_API__!;
    const epochs = api.getSnapshotEpochs!();
    if (epochs.length === 0) return { epochs, snapshot: null };
    const latestEpoch = epochs[epochs.length - 1]!;
    const snapshot = api.getSnapshotAt!(latestEpoch) as {
      epoch: number;
      revisions: Record<string, number>;
      scopes: Record<string, Record<string, unknown>>;
    } | null;
    return { epochs, snapshot };
  });

  expect(result.epochs.length).toBeGreaterThan(0);
  expect(result.snapshot).not.toBeNull();
  expect(Object.keys(result.snapshot!.scopes).length).toBeGreaterThan(0);
  expect(Object.values(result.snapshot!.revisions).some((rev) => rev > 0)).toBe(true);
});

test('stability indicator renders on the lab page (M3: stability waitFor)', async ({ page }) => {
  await openDebuggerLab(page);
  await page.evaluate(async () => {
    const api = (window as unknown as { __NOP_DEBUGGER_API__?: { waitFor?: (p: unknown, o?: object) => Promise<unknown> } }).__NOP_DEBUGGER_API__;
    await api?.waitFor?.({ type: 'stability' }, { timeoutMs: 5000, stableGate: false });
  });
  const indicator = page.getByTestId('debugger-lab-stability');
  await expect(indicator).toContainText(/stable|busy|n\/a/);
});

test('M2: screenshot automation produces a content hash and reuses unchanged DOM', async ({ page }) => {
  await openDebuggerLab(page);
  await page.evaluate(async () => {
    const api = (window as unknown as { __NOP_DEBUGGER_API__?: { waitFor?: (p: unknown, o?: object) => Promise<unknown> } }).__NOP_DEBUGGER_API__;
    await api?.waitFor?.({ type: 'stability' }, { timeoutMs: 5000, stableGate: false });
  });

  const capture = await page.evaluate(async () => {
    const api = (window as unknown as { __NOP_DEBUGGER_API__?: V2Api & { screenshot?: (o?: object) => Promise<{ hash: string; reused?: boolean }> } }).__NOP_DEBUGGER_API__;
    if (!api?.screenshot) return { wired: false };
    const first = await api.screenshot({ tag: 'm2-e2e' });
    const second = await api.screenshot({ tag: 'm2-e2e' });
    return { wired: true, first, second };
  });

  expect(capture.wired).toBe(true);
  const first = (capture as { first?: { hash: string; reused?: boolean } }).first!;
  const second = (capture as { second?: { hash: string; reused?: boolean } }).second!;
  expect(first.hash).toBeTruthy();
  expect(second.hash).toBe(first.hash);
  expect(second.reused).toBe(true);
});

test('M2: preview banner mounts on enterPreview and a real keydown exits it', async ({ page }) => {
  await openDebuggerLab(page);
  await page.waitForTimeout(500);
  // produce at least one forest snapshot epoch via the lab demo scope write
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find(
      (candidate) => candidate.textContent?.trim() === 'Trigger Scope Write',
    );
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(300);

  const entered = await page.evaluate(() => {
    const api = (window as unknown as { __NOP_DEBUGGER_API__?: V2Api }).__NOP_DEBUGGER_API__;
    const epochs = api?.getSnapshotEpochs?.() ?? [];
    if (!api?.enterPreview || epochs.length === 0) return false;
    return api.enterPreview(epochs[epochs.length - 1]!);
  });
  expect(entered).toBe(true);
  await expect(page.locator('[data-nop-preview-banner]')).toBeVisible();

  await page.keyboard.press('a');
  await page.waitForTimeout(200);
  expect(await page.locator('[data-nop-preview-banner]').count()).toBe(0);

  const state = await page.evaluate(() => {
    const api = (window as unknown as { __NOP_DEBUGGER_API__?: V2Api }).__NOP_DEBUGGER_API__;
    return api?.isPreviewActive?.() ?? false;
  });
  expect(state).toBe(false);
});

test('M2: masked password field renders as uniform mask color in rasterized pixels', async ({ page }) => {
  await openDebuggerLab(page);

  const pixel = await page.evaluate(async () => {
    // build a known-geometry fixture with a masked password field
    const host = document.createElement('div');
    host.setAttribute('id', 'm2-pixel-fixture');
    host.style.cssText = 'position:fixed;top:0;left:0;width:200px;height:100px;background:#ffffff;';
    const input = document.createElement('input');
    input.type = 'password';
    input.style.cssText = 'position:absolute;left:50px;top:30px;width:100px;height:40px;';
    host.appendChild(input);
    document.body.appendChild(host);

    const api = (window as unknown as { __NOP_DEBUGGER_API__?: { screenshot?: (o?: object) => Promise<{ bytes: string; hash: string }> } }).__NOP_DEBUGGER_API__;
    if (!api?.screenshot) return { wired: false };
    const result = await api.screenshot({ selector: '#m2-pixel-fixture', format: 'png', scale: 1 });
    const image = new Image();
    image.src = `data:image/png;base64,${result.bytes}`;
    await new Promise((resolve) => {
      image.onload = resolve;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 100;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    // sample the center of the masked input area (left 50 + 100/2, top 30 + 40/2)
    const inside = context.getImageData(100, 50, 1, 1).data;
    const outside = context.getImageData(10, 10, 1, 1).data;
    host.remove();
    return {
      wired: true,
      inside: [inside[0], inside[1], inside[2]],
      outside: [outside[0], outside[1], outside[2]],
    };
  });

  expect(pixel.wired).toBe(true);
  const inside = (pixel as { inside: number[] }).inside;
  const outside = (pixel as { outside: number[] }).outside;
  // mask color #111111
  expect(inside[0]).toBeLessThan(40);
  expect(inside[1]).toBeLessThan(40);
  expect(inside[2]).toBeLessThan(40);
  // background stays white
  expect(outside[0]).toBeGreaterThan(200);
  expect(outside[1]).toBeGreaterThan(200);
  expect(outside[2]).toBeGreaterThan(200);
});

test('M3: visual diff detects 1px change and cid ignore region clears it', async ({ page }) => {
  await openDebuggerLab(page);
  const outcome = await page.evaluate(async () => {
    const api = (window as unknown as {
      __NOP_DEBUGGER_API__?: {
        screenshot?: (o?: object) => Promise<{ bytes: string; width: number; height: number; hash: string }>;
        putBaseline?: (o?: { ignoreRegions?: Array<{ x: number; y: number; width: number; height: number; reason?: string }> }) => Promise<{ key: string } | null>;
        compareScreenshot?: (key: string, o?: { maxDiffRatio?: number }) => Promise<{ match: boolean; diffRatio: number; missing?: boolean }>;
        waitFor?: (p: unknown, o?: object) => Promise<unknown>;
      };
    }).__NOP_DEBUGGER_API__;
    if (!api?.screenshot || !api.putBaseline || !api.compareScreenshot) return { wired: false };
    // deterministic fixture: 40x40 solid white box with a 10x10 black square at (0,0)
    const host = document.createElement('div');
    host.id = 'm3-visual-fixture';
    host.style.cssText = 'position:fixed;top:0;left:0;width:40px;height:40px;background:#ffffff;';
    const square = document.createElement('div');
    square.style.cssText = 'position:absolute;left:0;top:0;width:10px;height:10px;background:#000000;';
    host.appendChild(square);
    document.body.appendChild(host);

    const baselineShot = await api.screenshot({ selector: '#m3-visual-fixture', format: 'png', scale: 1 });
    await api.putBaseline();

    // 1px change: grow the black square by one pixel row (10x11)
    square.style.height = '11px';
    const changedShot = await api.screenshot({ selector: '#m3-visual-fixture', format: 'png', scale: 1, fresh: true });
    if (changedShot.hash === baselineShot.hash) return { wired: true, changed: false };
    const changedComparison = await api.compareScreenshot('default:40x40', { maxDiffRatio: 0 });
    // restore then confirm ignore region over the changed strip clears the diff
    square.style.height = '10px';
    await api.screenshot({ selector: '#m3-visual-fixture', format: 'png', scale: 1 });
    await api.putBaseline({
      ignoreRegions: [{ x: 0, y: 0, width: 10, height: 11, reason: 'xui:visual-ignore' }],
    });
    square.style.height = '11px';
    await api.screenshot({ selector: '#m3-visual-fixture', format: 'png', scale: 1, fresh: true });
    const ignoredComparison = await api.compareScreenshot('default:40x40', { maxDiffRatio: 0 });
    host.remove();
    return { wired: true, changed: true, changedComparison, ignoredComparison };
  });

  expect(outcome.wired).toBe(true);
  expect((outcome as { changed: boolean }).changed).toBe(true);
  const changedComparison = (outcome as { changedComparison?: { diffRatio: number } }).changedComparison!;
  expect(changedComparison.diffRatio).toBeGreaterThan(0);
  expect(changedComparison.diffRatio).toBeLessThan(0.1);
  const ignoredComparison = (outcome as { ignoredComparison?: { diffRatio: number } }).ignoredComparison!;
  expect(ignoredComparison.diffRatio).toBe(0);
});
