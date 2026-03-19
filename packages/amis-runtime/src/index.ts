import { createStore } from 'zustand/vanilla';
import type {
  ActionContext,
  ActionResult,
  ActionSchema,
  ApiObject,
  BaseSchema,
  CompiledFormValidationField,
  CompiledFormValidationModel,
  CompiledValidationNode,
  CompiledNodeRuntimeState,
  CompiledRegion,
  CompiledRuntimeValue,
  CompiledSchemaMeta,
  CompiledSchemaNode,
  CompileNodeOptions,
  CompileSchemaOptions,
  ExpressionCompiler,
  FormValidationResult,
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
  RuntimeFieldRegistration,
  SchemaCompiler,
  SchemaFieldRule,
  SchemaInput,
  ScopeRef,
  ScopeStore,
  ValidationTrigger,
  ValidationVisibilityTrigger,
  ValidationError,
  CompiledValidationRule,
  ValidationResult,
  ValidationRule,
  RendererEnv
} from '@nop-chaos/amis-schema';
import {
  META_FIELDS,
  createNodeId,
  getIn,
  isPlainObject,
  isSchemaInput,
  parsePath,
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

function createScopeReader(parent: ScopeRef | undefined, store: ScopeStore<Record<string, any>>, isolate?: boolean) {
  let lastOwnSnapshot: Record<string, any> | undefined;
  let lastParentSnapshot: Record<string, any> | undefined;
  let lastMaterialized: Record<string, any> | undefined;

  return function read(): Record<string, any> {
    const ownSnapshot = store.getSnapshot();

    if (!parent || isolate) {
      return ownSnapshot;
    }

    const parentSnapshot = parent.read();

    if (
      lastMaterialized &&
      lastOwnSnapshot === ownSnapshot &&
      lastParentSnapshot === parentSnapshot
    ) {
      return lastMaterialized;
    }

    lastOwnSnapshot = ownSnapshot;
    lastParentSnapshot = parentSnapshot;
    lastMaterialized = {
      ...parentSnapshot,
      ...ownSnapshot
    };

    return lastMaterialized;
  };
}

function hasOwnPathValue(input: Record<string, any>, path: string): boolean {
  const segments = parsePath(path);

  if (segments.length === 0) {
    return false;
  }

  let current: unknown = input;

  for (const segment of segments) {
    if (current == null || typeof current !== 'object') {
      return false;
    }

    if (!Object.prototype.hasOwnProperty.call(current, segment)) {
      return false;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return true;
}

function resolveScopePath(scope: ScopeRef | undefined, path: string): unknown {
  if (!scope) {
    return undefined;
  }

  const segments = parsePath(path);

  if (segments.length === 0) {
    return undefined;
  }

  const [head, ...rest] = segments;
  const own = scope.readOwn();

  if (Object.prototype.hasOwnProperty.call(own, head)) {
    if (rest.length === 0) {
      return own[head];
    }

    return getIn(own[head], rest.join('.'));
  }

  return resolveScopePath(scope.parent, path);
}

function hasScopePath(scope: ScopeRef | undefined, path: string): boolean {
  if (!scope) {
    return false;
  }

  const segments = parsePath(path);

  if (segments.length === 0) {
    return false;
  }

  const [head, ...rest] = segments;
  const own = scope.readOwn();

  if (Object.prototype.hasOwnProperty.call(own, head)) {
    if (rest.length === 0) {
      return true;
    }

    return hasOwnPathValue(own, path);
  }

  return hasScopePath(scope.parent, path);
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
  const read = createScopeReader(input.parent, store, input.isolate);

  return {
    id: input.id,
    path: input.path,
    parent: input.parent,
    store,
    get value() {
      return read();
    },
    get(path) {
      return resolveScopePath(this, path);
    },
    has(path) {
      return hasScopePath(this, path);
    },
    readOwn() {
      return store.getSnapshot();
    },
    read,
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
    visible: schema.visible !== undefined ? expressionCompiler.compileValue(schema.visible) : undefined,
    hidden: schema.hidden !== undefined ? expressionCompiler.compileValue(schema.hidden) : undefined,
    disabled: schema.disabled !== undefined ? expressionCompiler.compileValue(schema.disabled) : undefined
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

  return {
    meta: metaEntries,
    props: node.props.kind === 'dynamic' ? node.props.createState() : undefined
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

function collectSchemaValidationRules(schema: BaseSchema): ValidationRule[] {
  const ruleSource = schema as BaseSchema & {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    minItems?: number;
    maxItems?: number;
    atLeastOneFilled?: boolean | { itemPath?: string; message?: string };
    allOrNone?: { itemPaths: string[]; message?: string };
    uniqueBy?: { itemPath: string; message?: string };
    atLeastOneOf?: { paths: string[]; message?: string };
    pattern?: string;
    patternMessage?: string;
    equalsField?: string;
    notEqualsField?: string;
    requiredWhen?: {
      path: string;
      equals: unknown;
      message?: string;
    };
    requiredUnless?: {
      path: string;
      equals: unknown;
      message?: string;
    };
  };
  const rules: ValidationRule[] = [];

  if (ruleSource.required) {
    rules.push({ kind: 'required' });
  }

  if (typeof ruleSource.minLength === 'number') {
    rules.push({ kind: 'minLength', value: ruleSource.minLength });
  }

  if (typeof ruleSource.maxLength === 'number') {
    rules.push({ kind: 'maxLength', value: ruleSource.maxLength });
  }

  if (typeof ruleSource.minItems === 'number') {
    rules.push({ kind: 'minItems', value: ruleSource.minItems });
  }

  if (typeof ruleSource.maxItems === 'number') {
    rules.push({ kind: 'maxItems', value: ruleSource.maxItems });
  }

  if (ruleSource.atLeastOneFilled) {
    rules.push({
      kind: 'atLeastOneFilled',
      itemPath: typeof ruleSource.atLeastOneFilled === 'object' ? ruleSource.atLeastOneFilled.itemPath : undefined,
      message: typeof ruleSource.atLeastOneFilled === 'object' ? ruleSource.atLeastOneFilled.message : undefined
    });
  }

  if (ruleSource.allOrNone?.itemPaths?.length) {
    rules.push({
      kind: 'allOrNone',
      itemPaths: ruleSource.allOrNone.itemPaths,
      message: ruleSource.allOrNone.message
    });
  }

  if (typeof ruleSource.uniqueBy?.itemPath === 'string' && ruleSource.uniqueBy.itemPath) {
    rules.push({
      kind: 'uniqueBy',
      itemPath: ruleSource.uniqueBy.itemPath,
      message: ruleSource.uniqueBy.message
    });
  }

  if (ruleSource.atLeastOneOf?.paths?.length) {
    rules.push({
      kind: 'atLeastOneOf',
      paths: ruleSource.atLeastOneOf.paths,
      message: ruleSource.atLeastOneOf.message
    });
  }

  if (typeof ruleSource.pattern === 'string' && ruleSource.pattern) {
    rules.push({
      kind: 'pattern',
      value: ruleSource.pattern,
      message: ruleSource.patternMessage
    });
  }

   if (typeof ruleSource.equalsField === 'string' && ruleSource.equalsField) {
    rules.push({
      kind: 'equalsField',
      path: ruleSource.equalsField
    });
  }

  if (typeof ruleSource.notEqualsField === 'string' && ruleSource.notEqualsField) {
    rules.push({
      kind: 'notEqualsField',
      path: ruleSource.notEqualsField
    });
  }

  if (ruleSource.requiredWhen && typeof ruleSource.requiredWhen.path === 'string' && ruleSource.requiredWhen.path) {
    rules.push({
      kind: 'requiredWhen',
      path: ruleSource.requiredWhen.path,
      equals: ruleSource.requiredWhen.equals,
      message: ruleSource.requiredWhen.message
    });
  }

  if (ruleSource.requiredUnless && typeof ruleSource.requiredUnless.path === 'string' && ruleSource.requiredUnless.path) {
    rules.push({
      kind: 'requiredUnless',
      path: ruleSource.requiredUnless.path,
      equals: ruleSource.requiredUnless.equals,
      message: ruleSource.requiredUnless.message
    });
  }

  return rules;
}

function mergeValidationRules(...groups: Array<ValidationRule[] | undefined>): ValidationRule[] {
  return groups.flatMap((group) => group ?? []);
}

function normalizeValidationTriggers(input: unknown, fallback: ValidationTrigger[] = ['blur']): ValidationTrigger[] {
  const candidates = Array.isArray(input) ? input : input != null ? [input] : [];
  const normalized = candidates.filter(
    (candidate): candidate is ValidationTrigger => candidate === 'change' || candidate === 'blur' || candidate === 'submit'
  );

  return normalized.length > 0 ? Array.from(new Set(normalized)) : fallback;
}

function normalizeValidationVisibilityTriggers(
  input: unknown,
  fallback: ValidationVisibilityTrigger[] = ['touched', 'submit']
): ValidationVisibilityTrigger[] {
  const candidates = Array.isArray(input) ? input : input != null ? [input] : [];
  const normalized = candidates.filter(
    (candidate): candidate is ValidationVisibilityTrigger =>
      candidate === 'touched' || candidate === 'dirty' || candidate === 'visited' || candidate === 'submit'
  );

  return normalized.length > 0 ? Array.from(new Set(normalized)) : fallback;
}

function buildValidationNodeTraversalOrder(
  nodes: Record<string, CompiledValidationNode>,
  rootPath: string | undefined
): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  function visit(path: string) {
    const node = nodes[path];

    if (!node || seen.has(path)) {
      return;
    }

    seen.add(path);

    if (node.kind !== 'form') {
      ordered.push(path);
    }

    for (const childPath of node.children) {
      visit(childPath);
    }
  }

  if (rootPath && nodes[rootPath]) {
    visit(rootPath);
  }

  for (const path of Object.keys(nodes)) {
    visit(path);
  }

  return ordered;
}

function collectValidationModel(
  node:
    | CompiledSchemaNode
    | CompiledSchemaNode[]
    | Array<CompiledSchemaNode | CompiledSchemaNode[]>
    | null
    | undefined,
  options: {
    defaultTriggers?: ValidationTrigger[];
    defaultShowErrorOn?: ValidationVisibilityTrigger[];
  } = {}
): CompiledFormValidationModel | undefined {
  if (!node) {
    return undefined;
  }

  const nodes: CompiledSchemaNode[] = [];
  const queue: Array<CompiledSchemaNode | CompiledSchemaNode[]> = Array.isArray(node) ? [...node] : [node];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      continue;
    }

    if (Array.isArray(current)) {
      queue.unshift(...current);
      continue;
    }

    nodes.push(current);
  }

  const fields: Record<string, CompiledFormValidationField> = {};
  const order: string[] = [];
  const validationNodes: Record<string, CompiledValidationNode> = {
    '': {
      path: '',
      kind: 'form',
      rules: [],
      children: [],
      parent: undefined
    }
  };
  const dependents = new Map<string, Set<string>>();
  const rootBehavior = {
    triggers: options.defaultTriggers ?? (['blur'] as ValidationTrigger[]),
    showErrorOn: options.defaultShowErrorOn ?? (['touched', 'submit'] as ValidationVisibilityTrigger[])
  };

  const visit = (entry: CompiledSchemaNode) => {
    if (!entry.component) {
      return;
    }

    if (entry.type === 'form') {
      rootBehavior.triggers = normalizeValidationTriggers(entry.schema.validateOn, ['blur']);
      rootBehavior.showErrorOn = normalizeValidationVisibilityTriggers(entry.schema.showErrorOn, ['touched', 'submit']);
    }

    const contributor = entry.component.validation;

    if (contributor?.kind === 'field') {
      const ctx = {
        schema: entry.schema,
        renderer: entry.component,
        path: entry.path
      };
      const fieldPath = contributor.getFieldPath?.(entry.schema, ctx);

      if (fieldPath) {
        const compiledRules = compileValidationRules(
          fieldPath,
          mergeValidationRules(collectSchemaValidationRules(entry.schema), contributor.collectRules?.(entry.schema, ctx))
        );
        const parentPath = fieldPath.includes('.') ? fieldPath.split('.').slice(0, -1).join('.') : '';
        const nodeKind = contributor.valueKind === 'array' ? 'array' : contributor.valueKind === 'object' ? 'object' : 'field';

        fields[fieldPath] = {
          path: fieldPath,
          controlType: entry.type,
          label: typeof entry.schema.label === 'string' ? entry.schema.label : undefined,
          rules: compiledRules,
          behavior: {
            triggers: normalizeValidationTriggers(entry.schema.validateOn, rootBehavior.triggers),
            showErrorOn: normalizeValidationVisibilityTriggers(entry.schema.showErrorOn, rootBehavior.showErrorOn)
          }
        };

        validationNodes[fieldPath] = {
          path: fieldPath,
          kind: nodeKind,
          controlType: entry.type,
          label: typeof entry.schema.label === 'string' ? entry.schema.label : undefined,
          rules: compiledRules,
          children: [],
          parent: parentPath
        };

        if (validationNodes[parentPath]) {
          validationNodes[parentPath].children.push(fieldPath);
        }

        for (const compiledRule of compiledRules) {
          for (const dependencyPath of compiledRule.dependencyPaths) {
            const nextDependents = dependents.get(dependencyPath) ?? new Set<string>();
            nextDependents.add(fieldPath);
            dependents.set(dependencyPath, nextDependents);
          }
        }

        order.push(fieldPath);
      }
    }

    for (const region of Object.values(entry.regions)) {
      if (!region.node) {
        continue;
      }

      const childNodes = Array.isArray(region.node) ? region.node : [region.node];
      childNodes.forEach(visit);
    }
  };

  nodes.forEach(visit);

  return order.length > 0
    ? {
        fields,
        order,
        behavior: rootBehavior,
        dependents: Object.fromEntries(Array.from(dependents.entries()).map(([path, targets]) => [path, Array.from(targets)])),
        nodes: validationNodes,
        validationOrder: buildValidationNodeTraversalOrder(validationNodes, ''),
        rootPath: ''
      }
    : undefined;
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
    const propSource: Record<string, unknown> = {};
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

      propSource[key] = value;
    }

    const props = expressionCompiler.compileValue(propSource);

    const flags = {
      hasVisibilityRule: !!meta.visible,
      hasHiddenRule: !!meta.hidden,
      hasDisabledRule: !!meta.disabled,
      isContainer: Object.keys(regions).length > 0,
      isStatic:
        Object.values(meta).every((value) => isCompiledStatic(value)) &&
        props.kind === 'static' &&
        Object.values(regions).every((region) => region.node == null)
    };

    return {
      id: createNodeId(path, schema),
      type: schema.type,
      path,
      schema,
      component: renderer,
      meta,
      props,
      validation:
        renderer.scopePolicy === 'form'
          ? collectValidationModel(
              Object.values(regions)
              .map((region) => region.node)
                .filter((candidate): candidate is CompiledSchemaNode | CompiledSchemaNode[] => candidate != null),
              {
                defaultTriggers: normalizeValidationTriggers(schema.validateOn, ['blur']),
                defaultShowErrorOn: normalizeValidationVisibilityTriggers(schema.showErrorOn, ['touched', 'submit'])
              }
            )
          : undefined,
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
  const store = createStore<FormStoreState>(() => ({
    values: initialValues,
    errors: {},
    validating: {},
    touched: {},
    dirty: {},
    visited: {},
    submitting: false
  }));

  function setBooleanState<K extends 'touched' | 'dirty' | 'visited'>(key: K, path: string, nextValue: boolean) {
    const current = store.getState()[key];

    if (nextValue) {
      if (current[path]) {
        return;
      }

      store.setState({ [key]: { ...current, [path]: true } } as Pick<FormStoreState, K>);
      return;
    }

    if (!current[path]) {
      return;
    }

    const next = { ...current };
    delete next[path];
    store.setState({ [key]: next } as Pick<FormStoreState, K>);
  }

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
    },
    setErrors(errors) {
      store.setState({ errors });
    },
    setValidating(path, validating) {
      const current = store.getState().validating;

      if (validating) {
        store.setState({ validating: { ...current, [path]: true } });
        return;
      }

      if (!current[path]) {
        return;
      }

      const next = { ...current };
      delete next[path];
      store.setState({ validating: next });
    },
    setValidatingState(validating) {
      store.setState({ validating });
    },
    setTouched(path, touched) {
      setBooleanState('touched', path, touched);
    },
    setTouchedState(touched) {
      store.setState({ touched });
    },
    setDirty(path, dirty) {
      setBooleanState('dirty', path, dirty);
    },
    setDirtyState(dirty) {
      store.setState({ dirty });
    },
    setVisited(path, visited) {
      setBooleanState('visited', path, visited);
    },
    setVisitedState(visited) {
      store.setState({ visited });
    },
    setSubmitting(submitting) {
      store.setState({ submitting });
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

      if (!dialogId) {
        if (state.dialogs.length === 0) {
          return;
        }

        store.setState({ dialogs: state.dialogs.slice(0, -1) });
        return;
      }

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

function createAdaptorScopeView(scope: ScopeRef): object {
  let cachedKeys: Array<string | symbol> | undefined;

  return new Proxy(
    {},
    {
      get(_target, property) {
        if (typeof property !== 'string') {
          return undefined;
        }

        if (property === '__proto__') {
          return undefined;
        }

        return scope.get(property);
      },
      has(_target, property) {
        return typeof property === 'string' ? scope.has(property) : false;
      },
      ownKeys() {
        if (!cachedKeys) {
          const keys = new Set<string | symbol>();
          let current: ScopeRef | undefined = scope;

          while (current) {
            for (const key of Reflect.ownKeys(current.readOwn())) {
              if (typeof key === 'string' || typeof key === 'symbol') {
                keys.add(key);
              }
            }

            current = current.parent;
          }

          cachedKeys = Array.from(keys);
        }

        return cachedKeys;
      },
      getOwnPropertyDescriptor(_target, property) {
        if (typeof property !== 'string') {
          return undefined;
        }

        if (!scope.has(property)) {
          return undefined;
        }

        return {
          configurable: true,
          enumerable: true,
          value: scope.get(property),
          writable: false
        };
      }
    }
  );
}

function createCancelledResult(error?: unknown): ActionResult {
  return {
    ok: false,
    cancelled: true,
    error
  };
}

function buildValidationMessage(rule: ValidationRule, field: CompiledFormValidationField): string {
  const label = field.label ?? field.path;

  switch (rule.kind) {
    case 'required':
      return `${label} is required`;
    case 'minLength':
      return `${label} must be at least ${rule.value} characters`;
    case 'maxLength':
      return `${label} must be at most ${rule.value} characters`;
    case 'minItems':
      return rule.message ?? `${label} must contain at least ${rule.value} item${rule.value === 1 ? '' : 's'}`;
    case 'maxItems':
      return rule.message ?? `${label} must contain at most ${rule.value} item${rule.value === 1 ? '' : 's'}`;
    case 'atLeastOneFilled':
      return rule.message ?? `${label} must contain at least one filled item`;
    case 'allOrNone':
      return rule.message ?? `${label} entries must fill all related fields or leave them all empty`;
    case 'uniqueBy':
      return rule.message ?? `${label} items must have unique ${rule.itemPath}`;
    case 'atLeastOneOf':
      return rule.message ?? `${label} must fill at least one related field`;
    case 'pattern':
      return rule.message ?? `${label} format is invalid`;
    case 'email':
      return rule.message ?? `${label} must be a valid email address`;
    case 'equalsField':
      return rule.message ?? `${label} must match ${rule.path}`;
    case 'notEqualsField':
      return rule.message ?? `${label} must not match ${rule.path}`;
    case 'requiredWhen':
      return rule.message ?? `${label} is required`;
    case 'requiredUnless':
      return rule.message ?? `${label} is required`;
    case 'async':
      return rule.message ?? `${label} failed async validation`;
  }
}

function isEmptyValue(value: unknown): boolean {
  return value == null || value === '' || (Array.isArray(value) && value.length === 0);
}

function hasFilledArrayItem(value: unknown, itemPath?: string): boolean {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.some((item) => {
    const candidate = itemPath ? getIn(item, itemPath) : item;
    return !isEmptyValue(candidate);
  });
}

function violatesAllOrNone(value: unknown, itemPaths: string[]): boolean {
  if (itemPaths.length === 0) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => {
      const flags = itemPaths.map((itemPath) => !isEmptyValue(getIn(item, itemPath)));
      return flags.some(Boolean) && flags.some((flag) => !flag);
    });
  }

  if (value == null || typeof value !== 'object') {
    return false;
  }

  const flags = itemPaths.map((itemPath) => !isEmptyValue(getIn(value, itemPath)));
  return flags.some(Boolean) && flags.some((flag) => !flag);

}

function violatesUniqueBy(value: unknown, itemPath: string): boolean {
  if (!Array.isArray(value) || !itemPath) {
    return false;
  }

  const seen = new Set<unknown>();

  for (const item of value) {
    const candidate = getIn(item, itemPath);

    if (isEmptyValue(candidate)) {
      continue;
    }

    if (seen.has(candidate)) {
      return true;
    }

    seen.add(candidate);
  }

  return false;
}

function lacksAtLeastOneOf(value: unknown, paths: string[]): boolean {
  if (value == null || typeof value !== 'object' || paths.length === 0) {
    return true;
  }

  return !paths.some((path) => !isEmptyValue(getIn(value, path)));
}

function resolveValidationErrorSourceKind(field: CompiledFormValidationField, rule: ValidationRule): ValidationError['sourceKind'] {
  switch (rule.kind) {
    case 'minItems':
    case 'maxItems':
    case 'atLeastOneFilled':
    case 'uniqueBy':
      return 'array';
    case 'atLeastOneOf':
      return 'object';
    case 'allOrNone': {
      const value = field.controlType?.toLowerCase() ?? '';
      if (value.includes('array') || value.includes('list') || value.includes('key-value')) {
        return 'array';
      }

      return 'object';
    }
    default:
      return 'field';
  }
}

function createValidationError(
  field: CompiledFormValidationField,
  compiledRule: CompiledValidationRule,
  message: string,
  overrides?: Partial<ValidationError>
): ValidationError {
  const rule = compiledRule.rule;

  return {
    path: field.path,
    message,
    rule: rule.kind,
    ruleId: compiledRule.id,
    ownerPath: field.path,
    sourceKind: resolveValidationErrorSourceKind(field, rule),
    ...overrides
  };
}

function normalizeRuntimeValidationError(
  error: ValidationError,
  registration: RuntimeFieldRegistration,
  path: string,
  childPath?: string
): ValidationError {
  const ownerPath = error.ownerPath ?? registration.path;
  const normalizedPath = childPath ?? error.path ?? path;

  return {
    ...error,
    path: normalizedPath,
    ownerPath,
    sourceKind: error.sourceKind ?? 'runtime-registration'
  };
}

function normalizeRuntimeValidationErrors(
  errors: ValidationError[],
  registration: RuntimeFieldRegistration,
  path: string,
  childPath?: string
): ValidationError[] {
  return errors.map((error) => normalizeRuntimeValidationError(error, registration, path, childPath));
}

function isNumericPathSegment(segment: string | undefined): boolean {
  return typeof segment === 'string' && /^\d+$/.test(segment);
}

function transformArrayIndexedPath(
  path: string,
  arrayPath: string,
  transformIndex: (index: number) => number | undefined
): string | undefined {
  if (path === arrayPath) {
    return path;
  }

  const prefix = `${arrayPath}.`;

  if (!path.startsWith(prefix)) {
    return path;
  }

  const remainder = path.slice(prefix.length);
  const [indexSegment, ...rest] = remainder.split('.');

  if (!isNumericPathSegment(indexSegment)) {
    return path;
  }

  const nextIndex = transformIndex(Number(indexSegment));

  if (nextIndex === undefined) {
    return undefined;
  }

  return [arrayPath, String(nextIndex), ...rest].filter(Boolean).join('.');
}

function remapBooleanState(
  input: Record<string, boolean>,
  arrayPath: string,
  transformIndex: (index: number) => number | undefined
): Record<string, boolean> {
  const next: Record<string, boolean> = {};

  for (const [path, value] of Object.entries(input)) {
    const nextPath = transformArrayIndexedPath(path, arrayPath, transformIndex);

    if (nextPath) {
      next[nextPath] = value;
    }
  }

  return next;
}

function remapErrorState(
  input: Record<string, ValidationError[]>,
  arrayPath: string,
  transformIndex: (index: number) => number | undefined
): Record<string, ValidationError[]> {
  const next: Record<string, ValidationError[]> = {};

  for (const [path, errors] of Object.entries(input)) {
    const nextPath = transformArrayIndexedPath(path, arrayPath, transformIndex);

    if (!nextPath) {
      continue;
    }

    const nextErrors: ValidationError[] = [];

    for (const error of errors) {
        const mappedPath = transformArrayIndexedPath(error.path, arrayPath, transformIndex);

        if (!mappedPath) {
          continue;
        }

        const mappedOwnerPath = error.ownerPath
          ? transformArrayIndexedPath(error.ownerPath, arrayPath, transformIndex) ?? error.ownerPath
          : error.ownerPath;
        const mappedRelatedPaths = error.relatedPaths?.map((relatedPath) => {
          const fullRelatedPath = relatedPath.includes('.') || !path.startsWith(arrayPath) ? relatedPath : `${arrayPath}.${relatedPath}`;
          const mappedRelatedPath = transformArrayIndexedPath(fullRelatedPath, arrayPath, transformIndex);

          if (!mappedRelatedPath) {
            return relatedPath;
          }

          return relatedPath.includes('.') || !mappedRelatedPath.startsWith(`${arrayPath}.`)
            ? mappedRelatedPath
            : mappedRelatedPath.slice(arrayPath.length + 1);
        });

        nextErrors.push({
          ...error,
          path: mappedPath,
          ownerPath: mappedOwnerPath,
          relatedPaths: mappedRelatedPaths
        });
      }

    if (nextErrors.length > 0) {
      next[nextPath] = nextErrors;
    }
  }

  return next;
}

function clampInsertIndex(index: number, length: number): number {
  if (index < 0) {
    return 0;
  }

  if (index > length) {
    return length;
  }

  return index;
}

function clampArrayIndex(index: number, length: number): number {
  if (length === 0) {
    return 0;
  }

  if (index < 0) {
    return 0;
  }

  if (index >= length) {
    return length - 1;
  }

  return index;
}

function insertArrayValue(input: unknown[], index: number, value: unknown): unknown[] {
  const next = input.slice();
  next.splice(clampInsertIndex(index, next.length), 0, value);
  return next;
}

function removeArrayValue(input: unknown[], index: number): unknown[] {
  if (input.length === 0) {
    return input.slice();
  }

  const next = input.slice();
  next.splice(clampArrayIndex(index, next.length), 1);
  return next;
}

function moveArrayValue(input: unknown[], from: number, to: number): unknown[] {
  if (input.length <= 1) {
    return input.slice();
  }

  const next = input.slice();
  const fromIndex = clampArrayIndex(from, next.length);
  const toIndex = clampArrayIndex(to, next.length);

  if (fromIndex === toIndex) {
    return next;
  }

  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function swapArrayValue(input: unknown[], a: number, b: number): unknown[] {
  if (input.length <= 1) {
    return input.slice();
  }

  const next = input.slice();
  const first = clampArrayIndex(a, next.length);
  const second = clampArrayIndex(b, next.length);

  if (first === second) {
    return next;
  }

  [next[first], next[second]] = [next[second], next[first]];
  return next;
}

function validateRule(
  compiledRule: CompiledValidationRule,
  value: unknown,
  field: CompiledFormValidationField,
  scope: ScopeRef
): ValidationError | undefined {
  const rule = compiledRule.rule;

  switch (rule.kind) {
    case 'required':
      return isEmptyValue(value)
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field))
        : undefined;
    case 'minLength':
      return typeof value === 'string' && value.length < rule.value
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field))
        : undefined;
    case 'maxLength':
      return typeof value === 'string' && value.length > rule.value
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field))
        : undefined;
    case 'minItems':
      return Array.isArray(value) && value.length < rule.value
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field))
        : undefined;
    case 'maxItems':
      return Array.isArray(value) && value.length > rule.value
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field))
        : undefined;
    case 'atLeastOneFilled':
      return !hasFilledArrayItem(value, rule.itemPath)
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field), {
            relatedPaths: rule.itemPath ? [rule.itemPath] : undefined
          })
        : undefined;
    case 'allOrNone':
      return violatesAllOrNone(value, rule.itemPaths)
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field), {
            relatedPaths: rule.itemPaths
          })
        : undefined;
    case 'uniqueBy':
      return violatesUniqueBy(value, rule.itemPath)
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field), {
            relatedPaths: [rule.itemPath]
          })
        : undefined;
    case 'atLeastOneOf':
      return lacksAtLeastOneOf(value, rule.paths)
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field), {
            relatedPaths: rule.paths
          })
        : undefined;
    case 'pattern':
      return typeof value === 'string' && value !== '' && !new RegExp(rule.value).test(value)
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field))
        : undefined;
    case 'email': {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return typeof value === 'string' && value !== '' && !emailPattern.test(value)
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field))
        : undefined;
    }
    case 'equalsField': {
      const peerValue = scope.get(rule.path);

      if (isEmptyValue(value) && isEmptyValue(peerValue)) {
        return undefined;
      }

      return !Object.is(value, peerValue)
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field), {
            relatedPaths: [rule.path]
          })
        : undefined;
    }
    case 'notEqualsField': {
      const peerValue = scope.get(rule.path);

      if (isEmptyValue(value) && isEmptyValue(peerValue)) {
        return undefined;
      }

      return Object.is(value, peerValue)
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field), {
            relatedPaths: [rule.path]
          })
        : undefined;
    }
    case 'requiredWhen': {
      const dependencyValue = scope.get(rule.path);
      const shouldRequire = Object.is(dependencyValue, rule.equals);

      return shouldRequire && isEmptyValue(value)
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field), {
            relatedPaths: [rule.path]
          })
        : undefined;
    }
    case 'requiredUnless': {
      const dependencyValue = scope.get(rule.path);
      const shouldRequire = !Object.is(dependencyValue, rule.equals);

      return shouldRequire && isEmptyValue(value)
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field), {
            relatedPaths: [rule.path]
          })
        : undefined;
    }
    case 'async':
      return undefined;
  }
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

