import { useEffect, useRef, useState } from 'react';
import type {
  ActionScope,
  ComponentHandleRegistry,
  CompiledSchemaNode,
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
  node: CompiledSchemaNode,
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

    let disposed = false;

    void runtime.ensureImportedNamespaces({
      imports: nodeImports,
      actionScope: activeActionScope,
      componentRegistry: activeComponentRegistry,
      scope: activeScope,
      node,
      nodeInstance: nodeInstanceRef.current
    }).then(() => {
      if (disposed) {
        return;
      }

      setExpressionBindings(runtime.getImportedExpressionBindings({
        imports: nodeImports,
        actionScope: activeActionScope
      }));
    }).catch((error) => {
      if (disposed) {
        return;
      }

      if (!shouldWarnOnImportFailure()) {
        return;
      }

      console.warn('[flux-react] Failed to ensure imported namespaces', {
        nodeId: node.id,
        path: node.path,
        imports: nodeImports,
        error
      });

      if (!isReportedImportError(error)) {
        runtime.env.notify('error', `Imported namespaces failed for ${node.path}: ${error instanceof Error ? error.message : String(error)}`);
        runtime.env.monitor?.onError?.({
          phase: 'render',
          error,
          nodeId: node.id,
          path: node.path,
          details: {
            reason: 'import-namespace-setup-failed',
            imports: nodeImports ?? []
          }
        });
      }
    });

    return () => {
      disposed = true;
      runtime.releaseImportedNamespaces({
        imports: nodeImports,
        actionScope: activeActionScope
      });
    };
  }, [runtime, activeImportLoader, hasImports, nodeImports, activeActionScope, activeComponentRegistry, activeScope, node, page]);

  return hasImports ? expressionBindings : EMPTY_IMPORT_BINDINGS;
}
