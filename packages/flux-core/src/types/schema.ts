import type {
  ActionSchema,
  CompiledActionProgram,
} from './actions.js';
import type {
  CompileSymbolTable,
  CompiledRuntimeValue,
  ExpressionCompileOptions,
  ExpressionCompiler,
} from './compilation.js';
import type { SchemaCompileDiagnosticsOptions } from './schema-diagnostics-types.js';
import type {
  OperationControlConfig,
  SchemaObject,
  SchemaPath,
  SchemaValue,
  XuiImportSpec,
} from './schema-base-types.js';

export type {
  ApiSchema,
  ExecutableApiRequest,
  OperationControlConfig,
  PreparedApiRequest,
  Primitive,
  RequestDedupStrategy,
  SchemaObject,
  SchemaPath,
  SchemaValue,
  XuiImportSpec,
} from './schema-base-types.js';

export interface FieldCompileSchemaOptions {
  basePath?: SchemaPath;
  parentPath?: SchemaPath;
  schemaUrl?: string;
  signal?: AbortSignal;
  parentScopePolicy?: ScopePolicy;
  symbolTable?: CompileSymbolTable;
  preparedImports?: ReadonlyMap<string, import('./compilation.js').PreparedImportSpec>;
  importLoader?: import('./actions.js').ImportedLibraryLoader;
  resolveImportUrl?: (schemaUrl: string, from: string, options?: Record<string, unknown>) => string;
  diagnostics?: SchemaCompileDiagnosticsOptions;
  validation?: import('./schema-validation-types.js').SchemaCompileValidationOptions;
}

export type ValidationTrigger = 'change' | 'blur' | 'submit';
export type ValidationVisibilityTrigger = 'touched' | 'dirty' | 'visited' | 'submit';
export type ScopePolicy = 'inherit' | 'form';
export type SchemaFieldKind = 'meta' | 'prop' | 'region' | 'value-or-region' | 'event' | 'ignored';
export type FrameWrapMode = boolean | 'label' | 'group' | 'none';

export interface ActionShapeLikeFields extends SchemaObject {
  action?: string;
  _targetCid?: number;
  _targetTemplateId?: string;
  targetId?: string;
  componentId?: string;
  componentName?: string;
  dialogId?: string;
  surfaceId?: string;
  args?: Record<string, SchemaValue>;
  control?: OperationControlConfig;
  timeout?: number;
  retry?: OperationControlConfig['retry'];
  debounce?: number;
  when?: boolean | string;
  parallel?: ActionSchemaLike[];
  continueOnError?: boolean;
  then?: ActionSchemaLike | ActionSchemaLike[];
  onError?: ActionSchemaLike | ActionSchemaLike[];
  onSettled?: ActionSchemaLike | ActionSchemaLike[];
}

export interface ActionSchemaLike extends ActionShapeLikeFields {
  action: string;
}

export interface BaseSchema extends SchemaObject {
  type: string;
  id?: string;
  name?: string;
  label?: string;
  title?: string | SchemaInput;
  className?: string;
  frameClassName?: string;
  classAliases?: Record<string, string>;
  when?: boolean | string;
  visible?: boolean | string;
  hidden?: boolean | string;
  disabled?: boolean | string;
  testid?: string;
  frameWrap?: FrameWrapMode;
  validateOn?: ValidationTrigger | ValidationTrigger[];
  showErrorOn?: ValidationVisibilityTrigger | ValidationVisibilityTrigger[];
  onMount?: ActionSchemaLike | ActionSchemaLike[];
  onUnmount?: ActionSchemaLike | ActionSchemaLike[];
  'xui:imports'?: XuiImportSpec[];
}

export type SchemaInput = BaseSchema | BaseSchema[];

export interface FieldRemarkSchema extends SchemaObject {
  icon?: string;
  content: string;
  placement?: 'top' | 'right' | 'bottom' | 'left';
  trigger?: ('click' | 'hover' | 'focus')[];
}

export interface BoundFieldSchemaBase extends BaseSchema {
  name: string;
  readOnly?: boolean | string;
  required?: boolean | string;
  mode?: 'normal' | 'horizontal';
  labelAlign?: 'top' | 'left' | 'right' | 'inherit';
  labelWidth?: string | number;
  hint?: string;
  description?: string;
  remark?: FieldRemarkSchema;
  labelRemark?: FieldRemarkSchema;
}

