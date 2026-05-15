import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  memo,
} from 'react';
import type {
  ActionScope,
  ComponentHandleRegistry,
  NodeRuntimeState,
  ScopeRef,
  TemplateNode,
} from '@nop-chaos/flux-core';
import { createNamedActionProvider, XUI_ACTIONS_NAMESPACE } from '@nop-chaos/flux-core';
import { NodeErrorBoundary } from './node-error-boundary.js';
import {
  useRenderInstancePath,
  useRendererRuntime,
  useCurrentImportFrame,
} from './hooks.js';
import { createNodeInstance, createTemplateNodeRuntimeState } from './node-instance.js';
import { useNodeScopes } from './use-node-scopes.js';
import { NodeRendererResolved } from './node-renderer-resolved.js';

export { resolveFrameWrapMode } from './node-renderer-utils.js';

function useMountedCid(runtime: import('@nop-chaos/flux-core').RendererRuntime) {
  return useMemo(() => runtime.allocateMountedCid(), [runtime]);
}

function createImportOwnedActionScope(
  runtime: import('@nop-chaos/flux-core').RendererRuntime,
  parent: ActionScope | undefined,
  nodeId: string,
) {
  return runtime.createActionScope({
    id: `${nodeId}:action-scope`,
    parent,
  });
}

function createImportFrameStore() {
  const listeners = new Set<() => void>();

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    publish() {
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

export const NodeRenderer = memo(function NodeRenderer(props: {
  node: TemplateNode;
  scope: ScopeRef;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
}) {
  const runtime = useRendererRuntime();
  const instancePath = useRenderInstancePath();
  const parentImportFrame = useCurrentImportFrame();
  const mountedCid = useMountedCid(runtime);
  const nodeImports = props.node.importsPlan?.preparedImports;
  const importOwnedActionScope = useMemo(() => {
    if (!nodeImports?.length) {
      return undefined;
    }

    return createImportOwnedActionScope(runtime, props.actionScope, props.node.id);
  }, [runtime, props.actionScope, props.node.id, nodeImports]);
  const { activeActionScope, activeComponentRegistry } = useNodeScopes(
    runtime,
    {
      nodeId: props.node.id,
      actionScopePolicy: props.node.component.actionScopePolicy,
      componentRegistryPolicy: props.node.component.componentRegistryPolicy,
    },
    props.actionScope,
    props.componentRegistry,
  );
  const resolvedActionScope = importOwnedActionScope ?? activeActionScope;
  const importSetupState = useMemo<NodeRuntimeState | undefined>(
    () => (nodeImports?.length ? createTemplateNodeRuntimeState(props.node) : undefined),
    [props.node, nodeImports],
  );
  const importOwnerNodeInstance = useMemo(
    () =>
      nodeImports?.length && importSetupState
        ? createNodeInstance({
            templateNode: props.node,
            scope: props.scope,
            state: importSetupState,
            cid: mountedCid,
            instancePath,
            mounted: true,
          })
        : undefined,
    [props.node, props.scope, importSetupState, mountedCid, instancePath, nodeImports],
  );
  const importFrameStore = useMemo(() => createImportFrameStore(), []);
  const importFrameRef = useRef<import('@nop-chaos/flux-core').ImportFrame | undefined>(
    nodeImports?.length ? undefined : parentImportFrame,
  );
  const getImportFrameSnapshot = useCallback(
    () => (nodeImports?.length ? importFrameRef.current : parentImportFrame),
    [nodeImports, parentImportFrame],
  );
  const importFrame = useSyncExternalStore(
    importFrameStore.subscribe,
    getImportFrameSnapshot,
    getImportFrameSnapshot,
  );
  useLayoutEffect(() => {
    if (!nodeImports?.length) {
      if (importFrameRef.current !== parentImportFrame) {
        importFrameRef.current = parentImportFrame;
        importFrameStore.publish();
      }
      return;
    }

    const nextFrame = runtime.importStack.installPrepared({
      ownerNodeId: props.node.id,
      parentFrame: parentImportFrame,
      imports: nodeImports,
      actionScope: resolvedActionScope,
      componentRegistry: activeComponentRegistry,
      scope: props.scope,
      nodeInstance: importOwnerNodeInstance,
    });
    if (importFrameRef.current !== nextFrame) {
      importFrameRef.current = nextFrame;
      importFrameStore.publish();
    }

    return () => {
      if (nextFrame && nextFrame !== parentImportFrame) {
        runtime.importStack.pop(nextFrame.id);
      }

      if (importFrameRef.current === nextFrame) {
        importFrameRef.current = undefined;
        importFrameStore.publish();
      }
    };
  }, [
    importFrameStore,
    runtime,
    props.node.id,
    parentImportFrame,
    nodeImports,
    resolvedActionScope,
    activeComponentRegistry,
    props.scope,
    importOwnerNodeInstance,
  ]);
  const namedActionPlans = props.node.namedActionPlans;
  useLayoutEffect(() => {
    if (!namedActionPlans || !resolvedActionScope) {
      return;
    }

    const provider = createNamedActionProvider(
      namedActionPlans,
      resolvedActionScope.parent,
      (program, ctx) => ctx.runtime.dispatch(program, ctx),
    );

    return resolvedActionScope.registerNamespace(XUI_ACTIONS_NAMESPACE, provider);
  }, [namedActionPlans, resolvedActionScope]);
  const importBindings = useMemo(
    () => (importFrame ? runtime.importStack.currentBindings(importFrame.id) : undefined),
    [runtime, importFrame],
  );
  const renderScope = useMemo(
    () =>
      !importBindings || Object.keys(importBindings).length === 0
        ? props.scope
        : runtime.createChildScope(props.scope, importBindings, {
            pathSuffix: 'imports',
            scopeKey: `${props.node.id}:imports`,
          }),
    [runtime, props.scope, importBindings, props.node.id],
  );

  if (nodeImports?.length && !importFrame) {
    return null;
  }

  return (
    <NodeErrorBoundary nodeId={props.node.id}>
      <NodeRendererResolved
        node={props.node}
        scope={renderScope}
        actionScope={resolvedActionScope}
        componentRegistry={activeComponentRegistry}
        importFrame={importFrame}
        mountedCid={mountedCid}
      />
    </NodeErrorBoundary>
  );
});
