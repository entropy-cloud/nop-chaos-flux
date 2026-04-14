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
  ScopeContext,
  SurfaceContext
} from './contexts';
import { RenderNodes, EMPTY_SCOPE_DATA } from './helpers';
import { DialogHost } from './dialog-host';
import { collectSchemaImports, isReportedImportError, shouldWarnOnImportFailure } from './node-renderer-utils';

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
    const schemaImports = useMemo(() => collectSchemaImports(props.schema), [props.schema]);
    const [importsReady, setImportsReady] = React.useState(schemaImports.length === 0);
    const [rootImportBindings, setRootImportBindings] = React.useState<Readonly<Record<string, unknown>>>(EMPTY_SCOPE_DATA);

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

    useEffect(() => {
      let cancelled = false;

      if (schemaImports.length === 0) {
        setImportsReady(true);
        setRootImportBindings(EMPTY_SCOPE_DATA);
        return;
      }

      setImportsReady(false);

      void Promise.allSettled(
        schemaImports.map((spec) => runtime.ensureImportedNamespaces({
          imports: [spec],
          actionScope: rootActionScope,
          componentRegistry: rootComponentRegistry,
          scope: rootScope
        }))
      ).then((results) => {
        if (cancelled) {
          return;
        }

        const rejected = results.find((result) => result.status === 'rejected') as PromiseRejectedResult | undefined;

        if (rejected) {
          const error = rejected.reason;
          if (shouldWarnOnImportFailure()) {
            console.warn('[flux-react] Failed to preload imported namespaces', {
              imports: schemaImports,
              error
            });
          }

          if (!isReportedImportError(error)) {
            props.env.notify('error', `Imported namespaces failed before render: ${error instanceof Error ? error.message : String(error)}`);
            props.env.monitor?.onError?.({
              phase: 'render',
              error,
              details: {
                reason: 'import-preload-failed',
                imports: schemaImports
              }
            });
          }

          setImportsReady(false);
          return;
        }

        setRootImportBindings(runtime.getImportedExpressionBindings({
          imports: schemaImports,
          actionScope: rootActionScope
        }));
        setImportsReady(true);
      });

      return () => {
        cancelled = true;
      };
    }, [runtime, props.env, schemaImports, rootActionScope, rootComponentRegistry, rootScope]);

    const renderScope = useMemo(() => {
      if (Object.keys(rootImportBindings).length === 0) {
        return rootScope;
      }

      return runtime.createChildScope(rootScope, { __imports: rootImportBindings }, {
        pathSuffix: 'imports',
        scopeKey: 'schema-root-imports'
      });
    }, [runtime, rootScope, rootImportBindings]);
    const compiledRoot = useMemo(() => runtime.compile(props.schema), [runtime, props.schema]);

    if (!importsReady) {
      return <div data-runtime-id={runtime.runtimeId} data-imports-loading="true" />;
    }

    return (
      <div data-runtime-id={runtime.runtimeId}>
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
