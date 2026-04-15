import { Profiler, startTransition, useMemo, useRef, useState } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { ExecutableApiRequest, RendererEnv, SchemaInput } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { Button } from '@nop-chaos/ui';

interface PerformanceTablePageProps {
  onBack: () => void;
}

type PerformanceMode = 'table-only' | 'scope-read-stress' | 'full-stress';

type RenderMetrics = {
  commitCount: number;
  lastActualDuration: number;
  averageActualDuration: number;
  maxActualDuration: number;
  lastCommitAt: number;
};

type BatchRunSummary = {
  label: string;
  steps: number;
  durationMs: number;
  commitsDelta: number;
  avgCommitMs: number;
  maxCommitMs: number;
};

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerDataRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

type PerfRow = {
  id: string;
  index: number;
  username: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'online' | 'offline' | 'busy';
  active: boolean;
  verified: boolean;
  progress: number;
  region: 'apac' | 'emea' | 'amer';
  notes: string;
  tags: string[];
  tagsText: string;
  permissions: string[];
  score: number;
  children: Array<{ id: string; label: string; value: string }>;
};

function createRow(index: number): PerfRow {
  const role = index % 3 === 0 ? 'admin' : index % 3 === 1 ? 'editor' : 'viewer';
  const status = index % 4 === 0 ? 'busy' : index % 2 === 0 ? 'online' : 'offline';
  const region = index % 3 === 0 ? 'apac' : index % 3 === 1 ? 'emea' : 'amer';
  const tags = [`tag-${index % 5}`, `grp-${index % 7}`, role];
  const permissions = index % 2 === 0 ? ['read', 'write'] : ['read'];

  return {
    id: `user-${index}`,
    index,
    username: `user_${index}`,
    email: `user_${index}@perf.dev`,
    role,
    status,
    active: index % 2 === 0,
    verified: index % 5 !== 0,
    progress: (index * 7) % 100,
    region,
    notes: `Row ${index} note with ${status} / ${region}`,
    tags,
    tagsText: tags.join(', '),
    permissions,
    score: 50 + (index % 50),
    children: [
      { id: `child-${index}-0`, label: 'Primary', value: `${role}-${status}` },
      { id: `child-${index}-1`, label: 'Region', value: region },
    ],
  };
}

function createRows(count: number): PerfRow[] {
  return Array.from({ length: count }, (_, index) => createRow(index + 1));
}

