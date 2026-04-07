import { useEffect, useState } from 'react';
import type {
  ActionScope,
  ComponentHandleRegistry,
  CompiledSchemaNode,
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
  page?: PageRuntime
): Readonly<Record<string, unknown>> {
  const hasImports = Boolean(nodeImports?.length && activeActionScope);
  const activeImportLoader = runtime.env.importLoader;
  const [, setBindingsVersion] = useState(0);
  const expressionBindings = hasImports
    ? runtime.getImportedExpressionBindings({
        imports: nodeImports,
        actionScope: activeActionScope
      })
    : EMPTY_IMPORT_BINDINGS;

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
      node
    }).then(() => {
      if (disposed) {
        return;
      }

      setBindingsVersion((value) => value + 1);
      page?.refresh();
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
