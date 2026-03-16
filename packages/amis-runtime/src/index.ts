import { createStore } from 'zustand/vanilla';
import type {
  ActionContext,
  ActionResult,
  ActionSchema,
  ApiObject,
  BaseSchema,
  CompiledNodeRuntimeState,
  CompiledRegion,
  CompiledRuntimeValue,
  CompiledSchemaMeta,
  CompiledSchemaNode,
  CompileNodeOptions,
  CompileSchemaOptions,
  DynamicRuntimeValue,
  ExpressionCompiler,
  FormRuntime,
  FormStoreApi,
  FormStoreState,
  PageRuntime,
  PageStoreApi,
  PageStoreState,
  RendererDefinition,
  RendererPlugin,
  RendererRegistry,
  RendererRuntime,
  ResolvedNodeMeta,
  ResolvedNodeProps,
  SchemaCompiler,
  SchemaFieldRule,
  SchemaInput,
  ScopeRef,
  ScopeStore,
  RendererEnv
} from '@nop-chaos/amis-schema';
import {
  META_FIELDS,
  createNodeId,
  isPlainObject,
  isSchemaInput,
  setIn,
  shallowEqual
} from '@nop-chaos/amis-schema';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/amis-formula';

function createScopeStore(initialData: Record<string, any>): ScopeStore<Record<string, any>> {
  const store = createStore<{ snapshot: Record<string, any> }>(() => ({ snapshot: initialData }));

  return {
    getSnapshot() {
      return store.getState().snapshot;
    },
    setSnapshot(next) {
      store.setState({ snapshot: next });
    },
    subscribe(listener) {
      return store.subscribe(listener);
    }
  };
}

function createScopeValue(parent: ScopeRef | undefined, store: ScopeStore<Record<string, any>>, isolate?: boolean): Record<string, any> {
  const current = store.getSnapshot();

  if (!parent || isolate) {
    return current;
  }

  return {
    ...parent.read(),
    ...current
  };
}

function toRecord(value: unknown): Record<string, any> {
  return isPlainObject(value) ? value : {};
}

export function createScopeRef(input: {
  id: string;
  path: string;
  initialData?: Record<string, any>;
  parent?: ScopeRef;
  store?: ScopeStore<Record<string, any>>;
  isolate?: boolean;
  update?: (path: string, value: unknown) => void;
}): ScopeRef {
  const store = input.store ?? createScopeStore(input.initialData ?? {});

  return {
    id: input.id,
    path: input.path,
    parent: input.parent,
    store,
    get value() {
      return createScopeValue(input.parent, store, input.isolate);
    },
    read() {
      return createScopeValue(input.parent, store, input.isolate);
    },
    update(path, value) {
      if (input.update) {
        input.update(path, value);
        return;
      }

      const snapshot = store.getSnapshot();
      store.setSnapshot(setIn(snapshot, path, value));
    }
  };
}

export function createRendererRegistry(initialDefinitions: RendererDefinition[] = []): RendererRegistry {
  const map = new Map<string, RendererDefinition>();

  for (const definition of initialDefinitions) {
    map.set(definition.type, definition);
  }

  return {
    register(definition) {
      map.set(definition.type, definition);
    },
    get(type) {
      return map.get(type);
    },
    has(type) {
      return map.has(type);
    },
    list() {
      return Array.from(map.values());
    }
  };
}

const DEFAULT_FIELD_RULES: Record<string, SchemaFieldRule> = {
  body: { key: 'body', kind: 'region', regionKey: 'body' },
  actions: { key: 'actions', kind: 'region', regionKey: 'actions' },
  header: { key: 'header', kind: 'region', regionKey: 'header' },
  footer: { key: 'footer', kind: 'region', regionKey: 'footer' },
  toolbar: { key: 'toolbar', kind: 'region', regionKey: 'toolbar' },
  dialog: { key: 'dialog', kind: 'prop' },
  columns: { key: 'columns', kind: 'prop' }
};

