import React, { useEffect, useMemo, useRef } from 'react';
import type {
  BaseSchema,
  RendererDefinition,
  SchemaRendererProps
} from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRegistry, createRendererRuntime } from '@nop-chaos/flux-runtime';
import {
  ActionScopeContext,
  ComponentRegistryContext,
  PageContext,
  RuntimeContext,
  ScopeContext,
  SurfaceContext
} from './contexts';
import { RenderNodes, EMPTY_SCOPE_DATA } from './helpers';
import { DialogHost } from './dialog-host';

export function createSchemaRenderer(registryDefinitions: RendererDefinition[] = []) {
  const registry = createRendererRegistry(registryDefinitions);

  return function SchemaRenderer(props: SchemaRendererProps) {
    const onComponentRegistryChange = props.onComponentRegistryChange;
    const onActionScopeChange = props.onActionScopeChange;
    const envRef = useRef(props.env);
    envRef.current = props.env;
    const onActionErrorRef = useRef(props.onActionError);
    onActionErrorRef.current = props.onActionError;
    const runtime = useMemo(() => {
      const resolvedRegistry = props.registry ?? registry;
      const expressionCompiler = createExpressionCompiler(props.formulaCompiler ?? createFormulaCompiler());

      return createRendererRuntime({
        registry: resolvedRegistry,
        env: envRef.current,
        expressionCompiler,
        plugins: props.plugins,
        pageStore: props.pageStore,
        onActionError: (error, ctx) => onActionErrorRef.current?.(error, ctx)
      });
    }, [props.formulaCompiler, props.plugins, props.registry, props.pageStore]);

    const pageData = props.data ?? EMPTY_SCOPE_DATA;
    const initialPageDataRef = useRef(pageData);
    const initialDataAppliedRef = useRef(false);
    const page = useMemo(() => runtime.createPageRuntime(initialPageDataRef.current), [runtime]);
    const surfaceRuntime = useMemo(() => runtime.createSurfaceRuntime(), [runtime]);

    useEffect(() => {
      const schemaInput = props.schema;
      const rootSchema = Array.isArray(schemaInput) ? schemaInput[0] : schemaInput;
      page.modalContainer = (rootSchema as BaseSchema & { modalContainer?: string })?.modalContainer;
    }, [props.schema, page]);

    useEffect(() => {
      if (!initialDataAppliedRef.current) {
        initialDataAppliedRef.current = true;
        return;
      }

      const currentData = page.store.getState().data;

      if (currentData !== pageData) {
        page.scope.store?.setSnapshot(pageData, {
          paths: ['*'],
          sourceScopeId: page.scope.id,
          kind: 'replace'
        });
      }
    }, [page, pageData]);

    useEffect(() => {
      runtime.setEnv(props.env);
      page.refresh();
    }, [page, props.env, runtime]);

    useEffect(() => {
      return () => {
        runtime.dispose();
      };
    }, [runtime]);

    const rootScope = props.parentScope ?? page.scope;
    const rootActionScope = useMemo(
      () => props.actionScope ?? runtime.createActionScope({ id: 'root-action-scope' }),
      [props.actionScope, runtime]
    );
    const rootComponentRegistry = useMemo(
      () => props.componentRegistry ?? runtime.createComponentHandleRegistry({ id: 'root-component-registry' }),
      [props.componentRegistry, runtime]
    );

    useEffect(() => {
      onComponentRegistryChange?.(rootComponentRegistry);
      page.refresh();

      return () => {
        onComponentRegistryChange?.(null);
      };
    }, [onComponentRegistryChange, rootComponentRegistry, page]);

    useEffect(() => {
      onActionScopeChange?.(rootActionScope);

      return () => {
        onActionScopeChange?.(null);
      };
    }, [onActionScopeChange, rootActionScope]);
    const renderScope = rootScope;
    const compiledRoot = useMemo(() => runtime.compile(props.schema), [runtime, props.schema]);

    return (
      <div data-runtime-id={runtime.runtimeId} className="contents">
        <RuntimeContext.Provider value={runtime}>
          <ActionScopeContext.Provider value={rootActionScope}>
            <ComponentRegistryContext.Provider value={rootComponentRegistry}>
              <ScopeContext.Provider value={renderScope}>
                <PageContext.Provider value={page}>
                  <SurfaceContext.Provider value={surfaceRuntime}>
                    <RenderNodes input={compiledRoot} options={{ scope: renderScope, actionScope: rootActionScope, componentRegistry: rootComponentRegistry }} />
                    <DialogHost />
                  </SurfaceContext.Provider>
                </PageContext.Provider>
              </ScopeContext.Provider>
            </ComponentRegistryContext.Provider>
          </ActionScopeContext.Provider>
        </RuntimeContext.Provider>
      </div>
    );
  };
}
