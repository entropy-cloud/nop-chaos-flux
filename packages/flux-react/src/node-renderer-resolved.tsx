import {
  useContext,
  useEffect,
  useMemo,
  memo,
} from 'react';
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
  TemplateNode,
} from '@nop-chaos/flux-core';
import {
  mergeClassAliases,
  resolveClassAliases,
} from '@nop-chaos/flux-core';
import { scopeChangeHitsDependencies } from '@nop-chaos/flux-runtime';
import { ClassAliasesContext } from './contexts.js';
import {
  useRenderInstancePath,
  useRendererRuntime,
  useCurrentForm,
  useCurrentPage,
  useCurrentSurfaceRuntime,
  useCurrentValidationScope,
} from './hooks.js';
import { createHelpers } from './helpers.js';
import { createNormalizedActionEvent } from './helpers.js';
import { RenderNodes } from './render-nodes.js';
import { NodeFrameWrapper } from './node-frame-wrapper.js';
import { createNodeInstance, createTemplateNodeRuntimeState } from './node-instance.js';
import { useNodeDebugData } from './use-node-debug-data.js';
import { useNodeSourceProps } from './use-node-source-props.js';
import { useNodeLifecycleActions, useRenderMonitor } from './node-renderer-effects.js';
import { NodeRendererProviders } from './node-renderer-providers.js';
import { buildSlotFrame, readSlotFrame, SLOT_KEY } from './slot-frame.js';
import { useSyncExternalStoreWithSelector } from './use-sync-external-store-with-selector.js';

function isCompiledActionProgram(
  action: import('@nop-chaos/flux-core').CompiledActionProgram | undefined,
): action is import('@nop-chaos/flux-core').CompiledActionProgram {
  return Boolean(action);
}

function renderRegionNode(
  regionNode: TemplateNode | readonly TemplateNode[] | null,
  options: import('@nop-chaos/flux-core').RenderFragmentOptions,
) {
  return <RenderNodes input={regionNode} options={options} />;
}