function buildActionMonitorPayload(action: ActionSchema, ctx: ActionContext) {
  return {
    actionType: action.action,
    nodeId: ctx.node?.id,
    path: ctx.node?.path
  };
}

function applyRequestAdaptor(expressionCompiler: ExpressionCompiler, api: ApiObject, scope: ScopeRef, env: RendererEnv): ApiObject {
  if (!api.requestAdaptor) {
    return api;
  }

  const compiled = expressionCompiler.formulaCompiler.compileExpression<ApiObject>(normalizeAdaptorSource(api.requestAdaptor));
  const adapted = compiled.exec(
    {
      api,
      scope: createAdaptorScopeView(scope),
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
      scope: createAdaptorScopeView(scope)
    },
    env
  );
}

function collectValidationDependencyPaths(rule: ValidationRule): string[] {
  switch (rule.kind) {
    case 'equalsField':
    case 'notEqualsField':
    case 'requiredWhen':
    case 'requiredUnless':
      return [rule.path];
    default:
      return [];
  }
}

function compileValidationRules(path: string, rules: ValidationRule[]): CompiledValidationRule[] {
  return rules.map((rule, index) => ({
    id: `${path}#${index}:${rule.kind}`,
    rule,
    dependencyPaths: collectValidationDependencyPaths(rule)
  }));
}

