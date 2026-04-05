import React, { useEffect, useMemo, useRef } from 'react';
import type {
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
  ScopeContext
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

    const runtime = useMemo(() => {
      const resolvedRegistry = props.registry ?? registry;
      const expressionCompiler = createExpressionCompiler(props.formulaCompiler ?? createFormulaCompiler());

      return createRendererRuntime({
        registry: resolvedRegistry,
        env: envRef.current,
        expressionCompiler,
        plugins: props.plugins,
        pageStore: props.pageStore,
        onActionError: props.onActionError
      });
    }, [props.formulaCompiler, props.plugins, props.registry, props.pageStore, props.onActionError]);

    const pageData = props.data ?? EMPTY_SCOPE_DATA;
    const initialPageDataRef = useRef(pageData);
    const page = useMemo(() => runtime.createPageRuntime(initialPageDataRef.current), [runtime]);

    useEffect(() => {
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
      page.refresh();
    }, [page, props.env]);

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

      return () => {
        onComponentRegistryChange?.(null);
      };
    }, [onComponentRegistryChange, rootComponentRegistry]);

    useEffect(() => {
      onActionScopeChange?.(rootActionScope);

      return () => {
        onActionScopeChange?.(null);
      };
    }, [onActionScopeChange, rootActionScope]);

    return (
      <RuntimeContext.Provider value={runtime}>
        <ActionScopeContext.Provider value={rootActionScope}>
          <ComponentRegistryContext.Provider value={rootComponentRegistry}>
            <ScopeContext.Provider value={rootScope}>
              <PageContext.Provider value={page}>
                <RenderNodes input={props.schema} options={{ actionScope: rootActionScope, componentRegistry: rootComponentRegistry }} />
                <DialogHost />
              </PageContext.Provider>
            </ScopeContext.Provider>
          </ComponentRegistryContext.Provider>
        </ActionScopeContext.Provider>
      </RuntimeContext.Provider>
    );
  };
}
