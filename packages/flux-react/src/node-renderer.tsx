import { useContext, useEffect, useMemo, memo } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import { NodeErrorBoundary } from './node-error-boundary';
import type {
  ActionSchema,
  ActionScope,
  ComponentHandleRegistry,
  NodeRuntimeState,
  RendererComponentProps,
  ResolvedNodeMeta,
  ResolvedNodeProps,
  ScopeChange,
  ScopeRef,
  TemplateNode
} from '@nop-chaos/flux-core';
import { mergeClassAliases, resolveClassAliases } from '@nop-chaos/flux-core';
import { scopeChangeHitsDependencies } from '@nop-chaos/flux-runtime';
import {
  ClassAliasesContext,
} from './contexts';
import { useRenderInstancePath, useRendererRuntime, useCurrentForm, useCurrentPage, useCurrentSurfaceRuntime, useCurrentImportFrame, useCurrentValidationScope } from './hooks';
import { createHelpers } from './helpers';
import { createNormalizedActionEvent } from './helpers';
import { RenderNodes } from './render-nodes';
import { NodeFrameWrapper } from './node-frame-wrapper';
import { createNodeInstance, createTemplateNodeRuntimeState } from './node-instance';
import { useNodeScopes } from './use-node-scopes';
import { useNodeDebugData } from './use-node-debug-data';
import { useNodeSourceProps } from './use-node-source-props';
import { useNodeLifecycleActions, useRenderMonitor } from './node-renderer-effects';
import { NodeRendererProviders } from './node-renderer-providers';
import { buildSlotFrame, readSlotFrame, SLOT_KEY } from './slot-frame';

export { resolveFrameWrapMode } from './node-renderer-utils';

function useMountedCid(runtime: import('@nop-chaos/flux-core').RendererRuntime) {
  return useMemo(() => runtime.allocateMountedCid(), [runtime]);
}

function createImportOwnedActionScope(runtime: import('@nop-chaos/flux-core').RendererRuntime, parent: ActionScope | undefined, nodeId: string) {
  return runtime.createActionScope({
    id: `${nodeId}:action-scope`,
    parent
  });
}

