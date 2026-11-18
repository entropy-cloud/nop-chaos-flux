import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * Debugger AI copilot demo (AD-6): enable → propose → adopt → rollback, all
 * programmatic. Zero-load is asserted via performance resource-timing entries:
 * with the copilot OFF, no nop-debugger-ai module is ever fetched; enabling
 * triggers the dynamic import (positive half of the discriminator).
 *
 * Migrated from tests/e2e/debugger-ai.spec.ts (E3 batch 3, engine swap +
 * network-level request listener replaced by performance resource-timing
 * entries read through ft.evaluate — both halves of the zero-load
 * discriminator are retained).
 *
 * TODO(migrate-debt): evaluate fallback (driver has no request-event hook;
 * resource-timing entries are the in-page equivalent for module fetches).
 */

/** Count fetched resource entries whose URL contains the AI module chunk. */
async function aiModuleFetchCount(ft: FtGlobal): Promise<number> {
  return ft.evaluate(
    'performance.getEntriesByType("resource").filter((e) => e.name.includes("nop-debugger-ai")).length',
  );
}

/** Copilot state text is rendered uppercased ('OFF'); compare case-insensitively with retries. */
async function expectCopilotState(ft: FtGlobal, state: string): Promise<void> {
  for (let i = 0; i < 30; i++) {
    const actual = await ft.evaluate('document.querySelector(\'[data-testid="debugger-ai-state"]\')?.textContent');
    if (typeof actual === 'string' && actual.trim().toLowerCase() === state) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  const final = await ft.evaluate('document.querySelector(\'[data-testid="debugger-ai-state"]\')?.textContent');
  throw new Error(`debugger-ai-state expected "${state}", got "${final}"`);
}

export default async function debuggerAi(ft: FtGlobal): Promise<void> {
  await ft.setViewportSize(1280, 800);

  await ft.goto('/#/debugger-lab');
  await ft.expectWeb(ft.getByRole('heading', { name: 'Debugger Lab', level: 1 })).toBeVisible({ timeoutMs: 45_000 });
  // The dev app loads hundreds of modules and overflows the default 250-entry
  // resource-timing buffer; clear it so the upcoming dynamic import is recorded.
  await ft.evaluate('performance.clearResourceTimings()');

  // Open the panel; default state = copilot off → four built-in tabs only.
  await ft.getByRole('button', { name: 'Show' }).click();
  await ft.expectWeb(ft.locator('.nop-debugger')).toBeVisible();
  await ft.expectWeb(ft.locator('.ndbg-tab')).toHaveCount(4);
  await expectCopilotState(ft, 'off');

  const demoLabel = ft.getByTestId('debugger-ai-demo-form').locator('label').first();
  // toHaveText rejects RegExp; containText on the label is the equivalent check
  await ft.expectWeb(demoLabel).toContainText('Project name', { timeoutMs: 15_000 });

  // Zero-load discriminator (negative half): nothing fetched the AI module yet.
  const preEnableFetches = await aiModuleFetchCount(ft);
  if (preEnableFetches !== 0) {
    throw new Error(`expected zero nop-debugger-ai fetches before enable, got ${preEnableFetches}`);
  }

  // Enable: dynamic import fires (positive half) and the AI tab registers.
  await ft.getByRole('button', { name: 'Enable AI Copilot' }).click();
  await expectCopilotState(ft, 'enabled');
  // Poll resource-timing until the dynamic import entry lands.
  let postEnableFetches = 0;
  for (let i = 0; i < 30; i++) {
    postEnableFetches = await aiModuleFetchCount(ft);
    if (postEnableFetches > 0) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  if (postEnableFetches <= 0) throw new Error('expected nop-debugger-ai dynamic import after enable, got none');
  await ft.expectWeb(ft.locator('.ndbg-tab')).toHaveCount(5);
  await ft.expectWeb(ft.locator('.ndbg-tab').last()).toContainText('AI');

  // Ask the demo copilot to rename the field; it stages a patch proposal.
  const textarea = ft.locator('.nop-debugger textarea').first();
  await textarea.fill('please rename the demo field');
  await textarea.press('Enter');

  const card = ft.locator('[data-slot="nop-patch-card"]').first();
  await ft.expectWeb(card).toBeVisible({ timeoutMs: 15_000 });
  await ft.expectWeb(card).toContainText('Archived project');

  // Adopt (the human gate): the host applier patches the demo schema.
  // Locale-agnostic: target by testid prefix (panel chrome follows the
  // playground locale, so button names are not stable).
  await card.locator('[data-testid^="ndbg-patch-adopt-"]').click();
  await ft.expectWeb(demoLabel).toContainText('Archived project', { timeoutMs: 15_000 });

  // Rollback: the applier restores the pre-apply snapshot.
  await card.locator('[data-testid^="ndbg-patch-rollback-"]').click();
  await ft.expectWeb(demoLabel).toContainText('Project name', { timeoutMs: 15_000 });

  // Disable: symmetric teardown (tab unregisters).
  await ft.getByRole('button', { name: 'Disable AI Copilot' }).click();
  await expectCopilotState(ft, 'off');
  await ft.expectWeb(ft.locator('.ndbg-tab')).toHaveCount(4);

  await expectNoPageErrors(ft, 'debugger-ai');
}