function classifyField(renderer: RendererDefinition, key: string): SchemaFieldRule {
  const explicit = renderer.fields?.find((field) => field.key === key);

  if (explicit) {
    return explicit;
  }

  if (META_FIELDS.has(key)) {
    return { key, kind: 'meta' };
  }

  if (renderer.regions?.includes(key)) {
    return { key, kind: 'region', regionKey: key };
  }

  return DEFAULT_FIELD_RULES[key] ?? { key, kind: 'prop' };
}

function buildCompiledMeta(
  schema: BaseSchema,
  expressionCompiler: ExpressionCompiler
): CompiledSchemaMeta {
  return {
    id: schema.id ? expressionCompiler.compileValue(schema.id) : undefined,
    name: schema.name ? expressionCompiler.compileValue(schema.name) : undefined,
    label: schema.label ? expressionCompiler.compileValue(schema.label) : undefined,
    title: schema.title ? expressionCompiler.compileValue(schema.title) : undefined,
    className: schema.className ? expressionCompiler.compileValue(schema.className) : undefined,
    visibleOn: schema.visibleOn ? expressionCompiler.compileValue(schema.visibleOn) : undefined,
    hiddenOn: schema.hiddenOn ? expressionCompiler.compileValue(schema.hiddenOn) : undefined,
    disabledOn: schema.disabledOn ? expressionCompiler.compileValue(schema.disabledOn) : undefined
  };
}

function isCompiledStatic(compiled: CompiledRuntimeValue<unknown> | undefined): boolean {
  return !compiled || compiled.kind === 'static';
}

  function createNodeRuntimeState(node: CompiledSchemaNode): CompiledNodeRuntimeState {
  const metaEntries: Record<string, any> = {};
  for (const key of Object.keys(node.meta) as Array<Extract<keyof CompiledSchemaMeta, string>>) {
    const value = node.meta[key];
    if (value?.kind === 'dynamic') {
      metaEntries[key] = value.createState();
    }
  }

  const dynamicProps: Record<string, any> = {};
  for (const key of Object.keys(node.dynamicProps)) {
    dynamicProps[key] = node.dynamicProps[key].createState();
  }

  return {
    meta: metaEntries,
    dynamicProps
  };
}

function createCompiledRegion(
  key: string,
  value: unknown,
  path: string,
  compileSchema: (input: SchemaInput, options?: CompileSchemaOptions) => CompiledSchemaNode | CompiledSchemaNode[]
): CompiledRegion {
  if (value == null) {
    return {
      key,
      path,
      node: null
    };
  }

  if (!isSchemaInput(value)) {
    throw new Error(`Region ${path} must contain schema input.`);
  }

  return {
    key,
    path,
    node: compileSchema(value, { basePath: path, parentPath: path })
  };
}

function applyWrapComponentPlugins(renderer: RendererDefinition, plugins?: RendererPlugin[]): RendererDefinition {
  return (plugins ?? []).reduce((current, plugin) => plugin.wrapComponent?.(current) ?? current, renderer);
}

