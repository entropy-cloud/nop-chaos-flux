import type {
  ActionNamespaceProvider,
  ActionScope,
  CompiledActionProgram,
  ImportedLibraryModule,
} from './actions';
import type { EvalContext, ScopeDependencySet, ScopeRef } from './scope';
import type { RendererEnv } from './renderer';
import type { RequestDedupStrategy } from './schema';

export type CompileSymbolKind =
  | 'builtin-namespace'
  | 'import-alias'
  | 'injected-local'
  | 'slot-root'
  | 'ambient'
  | 'xui-action-definition';

export interface SymbolInfo {
  name: string;
  kind: CompileSymbolKind;
  members?: readonly string[];
  memberDefinitions?: Readonly<Record<string, ImportHelperDefinition>>;
}

export interface ImportParameterDefinition {
  name: string;
  required?: boolean;
}

export interface ImportHelperDefinition {
  kind?: 'function' | 'value';
  params?: readonly ImportParameterDefinition[];
}

export interface ImportedLibraryStaticMeta {
  helpers?: Readonly<Record<string, ImportHelperDefinition>>;
  namespaceMethods?: readonly string[];
}

export interface PreparedImportSpec {
  schemaUrl: string;
  spec: import('./schema').XuiImportSpec;
  resolvedSpec: import('./schema').XuiImportSpec;
  staticMeta?: ImportedLibraryStaticMeta;
}

export interface SymbolFrame {
  id: string;
  kind: 'root' | 'imports' | 'region' | 'owner' | 'xui-actions';
  symbols: Readonly<Record<string, SymbolInfo>>;
}

export interface CompileSymbolTable {
  readonly frames: readonly SymbolFrame[];
  push(frame: Omit<SymbolFrame, 'id'> & { id?: string }): CompileSymbolTable;
  resolve(name: string): SymbolInfo | undefined;
}

export interface ModuleCache {
  get(absUrl: string): ImportedLibraryModule | undefined;
  set(absUrl: string, module: ImportedLibraryModule): void;
  has(absUrl: string): boolean;
  getPending(absUrl: string): Promise<ImportedLibraryModule> | undefined;
  setPending(absUrl: string, promise: Promise<ImportedLibraryModule>): void;
  removePending(absUrl: string): void;
}

export interface ImportStackEntry {
  alias: string;
  spec: import('./schema').XuiImportSpec;
  actionProvider?: ActionNamespaceProvider;
  expressionHelpers?: Readonly<Record<string, unknown>>;
  staticMeta?: ImportedLibraryStaticMeta;
}

export interface ImportFrame {
  id: string;
  ownerNodeId: string;
  parentFrameId?: string;
  parentFrame?: ImportFrame;
  actionScope?: ActionScope;
  entries: Readonly<Record<string, ImportStackEntry>>;
}

export interface ImportStack {
  readonly frames: readonly ImportFrame[];
  preload(input: {
    imports?: readonly import('./schema').XuiImportSpec[];
    schemaUrl: string;
  }): Promise<void>;
  push(input: {
    ownerNodeId: string;
    parentFrameId?: string;
    imports?: readonly import('./schema').XuiImportSpec[];
    actionScope?: ActionScope;
    componentRegistry?: import('./renderer-component').ComponentHandleRegistry;
    scope: ScopeRef;
    schemaUrl: string;
    nodeInstance?: import('./node-identity').NodeInstance;
  }): Promise<ImportFrame | undefined>;
  installPrepared(input: {
    ownerNodeId: string;
    parentFrame?: ImportFrame;
    imports?: readonly PreparedImportSpec[];
    actionScope?: ActionScope;
    componentRegistry?: import('./renderer-component').ComponentHandleRegistry;
    scope: ScopeRef;
    nodeInstance?: import('./node-identity').NodeInstance;
  }): ImportFrame | undefined;
  pop(frameId: string): void;
  resolveAlias(alias: string, frameId?: string): ImportStackEntry | undefined;
  currentBindings(frameId?: string): Readonly<Record<string, unknown>>;
  dispose(): void;
}

export interface CompiledExpression<T = unknown> {
  kind: 'expression';
  source: string;
  staticValue?: T;
  exec(context: EvalContext | object, env: RendererEnv): T;
}

export interface CompiledStringTemplate<T = unknown> {
  kind: 'template';
  source: string;
  staticValue?: T;
  exec(context: EvalContext | object, env: RendererEnv): T;
}

export interface ExpressionCompileOptions {
  libraryNames?: ReadonlySet<string>;
  symbolTable?: CompileSymbolTable;
  sourcePath?: string;
  reportDiagnostic?: (issue: {
    code: import('../schema-diagnostics').SchemaDiagnosticCode;
    message: string;
    path: string;
    severity?: import('../schema-diagnostics').SchemaDiagnosticSeverity;
    source?: import('../schema-diagnostics').SchemaDiagnosticSource;
  }) => void;
}

