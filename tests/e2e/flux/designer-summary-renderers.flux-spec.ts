import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * designer-node-card / designer-edge-row renderers in the flow-designer
 * "节点/边摘要" inspector summary panel: marker counts, node/edge identity
 * attributes, missing-slot empty states, and the selectNode / selectEdge
 * command dispatches on card click.
 *
 * Migrated from tests/e2e/designer-summary-renderers.spec.ts (E3 batch 4,
 * engine swap + arrival gated on the summary schema markers instead of the
 * old networkidle fire-and-forget wait; per-case isolation via the gated
 * hash-route bounce). The old spec's "Sign in" prelude was dead code — the
 * playground has no auth gate — so it is dropped.
 */

async function openSummaryDemo(ft: FtGlobal): Promise<void> {
  // bounce through '/#/' so the flow-designer page remounts
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.locator('.react-flow__node').first()).not.toBeVisible();

  // keep the old home-card → flow-designer navigation leg
  await ft.expectWeb(ft.locator('[data-home-card="flow-designer"]')).toBeVisible({ timeoutMs: 15_000 });
  await ft.locator('[data-home-card="flow-designer"]').click();

  await ft.getByRole('tab', { name: '节点/边摘要' }).click();

  // summary schema canvas: 3 react-flow nodes once the demo is mounted
  await ft.expectWeb(ft.locator('.react-flow__node')).toHaveCount(3, { timeoutMs: 30_000 });
}

export default async function designerSummaryRenderers(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);

  // Case 1: renders node-card and edge-row markers in the inspector summary panel
  await openSummaryDemo(ft);

  const inspector = ft.getByTestId('right-panel-expanded').first();
  await ft.expectWeb(inspector).toBeVisible({ timeoutMs: 10_000 });

  await ft.expectWeb(inspector.locator('.nop-designer-node-card')).toHaveCount(4, { timeoutMs: 10_000 });
  await ft.expectWeb(inspector.locator('.nop-designer-edge-row')).toHaveCount(3, { timeoutMs: 10_000 });

  const taskCard = inspector.locator('[data-testid="summary-node-task"]');
  await ft.expectWeb(taskCard).toHaveAttribute('data-node-id', 'task-1');
  await ft.expectWeb(taskCard).toHaveAttribute('data-node-type', 'task');
  await ft.expectWeb(taskCard).toContainText('Task Node');

  const edgeRow = inspector.locator('[data-testid="summary-edge-1"]');
  await ft.expectWeb(edgeRow).toHaveAttribute('data-edge-id', 'edge-start-task');
  await ft.expectWeb(edgeRow).toContainText('Start Node');
  await ft.expectWeb(edgeRow).toContainText('Task Node');

  await ft.expectWeb(inspector.locator('[data-testid="summary-node-missing"]')).toHaveAttribute(
    'data-empty',
    'true',
  );
  await ft.expectWeb(inspector.locator('[data-testid="summary-edge-missing"]')).toHaveAttribute(
    'data-empty',
    'true',
  );

  await expectNoPageErrors(ft, 'designer-summary:markers');

  // Case 2: dispatches selectNode command when a node-card is clicked
  await openSummaryDemo(ft);

  const inspector2 = ft.getByTestId('right-panel-expanded').first();
  const taskCard2 = inspector2.locator('[data-testid="summary-node-task"]');
  await ft.expectWeb(taskCard2).toBeVisible({ timeoutMs: 10_000 });

  await taskCard2.click();
  await ft.expectWeb(taskCard2).toHaveAttribute('data-active', 'true', { timeoutMs: 5_000 });
  await ft.expectWeb(taskCard2).toHaveAttribute('data-selected', 'true', { timeoutMs: 5_000 });

  const startCard = inspector2.locator('[data-testid="summary-node-start"]');
  await startCard.click();
  await ft.expectWeb(startCard).toHaveAttribute('data-active', 'true', { timeoutMs: 5_000 });
  await ft.expectWeb(taskCard2).not.toHaveAttribute('data-active', 'true', { timeoutMs: 5_000 });

  await expectNoPageErrors(ft, 'designer-summary:select-node');

  // Case 3: dispatches selectEdge command when an edge-row is clicked
  await openSummaryDemo(ft);

  const inspector3 = ft.getByTestId('right-panel-expanded').first();
  const edgeRow2 = inspector3.locator('[data-testid="summary-edge-2"]');
  await ft.expectWeb(edgeRow2).toBeVisible({ timeoutMs: 10_000 });

  await edgeRow2.click();
  await ft.expectWeb(edgeRow2).toHaveAttribute('data-active', 'true', { timeoutMs: 5_000 });
  await ft.expectWeb(edgeRow2).toHaveAttribute('data-selected', 'true', { timeoutMs: 5_000 });

  const otherEdge = inspector3.locator('[data-testid="summary-edge-1"]');
  await ft.expectWeb(otherEdge).not.toHaveAttribute('data-active', 'true', { timeoutMs: 5_000 });

  await expectNoPageErrors(ft, 'designer-summary:select-edge');

  return { cases: 3 };
}
