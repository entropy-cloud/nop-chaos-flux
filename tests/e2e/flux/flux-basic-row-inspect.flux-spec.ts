import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * flux-basic table Inspect opens the matching row dialog without browser errors.
 *
 * Migrated from tests/e2e/flux-basic-row-inspect.spec.ts (E3 batch 3, engine swap +
 * kernel white-box error gate: expectNoPageErrors asserted BOTH after initial page
 * load and after every Inspect/Close cycle (old spec only checked the tracked-error
 * fixture once at load), plus the __NOP_DEBUGGER_API__ snapshot retained verbatim
 * through ft.evaluate).
 *
 * TODO(migrate-debt): evaluate fallback — the window.__NOP_DEBUGGER_API__ white-box
 * snapshot is not expressible with locators; read goes through ft.evaluate with
 * page-side JSON.stringify, mirroring the old page.evaluate body.
 */

const EXPECTED_ROWS = [
  { username: 'alice', email: 'alice@example.com' },
  { username: 'bob', email: 'bob@example.com' },
  { username: 'carol', email: 'carol@example.com' },
];

export default async function fluxBasicRowInspect(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);
  await ft.goto('/#/flux-basic');
  const heading = ft.getByRole('heading', { name: 'Renderer Playground', level: 1 });
  await ft.expectWeb(heading).toBeVisible({ timeoutMs: 15_000 });
  await expectNoPageErrors(ft, 'flux-basic-row-inspect:load');

  const inspectButtons = ft.getByRole('button', { name: 'Inspect' });
  await ft.expectWeb(inspectButtons.nth(EXPECTED_ROWS.length - 1)).toBeVisible({ timeoutMs: 10_000 });

  for (const [index, row] of EXPECTED_ROWS.entries()) {
    await inspectButtons.nth(index).click();

    const dialog = ft.locator('[data-slot="dialog-surface"]');
    await ft.expectWeb(dialog).toBeVisible();
    await ft.expectWeb(dialog).toContainText('User Details');
    await ft.expectWeb(dialog).toContainText(`User: ${row.username}`);
    await ft.expectWeb(dialog).toContainText(`Email: ${row.email}`);

    // scoped to the dialog surface: the dialog chrome's own close carries
    // i18n text (关闭); the content-level Close button is the renderer button
    const closeButton = ft.locator('[data-slot="dialog-surface"] button:not([data-slot="dialog-close"])');
    await ft.expectWeb(closeButton).toBeVisible();
    await closeButton.click();
    await ft.expectWeb(dialog).toHaveCount(0);

    await expectNoPageErrors(ft, `flux-basic-row-inspect:row-${row.username}`);
  }

  const snapshot = JSON.parse(
    String(
      await ft.evaluate(
        `(() => {
          const api = window.__NOP_DEBUGGER_API__;
          return JSON.stringify({
            latestError: (api && typeof api.getLatestError === 'function') ? (api.getLatestError() ?? null) : null,
            latestFailedAction: (api && typeof api.getLatestFailedAction === 'function') ? (api.getLatestFailedAction() ?? null) : null,
          });
        })()`,
      ),
    ),
  );
  if (snapshot.latestError !== null || snapshot.latestFailedAction !== null) {
    throw new Error(`debugger snapshot should be clean, got ${JSON.stringify(snapshot)}`);
  }

  return { cases: EXPECTED_ROWS.length };
}
