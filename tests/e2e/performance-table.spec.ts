import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// This measurement page mutates one shared host/runtime and is intentionally serialized.
test.describe.configure({ mode: 'serial' });

type DiagnosticsSession = {
  id: string;
  scenario: string;
  status: string;
  startedAt: number;
  endedAt?: number;
  changedRowKeys?: string[];
  changedItemKeys?: string[];
  targetProbeDelta?: { render: number; mount: number; unmount: number };
  siblingProbeDelta?: { render: number; mount: number; unmount: number };
  targetItemProbeDelta?: { render: number; mount: number; unmount: number };
  siblingItemProbeDelta?: { render: number; mount: number; unmount: number };
  unchangedRowUnmountDelta?: number;
  unchangedItemUnmountDelta?: number;
  validationPathCheck?: {
    expectedPath?: string;
    observedWritePath?: string;
    observedValidationPath?: string;
    usedItemKeyPath?: boolean;
  };
  debuggerSummary?: {
    covered: boolean;
    failureCount: number;
    errorCount: number;
    coverageEvidence?: {
      schemaUrl?: string;
      inspectedProbeKey?: string;
      rendererType?: string;
      matchedByElement?: boolean;
    };
  };
  visibleSnapshot?: {
    targetValueBefore?: string;
    targetValueAfter?: string;
    siblingPrevValueBefore?: string;
    siblingPrevValueAfter?: string;
    siblingNextValueBefore?: string;
    siblingNextValueAfter?: string;
  };
};

type DebuggerAutomationEvidence = {
  available: boolean;
  inspectedProbeKey?: string;
  rendererType?: string;
  path?: string;
  instancePath?: unknown;
  errorCount: number;
  failureCount: number;
};

async function openPerformanceTable(page: import('@playwright/test').Page) {
  await page.goto('/#/performance-table', { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: 'Table Performance Playground', level: 1 })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole('button', { name: 'Run 20 Host Mutations' })).toBeVisible();
  await assertTrackedPageErrors(page);
}

