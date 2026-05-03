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
    const current = metricsRef.current;
    const commitCount = current.commitCount + 1;
    const next: RenderMetrics = {
      commitCount,
      lastActualDuration: actualDuration,
      averageActualDuration:
        (current.averageActualDuration * current.commitCount + actualDuration) / commitCount,
      maxActualDuration: Math.max(current.maxActualDuration, actualDuration),
      lastCommitAt: Date.now(),
    };
    metricsRef.current = next;
  };

  async function runHostBatch(label: string, steps: number) {
    const before = metricsRef.current;
    const startedAt = performance.now();

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

    const endedAt = performance.now();
    const after = metricsRef.current;
    const commitsDelta = after.commitCount - before.commitCount;

    setBatchSummary({
      label,
      steps,
      durationMs: endedAt - startedAt,
      commitsDelta,
      avgCommitMs:
        commitsDelta > 0 ? (after.averageActualDuration + before.averageActualDuration) / 2 : 0,
      maxCommitMs: after.maxActualDuration,
    });
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
          Dedicated performance page for large-table and repeated-scope testing. The main scenario
          mounts a 1000-row table with 10 mixed cell renderers.
        </p>
        <p className="text-base leading-relaxed text-[var(--nop-body-copy)]">
          Additional scenarios on the same page intentionally stress broad aggregate formulas,
          nested loop rendering, scope-owned table state, and many mounted editable controls.
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
              Compare mode-switch commits, sort/select interactions, and dataset mutation buttons.
              If scope materialization is a hotspot, `Table Only` should be much cheaper than `Full
              Stress`.
            </p>
            {batchSummary ? (
              <div className="mt-4 rounded-lg border border-[var(--nop-nav-border)] p-3 text-sm">
                <div className="font-semibold text-[var(--nop-text-strong)]">Last Measurement</div>
                <div className="mt-2 text-[var(--nop-body-copy)]">
                  {batchSummary.label}: {batchSummary.steps} updates
                </div>
                <div className="text-[var(--nop-body-copy)]">
                  Wall time: {batchSummary.durationMs.toFixed(1)} ms
                </div>
                <div className="text-[var(--nop-body-copy)]">
                  Commit delta: {batchSummary.commitsDelta}
                </div>
                <div className="text-[var(--nop-body-copy)]">
                  Avg commit baseline: {batchSummary.avgCommitMs.toFixed(1)} ms
                </div>
                <div className="text-[var(--nop-body-copy)]">
                  Max commit seen: {batchSummary.maxCommitMs.toFixed(1)} ms
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
