import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { BaseSchema, RegisteredRendererDefinition, SchemaRendererProps } from '@nop-chaos/flux-core';
import {
  createRendererRegistry,
  isStrictValidationEnabled,
  reportImportFailure,
  shouldFailOnSchemaDiagnostics,
} from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '@nop-chaos/flux-runtime';
import { ensureRendererComponent } from './auto-renderer.js';
import { createDefaultSchemaDiagnosticReporter } from './schema-diagnostics-reporter.js';
import {
  ActionScopeContext,
  ComponentRegistryContext,
  MonitorContext,
  NO_VALIDATION_OWNER,
  PageContext,
  RuntimeContext,
  ScopeContext,
  SurfaceContext,
  ValidationContext,
  type ValidationContextValue,
} from './contexts.js';
import { RenderNodes, EMPTY_SCOPE_DATA } from './helpers.js';
import { emitMonitorError } from './monitor-emit.js';
import { DialogHost } from './dialog-host.js';
import { collectSchemaImports } from './node-renderer-utils.js';
import { SchemaRootError, SchemaRootErrorBoundary, SchemaRootStatus } from './node-error-boundary.js';
import { useDeferredDispose } from './use-deferred-dispose.js';

const EMPTY_PREPARED_IMPORTS = new Map<string, import('@nop-chaos/flux-core').PreparedImportSpec>();

type PageRuntimeWithExternalSync = import('@nop-chaos/flux-core').PageRuntime & {
  __attachExternalPageStoreSync?: () => () => void;
};

function getSingleRootNode(
  template: import('@nop-chaos/flux-core').CompiledTemplate | null,
): import('@nop-chaos/flux-core').TemplateNode | undefined {
  if (!template || Array.isArray(template.root)) {
    return undefined;
  }

  return template.root as import('@nop-chaos/flux-core').TemplateNode;
}

