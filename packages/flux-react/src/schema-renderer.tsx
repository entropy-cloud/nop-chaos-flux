import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { BaseSchema, SchemaRendererProps } from '@nop-chaos/flux-core';
import { createRendererRegistry, isStrictValidationEnabled } from '@nop-chaos/flux-core';
import { reportImportFailure } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '@nop-chaos/flux-runtime';
import { ensureRendererComponent } from './auto-renderer.js';
import type { RendererDefinition } from './react-contracts.js';
import {
  ActionScopeContext,
  ComponentRegistryContext,
  NO_VALIDATION_OWNER,
  PageContext,
  RuntimeContext,
  ScopeContext,
  SurfaceContext,
  ValidationContext,
  type ValidationContextValue,
} from './contexts.js';
import { RenderNodes, EMPTY_SCOPE_DATA } from './helpers.js';
import { DialogHost } from './dialog-host.js';
import { collectSchemaImports } from './node-renderer-utils.js';
import { SchemaRootError, SchemaRootErrorBoundary, SchemaRootStatus } from './node-error-boundary.js';

const EMPTY_PREPARED_IMPORTS = new Map<string, import('@nop-chaos/flux-core').PreparedImportSpec>();

function getSingleRootNode(
  template: import('@nop-chaos/flux-core').CompiledTemplate | null,
): import('@nop-chaos/flux-core').TemplateNode | undefined {
  if (!template || Array.isArray(template.root)) {
    return undefined;
  }

  return template.root as import('@nop-chaos/flux-core').TemplateNode;
}

function CompiledSchemaTree(props: {
  runtime: import('@nop-chaos/flux-core').RendererRuntime;
  schema: SchemaRendererProps['schema'];
  schemaUrl: string;
  env: SchemaRendererProps['env'];
  preparedImports: ReadonlyMap<string, import('@nop-chaos/flux-core').PreparedImportSpec>;
  strictMode: boolean;
  renderScope: import('@nop-chaos/flux-core').ScopeRef;
  page: import('@nop-chaos/flux-core').PageRuntime;
  rootValidationOwner: ValidationContextValue;
  surfaceRuntime: import('@nop-chaos/flux-core').SurfaceRuntime;
  rootActionScope: import('@nop-chaos/flux-core').ActionScope;
  rootComponentRegistry: import('@nop-chaos/flux-core').ComponentHandleRegistry;
}) {
  const compiledRoot = useMemo<import('@nop-chaos/flux-core').CompiledTemplate | null>(() => {
    return props.runtime.schemaCompiler.compile(props.schema, {
      schemaUrl: props.schemaUrl,
      importLoader: props.env.importLoader,
      resolveImportUrl: props.env.resolveImportUrl,
      preparedImports: props.preparedImports,
      validation: {
        strictMode: props.strictMode,
      },
      diagnostics: props.strictMode
        ? {
            enabled: true,
            continueOnError: true,
          }
        : undefined,
    });
  }, [
    props.runtime,
    props.schema,
    props.schemaUrl,
    props.env.importLoader,
    props.env.resolveImportUrl,
    props.preparedImports,
    props.strictMode,
  ]);

  useEffect(() => {
    const rootNode = getSingleRootNode(compiledRoot);
    if (!rootNode) {
      return;
    }

    const validationPlan = rootNode.validationPlan;
    if (!validationPlan) {
      return;
    }

    props.page.validationOwner?.refreshCompiledModel(validationPlan);
  }, [compiledRoot, props.page]);

  if (!compiledRoot) {
    return <SchemaRootStatus message="Schema is preparing." />;
  }

  return (
    <RuntimeContext.Provider value={props.runtime}>
      <ActionScopeContext.Provider value={props.rootActionScope}>
        <ComponentRegistryContext.Provider value={props.rootComponentRegistry}>
          <ScopeContext.Provider value={props.renderScope}>
            <PageContext.Provider value={props.page}>
              <ValidationContext.Provider value={props.rootValidationOwner}>
                <SurfaceContext.Provider value={props.surfaceRuntime}>
                  <RenderNodes
                    input={compiledRoot}
                    options={{
                      scope: props.renderScope,
                      actionScope: props.rootActionScope,
                      componentRegistry: props.rootComponentRegistry,
                    }}
                  />
                  <DialogHost />
                </SurfaceContext.Provider>
              </ValidationContext.Provider>
            </PageContext.Provider>
          </ScopeContext.Provider>
        </ComponentRegistryContext.Provider>
      </ActionScopeContext.Provider>
    </RuntimeContext.Provider>
  );
}

