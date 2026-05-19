import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import type { NopDebuggerController } from '@nop-chaos/nop-debugger';
import { Button } from '@nop-chaos/ui';
import {
  type BatchRunSummary,
  type PerfLineItem,
  type PerfRow,
  type PerformanceMode,
  type RenderMetrics,
  computeProbeDeltas,
  createBatchTransform,
  createLineItems,
  createPerformanceDiagnosticsStore,
  createRows,
  diffChangedItemKeys,
  diffChangedRowKeys,
  diffProfiler,
  getModeDescription,
  INITIAL_METRICS,
  recordProfilerCommit,
  snapshotProfiler,
  summarizeBatchRun,
  waitForMetricQuiescence,
  PerformanceSchemaStage,
  buildPerformanceData,
  createSessionId,
  getActiveDiagnosticsFormRuntime,
  getActiveDiagnosticsPageRuntime,
  getVisibleRowProfile,
  hasDiagnosticsProbe,
  performanceEnv,
  readDebuggerSessionSummary,
} from './performance-table/index.js';
import { createPerformanceSchema } from './performance-table/schema.js';

const TABLE_TARGET_ROW_INDEX = 24;
const TABLE_PREV_SIBLING_ROW_INDEX = 23;
const TABLE_NEXT_SIBLING_ROW_INDEX = 25;
const ARRAY_TARGET_ITEM_INDEX = 7;
const ARRAY_PREV_SIBLING_ITEM_INDEX = 6;
const ARRAY_NEXT_SIBLING_ITEM_INDEX = 8;

interface PerformanceTablePageProps {
  onBack: () => void;
  debuggerController?: NopDebuggerController;
  diagnosticsEnabled?: boolean;
}

function readDiagnosticsProbe(selector: string) {
  return document.querySelector(selector) as HTMLElement | null;
}

function readProbeTrackedValue(testId: string): string | undefined {
  return readDiagnosticsProbe(`[data-testid="${testId}"]`)?.getAttribute('data-tracked-value') ?? undefined;
}