function createPerformanceSchema(mode: PerformanceMode) {
  const body = [
    {
      type: 'container',
      className: 'stack-sm',
      body: [
        { type: 'text', text: 'Performance Table Playground', className: 'text-2xl font-semibold' },
        {
          type: 'text',
          text: '1000-row mixed-renderer table plus stress scenarios for sorting, selection, expanded rows, looped cell rendering, and broad row-scope updates.'
        },
        {
          type: 'text',
          text: 'Dataset size: ${perfRows.length} rows | selected: ${perfState.selectedKeys ? perfState.selectedKeys.length : 0} | page: ${perfState.pagination.currentPage}'
        }
      ]
    },
    {
      type: 'container',
      className: 'hstack-sm flex-wrap',
      body: [
        {
          type: 'button',
          label: 'Shuffle Scores',
          onClick: {
            action: 'setValue',
            componentPath: 'perfRows',
            value: '${perfRows.map((row, idx) => ({ ...row, score: ((row.score + idx + 13) % 100) + 1, progress: ((row.progress + idx + 17) % 100) }))}'
          }
        },
        {
          type: 'button',
          label: 'Toggle Active Flags',
          onClick: {
            action: 'setValue',
            componentPath: 'perfRows',
            value: '${perfRows.map((row, idx) => idx % 3 === 0 ? { ...row, active: !row.active, verified: !row.verified } : row)}'
          }
        },
        {
          type: 'button',
          label: 'Append Tag To All Rows',
          onClick: {
            action: 'setValue',
            componentPath: 'perfRows',
            value: '${perfRows.map((row, idx) => ({ ...row, tags: [...row.tags, `burst-${idx % 4}`], tagsText: [...row.tags, `burst-${idx % 4}`].join(`, `) }))}'
          }
        },
        {
          type: 'button',
          label: 'Reset Dataset',
          onClick: {
            action: 'setValue',
            componentPath: 'perfRows',
            value: '${initialPerfRows}'
          }
        }
      ]
    },
    {
      type: 'table',
      id: 'perf-mixed-table',
      source: '${perfRows}',
      rowKey: 'id',
      bordered: true,
      stripe: true,
      selectionOwnership: 'scope',
      selectionStatePath: 'perfState.selectedKeys',
      paginationOwnership: 'scope',
      paginationStatePath: 'perfState.pagination',
      pagination: {
        currentPage: '${perfState.pagination.currentPage}',
        pageSize: '${perfState.pagination.pageSize}',
        pageSizeOptions: [25, 50, 100, 250],
        showSizeChanger: true
      },
      rowSelection: {
        type: 'checkbox',
        selectedRowKeys: '${perfState.selectedKeys || []}'
      },
      expandable: {
        expandedRowKeys: ['user-1', 'user-2', 'user-3'],
        expandedRowRegionKey: 'expanded'
      },
      columns: [
        {
          label: 'Profile',
          name: 'username',
          sortable: true,
          cell: {
            type: 'text',
            text: '${$slot.record.index}. ${$slot.record.username} <${$slot.record.email}>'
          }
        },
        {
          label: 'Role Badge',
          name: 'role',
          sortable: true,
          cell: {
            type: 'badge',
            label: '${$slot.record.role}',
            variant: '${$slot.record.role === `admin` ? `default` : ($slot.record.role === `editor` ? `secondary` : `outline`)}'
          }
        },
        {
          label: 'Status',
          name: 'status',
          sortable: true,
          cell: {
            type: 'text',
            text: '${$slot.record.active ? `ACTIVE` : `PAUSED`} / ${$slot.record.status}'
          }
        },
        {
          label: 'Region Select',
          name: 'region',
          sortable: true,
          cell: {
            type: 'select',
            name: 'region',
            options: [
              { label: 'APAC', value: 'apac' },
              { label: 'EMEA', value: 'emea' },
              { label: 'AMER', value: 'amer' }
            ]
          }
        },
        {
          label: 'Verified',
          name: 'verified',
          sortable: true,
          cell: {
            type: 'checkbox',
            name: 'verified',
            option: 'Verified'
          }
        },
        {
          label: 'Enabled',
          name: 'active',
          sortable: true,
          cell: {
            type: 'switch',
            name: 'active'
          }
        },
        {
          label: 'Notes',
          name: 'notes',
          cell: {
            type: 'textarea',
            name: 'notes',
            minRows: 2,
            maxRows: 4
          }
        },
        {
          label: 'Tags',
          name: 'tagsText',
          cell: {
            type: 'tag-list',
            name: 'tags'
          }
        },
        {
          label: 'Score',
          name: 'score',
          sortable: true,
          cell: {
            type: 'radio-group',
            name: 'scoreBand',
            options: [
              { label: 'Low', value: 'low' },
              { label: 'Mid', value: 'mid' },
              { label: 'High', value: 'high' }
            ],
            value: '${$slot.record.score < 60 ? `low` : ($slot.record.score < 85 ? `mid` : `high`)}'
          }
        },
        {
          type: 'operation',
          label: 'Actions',
          buttons: [
            {
              type: 'button',
              label: 'Ping',
              size: 'sm',
              onClick: {
                action: 'setValue',
                componentPath: 'perfState.lastAction',
                value: 'ping:${$slot.record.id}:${$slot.record.status}'
              }
            }
          ]
        }
      ],
      expanded: {
        type: 'container',
        className: 'stack-sm py-3',
        body: [
          {
            type: 'text',
            text: 'Expanded ${value.username} | tags=${value.tags.length} | children=${value.children.length}'
          },
          {
            type: 'loop',
            items: '${value.children}',
            body: {
              type: 'text',
              text: '${item.label}: ${item.value}'
            }
          }
        ]
      }
    }
  ] as SchemaInput[];

  if (mode !== 'table-only') {
    body.push({
      type: 'container',
      className: 'grid gap-6 lg:grid-cols-2',
      body: [
        {
          type: 'container',
          className: 'stack-sm border rounded-lg p-4',
          body: [
            { type: 'text', text: 'Scenario A: Broad aggregate watchers', className: 'font-semibold' },
            { type: 'text', text: 'Exercises wide formulas over the full 1000-row dataset to expose broad-access and full-scan costs.' },
            { type: 'text', text: 'Total active rows: ${perfRows.filter(row => row.active).length}' },
            { type: 'text', text: 'Average score: ${Math.round(perfRows.reduce((sum, row) => sum + row.score, 0) / perfRows.length)}' },
            { type: 'text', text: 'Tag fanout: ${perfRows.reduce((sum, row) => sum + row.tags.length, 0)}' }
          ]
        },
        {
          type: 'container',
          className: 'stack-sm border rounded-lg p-4',
          body: [
            { type: 'text', text: 'Scenario A2: Scope read / full snapshot stress', className: 'font-semibold' },
            { type: 'text', text: 'Forces broad scope materialization and JSON serialization through `scope-debug`, which is closer to `scope.read()` hot paths than narrow path-based formulas.' },
            { type: 'scope-debug', title: 'Full Perf Scope Snapshot', className: 'max-h-[280px] overflow-auto text-xs' }
          ]
        },
        ...(mode === 'full-stress'
          ? [
              {
          type: 'container',
          className: 'stack-sm border rounded-lg p-4',
          body: [
            { type: 'text', text: 'Scenario B: Nested loop card list', className: 'font-semibold' },
            { type: 'text', text: 'Exercises repeated child scopes outside the table using nested list rendering.' },
            {
              type: 'loop',
              items: '${perfRows.slice(0, 80)}',
              body: {
                type: 'container',
                className: 'stack-xs border rounded-md p-3',
                body: [
                  { type: 'text', text: '${item.username} / ${item.region} / ${item.status}' },
                  {
                    type: 'loop',
                    items: '${item.children}',
                    body: { type: 'text', text: '${item.label}: ${item.value}' }
                  }
                ]
              }
            }
          ]
        },
        {
          type: 'container',
          className: 'stack-sm border rounded-lg p-4',
          body: [
            { type: 'text', text: 'Scenario C: Scope-owned selection and pagination', className: 'font-semibold' },
            { type: 'text', text: 'Exercises table state stored in scope to surface selection/pagination update churn.' },
            { type: 'text', text: 'Selected keys: ${perfState.selectedKeys ? perfState.selectedKeys.join(`, `) : `none`}' },
            { type: 'text', text: 'Current page size: ${perfState.pagination.pageSize}' },
            { type: 'text', text: 'Last action: ${perfState.lastAction || `none`}' }
          ]
        },
        {
          type: 'container',
          className: 'stack-sm border rounded-lg p-4',
          body: [
            { type: 'text', text: 'Scenario D: Editable subset form', className: 'font-semibold' },
            { type: 'text', text: 'Exercises many mounted controlled fields at once without virtualization.' },
            {
              type: 'form',
              name: 'perfInlineForm',
              data: '${perfRows.slice(0, 24)}',
              body: [
                {
                  type: 'array-field',
                  name: '',
                  item: [
                    { type: 'input-text', name: 'username', label: 'User' },
                    { type: 'input-email', name: 'email', label: 'Email' },
                    { type: 'switch', name: 'active', label: 'Active' },
                    { type: 'textarea', name: 'notes', label: 'Notes' }
                  ]
                }
              ]
            }
          ]
        }
            ]
          : [])
      ]
    });
  }

  return {
    type: 'page',
    className: 'stack-lg p-6',
    body,
  } as SchemaInput;
}

