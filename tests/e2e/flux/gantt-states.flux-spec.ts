import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * Gantt States — empty / loading / baselines / regions.
 *
 * Migrated from tests/e2e/gantt-states.spec.ts (E3 batch 1, engine swap +
 * locator.evaluate(computed style) replaced by a scoped ft.evaluate fallback
 * (driver has no per-locator evaluate); allTextContents replaced by nth-text
 * iteration; toBeAttached replaced by locator.waitFor('attached');
 * assertTrackedPageErrors replaced by kernel expectNoPageErrors).
 */

const ROUTE = '/#/gantt-states';
const HEADING = /Gantt States/i;

async function openStates(ft: FtGlobal): Promise<void> {
  await ft.goto(ROUTE);
  await ft.expectWeb(ft.getByRole('heading', { name: HEADING })).toBeVisible({ timeoutMs: 25_000 });
}

/**
 * Visibility for SVG elements (gantt bars/deviations are <rect>s): the driver's
 * expectWeb.toBeVisible requires `instanceof HTMLElement`, which excludes SVG,
 * so mirror Playwright's visibility semantics manually — attached + nonempty
 * bounding box. Same assertion strength as the original toBeVisible.
 */
async function expectSvgVisible(locator: ReturnType<FtGlobal['locator']>, timeoutMs = 10_000): Promise<void> {
  await locator.waitFor('attached', { timeoutMs });
  const box = await locator.boundingBox({ timeoutMs });
  if (!box || box.width <= 0 || box.height <= 0) {
    throw new Error(`SVG element not visible (empty bounding box: ${JSON.stringify(box)})`);
  }
}

async function caseBareEmptyGantt(ft: FtGlobal): Promise<void> {
  await openStates(ft);
  const empty = ft.locator('[data-testid="gantt-empty-basic"]');
  await empty.waitFor('attached', { timeoutMs: 10_000 });
  await ft.expectWeb(empty).toHaveAttribute('data-slot', 'gantt');
  const gridCount = await empty.locator('[data-slot="gantt-grid"]').count();
  if (gridCount !== 0) throw new Error(`expected 0 gantt-grid rows in bare empty gantt, got ${gridCount}`);
  const barCount = await empty.locator('[data-slot="gantt-bar"]').count();
  if (barCount !== 0) throw new Error(`expected 0 gantt-bar in bare empty gantt, got ${barCount}`);
  await expectNoPageErrors(ft, 'gantt-states: bare empty');
}

async function caseCustomEmptyRegion(ft: FtGlobal): Promise<void> {
  await openStates(ft);
  const regionText = ft.locator('[data-testid="gantt-empty-region-text"]');
  await ft.expectWeb(regionText).toBeVisible({ timeoutMs: 10_000 });
  await ft.expectWeb(regionText).toContainText('No tasks yet');
  await expectNoPageErrors(ft, 'gantt-states: custom empty region');
}

async function caseLoadingSkeleton(ft: FtGlobal): Promise<void> {
  await openStates(ft);
  const loading = ft.locator('[data-testid="gantt-loading-skeleton"]');
  await loading.waitFor('attached', { timeoutMs: 10_000 });
  const skeletonCount = await loading.locator('[data-slot="skeleton"], .animate-pulse').count();
  if (skeletonCount < 2) throw new Error(`expected >= 2 skeleton placeholders, got ${skeletonCount}`);
  const gridCount = await loading.locator('[data-slot="gantt-grid"]').count();
  if (gridCount !== 0) throw new Error(`expected 0 gantt-grid in loading state, got ${gridCount}`);
  await expectNoPageErrors(ft, 'gantt-states: loading skeleton');
}

