import type { ComponentType, ReactElement, ReactNode } from 'react';
export type Primitive = string | number | boolean | bigint | symbol | null | undefined;
export type SchemaValue = Primitive | SchemaObject | ReadonlyArray<SchemaValue> | SchemaValue[];
export interface SchemaObject {
    [key: string]: SchemaValue;
}
export type SchemaPath = string;
export type ValidationTrigger = 'change' | 'blur' | 'submit';
export type ValidationVisibilityTrigger = 'touched' | 'dirty' | 'visited' | 'submit';
export type ScopePolicy = 'inherit' | 'isolate' | 'page' | 'form' | 'dialog' | 'row';
export type SchemaFieldKind = 'meta' | 'prop' | 'region' | 'value-or-region' | 'event' | 'ignored';
export interface BaseSchema extends SchemaObject {
    type: string;
    id?: string;
    name?: string;
    label?: string;
    title?: string;
    className?: string;
    classAliases?: Record<string, string>;
    visible?: boolean | string;
    hidden?: boolean | string;
    disabled?: boolean | string;
    testid?: string;
    validateOn?: ValidationTrigger | ValidationTrigger[];
    showErrorOn?: ValidationVisibilityTrigger | ValidationVisibilityTrigger[];
    'xui:imports'?: XuiImportSpec[];
}
export type SchemaInput = BaseSchema | BaseSchema[];
export interface SchemaFieldRule {
    key: string;
    kind: SchemaFieldKind;
    regionKey?: string;
}
export interface ApiObject extends SchemaObject {
    url: string;
    method?: string;
    data?: SchemaValue;
    params?: SchemaValue;
    headers?: Record<string, string>;
    includeScope?: '*' | string[];
    responseAdaptor?: string;
    requestAdaptor?: string;
    cacheTTL?: number;
    cacheKey?: string;
}
export interface DataSourceSchema extends BaseSchema {
    type: 'data-source';
    api: ApiObject;
    dataPath?: string;
    interval?: number;
    stopWhen?: string;
    silent?: boolean;
    initialData?: SchemaValue;
    body?: SchemaInput;
}
export interface DynamicRendererSchema extends BaseSchema {
    type: 'dynamic-renderer';
    schemaApi: ApiObject;
    body?: SchemaInput;
}
export interface ApiRequestContext {
    scope: ScopeRef;
    env: RendererEnv;
    signal?: AbortSignal;
}
export interface ApiResponse<T = unknown> {
    ok: boolean;
    status: number;
    data: T;
    headers?: Record<string, string>;
    raw?: unknown;
}
export type ApiFetcher = <T = unknown>(api: ApiObject, ctx: ApiRequestContext) => Promise<ApiResponse<T>>;
export interface RendererMonitor {
    onRenderStart?(payload: RenderMonitorPayload): void;
    onRenderEnd?(payload: RenderMonitorPayload & {
        durationMs: number;
    }): void;
    onActionStart?(payload: ActionMonitorPayload): void;
    onActionEnd?(payload: ActionMonitorPayload & {
        durationMs: number;
        result?: ActionResult;
    }): void;
    onError?(payload: ErrorMonitorPayload): void;
    onApiRequest?(payload: ApiMonitorPayload): void;
}
export interface RenderMonitorPayload {
    nodeId: string;
    path: SchemaPath;
    type: string;
}
export interface ActionMonitorPayload {
    actionType: string;
    nodeId?: string;
    path?: SchemaPath;
    dispatchMode?: 'built-in' | 'component' | 'namespace';
    namespace?: string;
    method?: string;
    sourceScopeId?: string;
    providerKind?: 'host' | 'import';
    componentId?: string;
    componentName?: string;
    componentType?: string;
}
export interface ErrorMonitorPayload {
    phase: 'compile' | 'render' | 'action' | 'expression' | 'api';
    error: unknown;
    nodeId?: string;
    path?: SchemaPath;
}
export interface ApiMonitorPayload {
    api: ApiObject;
    nodeId?: string;
    path?: SchemaPath;
}
export interface RendererEnv {
    fetcher: ApiFetcher;
    notify: (level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
    navigate?: (to: string, options?: unknown) => void;
    confirm?: (message: string, options?: unknown) => Promise<boolean>;
    functions?: Record<string, (...args: any[]) => any>;
    filters?: Record<string, (input: any, ...args: any[]) => any>;
    importLoader?: ImportedLibraryLoader;
    monitor?: RendererMonitor;
}
export interface ScopeStore<T = Record<string, any>> {
    getSnapshot(): T;
    setSnapshot(next: T): void;
    subscribe(listener: () => void): () => void;
}
export interface EvalContext {
    resolve(path: string): unknown;
    has(path: string): boolean;
    materialize(): Record<string, any>;
}
export interface ScopeRef {
    id: string;
    path: string;
    parent?: ScopeRef;
    store?: ScopeStore;
    readonly value: Record<string, any>;
    get(path: string): unknown;
    has(path: string): boolean;
    readOwn(): Record<string, any>;
    read(): Record<string, any>;
    update(path: string, value: unknown): void;
}
export interface CreateScopeOptions {
    pathSuffix?: string;
    isolate?: boolean;
    scopeKey?: string;
    source?: 'root' | 'row' | 'dialog' | 'form' | 'fragment' | 'custom';
}
export interface ComponentTarget {
    _targetCid?: number;
    _targetTemplateId?: string;
    componentInstanceKey?: string;
    componentId?: string;
    componentName?: string;
}
export interface ComponentCapabilities {
    store?: unknown;
    invoke(method: string, payload: Record<string, unknown> | undefined, ctx: ActionContext): Promise<ActionResult> | ActionResult;
    hasMethod?(method: string): boolean;
    listMethods?(): readonly string[];
}
export interface ComponentHandle {
    _cid?: number;
    _templateId?: string;
    _instanceKey?: string;
    _mounted?: boolean;
    id?: string;
    name?: string;
    type: string;
    capabilities: ComponentCapabilities;
}
export interface ComponentHandleRegistry {
    id: string;
    parent?: ComponentHandleRegistry;
    register(handle: ComponentHandle, options?: {
        cid?: number;
        templateId?: string;
        instanceKey?: string;
        dynamicLoaded?: boolean;
    }): () => void;
    unregister(handle: ComponentHandle): void;
    cleanupDynamic(templateId: string): void;
    resolve(target: ComponentTarget): ComponentHandle | undefined;
}
export interface ActionNamespaceProvider {
    kind?: 'host' | 'import';
    invoke(method: string, payload: Record<string, unknown> | undefined, ctx: ActionContext): Promise<ActionResult> | ActionResult;
    dispose?(): void;
    listMethods?(): readonly string[];
}
export interface ResolvedActionHandler {
    namespace: string;
    method: string;
    provider: ActionNamespaceProvider;
    sourceScopeId: string;
}
export interface ActionScope {
    id: string;
    parent?: ActionScope;
    resolve(actionName: string): ResolvedActionHandler | undefined;
    registerNamespace(namespace: string, provider: ActionNamespaceProvider): () => void;
    unregisterNamespace(namespace: string): void;
    listNamespaces(): readonly string[];
}
export interface XuiImportSpec extends SchemaObject {
    from: string;
    as: string;
    options?: Record<string, SchemaValue>;
}
export interface ImportedLibraryModule {
    createNamespace(context: ImportedNamespaceContext): Promise<ActionNamespaceProvider> | ActionNamespaceProvider;
}
export interface ImportedLibraryLoader {
    load(spec: XuiImportSpec): Promise<ImportedLibraryModule>;
}
export interface ImportedNamespaceContext {
    runtime: RendererRuntime;
    env: RendererEnv;
    actionScope: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
    scope: ScopeRef;
    spec: XuiImportSpec;
    node?: CompiledSchemaNode;
}
export interface CompiledExpression<T = unknown> {
    kind: 'expression';
    source: string;
    exec(context: EvalContext | object, env: RendererEnv): T;
}
export interface CompiledTemplate<T = unknown> {
    kind: 'template';
    source: string;
    exec(context: EvalContext | object, env: RendererEnv): T;
}
export interface FormulaCompiler {
    hasExpression(input: string): boolean;
    compileExpression<T = unknown>(source: string): CompiledExpression<T>;
    compileTemplate<T = unknown>(source: string): CompiledTemplate<T>;
}
export interface StaticValueNode<T = unknown> {
    kind: 'static-node';
    value: T;
}
export interface ExpressionValueNode<T = unknown> {
    kind: 'expression-node';
    source: string;
    compiled: CompiledExpression<T>;
}
export interface TemplateValueNode<T = unknown> {
    kind: 'template-node';
    source: string;
    compiled: CompiledTemplate<T>;
}
export interface ArrayValueNode {
    kind: 'array-node';
    items: ReadonlyArray<CompiledValueNode<unknown>>;
}
export interface ObjectValueNode {
    kind: 'object-node';
    keys: readonly string[];
    entries: Readonly<Record<string, CompiledValueNode<unknown>>>;
}
export type CompiledValueNode<T = unknown> = StaticValueNode<T> | ExpressionValueNode<T> | TemplateValueNode<T> | ArrayValueNode | ObjectValueNode;
export type DynamicValueNode<T = unknown> = ExpressionValueNode<T> | TemplateValueNode<T> | ArrayValueNode | ObjectValueNode;
export interface LeafValueState<T = unknown> {
    kind: 'leaf-state';
    initialized: boolean;
    lastValue?: T;
}
export interface ArrayValueState<T = unknown[]> {
    kind: 'array-state';
    initialized: boolean;
    lastValue?: T;
    items: RuntimeValueStateNode[];
}
export interface ObjectValueState<T = Record<string, unknown>> {
    kind: 'object-state';
    initialized: boolean;
    lastValue?: T;
    entries: Record<string, RuntimeValueStateNode>;
}
export type RuntimeValueStateNode<T = unknown> = LeafValueState<T> | ArrayValueState | ObjectValueState;
export interface RuntimeValueState<T = unknown> {
    root: RuntimeValueStateNode<T>;
}
export interface ValueEvaluationResult<T = unknown> {
    value: T;
    changed: boolean;
    reusedReference: boolean;
}
export interface StaticRuntimeValue<T = unknown> {
    kind: 'static';
    isStatic: true;
    node: StaticValueNode<T>;
    value: T;
}
export interface DynamicRuntimeValue<T = unknown> {
    kind: 'dynamic';
    isStatic: false;
    node: DynamicValueNode<T>;
    createState(): RuntimeValueState<T>;
    exec(context: EvalContext, env: RendererEnv, state?: RuntimeValueState<T>): ValueEvaluationResult<T>;
}
export type CompiledRuntimeValue<T = unknown> = StaticRuntimeValue<T> | DynamicRuntimeValue<T>;
export interface ExpressionCompiler {
    formulaCompiler: FormulaCompiler;
    compileNode<T = unknown>(input: T): CompiledValueNode<T>;
    compileValue<T = unknown>(input: T): CompiledRuntimeValue<T>;
    createState<T = unknown>(input: DynamicRuntimeValue<T>): RuntimeValueState<T>;
    evaluateValue<T = unknown>(input: CompiledRuntimeValue<T>, scope: ScopeRef, env: RendererEnv, state?: RuntimeValueState<T>): T;
    evaluateWithState<T = unknown>(input: DynamicRuntimeValue<T>, scope: ScopeRef, env: RendererEnv, state: RuntimeValueState<T>): ValueEvaluationResult<T>;
}
export type ValidationRule = {
    kind: 'required';
    message?: string;
} | {
    kind: 'minLength';
    value: number;
    message?: string;
} | {
    kind: 'maxLength';
    value: number;
    message?: string;
} | {
    kind: 'minItems';
    value: number;
    message?: string;
} | {
    kind: 'maxItems';
    value: number;
    message?: string;
} | {
    kind: 'atLeastOneFilled';
    itemPath?: string;
    message?: string;
} | {
    kind: 'allOrNone';
    itemPaths: string[];
    message?: string;
} | {
    kind: 'uniqueBy';
    itemPath: string;
    message?: string;
} | {
    kind: 'atLeastOneOf';
    paths: string[];
    message?: string;
} | {
    kind: 'pattern';
    value: string;
    message?: string;
} | {
    kind: 'email';
    message?: string;
} | {
    kind: 'equalsField';
    path: string;
    message?: string;
} | {
    kind: 'notEqualsField';
    path: string;
    message?: string;
} | {
    kind: 'requiredWhen';
    path: string;
    equals: unknown;
    message?: string;
} | {
    kind: 'requiredUnless';
    path: string;
    equals: unknown;
    message?: string;
} | {
    kind: 'async';
    api: ApiObject;
    debounce?: number;
    message?: string;
};
export interface ValidationError {
    path: string;
    message: string;
    rule: ValidationRule['kind'];
    ruleId?: string;
    ownerPath?: string;
    sourceKind?: 'field' | 'object' | 'array' | 'form' | 'runtime-registration';
    relatedPaths?: string[];
}
export interface ValidationResult {
    ok: boolean;
    errors: ValidationError[];
}
export interface FormValidationResult extends ValidationResult {
    fieldErrors: Record<string, ValidationError[]>;
}
export interface RuntimeFieldRegistration {
    path: string;
    getValue(): unknown;
    childPaths?: string[];
    syncValue?(): unknown;
    onRemove?(): void;
    validateChild?(path: string): Promise<ValidationError[]> | ValidationError[];
    validate?(): Promise<ValidationError[]> | ValidationError[];
}
export interface CompiledValidationBehavior {
    triggers: ValidationTrigger[];
    showErrorOn: ValidationVisibilityTrigger[];
}
export interface CompiledFormValidationField {
    path: string;
    controlType: string;
    label?: string;
    rules: CompiledValidationRule[];
    behavior: CompiledValidationBehavior;
}
export interface CompiledValidationRule {
    id: string;
    rule: ValidationRule;
    dependencyPaths: string[];
    precompiled?: {
        regex?: RegExp;
    };
}
export type CompiledValidationNodeKind = 'field' | 'object' | 'array' | 'form';
export interface CompiledValidationNode {
    path: string;
    kind: CompiledValidationNodeKind;
    controlType?: string;
    label?: string;
    rules: CompiledValidationRule[];
    behavior?: CompiledValidationBehavior;
    children: string[];
    parent?: string;
}
export interface CompiledFormValidationModel {
    fields: Record<string, CompiledFormValidationField>;
    order: string[];
    behavior: CompiledValidationBehavior;
    dependents: Record<string, string[]>;
    nodes?: Record<string, CompiledValidationNode>;
    validationOrder?: string[];
    rootPath?: string;
}
export interface ValidationCollectContext<S extends BaseSchema = BaseSchema> {
    schema: S;
    renderer: RendererDefinition<S>;
    path: SchemaPath;
}
export interface ValidationContributor<S extends BaseSchema = BaseSchema> {
    kind: 'field' | 'container' | 'none';
    valueKind?: 'scalar' | 'array' | 'object';
    getFieldPath?(schema: S, ctx: ValidationCollectContext<S>): string | undefined;
    collectRules?(schema: S, ctx: ValidationCollectContext<S>): ValidationRule[];
}
export interface CompiledSchemaMeta {
    id?: CompiledRuntimeValue<string | undefined>;
    name?: CompiledRuntimeValue<string | undefined>;
    label?: CompiledRuntimeValue<string | undefined>;
    title?: CompiledRuntimeValue<string | undefined>;
    className?: CompiledRuntimeValue<string | undefined>;
    visible?: CompiledRuntimeValue<boolean | unknown>;
    hidden?: CompiledRuntimeValue<boolean | unknown>;
    disabled?: CompiledRuntimeValue<boolean | unknown>;
    testid?: CompiledRuntimeValue<string | undefined>;
}
export interface ResolvePropsArgs<S extends BaseSchema = BaseSchema> {
    schema: S;
    node: CompiledSchemaNode<S>;
    scope: ScopeRef;
    runtime: RendererRuntime;
}
export interface RenderFragmentOptions {
    data?: object;
    scope?: ScopeRef;
    scopeKey?: string;
    isolate?: boolean;
    pathSuffix?: string;
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
}
export interface RenderRegionHandle {
    key: string;
    path: SchemaPath;
    node: CompiledSchemaNode | CompiledSchemaNode[] | null;
    render(options?: RenderFragmentOptions): ReactNode;
}
export type RenderNodeInput = SchemaInput | CompiledSchemaNode | CompiledSchemaNode[] | null | undefined;
export interface RendererHelpers {
    render: (input: RenderNodeInput, options?: RenderFragmentOptions) => ReactNode;
    evaluate: <T = unknown>(target: unknown, scope?: ScopeRef) => T;
    createScope: (patch?: object, options?: CreateScopeOptions) => ScopeRef;
    dispatch: (action: ActionSchema | ActionSchema[], ctx?: Partial<ActionContext>) => Promise<ActionResult>;
}
export type RendererEventHandler = (event?: unknown, ctx?: Partial<ActionContext>) => Promise<ActionResult>;
export interface RendererComponentProps<S extends BaseSchema = BaseSchema> {
    id: string;
    path: SchemaPath;
    schema: S;
    node: CompiledSchemaNode<S>;
    props: Readonly<Record<string, unknown>>;
    meta: ResolvedNodeMeta;
    regions: Readonly<Record<string, RenderRegionHandle>>;
    events: Readonly<Record<string, RendererEventHandler | undefined>>;
    helpers: RendererHelpers;
}
export interface RendererDefinition<S extends BaseSchema = BaseSchema> {
    type: S['type'];
    component: ComponentType<RendererComponentProps<any>>;
    regions?: readonly string[];
    fields?: readonly SchemaFieldRule[];
    memo?: boolean;
    scopePolicy?: ScopePolicy;
    actionScopePolicy?: 'inherit' | 'new';
    componentRegistryPolicy?: 'inherit' | 'new';
    resolveProps?: (args: ResolvePropsArgs<S>) => Record<string, unknown>;
    validation?: ValidationContributor<S>;
    wrap?: boolean;
}
export interface RendererRegistry {
    register(definition: RendererDefinition): void;
    get(type: string): RendererDefinition | undefined;
    has(type: string): boolean;
    list(): RendererDefinition[];
}
export interface CompiledRegion {
    key: string;
    path: SchemaPath;
    node: CompiledSchemaNode | CompiledSchemaNode[] | null;
}
export interface CompiledNodeFlags {
    hasVisibilityRule: boolean;
    hasHiddenRule: boolean;
    hasDisabledRule: boolean;
    isContainer: boolean;
    isStatic: boolean;
}
export interface CompiledNodeRuntimeState {
    meta: Record<string, RuntimeValueState<unknown>>;
    props?: RuntimeValueState<Record<string, unknown>>;
    resolvedMeta?: ResolvedNodeMeta;
    resolvedProps?: Readonly<Record<string, unknown>>;
}
export interface CompiledSchemaNode<S extends BaseSchema = BaseSchema> {
    id: string;
    type: S['type'];
    path: SchemaPath;
    schema: S;
    component: RendererDefinition<S>;
    meta: CompiledSchemaMeta;
    props: CompiledRuntimeValue<Record<string, unknown>>;
    validation?: CompiledFormValidationModel;
    regions: Readonly<Record<string, CompiledRegion>>;
    eventActions: Readonly<Record<string, unknown>>;
    eventKeys: readonly string[];
    flags: CompiledNodeFlags;
    createRuntimeState(): CompiledNodeRuntimeState;
}
export interface CompileSchemaOptions {
    basePath?: SchemaPath;
    parentPath?: SchemaPath;
    parentScopePolicy?: ScopePolicy;
}
export interface CompileNodeOptions {
    path: SchemaPath;
    parentPath?: SchemaPath;
    renderer: RendererDefinition;
    fieldRules?: readonly SchemaFieldRule[];
}
export interface RendererPlugin {
    name: string;
    priority?: number;
    beforeCompile?(schema: SchemaInput): SchemaInput;
    afterCompile?(node: CompiledSchemaNode | CompiledSchemaNode[]): CompiledSchemaNode | CompiledSchemaNode[];
    wrapComponent?<S extends BaseSchema>(definition: RendererDefinition<S>): RendererDefinition<S>;
    beforeAction?(action: ActionSchema, ctx: ActionContext): ActionSchema | Promise<ActionSchema>;
    onError?(error: unknown, payload: ErrorMonitorPayload): void;
}
export interface SchemaCompiler {
    compile(schema: SchemaInput, options?: CompileSchemaOptions): CompiledSchemaNode | CompiledSchemaNode[];
    compileNode(schema: BaseSchema, options: CompileNodeOptions): CompiledSchemaNode;
}
export interface ResolvedNodeProps {
    value: Readonly<Record<string, unknown>>;
    changed: boolean;
    reusedReference: boolean;
}
export interface ResolvedNodeMeta {
    id?: string;
    name?: string;
    label?: string;
    title?: string;
    className?: string;
    visible: boolean;
    hidden: boolean;
    disabled: boolean;
    testid?: string;
    changed: boolean;
}
export interface FormStoreState {
    values: Record<string, any>;
    errors: Record<string, ValidationError[]>;
    validating: Record<string, boolean>;
    touched: Record<string, boolean>;
    dirty: Record<string, boolean>;
    visited: Record<string, boolean>;
    submitting: boolean;
}
export interface FormErrorQuery {
    path?: string;
    ownerPath?: string;
    sourceKinds?: Array<NonNullable<ValidationError['sourceKind']>>;
    rule?: ValidationRule['kind'];
}
export interface FormFieldStateSnapshot {
    error?: ValidationError;
    validating: boolean;
    touched: boolean;
    dirty: boolean;
    visited: boolean;
    submitting: boolean;
}
export interface FormStoreApi {
    getState(): FormStoreState;
    subscribe(listener: () => void): () => void;
    setValues(values: Record<string, any>): void;
    setValue(path: string, value: unknown): void;
    setErrors(errors: Record<string, ValidationError[]>): void;
    setPathErrors(path: string, errors?: ValidationError[]): void;
    setValidating(path: string, validating: boolean): void;
    setValidatingState(validating: Record<string, boolean>): void;
    setTouched(path: string, touched: boolean): void;
    setTouchedState(touched: Record<string, boolean>): void;
    setDirty(path: string, dirty: boolean): void;
    setDirtyState(dirty: Record<string, boolean>): void;
    setVisited(path: string, visited: boolean): void;
    setVisitedState(visited: Record<string, boolean>): void;
    setSubmitting(submitting: boolean): void;
}
export interface DialogState {
    id: string;
    dialog: Record<string, any>;
    scope: ScopeRef;
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
    title?: RenderNodeInput | string;
    body?: RenderNodeInput;
}
export interface PageStoreState {
    data: Record<string, any>;
    dialogs: DialogState[];
    refreshTick: number;
}
export interface PageStoreApi {
    getState(): PageStoreState;
    subscribe(listener: () => void): () => void;
    setData(data: Record<string, any>): void;
    updateData(path: string, value: unknown): void;
    openDialog(dialog: DialogState): void;
    closeDialog(dialogId?: string): void;
    refresh(): void;
}
export interface FormRuntime {
    id: string;
    name?: string;
    store: FormStoreApi;
    scope: ScopeRef;
    validation?: CompiledFormValidationModel;
    registerField(registration: RuntimeFieldRegistration): () => void;
    validateField(path: string): Promise<ValidationResult>;
    validateSubtree(path: string): Promise<FormValidationResult>;
    validateForm(): Promise<FormValidationResult>;
    getError(path: string): ValidationError[] | undefined;
    isValidating(path: string): boolean;
    isTouched(path: string): boolean;
    isDirty(path: string): boolean;
    isVisited(path: string): boolean;
    touchField(path: string): void;
    visitField(path: string): void;
    clearErrors(path?: string): void;
    submit(api?: ApiObject): Promise<ActionResult>;
    reset(values?: object): void;
    setValue(name: string, value: unknown): void;
    appendValue(path: string, value: unknown): void;
    prependValue(path: string, value: unknown): void;
    insertValue(path: string, index: number, value: unknown): void;
    removeValue(path: string, index: number): void;
    moveValue(path: string, from: number, to: number): void;
    swapValue(path: string, a: number, b: number): void;
    replaceValue(path: string, value: unknown): void;
}
export interface PageRuntime {
    store: PageStoreApi;
    scope: ScopeRef;
    openDialog(dialog: Record<string, any>, scope: ScopeRef, runtime: RendererRuntime, options?: {
        actionScope?: ActionScope;
        componentRegistry?: ComponentHandleRegistry;
    }): string;
    closeDialog(dialogId?: string): void;
    refresh(): void;
}
export interface DialogRendererProps {
    dialogs: DialogState[];
    renderDialog: (dialog: DialogState) => ReactNode;
}
export interface ActionSchema extends SchemaObject {
    action: string;
    _targetCid?: number;
    _targetTemplateId?: string;
    componentId?: string;
    componentName?: string;
    componentPath?: string;
    formId?: string;
    dialogId?: string;
    api?: ApiObject;
    dialog?: Record<string, any>;
    dataPath?: string;
    value?: SchemaValue;
    args?: Record<string, SchemaValue>;
    debounce?: number;
    continueOnError?: boolean;
    then?: ActionSchema | ActionSchema[];
}
export interface ActionContext {
    runtime: RendererRuntime;
    scope: ScopeRef;
    getInstanceKey?: () => string | undefined;
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
    event?: unknown;
    node?: CompiledSchemaNode;
    form?: FormRuntime;
    page?: PageRuntime;
    dialogId?: string;
    prevResult?: ActionResult;
}
export interface ActionResult {
    ok: boolean;
    cancelled?: boolean;
    data?: unknown;
    error?: unknown;
}
export interface RendererRuntime {
    registry: RendererRegistry;
    env: RendererEnv;
    expressionCompiler: ExpressionCompiler;
    schemaCompiler: SchemaCompiler;
    plugins: readonly RendererPlugin[];
    compile(schema: SchemaInput): CompiledSchemaNode | CompiledSchemaNode[];
    evaluate<T = unknown>(target: unknown, scope: ScopeRef): T;
    resolveNodeMeta(node: CompiledSchemaNode, scope: ScopeRef, state?: CompiledNodeRuntimeState): ResolvedNodeMeta;
    resolveNodeProps(node: CompiledSchemaNode, scope: ScopeRef, state?: CompiledNodeRuntimeState): ResolvedNodeProps;
    createChildScope(parent: ScopeRef, patch?: object, options?: CreateScopeOptions): ScopeRef;
    createActionScope(input?: {
        id?: string;
        parent?: ActionScope;
    }): ActionScope;
    createComponentHandleRegistry(input?: {
        id?: string;
        parent?: ComponentHandleRegistry;
    }): ComponentHandleRegistry;
    ensureImportedNamespaces(input: {
        imports?: readonly XuiImportSpec[];
        actionScope?: ActionScope;
        componentRegistry?: ComponentHandleRegistry;
        scope: ScopeRef;
        node?: CompiledSchemaNode;
    }): Promise<void>;
    releaseImportedNamespaces(input: {
        imports?: readonly XuiImportSpec[];
        actionScope?: ActionScope;
    }): void;
    dispatch(action: ActionSchema | ActionSchema[], ctx: ActionContext): Promise<ActionResult>;
    createPageRuntime(data?: Record<string, any>): PageRuntime;
    createFormRuntime(input: {
        id?: string;
        name?: string;
        initialValues?: Record<string, any>;
        parentScope: ScopeRef;
        page?: PageRuntime;
        validation?: CompiledFormValidationModel;
    }): FormRuntime;
}
export interface RendererHookApi {
    useRendererRuntime(): RendererRuntime;
    useRenderScope(): ScopeRef;
    useCurrentActionScope(): ActionScope | undefined;
    useCurrentComponentRegistry(): ComponentHandleRegistry | undefined;
    useScopeSelector<T>(selector: (scopeData: any) => T, equalityFn?: (a: T, b: T) => boolean): T;
    useRendererEnv(): RendererEnv;
    useActionDispatcher(): RendererRuntime['dispatch'];
    useCurrentForm(): FormRuntime | undefined;
    useCurrentFormErrors(query?: FormErrorQuery): ValidationError[];
    useCurrentFormError(query: FormErrorQuery): ValidationError | undefined;
    useCurrentFormFieldState(path: string, query?: FormErrorQuery): FormFieldStateSnapshot;
    useValidationNodeState(path: string): FormFieldStateSnapshot;
    useFieldError(path: string): ValidationError | undefined;
    useOwnedFieldState(path: string): FormFieldStateSnapshot;
    useChildFieldState(path: string): FormFieldStateSnapshot;
    useAggregateError(path: string): ValidationError | undefined;
    useCurrentPage(): PageRuntime | undefined;
    useCurrentNodeMeta(): {
        id: string;
        path: SchemaPath;
        type: string;
    };
    useRenderFragment(): RendererHelpers['render'];
}
export interface RenderNodeMeta {
    id: string;
    path: SchemaPath;
    type: string;
}
export interface SchemaRendererProps {
    schema: SchemaInput;
    data?: Record<string, any>;
    env: RendererEnv;
    formulaCompiler: FormulaCompiler;
    registry?: RendererRegistry;
    plugins?: RendererPlugin[];
    pageStore?: PageStoreApi;
    parentScope?: ScopeRef;
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
    onActionError?: (error: unknown, ctx: ActionContext) => void;
}
export type SchemaRendererComponent = (props: SchemaRendererProps) => ReactElement | null;
