import React, { useContext, useEffect, useMemo, useRef } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import type {
  ActionContext,
  CompiledNodeRuntimeState,
  CompiledSchemaNode,
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
import { isSchema, isSchemaArray } from '@nop-chaos/amis-schema';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/amis-formula';
import { createRendererRegistry, createRendererRuntime } from '@nop-chaos/amis-runtime';
import { FormContext, NodeMetaContext, PageContext, RuntimeContext, ScopeContext, useRequiredContext } from './contexts';
import { EMPTY_FORM_STORE_STATE, selectCurrentFormErrors, selectCurrentFormFieldState } from './form-state';

export { createDefaultEnv, createDefaultRegistry } from './defaults';

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

function mergeActionContext(base: {
  runtime: RendererRuntime;
  scope: ScopeRef;
  form?: FormRuntime;
  page?: PageRuntime;
  node?: CompiledSchemaNode;
}, partial?: Partial<ActionContext>): ActionContext {
  return {
    runtime: base.runtime,
    scope: partial?.scope ?? base.scope,
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
  form?: FormRuntime;
  page?: PageRuntime;
  node?: CompiledSchemaNode;
}): RendererHelpers {
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
    dispatch(action, ctx) {
      return input.runtime.dispatch(action, mergeActionContext(input, ctx));
    }
  };
}

function RenderNodes(props: { input: RenderNodeInput; options?: RenderFragmentOptions }) {
  const runtime = useRendererRuntime();
  const currentScope = useRenderScope();
  const currentForm = useCurrentForm();
  const currentPage = useCurrentPage();
  const compiled = normalizeNodeInput(runtime, props.input);

  if (!compiled) {
    return null;
  }

  const scope = props.options?.scope
    ? props.options.scope
    : props.options?.data
      ? runtime.createChildScope(currentScope, props.options.data, {
          isolate: props.options.isolate,
          pathSuffix: props.options.pathSuffix,
          scopeKey: props.options.scopeKey,
          source: 'fragment'
        })
      : currentScope;

  if (Array.isArray(compiled)) {
    return (
      <>
        {compiled.map((node) => (
          <NodeRenderer
            key={node.id}
            node={node}
            scope={scope}
            form={currentForm}
            page={currentPage}
          />
        ))}
      </>
    );
  }

  return <NodeRenderer node={compiled} scope={scope} form={currentForm} page={currentPage} />;
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
    <div className="na-dialog-host">
      {dialogs.map((dialog: DialogState) => (
        <div key={dialog.id} className="na-dialog-backdrop">
          <div className="na-dialog-card">
            {typeof dialog.dialog.title === 'string' ? <h3>{dialog.dialog.title}</h3> : null}
            <button className="na-dialog-close" type="button" onClick={() => page.closeDialog(dialog.id)}>
              Close
            </button>
            <ScopeContext.Provider value={dialog.scope}>
              <RenderNodes input={dialog.dialog.body as RenderNodeInput} options={{ scope: dialog.scope }} />
            </ScopeContext.Provider>
          </div>
        </div>
      ))}
    </div>
  );
}

function NodeRenderer(props: {
  node: CompiledSchemaNode;
  scope: ScopeRef;
  form?: FormRuntime;
  page?: PageRuntime;
}) {
  const runtime = useRendererRuntime();
  const stateRef = useRef<CompiledNodeRuntimeState>(props.node.createRuntimeState());
  const renderStartedAtRef = useRef(0);
  renderStartedAtRef.current = Date.now();
  const meta = runtime.resolveNodeMeta(props.node, props.scope, stateRef.current);
  const resolvedProps = runtime.resolveNodeProps(props.node, props.scope, stateRef.current);
  const activeForm = useMemo(() => {
    if (props.node.component.scopePolicy !== 'form') {
      return props.form;
    }

    return runtime.createFormRuntime({
      id: typeof resolvedProps.value.id === 'string' ? resolvedProps.value.id : props.node.id,
      initialValues:
        resolvedProps.value.data && typeof resolvedProps.value.data === 'object'
          ? (resolvedProps.value.data as Record<string, any>)
          : undefined,
      parentScope: props.scope,
      page: props.page,
      validation: props.node.validation
    });
  }, [props.form, props.node.component.scopePolicy, props.node.id, props.node.validation, props.page, props.scope, resolvedProps.value, runtime]);
  const activeScope = activeForm?.scope ?? props.scope;

  const helpers = useMemo(
    () =>
      createHelpers({
        runtime,
        scope: activeScope,
        form: activeForm,
        page: props.page,
        node: props.node
      }),
    [runtime, activeScope, activeForm, props.page, props.node]
  );

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
      <ScopeContext.Provider value={activeScope}>
        <FormContext.Provider value={activeForm}>
          <PageContext.Provider value={props.page}>
            <Comp {...componentProps} />
          </PageContext.Provider>
        </FormContext.Provider>
      </ScopeContext.Provider>
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

    const page = useMemo(() => runtime.createPageRuntime(props.data), [runtime, props.data]);
    const rootScope = props.parentScope ?? page.scope;

    return (
      <RuntimeContext.Provider value={runtime}>
        <ScopeContext.Provider value={rootScope}>
          <PageContext.Provider value={page}>
            <RenderNodes input={props.schema} />
            <DialogHost />
          </PageContext.Provider>
        </ScopeContext.Provider>
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
  const form = useCurrentForm();
  const page = useCurrentPage();

  return useMemo(() => createHelpers({ runtime, scope, form, page }).render, [runtime, scope, form, page]);
}

export const rendererHooks: RendererHookApi = {
  useRendererRuntime,
  useRenderScope,
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
