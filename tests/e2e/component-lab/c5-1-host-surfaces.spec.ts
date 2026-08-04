import { expect, test, assertTrackedPageErrors } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C5.1 Phase 3 host scenarios (real browser, programmatic DOM asserts).
 *
 * 1. host-grid: an outer grid (columns 2, responsive sm:1/lg:2, gap token "md")
 *    hosts a nested 2-column grid plus a colSpan=2 item; the root emits only
 *    the nop-grid marker plus schema-authored overrides (no hardcoded layout
 *    classes).
 * 2. host-collapse: three-way expand-state ownership — local toggles, a
 *    controlled collapse driven by external scope value (host buttons, no
 *    local mutation), and a scope collapse writing valueStatePath.
 * 3. host-wizard-step: step 1 embeds a form (formId) with a required field;
 *    Next with an empty field blocks on validationError with an inline error,
 *    a filled field advances, and the final commit fires onComplete.
 * 4. host-wizard-gate: entering step B is gated by a probe namespace returning
 *    {ok:false} — navigation aborts while beforeLeave of A is still reported.
 * 5. host-wizard-dialog (bug 73 pattern — unit-green but real-browser failure
 *    risk): a wizard runs inside an openDialog surface; the step/commit/
 *    complete chain must hold in a real portal/focus environment.
 */

test('grid-host: nested responsive grid with marker-only root (host-grid)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('grid');

  const slug = scenarioSlug('Host nested grid with responsive columns (C5.1 Phase 3)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const grid = stage.locator('[data-testid="c5c1-grid"]');
  await expect(grid).toBeVisible({ timeout: 10_000 });
  await expect(grid).toHaveAttribute('data-slot', 'grid-root');
  // Desktop bucket: lg=2 wins.
  await expect(grid).toHaveAttribute('data-columns', '2');
  await expect(grid).not.toHaveAttribute('data-responsive');

  // Marker-only root contract: no hardcoded Tailwind layout classes beyond the
  // marker, the meta class, and the schema-authored gap token class.
  const classTokens = await grid.evaluate((el) => Array.from(el.classList));
  expect(classTokens).toContain('nop-grid');
  expect(classTokens).toContain('gap-4');
  expect(classTokens.filter((c) => c.startsWith('grid-cols-') || c === 'grid' || c.startsWith('flex'))).toEqual([]);

  const template = await grid.evaluate((el) => (el as HTMLElement).style.gridTemplateColumns);
  expect(template).toContain('repeat(2');

  // Nested grid inside a cell renders its own items with its own column count.
  const nested = stage.locator('[data-testid="c5c1-grid-nested"]');
  await expect(nested).toHaveAttribute('data-columns', '2');
  await expect(nested.locator('[data-slot="grid-item"]')).toHaveCount(4);
  await expect(nested.getByText('nested-1')).toBeVisible();
  await expect(nested.getByText('nested-4')).toBeVisible();

  // colSpan=2 item clamps to the outer effective column count.
  const wide = stage.locator('[data-testid="c5c1-grid-wide"]').locator('..');
  await expect(wide).toHaveAttribute('data-col-span', '2');

  await assertTrackedPageErrors(page);
});

test('collapse-host: local / controlled / scope expand ownership (host-collapse)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('collapse');

  const slug = scenarioSlug('Host collapse three-way ownership switching (C5.1 Phase 3)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  // Local: click expands.
  const local = stage.locator('[data-testid="c5c1-local"]');
  await expect(local).toBeVisible({ timeout: 10_000 });
  await local.locator('[data-item-key="l1"] [data-slot="collapse-trigger"]').click();
  await expect(local.locator('[data-item-key="l1"]')).toHaveAttribute('data-open');
  await expect(local.locator('[data-slot="collapse-content"]').getByText('local-body-A')).toBeVisible();

  // Controlled: external scope value drives the expand state.
  const controlled = stage.locator('[data-testid="c5c1-controlled"]');
  await expect(controlled).toBeVisible({ timeout: 10_000 });
  await stage.getByRole('button', { name: 'Set controlled = a' }).click();
  await expect(controlled.locator('[data-item-key="a"]')).toHaveAttribute('data-open');
  await expect(stage.locator('[data-testid="c5c1-ctrl-report"]')).toContainText('(a)');

  // Controlled click does NOT mutate local state (parent must update scope).
  await controlled.locator('[data-item-key="b"] [data-slot="collapse-trigger"]').click();
  await expect(controlled.locator('[data-item-key="a"]')).toHaveAttribute('data-open');
  await expect(controlled.locator('[data-item-key="b"]')).not.toHaveAttribute('data-open');

  // Host scope update echoes into the controlled collapse.
  await stage.getByRole('button', { name: 'Set controlled = b' }).click();
  await expect(controlled.locator('[data-item-key="b"]')).toHaveAttribute('data-open');
  await expect(controlled.locator('[data-item-key="a"]')).not.toHaveAttribute('data-open');

  // Scope: click writes the expand state back through valueStatePath.
  const scope = stage.locator('[data-testid="c5c1-scope"]');
  await expect(scope).toBeVisible({ timeout: 10_000 });
  await scope.locator('[data-item-key="s1"] [data-slot="collapse-trigger"]').click();
  await expect(scope.locator('[data-item-key="s1"]')).toHaveAttribute('data-open');
  await expect(stage.locator('[data-testid="c5c1-scope-report"]')).toContainText('scope:s1');

  await assertTrackedPageErrors(page);
});