function requireOwned<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new Error(`[SchemaRenderer] ${label} unavailable in a successful creation`);
  }
  return value;
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
  // The compile memo keys on just the two env functions it consumes — an
  // inline `env={{ notify, ... }}` object from the host must not re-trigger a
  // full schema recompile on every host render. Compilation failure is reported
  // from an effect (where reading props.env is legal) so the memo stays pure.
  // Plan 595: strict renders run the compiler diagnostics pass — diagnostics go
  // out through `env.reportSchemaDiagnostics` (fallback routes by severity:
  // error -> console.error, warning/info -> console.warn — P1-MA4.5-002); in
  // fail-fast environments (VITEST/PLAYWRIGHT/fail flag) collected error
  // diagnostics turn the compile into an error result after the fact, which the
  // catch below surfaces through reportImportFailure/env.notify. Lowering stays
  // tolerant (continueOnError: true) so honest degradation semantics are
  // unchanged; with the strict switch off the legacy diagnostics envelope runs.
  const fallbackReporter = useMemo(createDefaultSchemaDiagnosticReporter, []);
  const compileResult = useMemo<
    { template: import('@nop-chaos/flux-core').CompiledTemplate | null; error: Error | null }
  >(() => {
    const failOnDiagnostics = props.strictMode && shouldFailOnSchemaDiagnostics();
    const collected: import('@nop-chaos/flux-core').SchemaDiagnostic[] = [];
    const diagnostics: import('@nop-chaos/flux-core').CompileSchemaOptions['diagnostics'] =
      props.strictMode
        ? {
            enabled: true,
            continueOnError: true,
            collector: failOnDiagnostics
              ? { add: (issue) => collected.push(issue) }
              : undefined,
            reporter: props.env.reportSchemaDiagnostics ?? fallbackReporter,
          }
        : {
            enabled: true,
            continueOnError: true,
          };
    try {
      const template = props.runtime.schemaCompiler.compile(props.schema, { // raw-schema: retained(#1)
        schemaUrl: props.schemaUrl,
        importLoader: props.env.importLoader,
        resolveImportUrl: props.env.resolveImportUrl,
        preparedImports: props.preparedImports,
        validation: {
          strictMode: props.strictMode,
        },
        diagnostics,
      });
      if (failOnDiagnostics) {
        const errors = collected.filter((issue) => issue.severity === 'error');
        const first = errors[0];
        if (first) {
          const location = first.sourceLocation?.file ? `${first.sourceLocation.file} ` : '';
          throw new Error(
            `Schema compile diagnostics failed: ${location}${first.path} ${first.code} ${first.message}`.trim(),
            { cause: errors },
          );
        }
      }
      return { template, error: null };
    } catch (compilationError) {
      return {
        template: null,
        error:
          compilationError instanceof Error
            ? compilationError
            : new Error(String(compilationError)),
      };
    }
  }, [
    props.runtime,
    props.schema, // raw-schema: retained(#1)
    props.schemaUrl,
    props.env.importLoader,
    props.env.resolveImportUrl,
    props.env.reportSchemaDiagnostics,
    props.preparedImports,
    props.strictMode,
    fallbackReporter,
  ]);
  const compiledRoot = compileResult.template;

  useEffect(() => {
    if (!compileResult.error) {
      return;
    }
    reportImportFailure({
      env: props.env,
      error: compileResult.error,
      message: 'Schema compilation failed',
      phase: 'compile',
      path: props.schemaUrl,
    });
  }, [compileResult, props.env, props.schemaUrl]);

  useEffect(() => {
    const rootNode = getSingleRootNode(compiledRoot);
    props.page.validationOwner?.refreshCompiledModel(rootNode?.validationPlan);
  }, [compiledRoot, props.page]);

  // RM-7 (plan 609): modalContainer is read from the compiled root node's
  // canonical schema copy (compile-once snapshot) instead of the host-live
  // `props.schema` input. Compile failure assigns `undefined` (observed-
  // equivalent to unset on a fresh page; a same-page recompile failure
  // clears any prior value).
  useEffect(() => {
    const rootNode = getSingleRootNode(compiledRoot);
    const rootSchema = rootNode?.schema as BaseSchema & { modalContainer?: string } | undefined;
    props.page.modalContainer = rootSchema?.modalContainer;
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

export function createSchemaRenderer(registryDefinitions: RegisteredRendererDefinition[] = []) {
  const registry = createRendererRegistry(registryDefinitions.map(ensureRendererComponent));

  // plan 841 Phase 1: creation failure is a typed variant, not an
  // undefined-cast runtime fake — the old side-channel ref left render-time
  // derefs (`page.scope` etc.) unguarded, so a creation failure crashed the
  // render before the root error card could ever be reached.
  type SchemaRendererCreation =
    | {
        ok: true;
        runtime: import('@nop-chaos/flux-core').RendererRuntime;
        page: import('@nop-chaos/flux-core').PageRuntime;
        surface: import('@nop-chaos/flux-core').SurfaceRuntime;
      }
    | { ok: false; error: unknown };

  return function SchemaRenderer(props: SchemaRendererProps) {
    const onRuntimeChange = props.onRuntimeChange;
    const onComponentRegistryChange = props.onComponentRegistryChange;
    const onActionScopeChange = props.onActionScopeChange;
    const envRef = useRef(props.env);
    envRef.current = props.env;
    const onActionErrorRef = useRef(props.onActionError);
    onActionErrorRef.current = props.onActionError;
    // Same delegation pattern as onActionError: a stable wrapper so a monitor
    // prop swap never re-creates the runtime, while dispatch-time reads stay
    // current.
    const monitorRef = useRef(props.monitor);
    monitorRef.current = props.monitor;

    const pageData = props.data ?? EMPTY_SCOPE_DATA;
    const initialPageDataRef = useRef(pageData);
    const initialDataAppliedRef = useRef(false);
    const lastSyncedDataRef = useRef<unknown>(pageData);

    const creation = useMemo<SchemaRendererCreation>(() => {
      try {
        const resolvedRegistry = props.registry ?? registry;
        const expressionCompiler = createExpressionCompiler(
          props.formulaCompiler ?? createFormulaCompiler(),
        );

        const createdRuntime = createRendererRuntime({
          registry: resolvedRegistry,
          env: envRef.current,
          expressionCompiler,
          plugins: props.plugins,
          pageStore: props.pageStore,
          moduleCache: props.moduleCache,
          strictMode: isStrictValidationEnabled(props.strictValidation),
          onActionError: (error, ctx) => onActionErrorRef.current?.(error, ctx),
          monitor: (event) => monitorRef.current?.(event),
        });
        const createdPage = createdRuntime.createPageRuntime(initialPageDataRef.current);
        const createdSurface = createdRuntime.createSurfaceRuntime();
        return { ok: true, runtime: createdRuntime, page: createdPage, surface: createdSurface };
      // Errors routed through import error state — creation failure caught and
      // surfaced through the typed failure variant (root error card).
      } catch (error) {
        return { ok: false, error };
      }
    }, [
      props.formulaCompiler,
      props.plugins,
      props.registry,
      props.pageStore,
      props.moduleCache,
      props.strictValidation,
    ]);
    const runtime = creation.ok ? creation.runtime : undefined;
    const page = creation.ok ? creation.page : undefined;

    // plan 841: creation failures emit one monitor event per distinct failure
    // (phase 'render'), via an effect so render stays pure — the failure render
    // happens outside MonitorContext.Provider, hence the direct ref read.
    const reportedCreationErrorRef = useRef<unknown>(null);

    useEffect(() => {
      if (creation.ok || creation.error === reportedCreationErrorRef.current) {
        return;
      }
      reportedCreationErrorRef.current = creation.error;
      emitMonitorError(monitorRef.current, {
        type: 'error',
        phase: 'render',
        error: creation.error,
        details: { source: 'runtime-creation' },
      });
    }, [creation]);

    useEffect(() => {
      if (!page) {
        return;
      }
      const attachExternalPageStoreSync = (page as PageRuntimeWithExternalSync).__attachExternalPageStoreSync;
      if (!attachExternalPageStoreSync) {
        return;
      }

      return attachExternalPageStoreSync();
    }, [page]);

    useEffect(() => {
      if (!page) {
        return;
      }
      if (!initialDataAppliedRef.current) {
        initialDataAppliedRef.current = true;
        lastSyncedDataRef.current = pageData;
        return;
      }

      // Only sync when the host-authored page data actually changed. The
      // snapshot comparison must use the last-synced value, not the live scope
      // snapshot: page-scope writes (statusPath publication, page.data init
      // patch, action writes) would otherwise be clobbered by a no-op replace
      // on the StrictMode re-run.
      if (Object.is(lastSyncedDataRef.current, pageData)) {
        return;
      }
      lastSyncedDataRef.current = pageData;
      page.scope.store?.setSnapshot(pageData, {
        paths: ['*'],
        sourceScopeId: page.scope.id,
        kind: 'replace',
      });
    }, [page, pageData]);

    useEffect(() => {
      if (!runtime || !page) {
        return;
      }
      // FM-028 F3: setEnv is a ref swap (runtime env consumers read lazily at
      // dispatch/action time), and page.refresh() only bumps the page store's
      // refreshTick — a counter with zero subscribers whose store fan-out is
      // gated off by the unchanged-data check. The bump per host render was
      // the entire inline-env cost; removal changes no observable behavior,
      // while keeping props.env in deps preserves real env replacement.
      runtime.setEnv(props.env);
    }, [page, props.env, runtime]);

    useDeferredDispose({
      value: runtime,
      dispose: (disposedRuntime) => {
        disposedRuntime.dispose();
      },
    });

    const rootActionScope = useMemo(
      () =>
        creation.ok
          ? (props.actionScope ?? creation.runtime.createActionScope({ id: 'root-action-scope' }))
          : undefined,
      [creation, props.actionScope],
    );
    const ownsRootActionScope = props.actionScope == null;
    const rootComponentRegistry = useMemo(
      () =>
        creation.ok
          ? (props.componentRegistry ??
            creation.runtime.createComponentHandleRegistry({ id: 'root-component-registry' }))
          : undefined,
      [creation, props.componentRegistry],
    );
    const ownsRootComponentRegistry = props.componentRegistry == null;

    useDeferredDispose({
      value: rootActionScope,
      isEnabled: ownsRootActionScope,
      dispose: (disposedScope) => {
        runtime?.releaseActionScope(disposedScope);
      },
    });

    useDeferredDispose({
      value: rootComponentRegistry,
      isEnabled: ownsRootComponentRegistry,
      dispose: (disposedRegistry) => {
        disposedRegistry.dispose?.();
      },
    });

    useEffect(() => {
      return () => {
        if (!ownsRootActionScope || !rootActionScope) {
          return;
        }

        for (const namespace of rootActionScope.listNamespaces()) {
          rootActionScope.unregisterNamespace(namespace);
        }
      };
    }, [ownsRootActionScope, rootActionScope]);

    useEffect(() => {
      onRuntimeChange?.(runtime ?? null);

      return () => {
        onRuntimeChange?.(null);
      };
    }, [onRuntimeChange, runtime]);

    useEffect(() => {
      onComponentRegistryChange?.(rootComponentRegistry ?? null);
      page?.refresh();

      return () => {
        onComponentRegistryChange?.(null);
      };
    }, [onComponentRegistryChange, rootComponentRegistry, page]);

    useEffect(() => {
      onActionScopeChange?.(rootActionScope ?? null);

      return () => {
        onActionScopeChange?.(null);
      };
    }, [onActionScopeChange, rootActionScope]);
    const hasSchemaImports = useMemo(
      () => collectSchemaImports(props.schema).length > 0, // raw-schema: retained(#12)
      [props.schema], // raw-schema: retained(#12)
    );
    const [preparedImports, setPreparedImports] = useState<ReadonlyMap<
      string,
      import('@nop-chaos/flux-core').PreparedImportSpec
    > | null>(hasSchemaImports ? null : EMPTY_PREPARED_IMPORTS);
    const [prepareError, setPrepareError] = useState<unknown>(null);
    const prepareRequestIdRef = useRef(0);

    useEffect(() => {
      const controller = new AbortController();
      const requestId = ++prepareRequestIdRef.current;

      setPreparedImports(hasSchemaImports ? null : EMPTY_PREPARED_IMPORTS);
      setPrepareError(null);

      if (!hasSchemaImports) {
        return () => {
          controller.abort();
        };
      }

      if (!runtime) {
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

      void prepare(props.schema, { // raw-schema: retained(#12)
        schemaUrl: props.schemaUrl,
        signal,
      })
        .then((result) => {
          if (signal.aborted || prepareRequestIdRef.current !== requestId) {
            return;
          }
          setPreparedImports(result.preparedImports);
        })
        .catch((error) => {
          if (signal.aborted || prepareRequestIdRef.current !== requestId) {
            return;
          }
          if (
            (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV !==
            'production'
          ) {
            console.warn('[flux-react] Schema import preload failed', error);
          }
          const reportedError =
            error instanceof Error ? error : new Error(String(error), { cause: error });
          reportImportFailure({
            env: props.env,
            error: reportedError,
            message: reportedError.message,
            phase: 'compile',
            path: props.schemaUrl,
          });
          setPrepareError(error);
        });

      return () => {
        controller.abort();
      };
    }, [runtime, props.schema, props.schemaUrl, props.env, hasSchemaImports]); // raw-schema: retained(#12)

    const strictMode = isStrictValidationEnabled(props.strictValidation);

    if (!creation.ok) {
      return <SchemaRootError error={creation.error} />;
    }

    if (prepareError) {
      return <SchemaRootError error={prepareError} />;
    }

    if (!preparedImports) {
      return <SchemaRootStatus message="Preparing schema imports." />;
    }

    // Below this line `creation` is the ok variant, so the owned values are
    // defined by construction; `requireOwned` narrows the memo results whose
    // declared type still carries the failure-render `undefined`.
    return (
      <div data-runtime-id={creation.runtime.runtimeId} className="contents">
        <MonitorContext.Provider value={props.monitor}>
        <SchemaRootErrorBoundary>
          <CompiledSchemaTree
            runtime={creation.runtime}
            schema={props.schema} // raw-schema: retained(#1)
            schemaUrl={props.schemaUrl}
            env={props.env}
            preparedImports={preparedImports}
            strictMode={strictMode}
            renderScope={props.parentScope ?? creation.page.scope}
            page={creation.page}
            rootValidationOwner={
              props.parentScope ? NO_VALIDATION_OWNER : creation.page.validationOwner
            }
            surfaceRuntime={props.surfaceRuntime ?? creation.surface}
            rootActionScope={requireOwned(rootActionScope, 'root action scope')}
            rootComponentRegistry={requireOwned(rootComponentRegistry, 'root component registry')}
          />
        </SchemaRootErrorBoundary>
        </MonitorContext.Provider>
      </div>
    );
  };
}