const NodeRendererResolved = memo(function NodeRendererResolved(props: {
  node: TemplateNode;
  scope: ScopeRef;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  importFrame?: import('@nop-chaos/flux-core').ImportFrame;
  mountedCid: number;
}) {
  const runtime = useRendererRuntime();
  const instancePath = useRenderInstancePath();
  const parentClassAliases = useContext(ClassAliasesContext);
  const currentForm = useCurrentForm();
  const currentValidationScope = useCurrentValidationScope();
  const currentPage = useCurrentPage();
  const currentSurfaceRuntime = useCurrentSurfaceRuntime();
  const mountedCid = props.mountedCid;
  const nodeState = useMemo<NodeRuntimeState>(
    () => createTemplateNodeRuntimeState(props.node),
    [props.node]
  );

  const propsProgram = props.node.propsProgram;
  const metaProgram = props.node.metaProgram;
  const isStatic = useMemo(
    () => propsProgram.kind === 'static' && Object.keys(metaProgram).every((key) => {
      const v = metaProgram[key as keyof typeof metaProgram];
      return !v || (v as { kind?: string }).kind !== 'dynamic';
    }),
    [propsProgram, metaProgram]
  );

  const getNodeResolution = () => ({
    meta: runtime.resolveNodeMeta(props.node, props.scope, nodeState),
    resolvedProps: runtime.resolveNodeProps(props.node, props.scope, nodeState)
  });
  const subscribe = useMemo(
    () => isStatic
      ? (() => () => undefined)
      : ((listener: () => void) => props.scope.store?.subscribe((change: ScopeChange) => {
        const metaHit = scopeChangeHitsDependencies(change, nodeState.metaDependencies);
        const propsHit = scopeChangeHitsDependencies(change, nodeState.propsDependencies);

        if (metaHit || propsHit) {
          listener();
        }
      }) ?? (() => undefined)),
    [isStatic, props.scope, nodeState]
  );
  const getSnapshot = useMemo(
    () => isStatic
      ? (() => null)
      : (() => props.scope.store?.getLastChange() ?? null),
    [isStatic, props.scope]
  );

  const { meta: baseMeta, resolvedProps: baseResolvedProps } = useSyncExternalStoreWithSelector(
    subscribe,
    getSnapshot,
    getSnapshot,
    getNodeResolution,
    (prev: { meta: ResolvedNodeMeta; resolvedProps: ResolvedNodeProps } | null, next: { meta: ResolvedNodeMeta; resolvedProps: ResolvedNodeProps }) => {
      if (!prev) return false;
      return prev.meta === next.meta && prev.resolvedProps === next.resolvedProps;
    }
  );

  const nodeClassAliases = props.node.classAliasesPlan?.aliases;
  const hasNodeClassAliases = Boolean(nodeClassAliases);
  const hasParentClassAliases = Boolean(parentClassAliases);
  const mergedClassAliases = useMemo(
    () => hasParentClassAliases || hasNodeClassAliases
      ? mergeClassAliases(parentClassAliases, nodeClassAliases)
      : undefined,
    [hasNodeClassAliases, hasParentClassAliases, parentClassAliases, nodeClassAliases]
  );
  const resolvedMeta = useMemo(() => {
    const resolvedClassName = mergedClassAliases
      ? resolveClassAliases(baseMeta.className, mergedClassAliases)
      : baseMeta.className;
    const nextMeta = resolvedClassName !== baseMeta.className
      ? { ...baseMeta, className: resolvedClassName }
      : baseMeta;

    return nextMeta.cid === mountedCid
      ? nextMeta
      : { ...nextMeta, cid: mountedCid };
  }, [baseMeta, mergedClassAliases, mountedCid]);

  const activeActionScope = props.actionScope;
  const activeComponentRegistry = props.componentRegistry;
  const renderScope = props.scope;
  const finalResolvedMeta = resolvedMeta;
  const resolvedComponentProps = useNodeSourceProps(props.node, baseResolvedProps.value, renderScope);
  const nodeInstance = useMemo(
    () => createNodeInstance({
      templateNode: props.node,
      scope: renderScope,
      state: nodeState,
      cid: finalResolvedMeta.cid,
      instancePath,
      mounted: true
    }),
    [props.node, renderScope, nodeState, finalResolvedMeta.cid, instancePath]
  );

  useNodeDebugData(activeComponentRegistry, finalResolvedMeta.cid, nodeInstance, renderScope, finalResolvedMeta, resolvedComponentProps, currentForm);

  const helpers = useMemo(
    () =>
      createHelpers({
        runtime,
        scope: renderScope,
        actionScope: activeActionScope,
        componentRegistry: activeComponentRegistry,
        form: currentForm,
        page: currentPage,
        surfaceRuntime: currentSurfaceRuntime,
        nodeInstance
      }),
    [runtime, renderScope, activeActionScope, activeComponentRegistry, currentForm, currentPage, currentSurfaceRuntime, nodeInstance]
  );
  const lifecycleActions = props.node.lifecycleActions;

  const events = useMemo(() => {
    return Object.fromEntries(
      Object.entries(props.node.eventPlans).map(([key, action]) => {
        if (!action) {
          return [key, undefined];
        }

        return [
          key,
          (event?: unknown, eventContext?: Partial<import('@nop-chaos/flux-core').ActionContext>) =>
            helpers.dispatch(action as any, {
              ...eventContext,
              nodeInstance: eventContext?.nodeInstance ?? nodeInstance,
              event: createNormalizedActionEvent(event)
            })
        ];
      })
    );
  }, [helpers, nodeInstance, props.node.eventPlans]);

  const regions = useMemo(() => {
    return Object.fromEntries(
      Object.entries(props.node.regions).map(([key, region]) => {
        const params = region.params;
        const regionIsolate = region.isolate;

        function instantiateRegion(options?: import('@nop-chaos/flux-core').RenderFragmentOptions) {
          const rawBindings = options?.bindings ?? (options?.data as Record<string, unknown> | undefined);

          if (params && params.length > 0 && rawBindings) {
            const currentScopeData = renderScope.readVisible?.() as Record<string, unknown> | undefined ?? {};
            const outerSlotFrame = readSlotFrame(currentScopeData);
            const slotFrame = buildSlotFrame(rawBindings, outerSlotFrame);
            return (
              <RenderNodes
                input={region.node as any}
                options={{
                  ...options,
                  bindings: { [SLOT_KEY]: slotFrame },
                  isolate: options?.isolate ?? regionIsolate,
                  ownerNodeInstance: options?.ownerNodeInstance ?? nodeInstance
                }}
              />
            );
          }

          return (
            <RenderNodes
              input={region.node as any}
              options={{
                ...options,
                ownerNodeInstance: options?.ownerNodeInstance ?? nodeInstance
              }}
            />
          );
        }

        return [
          key,
          {
            key,
            templateNode: region.node,
            params,
            render: instantiateRegion,
            instantiate: instantiateRegion
          }
        ];
      })
    );
  }, [nodeInstance, renderScope, props.node.regions]);

  const componentProps: RendererComponentProps = {
    id: props.node.id,
    path: props.node.templatePath,
    schema: props.node.schema,
    templateNode: props.node,
    node: nodeInstance,
    props: resolvedComponentProps,
    meta: finalResolvedMeta,
    regions,
    events,
    helpers
  };

  const Comp = props.node.component.component!;
  const lifecycleActionsValue = lifecycleActions
    ? {
        onMount: lifecycleActions.onMount as ActionSchema | ActionSchema[] | undefined,
        onUnmount: lifecycleActions.onUnmount as ActionSchema | ActionSchema[] | undefined,
      }
    : undefined;

  useRenderMonitor({
    monitor: runtime.env.monitor,
    templateNode: props.node,
    resolvedMeta: finalResolvedMeta
  });
  useNodeLifecycleActions({
    lifecycleActions: lifecycleActionsValue,
    helpers,
    nodeInstance
  });

  const fieldName = typeof props.node.schema.name === 'string' ? props.node.schema.name : undefined;
  const isFieldHidden = Boolean(!finalResolvedMeta.visible || finalResolvedMeta.hidden);
  const hiddenOwner = currentForm ?? currentValidationScope;

  useEffect(() => {
    if (!hiddenOwner || !fieldName || !('notifyFieldHidden' in hiddenOwner)) {
      return;
    }

    (hiddenOwner as import('@nop-chaos/flux-core').FormRuntime).notifyFieldHidden(fieldName, isFieldHidden);

    return () => {
      (hiddenOwner as import('@nop-chaos/flux-core').FormRuntime).notifyFieldHidden(fieldName, false);
    };
  }, [hiddenOwner, fieldName, isFieldHidden]);

  if (!finalResolvedMeta.visible || finalResolvedMeta.hidden) {
    return null;
  }

  const element = <Comp {...componentProps} />;

  const content = (
    <NodeFrameWrapper
      templateNode={props.node}
      definitionWrap={props.node.component.wrap}
      resolvedMeta={finalResolvedMeta}
      resolvedPropsValue={resolvedComponentProps}
      regions={regions}
    >
      {element}
    </NodeFrameWrapper>
  );

  return (
    <NodeRendererProviders
      templateNode={props.node}
      nodeInstance={nodeInstance}
      actionScope={activeActionScope}
      provideActionScope={props.node.component.actionScopePolicy !== 'new' && Boolean(props.node.importsPlan?.preparedImports.length)}
      componentRegistry={activeComponentRegistry}
      importFrame={props.importFrame}
      scope={renderScope}
      classAliases={mergedClassAliases}
    >
      {content}
    </NodeRendererProviders>
  );
});

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
  const { activeActionScope, activeComponentRegistry } = useNodeScopes(runtime, {
    nodeId: props.node.id,
    actionScopePolicy: props.node.component.actionScopePolicy,
    componentRegistryPolicy: props.node.component.componentRegistryPolicy
  }, props.actionScope, props.componentRegistry);
  const resolvedActionScope = importOwnedActionScope ?? activeActionScope;
  const importSetupState = useMemo<NodeRuntimeState | undefined>(
    () => nodeImports?.length
      ? createTemplateNodeRuntimeState(props.node)
      : undefined,
    [props.node, nodeImports]
  );
  const importOwnerNodeInstance = useMemo(
    () => nodeImports?.length && importSetupState
      ? createNodeInstance({
          templateNode: props.node,
          scope: props.scope,
          state: importSetupState,
          cid: mountedCid,
          instancePath,
          mounted: true
        })
      : undefined,
    [props.node, props.scope, importSetupState, mountedCid, instancePath, nodeImports]
  );
  const importFrame = useMemo(
    () => nodeImports?.length
      ? runtime.importStack.installPrepared({
          ownerNodeId: props.node.id,
          parentFrame: parentImportFrame,
          imports: nodeImports,
          actionScope: resolvedActionScope,
          componentRegistry: activeComponentRegistry,
          scope: props.scope,
          nodeInstance: importOwnerNodeInstance
        })
      : parentImportFrame,
    [runtime, props.node.id, parentImportFrame, nodeImports, resolvedActionScope, activeComponentRegistry, props.scope, importOwnerNodeInstance]
  );
  useEffect(() => {
    return () => {
      if (importFrame && importFrame !== parentImportFrame) {
        runtime.importStack.pop(importFrame.id);
      }
    };
  }, [runtime, importFrame, parentImportFrame]);
  const importBindings = useMemo(
    () => importFrame ? runtime.importStack.currentBindings(importFrame.id) : undefined,
    [runtime, importFrame]
  );
  const renderScope = useMemo(
    () => !importBindings || Object.keys(importBindings).length === 0
      ? props.scope
      : runtime.createChildScope(props.scope, importBindings, {
          pathSuffix: 'imports',
          scopeKey: `${props.node.id}:imports`
        }),
    [runtime, props.scope, importBindings, props.node.id]
  );

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
