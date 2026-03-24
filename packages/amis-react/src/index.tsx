import React, { useContext, useEffect, useMemo, useRef } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import type {
  ActionContext,
  ActionScope,
  CompiledNodeRuntimeState,
  CompiledSchemaNode,
  ComponentHandleRegistry,
  DialogState,
  FormFieldStateSnapshot,
  FormErrorQuery,
  FormRuntime,
  FormStoreState,
  PageRuntime,
  RenderFragmentOptions,
  RenderNodeMeta,
  RenderNodeInput,
  RendererComponentProps,
  RendererDefinition,
  RendererHelpers,
  RendererHookApi,
  RendererRuntime,
  SchemaRendererProps,
  ScopeRef,
  ValidationError
} from '@nop-chaos/amis-schema';
import { isSchema, isSchemaArray, shallowEqual } from '@nop-chaos/amis-schema';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/amis-formula';
import { createFormComponentHandle, createRendererRegistry, createRendererRuntime } from '@nop-chaos/amis-runtime';
import {
  ActionScopeContext,
  ComponentRegistryContext,
  FormContext,
  NodeMetaContext,
  PageContext,
  RuntimeContext,
  ScopeContext,
  useRequiredContext
} from './contexts';
import { EMPTY_FORM_STORE_STATE, selectCurrentFormErrors, selectCurrentFormFieldState } from './form-state';

function createNodeOwnedActionScope(runtime: RendererRuntime, parent: ActionScope | undefined, node: CompiledSchemaNode) {
  return runtime.createActionScope({
    id: `${node.id}:action-scope`,
    parent
  });
}

function createNodeOwnedComponentRegistry(runtime: RendererRuntime, parent: ComponentHandleRegistry | undefined, node: CompiledSchemaNode) {
  return runtime.createComponentHandleRegistry({
    id: `${node.id}:component-registry`,
    parent
  });
}

function getNodeImports(node: CompiledSchemaNode): readonly any[] | undefined {
  return 'xui:imports' in node.schema
    ? ((node.schema as { 'xui:imports'?: readonly any[] })['xui:imports'] as any)
    : undefined;
}

export { createDefaultEnv, createDefaultRegistry } from './defaults';

const EMPTY_SCOPE_DATA: Record<string, any> = {};

function isCompiledNode(input: unknown): input is CompiledSchemaNode {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const candidate = input as Partial<CompiledSchemaNode>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.path === 'string' &&
    typeof candidate.type === 'string' &&
    !!candidate.component &&
    !!candidate.schema &&
    !!candidate.regions
  );
}

function isCompiledNodeArray(input: unknown): input is CompiledSchemaNode[] {
  return Array.isArray(input) && input.every((item) => isCompiledNode(item));
}


function normalizeNodeInput(runtime: RendererRuntime, input: RenderNodeInput): CompiledSchemaNode | CompiledSchemaNode[] | null {
  if (!input) {
    return null;
  }

  if (Array.isArray(input)) {
    if (input.length === 0) {
      return [];
    }

    if (input.every((item) => isCompiledNode(item))) {
      return input;
    }

    if (isSchemaArray(input)) {
      return runtime.compile(input);
    }

    return input as CompiledSchemaNode[];
  }

  if (isCompiledNode(input)) {
    return input;
  }

  if (isSchema(input)) {
    return runtime.compile(input) as CompiledSchemaNode;
  }

  return input as CompiledSchemaNode;
}

export function resolveRendererSlotContent(
  props: Pick<RendererComponentProps, 'props' | 'meta' | 'regions'>,
  slotKey: string,
  options?: {
    metaKey?: string;
    fallback?: React.ReactNode;
  }
) {
  const regionContent = props.regions[slotKey]?.render();

  if (regionContent !== undefined && regionContent !== null) {
    return regionContent;
  }

  const propValue = (props.props as Record<string, unknown>)[slotKey] as React.ReactNode | undefined;

  if (propValue !== undefined && propValue !== null) {
    return propValue;
  }

  if (options?.metaKey) {
    const metaValue = (props.meta as unknown as Record<string, unknown>)[options.metaKey] as React.ReactNode | undefined;

    if (metaValue !== undefined && metaValue !== null) {
      return metaValue;
    }
  }

  return options?.fallback;
}

