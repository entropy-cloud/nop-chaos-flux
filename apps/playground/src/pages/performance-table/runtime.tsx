import { memo, Profiler, useCallback, useEffect } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import {
  createDefaultRegistry,
  createSchemaRenderer,
  useCurrentForm,
  useCurrentPage,
  useRenderScope,
} from '@nop-chaos/flux-react';
import type {
  ExecutableApiRequest,
  FormRuntime,
  PageRuntime,
  RendererComponentProps,
  RendererDefinition,
  RendererEnv,
} from '@nop-chaos/flux-core';
import type { NopDebuggerController } from '@nop-chaos/nop-debugger';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { Button } from '@nop-chaos/ui';
import type { PerformanceDebuggerSummary } from './diagnostics.js';
import { createPerformanceSchema } from './schema.js';
import type { PerfLineItem, PerfRow, PerformanceMode } from './types.js';

let activeDiagnosticsFormRuntime: FormRuntime | null = null;
let activeDiagnosticsPageRuntime: PageRuntime | null = null;

const SchemaRenderer = createSchemaRenderer();
export const formulaCompiler = createFormulaCompiler();

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
  const trackedValue = props.props.trackedValue;

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
      data-tracked-value={trackedValue == null ? undefined : String(trackedValue)}
      className="sr-only"
    >
      {probeKey}
    </span>
  );
}

function PerfFormRuntimeProbeRenderer() {
  const form = useCurrentForm();
  const page = useCurrentPage();

  useEffect(() => {
    activeDiagnosticsFormRuntime = form ?? null;
    activeDiagnosticsPageRuntime = page ?? null;
    return () => {
      if (activeDiagnosticsFormRuntime === form) {
        activeDiagnosticsFormRuntime = null;
      }
      if (activeDiagnosticsPageRuntime === page) {
        activeDiagnosticsPageRuntime = null;
      }
    };
  }, [form, page]);

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
  fields: [
    { key: 'probeKey', kind: 'prop' },
    { key: 'trackedValue', kind: 'prop' },
  ],
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

export interface PerformanceSchemaStageProps {
  mode: PerformanceMode;
  schema: ReturnType<typeof createPerformanceSchema>;
  data: Record<string, unknown>;
  env: RendererEnv;
  onProfilerCommit: (actualDuration: number) => void;
  debuggerController?: NopDebuggerController;
  diagnosticsEnabled: boolean;
}

export const PerformanceSchemaStage = memo(function PerformanceSchemaStage({
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

export function createSessionId(scenario: string): string {
  return `${scenario}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

export function getVisibleRowProfile(rowKey: string): string | undefined {
  const rows = Array.from(document.querySelectorAll('table tbody tr[data-slot="table-row"]'));
  const row = rows.find((entry) => entry.textContent?.includes(rowKey.replace('user-', '')));
  return row?.querySelectorAll('td')[2]?.textContent?.trim();
}

function readDiagnosticsProbe(selector: string) {
  return document.querySelector(selector) as HTMLElement | null;
}

export function hasDiagnosticsProbe(selector: string): boolean {
  return Boolean(readDiagnosticsProbe(selector));
}

export function readDebuggerSessionSummary(input: {
  debuggerController?: NopDebuggerController;
  sessionId: string;
  startedAt: number;
  probeSelector: string;
  expectedSchemaUrl: string;
  expectedProbeKey: string;
}): PerformanceDebuggerSummary {
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

export const performanceEnv: RendererEnv = {
  async fetcher<T>(_api: ExecutableApiRequest) {
    void _api;
    return { ok: true, status: 200, data: null as T };
  },
  notify(level, message) {
    console.info(`[performance-table-page] ${level}: ${message}`);
  },
};

export function buildPerformanceData(input: {
  perfRows: PerfRow[];
  initialRows: PerfRow[];
  lineItems: PerfLineItem[];
  initialLineItems: PerfLineItem[];
  diagnosticsEnabled: boolean;
}) {
  return {
    perfRows: input.perfRows,
    initialPerfRows: input.initialRows,
    perfState: {
      selectedKeys: [],
      pagination: {
        currentPage: 1,
        pageSize: 50,
      },
      lastAction: '',
    },
    lineItems: input.lineItems,
    initialLineItems: input.initialLineItems,
    diagnosticsMeta: { enabled: input.diagnosticsEnabled },
  };
}

export function getActiveDiagnosticsFormRuntime() {
  return activeDiagnosticsFormRuntime;
}

export function getActiveDiagnosticsPageRuntime() {
  return activeDiagnosticsPageRuntime;
}