test('wizard-host: embedded form validation blocks, then advances to onComplete (host-wizard-step)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('wizard');

  const slug = scenarioSlug('Host wizard step validation with embedded form (C5.1 Phase 3)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const wizard = stage.locator('[data-testid="c5c1-wizard-step"]');
  await expect(wizard).toBeVisible({ timeout: 10_000 });
  await expect(wizard).toHaveAttribute('data-current-step-index', '0');

  // Next with an empty required field: validationError + inline error, no advance.
  await stage.locator('[data-testid="wizard-next"]').click();
  await expect(wizard).toHaveAttribute('data-last-commit-status', 'validationError', {
    timeout: 10_000,
  });
  await expect(stage.locator('[data-slot="wizard-step-error"]')).toBeVisible();
  await expect(wizard).toHaveAttribute('data-current-step-index', '0');

  // Fill the field: validation passes, commit advances to step 1.
  await stage.getByLabel('Customer name').fill('Acme Corp');
  await stage.locator('[data-testid="wizard-next"]').click();
  await expect(wizard).toHaveAttribute('data-current-step-index', '1', { timeout: 10_000 });
  await expect(wizard).toHaveAttribute('data-last-commit-status', 'success');
  await expect(stage.locator('[data-testid="c5c1-review"]')).toBeVisible();

  // Final commit on the last step fires onComplete.
  await stage.locator('[data-testid="wizard-next"]').click();
  await expect(stage.locator('[data-testid="c5c1-wizard-done-report"]')).toHaveText(
    'wizard-done:yes',
    { timeout: 10_000 },
  );

  await assertTrackedPageErrors(page);
});

test('wizard-host: async beforeEnter gate blocks navigation (host-wizard-gate)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('wizard');

  const slug = scenarioSlug('Host wizard async gate beforeEnter/beforeLeave (C5.1 Phase 3)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const wizard = stage.locator('[data-testid="c5c1-wizard-gate"]');
  await expect(wizard).toBeVisible({ timeout: 10_000 });
  await expect(wizard).toHaveAttribute('data-current-step-index', '0');

  // Attempt to enter step B: beforeLeave of A reports, beforeEnter blocks.
  await wizard
    .locator('[data-slot="wizard-step-nav-button"][data-step-index="1"]')
    .click();
  await expect(stage.locator('[data-testid="c5c1-gate-report"]')).toHaveText('left-a:yes', {
    timeout: 10_000,
  });
  await expect(wizard).toHaveAttribute('data-current-step-index', '0');
  await expect(stage.locator('[data-testid="c5c1-gate-step-b"]')).toHaveCount(0);

  await assertTrackedPageErrors(page);
});

test('wizard-host: dialog-hosted wizard step/commit/complete chain (host-wizard-dialog, bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('wizard');

  const slug = scenarioSlug('Host wizard inside a dialog (C5.1 bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  await stage.locator('[data-testid="c5c1-open-wizard-dialog"]').click();
  // The dialog surface renders in a page-level portal (not inside the scenario
  // stage) — scope the wizard assertions through the dialog surface.
  const dialog = page.locator('[data-slot="dialog-surface"]');
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  const wizard = dialog.locator('[data-testid="c5c1-wizard-dialog"]');
  await expect(wizard).toBeVisible({ timeout: 10_000 });
  await expect(wizard).toHaveAttribute('data-current-step-index', '0');
  await expect(dialog.locator('[data-testid="c5c1-dialog-step-1"]')).toBeVisible();

  // Step through inside the dialog surface.
  await wizard.locator('[data-testid="wizard-next"]').click();
  await expect(wizard).toHaveAttribute('data-current-step-index', '1', { timeout: 10_000 });
  await expect(dialog.locator('[data-testid="c5c1-dialog-step-2"]')).toBeVisible();

  // Final commit fires onComplete — reported through the host window probe
  // (dialog content writes are scope-local by design; the probe is the
  // canonical cross-scope signal, dialog-edit-submit pattern).
  await wizard.locator('[data-testid="wizard-next"]').click();
  await expect(wizard).toHaveAttribute('data-last-commit-status', 'success', {
    timeout: 10_000,
  });
  await expect
    .poll(
      () =>
        page.evaluate(
          () => (window as unknown as { __c5c1DialogWizardProbe?: number }).__c5c1DialogWizardProbe,
        ),
      { timeout: 10_000 },
    )
    .toBe(1);

  await assertTrackedPageErrors(page);
});
