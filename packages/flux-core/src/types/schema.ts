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

/**
 * Unified field classification vocabulary.
 *
 * Shared by top-level renderer `fields` (`SchemaFieldRule[]`) and nested
 * `fieldRules` (`Record<string, SchemaFieldRule | SchemaFieldKind>`) — one
 * vocabulary, one classification semantics.
 *
 * Nested-only kinds (`value`/`schema`/`schema-array`/`action`/`literal`) are
 * incremental additions; `meta`/`reaction`/`ignored` carry top-level
 * semantics only (nested `fieldRules` use the subset they need).
 */
export type SchemaFieldKind =
  | 'meta'
  | 'prop'
  | 'value'
  | 'region'
  | 'value-or-region'
  | 'schema'
  | 'schema-array'
  | 'event'
  | 'action'
  | 'literal'
  | 'reaction'
  | 'ignored';
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
  /** className applied to the label element. amis: labelClassName. */
  labelClassName?: string;
  /** className applied to the input control wrapper. amis: inputClassName. */
  inputClassName?: string;
  /** className applied to the description element. amis: descriptionClassName. */
  descriptionClassName?: string;
}

export interface SchemaFieldRule {
  /**
   * Field key. Required in top-level `fields` array form; in nested
   * `fieldRules` record form the record key provides it and `key` may be
   * omitted (when present it must equal the record key).
   */
  key?: string;
  kind: SchemaFieldKind;
  /**
   * Value shape constraint. Top-level boolean fields use `'boolean'` for
   * literal normalization; nested `fieldRules` may declare the broader
   * union. Expression strings (`${...}`) are exempt at validation time.
   */
  valueType?: 'boolean' | 'string' | 'number' | 'object' | 'array';
  /**
   * Compiled-key carrier with dual semantics (resolved by context):
   * - top-level `fields`: the region key under which the extracted subtree
   *   is registered (`renderer` reads `props.regions[regionKey]`);
   * - nested `fieldRules`: the compiled key written into the item that
   *   receives the region key string (renderer reads `item.<regionKey>`
   *   e.g. `item.titleRegionKey`).
   */
  regionKey?: string;
  /**
   * Region key suffix for nested `fieldRules` region extraction. Defaults to
   * the field key. May contain dots to produce a dotted region key
   * (e.g. `'quickEditBody'` for field `body`, `'popOver.content'` for
   * field `popOver`).
   */
  regionKeySuffix?: string;
  /**
   * When the nested field value is a plain object (not schema input), the
   * schema subtree lives at `value[sourceKey]`. Extraction removes that
   * leaf and writes the compiled key (per `regionKey` semantics).
   */
  sourceKey?: string;
  /** Field is required (missing value is reported) — nested validation. */
  required?: boolean;
  /** String must be non-empty (combined with `valueType: 'string'`). */
  nonEmpty?: boolean;
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

/**
 * Schema shape for a `kind: 'reaction'` field (e.g. CRUD `loadAction`).
 *
 * Distinct from `ReactionSchema`: `ReactionSchema` is the standalone
 * `<reaction>` renderer schema; `ReactiveActionSchema` is a field-level action
 * that combines imperative dispatch (renderer controls timing) with reactive
 * triggering (re-fires when `dependsOn` roots change).
 *
 * - `dependsOn`: REQUIRED. Root-level scope paths that should trigger a re-fire.
 *   Per `docs/architecture/dependency-tracking.md` §3.3 authors declare roots
 *   (`user`, not `user.name`); deep paths are folded to the root at runtime
 *   and emit a compile-time warning.
 * - `ignoreWritesTo`: OPTIONAL. Root-level paths whose writes this reaction
 *   should not re-trigger itself on (e.g. server-pagination corrections).
 *
 * v1 does not support `immediate` / `debounce` / `once` / `control` on this
 * schema; the renderer owns initial-fire gating via `ReactionHandle.ready()`.
 *
 * @see docs/plans/2026-07-07-loadAction-reaction-kind-plan.md
 */
export interface ReactiveActionSchema extends ActionSchema {
  dependsOn: string[];
  ignoreWritesTo?: string[];
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
