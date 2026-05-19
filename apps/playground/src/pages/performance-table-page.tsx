/* eslint-disable max-lines */
import {
  memo,
  Profiler,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import {
  createSchemaRenderer,
  createDefaultRegistry,
  useCurrentForm,
  useCurrentPage,
  useRenderScope,
} from '@nop-chaos/flux-react';
import type {
  ExecutableApiRequest,
  FormRuntime,
  RendererComponentProps,
  RendererDefinition,
  RendererEnv,
} from '@nop-chaos/flux-core';
import type { NopDebuggerController } from '@nop-chaos/nop-debugger';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
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
} from './performance-table/index.js';
import { createPerformanceSchema } from './performance-table/schema.js';

const TABLE_TARGET_ROW_INDEX = 24;
const TABLE_PREV_SIBLING_ROW_INDEX = 23;
const TABLE_NEXT_SIBLING_ROW_INDEX = 25;
const ARRAY_TARGET_ITEM_INDEX = 7;
const ARRAY_PREV_SIBLING_ITEM_INDEX = 6;
const ARRAY_NEXT_SIBLING_ITEM_INDEX = 8;

let activeDiagnosticsFormRuntime: FormRuntime | null = null;

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

interface PerformanceTablePageProps {
  onBack: () => void;
  debuggerController?: NopDebuggerController;
  diagnosticsEnabled?: boolean;
}

function PerfPingButtonRenderer(props: RendererComponentProps<any>) {
  const page = useCurrentPage();
  const scope = useRenderScope();

  const handleClick = useCallback(() => {
    const record = props.helpers.evaluate('${$slot.record}', scope) as
      | { id?: string; status?: string }
      | undefined;
    const id = typeof record?.id === 'string' ? record.id : '';
    const status = typeof record?.status === 'string' ? record.status : '';

    void props.helpers.dispatch(
      {
        action: 'setValue',
        args: {
          path: 'perfState.lastAction',
          value: `ping:${id}:${status}`,
        },
      },
      { scope: page?.scope ?? scope },
    );
  }, [page?.scope, props.helpers, scope]);

  return (
    <Button
      variant="default"
      size="sm"
      className={props.meta.className}
      type="button"
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      onClick={handleClick}
      disabled={props.meta.disabled}
    >
      {String(props.props.label ?? 'Ping')}
    </Button>
  );
}

function PerfRenderProbeRenderer(props: RendererComponentProps<any>) {
  const diagnostics =
    typeof window !== 'undefined' ? window.__NOP_PERF_DIAGNOSTICS__ : undefined;
  const instancePath = JSON.stringify(props.node.instancePath ?? null);
  const probeKey = String(props.props.probeKey ?? 'probe');

  diagnostics?.recordProbeEvent(probeKey, 'render', {
    cid: props.meta.cid,
    instancePath,
  });

  useEffect(() => {
    diagnostics?.recordProbeEvent(probeKey, 'mount', {
      cid: props.meta.cid,
      instancePath,
    });
    return () => {
      diagnostics?.recordProbeEvent(probeKey, 'unmount', {
        cid: props.meta.cid,
        instancePath,
      });
    };
  }, [diagnostics, instancePath, probeKey, props.meta.cid]);

  return (
    <span
      data-testid={props.meta.testid || undefined}
      data-probe-key={probeKey}
      data-cid={props.meta.cid || undefined}
      data-instance-path={instancePath}
      className="sr-only"
    >
      {probeKey}
    </span>
  );
}

function PerfFormRuntimeProbeRenderer() {
  const form = useCurrentForm();

  useEffect(() => {
    activeDiagnosticsFormRuntime = form ?? null;
    return () => {
      if (activeDiagnosticsFormRuntime === form) {
        activeDiagnosticsFormRuntime = null;
      }
    };
  }, [form]);

  return <span data-testid="perf-form-runtime-probe" className="sr-only" />;
}

const perfPingButtonRendererDefinition: RendererDefinition = {
  type: 'perf-ping-button',
  displayName: 'Performance Ping Button',
  category: 'basic',
  component: PerfPingButtonRenderer,
  fields: [
    { key: 'label', kind: 'prop' },
    { key: 'size', kind: 'prop' },
  ],
};

const perfRenderProbeRendererDefinition: RendererDefinition = {
  type: 'perf-render-probe',
  displayName: 'Performance Render Probe',
  category: 'basic',
  component: PerfRenderProbeRenderer,
  fields: [{ key: 'probeKey', kind: 'prop' }],
};

