import React from 'react';
import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { vi } from 'vitest';
import {
  ActionScopeContext,
  ComponentRegistryContext,
  PageContext,
  RuntimeContext,
  ScopeContext,
  SurfaceContext,
  createDefaultEnv,
} from '@nop-chaos/flux-react';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '@nop-chaos/flux-runtime';
import {
  createRendererRegistry,
  type RendererDefinition,
  type RendererComponentProps,
  type RendererPlugin,
  type SchemaObject,
} from '@nop-chaos/flux-core';
import { ScadaCanvasRenderer } from '../renderer/scada-canvas.js';
import type { ScadaCanvasSchema } from '../schemas.js';
import type { ScadaConfig } from '../serialization/config-types.js';
import { scadaTestHandleKey, type ScadaTestHandle } from '../engine/test-handle.js';

export interface ScadaTestEnvironment {
  runtime: ReturnType<typeof createRendererRuntime>;
  page: ReturnType<ReturnType<typeof createRendererRuntime>['createPageRuntime']>;
  actionScope: ReturnType<ReturnType<typeof createRendererRuntime>['createActionScope']>;
  componentRegistry: ReturnType<ReturnType<typeof createRendererRuntime>['createComponentHandleRegistry']>;
  surfaceRuntime: ReturnType<ReturnType<typeof createRendererRuntime>['createSurfaceRuntime']>;
  scope: ReturnType<ReturnType<typeof createRendererRuntime>['createPageRuntime']>['scope'];
}

export function createScadaTestEnvironment(
  definitions: RendererDefinition[],
  data: Record<string, unknown> = {},
  options?: { plugins?: RendererPlugin[] },
): ScadaTestEnvironment {
  const runtime = createRendererRuntime({
    registry: createRendererRegistry(definitions),
    env: createDefaultEnv(),
    expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    // plan 2026-08-06-0746-3 Phase 1：可选 plugins 注入——handler-error action-phase telemetry proof
    // 经 plugin.onError spy 断言 host 宽面（ErrorMonitorPayload, phase:'action'）可达。
    plugins: options?.plugins,
  });
  const page = runtime.createPageRuntime(data);
  const actionScope = runtime.createActionScope({ id: 'scada-test-action-scope' });
  const componentRegistry = runtime.createComponentHandleRegistry({ id: 'scada-test-component-registry' });
  const surfaceRuntime = runtime.createSurfaceRuntime();
  return { runtime, page, actionScope, componentRegistry, surfaceRuntime, scope: page.scope };
}

export function ScadaTestProviders(props: {
  environment: ScadaTestEnvironment;
  children: ReactNode;
}): React.JSX.Element {
  const { environment, children } = props;
  return (
    <RuntimeContext.Provider value={environment.runtime}>
      <ActionScopeContext.Provider value={environment.actionScope}>
        <ComponentRegistryContext.Provider value={environment.componentRegistry}>
          <ScopeContext.Provider value={environment.page.scope}>
            <PageContext.Provider value={environment.page}>
              <SurfaceContext.Provider value={environment.surfaceRuntime}>
                {children}
              </SurfaceContext.Provider>
            </PageContext.Provider>
          </ScopeContext.Provider>
        </ComponentRegistryContext.Provider>
      </ActionScopeContext.Provider>
    </RuntimeContext.Provider>
  );
}

export function renderScadaCanvas(
  props: RendererComponentProps<ScadaCanvasSchema>,
  environment: ScadaTestEnvironment,
): RenderResult {
  return render(
    <ScadaTestProviders environment={environment}>
      <ScadaCanvasRenderer {...props} />
    </ScadaTestProviders>,
  );
}

export type ScadaCanvasConfigProp = string | (ScadaConfig & SchemaObject);

export function configProp(config: ScadaConfig | { version: number } | string): ScadaCanvasConfigProp {
  return config as ScadaCanvasConfigProp;
}

export function validCanvasConfig(overrides: Record<string, unknown> = {}): ScadaConfig {
  return ({
    version: 1,
    symbols: [
      { id: 'rect-1', type: 'scada-rect', x: 10, y: 20, width: 100, height: 50, fill: '#ff0000' },
    ],
    ...overrides,
  }) as ScadaConfig;
}

export function scadaTestHandle(cid: number): ScadaTestHandle | undefined {
  return (window as unknown as Record<string, unknown>)[scadaTestHandleKey(cid)] as
    | ScadaTestHandle
    | undefined;
}

export function makeScadaCanvasProps(
  overrides: Partial<RendererComponentProps<ScadaCanvasSchema>> & {
    cid?: number;
    props?: Record<string, unknown>;
  } = {},
): RendererComponentProps<ScadaCanvasSchema> {
  const { cid = 1, ...rest } = overrides;
  return {
    id: 'scada-1',
    path: 'test.scada-1',
    schema: { type: 'scada-canvas' } as ScadaCanvasSchema,
    templateNode: {} as RendererComponentProps<ScadaCanvasSchema>['templateNode'],
    node: {} as RendererComponentProps<ScadaCanvasSchema>['node'],
    props: {},
    meta: {
      visible: true,
      hidden: false,
      disabled: false,
      changed: false,
      cid,
    } as RendererComponentProps<ScadaCanvasSchema>['meta'],
    regions: {},
    events: {},
    reactions: {},
    helpers: {
      dispatch: vi.fn().mockResolvedValue({ ok: true }),
    } as unknown as RendererComponentProps<ScadaCanvasSchema>['helpers'],
    ...rest,
  };
}