export function hasRendererSlotContent(content: React.ReactNode): boolean {
  if (content === null || content === undefined || content === false) {
    return false;
  }

  if (Array.isArray(content)) {
    return content.some((item): boolean => hasRendererSlotContent(item));
  }

  return true;
}

function mergeActionContext(base: {
  runtime: RendererRuntime;
  scope: ScopeRef;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  form?: FormRuntime;
  page?: PageRuntime;
  node?: CompiledSchemaNode;
}, partial?: Partial<ActionContext>): ActionContext {
  return {
    runtime: base.runtime,
    scope: partial?.scope ?? base.scope,
    actionScope: partial?.actionScope ?? base.actionScope,
    componentRegistry: partial?.componentRegistry ?? base.componentRegistry,
    node: partial?.node ?? base.node,
    form: partial?.form ?? base.form,
    page: partial?.page ?? base.page,
    event: partial?.event,
    dialogId: partial?.dialogId,
    prevResult: partial?.prevResult
  };
}

function createHelpers(input: {
  runtime: RendererRuntime;
  scope: ScopeRef;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  form?: FormRuntime;
  page?: PageRuntime;
  node?: CompiledSchemaNode;
}): RendererHelpers {
  const dispatch = (action: any, ctx?: Partial<ActionContext>) => input.runtime.dispatch(action, mergeActionContext(input, ctx));
  (dispatch as typeof dispatch & { __actionScope?: ActionScope; __componentRegistry?: ComponentHandleRegistry }).__actionScope = input.actionScope;
  (dispatch as typeof dispatch & { __actionScope?: ActionScope; __componentRegistry?: ComponentHandleRegistry }).__componentRegistry = input.componentRegistry;

  return {
    render(renderInput, options) {
      return <RenderNodes input={renderInput} options={options} />;
    },
    evaluate(target, scope) {
      return input.runtime.evaluate(target, scope ?? input.scope);
    },
    createScope(patch, options) {
      return input.runtime.createChildScope(input.scope, patch, options);
    },
    dispatch
  };
}

function RenderNodes(props: { input: RenderNodeInput; options?: RenderFragmentOptions }) {
  const runtime = useRendererRuntime();
  const currentScope = useRenderScope();
  const currentActionScope = useCurrentActionScope();
  const currentComponentRegistry = useCurrentComponentRegistry();
  const currentForm = useCurrentForm();
  const currentPage = useCurrentPage();
  const compiled = useMemo(() => normalizeNodeInput(runtime, props.input), [runtime, props.input]);
  const fragmentScopeRef = useRef<{
    parentScope: ScopeRef;
    isolate?: boolean;
    pathSuffix?: string;
    scopeKey?: string;
    data: Record<string, any>;
    scope: ScopeRef;
  } | undefined>(undefined);

  let scope = currentScope;
  const actionScope = props.options?.actionScope ?? currentActionScope;
  const componentRegistry = props.options?.componentRegistry ?? currentComponentRegistry;

  if (!compiled) {
    return null;
  }

  if (props.options?.scope) {
    scope = props.options.scope;
  } else if (props.options?.data) {
    const nextData = props.options.data as Record<string, any>;
    const cached = fragmentScopeRef.current;

    if (
      !cached ||
      cached.parentScope !== currentScope ||
      cached.isolate !== props.options.isolate ||
      cached.pathSuffix !== props.options.pathSuffix ||
      cached.scopeKey !== props.options.scopeKey
    ) {
      scope = runtime.createChildScope(currentScope, nextData, {
        isolate: props.options.isolate,
        pathSuffix: props.options.pathSuffix,
        scopeKey: props.options.scopeKey,
        source: 'fragment'
      });
      fragmentScopeRef.current = {
        parentScope: currentScope,
        isolate: props.options.isolate,
        pathSuffix: props.options.pathSuffix,
        scopeKey: props.options.scopeKey,
        data: nextData,
        scope
      };
    } else {
      scope = cached.scope;

      if (!shallowEqual(cached.data, nextData)) {
        scope.store?.setSnapshot(nextData);
        cached.data = nextData;
      }
    }
  }

  if (Array.isArray(compiled)) {
    return (
      <>
        {compiled.map((node) => (
          <NodeRenderer
            key={node.id}
            node={node}
            scope={scope}
            actionScope={actionScope}
            componentRegistry={componentRegistry}
            form={currentForm}
            page={currentPage}
          />
        ))}
      </>
    );
  }

  return (
    <NodeRenderer
      node={compiled}
      scope={scope}
      actionScope={actionScope}
      componentRegistry={componentRegistry}
      form={currentForm}
      page={currentPage}
    />
  );
}

