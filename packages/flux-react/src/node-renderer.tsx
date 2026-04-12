import { useContext, useEffect, useMemo, memo } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
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
import { useRenderInstancePath, useRendererRuntime, useCurrentForm, useCurrentPage } from './hooks';
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

export const NodeRenderer = memo(function NodeRenderer(props: {
  node: TemplateNode;
  scope: ScopeRef;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
}) {
  const runtime = useRendererRuntime();
  const instancePath = useRenderInstancePath();
  const parentClassAliases = useContext(ClassAliasesContext);
  const currentForm = useCurrentForm();
  const currentPage = useCurrentPage();
  const nodeState = useMemo<CompiledNodeRuntimeState>(
    () => createTemplateNodeRuntimeState(props.node),
    [props.node]
  );

  const propsProgram = props.node.propsProgram;
  const metaProgram = props.node.metaProgram;
  const isStatic = useMemo(
    () => !props.node.linkageProgram && propsProgram.kind === 'static' && Object.keys(metaProgram).every((key) => {
      const v = metaProgram[key as keyof typeof metaProgram];
      return !v || (v as { kind?: string }).kind !== 'dynamic';
    }),
    [props.node, propsProgram, metaProgram]
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

  const nodeClassAliases = useMemo(() => getNodeClassAliases(props.node), [props.node]);
  const mergedClassAliases = useMemo(
    () => mergeClassAliases(parentClassAliases, nodeClassAliases),
    [parentClassAliases, nodeClassAliases]
  );
  const resolvedMeta = useMemo(() => {
    const resolvedClassName = resolveClassAliases(baseMeta.className, mergedClassAliases);
    return resolvedClassName !== baseMeta.className
      ? { ...baseMeta, className: resolvedClassName }
      : baseMeta;
  }, [baseMeta, mergedClassAliases]);

  const { activeActionScope, activeComponentRegistry } = useNodeScopes(runtime, {
    nodeId: props.node.id,
    actionScopePolicy: props.node.component.actionScopePolicy,
    componentRegistryPolicy: props.node.component.componentRegistryPolicy
  }, props.actionScope, props.componentRegistry);

  const activeScope = props.scope;
  const importOwnerNodeInstance = useMemo(
    () => createNodeInstance({
      templateNode: props.node,
      scope: activeScope,
      state: nodeState,
      cid: resolvedMeta.cid,
      instancePath,
      mounted: true
    }),
    [props.node, activeScope, nodeState, resolvedMeta, instancePath]
  );
  const nodeImports = getNodeImports(props.node);
  const importExpressionBindings = useNodeImports(
    runtime, nodeImports, activeActionScope, activeComponentRegistry, activeScope,
    importOwnerNodeInstance, currentPage
  );
  const renderScope = useMemo(
    () => Object.keys(importExpressionBindings).length === 0
      ? activeScope
      : runtime.createChildScope(activeScope, { __imports: importExpressionBindings }, {
          pathSuffix: 'imports',
          scopeKey: `${props.node.id}:imports`
        }),
    [runtime, activeScope, importExpressionBindings, props.node.id]
  );
  const importNodeState = useMemo(
    () => (renderScope === activeScope ? nodeState : createTemplateNodeRuntimeState(props.node)),
    [renderScope, activeScope, nodeState, props.node]
  );
  const importedMeta = renderScope === activeScope
    ? resolvedMeta
    : runtime.resolveNodeMeta(props.node, renderScope, importNodeState);
  const importedResolvedProps = renderScope === activeScope
    ? baseResolvedProps
    : runtime.resolveNodeProps(props.node, renderScope, importNodeState);
  const importedResolvedClassName = resolveClassAliases(importedMeta.className, mergedClassAliases);
  const finalResolvedMeta = importedResolvedClassName !== importedMeta.className
    ? { ...importedMeta, className: importedResolvedClassName }
    : importedMeta;
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
        nodeInstance
      }),
    [runtime, renderScope, activeActionScope, activeComponentRegistry, currentForm, currentPage, nodeInstance]
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
            const currentScopeData = renderScope.read?.() as Record<string, unknown> | undefined ?? {};
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
