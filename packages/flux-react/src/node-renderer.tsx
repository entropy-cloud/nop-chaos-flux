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
  ScopeRef
} from '@nop-chaos/flux-core';
import { mergeClassAliases, resolveClassAliases } from '@nop-chaos/flux-core';
import {
  ActionScopeContext,
  ClassAliasesContext,
  ComponentRegistryContext,
  FormContext,
  NodeMetaContext,
  PageContext,
  ScopeContext
} from './contexts';
import { useRendererRuntime } from './hooks';
import { createHelpers } from './helpers';
import { RenderNodes } from './render-nodes';
import { FieldFrame } from './field-frame';
import {
  getNodeClassAliases,
  getNodeImports,
  getNodeSchemaFrameWrap,
  resolveFrameWrapMode
} from './node-renderer-utils';
import { useNodeForm } from './useNodeForm';
import { useNodeScopes } from './useNodeScopes';
import { useNodeImports } from './useNodeImports';
import { useFormComponentHandleRegistration } from './useFormComponentHandleRegistration';
import { useNodeDebugData } from './useNodeDebugData';

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
  const parentClassAliases = useContext(ClassAliasesContext);
  const nodeState = useMemo<CompiledNodeRuntimeState>(() => props.node.createRuntimeState(), [props.node]);

  const isStatic = props.node.flags.isStatic;
  const subscribe = isStatic
    ? (() => () => undefined)
    : (props.scope.store?.subscribe ?? (() => () => undefined));
  const getSnapshot = isStatic
    ? (() => null)
    : (() => props.scope.read());

  const { meta, resolvedProps } = useSyncExternalStoreWithSelector(
    subscribe,
    getSnapshot,
    getSnapshot,
    () => ({
      meta: runtime.resolveNodeMeta(props.node, props.scope, nodeState),
      resolvedProps: runtime.resolveNodeProps(props.node, props.scope, nodeState)
    }),
    (prev: { meta: ResolvedNodeMeta; resolvedProps: ResolvedNodeProps } | null, next: { meta: ResolvedNodeMeta; resolvedProps: ResolvedNodeProps }) => {
      if (!prev) return false;
      return prev.meta === next.meta && prev.resolvedProps === next.resolvedProps;
    }
  );

  const nodeClassAliases = getNodeClassAliases(props.node);
  const mergedClassAliases = mergeClassAliases(parentClassAliases, nodeClassAliases);
  const resolvedClassName = resolveClassAliases(meta.className, mergedClassAliases);
  const resolvedMeta = useMemo(
    () => (resolvedClassName !== meta.className
      ? { ...meta, className: resolvedClassName }
      : meta),
    [meta, resolvedClassName]
  );

  const activeForm = useNodeForm(runtime, props.node, props.scope, props.page, resolvedProps, props.form);
  const { activeActionScope, activeComponentRegistry } = useNodeScopes(runtime, props.node, props.actionScope, props.componentRegistry);

  const activeScope = activeForm?.scope ?? props.scope;
  const nodeImports = getNodeImports(props.node);

  useFormComponentHandleRegistration(activeForm, activeComponentRegistry, props.node);
  useNodeDebugData(activeComponentRegistry, resolvedMeta.cid, props.node, activeScope, resolvedMeta, resolvedProps.value);
  useNodeImports(runtime, nodeImports, activeActionScope, activeComponentRegistry, activeScope, props.node);

  const helpers = useMemo(
    () =>
      createHelpers({
        runtime,
        scope: activeScope,
        actionScope: activeActionScope,
        componentRegistry: activeComponentRegistry,
        form: activeForm,
        page: props.page,
        node: props.node
      }),
    [runtime, activeScope, activeActionScope, activeComponentRegistry, activeForm, props.page, props.node]
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
              event
            })
        ];
      })
    );
  }, [helpers, props.node.eventActions, props.node.eventKeys]);

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
    props: resolvedProps.value,
    meta: resolvedMeta,
    regions,
    events,
    helpers
  };

  const Comp = props.node.component.component;

  useEffect(() => {
    if (!runtime.env.monitor) {
      return;
    }

    if (!resolvedMeta.visible || resolvedMeta.hidden) {
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
    resolvedMeta.visible,
    resolvedMeta.hidden
  ]);

  if (!resolvedMeta.visible || resolvedMeta.hidden) {
    return null;
  }

  const element = <Comp {...componentProps} />;

  let content = element;
  const frameWrapMode = resolveFrameWrapMode(
    props.node.component.wrap,
    getNodeSchemaFrameWrap(props.node)
  );

  if (frameWrapMode !== 'none') {
    const fieldName = typeof resolvedProps.value.name === 'string'
      ? resolvedProps.value.name
      : typeof props.node.schema.name === 'string'
        ? props.node.schema.name
        : undefined;
    const labelValue = resolvedMeta.label
      ?? (regions.label ? regions.label.render() : props.node.schema.label);

    content = (
      <FieldFrame
        name={fieldName}
        label={labelValue}
        required={props.node.schema.required === true}
        layout={frameWrapMode === 'group' ? 'checkbox' : 'default'}
        className={resolvedMeta.className}
        testid={resolvedMeta.testid}
        cid={resolvedMeta.cid}
      >
        {element}
      </FieldFrame>
    );
  }

  return (
    <NodeMetaContext.Provider value={{ id: props.node.id, path: props.node.path, type: props.node.type }}>
      <ActionScopeContext.Provider value={activeActionScope}>
        <ComponentRegistryContext.Provider value={activeComponentRegistry}>
          <ScopeContext.Provider value={activeScope}>
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
  );
});
