import { useContext, useEffect, useMemo, memo } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import type {
  ActionScope,
  ComponentHandleRegistry,
  CompiledNodeRuntimeState,
  CompiledSchemaNode,
  FormRuntime,
  PageRuntime,
  RendererComponentProps,
  ResolvedNodeMeta,
  ResolvedNodeProps,
  ScopeChange,
  ScopeRef
} from '@nop-chaos/flux-core';
import { mergeClassAliases, resolveClassAliases } from '@nop-chaos/flux-core';
import { scopeChangeHitsDependencies } from '@nop-chaos/flux-runtime';
import {
  ActionScopeContext,
  ClassAliasesContext,
  CompiledNodeContext,
  ComponentRegistryContext,
  FormContext,
  NodeMetaContext,
  PageContext,
  ScopeContext
} from './contexts';
import { useRenderInstancePath, useRendererRuntime } from './hooks';
import { createHelpers } from './helpers';
import { RenderNodes } from './render-nodes';
import {
  getCompiledNodeLocator,
  getNodeClassAliases,
  getNodeImports
} from './node-renderer-utils';
import { NodeFrameWrapper } from './node-frame-wrapper';
import { createCompatibilityNodeInstance } from './node-instance';
import { useNodeForm } from './useNodeForm';
import { useNodeScopes } from './useNodeScopes';
import { useNodeImports } from './useNodeImports';
import { useFormComponentHandleRegistration } from './useFormComponentHandleRegistration';
import { useNodeDebugData } from './useNodeDebugData';
import { useNodeSourceProps } from './use-node-source-props';

export { resolveFrameWrapMode } from './node-renderer-utils';