async function waitForProbeTrackedValue(
  testId: string,
  expectedValue: string,
  timeoutMs = 2000,
): Promise<boolean> {
  const startedAt = performance.now();

  while (performance.now() - startedAt < timeoutMs) {
    if (readProbeTrackedValue(testId) === expectedValue) {
      return true;
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  return readProbeTrackedValue(testId) === expectedValue;
}

export function PerformanceTablePage({
  onBack,
  debuggerController,
  diagnosticsEnabled = false,
}: PerformanceTablePageProps) {
  const [mode, setMode] = useState<PerformanceMode>('table-only');
  const [perfRows, setPerfRows] = useState<PerfRow[]>(() => createRows(1000));
  const [lineItems, setLineItems] = useState<PerfLineItem[]>(() => createLineItems(12));
  const [metrics, setMetrics] = useState<RenderMetrics>(INITIAL_METRICS);
  const [batchSummary, setBatchSummary] = useState<BatchRunSummary | null>(null);
  const [lastValidationPath, setLastValidationPath] = useState<string>('');
  const metricsRef = useRef(metrics);
  const perfRowsRef = useRef(perfRows);
  const lineItemsRef = useRef(lineItems);
  const diagnosticsStoreRef = useRef(createPerformanceDiagnosticsStore());

  const initialRows = useMemo(() => createRows(1000), []);
  const initialLineItems = useMemo(() => createLineItems(12), []);
  const batchTransform = useMemo(() => createBatchTransform(), []);

  useEffect(() => {
    perfRowsRef.current = perfRows;
  }, [perfRows]);

  useEffect(() => {
    lineItemsRef.current = lineItems;
  }, [lineItems]);

  useEffect(() => {
    if (!diagnosticsEnabled) {
      delete window.__NOP_PERF_DIAGNOSTICS__;
      return;
    }

    const store = diagnosticsStoreRef.current;
    window.__NOP_PERF_DIAGNOSTICS__ = store;
    return () => {
      if (window.__NOP_PERF_DIAGNOSTICS__ === store) {
        delete window.__NOP_PERF_DIAGNOSTICS__;
      }
      store.clear();
    };
  }, [diagnosticsEnabled]);

  const tableTargetRowKey = perfRows[TABLE_TARGET_ROW_INDEX]?.id ?? 'user-25';
  const tablePrevSiblingRowKey = perfRows[TABLE_PREV_SIBLING_ROW_INDEX]?.id ?? 'user-24';
  const tableNextSiblingRowKey = perfRows[TABLE_NEXT_SIBLING_ROW_INDEX]?.id ?? 'user-26';
  const arrayTargetItemKey = lineItems[ARRAY_TARGET_ITEM_INDEX]?.itemKey ?? 'line-8';
  const arrayPrevSiblingItemKey = lineItems[ARRAY_PREV_SIBLING_ITEM_INDEX]?.itemKey ?? 'line-7';
  const arrayNextSiblingItemKey = lineItems[ARRAY_NEXT_SIBLING_ITEM_INDEX]?.itemKey ?? 'line-9';

  const probes = useMemo(
    () => ({
      tableTargetRowKey,
      tablePrevSiblingRowKey,
      tableNextSiblingRowKey,
      arrayTargetItemKey,
      arrayPrevSiblingItemKey,
      arrayNextSiblingItemKey,
    }),
    [
      arrayNextSiblingItemKey,
      arrayPrevSiblingItemKey,
      arrayTargetItemKey,
      tableNextSiblingRowKey,
      tablePrevSiblingRowKey,
      tableTargetRowKey,
    ],
  );

  const schema = useMemo(
    () => createPerformanceSchema(mode, { diagnosticsEnabled, probes }),
    [diagnosticsEnabled, mode, probes],
  );

  const env = useMemo<RendererEnv>(() => performanceEnv, []);

  const data = useMemo(
    () =>
      buildPerformanceData({
        perfRows,
        initialRows,
        lineItems,
        initialLineItems,
        diagnosticsEnabled,
      }),
    [diagnosticsEnabled, initialLineItems, initialRows, lineItems, perfRows],
  );

  const handleProfilerCommit = useCallback((actualDuration: number) => {
    setMetrics((current) => {
      const next = recordProfilerCommit(current, actualDuration, Date.now());
      metricsRef.current = next;
      diagnosticsStoreRef.current.recordProfilerSnapshot(snapshotProfiler(next));
      return next;
    });
  }, []);

  async function runHostBatch(label: string, steps: number) {
    const before = metricsRef.current;
    const schedulingStartedAt = performance.now();

    setBatchSummary(null);

    for (let step = 0; step < steps; step += 1) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          startTransition(() => {
            setPerfRows((currentRows) => batchTransform(currentRows));
          });
          resolve();
        });
      });
    }

    const schedulingEndedAt = performance.now();
    const after = await waitForMetricQuiescence({ getMetrics: () => metricsRef.current });
    const settledAt = performance.now();

    setBatchSummary(
      summarizeBatchRun({
        label,
        steps,
        before,
        after,
        schedulingStartedAt,
        schedulingEndedAt,
        settledAt,
      }),
    );
  }

  const runSingleRowDiagnostic = useCallback(async () => {
    const diagnostics = diagnosticsStoreRef.current;
    const targetRowKey = probes.tableTargetRowKey;
    const prevSiblingRowKey = probes.tablePrevSiblingRowKey;
    const nextSiblingRowKey = probes.tableNextSiblingRowKey;
    const previousId = diagnostics.getLatestSession()?.id;
    const sessionId = createSessionId('table-single-row-locality');
    const startedAt = Date.now();

    const beforeRows = perfRowsRef.current;
    const beforeProbeCounters = diagnostics.getProbeCounters();
    const beforeProfiler = snapshotProfiler(metricsRef.current);
    diagnostics.startSession({
      id: sessionId,
      scenario: 'table-single-row-locality',
      profilerBefore: beforeProfiler,
    });

    const targetIndex = beforeRows.findIndex((row) => row.id === targetRowKey);
    const prevIndex = beforeRows.findIndex((row) => row.id === prevSiblingRowKey);
    const nextIndex = beforeRows.findIndex((row) => row.id === nextSiblingRowKey);
    const targetValueBefore = getVisibleRowProfile(targetRowKey);
    const siblingPrevValueBefore = getVisibleRowProfile(prevSiblingRowKey);
    const siblingNextValueBefore = getVisibleRowProfile(nextSiblingRowKey);

    if (targetIndex < 0 || prevIndex < 0 || nextIndex < 0) {
      diagnostics.failSession(sessionId, 'Stable visible row keys were not found in the current dataset.');
      return;
    }

    if (
      !hasDiagnosticsProbe('[data-testid="table-target-row-probe"]') ||
      !hasDiagnosticsProbe('[data-testid="table-prev-sibling-row-probe"]') ||
      !hasDiagnosticsProbe('[data-testid="table-next-sibling-row-probe"]')
    ) {
      diagnostics.failSession(sessionId, 'Target or sibling row probes are not materialized on the visible page.');
      return;
    }

    const diagnosticsPage = getActiveDiagnosticsPageRuntime();
    if (!diagnosticsPage) {
      diagnostics.failSession(sessionId, 'Diagnostics page runtime is not mounted.');
      return;
    }

    let nextRowsSnapshot = beforeRows;
    const targetRow = beforeRows[targetIndex];
    const expectedTargetValue = `${targetRow?.username ?? ''}_diag`;
    const nextScore = ((targetRow.score + 17) % 100) + 1;
    const nextScoreBand = nextScore < 60 ? 'low' : nextScore < 85 ? 'mid' : 'high';
    const nextNotes = `${targetRow.notes} [diag]`;
    const rowPath = `perfRows.${targetIndex}`;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        startTransition(() => {
          diagnosticsPage.scope.update(`${rowPath}.username`, expectedTargetValue);
          diagnosticsPage.scope.update(`${rowPath}.score`, nextScore);
          diagnosticsPage.scope.update(`${rowPath}.scoreBand`, nextScoreBand);
          diagnosticsPage.scope.update(`${rowPath}.notes`, nextNotes);
          setPerfRows((currentRows) => {
            const nextRows = currentRows.slice();
            nextRows[targetIndex] = {
              ...currentRows[targetIndex],
              username: expectedTargetValue,
              score: nextScore,
              scoreBand: nextScoreBand,
              notes: nextNotes,
            };
            nextRowsSnapshot = nextRows;
            return nextRows;
          });
        });
        resolve();
      });
    });

    await waitForProbeTrackedValue('table-target-row-probe', expectedTargetValue);
    await waitForMetricQuiescence({ getMetrics: () => metricsRef.current });

    const afterRows = nextRowsSnapshot;
    const afterProbeCounters = diagnostics.getProbeCounters();
    const probeDeltas = computeProbeDeltas({
      before: beforeProbeCounters,
      after: afterProbeCounters,
      probeKeys: ['table-target-row', 'table-prev-sibling-row', 'table-next-sibling-row'],
    });
    const profilerAfter = snapshotProfiler(metricsRef.current);
    const debuggerSummary = readDebuggerSessionSummary({
      debuggerController,
      sessionId,
      startedAt,
      probeSelector: '[data-testid="table-target-row-probe"]',
      expectedSchemaUrl: `playground://pages/performance-table/${mode}?diagnostics=1`,
      expectedProbeKey: 'table-target-row',
    });

    diagnostics.completeSession(sessionId, {
      status:
        previousId !== sessionId &&
        debuggerSummary.covered &&
        debuggerSummary.failureCount === 0 &&
        debuggerSummary.errorCount === 0
          ? 'completed'
          : 'failed',
      profilerAfter,
      profilerDelta: diffProfiler(beforeProfiler, profilerAfter),
      changedRowKeys: diffChangedRowKeys(beforeRows, afterRows),
      probeDeltas,
      debuggerSummary,
      targetRowKey,
      targetProbeDelta: probeDeltas['table-target-row'],
      siblingPrevProbeDelta: probeDeltas['table-prev-sibling-row'],
      siblingNextProbeDelta: probeDeltas['table-next-sibling-row'],
      siblingProbeDelta: {
        render:
          (probeDeltas['table-prev-sibling-row']?.render ?? 0) +
          (probeDeltas['table-next-sibling-row']?.render ?? 0),
        mount:
          (probeDeltas['table-prev-sibling-row']?.mount ?? 0) +
          (probeDeltas['table-next-sibling-row']?.mount ?? 0),
        unmount:
          (probeDeltas['table-prev-sibling-row']?.unmount ?? 0) +
          (probeDeltas['table-next-sibling-row']?.unmount ?? 0),
      },
      unchangedRowUnmountDelta:
        (probeDeltas['table-prev-sibling-row']?.unmount ?? 0) +
        (probeDeltas['table-next-sibling-row']?.unmount ?? 0),
      visibleSnapshot: {
        targetValueBefore,
        targetValueAfter: getVisibleRowProfile(targetRowKey),
        siblingPrevValueBefore,
        siblingPrevValueAfter: getVisibleRowProfile(prevSiblingRowKey),
        siblingNextValueBefore,
        siblingNextValueAfter: getVisibleRowProfile(nextSiblingRowKey),
      },
    });
  }, [debuggerController, mode, probes]);

  const runArrayItemDiagnostic = useCallback(async () => {
    const diagnostics = diagnosticsStoreRef.current;
    const targetItemKey = probes.arrayTargetItemKey;
    const _prevSiblingItemKey = probes.arrayPrevSiblingItemKey;
    const _nextSiblingItemKey = probes.arrayNextSiblingItemKey;
    const sessionId = createSessionId('array-item-locality');
    const startedAt = Date.now();

    const beforeItems = lineItemsRef.current;
    const beforeProbeCounters = diagnostics.getProbeCounters();
    const beforeProfiler = snapshotProfiler(metricsRef.current);
    diagnostics.startSession({
      id: sessionId,
      scenario: 'array-item-locality',
      profilerBefore: beforeProfiler,
    });

    const targetIndex = beforeItems.findIndex((item) => item.itemKey === targetItemKey);
    if (targetIndex < 0) {
      diagnostics.failSession(sessionId, 'Target array item key was not found.');
      return;
    }

    const diagnosticsForm = getActiveDiagnosticsFormRuntime();
    if (!diagnosticsForm) {
      diagnostics.failSession(sessionId, 'Diagnostics form runtime is not mounted.');
      return;
    }

    if (
      !hasDiagnosticsProbe('[data-testid="array-target-item-probe"]') ||
      !hasDiagnosticsProbe('[data-testid="array-prev-sibling-item-probe"]') ||
      !hasDiagnosticsProbe('[data-testid="array-next-sibling-item-probe"]')
    ) {
      diagnostics.failSession(sessionId, 'Target or sibling array probes are not materialized.');
      return;
    }

    const nextQty = beforeItems[targetIndex].qty + 5;
    const targetPath = `lineItems.${targetIndex}.qty`;
    const prevQty = beforeItems[targetIndex - 1]?.qty;
    const nextSiblingQty = beforeItems[targetIndex + 1]?.qty;
    setLastValidationPath(targetPath);

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        startTransition(() => {
          diagnosticsForm.setValue(targetPath, nextQty);
        });
        resolve();
      });
    });

    await diagnosticsForm.validateField(targetPath);
    await waitForProbeTrackedValue('array-target-item-probe', String(nextQty));
    await waitForMetricQuiescence({ getMetrics: () => metricsRef.current });

    const afterItems = beforeItems.map((item, index) =>
      index === targetIndex ? { ...item, qty: nextQty, note: `${item.note} [diag]` } : item,
    );
    const afterProbeCounters = diagnostics.getProbeCounters();
    const probeDeltas = computeProbeDeltas({
      before: beforeProbeCounters,
      after: afterProbeCounters,
      probeKeys: ['array-target-item', 'array-prev-sibling-item', 'array-next-sibling-item'],
    });
    const profilerAfter = snapshotProfiler(metricsRef.current);
    const debuggerSummary = readDebuggerSessionSummary({
      debuggerController,
      sessionId,
      startedAt,
      probeSelector: '[data-testid="array-target-item-probe"]',
      expectedSchemaUrl: `playground://pages/performance-table/${mode}?diagnostics=1`,
      expectedProbeKey: 'array-target-item',
    });

    diagnostics.completeSession(sessionId, {
      status:
        debuggerSummary.covered && debuggerSummary.failureCount === 0 && debuggerSummary.errorCount === 0
          ? 'completed'
          : 'failed',
      profilerAfter,
      profilerDelta: diffProfiler(beforeProfiler, profilerAfter),
      changedItemKeys: diffChangedItemKeys(beforeItems, afterItems),
      probeDeltas,
      debuggerSummary,
      targetItemKey,
      targetItemProbeDelta: probeDeltas['array-target-item'],
      siblingItemProbeDelta: {
        render:
          (probeDeltas['array-prev-sibling-item']?.render ?? 0) +
          (probeDeltas['array-next-sibling-item']?.render ?? 0),
        mount:
          (probeDeltas['array-prev-sibling-item']?.mount ?? 0) +
          (probeDeltas['array-next-sibling-item']?.mount ?? 0),
        unmount:
          (probeDeltas['array-prev-sibling-item']?.unmount ?? 0) +
          (probeDeltas['array-next-sibling-item']?.unmount ?? 0),
      },
      unchangedItemUnmountDelta:
        (probeDeltas['array-prev-sibling-item']?.unmount ?? 0) +
        (probeDeltas['array-next-sibling-item']?.unmount ?? 0),
      validationPathCheck: {
        expectedPath: targetPath,
        observedWritePath: targetPath,
        observedValidationPath: lastValidationPath || targetPath,
        usedItemKeyPath: Boolean((lastValidationPath || targetPath).includes(targetItemKey)),
      },
      visibleSnapshot: {
        targetValueBefore: String(beforeItems[targetIndex]?.qty ?? ''),
        targetValueAfter: String(nextQty),
        siblingPrevValueBefore: String(prevQty ?? ''),
        siblingPrevValueAfter: String(prevQty ?? ''),
        siblingNextValueBefore: String(nextSiblingQty ?? ''),
        siblingNextValueAfter: String(nextSiblingQty ?? ''),
      },
    });
  }, [debuggerController, lastValidationPath, mode, probes]);

  const modeDescription = getModeDescription(mode);

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <section className="max-w-[1500px] w-full p-10 rounded-3xl bg-[var(--nop-hero-bg)] border border-[var(--nop-hero-border)] shadow-[var(--nop-hero-shadow)]">
        <Button type="button" variant="outline" className="mb-[18px]" onClick={onBack}>
          Back to Home
        </Button>
        <p className="mb-3 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">
          Performance
        </p>
        <h1 className="m-0 mb-4">Table Performance Playground</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)] mb-2">
          Same-environment comparative measurement page for large-table and repeated-scope testing.
          The baseline scenario mounts a 1000-row dataset through a paged table with 10 mixed cell
          renderers.
        </p>
        <p className="text-base leading-relaxed text-[var(--nop-body-copy)]">
          Additional scenarios intentionally add broad aggregate formulas, nested loop rendering,
          scope-owned table state, and many mounted editable controls so you can compare deltas in
          the same runtime. These numbers are not a cross-machine benchmark.
        </p>
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="rounded-[20px] border border-[var(--nop-playground-stage-border)] bg-[var(--nop-playground-stage-bg)] p-5">
            <p className="mb-2 text-sm font-semibold text-[var(--nop-text-strong)]">Scenario Mode</p>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant={mode === 'table-only' ? 'default' : 'outline'}
                onClick={() => startTransition(() => setMode('table-only'))}
              >
                Table Only
              </Button>
              <Button
                type="button"
                variant={mode === 'scope-read-stress' ? 'default' : 'outline'}
                onClick={() => startTransition(() => setMode('scope-read-stress'))}
              >
                Scope Read Stress
              </Button>
              <Button
                type="button"
                variant={mode === 'full-stress' ? 'default' : 'outline'}
                onClick={() => startTransition(() => setMode('full-stress'))}
              >
                Full Stress
              </Button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[var(--nop-body-copy)]">{modeDescription}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => void runHostBatch('Host row mutation benchmark', 20)}
              >
                Run 20 Host Mutations
              </Button>
              {diagnosticsEnabled ? (
                <>
                  <Button type="button" variant="outline" onClick={() => void runSingleRowDiagnostic()}>
                    Run Single Row Locality Diagnostic
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void runArrayItemDiagnostic()}>
                    Run Array Item Locality Diagnostic
                  </Button>
                </>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPerfRows(initialRows);
                  setLineItems(initialLineItems);
                  metricsRef.current = INITIAL_METRICS;
                  setMetrics(INITIAL_METRICS);
                  setBatchSummary(null);
                  diagnosticsStoreRef.current.clear();
                }}
              >
                Reset Metrics
              </Button>
            </div>
          </div>
          <div className="rounded-[20px] border border-[var(--nop-playground-stage-border)] bg-[var(--nop-playground-stage-bg)] p-5">
            <p className="mb-2 text-sm font-semibold text-[var(--nop-text-strong)]">Live Render Metrics</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-[var(--nop-nav-border)] p-3">
                <div className="text-[var(--nop-body-copy)]">Last commit</div>
                <div className="text-lg font-semibold text-[var(--nop-text-strong)]">
                  {metrics.lastActualDuration.toFixed(1)} ms
                </div>
              </div>
              <div className="rounded-lg border border-[var(--nop-nav-border)] p-3">
                <div className="text-[var(--nop-body-copy)]">Average</div>
                <div className="text-lg font-semibold text-[var(--nop-text-strong)]">
                  {metrics.averageActualDuration.toFixed(1)} ms
                </div>
              </div>
              <div className="rounded-lg border border-[var(--nop-nav-border)] p-3">
                <div className="text-[var(--nop-body-copy)]">Max</div>
                <div className="text-lg font-semibold text-[var(--nop-text-strong)]">
                  {metrics.maxActualDuration.toFixed(1)} ms
                </div>
              </div>
              <div className="rounded-lg border border-[var(--nop-nav-border)] p-3">
                <div className="text-[var(--nop-body-copy)]">Commits</div>
                <div className="text-lg font-semibold text-[var(--nop-text-strong)]">{metrics.commitCount}</div>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-[var(--nop-body-copy)]">
              Trust the synchronized commit count and commit-duration totals for same-page
              comparisons. Scheduling time includes enqueue plus settle delay, so compare it as a
              page-local signal instead of raw render cost.
            </p>
            {diagnosticsEnabled ? (
              <p className="mt-2 text-xs leading-relaxed text-[var(--nop-body-copy)]">
                Diagnostics mode is active through `?diagnostics=1` and exposes structured probe and
                debugger session data on `window.__NOP_PERF_DIAGNOSTICS__`.
              </p>
            ) : null}
            {batchSummary ? (
              <div className="mt-4 rounded-lg border border-[var(--nop-nav-border)] p-3 text-sm">
                <div className="font-semibold text-[var(--nop-text-strong)]">Last Measurement</div>
                <div className="mt-2 text-[var(--nop-body-copy)]">
                  {batchSummary.label}: {batchSummary.steps} updates
                </div>
                <div className="text-[var(--nop-body-copy)]">
                  Scheduling + settle: {batchSummary.totalDurationMs.toFixed(1)} ms
                </div>
                <div className="text-[var(--nop-body-copy)]">
                  Scheduling only: {batchSummary.schedulingDurationMs.toFixed(1)} ms
                </div>
                <div className="text-[var(--nop-body-copy)]">
                  Quiescence wait: {batchSummary.quiescenceWaitMs.toFixed(1)} ms
                </div>
                <div className="text-[var(--nop-body-copy)]">Commit count: {batchSummary.commitsDelta}</div>
                <div className="text-[var(--nop-body-copy)]">
                  Total commit duration: {batchSummary.totalCommitMs.toFixed(1)} ms
                </div>
                <div className="text-[var(--nop-body-copy)]">
                  Average commit duration: {batchSummary.avgCommitMs.toFixed(1)} ms
                </div>
                <div className="text-[var(--nop-body-copy)]">
                  Max commit duration seen: {batchSummary.maxCommitMs.toFixed(1)} ms
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-8 p-6 rounded-[20px] bg-[var(--nop-playground-stage-bg)] border border-[var(--nop-playground-stage-border)] overflow-x-auto">
          <PerformanceSchemaStage
            mode={mode}
            schema={schema}
            data={data}
            env={env}
            onProfilerCommit={handleProfilerCommit}
            debuggerController={debuggerController}
            diagnosticsEnabled={diagnosticsEnabled}
          />
        </div>
      </section>
    </main>
  );
}
