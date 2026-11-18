import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * org select — department-select (missing-components L2.1).
 * Lazy tree multi-select with empty-page termination, and search + echo single
 * select resolving the preselected department label.
 *
 * Migrated from tests/e2e/org-select-department.spec.ts (E3 batch 1, engine swap +
 * Playwright auto-retry expect() mapped onto ft.expectWeb retry-polling with the
 * same timeouts; the regex text match on org-select-value kept as a regex check).
 * Per-case isolation via resetRoute(): each old Playwright test ran on a fresh
 * page; here we bounce through '/#/' with a stability gate so the lab remounts
 * (ft.reload() is unusable — it destroys the CDP evaluation context mid-spec).
 */

// base-ui Popover portals the panel to <body>: panel-level rows are located
// at page level; the trigger and live summary text stay in stage.
function panelRow(ft: FtGlobal, id: string) {
  return ft.locator(`[data-slot="org-select-panel"] [data-slot="org-select-node"][data-node-id="${id}"]`);
}

async function resetRoute(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.getByTestId('multi-scenario-lab')).not.toBeVisible();
}

async function openDepartmentSelectLab(ft: FtGlobal): Promise<void> {
  await resetRoute(ft);
  await ft.goto('/#/lab/department-select');
  await ft.expectWeb(ft.getByTestId('multi-scenario-lab')).toBeVisible({ timeoutMs: 30_000 });
}

export default async function orgSelectDepartment(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: lazy tree multi-select commits checked department ids with empty-page termination
  await openDepartmentSelectLab(ft);

  const stage = ft.getByTestId('scenario-stage-lazy-tree-multi-select');
  await stage.locator('[data-slot="org-select-trigger"]').click();
  const panel = ft.locator('[data-slot="org-select-panel"]');
  await ft.expectWeb(panel).toBeVisible();

  // department-select default selectableTypes=['department']: department rows are checkable AND navigable.
  const hq = panelRow(ft, 'hq');
  await ft.expectWeb(hq).toBeVisible();
  await hq.locator('[data-slot="org-select-node-check"]').click();
  const rd = panelRow(ft, 'rd');
  await rd.locator('[data-slot="org-select-node-check"]').click();

  // Chips reflect the committed array on the trigger.
  await ft.expectWeb(stage.locator('[data-slot="org-select-chip"][data-value="hq"]')).toBeVisible();
  await ft.expectWeb(stage.locator('[data-slot="org-select-chip"][data-value="rd"]')).toBeVisible();

  // Drill into HQ → both children load; Finance Dept is an empty branch → 「No data」.
  await hq.locator('[data-slot="org-select-expand"]').click();
  const finance = panelRow(ft, 'hq-finance');
  await ft.expectWeb(finance).toBeVisible();
  await finance.locator('[data-slot="org-select-expand"]').click();
  // Navigation entered the empty branch: breadcrumb shows it, list shows the
  // empty state (empty-page cache is pinned at the unit level — no re-fetch).
  await ft.expectWeb(panel.locator('[data-slot="org-select-breadcrumb"]')).toContainText('Finance Dept');
  await ft.expectWeb(panel.locator('[data-slot="org-select-empty"]')).toBeVisible();

  await expectNoPageErrors(ft, 'org-select-department:multi-select');

  // Case 2: search + echo single select resolves the preselected department label
  await openDepartmentSelectLab(ft);

  const singleStage = ft.getByTestId('scenario-stage-search-echo-single-select');
  // Preselected 'rd-frontend' resolves through sourceResolve into a label.
  // (driver toHaveText does not accept RegExp; partial-match regex → containText)
  await ft.expectWeb(singleStage.locator('[data-slot="org-select-value"]')).toContainText('Frontend Team', {
    timeoutMs: 15_000,
  });

  await singleStage.locator('[data-slot="org-select-trigger"]').click();
  const singlePanel = ft.locator('[data-slot="org-select-panel"]');
  await ft.expectWeb(singlePanel).toBeVisible();

  const search = singlePanel.locator('[data-slot="org-select-search"]');
  await search.fill('hr');
  const result = panelRow(ft, 'hq-hr');
  await ft.expectWeb(result).toBeVisible({ timeoutMs: 10_000 });

  // Single select: clicking a department commits and closes the panel.
  await result.locator('[data-slot="org-select-node-name"]').click();
  await ft.expectWeb(singleStage.locator('[data-slot="org-select-value"]')).toHaveText('HR Dept');

  await expectNoPageErrors(ft, 'org-select-department:search-echo');

  return { cases: 2 };
}