export function createSchemaCompiler(input: {
  registry: RendererRegistry;
  expressionCompiler?: ExpressionCompiler;
  plugins?: RendererPlugin[];
}): SchemaCompiler {
  const expressionCompiler = input.expressionCompiler ?? createExpressionCompiler(createFormulaCompiler());

  function applyBeforeCompilePlugins(schema: SchemaInput): SchemaInput {
    return (input.plugins ?? []).reduce((current, plugin) => plugin.beforeCompile?.(current) ?? current, schema);
  }

  function applyAfterCompilePlugins(node: CompiledSchemaNode | CompiledSchemaNode[]): CompiledSchemaNode | CompiledSchemaNode[] {
    return (input.plugins ?? []).reduce((current, plugin) => plugin.afterCompile?.(current) ?? current, node);
  }

  function compileSingleNode(schema: BaseSchema, options: CompileNodeOptions): CompiledSchemaNode {
    const renderer = options.renderer;
    const path = options.path;
    const meta = buildCompiledMeta(schema, expressionCompiler);
    const staticProps: Record<string, unknown> = {};
    const dynamicProps: Record<string, DynamicRuntimeValue<unknown>> = {};
    const regions: Record<string, CompiledRegion> = {};

    for (const key of Object.keys(schema)) {
      const rule = classifyField(renderer, key);
      const value = schema[key];

      if (rule.kind === 'ignored' || rule.kind === 'meta') {
        continue;
      }

      if (rule.kind === 'region') {
        regions[rule.regionKey ?? key] = createCompiledRegion(
          rule.regionKey ?? key,
          value,
          `${path}.${rule.regionKey ?? key}`,
          compileSchema
        );
        continue;
      }

      const compiled = expressionCompiler.compileValue(value);

      if (compiled.kind === 'static') {
        staticProps[key] = compiled.value;
      } else {
        dynamicProps[key] = compiled;
      }
    }

    const flags = {
      hasVisibilityRule: !!meta.visibleOn,
      hasHiddenRule: !!meta.hiddenOn,
      hasDisabledRule: !!meta.disabledOn,
      isContainer: Object.keys(regions).length > 0,
      isStatic:
        Object.values(meta).every((value) => isCompiledStatic(value)) &&
        Object.keys(dynamicProps).length === 0 &&
        Object.values(regions).every((region) => region.node == null)
    };

    return {
      id: createNodeId(path, schema),
      type: schema.type,
      path,
      schema,
      component: renderer,
      meta,
      staticProps,
      dynamicProps,
      regions,
      flags,
      createRuntimeState() {
        return createNodeRuntimeState(this);
      }
    };
  }

  function compileSchema(schema: SchemaInput, options: CompileSchemaOptions = {}): CompiledSchemaNode | CompiledSchemaNode[] {
    const prepared = applyBeforeCompilePlugins(schema);

    if (Array.isArray(prepared)) {
      const compiled = prepared.map((item, index) => {
      const path = options.basePath ? `${options.basePath}[${index}]` : `$[${index}]`;
      const renderer = input.registry.get(item.type);

      if (!renderer) {
        throw new Error(`Renderer not found for type: ${item.type}`);
      }

      const wrappedRenderer = applyWrapComponentPlugins(renderer, input.plugins);

      return compileSingleNode(item, {
        path,
        parentPath: options.parentPath,
        renderer: wrappedRenderer
      });
    });

      return applyAfterCompilePlugins(compiled);
    }

    const path = options.basePath ?? '$';
    const renderer = input.registry.get(prepared.type);

    if (!renderer) {
      throw new Error(`Renderer not found for type: ${prepared.type}`);
    }

    const wrappedRenderer = applyWrapComponentPlugins(renderer, input.plugins);

    return applyAfterCompilePlugins(
      compileSingleNode(prepared, {
      path,
      parentPath: options.parentPath,
      renderer: wrappedRenderer
      })
    );
  }

  return {
    compile: compileSchema,
    compileNode(schema, options) {
      return compileSingleNode(schema, options);
    }
  };
}

function createFormStore(initialValues: Record<string, any>): FormStoreApi {
  const store = createStore<FormStoreState>(() => ({ values: initialValues }));

  return {
    getState() {
      return store.getState();
    },
    subscribe(listener) {
      return store.subscribe(listener);
    },
    setValues(values) {
      store.setState({ values });
    },
    setValue(path, value) {
      const current = store.getState().values;
      store.setState({ values: setIn(current, path, value) });
    }
  };
}

function createPageStore(initialData: Record<string, any>): PageStoreApi {
  const store = createStore<PageStoreState>(() => ({
    data: initialData,
    dialogs: [],
    refreshTick: 0
  }));

  return {
    getState() {
      return store.getState();
    },
    subscribe(listener) {
      return store.subscribe(listener);
    },
    setData(data) {
      store.setState({ data });
    },
    updateData(path, value) {
      const state = store.getState();
      store.setState({ data: setIn(state.data, path, value) });
    },
    openDialog(dialog) {
      const state = store.getState();
      store.setState({ dialogs: [...state.dialogs, dialog] });
    },
    closeDialog(dialogId) {
      const state = store.getState();
      store.setState({ dialogs: state.dialogs.filter((dialog) => dialog.id !== dialogId) });
    },
    refresh() {
      const state = store.getState();
      store.setState({ refreshTick: state.refreshTick + 1 });
    }
  };
}

