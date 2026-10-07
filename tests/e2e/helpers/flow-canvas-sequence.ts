import type { Page } from '@playwright/test';
import { expect } from '../fixtures.js';

// Canvas interaction-sequence helpers (plan 544 Phase 4, IS-1 sediment).
// Reuse pattern for IS-4+ canvas/designer batches: sign-in bootstrap → route →
// tab switch → graph-coordinate readings. Convictions cite programmatic
// readings (viewport DOMMatrix), never screenshots — see
// docs/skills/interaction-state-audit-prompt.md §4-§6 and the living example
// in tests/e2e/interaction-state-flow-designer.spec.ts.

async function signInToPlayground(page: Page): Promise<void> {
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
  await expect(signInButton).toHaveCount(0, { timeout: 10_000 });
}

/** Opens #/flow-designer (default workflow tab) and waits for the canvas. */
export async function openFlowDesigner(page: Page): Promise<void> {
  await signInToPlayground(page);
  await page.locator('button', { hasText: 'Visual Workflow' }).click();
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 30_000 });
}

/** Switches to a designer tab and waits for the remounted canvas + fitView settle. */
export async function openDesignerTab(page: Page, tabName: string): Promise<void> {
  await page.getByRole('tab', { name: tabName }).click();
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 30_000 });
  // the tree canvas refits ~300ms after init (ux-r12 tft6); wait for settle
  await page.waitForTimeout(1200);
}


/** V1/V2/V5 readings: viewport transform + selection/menu/toast state. */

/** DOMMatrix of the react-flow viewport — screen→graph conversions derive from it. */

/** V1/V2/V5 readings: viewport transform + selection/menu/toast state. */
interface ViewportReadings {
  transform: string | null;
  nodeCount: number;
  selectedCount: number;
  menuCount: number;
  toasts: string[];
}

export async function readViewportReadings(page: Page): Promise<ViewportReadings> {
  return page.evaluate(() => ({
    transform: document.querySelector('.react-flow__viewport')?.getAttribute('style') ?? null,
    nodeCount: document.querySelectorAll('.react-flow__node').length,
    selectedCount: document.querySelectorAll('.react-flow__node.selected').length,
    menuCount: document.querySelectorAll('[role="menu"]').length,
    toasts: [...document.querySelectorAll('[data-sonner-toast]')].map((el) => el.textContent ?? ''),
  }));
}

interface PlusButtonGeometryReading {
  chainPairCount: number;
  leafButtonCount: number;
  chainOffsets: number[];
  clippedLeafButtons: number;
}

/**
 * V4 readings for tree-mode canvases: every chain "add-node" button paired
 * with its structurally-identified child (centered below, gap inside the
 * demo's chain-gap band) must center on the parent-child gap midpoint;
 * leaf buttons get the weak not-clipped assertion.
 */
export async function readPlusButtonGeometry(
  page: Page,
  band: { min: number; max: number },
): Promise<PlusButtonGeometryReading> {
  return page.evaluate((chainBand) => {
    const viewport = document.querySelector('.react-flow__viewport');
    const matrix = new DOMMatrixReadOnly(getComputedStyle(viewport as Element).transform);
    const toGraphY = (screenY: number) => (screenY - matrix.f) / matrix.a;
    const toGraphX = (screenX: number) => (screenX - matrix.e) / matrix.a;

    const nodes = [...document.querySelectorAll('.react-flow__node')].map((el) => {
      const r = el.getBoundingClientRect();
      return { el, left: toGraphX(r.left), right: toGraphX(r.right), top: toGraphY(r.top), bottom: toGraphY(r.bottom) };
    });
    const canvasRect = (document.querySelector('.react-flow') as HTMLElement).getBoundingClientRect();
    const labels = ['添加节点', 'Add node'];
    const buttons = [...document.querySelectorAll('button')].filter((b) => labels.includes(b.getAttribute('aria-label') ?? ''));

    let chainPairCount = 0;
    let leafButtonCount = 0;
    let clippedLeafButtons = 0;
    const chainOffsets: number[] = [];
    for (const btn of buttons) {
      const nodeEl = btn.closest('.react-flow__node');
      if (!nodeEl) continue;
      const rect = btn.getBoundingClientRect();
      const parent = nodes.find((n) => n.el === nodeEl);
      if (!parent) continue;
      const btnCenterX = toGraphX(rect.left + rect.width / 2);
      const btnCenterY = toGraphY(rect.top + rect.height / 2);

      let child: (typeof nodes)[number] | null = null;
      let best = Infinity;
      for (const n of nodes) {
        if (n.el === nodeEl) continue;
        if (n.top < parent.bottom - 2) continue;
        const gap = n.top - parent.bottom;
        if (gap < chainBand.min || gap > chainBand.max) continue;
        if (btnCenterX < n.left - 2 || btnCenterX > n.right + 2) continue;
        if (gap < best) {
          best = gap;
          child = n;
        }
      }

      if (child) {
        chainPairCount += 1;
        chainOffsets.push(Math.round((btnCenterY - (parent.bottom + child.top) / 2) * 10) / 10);
      } else {
        leafButtonCount += 1;
        const clipped =
          rect.left < canvasRect.left - 1 ||
          rect.right > canvasRect.right + 1 ||
          rect.top < canvasRect.top - 1 ||
          rect.bottom > canvasRect.bottom + 1;
        if (clipped) clippedLeafButtons += 1;
      }
    }
    return { chainPairCount, leafButtonCount, chainOffsets, clippedLeafButtons };
  }, band);
}
