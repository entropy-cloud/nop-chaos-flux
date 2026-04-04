import { useEffect } from 'react';
import type {
  ActionScope,
  ComponentHandleRegistry,
  CompiledSchemaNode,
  RendererRuntime,
  ScopeRef,
  XuiImportSpec
} from '@nop-chaos/flux-core';
import { isReportedImportError, shouldWarnOnImportFailure } from './node-renderer-utils';

export function useNodeImports(
  runtime: RendererRuntime,
  nodeImports: readonly XuiImportSpec[] | undefined,
  activeActionScope: ActionScope | undefined,
  activeComponentRegistry: ComponentHandleRegistry | undefined,
  activeScope: ScopeRef,
  node: CompiledSchemaNode
): void {
  const activeImportLoader = runtime.env.importLoader;

  useEffect(() => {
    void runtime.ensureImportedNamespaces({
      imports: nodeImports,
      actionScope: activeActionScope,
      componentRegistry: activeComponentRegistry,
      scope: activeScope,
      node
    }).catch((error) => {
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
      runtime.releaseImportedNamespaces({
        imports: nodeImports,
        actionScope: activeActionScope
      });
    };
  }, [runtime, activeImportLoader, nodeImports, activeActionScope, activeComponentRegistry, activeScope, node]);
}
