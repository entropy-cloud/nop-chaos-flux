import { Profiler, startTransition, useMemo, useRef, useState } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { ExecutableApiRequest, RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { Button } from '@nop-chaos/ui';
import {
  type BatchRunSummary,
  type PerformanceMode,
  type PerfRow,
  type RenderMetrics,
  createBatchTransform,
  createRows,
  getModeDescription,
  INITIAL_METRICS,
  recordProfilerCommit,
  summarizeBatchRun,
  waitForMetricQuiescence,
} from './performance-table/index.js';
import { createPerformanceSchema } from './performance-table/schema.js';

interface PerformanceTablePageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerFormAdvancedRenderers(registry);
registerDataRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

export function PerformanceTablePage({ onBack }: PerformanceTablePageProps) {
  const [mode, setMode] = useState<PerformanceMode>('table-only');
  const [perfRows, setPerfRows] = useState<PerfRow[]>(() => createRows(1000));
  const [metrics, setMetrics] = useState<RenderMetrics>(INITIAL_METRICS);
  const [batchSummary, setBatchSummary] = useState<BatchRunSummary | null>(null);
  const metricsRef = useRef(metrics);
  const schema = useMemo(() => createPerformanceSchema(mode), [mode]);

  const initialRows = useMemo(() => createRows(1000), []);
  const batchTransform = useMemo(() => createBatchTransform(), []);

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
    }),
    [initialRows, perfRows],
  );

  const handleProfilerRender = (
    _id: string,
    _phase: 'mount' | 'update' | 'nested-update',
    actualDuration: number,
  ) => {
    const next = recordProfilerCommit(metricsRef.current, actualDuration, Date.now());
    metricsRef.current = next;
  };

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
    const after = await waitForMetricQuiescence({
      getMetrics: () => metricsRef.current,
    });
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
            <p className="mb-2 text-sm font-semibold text-[var(--nop-text-strong)]">
              Scenario Mode
            </p>
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
            <p className="mt-4 text-sm leading-relaxed text-[var(--nop-body-copy)]">
              {modeDescription}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => void runHostBatch('Host row mutation benchmark', 20)}
              >
                Run 20 Host Mutations
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPerfRows(initialRows);
                  metricsRef.current = INITIAL_METRICS;
                  setMetrics(INITIAL_METRICS);
                  setBatchSummary(null);
                }}
              >
                Reset Metrics
              </Button>
            </div>
          </div>
          <div className="rounded-[20px] border border-[var(--nop-playground-stage-border)] bg-[var(--nop-playground-stage-bg)] p-5">
            <p className="mb-2 text-sm font-semibold text-[var(--nop-text-strong)]">
              Live Render Metrics
            </p>
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
                <div className="text-lg font-semibold text-[var(--nop-text-strong)]">
                  {metrics.commitCount}
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-[var(--nop-body-copy)]">
              Trust the synchronized commit count and commit-duration totals for same-page
              comparisons. Scheduling time includes enqueue plus settle delay, so compare it as a
              page-local signal instead of raw render cost.
            </p>
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
                <div className="text-[var(--nop-body-copy)]">
                  Commit count: {batchSummary.commitsDelta}
                </div>
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
          <Profiler id="performance-table-page" onRender={handleProfilerRender}>
            <SchemaRenderer
              key={mode}
              schemaUrl={`playground://pages/performance-table/${mode}`}
              schema={schema}
              data={data}
              env={env}
              registry={registry}
              formulaCompiler={formulaCompiler}
            />
          </Profiler>
        </div>
      </section>
    </main>
  );
}