function DialogHost() {
  const page = useCurrentPage();

  const dialogs = useSyncExternalStoreWithSelector(
    page?.store.subscribe ?? (() => () => undefined),
    () => page?.store.getState().dialogs ?? [],
    () => page?.store.getState().dialogs ?? [],
    (state: DialogState[]) => state,
    Object.is
  );

  if (!page || dialogs.length === 0) {
    return null;
  }

  return (
    <div className="na-dialog-host na-theme-root">
      {dialogs.map((dialog: DialogState) => (
        <DialogView key={dialog.id} dialog={dialog} page={page} />
      ))}
    </div>
  );
}

function DialogView(props: {
  dialog: DialogState;
  page: PageRuntime;
}) {
  useSyncExternalStoreWithSelector(
    props.dialog.scope.store?.subscribe ?? (() => () => undefined),
    () => props.dialog.scope.readOwn(),
    () => props.dialog.scope.readOwn(),
    (state) => state,
    Object.is
  );

  const { dialog, page } = props;

  return (
      <div className="na-dialog-backdrop na-theme-root">
        <div className="na-dialog-card">
        {dialog.title
          ? (
              <ActionScopeContext.Provider value={dialog.actionScope}>
                <ComponentRegistryContext.Provider value={dialog.componentRegistry}>
                  <ScopeContext.Provider value={dialog.scope}>
                    <h3>
                      {typeof dialog.title === 'string'
                        ? dialog.title
                        : isCompiledNode(dialog.title) || isCompiledNodeArray(dialog.title)
                        ? <RenderNodes input={dialog.title} options={{ scope: dialog.scope, actionScope: dialog.actionScope, componentRegistry: dialog.componentRegistry }} />
                        : String(dialog.title)}
                    </h3>
                  </ScopeContext.Provider>
                </ComponentRegistryContext.Provider>
              </ActionScopeContext.Provider>
            )
          : null}
        <button className="na-dialog-close" type="button" onClick={() => page.closeDialog(dialog.id)}>
          Close
        </button>
        <ActionScopeContext.Provider value={dialog.actionScope}>
          <ComponentRegistryContext.Provider value={dialog.componentRegistry}>
            <ScopeContext.Provider value={dialog.scope}>
              <RenderNodes
                input={(dialog.body ?? dialog.dialog.body) as RenderNodeInput}
                options={{ scope: dialog.scope, actionScope: dialog.actionScope, componentRegistry: dialog.componentRegistry }}
              />
            </ScopeContext.Provider>
          </ComponentRegistryContext.Provider>
        </ActionScopeContext.Provider>
      </div>
    </div>
  );
}

