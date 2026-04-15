import { useContext, useEffect, useMemo, memo } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import { NodeErrorBoundary } from './node-error-boundary';
import type {
  ActionScope,
  ComponentHandleRegistry,
  CompiledNodeRuntimeState,
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
import { useRenderInstancePath, useRendererRuntime, useCurrentForm, useCurrentPage, useCurrentSurfaceRuntime } from './hooks';
import { createHelpers } from './helpers';
import { createNormalizedActionEvent } from './helpers';
import { RenderNodes } from './render-nodes';
import {
  getNodeClassAliases,
  getNodeImports
} from './node-renderer-utils';
import { NodeFrameWrapper } from './node-frame-wrapper';
import { createNodeInstance, createTemplateNodeRuntimeState } from './node-instance';
import { useNodeScopes } from './useNodeScopes';
import { useNodeImports } from './useNodeImports';
import { useNodeDebugData } from './useNodeDebugData';
import { useNodeSourceProps } from './use-node-source-props';
import { useNodeLifecycleActions, useRenderMonitor } from './node-renderer-effects';
import { NodeRendererProviders } from './node-renderer-providers';
import { buildSlotFrame, readSlotFrame, SLOT_KEY } from './slot-frame';

export { resolveFrameWrapMode } from './node-renderer-utils';

function useMountedCid(runtime: import('@nop-chaos/flux-core').RendererRuntime) {
  return useMemo(() => runtime.allocateMountedCid(), [runtime]);
}

const NodeRendererResolved = memo(function NodeRendererResolved(props: {
  node: TemplateNode;
  scope: ScopeRef;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  mountedCid: number;
}) {
  const runtime = useRendererRuntime();
  const instancePath = useRenderInstancePath();
  const parentClassAliases = useContext(ClassAliasesContext);
  const currentForm = useCurrentForm();
  const currentPage = useCurrentPage();
  const currentSurfaceRuntime = useCurrentSurfaceRuntime();
  const mountedCid = props.mountedCid;
  const nodeState = useMemo<CompiledNodeRuntimeState>(
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

  const { meta: baseMeta } = useSyncExternalStoreWithSelector(
    subscribe,
    getSnapshot,
    getSnapshot,
    getNodeResolution,
    (prev: { meta: ResolvedNodeMeta; resolvedProps: ResolvedNodeProps } | null, next: { meta: ResolvedNodeMeta; resolvedProps: ResolvedNodeProps }) => {
      if (!prev) return false;
      return prev.meta === next.meta && prev.resolvedProps === next.resolvedProps;
    }
  );

  const nodeClassAliases = useMemo(() => getNodeClassAliases(props.node), [props.node]);
  const mergedClassAliases = useMemo(
    () => mergeClassAliases(parentClassAliases, nodeClassAliases),
    [parentClassAliases, nodeClassAliases]
  );
  const resolvedMeta = useMemo(() => {
    const resolvedClassName = resolveClassAliases(baseMeta.className, mergedClassAliases);
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
  const importNodeState = useMemo(
    () => nodeState,
    [nodeState]
  );
  const importedMeta = resolvedMeta;
  const importedResolvedProps = runtime.resolveNodeProps(props.node, renderScope, importNodeState);
  const importedResolvedClassName = resolveClassAliases(importedMeta.className, mergedClassAliases);
  const importedMetaWithCid = importedMeta.cid === mountedCid
    ? importedMeta
    : { ...importedMeta, cid: mountedCid };
  const finalResolvedMeta = importedResolvedClassName !== importedMetaWithCid.className
    ? { ...importedMetaWithCid, className: importedResolvedClassName }
    : importedMetaWithCid;
  const resolvedComponentProps = useNodeSourceProps(props.node, importedResolvedProps.value, renderScope);
  const nodeInstance = useMemo(
    () => createNodeInstance({
      templateNode: props.node,
      scope: renderScope,
      state: importNodeState,
      cid: finalResolvedMeta.cid,
      instancePath,
      mounted: true
    }),
    [props.node, renderScope, importNodeState, finalResolvedMeta.cid, instancePath]
  );

  useNodeDebugData(activeComponentRegistry, finalResolvedMeta.cid, nodeInstance, renderScope, finalResolvedMeta, resolvedComponentProps);

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

  const Comp = props.node.component.component;

  useRenderMonitor({
    monitor: runtime.env.monitor,
    templateNode: props.node,
    resolvedMeta: finalResolvedMeta
  });
  useNodeLifecycleActions({
    lifecycleActions,
    helpers,
    nodeInstance
  });

  const fieldName = typeof props.node.schema.name === 'string' ? props.node.schema.name : undefined;
  const isFieldHidden = Boolean(!finalResolvedMeta.visible || finalResolvedMeta.hidden);

  useEffect(() => {
    if (!currentForm || !fieldName) {
      return;
    }

    currentForm.notifyFieldHidden(fieldName, isFieldHidden);

    return () => {
      currentForm.notifyFieldHidden(fieldName, false);
    };
  }, [currentForm, fieldName, isFieldHidden]);

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
      componentRegistry={activeComponentRegistry}
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
  const mountedCid = useMountedCid(runtime);
  const { activeActionScope, activeComponentRegistry } = useNodeScopes(runtime, {
    nodeId: props.node.id,
    actionScopePolicy: props.node.component.actionScopePolicy ?? (getNodeImports(props.node)?.length ? 'new' : undefined),
    componentRegistryPolicy: props.node.component.componentRegistryPolicy
  }, props.actionScope, props.componentRegistry);
  const nodeImports = getNodeImports(props.node);
  const importSetupState = useMemo<CompiledNodeRuntimeState>(
    () => createTemplateNodeRuntimeState(props.node),
    [props.node]
  );
  const importOwnerNodeInstance = useMemo(
    () => createNodeInstance({
      templateNode: props.node,
      scope: props.scope,
      state: importSetupState,
      cid: mountedCid,
      instancePath,
      mounted: true
    }),
    [props.node, props.scope, importSetupState, mountedCid, instancePath]
  );
  const importState = useNodeImports(
    runtime,
    nodeImports,
    activeActionScope,
    activeComponentRegistry,
    props.scope,
    importOwnerNodeInstance
  );
  const renderScope = useMemo(
    () => Object.keys(importState.expressionBindings).length === 0
      ? props.scope
      : runtime.createChildScope(props.scope, { __imports: importState.expressionBindings }, {
          pathSuffix: 'imports',
          scopeKey: `${props.node.id}:imports`
        }),
    [runtime, props.scope, importState.expressionBindings, props.node.id]
  );

  if (!importState.ready) {
    return null;
  }

  return (
    <NodeErrorBoundary nodeId={props.node.id}>
      <NodeRendererResolved
        node={props.node}
        scope={renderScope}
        actionScope={activeActionScope}
        componentRegistry={activeComponentRegistry}
        mountedCid={mountedCid}
      />
    </NodeErrorBoundary>
  );
});