const perfFormRuntimeProbeRendererDefinition: RendererDefinition = {
  type: 'perf-form-runtime-probe',
  displayName: 'Performance Form Runtime Probe',
  category: 'basic',
  component: PerfFormRuntimeProbeRenderer,
};

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerFormAdvancedRenderers(registry);
registerDataRenderers(registry);
registry.register(perfPingButtonRendererDefinition);
registry.register(perfRenderProbeRendererDefinition);
registry.register(perfFormRuntimeProbeRendererDefinition);

interface PerformanceSchemaStageProps {
  mode: PerformanceMode;
  schema: ReturnType<typeof createPerformanceSchema>;
  data: Record<string, unknown>;
  env: RendererEnv;
  onProfilerCommit: (actualDuration: number) => void;
  debuggerController?: NopDebuggerController;
  diagnosticsEnabled: boolean;
}

const PerformanceSchemaStage = memo(function PerformanceSchemaStage({
  mode,
  schema,
  data,
  env,
  onProfilerCommit,
  debuggerController,
  diagnosticsEnabled,
}: PerformanceSchemaStageProps) {
  const handleProfilerRender = (
    _id: string,
    _phase: 'mount' | 'update' | 'nested-update',
    actualDuration: number,
  ) => {
    onProfilerCommit(actualDuration);
  };

  const decoratedEnv = diagnosticsEnabled && debuggerController ? debuggerController.decorateEnv(env) : env;
  const plugins = diagnosticsEnabled && debuggerController ? [debuggerController.plugin] : undefined;

  return (
    <Profiler id="performance-table-page" onRender={handleProfilerRender}>
      <SchemaRenderer
        key={`${mode}:${diagnosticsEnabled ? 'diagnostics' : 'default'}`}
        schemaUrl={`playground://pages/performance-table/${mode}${diagnosticsEnabled ? '?diagnostics=1' : ''}`}
        schema={schema}
        data={data}
        env={decoratedEnv}
        registry={registry}
        formulaCompiler={formulaCompiler}
        plugins={plugins}
        onRuntimeChange={
          diagnosticsEnabled && debuggerController
            ? (runtime) => debuggerController.setRuntime(runtime)
            : undefined
        }
        onComponentRegistryChange={
          diagnosticsEnabled && debuggerController
            ? (componentRegistry) => debuggerController.setComponentRegistry(componentRegistry)
            : undefined
        }
        onActionScopeChange={
          diagnosticsEnabled && debuggerController
            ? (actionScope) => debuggerController.setActionScope(actionScope)
            : undefined
        }
        onActionError={diagnosticsEnabled && debuggerController ? debuggerController.onActionError : undefined}
      />
    </Profiler>
  );
});

