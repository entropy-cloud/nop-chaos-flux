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
  RenderFragmentOptions,
  RenderNodeInput,
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
import type { RenderOutput } from './react-contracts.js';
import { ClassAliasesContext } from './contexts.js';
import {
  useCurrentPage,
  useCurrentSurfaceRuntime,
  useRenderInstancePath,
} from './context-hooks.js';
import { useCurrentForm, useCurrentValidationScope } from './hooks/use-form-hooks.js';
import { useRendererRuntimeContext } from './runtime-context-hooks.js';
import { NodeFrameWrapper } from './node-frame-wrapper.js';
import { createNodeInstance, createTemplateNodeRuntimeState } from './node-instance.js';
import { useNodeDebugData } from './use-node-debug-data.js';
import { useNodeSourceProps } from './use-node-source-props.js';
import { useNodeLifecycleActions, useRenderMonitor } from './node-renderer-effects.js';
import { NodeRendererProviders } from './node-renderer-providers.js';
import { createNormalizedActionEvent, createRendererHelpers } from './renderer-helpers.js';
import { buildSlotFrame, readSlotFrame, SLOT_KEY } from './slot-frame.js';
import { useSyncExternalStoreWithSelector } from './use-sync-external-store-with-selector.js';

function isCompiledActionProgram(
  action: import('@nop-chaos/flux-core').CompiledActionProgram | undefined,
): action is import('@nop-chaos/flux-core').CompiledActionProgram {
  return Boolean(action);
}

export const NodeRendererResolved = memo(function NodeRendererResolved(props: {
  node: TemplateNode;
  renderFragment: (input: RenderNodeInput, options?: RenderFragmentOptions) => RenderOutput;
  scope: ScopeRef;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  importFrame?: import('@nop-chaos/flux-core').ImportFrame;
  mountedCid: number;
}) {
  'use no memo';
  const runtime = useRendererRuntimeContext();
  const instancePath = useRenderInstancePath();
  const parentClassAliases = useContext(ClassAliasesContext);
  const currentForm = useCurrentForm();
  const currentValidationScope = useCurrentValidationScope();
  const currentPage = useCurrentPage();
  const currentSurfaceRuntime = useCurrentSurfaceRuntime();
  const mountedCid = props.mountedCid;
  const instanceStateKey = useMemo(
    () => JSON.stringify(instancePath ?? []),
    [instancePath],
  );
  const nodeState = useMemo<NodeRuntimeState>(
    () => createTemplateNodeRuntimeState(props.node, instanceStateKey),
    [props.node, instanceStateKey],
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
  const templateNode = props.node;
  const renderFragment = props.renderFragment;
  const finalResolvedMeta = resolvedMeta;
  const sourceActionContext = useMemo(
    () => ({
      actionScope: activeActionScope,
      componentRegistry: activeComponentRegistry,
      form: currentForm,
      page: currentPage,
      surfaceRuntime: currentSurfaceRuntime,
    }),
    [activeActionScope, activeComponentRegistry, currentForm, currentPage, currentSurfaceRuntime],
  );
  const resolvedComponentProps = useNodeSourceProps(
    templateNode,
    baseResolvedProps.value,
    renderScope,
    sourceActionContext,
  );
  const nodeInstance = useMemo(
    () =>
      createNodeInstance({
        templateNode,
        scope: renderScope,
        state: nodeState,
        cid: finalResolvedMeta.cid,
        instancePath,
        mounted: true,
      }),
    [templateNode, renderScope, nodeState, finalResolvedMeta.cid, instancePath],
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
      createRendererHelpers(
        {
          runtime,
          scope: renderScope,
          actionScope: activeActionScope,
          componentRegistry: activeComponentRegistry,
          form: currentForm,
          page: currentPage,
          surfaceRuntime: currentSurfaceRuntime,
          nodeInstance,
        },
        (renderInput, options) =>
          renderFragment(renderInput, {
            ...options,
            ownerNodeInstance: options?.ownerNodeInstance ?? nodeInstance,
          }),
      ),
    [
      runtime,
      renderScope,
      activeActionScope,
      activeComponentRegistry,
      currentForm,
      currentPage,
      currentSurfaceRuntime,
      nodeInstance,
      renderFragment,
    ],
  );
  const lifecycleActions = templateNode.lifecycleActions;
  const eventPlans = templateNode.eventPlans;
  const nodeRegions = templateNode.regions;

  const events = useMemo(() => {
    return Object.fromEntries(
      Object.entries(eventPlans).map(([key, action]) => {
        if (!isCompiledActionProgram(action)) {
          return [key, undefined];
        }

        return [
          key,
          (event?: unknown, eventContext?: Partial<import('@nop-chaos/flux-core').ActionContext>) =>
            helpers.dispatch(action, {
              ...eventContext,
              scope: eventContext?.scope ?? nodeInstance.scope,
              nodeInstance: eventContext?.nodeInstance ?? nodeInstance,
              event: createNormalizedActionEvent(event),
            }),
        ];
      }),
    );
  }, [eventPlans, helpers, nodeInstance]);

  const regions = useMemo(() => {
    return Object.fromEntries(
      Object.entries(nodeRegions).map(([key, region]) => {
        const params = region.params;
        const regionIsolate = region.isolate;

        function instantiateRegion(options?: import('@nop-chaos/flux-core').RenderFragmentOptions) {
          const rawBindings = options?.bindings;

          if (params && params.length > 0 && rawBindings) {
            const parentScope = options?.scope ?? renderScope;
            const currentScopeData =
              (parentScope.readVisible?.() as Record<string, unknown> | undefined) ?? {};
            const outerSlotFrame = readSlotFrame(currentScopeData);
            const slotFrame = buildSlotFrame(rawBindings, outerSlotFrame);
            return renderFragment(region.node, {
              ...options,
              actionScope: options?.actionScope ?? activeActionScope,
              componentRegistry: options?.componentRegistry ?? activeComponentRegistry,
              bindings: { [SLOT_KEY]: slotFrame },
              isolate: options?.isolate ?? regionIsolate,
              ownerNodeInstance: options?.ownerNodeInstance ?? nodeInstance,
            });
          }

          return renderFragment(region.node, {
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
  }, [activeActionScope, activeComponentRegistry, nodeRegions, nodeInstance, renderFragment, renderScope]);

  const componentProps: RendererComponentProps = {
    id: templateNode.id,
    path: templateNode.templatePath,
    schema: templateNode.schema,
    templateNode,
    node: nodeInstance,
    props: resolvedComponentProps,
    meta: finalResolvedMeta,
    regions,
    events,
    helpers,
  };

  const Comp = templateNode.component.component as React.ComponentType<RendererComponentProps>;
  const lifecycleActionsValue = lifecycleActions
    ? {
        onMount: lifecycleActions.onMount as ActionSchema | ActionSchema[] | undefined,
        onUnmount: lifecycleActions.onUnmount as ActionSchema | ActionSchema[] | undefined,
      }
    : undefined;

  useRenderMonitor({
    monitor: runtime.env.monitor,
    templateNode,
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