export function createSchemaRenderer(registryDefinitions: RendererDefinition[] = []) {
  const registry = createRendererRegistry(registryDefinitions.map(ensureRendererComponent));

  return function SchemaRenderer(props: SchemaRendererProps) {
    const onRuntimeChange = props.onRuntimeChange;
    const onComponentRegistryChange = props.onComponentRegistryChange;
    const onActionScopeChange = props.onActionScopeChange;
    const envRef = useRef(props.env);
    envRef.current = props.env;
    const mountedRef = useRef(false);
    const activeRuntimeRef = useRef<import('@nop-chaos/flux-core').RendererRuntime | null>(null);
    const onActionErrorRef = useRef(props.onActionError);
    onActionErrorRef.current = props.onActionError;
    const runtime = useMemo(() => {
      const resolvedRegistry = props.registry ?? registry;
      const expressionCompiler = createExpressionCompiler(
        props.formulaCompiler ?? createFormulaCompiler(),
      );

      return createRendererRuntime({
        registry: resolvedRegistry,
        env: envRef.current,
        expressionCompiler,
        plugins: props.plugins,
        pageStore: props.pageStore,
        moduleCache: props.moduleCache,
        strictMode: isStrictValidationEnabled(props.strictValidation),
        onActionError: (error, ctx) => onActionErrorRef.current?.(error, ctx),
      });
    }, [
      props.formulaCompiler,
      props.plugins,
      props.registry,
      props.pageStore,
      props.moduleCache,
      props.strictValidation,
    ]);

    const pageData = props.data ?? EMPTY_SCOPE_DATA;
    const initialPageDataRef = useRef(pageData);
    const initialDataAppliedRef = useRef(false);
    const page = useMemo(() => runtime.createPageRuntime(initialPageDataRef.current), [runtime]);
    const ownedSurfaceRuntime = useMemo(() => runtime.createSurfaceRuntime(), [runtime]);

    useEffect(() => {
      const schemaInput = props.schema;
      const rootSchema = Array.isArray(schemaInput) ? schemaInput[0] : schemaInput;
      page.modalContainer = (
        rootSchema as BaseSchema & { modalContainer?: string }
      )?.modalContainer;
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
          kind: 'replace',
        });
      }
    }, [page, pageData]);

    useEffect(() => {
      runtime.setEnv(props.env);
      page.refresh();
    }, [page, props.env, runtime]);

    useEffect(() => {
      mountedRef.current = true;
      activeRuntimeRef.current = runtime;

      return () => {
        mountedRef.current = false;
        const disposedRuntime = runtime;

        queueMicrotask(() => {
          if (!mountedRef.current || activeRuntimeRef.current !== disposedRuntime) {
            disposedRuntime.dispose();
          }
        });
      };
    }, [runtime]);

    const rootScope = props.parentScope ?? page.scope;
    const rootValidationOwner: ValidationContextValue = props.parentScope
      ? NO_VALIDATION_OWNER
      : page.validationOwner;
    const surfaceRuntime = props.surfaceRuntime ?? ownedSurfaceRuntime;
    const rootActionScope = useMemo(
      () => props.actionScope ?? runtime.createActionScope({ id: 'root-action-scope' }),
      [props.actionScope, runtime],
    );
    const rootComponentRegistry = useMemo(
      () =>
        props.componentRegistry ??
        runtime.createComponentHandleRegistry({ id: 'root-component-registry' }),
      [props.componentRegistry, runtime],
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
    const hasSchemaImports = useMemo(
      () => collectSchemaImports(props.schema).length > 0,
      [props.schema],
    );
    const [preparedImports, setPreparedImports] = useState<ReadonlyMap<
      string,
      import('@nop-chaos/flux-core').PreparedImportSpec
    > | null>(hasSchemaImports ? null : EMPTY_PREPARED_IMPORTS);
    const [prepareError, setPrepareError] = useState<unknown>(null);

    useEffect(() => {
      const controller = new AbortController();

      setPreparedImports(hasSchemaImports ? null : EMPTY_PREPARED_IMPORTS);
      setPrepareError(null);

      if (!hasSchemaImports) {
        return () => {
          controller.abort();
        };
      }

      const prepare = runtime.prepareSchema;
      if (!prepare) {
        setPreparedImports(EMPTY_PREPARED_IMPORTS);
        return;
      }

      const { signal } = controller;

      void prepare(props.schema, {
        schemaUrl: props.schemaUrl,
      })
        .then((result) => {
          if (signal.aborted) {
            return;
          }
          setPreparedImports(result.preparedImports);
        })
        .catch((error) => {
          if (signal.aborted) {
            return;
          }
          if (
            (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV !==
            'production'
          ) {
            console.warn('[flux-react] Schema import preload failed', error);
          }
          reportImportFailure({
            env: props.env,
            error: error instanceof Error ? error : new Error(String(error)),
            message: error instanceof Error ? error.message : String(error),
            phase: 'compile',
            path: props.schemaUrl,
          });
          setPrepareError(error);
        });

      return () => {
        controller.abort();
      };
    }, [runtime, props.schema, props.schemaUrl, props.env, hasSchemaImports]);

    const strictMode = isStrictValidationEnabled(props.strictValidation);

    if (prepareError) {
      return <SchemaRootError error={prepareError} />;
    }

    if (!preparedImports) {
      return <SchemaRootStatus message="Preparing schema imports." />;
    }

    return (
      <div data-runtime-id={runtime.runtimeId} className="contents">
        <SchemaRootErrorBoundary>
          <CompiledSchemaTree
            runtime={runtime}
            schema={props.schema}
            schemaUrl={props.schemaUrl}
            env={props.env}
            preparedImports={preparedImports}
            strictMode={strictMode}
            renderScope={renderScope}
            page={page}
            rootValidationOwner={rootValidationOwner}
            surfaceRuntime={surfaceRuntime}
            rootActionScope={rootActionScope}
            rootComponentRegistry={rootComponentRegistry}
          />
        </SchemaRootErrorBoundary>
      </div>
    );
  };
}