function evaluateCompiledValue<T>(
  compiler: ExpressionCompiler,
  value: CompiledRuntimeValue<T> | undefined,
  scope: ScopeRef,
  env: RendererEnv,
  state?: any
): T | undefined {
  if (!value) {
    return undefined;
  }

  return compiler.evaluateValue(value, scope, env, state);
}

function mergeProps(staticProps: Record<string, unknown>, dynamicEntries: Record<string, unknown>, previous?: Readonly<Record<string, unknown>>) {
  const next = {
    ...staticProps,
    ...dynamicEntries
  };

  if (previous && shallowEqual(previous, next)) {
    return {
      value: previous,
      changed: false,
      reusedReference: true
    };
  }

  return {
    value: next,
    changed: true,
    reusedReference: false
  };
}

function applyResponseDataPath(currentData: Record<string, any>, dataPath: string, responseData: unknown): Record<string, any> {
  const currentValue = getPathValue(responseData, dataPath);

  if (currentValue !== undefined) {
    return setIn(currentData, dataPath, currentValue);
  }

  if (isPlainObject(responseData)) {
    return {
      ...currentData,
      ...(responseData as Record<string, any>)
    };
  }

  return setIn(currentData, dataPath, responseData);
}

function getPathValue(input: unknown, path: string): unknown {
  if (!path || input == null || typeof input !== 'object') {
    return undefined;
  }

  return path.split('.').reduce<unknown>((current, segment) => {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, input);
}

function normalizeAdaptorSource(source: string): string {
  const trimmed = source.trim();

  if (trimmed.startsWith('return ')) {
    return trimmed.slice(7).replace(/;\s*$/, '').trim();
  }

  return trimmed.replace(/;\s*$/, '').trim();
}

function createCancelledResult(error?: unknown): ActionResult {
  return {
    ok: false,
    cancelled: true,
    error
  };
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { name?: string; code?: string };
  return candidate.name === 'AbortError' || candidate.code === 'ABORT_ERR';
}

function createActionKey(action: ActionSchema, ctx: ActionContext): string {
  const owner = ctx.node?.id ?? ctx.form?.id ?? ctx.scope.id;
  const target = action.componentPath ?? action.componentId ?? action.formId ?? action.dialogId ?? action.api?.url ?? '';
  return `${owner}:${action.action}:${target}`;
}

function createRequestKey(actionType: string, api: ApiObject, scope: ScopeRef, form?: FormRuntime): string {
  const owner = form?.id ?? scope.id;
  return `${owner}:${actionType}:${api.method ?? 'get'}:${api.url}`;
}

function applyRequestAdaptor(expressionCompiler: ExpressionCompiler, api: ApiObject, scope: ScopeRef, env: RendererEnv): ApiObject {
  if (!api.requestAdaptor) {
    return api;
  }

  const compiled = expressionCompiler.formulaCompiler.compileExpression<ApiObject>(normalizeAdaptorSource(api.requestAdaptor));
  const adapted = compiled.exec(
    {
      api,
      scope: scope.read(),
      data: api.data,
      headers: api.headers ?? {}
    },
    env
  );

  return isPlainObject(adapted) ? ({ ...api, ...(adapted as Record<string, unknown>) } as ApiObject) : api;
}

function applyResponseAdaptor(expressionCompiler: ExpressionCompiler, api: ApiObject, responseData: unknown, scope: ScopeRef, env: RendererEnv): unknown {
  if (!api.responseAdaptor) {
    return responseData;
  }

  const compiled = expressionCompiler.formulaCompiler.compileExpression(normalizeAdaptorSource(api.responseAdaptor));

  return compiled.exec(
    {
      payload: responseData,
      response: responseData,
      api,
      scope: scope.read()
    },
    env
  );
}

let dialogCounter = 0;

function createDialogId(nodeId: string) {
  dialogCounter += 1;
  return `${nodeId}-dialog-${dialogCounter}`;
}

export function createRendererRuntime(input: {
  registry: RendererRegistry;
  env: RendererEnv;
  expressionCompiler?: ExpressionCompiler;
  schemaCompiler?: SchemaCompiler;
  plugins?: RendererPlugin[];
  pageStore?: PageStoreApi;
  onActionError?: (error: unknown, ctx: ActionContext) => void;
}): RendererRuntime {
  const expressionCompiler = input.expressionCompiler ?? createExpressionCompiler(createFormulaCompiler());
  const schemaCompiler = input.schemaCompiler ?? createSchemaCompiler({
    registry: input.registry,
    expressionCompiler,
    plugins: input.plugins
  });
  const pendingDebounces = new Map<string, { timer: ReturnType<typeof setTimeout>; resolve: (result: ActionResult) => void }>();
  const activeRequests = new Map<string, AbortController>();

  async function executeApiRequest<T>(actionType: string, api: ApiObject, scope: ScopeRef, form?: FormRuntime) {
    const requestKey = createRequestKey(actionType, api, scope, form);
    const previous = activeRequests.get(requestKey);

    if (previous) {
      previous.abort();
    }

    const controller = new AbortController();
    activeRequests.set(requestKey, controller);

    try {
      return await input.env.fetcher<T>(api, {
        scope,
        env: input.env,
        signal: controller.signal
      });
    } finally {
      if (activeRequests.get(requestKey) === controller) {
        activeRequests.delete(requestKey);
      }
    }
  }

  function createPageRuntime(data: Record<string, any> = {}): PageRuntime {
    const store = input.pageStore ?? createPageStore(data);
    store.setData(data);
    const scope = createScopeRef({
      id: 'page',
      path: '$page',
      initialData: store.getState().data,
      store: {
        getSnapshot: () => store.getState().data,
        setSnapshot: (next) => store.setData(next),
        subscribe: (listener) => store.subscribe(listener)
      },
      update: (path, value) => store.updateData(path, value)
    });

    return {
      store,
      scope,
      openDialog(dialog, dialogScope) {
        const id = createDialogId(dialogScope.id);
        store.openDialog({ id, dialog, scope: dialogScope });
        return id;
      },
      closeDialog(dialogId) {
        store.closeDialog(dialogId);
      },
      refresh() {
        store.refresh();
      }
    };
  }

  function createFormRuntime(inputValue: {
    id?: string;
    initialValues?: Record<string, any>;
    parentScope: ScopeRef;
    page?: PageRuntime;
  }): FormRuntime {
    const store = createFormStore(inputValue.initialValues ?? {});
    const formId = inputValue.id ?? `${inputValue.parentScope.id}-form`;
    const scope = createScopeRef({
      id: formId,
      path: `${inputValue.parentScope.path}.form`,
      parent: inputValue.parentScope,
      store: {
        getSnapshot: () => store.getState().values,
        setSnapshot: (next) => store.setValues(next),
        subscribe: (listener) => store.subscribe(listener)
      },
      update: (path, value) => store.setValue(path, value)
    });

    return {
      id: formId,
      store,
      scope,
      async submit(api?: ApiObject) {
        if (!api) {
          return { ok: true, data: store.getState().values };
        }

        const adaptedApi = applyRequestAdaptor(expressionCompiler, api, scope, input.env);
        const response = await executeApiRequest('submitForm', adaptedApi, scope);
        const adaptedData = applyResponseAdaptor(expressionCompiler, adaptedApi, response.data, scope, input.env);

        return {
          ok: response.ok,
          data: adaptedData,
          error: response.ok ? undefined : adaptedData
        };
      },
      reset(values) {
        store.setValues(toRecord(values));
      },
      setValue(name, value) {
        store.setValue(name, value);
      }
    };
  }

  async function runSingleAction(action: ActionSchema, ctx: ActionContext): Promise<ActionResult> {
    try {
      const processedAction = await (input.plugins ?? []).reduce<Promise<ActionSchema>>(
        async (currentPromise, plugin) => {
          const current = await currentPromise;
          return plugin.beforeAction ? plugin.beforeAction(current, ctx) : current;
        },
        Promise.resolve(action)
      );

      switch (processedAction.action) {
        case 'setValue': {
          const targetPath = processedAction.componentPath ?? processedAction.componentId ?? '';
          const evaluated = processedAction.value === undefined ? undefined : evaluate(processedAction.value, ctx.scope);
          if (ctx.form && processedAction.formId && ctx.form.id === processedAction.formId) {
            ctx.form.setValue(targetPath, evaluated);
          } else {
            ctx.scope.update(targetPath, evaluated);
          }
          return { ok: true, data: evaluated };
        }
        case 'ajax': {
          if (!processedAction.api) {
            return { ok: false, error: new Error('Missing api in ajax action') };
          }

          const api = applyRequestAdaptor(expressionCompiler, evaluate<ApiObject>(processedAction.api, ctx.scope), ctx.scope, input.env);
          const response = await executeApiRequest('ajax', api, ctx.scope, ctx.form);
          const adaptedData = applyResponseAdaptor(expressionCompiler, api, response.data, ctx.scope, input.env);

          if (processedAction.dataPath && response.ok && ctx.page) {
            const nextData = applyResponseDataPath(ctx.page.store.getState().data, processedAction.dataPath, adaptedData);
            ctx.page.store.setData(nextData);
          }

          return { ok: response.ok, data: adaptedData, error: response.ok ? undefined : adaptedData };
        }
        case 'dialog': {
          if (!ctx.page || !processedAction.dialog) {
            return { ok: false, error: new Error('Dialog action requires page runtime and dialog config') };
          }
          const dialogScope = createScopeRef({
            id: `${ctx.node?.id ?? ctx.scope.id}:dialog-scope`,
            path: `${ctx.scope.path}.dialog`,
            parent: ctx.scope,
            initialData: {
              dialogId: `${ctx.node?.id ?? ctx.scope.id}-pending`
            }
          });
          const dialogId = ctx.page.openDialog(processedAction.dialog, dialogScope);
          dialogScope.update('dialogId', dialogId);
          return { ok: true, data: { dialogId } };
        }
        case 'closeDialog': {
          if (ctx.page && processedAction.dialogId) {
            ctx.page.closeDialog(String(evaluate(processedAction.dialogId, ctx.scope)));
          }
          return { ok: true };
        }
        case 'refreshTable': {
          ctx.page?.refresh();
          return { ok: true, data: ctx.page?.store.getState().refreshTick };
        }
        case 'submitForm': {
          if (!ctx.form) {
            return { ok: false, error: new Error('submitForm requires form runtime') };
          }

          const api = processedAction.api ? evaluate<ApiObject>(processedAction.api, ctx.scope) : undefined;
          return ctx.form.submit(api);
        }
        default:
          return { ok: false, error: new Error(`Unsupported action: ${processedAction.action}`) };
      }
    } catch (error) {
      if (isAbortError(error)) {
        return createCancelledResult(error);
      }

      input.onActionError?.(error, ctx);
      for (const plugin of input.plugins ?? []) {
        plugin.onError?.(error, {
          phase: 'action',
          error,
          nodeId: ctx.node?.id,
          path: ctx.node?.path
        });
      }
      return {
        ok: false,
        error
      };
    }
  }

  function runActionWithDebounce(action: ActionSchema, ctx: ActionContext): Promise<ActionResult> {
    if (!action.debounce || action.debounce <= 0) {
      return runSingleAction(action, ctx);
    }

    const key = createActionKey(action, ctx);
    const previous = pendingDebounces.get(key);

    if (previous) {
      clearTimeout(previous.timer);
      previous.resolve(createCancelledResult());
      pendingDebounces.delete(key);
    }

    return new Promise<ActionResult>((resolve) => {
      const timer = setTimeout(async () => {
        pendingDebounces.delete(key);
        resolve(await runSingleAction(action, ctx));
      }, action.debounce);

      pendingDebounces.set(key, { timer, resolve });
    });
  }

  async function dispatch(action: ActionSchema | ActionSchema[], ctx: ActionContext): Promise<ActionResult> {
    const actions = Array.isArray(action) ? action : [action];
    let previous: ActionResult = { ok: true };

    for (const current of actions) {
      const actionContext = {
        ...ctx,
        prevResult: previous
      };
      const result = await runActionWithDebounce(current, actionContext);

      previous = result;

      if (!result.ok && !current.continueOnError) {
        return result;
      }

      if (current.then) {
        previous = await dispatch(current.then, {
          ...ctx,
          prevResult: result
        });
      }
    }

    return previous;
  }

  function evaluate<T = unknown>(target: unknown, scope: ScopeRef): T {
    const compiled = expressionCompiler.compileValue(target);
    return expressionCompiler.evaluateValue(compiled, scope, input.env) as T;
  }

  function resolveNodeMeta(node: CompiledSchemaNode, scope: ScopeRef, state?: CompiledNodeRuntimeState): ResolvedNodeMeta {
    const resolved: ResolvedNodeMeta = {
      id: evaluateCompiledValue(expressionCompiler, node.meta.id, scope, input.env, state?.meta.id),
      name: evaluateCompiledValue(expressionCompiler, node.meta.name, scope, input.env, state?.meta.name),
      label: evaluateCompiledValue(expressionCompiler, node.meta.label, scope, input.env, state?.meta.label),
      title: evaluateCompiledValue(expressionCompiler, node.meta.title, scope, input.env, state?.meta.title),
      className: evaluateCompiledValue(expressionCompiler, node.meta.className, scope, input.env, state?.meta.className),
      visible: Boolean(evaluateCompiledValue(expressionCompiler, node.meta.visibleOn, scope, input.env, state?.meta.visibleOn) ?? true),
      hidden: Boolean(evaluateCompiledValue(expressionCompiler, node.meta.hiddenOn, scope, input.env, state?.meta.hiddenOn) ?? false),
      disabled: Boolean(evaluateCompiledValue(expressionCompiler, node.meta.disabledOn, scope, input.env, state?.meta.disabledOn) ?? false),
      changed: true
    };

    if (state?.resolvedMeta && shallowEqual(state.resolvedMeta, resolved)) {
      return {
        ...state.resolvedMeta,
        changed: false
      };
    }

    if (state) {
      state.resolvedMeta = resolved;
    }

    return resolved;
  }

  function resolveNodeProps(node: CompiledSchemaNode, scope: ScopeRef, state?: CompiledNodeRuntimeState): ResolvedNodeProps {
    const dynamicValues: Record<string, unknown> = {};

    for (const key of Object.keys(node.dynamicProps)) {
      dynamicValues[key] = expressionCompiler.evaluateValue(
        node.dynamicProps[key],
        scope,
        input.env,
        state?.dynamicProps[key]
      );
    }

    const merged = mergeProps(node.staticProps, dynamicValues, state?.resolvedProps);

    if (state) {
      state.resolvedProps = merged.value;
    }

    return merged;
  }

  return {
    registry: input.registry,
    env: input.env,
    expressionCompiler,
    schemaCompiler,
    plugins: input.plugins ?? [],
    compile(schema) {
      return schemaCompiler.compile(schema);
    },
    evaluate,
    resolveNodeMeta,
    resolveNodeProps,
    createChildScope(parent, patch, options) {
      const data = toRecord(patch);
      const store = createScopeStore(data);

      return createScopeRef({
        id: options?.scopeKey ?? `${parent.id}:${options?.pathSuffix ?? 'child'}`,
        path: options?.pathSuffix ? `${parent.path}.${options.pathSuffix}` : `${parent.path}.child`,
        parent,
        store,
        isolate: options?.isolate
      });
    },
    dispatch,
    createPageRuntime,
    createFormRuntime
  };
}