export interface SchemaFieldRule {
  key: string;
  kind: SchemaFieldKind;
  valueType?: 'boolean';
  regionKey?: string;
  allowSource?: boolean;
  sourceStateKey?: string;
  /**
   * Declared parameter names for parameterized regions.
   * Only valid when kind is 'region' or 'value-or-region'.
   * Names must not start with '$' (reserved for slot-frame metadata).
   * At runtime, these bindings are published under the reserved $slot frame
   * rather than flattened into top-level scope names.
   */
  params?: readonly string[];
  /**
   * When true, the child scope created for this parameterized region is
   * isolated from parent lexical scope.
   * Defaults to false (inherits parent scope).
   */
  isolate?: boolean;
  /**
   * When true, the field is compiled into `TemplateNode.structuralFields`
   * instead of `propsProgram`. The renderer is responsible for evaluating
   * the compiled value in a custom scope (e.g. per loop item) using
   * `helpers.evaluateCompiled()`. Only valid when kind is 'prop'.
   * When combined with `params`, the compiler includes those symbols in
   * the compilation context so expressions can reference them.
   */
  lazyEval?: boolean;
  /**
   * Custom field-level compilation hook for props that need renderer-owned
   * compilation semantics, such as props that contain nested template schemas.
   */
  compile?: FieldCompileFn;
}

export interface FieldCompileContext {
  expressionCompiler: ExpressionCompiler;
  symbolTable: CompileSymbolTable;
  sourcePath: string;
  compileValue: <T = unknown>(
    input: T,
    sourcePath?: string,
    options?: Omit<ExpressionCompileOptions, 'sourcePath'>,
  ) => CompiledRuntimeValue<T>;
  compileActions: (
    input: ActionSchema | ActionSchema[],
    sourcePath?: string,
    options?: Omit<ExpressionCompileOptions, 'sourcePath'>,
  ) => CompiledActionProgram;
  compileSchema: (input: SchemaInput, options?: FieldCompileSchemaOptions) => unknown;
}

export type FieldCompileFn = (value: unknown, context: FieldCompileContext) => unknown;


export interface BaseDataSourceSchema extends BaseSchema {
  type: 'data-source';
  name?: string;
  mergeToScope?: boolean;
  resultMapping?: Record<string, SchemaValue>;
  statusPath?: string;
  dependsOn?: string[];
  initialData?: SchemaValue;
  mergeStrategy?: 'replace' | 'append' | 'prepend' | 'merge' | 'upsert';
  mergeKey?: string;
  /**
   * Raw boolean expression (no `${}` wrapper). Evaluated in the source owner scope
   * at refresh time; when falsy (or when evaluation throws, following Flux `when`
   * semantics) the refresh is skipped and no request is sent.
   */
  sendOn?: string;
}

export interface SourceActionSchema extends ActionShapeLikeFields {
  action?: string;
  formula?: SchemaValue;
}

export interface SourceSchema extends SourceActionSchema {
  type: 'source';
}

export interface FormulaDataSourceSchema extends BaseDataSourceSchema, ActionShapeLikeFields {
  formula: SchemaValue;
  action?: never;
  api?: never;
}

export interface ActionDataSourceSchema extends BaseDataSourceSchema, SourceActionSchema {
  action: string;
  args?: Record<string, SchemaValue>;
  interval?: number;
  stopWhen?: string;
  silent?: boolean;
  /**
   * Whether to automatically fetch on mount/start. Defaults to `true`.
   * When `false`, the source is still registered but the first refresh is skipped;
   * `refresh()` / `component:refresh` can still trigger a fetch manually.
   */
  initFetch?: boolean;
  /**
   * Dispatched after a successful fetch completes. Payload available to the action:
   * `{ data, dataUpdatedAt }`.
   */
  onSuccess?: ActionSchema | ActionSchema[];
  /**
   * Dispatched after a fetch fails. Payload available to the action:
   * `{ error, failureCount }`.
   */
  onError?: ActionSchema | ActionSchema[];
}

export type DataSourceSchema = FormulaDataSourceSchema | ActionDataSourceSchema;

export interface ReactionSchema extends BaseSchema {
  type: 'reaction';
  watch: SchemaValue;
  dependsOn?: string[];
  when?: string;
  immediate?: boolean;
  debounce?: number;
  once?: boolean;
  actions: ActionSchemaLike;
}

export interface DynamicRendererSchema extends BaseSchema {
  type: 'dynamic-renderer';
  loadAction: ActionSchemaLike;
  body?: SchemaInput;
  /**
   * Whether to automatically trigger `loadAction` on mount. Defaults to `true`
   * (backward compatible). When `false`, the renderer skips the auto-load on
   * mount and stays in the `body` region (or empty) state until
   * `component:refresh` is invoked.
   */
  autoLoad?: boolean;
}