async function openPerformanceTableDiagnostics(page: import('@playwright/test').Page) {
  await page.goto('/?diagnostics=1#/performance-table', { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: 'Table Performance Playground', level: 1 })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole('button', { name: 'Run Single Row Locality Diagnostic' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run Array Item Locality Diagnostic' })).toBeVisible();
  await expect(page.getByText('Diagnostics mode is enabled.')).toBeVisible();
  await assertTrackedPageErrors(page);
}

async function readLatestDiagnosticsSession(
  page: import('@playwright/test').Page,
): Promise<DiagnosticsSession | null> {
  return page.evaluate(() => {
    const diagnostics = window.__NOP_PERF_DIAGNOSTICS__;
    return (diagnostics?.getLatestSession() ?? null) as DiagnosticsSession | null;
  });
}

async function waitForFreshDiagnosticsSession(input: {
  page: import('@playwright/test').Page;
  scenario: DiagnosticsSession['scenario'];
  previousId?: string;
  startedAfter: number;
}) {
  await expect
    .poll(async () => readLatestDiagnosticsSession(input.page), {
      timeout: 45_000,
      message: `Expected fresh diagnostics session for ${input.scenario}`,
    })
    .toMatchObject({
      scenario: input.scenario,
      status: 'completed',
    });

  await expect
    .poll(async () => {
      const latest = await readLatestDiagnosticsSession(input.page);
      if (!latest) {
        return null;
      }

      const isFresh =
        latest.id !== input.previousId &&
        latest.scenario === input.scenario &&
        latest.status === 'completed' &&
        latest.startedAt >= input.startedAfter &&
        typeof latest.endedAt === 'number' &&
        latest.endedAt >= latest.startedAt;

      return isFresh ? latest : null;
    }, { timeout: 45_000 })
    .not.toBeNull();

  return (await readLatestDiagnosticsSession(input.page)) as DiagnosticsSession;
}

async function readDebuggerAutomationEvidence(input: {
  page: import('@playwright/test').Page;
  probeTestId: string;
  sessionId: string;
  startedAfter: number;
}): Promise<DebuggerAutomationEvidence> {
  const { page, probeTestId, sessionId, startedAfter } = input;
  return page.evaluate(({ probeTestId, sessionId, startedAfter }) => {
    const api = (window as typeof window & {
      __NOP_DEBUGGER_API__?: {
        inspectByElement(element: HTMLElement): {
          rendererType?: string;
          path?: string;
          instancePath?: unknown;
        } | undefined;
        queryEvents(query?: { kind?: string; interactionId?: string; sinceTimestamp?: number }): unknown[];
        getRecentFailures(options?: { sinceTimestamp?: number; limit?: number }): unknown[];
      };
    }).__NOP_DEBUGGER_API__;

    const probeElement = document.querySelector(`[data-testid="${probeTestId}"]`) as HTMLElement | null;
    const inspected = api && probeElement ? api.inspectByElement(probeElement) : undefined;
    const errors = api?.queryEvents({ kind: 'error', interactionId: sessionId, sinceTimestamp: startedAfter }) ?? [];
    const failures = api?.getRecentFailures({ sinceTimestamp: startedAfter, limit: 10 }) ?? [];

    return {
      available: Boolean(api),
      inspectedProbeKey: probeElement?.getAttribute('data-probe-key') ?? undefined,
      rendererType: inspected?.rendererType,
      path: inspected?.path,
      instancePath: inspected?.instancePath,
      errorCount: errors.length,
      failureCount: failures.length,
    } satisfies DebuggerAutomationEvidence;
  }, { probeTestId, sessionId, startedAfter });
}

async function waitForTableRows(page: import('@playwright/test').Page) {
  await expect(page.locator('table tbody tr[data-slot="table-row"]').first()).toBeVisible({
    timeout: 45_000,
  });
}

test.describe('Performance Table Page', () => {
  test('switches scenario modes and updates host-mutation measurement output', async ({ page }) => {
    test.setTimeout(120_000);

    await openPerformanceTable(page);

    await page.getByRole('button', { name: 'Scope Read Stress' }).click();

    await expect(page.getByText('Scenario A: Broad aggregate watchers')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Scenario A2: Scope read / full snapshot stress')).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole('button', { name: 'Table Only' }).click();
    await expect(page.getByText('Scenario A: Broad aggregate watchers')).toHaveCount(0, {
      timeout: 20_000,
    });
    await expect(page.getByText('Scenario A2: Scope read / full snapshot stress')).toHaveCount(0, {
      timeout: 20_000,
    });

    await page.getByRole('button', { name: 'Full Stress' }).click();
    await expect(page.getByText('Scenario B: Nested loop card list')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Primary: editor-offline').first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Scenario C: Scope-owned selection and pagination')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Scenario D: Editable subset form')).toBeVisible({
      timeout: 20_000,
    });
    await assertTrackedPageErrors(page);

    await page.getByRole('button', { name: 'Run 20 Host Mutations' }).click();
    await expect(page.getByText('Last Measurement')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText('Host row mutation benchmark: 20 updates')).toBeVisible({
      timeout: 90_000,
    });
    await expect
      .poll(() =>
        page.evaluate(() => {
          const cards = Array.from(document.querySelectorAll('.text-lg.font-semibold'));
          const commitsCard = cards[3]?.textContent?.trim() ?? '0';
          return Number.parseInt(commitsCard, 10);
        }),
      )
      .toBeGreaterThan(0);
    await expect(page.getByText(/Scheduling \+ settle:/)).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText(/Commit count:/)).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText(/Total commit duration:/)).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText('Primary: editor-offline').first()).toBeVisible({
      timeout: 20_000,
    });
    await assertTrackedPageErrors(page);
  });

  test('resets the measurement panel after a host benchmark run', async ({ page }) => {
    test.setTimeout(120_000);

    await openPerformanceTable(page);

    await page.getByRole('button', { name: 'Run 20 Host Mutations' }).click();
    await expect(page.getByText('Last Measurement')).toBeVisible({ timeout: 90_000 });

    await page.getByRole('button', { name: 'Reset Metrics' }).click();
    await expect(page.getByText('Last Measurement')).toHaveCount(0);
  });

  test('renders all cell types with correct record-bound values on first and last pages', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openPerformanceTable(page);
    await waitForTableRows(page);

    const firstRow = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr[data-slot="table-row"]'));
      const dataRow = rows.find((row) => row.querySelectorAll('td').length >= 10);
      if (!dataRow) return null;
      const cells = dataRow.querySelectorAll('td');
      const profile = cells[2]?.textContent?.trim();
      const badge = cells[3]?.textContent?.trim();
      const status = cells[4]?.textContent?.trim();
      const selectBtn = cells[5]?.querySelector('button[role="combobox"]');
      const selectEl = cells[5]?.querySelector('select') as HTMLSelectElement | null;
      const checkbox = cells[6]?.querySelector('[data-slot="checkbox"]');
      const sw = cells[7]?.querySelector('[role="switch"]');
      const textarea = cells[8]?.querySelector('textarea');
      return {
        profile,
        badge,
        status,
        select: selectBtn?.textContent?.trim() ?? selectEl?.selectedOptions[0]?.textContent?.trim(),
        checkboxChecked: checkbox?.getAttribute('aria-checked'),
        switchChecked: sw?.getAttribute('aria-checked'),
        notes: textarea?.value?.trim(),
      };
    });

    expect(firstRow).not.toBeNull();
    expect(firstRow!.profile).toBe('1. user_1 <user_1@perf.dev>');
    expect(firstRow!.badge).toBe('editor');
    expect(firstRow!.status).toBe('PAUSED / offline');
    expect(firstRow!.select?.toUpperCase()).toContain('EMEA');
    expect(firstRow!.checkboxChecked).toBe('true');
    expect(firstRow!.switchChecked).toBe('false');
    expect(firstRow!.notes).toContain('Row 1 note');

    const lastPageBtn = page.locator('[data-slot="table-pagination"]').getByText('20');
    if (await lastPageBtn.isVisible()) {
      await lastPageBtn.click();
    } else {
      for (let i = 0; i < 20; i++) {
        const next = page
          .locator('[data-slot="table-pagination"] button, [data-slot="table-pagination"] a')
          .last();
        await next.click();
        await expect(page.locator('table tbody tr')).toHaveCount(50);
      }
    }
    await expect
      .poll(() =>
        page.evaluate(() => {
          const rows = Array.from(document.querySelectorAll('table tbody tr[data-slot="table-row"]'));
          return rows
            .some((row) => row.textContent?.includes('951'));
        }),
      )
      .toBe(true);

    const lastPageFirstRow = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr[data-slot="table-row"]'));
      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('td');
        const profile = cells[2]?.textContent?.trim();
        if (profile && profile.includes('951')) {
          const sw = cells[7]?.querySelector('[role="switch"]');
          return { profile, switchChecked: sw?.getAttribute('aria-checked') };
        }
      }
      return null;
    });
    expect(lastPageFirstRow).not.toBeNull();
    expect(lastPageFirstRow!.profile).toContain('951');

    const lastRow = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr[data-slot="table-row"]'));
      for (let i = rows.length - 1; i >= 0; i--) {
        const cells = rows[i].querySelectorAll('td');
        const profile = cells[2]?.textContent?.trim();
        if (profile && profile.includes('1000')) {
          const sw = cells[7]?.querySelector('[role="switch"]');
          const cb = cells[6]?.querySelector('[data-slot="checkbox"]');
          return {
            profile,
            switchChecked: sw?.getAttribute('aria-checked'),
            checkboxChecked: cb?.getAttribute('aria-checked'),
          };
        }
      }
      return null;
    });
    expect(lastRow).not.toBeNull();
    expect(lastRow!.profile).toContain('1000');
    expect(lastRow!.switchChecked).toBe('true');
    expect(lastRow!.checkboxChecked).toBe('false');
  });

  test('keeps tag-list validation local to the edited row', async ({ page }) => {
    test.setTimeout(120_000);
    await openPerformanceTable(page);
    await waitForTableRows(page);

    const firstTagButton = page.getByRole('button', { name: 'tag-1' }).first();
    await expect(firstTagButton).toBeVisible();

    await firstTagButton.click();

    await expect(page.getByText('requires at least one tag')).toHaveCount(0);
  });

  test('records a supported table single-row locality diagnostic session', async ({ page }) => {
    test.setTimeout(120_000);

    await openPerformanceTableDiagnostics(page);

    const browserBefore = Date.now();
    const previousSession = await readLatestDiagnosticsSession(page);

    await page.getByRole('button', { name: 'Run Single Row Locality Diagnostic' }).click();

    const session = await waitForFreshDiagnosticsSession({
      page,
      scenario: 'table-single-row-locality',
      previousId: previousSession?.id,
      startedAfter: browserBefore,
    });
    const automationEvidence = await readDebuggerAutomationEvidence({
      page,
      probeTestId: 'table-target-row-probe',
      sessionId: session.id,
      startedAfter: browserBefore,
    });

    expect(session.id).toBeTruthy();
    expect(session.changedRowKeys).toEqual(['user-25']);
    expect(session.targetProbeDelta?.render).toBeGreaterThan(0);
    expect(session.siblingProbeDelta?.render).toBe(0);
    expect(session.siblingProbeDelta?.mount).toBe(0);
    expect(session.siblingProbeDelta?.unmount).toBe(0);
    expect(session.unchangedRowUnmountDelta).toBe(0);
    expect(session.visibleSnapshot?.targetValueBefore).not.toBe(session.visibleSnapshot?.targetValueAfter);
    expect(session.visibleSnapshot?.siblingPrevValueBefore).toBe(session.visibleSnapshot?.siblingPrevValueAfter);
    expect(session.visibleSnapshot?.siblingNextValueBefore).toBe(session.visibleSnapshot?.siblingNextValueAfter);
    expect(session.debuggerSummary?.covered).toBe(true);
    expect(session.debuggerSummary?.failureCount).toBe(0);
    expect(session.debuggerSummary?.errorCount).toBe(0);
    expect(session.debuggerSummary?.coverageEvidence?.schemaUrl).toBe(
      'playground://pages/performance-table/table-only?diagnostics=1',
    );
    expect(session.debuggerSummary?.coverageEvidence?.inspectedProbeKey).toBe('table-target-row');
    expect(session.debuggerSummary?.coverageEvidence?.rendererType).toBe('perf-render-probe');
    expect(session.debuggerSummary?.coverageEvidence?.matchedByElement).toBe(true);
    expect(automationEvidence.available).toBe(true);
    expect(automationEvidence.inspectedProbeKey).toBe('table-target-row');
    expect(automationEvidence.rendererType).toBe('perf-render-probe');
    expect(String(automationEvidence.path)).toContain('$.body[');
    expect(automationEvidence.instancePath).toBeTruthy();
    expect(automationEvidence.errorCount).toBe(0);
    expect(automationEvidence.failureCount).toBe(0);
  });

  test('records a supported array item locality diagnostic session', async ({ page }) => {
    test.setTimeout(120_000);

    await openPerformanceTableDiagnostics(page);

    const browserBefore = Date.now();
    const previousSession = await readLatestDiagnosticsSession(page);

    await page.getByRole('button', { name: 'Run Array Item Locality Diagnostic' }).click();

    const session = await waitForFreshDiagnosticsSession({
      page,
      scenario: 'array-item-locality',
      previousId: previousSession?.id,
      startedAfter: browserBefore,
    });
    const automationEvidence = await readDebuggerAutomationEvidence({
      page,
      probeTestId: 'array-target-item-probe',
      sessionId: session.id,
      startedAfter: browserBefore,
    });

    expect(session.id).toBeTruthy();
    expect(session.changedItemKeys).toEqual(['line-8']);
    expect(session.targetItemProbeDelta?.render).toBeGreaterThan(0);
    expect(session.siblingItemProbeDelta?.render).toBe(0);
    expect(session.siblingItemProbeDelta?.mount).toBe(0);
    expect(session.siblingItemProbeDelta?.unmount).toBe(0);
    expect(session.unchangedItemUnmountDelta).toBe(0);
    expect(session.validationPathCheck?.expectedPath).toBe('lineItems.7.qty');
    expect(session.validationPathCheck?.observedWritePath).toBe('lineItems.7.qty');
    expect(session.validationPathCheck?.observedValidationPath).toBe('lineItems.7.qty');
    expect(session.validationPathCheck?.usedItemKeyPath).toBe(false);
    expect(session.visibleSnapshot?.targetValueBefore).not.toBe(session.visibleSnapshot?.targetValueAfter);
    expect(session.visibleSnapshot?.siblingPrevValueBefore).toBe(session.visibleSnapshot?.siblingPrevValueAfter);
    expect(session.visibleSnapshot?.siblingNextValueBefore).toBe(session.visibleSnapshot?.siblingNextValueAfter);
    expect(session.debuggerSummary?.covered).toBe(true);
    expect(session.debuggerSummary?.failureCount).toBe(0);
    expect(session.debuggerSummary?.errorCount).toBe(0);
    expect(session.debuggerSummary?.coverageEvidence?.schemaUrl).toBe(
      'playground://pages/performance-table/table-only?diagnostics=1',
    );
    expect(session.debuggerSummary?.coverageEvidence?.inspectedProbeKey).toBe('array-target-item');
    expect(session.debuggerSummary?.coverageEvidence?.rendererType).toBe('perf-render-probe');
    expect(session.debuggerSummary?.coverageEvidence?.matchedByElement).toBe(true);
    expect(automationEvidence.available).toBe(true);
    expect(automationEvidence.inspectedProbeKey).toBe('array-target-item');
    expect(automationEvidence.rendererType).toBe('perf-render-probe');
    expect(String(automationEvidence.path)).toContain('$.body[');
    expect(automationEvidence.instancePath).toBeTruthy();
    expect(automationEvidence.errorCount).toBe(0);
    expect(automationEvidence.failureCount).toBe(0);
  });
});