async function caseBaselineBars(ft: FtGlobal): Promise<void> {
  await openStates(ft);
  const baselines = ft.locator('[data-testid="gantt-baselines"] [data-slot="gantt-baseline-bar"]');
  await expectSvgVisible(baselines.first());
  await ft.expectWeb(baselines).toHaveCount(3);
  // plan 481 R4: fill/stroke moved from presentation attributes (which do
  // not accept var()) to the style channel — assert the computed paint is a
  // real token-resolved color at partial opacity (translucency contract).
  // TODO(migrate-debt): evaluate fallback (driver has no locator.evaluate for getComputedStyle)
  const paint = (await ft.evaluate(
    `(() => { const el = document.querySelector('[data-testid="gantt-baselines"] [data-slot="gantt-baseline-bar"]'); if (!el) return null; const cs = getComputedStyle(el); return { fill: cs.fill, fillOpacity: cs.fillOpacity }; })()`,
  )) as { fill: string; fillOpacity: string } | null;
  if (!paint) throw new Error('baseline bar element missing for computed style probe');
  if (paint.fill === 'none') throw new Error(`baseline fill should not be 'none', got "${paint.fill}"`);
  if (!(Number(paint.fillOpacity) < 1)) throw new Error(`baseline fillOpacity should be < 1, got "${paint.fillOpacity}"`);
  await expectNoPageErrors(ft, 'gantt-states: baseline bars');
}

async function caseBaselineDeviations(ft: FtGlobal): Promise<void> {
  await openStates(ft);
  const scope = '[data-testid="gantt-baselines"]';
  const deviations = ft.locator(`${scope} [data-slot="gantt-baseline-deviation"]`);
  const labels = ft.locator(`${scope} [data-slot="gantt-baseline-label"]`);
  await expectSvgVisible(deviations.first());
  await ft.expectWeb(deviations).toHaveCount(2);
  await ft.expectWeb(labels).toHaveCount(2);
  const labelCount = await labels.count();
  const texts: string[] = [];
  for (let i = 0; i < labelCount; i++) texts.push(await labels.nth(i).text());
  const joined = texts.join(' ');
  if (!/\+3d/.test(joined)) throw new Error(`expected +3d label, got "${joined}"`);
  if (!/-2d/.test(joined)) throw new Error(`expected -2d label, got "${joined}"`);
  const dash = await deviations.first().attr('stroke-dasharray');
  if (!dash) throw new Error(`stroke-dasharray should be truthy, got "${dash}"`);
  await expectNoPageErrors(ft, 'gantt-states: baseline deviations');
}

async function caseCustomToolbarRegion(ft: FtGlobal): Promise<void> {
  await openStates(ft);
  const toolbar = ft.locator('[data-testid="gantt-toolbar-region"] [data-slot="gantt-toolbar"]');
  await ft.expectWeb(toolbar).toBeVisible({ timeoutMs: 10_000 });
  await ft.expectWeb(ft.locator('[data-testid="gantt-toolbar-region-text"]')).toContainText('Host toolbar region');
  const buttonCount = await toolbar.locator('button').count();
  if (buttonCount !== 0) throw new Error(`expected 0 default zoom buttons, got ${buttonCount}`);
  await expectNoPageErrors(ft, 'gantt-states: toolbar region');
}

async function caseCustomTaskBarRegion(ft: FtGlobal): Promise<void> {
  await openStates(ft);
  const gantt = ft.locator('[data-testid="gantt-taskbar-region"]');
  await expectSvgVisible(gantt.locator('[data-slot="gantt-bar"]').first());
  await ft.expectWeb(gantt).toContainText('◆Region Bar◆');
  await expectNoPageErrors(ft, 'gantt-states: task bar region');
}

async function caseCustomColumnRegion(ft: FtGlobal): Promise<void> {
  await openStates(ft);
  const gantt = ft.locator('[data-testid="gantt-column-region"]');
  await ft.expectWeb(gantt.locator('[data-slot="gantt-grid-row"]').first()).toBeVisible({ timeoutMs: 10_000 });
  await ft.expectWeb(ft.locator('[data-testid="gantt-column-region-start"]')).toHaveCount(2, { timeoutMs: 10_000 });
  await ft.expectWeb(gantt).toContainText('≔ 2026-08-02');
  await ft.expectWeb(gantt).toContainText('≔ 2026-08-10');
  await expectNoPageErrors(ft, 'gantt-states: column region');
}

export default async function ganttStatesSpec(ft: FtGlobal): Promise<{ cases: number }> {
  await caseBareEmptyGantt(ft);
  await caseCustomEmptyRegion(ft);
  await caseLoadingSkeleton(ft);
  await caseBaselineBars(ft);
  await caseBaselineDeviations(ft);
  await caseCustomToolbarRegion(ft);
  await caseCustomTaskBarRegion(ft);
  await caseCustomColumnRegion(ft);
  return { cases: 8 };
}