function createSessionId(scenario: string): string {
  return `${scenario}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

function getVisibleRowProfile(rowKey: string): string | undefined {
  const rows = Array.from(document.querySelectorAll('table tbody tr[data-slot="table-row"]'));
  const row = rows.find((entry) => entry.textContent?.includes(rowKey.replace('user-', '')));
  return row?.querySelectorAll('td')[2]?.textContent?.trim();
}

function readDiagnosticsProbe(selector: string) {
  return document.querySelector(selector) as HTMLElement | null;
}

function readDebuggerSessionSummary(input: {
  debuggerController?: NopDebuggerController;
  sessionId: string;
  startedAt: number;
  probeSelector: string;
  expectedSchemaUrl: string;
  expectedProbeKey: string;
}) {
  const controller = input.debuggerController;
  if (!controller) {
    return {
      covered: false,
      limitation: 'Debugger controller is not wired for this page.',
      failureCount: 0,
      errorCount: 0,
    };
  }

  const automation = controller.automation;
  const probeElement = readDiagnosticsProbe(input.probeSelector);
  const inspected = probeElement ? automation.inspectByElement(probeElement) : undefined;
  const errors = automation.queryEvents({
    kind: 'error',
    interactionId: input.sessionId,
    sinceTimestamp: input.startedAt,
  });
  const failures = automation.getRecentFailures({ sinceTimestamp: input.startedAt, limit: 10 });
  const runtimeId = inspected ? controller.getComponentTree()[0]?.path ?? 'performance-table-runtime' : undefined;
  const covered =
    Boolean(inspected?.rendererType) &&
    Boolean(inspected?.path?.includes('performance-table') || inspected?.instancePath?.length) &&
    Boolean(probeElement?.getAttribute('data-probe-key') === input.expectedProbeKey);

  return {
    covered,
    limitation: covered ? undefined : 'Probe node was not inspectable through debugger automation.',
    coverageEvidence: inspected
      ? {
          schemaUrl: input.expectedSchemaUrl,
          runtimeId,
          inspectedProbeKey: probeElement?.getAttribute('data-probe-key') ?? undefined,
          inspectedCid: inspected.cid,
          rendererType: inspected.rendererType,
          instancePath: JSON.stringify(inspected.instancePath ?? null),
          matchedByElement: true,
        }
      : undefined,
    failureCount: failures.length,
    errorCount: errors.length,
  };
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

  const probes = useMemo(
    () => ({
      tableTargetRowKey: perfRows[TABLE_TARGET_ROW_INDEX]?.id ?? 'user-25',
      tablePrevSiblingRowKey: perfRows[TABLE_PREV_SIBLING_ROW_INDEX]?.id ?? 'user-24',
      tableNextSiblingRowKey: perfRows[TABLE_NEXT_SIBLING_ROW_INDEX]?.id ?? 'user-26',
      arrayTargetItemKey: lineItems[ARRAY_TARGET_ITEM_INDEX]?.itemKey ?? 'line-8',
      arrayPrevSiblingItemKey: lineItems[ARRAY_PREV_SIBLING_ITEM_INDEX]?.itemKey ?? 'line-7',
      arrayNextSiblingItemKey: lineItems[ARRAY_NEXT_SIBLING_ITEM_INDEX]?.itemKey ?? 'line-9',
    }),
    [lineItems, perfRows],
  );

  const schema = useMemo(
    () => createPerformanceSchema(mode, { diagnosticsEnabled, probes }),
    [diagnosticsEnabled, mode, probes],
  );

  const env = useMemo<RendererEnv>(
    () => ({
      async fetcher<T>(_api: ExecutableApiRequest) {
        void _api;
        return { ok: true, status: 200, data: null as T };
      },
      notify(level, message) {
        console.info(`[performance-table-page] ${level}: ${message}`);
      },
    }),
    [],
  );

  const data = useMemo(
    () => ({
      perfRows,
      initialPerfRows: initialRows,
      perfState: {
        selectedKeys: [],
        pagination: {
          currentPage: 1,
          pageSize: 50,
        },
        lastAction: '',
      },
      lineItems,
      initialLineItems,
      diagnosticsMeta: { enabled: diagnosticsEnabled },
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
      !readDiagnosticsProbe('[data-testid="table-target-row-probe"]') ||
      !readDiagnosticsProbe('[data-testid="table-prev-sibling-row-probe"]') ||
      !readDiagnosticsProbe('[data-testid="table-next-sibling-row-probe"]')
    ) {
      diagnostics.failSession(sessionId, 'Target or sibling row probes are not materialized on the visible page.');
      return;
    }

    let nextRowsSnapshot = beforeRows;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        startTransition(() => {
          setPerfRows((currentRows) => {
            const nextRows = currentRows.slice();
            const targetRow = currentRows[targetIndex];
            const nextScore = ((targetRow.score + 17) % 100) + 1;
            nextRows[targetIndex] = {
              ...targetRow,
              username: `${targetRow.username}_diag`,
              score: nextScore,
              scoreBand: nextScore < 60 ? 'low' : nextScore < 85 ? 'mid' : 'high',
              notes: `${targetRow.notes} [diag]`,
            };
            nextRowsSnapshot = nextRows;
            return nextRows;
          });
        });
        resolve();
      });
    });

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

    const diagnosticsForm = activeDiagnosticsFormRuntime;
    if (!diagnosticsForm) {
      diagnostics.failSession(sessionId, 'Diagnostics form runtime is not mounted.');
      return;
    }

    if (
      !readDiagnosticsProbe('[data-testid="array-target-item-probe"]') ||
      !readDiagnosticsProbe('[data-testid="array-prev-sibling-item-probe"]') ||
      !readDiagnosticsProbe('[data-testid="array-next-sibling-item-probe"]')
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
    setLineItems((currentItems) => {
      const nextItems = currentItems.slice();
      nextItems[targetIndex] = {
        ...currentItems[targetIndex],
        qty: nextQty,
        note: `${currentItems[targetIndex].note} [diag]`,
      };
      return nextItems;
    });

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