export interface FormulaCompiler {
  hasExpression(input: string): boolean;
  compileExpression<T = unknown>(
    source: string,
    options?: ExpressionCompileOptions,
  ): CompiledExpression<T>;
  compileTemplate<T = unknown>(
    source: string,
    options?: ExpressionCompileOptions,
  ): CompiledStringTemplate<T>;
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
  compiled: CompiledStringTemplate<T>;
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

export type CompiledValueNode<T = unknown> =
  | StaticValueNode<T>
  | ExpressionValueNode<T>
  | TemplateValueNode<T>
  | ArrayValueNode
  | ObjectValueNode;

export type DynamicValueNode<T = unknown> =
  | ExpressionValueNode<T>
  | TemplateValueNode<T>
  | ArrayValueNode
  | ObjectValueNode;

export interface LeafValueState<T = unknown> {
  kind: 'leaf-state';
  initialized: boolean;
  lastValue?: T;
  dependencies?: ScopeDependencySet;
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

export type RuntimeValueStateNode<T = unknown> =
  | LeafValueState<T>
  | ArrayValueState
  | ObjectValueState;

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
  exec(
    context: EvalContext,
    env: RendererEnv,
    state?: RuntimeValueState<T>,
  ): ValueEvaluationResult<T>;
}

export type CompiledRuntimeValue<T = unknown> = StaticRuntimeValue<T> | DynamicRuntimeValue<T>;

export interface ExpressionCompiler {
  formulaCompiler: FormulaCompiler;
  compileNode<T = unknown>(input: T, options?: ExpressionCompileOptions): CompiledValueNode<T>;
  compileValue<T = unknown>(input: T, options?: ExpressionCompileOptions): CompiledRuntimeValue<T>;
  createState<T = unknown>(input: DynamicRuntimeValue<T>): RuntimeValueState<T>;
  evaluateValue<T = unknown>(
    input: CompiledRuntimeValue<T>,
    scope: ScopeRef,
    env: RendererEnv,
    state?: RuntimeValueState<T>,
  ): T;
  evaluateWithState<T = unknown>(
    input: DynamicRuntimeValue<T>,
    scope: ScopeRef,
    env: RendererEnv,
    state: RuntimeValueState<T>,
  ): ValueEvaluationResult<T>;
}

/**
 * Compiled API configuration - all expressions pre-compiled.
 * Used in data sources with API requests.
 *
 * @see docs/plans/132-runtime-schema-dependency-elimination-plan.md
 */
export interface CompiledApiConfig {
  url: CompiledRuntimeValue<string>;
  method?: CompiledRuntimeValue<string>;
  data?: CompiledRuntimeValue<unknown>;
  params?: CompiledRuntimeValue<unknown>;
  headers?: CompiledRuntimeValue<Record<string, string>>;
  includeScope?: '*' | readonly string[];
  responseAdaptor?: string;
  requestAdaptor?: string;
}

/**
 * Compiled operation control configuration.
 * Controls request dedup, throttle, cache behavior.
 */
export interface CompiledOperationControl {
  dedup?: RequestDedupStrategy;
  retry?: {
    times: number;
    delay?: number;
    strategy?: 'fixed' | 'exponential';
    maxDelay?: number;
  };
  throttle?: number;
  cacheTTL?: number;
  cacheKey?: string;
}

/**
 * Compiled data source - all expressions pre-compiled.
 * Replaces runtime access to raw schema.sources.
 *
 * @see docs/plans/132-runtime-schema-dependency-elimination-plan.md
 */
export interface CompiledDataSource {
  id: string;
  kind: 'action' | 'formula';

  /** Compiled target path for storing results in scope */
  targetPath?: CompiledRuntimeValue<string>;

  /** Compiled API configuration derived from action args (when kind === 'action' and action is ajax-like) */
  api?: CompiledApiConfig;

  /** Formula source expression (when kind === 'formula') */
  formula?: CompiledRuntimeValue<unknown>;

  /** Action to execute (alternative to api/formula) */
  action?: string;

  /** Whether to merge result directly to scope (vs. at targetPath) */
  mergeToScope?: CompiledRuntimeValue<boolean>;

  /** Field mapping from response to scope paths */
  resultMapping?: CompiledRuntimeValue<Record<string, string>>;

  /** How to merge data into existing scope value */
  mergeStrategy?: CompiledRuntimeValue<'replace' | 'append' | 'prepend' | 'merge' | 'upsert'>;

  /** Key field for upsert merge strategy */
  mergeKey?: CompiledRuntimeValue<string>;

  /** Path to publish loading/error status */
  statusPath?: CompiledRuntimeValue<string>;

  /** Polling interval in milliseconds */
  interval?: CompiledRuntimeValue<number>;

  /** Expression to stop polling when true */
  stopWhen?: CompiledRuntimeValue<boolean>;

  /** Suppress error notifications */
  silent?: CompiledRuntimeValue<boolean>;

  /** Initial data before first fetch */
  initialData?: CompiledRuntimeValue<unknown>;

  /** Static dependency paths (sources that must complete first) */
  dependsOn?: readonly string[];

  /** Operation control configuration */
  control?: CompiledOperationControl;
}

/**
 * Compiled reaction - all expressions pre-compiled.
 * Replaces runtime access to raw schema.reactions.
 *
 * Runtime MUST use only compiled data, never raw schema.
 *
 * @see docs/plans/132-runtime-schema-dependency-elimination-plan.md
 */
export interface CompiledReaction {
  id: string;

  /**
   * Compiled watch expression - evaluated to get the watched value.
   * Runtime uses this directly without re-compilation.
   */
  watch: CompiledRuntimeValue<unknown>;

  /**
   * Compiled condition expression - reaction fires only when true.
   * Unlike watch, this is a raw expression (not a template) that receives
   * special bindings: value, prev, changed, changedPaths, scope.
   */
  when?: CompiledExpression<boolean>;

  /** Compiled action program to execute */
  action: CompiledActionProgram;

  /** Static dependency paths for change detection */
  dependsOn?: readonly string[];

  /** Fire immediately on mount (before first watch trigger) */
  immediate?: boolean;

  /** Debounce delay in milliseconds */
  debounce?: number;

  /** Fire only once then auto-dispose */
  once?: boolean;
}