export const NodeRendererResolved = memo(function NodeRendererResolved(props: {
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
    [props.node],
  );

  const propsProgram = props.node.propsProgram;
  const metaProgram = props.node.metaProgram;
  const isStatic = useMemo(
    () =>
      propsProgram.kind === 'static' &&
      Object.keys(metaProgram).every((key) => {
        const v = metaProgram[key as keyof typeof metaProgram];
        return !v || (v as { kind?: string }).kind !== 'dynamic';
      }),
    [propsProgram, metaProgram],
  );

  const getNodeResolution = () => ({
    meta: runtime.resolveNodeMeta(props.node, props.scope, nodeState),
    resolvedProps: runtime.resolveNodeProps(props.node, props.scope, nodeState),
  });
  const subscribe = useMemo(
    () =>
      isStatic
        ? () => () => undefined
        : (listener: () => void) =>
            props.scope.store?.subscribe((change: ScopeChange) => {
              const metaHit = scopeChangeHitsDependencies(change, nodeState.metaDependencies);
              const propsHit = scopeChangeHitsDependencies(change, nodeState.propsDependencies);

              if (metaHit || propsHit) {
                listener();
              }
            }) ?? (() => undefined),
    [isStatic, props.scope, nodeState],
  );
  const getSnapshot = useMemo(
    () => (isStatic ? () => null : () => props.scope.store?.getLastChange() ?? null),
    [isStatic, props.scope],
  );

  const { meta: baseMeta, resolvedProps: baseResolvedProps } = useSyncExternalStoreWithSelector(
    subscribe,
    getSnapshot,
    getSnapshot,
    getNodeResolution,
    (
      prev: { meta: ResolvedNodeMeta; resolvedProps: ResolvedNodeProps } | null,
      next: { meta: ResolvedNodeMeta; resolvedProps: ResolvedNodeProps },
    ) => {
      if (!prev) return false;
      return prev.meta === next.meta && prev.resolvedProps.value === next.resolvedProps.value;
    },
  );

  const nodeClassAliases = props.node.classAliasesPlan?.aliases;
  const hasNodeClassAliases = Boolean(nodeClassAliases);
  const hasParentClassAliases = Boolean(parentClassAliases);
  const mergedClassAliases = useMemo(
    () =>
      hasParentClassAliases || hasNodeClassAliases
        ? mergeClassAliases(parentClassAliases, nodeClassAliases)
        : undefined,
    [hasNodeClassAliases, hasParentClassAliases, parentClassAliases, nodeClassAliases],
  );
  const resolvedMeta = useMemo(() => {
    const resolvedClassName = mergedClassAliases
      ? resolveClassAliases(baseMeta.className, mergedClassAliases)
      : baseMeta.className;
    const resolvedFrameClassName = mergedClassAliases
      ? resolveClassAliases(baseMeta.frameClassName, mergedClassAliases)
      : baseMeta.frameClassName;
    const nextMeta =
      resolvedClassName !== baseMeta.className || resolvedFrameClassName !== baseMeta.frameClassName
        ? {
            ...baseMeta,
            className: resolvedClassName,
            frameClassName: resolvedFrameClassName,
          }
        : baseMeta;

    return nextMeta.cid === mountedCid ? nextMeta : { ...nextMeta, cid: mountedCid };
  }, [baseMeta, mergedClassAliases, mountedCid]);

  const activeActionScope = props.actionScope;
  const activeComponentRegistry = props.componentRegistry;
  const renderScope = props.scope;
  const finalResolvedMeta = resolvedMeta;
  const resolvedComponentProps = useNodeSourceProps(
    props.node,
    baseResolvedProps.value,
    renderScope,
  );
  const nodeInstance = useMemo(
    () =>
      createNodeInstance({
        templateNode: props.node,
        scope: renderScope,
        state: nodeState,
        cid: finalResolvedMeta.cid,
        instancePath,
        mounted: true,
      }),
    [props.node, renderScope, nodeState, finalResolvedMeta.cid, instancePath],
  );

  useNodeDebugData(
    activeComponentRegistry,
    finalResolvedMeta.cid,
    nodeInstance,
    renderScope,
    finalResolvedMeta,
    resolvedComponentProps,
    currentForm,
  );

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
        nodeInstance,
      }),
    [
      runtime,
      renderScope,
      activeActionScope,
      activeComponentRegistry,
      currentForm,
      currentPage,
      currentSurfaceRuntime,
      nodeInstance,
    ],
  );
  const lifecycleActions = props.node.lifecycleActions;

  const events = useMemo(() => {
    return Object.fromEntries(
      Object.entries(props.node.eventPlans).map(([key, action]) => {
        if (!isCompiledActionProgram(action)) {
          return [key, undefined];
        }

        return [
          key,
          (event?: unknown, eventContext?: Partial<import('@nop-chaos/flux-core').ActionContext>) =>
            helpers.dispatch(action, {
              ...eventContext,
              nodeInstance: eventContext?.nodeInstance ?? nodeInstance,
              event: createNormalizedActionEvent(event),
            }),
        ];
      }),
    );
  }, [helpers, nodeInstance, props.node.eventPlans]);

  const regions = useMemo(() => {
    return Object.fromEntries(
      Object.entries(props.node.regions).map(([key, region]) => {
        const params = region.params;
        const regionIsolate = region.isolate;

        function instantiateRegion(options?: import('@nop-chaos/flux-core').RenderFragmentOptions) {
          const rawBindings = options?.bindings;

          if (params && params.length > 0 && rawBindings) {
            const currentScopeData =
              (renderScope.readVisible?.() as Record<string, unknown> | undefined) ?? {};
            const outerSlotFrame = readSlotFrame(currentScopeData);
            const slotFrame = buildSlotFrame(rawBindings, outerSlotFrame);
            return renderRegionNode(region.node, {
              ...options,
              actionScope: options?.actionScope ?? activeActionScope,
              componentRegistry: options?.componentRegistry ?? activeComponentRegistry,
              bindings: { [SLOT_KEY]: slotFrame },
              isolate: options?.isolate ?? regionIsolate,
              ownerNodeInstance: options?.ownerNodeInstance ?? nodeInstance,
            });
          }

          return renderRegionNode(region.node, {
            ...options,
            actionScope: options?.actionScope ?? activeActionScope,
            componentRegistry: options?.componentRegistry ?? activeComponentRegistry,
            ownerNodeInstance: options?.ownerNodeInstance ?? nodeInstance,
          });
        }

        return [
          key,
          {
            key,
            templateNode: region.node,
            params,
            render: instantiateRegion,
          },
        ];
      }),
    );
  }, [activeActionScope, activeComponentRegistry, nodeInstance, renderScope, props.node.regions]);

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
    helpers,
  };

  const Comp = props.node.component.component as React.ComponentType<RendererComponentProps>;
  const lifecycleActionsValue = lifecycleActions
    ? {
        onMount: lifecycleActions.onMount as ActionSchema | ActionSchema[] | undefined,
        onUnmount: lifecycleActions.onUnmount as ActionSchema | ActionSchema[] | undefined,
      }
    : undefined;

  useRenderMonitor({
    monitor: runtime.env.monitor,
    templateNode: props.node,
    resolvedMeta: finalResolvedMeta,
  });
  useNodeLifecycleActions({
    lifecycleActions: lifecycleActionsValue,
    helpers,
    nodeInstance,
    enabled: finalResolvedMeta.when !== false && finalResolvedMeta.visible && !finalResolvedMeta.hidden,
  });

  const fieldName = typeof props.node.schema.name === 'string' ? props.node.schema.name : undefined;
  const isFieldHidden = Boolean(!finalResolvedMeta.visible || finalResolvedMeta.hidden);
  const hiddenOwner = currentForm ?? currentValidationScope;

  useEffect(() => {
    if (!hiddenOwner || !fieldName) {
      return;
    }

    hiddenOwner.notifyFieldHidden(fieldName, isFieldHidden);

    return () => {
      hiddenOwner.notifyFieldHidden(fieldName, false);
    };
  }, [hiddenOwner, fieldName, isFieldHidden]);

  if (finalResolvedMeta.when === false || !finalResolvedMeta.visible || finalResolvedMeta.hidden) {
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
      provideActionScope={
        props.node.component.actionScopePolicy !== 'new' &&
        Boolean(props.node.importsPlan?.preparedImports.length)
      }
      componentRegistry={activeComponentRegistry}
      importFrame={props.importFrame}
      scope={renderScope}
      classAliases={mergedClassAliases}
    >
      {content}
    </NodeRendererProviders>
  );
});