function isCompiledValidationRule(rule: CompiledValidationRule | ValidationRule): rule is CompiledValidationRule {
  return 'rule' in rule;
}

function normalizeCompiledValidationRules(
  path: string,
  rules: Array<CompiledValidationRule | ValidationRule>
): CompiledValidationRule[] {
  return rules.map((rule, index) =>
    isCompiledValidationRule(rule)
      ? rule
      : {
          id: `${path}#${index}:${rule.kind}`,
          rule,
          dependencyPaths: collectValidationDependencyPaths(rule)
        }
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
    input.env.monitor?.onApiRequest?.({
      api,
      nodeId: undefined,
      path: undefined
    });

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

  async function executeValidationRule(
    compiledRule: CompiledValidationRule,
    rule: Extract<ValidationRule, { kind: 'async' }>,
    field: CompiledFormValidationField,
    scope: ScopeRef
  ): Promise<ValidationError | undefined> {
    try {
      const api = applyRequestAdaptor(expressionCompiler, evaluate<ApiObject>(rule.api, scope), scope, input.env);
      const response = await executeApiRequest(`validate:${field.path}`, api, scope);
      const adaptedData = applyResponseAdaptor(expressionCompiler, api, response.data, scope, input.env);

      if (response.ok && adaptedData && typeof adaptedData === 'object') {
        const candidate = adaptedData as { valid?: boolean; message?: string };

        if (candidate.valid === false) {
          return createValidationError(
            field,
            compiledRule,
            candidate.message ?? rule.message ?? `${field.label ?? field.path} failed async validation`
          );
        }

        if (candidate.valid === true) {
          return undefined;
        }
      }

      if (!response.ok) {
        return createValidationError(field, compiledRule, rule.message ?? `${field.label ?? field.path} failed async validation`);
      }

      return undefined;
    } catch (error) {
      if (isAbortError(error)) {
        return undefined;
      }

      throw error;
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

  function buildInitialFieldState(values: Record<string, any>, validation?: CompiledFormValidationModel) {
    const initialValues: Record<string, unknown> = {};
    const dirty: Record<string, boolean> = {};

    for (const path of validation?.order ?? []) {
      initialValues[path] = getIn(values, path);
      dirty[path] = false;
    }

    return {
      initialValues,
      dirty
    };
  }

  function createFormRuntime(inputValue: {
    id?: string;
    initialValues?: Record<string, any>;
    parentScope: ScopeRef;
    page?: PageRuntime;
    validation?: CompiledFormValidationModel;
  }): FormRuntime {
    const store = createFormStore(inputValue.initialValues ?? {});
    const formId = inputValue.id ?? `${inputValue.parentScope.id}-form`;
    const validationRuns = new Map<string, number>();
    const pendingValidationDebounces = new Map<string, { timer: ReturnType<typeof setTimeout>; resolve: (run: boolean) => void }>();
    const runtimeFieldRegistrations = new Map<string, RuntimeFieldRegistration>();
    const initialFieldState = buildInitialFieldState(inputValue.initialValues ?? {}, inputValue.validation);
    const defaultValidationTriggers = inputValue.validation?.behavior.triggers ?? ['blur'];

    async function revalidateDependents(path: string) {
      const dependentPaths = inputValue.validation?.dependents?.[path] ?? [];

      for (const dependentPath of dependentPaths) {
        if (dependentPath === path) {
          continue;
        }

        validationRuns.set(dependentPath, (validationRuns.get(dependentPath) ?? 0) + 1);
        cancelValidationDebounce(dependentPath);
        store.setValidating(dependentPath, false);

        const currentDependentValue = scope.get(dependentPath);
        const dependentBaseline = initialFieldState.initialValues[dependentPath];
        store.setDirty(dependentPath, !Object.is(dependentBaseline, currentDependentValue));

        if (
          store.getState().touched[dependentPath] ||
          store.getState().visited[dependentPath] ||
          store.getState().submitting
        ) {
          await thisForm.validateField(dependentPath);
        } else {
          thisForm.clearErrors(dependentPath);
        }
      }
    }

    function syncRegisteredFieldValue(path: string) {
      const registration = runtimeFieldRegistrations.get(path);

      if (!registration) {
        return undefined;
      }

      const nextValue = registration.syncValue ? registration.syncValue() : registration.getValue();
      const currentValue = scope.get(path);

      if (Object.is(currentValue, nextValue)) {
        return nextValue;
      }

      const baseline = initialFieldState.initialValues[path];
      store.setDirty(path, !Object.is(baseline, nextValue));
      store.setValue(path, nextValue);
      return nextValue;
    }

    function syncRegisteredChildPaths(registration: RuntimeFieldRegistration) {
      const rootValue = registration.syncValue ? registration.syncValue() : registration.getValue();
      let nextValues = store.getState().values;
      let changed = false;

      for (const childPath of registration.childPaths ?? []) {
        const relativePath = childPath.startsWith(`${registration.path}.`)
          ? childPath.slice(registration.path.length + 1)
          : childPath;
        const value = getIn(rootValue, relativePath);

        if (Object.is(getIn(nextValues, childPath), value)) {
          continue;
        }

        nextValues = setIn(nextValues, childPath, value);
        changed = true;
      }

      if (changed) {
        store.setValues(nextValues);
      }
    }

    function findRuntimeRegistration(path: string) {
      const direct = runtimeFieldRegistrations.get(path);

      if (direct) {
        return {
          registration: direct,
          childPath: undefined as string | undefined
        };
      }

      for (const registration of runtimeFieldRegistrations.values()) {
        if (registration.childPaths?.includes(path)) {
          return {
            registration,
            childPath: path
          };
        }
      }

      return {
        registration: undefined,
        childPath: undefined as string | undefined
      };
    }

    function cancelValidationDebounce(path: string) {
      const pending = pendingValidationDebounces.get(path);

      if (!pending) {
        return;
      }

      clearTimeout(pending.timer);
      pending.resolve(false);
      pendingValidationDebounces.delete(path);
    }

    function cancelAllValidationDebounces() {
      for (const path of Array.from(pendingValidationDebounces.keys())) {
        cancelValidationDebounce(path);
      }
    }

    function remapValidationRunState(arrayPath: string, transformIndex: (index: number) => number | undefined) {
      for (const path of Array.from(validationRuns.keys())) {
        const nextPath = transformArrayIndexedPath(path, arrayPath, transformIndex);

        if (!nextPath) {
          validationRuns.delete(path);
          continue;
        }

        if (nextPath !== path) {
          const value = validationRuns.get(path);
          validationRuns.delete(path);

          if (value !== undefined) {
            validationRuns.set(nextPath, value);
          }
        }
      }

      for (const path of Array.from(pendingValidationDebounces.keys())) {
        const nextPath = transformArrayIndexedPath(path, arrayPath, transformIndex);

        if (!nextPath) {
          cancelValidationDebounce(path);
          continue;
        }

        if (nextPath !== path) {
          const pending = pendingValidationDebounces.get(path);

          if (!pending) {
            continue;
          }

          pendingValidationDebounces.delete(path);
          pendingValidationDebounces.set(nextPath, pending);
        }
      }
    }

    function remapInitialFieldState(arrayPath: string, transformIndex: (index: number) => number | undefined) {
      const nextInitialValues: Record<string, unknown> = {};

      for (const [path, value] of Object.entries(initialFieldState.initialValues)) {
        const nextPath = transformArrayIndexedPath(path, arrayPath, transformIndex);

        if (nextPath) {
          nextInitialValues[nextPath] = value;
        }
      }

      initialFieldState.initialValues = nextInitialValues;
      initialFieldState.dirty = remapBooleanState(initialFieldState.dirty, arrayPath, transformIndex);
    }

    function remapArrayFieldState(arrayPath: string, transformIndex: (index: number) => number | undefined) {
      const state = store.getState();
      store.setErrors(remapErrorState(state.errors, arrayPath, transformIndex));
      store.setTouchedState(remapBooleanState(state.touched, arrayPath, transformIndex));
      store.setDirtyState(remapBooleanState(state.dirty, arrayPath, transformIndex));
      store.setVisitedState(remapBooleanState(state.visited, arrayPath, transformIndex));
      store.setValidatingState(remapBooleanState(state.validating, arrayPath, transformIndex));
      remapValidationRunState(arrayPath, transformIndex);
      remapInitialFieldState(arrayPath, transformIndex);
    }

    function replaceManagedArrayValue(arrayPath: string, nextValue: unknown[]) {
      validationRuns.set(arrayPath, (validationRuns.get(arrayPath) ?? 0) + 1);
      cancelValidationDebounce(arrayPath);
      store.setValidating(arrayPath, false);
      const baseline = initialFieldState.initialValues[arrayPath];
      store.setDirty(arrayPath, !Object.is(baseline, nextValue));
      store.setValue(arrayPath, nextValue);
      thisForm.clearErrors(arrayPath);
      void revalidateDependents(arrayPath);
    }

    function collectSubtreePaths(path: string) {
      const paths = new Set<string>();

      for (const candidate of inputValue.validation?.validationOrder ?? inputValue.validation?.order ?? []) {
        if (candidate === path || candidate.startsWith(`${path}.`)) {
          paths.add(candidate);
        }
      }

      for (const [registrationPath, registration] of runtimeFieldRegistrations) {
        if (registrationPath === path || registrationPath.startsWith(`${path}.`) || path.startsWith(`${registrationPath}.`)) {
          paths.add(registrationPath);
        }

        for (const childPath of registration.childPaths ?? []) {
          if (childPath === path || childPath.startsWith(`${path}.`) || path.startsWith(`${childPath}.`)) {
            paths.add(childPath);
          }
        }
      }

      return Array.from(paths);
    }

    function collectSubtreeNodePaths(path: string) {
      const nodes = inputValue.validation?.nodes;

      if (nodes == null || Object.keys(nodes).length === 0) {
        return [] as string[];
      }

      const nodeMap = nodes;

      const traversalOrder =
        inputValue.validation?.validationOrder ?? buildValidationNodeTraversalOrder(nodeMap, inputValue.validation?.rootPath);
      const seen = new Set<string>();
      const ordered: string[] = [];

      function enqueue(candidatePath: string) {
        const node = nodeMap[candidatePath];

        if (!node || node.kind === 'form' || seen.has(candidatePath)) {
          return;
        }

        seen.add(candidatePath);
        ordered.push(candidatePath);

        for (const childPath of node.children) {
          enqueue(childPath);
        }
      }

      if (nodeMap[path]) {
        enqueue(path);
      } else {
        for (const candidatePath of traversalOrder) {
          if (candidatePath === path || candidatePath.startsWith(`${path}.`)) {
            enqueue(candidatePath);
          }
        }
      }

      return ordered;
    }

    function collectSubtreeValidationTargets(path: string) {
      const ordered = collectSubtreeNodePaths(path);
      const targets = new Set<string>(ordered);

      for (const candidatePath of collectSubtreePaths(path)) {
        targets.add(candidatePath);
      }

      return Array.from(targets);
    }

    async function validateRuntimeRegistrationRoot(path: string, registration: RuntimeFieldRegistration): Promise<ValidationResult> {
      const runtimeErrors = normalizeRuntimeValidationErrors(await registration.validate?.(), registration, path) ?? [];
      const nextErrors = { ...store.getState().errors };

      if (runtimeErrors.length > 0) {
        nextErrors[path] = runtimeErrors;
      } else {
        delete nextErrors[path];
      }

      store.setErrors(nextErrors);

      return {
        ok: runtimeErrors.length === 0,
        errors: runtimeErrors
      } as ValidationResult;
    }

    async function validateRuntimeRegistrationChild(
      path: string,
      registration: RuntimeFieldRegistration,
      childPath: string
    ): Promise<ValidationResult> {
      const runtimeErrors = normalizeRuntimeValidationErrors(
        await registration.validateChild?.(childPath),
        registration,
        path,
        childPath
      ) ?? [];
      const nextErrors = { ...store.getState().errors };

      if (runtimeErrors.length > 0) {
        nextErrors[path] = runtimeErrors;
      } else {
        delete nextErrors[path];
      }

      store.setErrors(nextErrors);

      return {
        ok: runtimeErrors.length === 0,
        errors: runtimeErrors
      } as ValidationResult;
    }

    async function validateCompiledField(path: string, field: CompiledFormValidationField): Promise<ValidationResult> {
      const runtimeRegistration = runtimeFieldRegistrations.get(path);
      const syncedRuntimeValue = syncRegisteredFieldValue(path);
      const runId = (validationRuns.get(path) ?? 0) + 1;
      validationRuns.set(path, runId);
      const value = syncedRuntimeValue ?? scope.get(path);
      const errors: ValidationError[] = [];
      const hasAsyncRules = field.rules.some((compiledRule) => compiledRule.rule.kind === 'async');

      if (hasAsyncRules) {
        store.setValidating(path, true);
      }

      try {
        for (const compiledRule of field.rules) {
          const rule = compiledRule.rule;

          if (rule.kind === 'async') {
            const shouldRun = await waitForValidationDebounce(path, rule.debounce, runId);

            if (!shouldRun) {
              return { ok: true, errors: [] } as ValidationResult;
            }

            const asyncError = await executeValidationRule(compiledRule, rule, field, scope);

            if (asyncError) {
              errors.push(asyncError);
            }

            continue;
          }

          const syncError = validateRule(compiledRule, value, field, scope);

          if (syncError) {
            errors.push(syncError);
          }
        }

        if (runtimeRegistration?.validate) {
          const runtimeErrors = normalizeRuntimeValidationErrors(await runtimeRegistration.validate(), runtimeRegistration, path);

          if (runtimeErrors.length > 0) {
            errors.push(...runtimeErrors);
          }
        }

        if (validationRuns.get(path) !== runId) {
          return { ok: true, errors: [] } as ValidationResult;
        }

        const nextErrors = { ...store.getState().errors };

        if (errors.length > 0) {
          nextErrors[path] = errors;
        } else {
          delete nextErrors[path];
        }

        store.setErrors(nextErrors);

        return {
          ok: errors.length === 0,
          errors
        } as ValidationResult;
      } finally {
        if (hasAsyncRules && validationRuns.get(path) === runId) {
          store.setValidating(path, false);
        }
      }
    }

    async function validatePath(path: string): Promise<ValidationResult> {
      const field = inputValue.validation?.fields[path]
        ? {
            ...inputValue.validation.fields[path],
            rules: normalizeCompiledValidationRules(path, inputValue.validation.fields[path].rules)
          }
        : undefined;
      const runtimeTarget = findRuntimeRegistration(path);
      const runtimeRegistration = runtimeTarget.registration;

      if (!field && !runtimeRegistration) {
        return { ok: true, errors: [] } as ValidationResult;
      }

      if (!field && runtimeTarget.childPath && runtimeRegistration?.validateChild) {
        return validateRuntimeRegistrationChild(path, runtimeRegistration, runtimeTarget.childPath);
      }

      if (!field && runtimeRegistration?.validate) {
        return validateRuntimeRegistrationRoot(path, runtimeRegistration);
      }

      if (!field) {
        return { ok: true, errors: [] } as ValidationResult;
      }

      return validateCompiledField(path, field);
    }

    async function validateSubtreeByNode(path: string): Promise<FormValidationResult | undefined> {
      if (!inputValue.validation?.nodes) {
        return undefined;
      }

      const nodeTargets = collectSubtreeNodePaths(path);

      if (nodeTargets.length === 0) {
        return undefined;
      }

      const remainingRuntimeTargets = new Set(collectSubtreePaths(path));
      const errors: ValidationError[] = [];
      const fieldErrors: Record<string, ValidationError[]> = {};

      for (const targetPath of nodeTargets) {
        remainingRuntimeTargets.delete(targetPath);
        const result = await validatePath(targetPath);

        if (!result.ok) {
          fieldErrors[targetPath] = result.errors;
          errors.push(...result.errors);
        }
      }

      for (const targetPath of remainingRuntimeTargets) {
        const result = await validatePath(targetPath);

        if (!result.ok) {
          fieldErrors[targetPath] = result.errors;
          errors.push(...result.errors);
        }
      }

      return {
        ok: errors.length === 0,
        errors,
        fieldErrors
      } as FormValidationResult;
    }

    function waitForValidationDebounce(path: string, debounce: number | undefined, runId: number): Promise<boolean> {
      if (!debounce || debounce <= 0) {
        return Promise.resolve(validationRuns.get(path) === runId);
      }

      cancelValidationDebounce(path);

      return new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => {
          pendingValidationDebounces.delete(path);
          resolve(validationRuns.get(path) === runId);
        }, debounce);

        pendingValidationDebounces.set(path, { timer, resolve });
      });
    }

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

    const thisForm: FormRuntime = {
      id: formId,
      store,
      scope,
      validation: inputValue.validation,
      registerField(registration) {
        runtimeFieldRegistrations.set(registration.path, registration);

        return () => {
          if (runtimeFieldRegistrations.get(registration.path) === registration) {
            registration.onRemove?.();
            runtimeFieldRegistrations.delete(registration.path);
          }
        };
      },
      async validateField(path) {
        return validatePath(path);
      },
      async validateForm() {
        if (!inputValue.validation && runtimeFieldRegistrations.size === 0) {
          return {
            ok: true,
            errors: [],
            fieldErrors: {}
          } as FormValidationResult;
        }

        const fieldErrors: Record<string, ValidationError[]> = {};
        const errors: ValidationError[] = [];

        for (const path of inputValue.validation?.order ?? []) {
          const result = await this.validateField(path);

          if (!result.ok) {
            fieldErrors[path] = result.errors;
            errors.push(...result.errors);
          }
        }

        for (const [path, registration] of runtimeFieldRegistrations) {
          if (inputValue.validation?.fields[path]) {
            if (registration.validateChild && registration.childPaths?.length) {
              for (const childPath of registration.childPaths) {
                const result = await this.validateField(childPath);

                if (!result.ok) {
                  fieldErrors[childPath] = result.errors;
                  errors.push(...result.errors);
                }
              }
            }

            continue;
          }

          if (!registration.validate) {
            if (registration.validateChild && registration.childPaths?.length) {
              for (const childPath of registration.childPaths) {
                const result = await this.validateField(childPath);

                if (!result.ok) {
                  fieldErrors[childPath] = result.errors;
                  errors.push(...result.errors);
                }
              }
            }

            continue;
          }

          const result = await this.validateField(path);

          if (!result.ok) {
            fieldErrors[path] = result.errors;
            errors.push(...result.errors);
          }

          if (registration.validateChild && registration.childPaths?.length) {
            for (const childPath of registration.childPaths) {
              const childResult = await this.validateField(childPath);

              if (!childResult.ok) {
                fieldErrors[childPath] = childResult.errors;
                errors.push(...childResult.errors);
              }
            }
          }
        }

        store.setErrors(fieldErrors);

        return {
          ok: errors.length === 0,
          errors,
          fieldErrors
        } as FormValidationResult;
      },
      async validateSubtree(path) {
        if (!inputValue.validation) {
          return {
            ok: true,
            errors: [],
            fieldErrors: {}
          } as FormValidationResult;
        }

        const nodeResult = await validateSubtreeByNode(path);

        if (nodeResult) {
          return nodeResult;
        }

        const targetPaths = collectSubtreeValidationTargets(path);
        const errors: ValidationError[] = [];
        const fieldErrors: Record<string, ValidationError[]> = {};

        for (const targetPath of targetPaths) {
          const result = await validatePath(targetPath);

          if (!result.ok) {
            fieldErrors[targetPath] = result.errors;
            errors.push(...result.errors);
          }
        }

        return {
          ok: errors.length === 0,
          errors,
          fieldErrors
        } as FormValidationResult;
      },
      getError(path) {
        return store.getState().errors[path];
      },
      isValidating(path) {
        return store.getState().validating[path] === true;
      },
      isTouched(path) {
        return store.getState().touched[path] === true;
      },
      isDirty(path) {
        return store.getState().dirty[path] === true;
      },
      isVisited(path) {
        return store.getState().visited[path] === true;
      },
      touchField(path) {
        store.setTouched(path, true);
      },
      visitField(path) {
        store.setVisited(path, true);
      },
      clearErrors(path) {
        if (!path) {
          store.setErrors({});
          return;
        }

        const nextErrors = { ...store.getState().errors };
        delete nextErrors[path];
        store.setErrors(nextErrors);
      },
      async submit(api?: ApiObject) {
        store.setSubmitting(true);

        for (const path of inputValue.validation?.order ?? []) {
          const triggers = inputValue.validation?.fields[path]?.behavior?.triggers ?? defaultValidationTriggers;

          if (triggers.includes('submit')) {
            store.setTouched(path, true);
          }
        }

        for (const path of runtimeFieldRegistrations.keys()) {
          store.setTouched(path, true);
        }

        for (const registration of runtimeFieldRegistrations.values()) {
          for (const childPath of registration.childPaths ?? []) {
            store.setTouched(childPath, true);
          }
        }

        const validation = await this.validateForm();

        if (!validation.ok) {
          store.setSubmitting(false);
          return {
            ok: false,
            error: validation.errors,
            data: validation.fieldErrors
          };
        }

        if (!api) {
          store.setSubmitting(false);
          return { ok: true, data: store.getState().values };
        }

        const adaptedApi = applyRequestAdaptor(expressionCompiler, api, scope, input.env);
        try {
          const response = await executeApiRequest('submitForm', adaptedApi, scope);
          const adaptedData = applyResponseAdaptor(expressionCompiler, adaptedApi, response.data, scope, input.env);

          return {
            ok: response.ok,
            data: adaptedData,
            error: response.ok ? undefined : adaptedData
          };
        } finally {
          store.setSubmitting(false);
        };
      },
      reset(values) {
        const nextValues = toRecord(values);
        const nextInitialFieldState = buildInitialFieldState(nextValues, inputValue.validation);

        initialFieldState.initialValues = nextInitialFieldState.initialValues;
        cancelAllValidationDebounces();
        store.setValues(nextValues);
        store.setErrors({});
        for (const path of Object.keys(store.getState().validating)) {
          store.setValidating(path, false);
        }
        for (const path of Object.keys(store.getState().touched)) {
          store.setTouched(path, false);
        }
        for (const path of Object.keys(store.getState().dirty)) {
          store.setDirty(path, false);
        }
        for (const path of Object.keys(store.getState().visited)) {
          store.setVisited(path, false);
        }
      },
      setValue(name, value) {
        const runtimeTarget = findRuntimeRegistration(name);

        if (runtimeTarget.childPath && runtimeTarget.registration) {
          validationRuns.set(name, (validationRuns.get(name) ?? 0) + 1);
          cancelValidationDebounce(name);
          store.setValidating(name, false);
          store.setDirty(name, true);
          store.setValue(name, value);
          this.clearErrors(name);
          void revalidateDependents(name);
          return;
        }

        validationRuns.set(name, (validationRuns.get(name) ?? 0) + 1);
        cancelValidationDebounce(name);
        store.setValidating(name, false);
        const baseline = initialFieldState.initialValues[name];
        store.setDirty(name, !Object.is(baseline, value));
        store.setValue(name, value);
        this.clearErrors(name);
        void revalidateDependents(name);
      },
      appendValue(path, value) {
        const currentValue = scope.get(path);
        const nextValue = insertArrayValue(Array.isArray(currentValue) ? currentValue : [], Number.MAX_SAFE_INTEGER, value);
        remapArrayFieldState(path, (index) => index);
        replaceManagedArrayValue(path, nextValue);
      },
      prependValue(path, value) {
        const currentValue = scope.get(path);
        const nextValue = insertArrayValue(Array.isArray(currentValue) ? currentValue : [], 0, value);
        remapArrayFieldState(path, (index) => index + 1);
        replaceManagedArrayValue(path, nextValue);
      },
      insertValue(path, index, value) {
        const currentValue = scope.get(path);
        const safeArray = Array.isArray(currentValue) ? currentValue : [];
        const insertIndex = clampInsertIndex(index, safeArray.length);
        const nextValue = insertArrayValue(safeArray, insertIndex, value);
        remapArrayFieldState(path, (candidate) => (candidate >= insertIndex ? candidate + 1 : candidate));
        replaceManagedArrayValue(path, nextValue);
      },
      removeValue(path, index) {
        const currentValue = scope.get(path);

        if (!Array.isArray(currentValue) || currentValue.length === 0) {
          return;
        }

        const removeIndex = clampArrayIndex(index, currentValue.length);
        const nextValue = removeArrayValue(currentValue, removeIndex);
        remapArrayFieldState(path, (candidate) => {
          if (candidate === removeIndex) {
            return undefined;
          }

          return candidate > removeIndex ? candidate - 1 : candidate;
        });
        replaceManagedArrayValue(path, nextValue);
      },
      moveValue(path, from, to) {
        const currentValue = scope.get(path);

        if (!Array.isArray(currentValue) || currentValue.length <= 1) {
          return;
        }

        const fromIndex = clampArrayIndex(from, currentValue.length);
        const toIndex = clampArrayIndex(to, currentValue.length);

        if (fromIndex === toIndex) {
          return;
        }

        const nextValue = moveArrayValue(currentValue, fromIndex, toIndex);
        remapArrayFieldState(path, (candidate) => {
          if (candidate === fromIndex) {
            return toIndex;
          }

          if (fromIndex < toIndex && candidate > fromIndex && candidate <= toIndex) {
            return candidate - 1;
          }

          if (fromIndex > toIndex && candidate >= toIndex && candidate < fromIndex) {
            return candidate + 1;
          }

          return candidate;
        });
        replaceManagedArrayValue(path, nextValue);
      },
      swapValue(path, a, b) {
        const currentValue = scope.get(path);

        if (!Array.isArray(currentValue) || currentValue.length <= 1) {
          return;
        }

        const first = clampArrayIndex(a, currentValue.length);
        const second = clampArrayIndex(b, currentValue.length);

        if (first === second) {
          return;
        }

        const nextValue = swapArrayValue(currentValue, first, second);
        remapArrayFieldState(path, (candidate) => {
          if (candidate === first) {
            return second;
          }

          if (candidate === second) {
            return first;
          }

          return candidate;
        });
        replaceManagedArrayValue(path, nextValue);
      },
      replaceValue(path, value) {
        const nextValue = Array.isArray(value) ? value : [];
        remapArrayFieldState(path, (candidate) => (candidate < nextValue.length ? candidate : undefined));
        replaceManagedArrayValue(path, nextValue);
      }
    };

    return thisForm;
  }

  async function runSingleAction(action: ActionSchema, ctx: ActionContext): Promise<ActionResult> {
    const startedAt = Date.now();
    const actionPayload = buildActionMonitorPayload(action, ctx);
    input.env.monitor?.onActionStart?.(actionPayload);

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
          const result = { ok: true, data: evaluated };
          input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
          return result;
        }
        case 'ajax': {
          if (!processedAction.api) {
            const result = { ok: false, error: new Error('Missing api in ajax action') };
            input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
            return result;
          }

          const api = applyRequestAdaptor(expressionCompiler, evaluate<ApiObject>(processedAction.api, ctx.scope), ctx.scope, input.env);
          input.env.monitor?.onApiRequest?.({
            api,
            nodeId: ctx.node?.id,
            path: ctx.node?.path
          });
          const response = await executeApiRequest('ajax', api, ctx.scope, ctx.form);
          const adaptedData = applyResponseAdaptor(expressionCompiler, api, response.data, ctx.scope, input.env);

          if (processedAction.dataPath && response.ok && ctx.page) {
            const nextData = applyResponseDataPath(ctx.page.store.getState().data, processedAction.dataPath, adaptedData);
            ctx.page.store.setData(nextData);
          }

          const result = { ok: response.ok, data: adaptedData, error: response.ok ? undefined : adaptedData };
          input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
          return result;
        }
        case 'dialog': {
          if (!ctx.page || !processedAction.dialog) {
            const result = { ok: false, error: new Error('Dialog action requires page runtime and dialog config') };
            input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
            return result;
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
          const result = { ok: true, data: { dialogId } };
          input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
          return result;
        }
        case 'closeDialog': {
          if (ctx.page) {
            if (processedAction.dialogId) {
              ctx.page.closeDialog(String(evaluate(processedAction.dialogId, ctx.scope)));
            } else {
              ctx.page.closeDialog(ctx.dialogId);
            }
          }
          const result = { ok: true };
          input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
          return result;
        }
        case 'refreshTable': {
          ctx.page?.refresh();
          const result = { ok: true, data: ctx.page?.store.getState().refreshTick };
          input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
          return result;
        }
        case 'submitForm': {
          if (!ctx.form) {
            const result = { ok: false, error: new Error('submitForm requires form runtime') };
            input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
            return result;
          }

          const api = processedAction.api ? evaluate<ApiObject>(processedAction.api, ctx.scope) : undefined;
          if (api) {
            input.env.monitor?.onApiRequest?.({
              api,
              nodeId: ctx.node?.id,
              path: ctx.node?.path
            });
          }

          const result = await ctx.form.submit(api);
          input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
          return result;
        }
        default:
          {
            const result = { ok: false, error: new Error(`Unsupported action: ${processedAction.action}`) };
            input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
            return result;
          }
      }
    } catch (error) {
      if (isAbortError(error)) {
        const result = createCancelledResult(error);
        input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
        return result;
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
      const result = {
        ok: false,
        error
      };
      input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
      return result;
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
      const cancelledResult = createCancelledResult();
      input.env.monitor?.onActionEnd?.({
        ...buildActionMonitorPayload(action, ctx),
        durationMs: 0,
        result: cancelledResult
      });
      previous.resolve(cancelledResult);
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
      visible: Boolean(evaluateCompiledValue(expressionCompiler, node.meta.visible, scope, input.env, state?.meta.visible) ?? true),
      hidden: Boolean(evaluateCompiledValue(expressionCompiler, node.meta.hidden, scope, input.env, state?.meta.hidden) ?? false),
      disabled: Boolean(evaluateCompiledValue(expressionCompiler, node.meta.disabled, scope, input.env, state?.meta.disabled) ?? false),
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
    if (node.props.kind === 'static') {
      return {
        value: node.props.value,
        changed: false,
        reusedReference: true
      };
    }

    const execution = expressionCompiler.evaluateWithState(node.props, scope, input.env, state?.props ?? node.props.createState());

    if (state) {
      state.resolvedProps = execution.value;
    }

    return execution;
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
