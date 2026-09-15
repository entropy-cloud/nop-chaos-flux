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
import { createRendererRegistry, type RendererDefinition } from '@nop-chaos/flux-core';

export interface ThreeTestEnvironment {
  runtime: ReturnType<typeof createRendererRuntime>;
  page: ReturnType<ReturnType<typeof createRendererRuntime>['createPageRuntime']>;
  actionScope: ReturnType<ReturnType<typeof createRendererRuntime>['createActionScope']>;
  componentRegistry: ReturnType<ReturnType<typeof createRendererRuntime>['createComponentHandleRegistry']>;
  surfaceRuntime: ReturnType<ReturnType<typeof createRendererRuntime>['createSurfaceRuntime']>;
  scope: ReturnType<ReturnType<typeof createRendererRuntime>['createPageRuntime']>['scope'];
  expressionCompiler: ReturnType<typeof createExpressionCompiler>;
  env: ReturnType<typeof createDefaultEnv>;
}

export function createThreeTestEnvironment(
  definitions: RendererDefinition[] = [],
  data: Record<string, unknown> = {},
): ThreeTestEnvironment {
  const expressionCompiler = createExpressionCompiler(createFormulaCompiler());
  const env = createDefaultEnv();
  const runtime = createRendererRuntime({
    registry: createRendererRegistry(definitions),
    env,
    expressionCompiler,
  });
  const page = runtime.createPageRuntime(data);
  const actionScope = runtime.createActionScope({ id: 'three-test-action-scope' });
  const componentRegistry = runtime.createComponentHandleRegistry({ id: 'three-test-component-registry' });
  const surfaceRuntime = runtime.createSurfaceRuntime();
  return {
    runtime,
    page,
    actionScope,
    componentRegistry,
    surfaceRuntime,
    scope: page.scope,
    expressionCompiler,
    env,
  };
}

export function ThreeTestProviders(props: {
  environment: ThreeTestEnvironment;
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

export function renderWithThreeEnvironment(
  element: React.JSX.Element,
  environment: ThreeTestEnvironment,
): RenderResult {
  return render(<ThreeTestProviders environment={environment}>{element}</ThreeTestProviders>);
}

export function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
