import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ActionScope,
  ComponentHandleRegistry,
  NodeInstance,
  RendererRuntime,
  ScopeRef,
  XuiImportSpec
} from '@nop-chaos/flux-core';
import { isReportedImportError, shouldWarnOnImportFailure } from './node-renderer-utils';

const EMPTY_IMPORT_BINDINGS: Readonly<Record<string, unknown>> = Object.freeze({});

interface AsyncImportState {
  requestKey: symbol | null;
  error?: unknown;
  expressionBindings: Readonly<Record<string, unknown>>;
}

function createImportRequestKey(...inputs: readonly unknown[]): symbol {
  void inputs;
  return Symbol('node-imports-request');
}

const INITIAL_IMPORT_STATE: AsyncImportState = Object.freeze({
  requestKey: null,
  error: undefined as unknown,
  expressionBindings: EMPTY_IMPORT_BINDINGS
});

export interface NodeImportsState {
  ready: boolean;
  loading: boolean;
  error?: unknown;
  expressionBindings: Readonly<Record<string, unknown>>;
}

export function useNodeImports(
  runtime: RendererRuntime,
  nodeImports: readonly XuiImportSpec[] | undefined,
  activeActionScope: ActionScope | undefined,
  activeComponentRegistry: ComponentHandleRegistry | undefined,
  activeScope: ScopeRef,
  nodeInstance: NodeInstance
): NodeImportsState {
  const hasImports = Boolean(nodeImports?.length && activeActionScope);
  const activeImportLoader = runtime.env.importLoader;
  const shouldLoad = hasImports;
  const requestKey = useMemo(
    () => createImportRequestKey(runtime, activeImportLoader, shouldLoad, nodeImports, activeActionScope, activeComponentRegistry, activeScope),
    [runtime, activeImportLoader, shouldLoad, nodeImports, activeActionScope, activeComponentRegistry, activeScope]
  );
  const [asyncState, setAsyncState] = useState<AsyncImportState>(INITIAL_IMPORT_STATE);
  const nodeInstanceRef = useRef(nodeInstance);

  useEffect(() => {
    nodeInstanceRef.current = nodeInstance;
  }, [nodeInstance]);

  useEffect(() => {
    if (!shouldLoad || !activeActionScope) {
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    void runtime.ensureImportedNamespaces({
      imports: nodeImports,
      actionScope: activeActionScope,
      componentRegistry: activeComponentRegistry,
      scope: activeScope,
      nodeInstance: nodeInstanceRef.current
    }).then(() => {
      if (signal.aborted) {
        return;
      }

      setAsyncState({
        requestKey,
        error: undefined,
        expressionBindings: runtime.getImportedExpressionBindings({
          imports: nodeImports,
          actionScope: activeActionScope
        })
      });
    }).catch((error) => {
      if (signal.aborted) {
        return;
      }

      setAsyncState({
        requestKey,
        error,
        expressionBindings: EMPTY_IMPORT_BINDINGS
      });

      if (!shouldWarnOnImportFailure()) {
        return;
      }

      const templateNode = nodeInstanceRef.current.templateNode;

      console.warn('[flux-react] Failed to ensure imported namespaces', {
        nodeId: templateNode.id,
        path: templateNode.templatePath,
        imports: nodeImports,
        error
      });

      if (!isReportedImportError(error)) {
        runtime.env.notify('error', `Imported namespaces failed for ${templateNode.templatePath}: ${error instanceof Error ? error.message : String(error)}`);
        runtime.env.monitor?.onError?.({
          phase: 'render',
          error,
          nodeId: templateNode.id,
          path: templateNode.templatePath,
          details: {
            reason: 'import-namespace-setup-failed',
            imports: nodeImports ?? []
          }
        });
      }
    });

    return () => {
      controller.abort();
      runtime.releaseImportedNamespaces({
        imports: nodeImports,
        actionScope: activeActionScope
      });
    };
  }, [requestKey, runtime, activeImportLoader, shouldLoad, nodeImports, activeActionScope, activeComponentRegistry, activeScope]);

  const loading = shouldLoad && asyncState.requestKey !== requestKey;
  const error = shouldLoad && asyncState.requestKey === requestKey ? asyncState.error : undefined;

  return {
    ready: !shouldLoad || (!loading && !error),
    loading,
    error,
    expressionBindings: shouldLoad
      ? asyncState.requestKey === requestKey
        ? asyncState.expressionBindings
        : EMPTY_IMPORT_BINDINGS
      : EMPTY_IMPORT_BINDINGS
  };
}
