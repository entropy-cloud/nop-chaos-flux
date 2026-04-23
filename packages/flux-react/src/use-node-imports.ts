import { useEffect, useMemo, useRef, useState } from 'react';
import {
  isReportedImportError,
  reportImportFailure,
  type ActionScope,
  type ComponentHandleRegistry,
  type ImportFrame,
  type NodeInstance,
  type RendererRuntime,
  type ScopeRef,
  type XuiImportSpec
} from '@nop-chaos/flux-core';
import { shouldWarnOnImportFailure } from './node-renderer-utils';

const EMPTY_IMPORT_BINDINGS: Readonly<Record<string, unknown>> = Object.freeze({});

interface AsyncImportState {
  requestKey: symbol | null;
  error?: unknown;
  frame?: ImportFrame;
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
  frame?: ImportFrame;
  expressionBindings: Readonly<Record<string, unknown>>;
}

export function useNodeImports(
  runtime: RendererRuntime,
  nodeImports: readonly XuiImportSpec[] | undefined,
  parentImportFrame: ImportFrame | undefined,
  activeActionScope: ActionScope | undefined,
  activeComponentRegistry: ComponentHandleRegistry | undefined,
  activeScope: ScopeRef,
  schemaUrl: string,
  nodeInstance: NodeInstance
): NodeImportsState {
  const hasImports = Boolean(nodeImports?.length && activeActionScope);
  const shouldLoad = hasImports;
  const requestKey = useMemo(
    () => createImportRequestKey(runtime, shouldLoad, nodeImports, parentImportFrame?.id, activeActionScope, activeComponentRegistry, activeScope, schemaUrl, nodeInstance.templateNode.id),
    [runtime, shouldLoad, nodeImports, parentImportFrame?.id, activeActionScope, activeComponentRegistry, activeScope, schemaUrl, nodeInstance.templateNode.id]
  );
  const [asyncState, setAsyncState] = useState<AsyncImportState>(INITIAL_IMPORT_STATE);
  const nodeInstanceRef = useRef(nodeInstance);
  const frameRef = useRef<ImportFrame | undefined>(undefined);

  useEffect(() => {
    nodeInstanceRef.current = nodeInstance;
  }, [nodeInstance]);

  useEffect(() => {
    if (!shouldLoad || !activeActionScope || !nodeImports?.length) {
      frameRef.current = undefined;
      return;
    }

    let disposed = false;

    void runtime.importStack.push({
      ownerNodeId: nodeInstance.templateNode.id,
      parentFrameId: parentImportFrame?.id,
      imports: nodeImports,
      actionScope: activeActionScope,
      componentRegistry: activeComponentRegistry,
      scope: activeScope,
      schemaUrl,
      nodeInstance
      }).then((frame) => {
      if (disposed) {
        if (frame) {
          runtime.importStack.pop(frame.id);
        }
        return;
      }

      frameRef.current = frame;

      setAsyncState({
        requestKey,
        error: undefined,
        frame,
        expressionBindings: runtime.importStack.currentBindings(frame?.id)
      });
    }).catch((error) => {
      if (disposed) {
        return;
      }

      setAsyncState({
        requestKey,
        error,
        frame: undefined,
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
        reportImportFailure({
          env: runtime.env,
          error: error instanceof Error ? error : new Error(String(error)),
          imports: nodeImports ?? [],
          nodeId: templateNode.id,
          path: templateNode.templatePath,
          message: `Imported namespaces failed for ${templateNode.templatePath}: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    });

    return () => {
      disposed = true;
      const frame = frameRef.current;
      frameRef.current = undefined;
      if (frame) {
        runtime.importStack.pop(frame.id);
      }
    };
  }, [requestKey, runtime, shouldLoad, nodeImports, parentImportFrame, activeActionScope, activeComponentRegistry, activeScope, schemaUrl, nodeInstance]);

  const loading = shouldLoad && asyncState.requestKey !== requestKey;
  const error = shouldLoad && asyncState.requestKey === requestKey ? asyncState.error : undefined;

  return {
    ready: !shouldLoad || (!loading && !error),
    loading,
    error,
    frame: shouldLoad && asyncState.requestKey === requestKey ? asyncState.frame : parentImportFrame,
    expressionBindings: shouldLoad
      ? asyncState.requestKey === requestKey
        ? asyncState.expressionBindings
        : runtime.importStack.currentBindings(parentImportFrame?.id)
      : runtime.importStack.currentBindings(parentImportFrame?.id)
  };
}
