import { useEffect, useRef, useState } from 'react';
import type {
  ActionScope,
  ComponentHandleRegistry,
  NodeInstance,
  PageRuntime,
  RendererRuntime,
  ScopeRef,
  XuiImportSpec
} from '@nop-chaos/flux-core';
import { isReportedImportError, shouldWarnOnImportFailure } from './node-renderer-utils';

const EMPTY_IMPORT_BINDINGS: Readonly<Record<string, unknown>> = Object.freeze({});

export function useNodeImports(
  runtime: RendererRuntime,
  nodeImports: readonly XuiImportSpec[] | undefined,
  activeActionScope: ActionScope | undefined,
  activeComponentRegistry: ComponentHandleRegistry | undefined,
  activeScope: ScopeRef,
  nodeInstance: NodeInstance,
  page?: PageRuntime
): Readonly<Record<string, unknown>> {
  const hasImports = Boolean(nodeImports?.length && activeActionScope);
  const activeImportLoader = runtime.env.importLoader;
  const [expressionBindings, setExpressionBindings] = useState<Readonly<Record<string, unknown>>>(EMPTY_IMPORT_BINDINGS);
  const nodeInstanceRef = useRef(nodeInstance);

  useEffect(() => {
    nodeInstanceRef.current = nodeInstance;
  }, [nodeInstance]);

  useEffect(() => {
    if (!hasImports || !activeActionScope) {
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

      setExpressionBindings(runtime.getImportedExpressionBindings({
        imports: nodeImports,
        actionScope: activeActionScope
      }));
    }).catch((error) => {
      if (signal.aborted) {
        return;
      }

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
  }, [runtime, activeImportLoader, hasImports, nodeImports, activeActionScope, activeComponentRegistry, activeScope, page]);

  return hasImports ? expressionBindings : EMPTY_IMPORT_BINDINGS;
}
