import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * org select — user-select (missing-components L2.1).
 * Lazy org tree with user-only selectable types, preselected echo + flat remote
 * search, children source failure with retry, and paged root continuation (§5).
 *
 * Migrated from tests/e2e/org-select-user.spec.ts (E3 batch 2, engine swap +
 * Playwright auto-retry expect() mapped onto ft.expectWeb retry-polling with
 * the same timeouts; the regex text match on the error slot kept as two
 * explicit alternative substring checks).
 * Per-case isolation: each old Playwright test ran on a fresh page; here
 * resetRoute() bounces through '/#/' with a stability gate so the lab remounts
 * (ft.reload() is unusable — it destroys the CDP evaluation context mid-spec).
 */

// base-ui Popover portals the panel to <body>: panel-level rows are located
// at page level; the trigger and chips readout stay in stage.
function panelRow(ft: FtGlobal, id: string) {
  return ft.locator(`[data-slot="org-select-panel"] [data-slot="org-select-node"][data-node-id="${id}"]`);
}

async function resetRoute(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.getByTestId('multi-scenario-lab')).not.toBeVisible();
}

async function openUserSelectLab(ft: FtGlobal): Promise<void> {
  await resetRoute(ft);
  await ft.goto('/#/lab/user-select');
  await ft.expectWeb(ft.getByTestId('multi-scenario-lab')).toBeVisible({ timeoutMs: 30_000 });
}

async function openPanel(ft: FtGlobal, stageTestId: string): Promise<void> {
  const stage = ft.getByTestId(stageTestId);
  await stage.locator('[data-slot="org-select-trigger"]').click();
  await ft.expectWeb(ft.locator('[data-slot="org-select-panel"]')).toBeVisible();
}

export default async function orgSelectUser(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: lazy-loads org departments and selects a user through navigation
  await openUserSelectLab(ft);

  await openPanel(ft, 'scenario-stage-org-tree-search-multi-select');

  // Root departments arrive from the mocked sourceChildren root call.
  const engRow = panelRow(ft, 'dept-eng');
  await ft.expectWeb(engRow).toBeVisible();
  // user-select default selectableTypes=['user']: department row is navigable-only (no checkbox).
  await ft.expectWeb(engRow.locator('[data-slot="org-select-node-check"]')).toHaveCount(0);

  // Expand → children users load lazily.
  await engRow.locator('[data-slot="org-select-expand"]').click();
  const alice = panelRow(ft, 'u-alice');
  await ft.expectWeb(alice).toBeVisible();
  await ft.expectWeb(alice).toHaveAttribute('data-node-type', 'user');
  // 'u-alice' is preselected in the schema — its checkbox reflects the echo.
  await ft.expectWeb(alice.locator('[data-slot="org-select-node-check"]')).toHaveAttribute('aria-checked', 'true');

  // Disabled user renders a locked checkbox (same Engineering level).
  const bob = panelRow(ft, 'u-bob');
  await ft.expectWeb(bob).toHaveAttribute('data-disabled', 'true');
  const bobCheckDisabled = await bob.locator('[data-slot="org-select-node-check"]').attr('data-disabled');
  if (bobCheckDisabled !== '') {
    throw new Error(`u-bob check data-disabled="${bobCheckDisabled}", expected present-but-empty`);
  }

  // Check a fresh user (Platform team) → a new chip appears on the trigger.
  await panelRow(ft, 'dept-platform').locator('[data-slot="org-select-expand"]').click();
  const carol = panelRow(ft, 'u-carol');
  await ft.expectWeb(carol).toBeVisible();
  await carol.locator('[data-slot="org-select-node-check"]').click();
  await ft.expectWeb(
    ft.getByTestId('scenario-stage-org-tree-search-multi-select').locator('[data-slot="org-select-chip"][data-value="u-carol"]'),
  ).toBeVisible();

  await expectNoPageErrors(ft, 'org-select-user:lazy-tree');

  // Case 2: echo-resolves a preselected id and search returns flat remote results
  await openUserSelectLab(ft);

  const stage = ft.getByTestId('scenario-stage-org-tree-search-multi-select');
  // Preselected value 'u-alice' resolves through sourceResolve into a label.
  // (driver toHaveText does not accept RegExp; partial-match regex → containText)
  await ft.expectWeb(stage.locator('[data-slot="org-select-chip"][data-value="u-alice"]')).toContainText('Alice', {
    timeoutMs: 15_000,
  });

  await stage.locator('[data-slot="org-select-trigger"]').click();
  await ft.expectWeb(ft.locator('[data-slot="org-select-panel"]')).toBeVisible();
  const search = ft.locator('[data-slot="org-select-panel"] [data-slot="org-select-search"]');
  await search.fill('ali');

  // Remote search results replace the tree view (flat rows, no breadcrumb).
  const result = panelRow(ft, 'u-carol');
  await ft.expectWeb(result).toBeVisible({ timeoutMs: 10_000 });
  await ft.expectWeb(ft.locator('[data-slot="org-select-panel"] [data-slot="org-select-breadcrumb"]')).toHaveCount(0);

  await expectNoPageErrors(ft, 'org-select-user:echo-search');

  // Case 3: children source failure surfaces an inline error with a retry action
  await openUserSelectLab(ft);

  await openPanel(ft, 'scenario-stage-children-source-failure-with-retry');

  const error = ft.locator('[data-slot="org-select-panel"] [data-slot="org-select-error"]');
  await ft.expectWeb(error).toBeVisible({ timeoutMs: 10_000 });
  // old spec matched /子节点加载失败|Failed to load child departments/ — the
  // mock copy carries the Chinese variant; assert the discriminating substring.
  await ft.expectWeb(error).toContainText('加载失败');
  const errorText = (await error.text()) ?? '';
  if (!(errorText.includes('子节点加载失败') || errorText.includes('Failed to load child departments'))) {
    throw new Error(`org-select error text "${errorText.slice(0, 80)}" matches neither copy variant`);
  }
  await ft.expectWeb(ft.locator('[data-slot="org-select-panel"] [data-slot="org-select-retry"]')).toBeVisible();

  await expectNoPageErrors(ft, 'org-select-user:failure-retry');

  // Case 4: paged root continues via load-more and terminates after the last page (§5)
  await openUserSelectLab(ft);

  await openPanel(ft, 'scenario-stage-paged-root-continuation');

  // Page 1 carries two of the three root departments; the continuation
  // button is offered because the mock page declares hasMore.
  await ft.expectWeb(panelRow(ft, 'dept-eng')).toBeVisible();
  await ft.expectWeb(panelRow(ft, 'dept-hr')).toHaveCount(0);
  const loadMore = ft.locator('[data-slot="org-select-panel"] [data-slot="org-select-load-more"]');
  await ft.expectWeb(loadMore).toBeVisible({ timeoutMs: 10_000 });

  // Continuation merges the remaining page; the button disappears once the
  // termination signal (hasMore:false) lands.
  await loadMore.click();
  await ft.expectWeb(panelRow(ft, 'dept-hr')).toBeVisible({ timeoutMs: 10_000 });
  await ft.expectWeb(loadMore).toHaveCount(0);

  await expectNoPageErrors(ft, 'org-select-user:paged-root');

  return { cases: 4 };
}