export function PerformanceTablePage({ onBack }: PerformanceTablePageProps) {
  const [mode, setMode] = useState<PerformanceMode>('full-stress');
  const [perfRows, setPerfRows] = useState<PerfRow[]>(() => createRows(1000));
  const [metrics, setMetrics] = useState<RenderMetrics>({
    commitCount: 0,
    lastActualDuration: 0,
    averageActualDuration: 0,
    maxActualDuration: 0,
    lastCommitAt: 0,
  });
  const [batchSummary, setBatchSummary] = useState<BatchRunSummary | null>(null);
  const metricsRef = useRef(metrics);
  const schema = useMemo(() => createPerformanceSchema(mode), [mode]);

  const initialRows = useMemo(() => createRows(1000), []);
  const batchTransform = useMemo(() => (currentRows: PerfRow[]) => currentRows.map((row, idx) => {
    if (idx % 3 === 0) {
      const nextTags = [...row.tags, `batch-${idx % 5}`];
      return {
        ...row,
        active: !row.active,
        verified: !row.verified,
        score: ((row.score + idx + 9) % 100) + 1,
        progress: ((row.progress + idx + 11) % 100),
        tags: nextTags,
        tagsText: nextTags.join(', '),
        notes: `${row.notes} *`
      };
    }

    return row;
  }), []);

  const env = useMemo<RendererEnv>(
    () => ({
      async fetcher<T>(_api: ExecutableApiRequest) {
        void _api;
        return { ok: true, status: 200, data: null as T };
      },
      notify(level, message) {
        console.info(`[performance-table-page] ${level}: ${message}`);
      }
    }),
    []
  );

  const data = useMemo(
    () => ({
      perfRows,
      initialPerfRows: initialRows,
      perfState: {
        selectedKeys: [],
        pagination: {
          currentPage: 1,
          pageSize: 50
        },
        lastAction: ''
      }
    }),
    [initialRows, perfRows]
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
      averageActualDuration: ((current.averageActualDuration * current.commitCount) + actualDuration) / commitCount,
      maxActualDuration: Math.max(current.maxActualDuration, actualDuration),
      lastCommitAt: Date.now(),
    };
    metricsRef.current = next;
    setMetrics(next);
  };

  const modeDescription = mode === 'table-only'
    ? 'Only the 1000-row mixed table is mounted. Use this as the closest baseline for row-scope and table-cell cost.'
    : mode === 'scope-read-stress'
      ? 'Mounts the table plus broad aggregate formulas and full-scope serialization via scope-debug. Use this to approximate `scope.read()` / materialize-heavy workloads.'
      : 'Mounts the table plus aggregate, nested loop, scope-state, and editable-form stress blocks.';

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
      avgCommitMs: commitsDelta > 0 ? (after.averageActualDuration + before.averageActualDuration) / 2 : 0,
      maxCommitMs: after.maxActualDuration,
    });
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <section className="max-w-[1500px] w-full p-10 rounded-3xl bg-[var(--nop-hero-bg)] border border-[var(--nop-hero-border)] shadow-[var(--nop-hero-shadow)]">
        <Button
          type="button"
          variant="outline"
          className="mb-[18px]"
          onClick={onBack}
        >
          Back to Home
        </Button>
        <p className="mb-3 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">Performance</p>
        <h1 className="m-0 mb-4">Table Performance Playground</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)] mb-2">
          Dedicated performance page for large-table and repeated-scope testing. The main scenario mounts a 1000-row table with 10 mixed cell renderers.
        </p>
        <p className="text-base leading-relaxed text-[var(--nop-body-copy)]">
          Additional scenarios on the same page intentionally stress broad aggregate formulas, nested loop rendering, scope-owned table state, and many mounted editable controls.
        </p>
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="rounded-[20px] border border-[var(--nop-playground-stage-border)] bg-[var(--nop-playground-stage-bg)] p-5">
            <p className="mb-2 text-sm font-semibold text-[var(--nop-text-strong)]">Scenario Mode</p>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant={mode === 'table-only' ? 'default' : 'outline'} onClick={() => startTransition(() => setMode('table-only'))}>
                Table Only
              </Button>
              <Button type="button" variant={mode === 'scope-read-stress' ? 'default' : 'outline'} onClick={() => startTransition(() => setMode('scope-read-stress'))}>
                Scope Read Stress
              </Button>
              <Button type="button" variant={mode === 'full-stress' ? 'default' : 'outline'} onClick={() => startTransition(() => setMode('full-stress'))}>
                Full Stress
              </Button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[var(--nop-body-copy)]">{modeDescription}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={() => void runHostBatch('Host row mutation benchmark', 20)}>
                Run 20 Host Mutations
              </Button>
              <Button type="button" variant="outline" onClick={() => {
                setPerfRows(initialRows);
                metricsRef.current = { commitCount: 0, lastActualDuration: 0, averageActualDuration: 0, maxActualDuration: 0, lastCommitAt: 0 };
                setMetrics(metricsRef.current);
                setBatchSummary(null);
              }}>
                Reset Metrics
              </Button>
            </div>
          </div>
          <div className="rounded-[20px] border border-[var(--nop-playground-stage-border)] bg-[var(--nop-playground-stage-bg)] p-5">
            <p className="mb-2 text-sm font-semibold text-[var(--nop-text-strong)]">Live Render Metrics</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-[var(--nop-nav-border)] p-3">
                <div className="text-[var(--nop-body-copy)]">Last commit</div>
                <div className="text-lg font-semibold text-[var(--nop-text-strong)]">{metrics.lastActualDuration.toFixed(1)} ms</div>
              </div>
              <div className="rounded-lg border border-[var(--nop-nav-border)] p-3">
                <div className="text-[var(--nop-body-copy)]">Average</div>
                <div className="text-lg font-semibold text-[var(--nop-text-strong)]">{metrics.averageActualDuration.toFixed(1)} ms</div>
              </div>
              <div className="rounded-lg border border-[var(--nop-nav-border)] p-3">
                <div className="text-[var(--nop-body-copy)]">Max</div>
                <div className="text-lg font-semibold text-[var(--nop-text-strong)]">{metrics.maxActualDuration.toFixed(1)} ms</div>
              </div>
              <div className="rounded-lg border border-[var(--nop-nav-border)] p-3">
                <div className="text-[var(--nop-body-copy)]">Commits</div>
                <div className="text-lg font-semibold text-[var(--nop-text-strong)]">{metrics.commitCount}</div>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-[var(--nop-body-copy)]">
              Compare mode-switch commits, sort/select interactions, and dataset mutation buttons. If scope materialization is a hotspot, `Table Only` should be much cheaper than `Full Stress`.
            </p>
            {batchSummary ? (
              <div className="mt-4 rounded-lg border border-[var(--nop-nav-border)] p-3 text-sm">
                <div className="font-semibold text-[var(--nop-text-strong)]">Last Measurement</div>
                <div className="mt-2 text-[var(--nop-body-copy)]">{batchSummary.label}: {batchSummary.steps} updates</div>
                <div className="text-[var(--nop-body-copy)]">Wall time: {batchSummary.durationMs.toFixed(1)} ms</div>
                <div className="text-[var(--nop-body-copy)]">Commit delta: {batchSummary.commitsDelta}</div>
                <div className="text-[var(--nop-body-copy)]">Avg commit baseline: {batchSummary.avgCommitMs.toFixed(1)} ms</div>
                <div className="text-[var(--nop-body-copy)]">Max commit seen: {batchSummary.maxCommitMs.toFixed(1)} ms</div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-8 p-6 rounded-[20px] bg-[var(--nop-playground-stage-bg)] border border-[var(--nop-playground-stage-border)] overflow-x-auto">
          <Profiler id="performance-table-page" onRender={handleProfilerRender}>
            <SchemaRenderer
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