export const NodeRenderer = memo(function NodeRenderer(props: {
  node: CompiledSchemaNode;
  scope: ScopeRef;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  form?: FormRuntime;
  page?: PageRuntime;
}) {
  const runtime = useRendererRuntime();
  const instancePath = useRenderInstancePath();
  const parentClassAliases = useContext(ClassAliasesContext);
  const nodeState = useMemo<CompiledNodeRuntimeState>(() => props.node.createRuntimeState(), [props.node]);

  const isStatic = props.node.flags.isStatic;
  const getNodeResolution = () => ({
    meta: runtime.resolveNodeMeta(props.node, props.scope, nodeState),
    resolvedProps: runtime.resolveNodeProps(props.node, props.scope, nodeState)
  });
  const subscribe = isStatic
    ? (() => () => undefined)
    : ((listener: () => void) => props.scope.store?.subscribe((change: ScopeChange) => {
      const metaHit = scopeChangeHitsDependencies(change, nodeState.metaDependencies);
      const propsHit = scopeChangeHitsDependencies(change, nodeState.propsDependencies);

      if (metaHit || propsHit) {
        listener();
      }
    }) ?? (() => undefined));
  const getSnapshot = isStatic
    ? (() => null)
    : (() => props.scope.store?.getLastChange() ?? null);

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

  const nodeClassAliases = getNodeClassAliases(props.node);
  const mergedClassAliases = mergeClassAliases(parentClassAliases, nodeClassAliases);
  const resolvedClassName = resolveClassAliases(baseMeta.className, mergedClassAliases);
  const resolvedMeta = resolvedClassName !== baseMeta.className
    ? { ...baseMeta, className: resolvedClassName }
    : baseMeta;

  const activeForm = useNodeForm(runtime, props.node, props.scope, props.page, baseResolvedProps, props.form);
  const { activeActionScope, activeComponentRegistry } = useNodeScopes(runtime, props.node, props.actionScope, props.componentRegistry);

  const activeScope = activeForm?.scope ?? props.scope;
  const nodeImports = getNodeImports(props.node);
  const importExpressionBindings = useNodeImports(runtime, nodeImports, activeActionScope, activeComponentRegistry, activeScope, props.node, props.page);
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
    () => (renderScope === activeScope ? nodeState : props.node.createRuntimeState()),
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
  const nodeLocator = getCompiledNodeLocator(props.node, runtime.runtimeId, instancePath);
  const nodeInstance = useMemo(
    () => createCompatibilityNodeInstance({
      node: props.node,
      locator: nodeLocator,
      scope: renderScope,
      state: importNodeState,
      cid: finalResolvedMeta.cid,
      mounted: true
    }),
    [props.node, nodeLocator, renderScope, importNodeState, finalResolvedMeta.cid]
  );

  useFormComponentHandleRegistration(activeForm, activeComponentRegistry, props.node);
  useNodeDebugData(activeComponentRegistry, finalResolvedMeta.cid, nodeInstance, nodeLocator, props.node, renderScope, finalResolvedMeta, resolvedComponentProps);

  const helpers = useMemo(
    () =>
      createHelpers({
        runtime,
        scope: renderScope,
        actionScope: activeActionScope,
        componentRegistry: activeComponentRegistry,
        form: activeForm,
        page: props.page,
        node: props.node,
        locator: nodeLocator
      }),
    [runtime, renderScope, activeActionScope, activeComponentRegistry, activeForm, props.page, props.node, nodeLocator]
  );

  const events = useMemo(() => {
    return Object.fromEntries(
      props.node.eventKeys.map((key) => {
        const action = props.node.eventActions[key];

        if (!action) {
          return [key, undefined];
        }

        return [
          key,
          (event?: unknown, eventContext?: Partial<import('@nop-chaos/flux-core').ActionContext>) =>
            helpers.dispatch(action as any, {
              ...eventContext,
              locator: eventContext?.locator ?? nodeLocator,
              event
            })
        ];
      })
    );
  }, [helpers, nodeLocator, props.node.eventActions, props.node.eventKeys]);

  const regions = useMemo(() => {
    return Object.fromEntries(
      Object.entries(props.node.regions).map(([key, region]) => [
        key,
        {
          key,
          path: region.path,
          node: region.node,
          render: (options?: import('@nop-chaos/flux-core').RenderFragmentOptions) => <RenderNodes input={region.node} options={options} />
        }
      ])
    );
  }, [props.node.regions]);

  const componentProps: RendererComponentProps = {
    id: props.node.id,
    path: props.node.path,
    schema: props.node.schema,
    node: props.node,
    nodeInstance,
    props: resolvedComponentProps,
    meta: finalResolvedMeta,
    regions,
    events,
    helpers
  };

  const Comp = props.node.component.component;

  useEffect(() => {
    if (!runtime.env.monitor) {
      return;
    }

    if (!finalResolvedMeta.visible || finalResolvedMeta.hidden) {
      return;
    }

    const startedAt = Date.now();
    const payload = {
      nodeId: props.node.id,
      path: props.node.path,
      type: props.node.type
    };

    runtime.env.monitor?.onRenderStart?.(payload);
    runtime.env.monitor?.onRenderEnd?.({
      ...payload,
      durationMs: Math.max(0, Date.now() - startedAt)
    });
  }, [
    runtime.env.monitor,
    props.node.id,
    props.node.path,
    props.node.type,
    finalResolvedMeta.visible,
    finalResolvedMeta.hidden
  ]);

  if (!finalResolvedMeta.visible || finalResolvedMeta.hidden) {
    return null;
  }

  const element = <Comp {...componentProps} />;

  const content = (
    <NodeFrameWrapper
      node={props.node}
      resolvedMeta={finalResolvedMeta}
      resolvedPropsValue={resolvedComponentProps}
      regions={regions}
    >
      {element}
    </NodeFrameWrapper>
  );

  return (
    <CompiledNodeContext.Provider value={props.node}>
      <NodeMetaContext.Provider value={{ id: props.node.id, path: props.node.path, type: props.node.type, node: props.node }}>
        <ActionScopeContext.Provider value={activeActionScope}>
          <ComponentRegistryContext.Provider value={activeComponentRegistry}>
            <ScopeContext.Provider value={renderScope}>
              <FormContext.Provider value={activeForm}>
                <PageContext.Provider value={props.page}>
                  <ClassAliasesContext.Provider value={mergedClassAliases}>
                    {content}
                  </ClassAliasesContext.Provider>
                </PageContext.Provider>
              </FormContext.Provider>
            </ScopeContext.Provider>
          </ComponentRegistryContext.Provider>
        </ActionScopeContext.Provider>
      </NodeMetaContext.Provider>
    </CompiledNodeContext.Provider>
  );
});
