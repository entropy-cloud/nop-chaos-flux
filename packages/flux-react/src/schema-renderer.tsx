import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  BaseSchema,
  RendererDefinition,
  SchemaRendererProps
} from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { reportImportFailure } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '@nop-chaos/flux-runtime';
import {
  ActionScopeContext,
  ComponentRegistryContext,
  NO_VALIDATION_OWNER,
  PageContext,
  RuntimeContext,
  ScopeContext,
  SurfaceContext,
  ValidationContext
} from './contexts';
import { RenderNodes, EMPTY_SCOPE_DATA } from './helpers';
import { DialogHost } from './dialog-host';
import { collectSchemaImports } from './node-renderer-utils';

const EMPTY_PREPARED_IMPORTS = new Map<string, import('@nop-chaos/flux-core').PreparedImportSpec>();

function getSingleRootNode(
  template: import('@nop-chaos/flux-core').CompiledTemplate | null
): import('@nop-chaos/flux-core').TemplateNode | undefined {
  if (!template || Array.isArray(template.root)) {
    return undefined;
  }

  return template.root as import('@nop-chaos/flux-core').TemplateNode;
}

export function createSchemaRenderer(registryDefinitions: RendererDefinition[] = []) {
  const registry = createRendererRegistry(registryDefinitions);

  return function SchemaRenderer(props: SchemaRendererProps) {
    const onRuntimeChange = props.onRuntimeChange;
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
        moduleCache: props.moduleCache,
        onActionError: (error, ctx) => onActionErrorRef.current?.(error, ctx)
      });
    }, [props.formulaCompiler, props.plugins, props.registry, props.pageStore, props.moduleCache]);

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
    const rootValidationOwner = props.parentScope ? NO_VALIDATION_OWNER : page.validationOwner;
    const rootActionScope = useMemo(
      () => props.actionScope ?? runtime.createActionScope({ id: 'root-action-scope' }),
      [props.actionScope, runtime]
    );
    const rootComponentRegistry = useMemo(
      () => props.componentRegistry ?? runtime.createComponentHandleRegistry({ id: 'root-component-registry' }),
      [props.componentRegistry, runtime]
    );

    useEffect(() => {
      onRuntimeChange?.(runtime);

      return () => {
        onRuntimeChange?.(null);
      };
    }, [onRuntimeChange, runtime]);

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
    const hasSchemaImports = useMemo(() => collectSchemaImports(props.schema).length > 0, [props.schema]);
    const [preparedImports, setPreparedImports] = useState<ReadonlyMap<string, import('@nop-chaos/flux-core').PreparedImportSpec> | null>(
      hasSchemaImports ? null : EMPTY_PREPARED_IMPORTS
    );
    const [prepareError, setPrepareError] = useState<unknown>(null);

    useEffect(() => {
      let disposed = false;

      setPreparedImports(hasSchemaImports ? null : EMPTY_PREPARED_IMPORTS);
      setPrepareError(null);

      if (!hasSchemaImports) {
        return () => {
          disposed = true;
        };
      }

      const prepare = runtime.prepareSchema;
      if (!prepare) {
        setPreparedImports(EMPTY_PREPARED_IMPORTS);
        return;
      }

      void prepare(props.schema, {
        schemaUrl: props.schemaUrl,
      }).then((result) => {
        if (disposed) {
          return;
        }
        setPreparedImports(result.preparedImports);
      }).catch((error) => {
        if (disposed) {
          return;
        }
        if ((globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV !== 'production') {
          console.warn('[flux-react] Schema import preload failed', error);
        }
        reportImportFailure({
          env: props.env,
          error: error instanceof Error ? error : new Error(String(error)),
          message: error instanceof Error ? error.message : String(error),
          phase: 'compile',
          path: props.schemaUrl
        });
        setPrepareError(error);
      });

      return () => {
        disposed = true;
      };
    }, [runtime, props.schema, props.schemaUrl, props.env, hasSchemaImports]);

    const compiledRoot = useMemo<import('@nop-chaos/flux-core').CompiledTemplate | null>(() => {
      if (!preparedImports) {
        return null;
      }

      return runtime.schemaCompiler.compile(props.schema, {
        schemaUrl: props.schemaUrl,
        importLoader: props.env.importLoader,
        resolveImportUrl: props.env.resolveImportUrl,
        preparedImports
      });
    }, [runtime, props.schema, props.schemaUrl, props.env.importLoader, props.env.resolveImportUrl, preparedImports]);

    useEffect(() => {
      const rootNode = getSingleRootNode(compiledRoot);
      if (!rootNode) {
        return;
      }

      const validationPlan = rootNode.validationPlan;
      if (!validationPlan) {
        return;
      }

      page.validationOwner?.refreshCompiledModel(validationPlan);
    }, [compiledRoot, page]);

    if (prepareError) {
      return null;
    }

    if (!compiledRoot) {
      return null;
    }

    return (
      <div data-runtime-id={runtime.runtimeId} className="contents">
        <RuntimeContext.Provider value={runtime}>
          <ActionScopeContext.Provider value={rootActionScope}>
            <ComponentRegistryContext.Provider value={rootComponentRegistry}>
              <ScopeContext.Provider value={renderScope}>
                <PageContext.Provider value={page}>
                  <ValidationContext.Provider value={rootValidationOwner}>
                    <SurfaceContext.Provider value={surfaceRuntime}>
                      <RenderNodes input={compiledRoot} options={{ scope: renderScope, actionScope: rootActionScope, componentRegistry: rootComponentRegistry }} />
                      <DialogHost />
                    </SurfaceContext.Provider>
                  </ValidationContext.Provider>
                </PageContext.Provider>
              </ScopeContext.Provider>
            </ComponentRegistryContext.Provider>
          </ActionScopeContext.Provider>
        </RuntimeContext.Provider>
      </div>
    );
  };
}
