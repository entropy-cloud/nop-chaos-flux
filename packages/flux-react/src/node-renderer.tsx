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
  ScopeRef,
  XuiImportSpec
} from '@nop-chaos/flux-core';
import { mergeClassAliases, resolveClassAliases } from '@nop-chaos/flux-core';
import { createFormComponentHandle } from '@nop-chaos/flux-runtime';
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
import { useNodeForm } from './useNodeForm';
import { useNodeScopes } from './useNodeScopes';

function getNodeImports(node: CompiledSchemaNode): readonly XuiImportSpec[] | undefined {
  return 'xui:imports' in node.schema
    ? ((node.schema as { 'xui:imports'?: readonly XuiImportSpec[] })['xui:imports'])
    : undefined;
}

function shouldWarnOnImportFailure(): boolean {
  const nodeEnv = 'process' in globalThis
    ? (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV
    : undefined;
  return nodeEnv !== 'production';
}

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

  const nodeClassAliases = (props.node.schema as { classAliases?: Record<string, string> }).classAliases;
  const mergedClassAliases = mergeClassAliases(parentClassAliases, nodeClassAliases);
  const resolvedClassName = resolveClassAliases(meta.className, mergedClassAliases);
  const resolvedMeta = resolvedClassName !== meta.className
    ? { ...meta, className: resolvedClassName }
    : meta;

  const activeForm = useNodeForm(runtime, props.node, props.scope, props.page, resolvedProps, props.form);
  const { activeActionScope, activeComponentRegistry } = useNodeScopes(runtime, props.node, props.actionScope, props.componentRegistry);

  const activeScope = activeForm?.scope ?? props.scope;
  const nodeImports = getNodeImports(props.node);

  useEffect(() => {
    if (!activeForm || !activeComponentRegistry) {
      return;
    }

    const schemaWithCid = props.node.schema as unknown as { _cid?: unknown };
    const compiledCid = typeof schemaWithCid._cid === 'number'
      ? schemaWithCid._cid
      : undefined;
    const unregister = activeComponentRegistry.register(createFormComponentHandle(activeForm), {
      cid: compiledCid
    });
    return unregister;
  }, [activeComponentRegistry, activeForm, props.node]);

  useEffect(() => {
    void runtime.ensureImportedNamespaces({
      imports: nodeImports,
      actionScope: activeActionScope,
      componentRegistry: activeComponentRegistry,
      scope: activeScope,
      node: props.node
    }).catch((error) => {
      if (!shouldWarnOnImportFailure()) {
        return;
      }

      console.warn('[flux-react] Failed to ensure imported namespaces', {
        nodeId: props.node.id,
        path: props.node.path,
        imports: nodeImports,
        error
      });
    });

    return () => {
      runtime.releaseImportedNamespaces({
        imports: nodeImports,
        actionScope: activeActionScope
      });
    };
  }, [runtime, nodeImports, activeActionScope, activeComponentRegistry, activeScope, props.node]);

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
  const cidFromSchema = (props.node.schema as unknown as { _cid?: unknown })._cid;
  const resolvedCid = typeof cidFromSchema === 'number' ? cidFromSchema : undefined;

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

  if (props.node.component.wrap) {
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
        className={resolvedMeta.className}
        testid={resolvedMeta.testid}
        cid={resolvedCid}
      >
        {element}
      </FieldFrame>
    );
  } else if (resolvedCid != null) {
    content = (
      <div data-cid={resolvedCid}>
        {element}
      </div>
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