function NodeRenderer(props: {
  node: CompiledSchemaNode;
  scope: ScopeRef;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  form?: FormRuntime;
  page?: PageRuntime;
}) {
  const runtime = useRendererRuntime();
  const stateRef = useRef<{ nodeId: string; state: CompiledNodeRuntimeState } | undefined>(undefined);

  if (!stateRef.current || stateRef.current.nodeId !== props.node.id) {
    stateRef.current = {
      nodeId: props.node.id,
      state: props.node.createRuntimeState()
    };
  }

  const nodeState = stateRef.current.state;
  const renderStartedAtRef = useRef(0);
  renderStartedAtRef.current = Date.now();
  const meta = runtime.resolveNodeMeta(props.node, props.scope, nodeState);
  const resolvedProps = runtime.resolveNodeProps(props.node, props.scope, nodeState);
  const formRef = useRef<{
    nodeId: string;
    formId: string;
    formName?: string;
    parentScope: ScopeRef;
    page?: PageRuntime;
    validation: CompiledSchemaNode['validation'];
    form: FormRuntime;
  } | undefined>(undefined);
  let activeForm = props.form;
  const nodeActionScopeRef = useRef<{ nodeId: string; scope: ActionScope } | undefined>(undefined);
  const nodeComponentRegistryRef = useRef<{ nodeId: string; registry: ComponentHandleRegistry } | undefined>(undefined);

  if (props.node.component.scopePolicy === 'form') {
    const formId = typeof resolvedProps.value.id === 'string' ? resolvedProps.value.id : props.node.id;
    const formName = typeof resolvedProps.value.name === 'string' ? resolvedProps.value.name : undefined;
    const initialValues =
      resolvedProps.value.data && typeof resolvedProps.value.data === 'object'
        ? (resolvedProps.value.data as Record<string, any>)
        : undefined;

    if (
      !formRef.current ||
      formRef.current.nodeId !== props.node.id ||
      formRef.current.formId !== formId ||
      formRef.current.formName !== formName ||
      formRef.current.parentScope !== props.scope ||
      formRef.current.page !== props.page ||
      formRef.current.validation !== props.node.validation
    ) {
        formRef.current = {
          nodeId: props.node.id,
          formId,
          formName,
          parentScope: props.scope,
          page: props.page,
          validation: props.node.validation,
          form: runtime.createFormRuntime({
            id: formId,
            name: formName,
            initialValues,
            parentScope: props.scope,
            page: props.page,
            validation: props.node.validation
          })
      };
    }

    activeForm = formRef.current.form;
  }

  if (
    props.node.component.actionScopePolicy === 'new' &&
    (!nodeActionScopeRef.current || nodeActionScopeRef.current.nodeId !== props.node.id)
  ) {
    nodeActionScopeRef.current = {
      nodeId: props.node.id,
      scope: createNodeOwnedActionScope(runtime, props.actionScope, props.node)
    };
  }

  if (
    props.node.component.componentRegistryPolicy === 'new' &&
    (!nodeComponentRegistryRef.current || nodeComponentRegistryRef.current.nodeId !== props.node.id)
  ) {
    nodeComponentRegistryRef.current = {
      nodeId: props.node.id,
      registry: createNodeOwnedComponentRegistry(runtime, props.componentRegistry, props.node)
    };
  }

  const activeScope = activeForm?.scope ?? props.scope;
  const activeActionScope = props.node.component.actionScopePolicy === 'new'
    ? nodeActionScopeRef.current?.scope
    : props.actionScope;
  const activeComponentRegistry = props.node.component.componentRegistryPolicy === 'new'
    ? nodeComponentRegistryRef.current?.registry
    : props.componentRegistry;
  const nodeImports = getNodeImports(props.node);

  useEffect(() => {
    if (!activeForm || !activeComponentRegistry) {
      return;
    }

    const unregister = activeComponentRegistry.register(createFormComponentHandle(activeForm));
    return unregister;
  }, [activeComponentRegistry, activeForm]);

  useEffect(() => {
    void runtime.ensureImportedNamespaces({
      imports: nodeImports,
      actionScope: activeActionScope,
      componentRegistry: activeComponentRegistry,
      scope: activeScope,
      node: props.node
    }).catch(() => undefined);

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
          (event?: unknown, eventContext?: Partial<ActionContext>) =>
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
          render: (options?: RenderFragmentOptions) => <RenderNodes input={region.node} options={options} />
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
    meta,
    regions,
    events,
    helpers
  };

  const Comp = props.node.component.component;

  useEffect(() => {
    if (!meta.visible || meta.hidden) {
      return;
    }

    const payload = {
      nodeId: props.node.id,
      path: props.node.path,
      type: props.node.type
    };

    runtime.env.monitor?.onRenderStart?.(payload);
    runtime.env.monitor?.onRenderEnd?.({
      ...payload,
      durationMs: Math.max(0, Date.now() - renderStartedAtRef.current)
    });
  });

  if (!meta.visible || meta.hidden) {
    return null;
  }

  return (
    <NodeMetaContext.Provider value={{ id: props.node.id, path: props.node.path, type: props.node.type }}>
      <ActionScopeContext.Provider value={activeActionScope}>
        <ComponentRegistryContext.Provider value={activeComponentRegistry}>
          <ScopeContext.Provider value={activeScope}>
            <FormContext.Provider value={activeForm}>
              <PageContext.Provider value={props.page}>
                <Comp {...componentProps} />
              </PageContext.Provider>
            </FormContext.Provider>
          </ScopeContext.Provider>
        </ComponentRegistryContext.Provider>
      </ActionScopeContext.Provider>
    </NodeMetaContext.Provider>
  );
}

export function createSchemaRenderer(registryDefinitions: RendererDefinition[] = []) {
  const registry = createRendererRegistry(registryDefinitions);

  return function SchemaRenderer(props: SchemaRendererProps) {
    const runtime = useMemo(() => {
      const resolvedRegistry = props.registry ?? registry;
      const expressionCompiler = createExpressionCompiler(props.formulaCompiler ?? createFormulaCompiler());

      return createRendererRuntime({
        registry: resolvedRegistry,
        env: props.env,
        expressionCompiler,
        plugins: props.plugins,
        pageStore: props.pageStore,
        onActionError: props.onActionError
      });
    }, [props.env, props.formulaCompiler, props.plugins, props.registry, props.pageStore, props.onActionError]);

    const pageData = props.data ?? EMPTY_SCOPE_DATA;
    const page = useMemo(() => runtime.createPageRuntime(), [runtime]);

    if (page.store.getState().data !== pageData) {
      page.store.setData(pageData);
    }

    const rootScope = props.parentScope ?? page.scope;
    const rootActionScope = useMemo(
      () => props.actionScope ?? runtime.createActionScope({ id: 'root-action-scope' }),
      [props.actionScope, runtime]
    );
    const rootComponentRegistry = useMemo(
      () => props.componentRegistry ?? runtime.createComponentHandleRegistry({ id: 'root-component-registry' }),
      [props.componentRegistry, runtime]
    );

    return (
      <RuntimeContext.Provider value={runtime}>
        <ActionScopeContext.Provider value={rootActionScope}>
          <ComponentRegistryContext.Provider value={rootComponentRegistry}>
            <ScopeContext.Provider value={rootScope}>
              <PageContext.Provider value={page}>
                <RenderNodes input={props.schema} options={{ actionScope: rootActionScope, componentRegistry: rootComponentRegistry }} />
                <DialogHost />
              </PageContext.Provider>
            </ScopeContext.Provider>
          </ComponentRegistryContext.Provider>
        </ActionScopeContext.Provider>
      </RuntimeContext.Provider>
    );
  };
}

export function useRendererRuntime(): RendererRuntime {
  return useRequiredContext(RuntimeContext, 'RendererRuntime');
}

export function useRenderScope(): ScopeRef {
  return useRequiredContext(ScopeContext, 'RenderScope');
}

export function useCurrentActionScope(): ActionScope | undefined {
  return useContext(ActionScopeContext);
}

export function useCurrentComponentRegistry(): ComponentHandleRegistry | undefined {
  return useContext(ComponentRegistryContext);
}

export function useRendererEnv() {
  return useRendererRuntime().env;
}

export function useScopeSelector<T>(selector: (scopeData: any) => T, equalityFn: (a: T, b: T) => boolean = Object.is): T {
  const scope = useRenderScope();
  const store = scope.store;
  const subscribe = store?.subscribe ?? (() => () => undefined);
  const getSnapshot = () => scope.readOwn();

  return useSyncExternalStoreWithSelector(
    subscribe,
    getSnapshot,
    getSnapshot,
    selector,
    equalityFn
  );
}

export function useCurrentForm(): FormRuntime | undefined {
  return useContext(FormContext);
}

export function useCurrentFormState<T>(
  selector: (state: FormStoreState) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is
): T {
  const form = useCurrentForm();
  const subscribe = form?.store.subscribe ?? (() => () => undefined);
  const getSnapshot = () => form?.store.getState() ?? EMPTY_FORM_STORE_STATE;

  return useSyncExternalStoreWithSelector(subscribe, getSnapshot, getSnapshot, selector, equalityFn);
}

export function useCurrentFormErrors(query?: FormErrorQuery): ValidationError[] {
  return useCurrentFormState((state) => selectCurrentFormErrors(state, query));
}

export function useCurrentFormError(query: FormErrorQuery): ValidationError | undefined {
  return useCurrentFormState((state) => selectCurrentFormErrors(state, query)[0], Object.is);
}

export function useCurrentFormFieldState(path: string, query?: FormErrorQuery): FormFieldStateSnapshot {
  return useCurrentFormState(
    (state) => selectCurrentFormFieldState(state, path, query),
    (left, right) =>
      left.error === right.error &&
      left.validating === right.validating &&
      left.touched === right.touched &&
      left.dirty === right.dirty &&
      left.visited === right.visited &&
      left.submitting === right.submitting
  );
}

export function useValidationNodeState(path: string): FormFieldStateSnapshot {
  return useCurrentFormFieldState(path, { path });
}

export function useFieldError(path: string): ValidationError | undefined {
  return useCurrentFormError({ path, sourceKinds: ['field', 'runtime-registration'] });
}

export function useOwnedFieldState(path: string): FormFieldStateSnapshot {
  return useCurrentFormFieldState(path, { path, ownerPath: path });
}

export function useChildFieldState(path: string): FormFieldStateSnapshot {
  return useCurrentFormFieldState(path, { path });
}

export function useAggregateError(path: string): ValidationError | undefined {
  return useCurrentFormError({ path, ownerPath: path, sourceKinds: ['array', 'object', 'form', 'runtime-registration'] });
}

export function useCurrentPage(): PageRuntime | undefined {
  return useContext(PageContext);
}

export function useCurrentNodeMeta(): RenderNodeMeta {
  return useRequiredContext(NodeMetaContext, 'NodeMeta');
}

export function useActionDispatcher() {
  return useRendererRuntime().dispatch;
}

export function useRenderFragment() {
  const runtime = useRendererRuntime();
  const scope = useRenderScope();
  const actionScope = useCurrentActionScope();
  const componentRegistry = useCurrentComponentRegistry();
  const form = useCurrentForm();
  const page = useCurrentPage();

  return useMemo(
    () => createHelpers({ runtime, scope, actionScope, componentRegistry, form, page }).render,
    [runtime, scope, actionScope, componentRegistry, form, page]
  );
}

export const rendererHooks: RendererHookApi = {
  useRendererRuntime,
  useRenderScope,
  useCurrentActionScope,
  useCurrentComponentRegistry,
  useScopeSelector,
  useRendererEnv,
  useActionDispatcher,
  useCurrentForm,
  useCurrentFormErrors,
  useCurrentFormError,
  useCurrentFormFieldState,
  useValidationNodeState,
  useFieldError,
  useOwnedFieldState,
  useChildFieldState,
  useAggregateError,
  useCurrentPage,
  useCurrentNodeMeta,
  useRenderFragment
};
