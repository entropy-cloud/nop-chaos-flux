import React from 'react';
import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
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
import { createRendererRegistry, type RendererDefinition, type RendererComponentProps } from '@nop-chaos/flux-core';
import { ScadaCanvasRenderer } from '../renderer/scada-canvas.js';
import type { ScadaCanvasSchema } from '../schemas.js';

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
): ScadaTestEnvironment {
  const runtime = createRendererRuntime({
    registry: createRendererRegistry(definitions),
    env: createDefaultEnv(),
    expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
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
