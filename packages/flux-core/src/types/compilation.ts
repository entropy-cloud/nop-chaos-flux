import type { ComponentHandleRegistryCore } from './component-handle-core.js';
import type {
  CompiledExpression,
  CompiledRuntimeValue,
  CompiledStringTemplate,
  CompiledValueEvaluator,
  CompiledValueNode,
  DynamicRuntimeValue,
  ImportHelperDefinition,
  ImportedLibraryStaticMeta,
  RuntimeValueState,
} from './compiled-value-types.js';
import type {
  SchemaDiagnosticCode,
  SchemaDiagnosticSeverity,
  SchemaDiagnosticSource,
} from './schema-diagnostics-types.js';
import type { ScopeRef } from './scope.js';
import type { RequestDedupStrategy, XuiImportSpec } from './schema-base-types.js';
import type {
  ActionContext,
  ActionResult,
  ActionScopeDebugSnapshot,
  CompiledActionProgram,
} from './actions.js';

export type {
  CompiledExpression,
  CompiledRuntimeValue,
  CompiledStringTemplate,
  CompiledValueNode,
  DynamicRuntimeValue,
  ImportHelperDefinition,
  ImportParameterDefinition,
  ImportedLibraryStaticMeta,
  RuntimeValueState,
  ValueEvaluationResult,
} from './compiled-value-types.js';

type ImportActionNamespaceProvider = {
  kind?: 'host' | 'import';
  invoke(
    method: string,
    payload: Record<string, unknown> | undefined,
    ctx: unknown,
  ): Promise<ActionResult> | ActionResult;
  dispose?(): void;
  release?(): void;
  listMethods?(): readonly string[];
};

type ImportResolvedActionHandler = {
  namespace: string;
  method: string;
  provider: ImportActionNamespaceProvider;
  sourceScopeId: string;
};

type ImportActionScope = {
  id: string;
  parent?: ImportActionScope;
  resolve(actionName: string): ImportResolvedActionHandler | undefined;
  registerNamespace(namespace: string, provider: ImportActionNamespaceProvider): () => void;
  unregisterNamespace(namespace: string): void;
  listNamespaces(): readonly string[];
  getDebugSnapshot?(): ActionScopeDebugSnapshot;
};

type ImportContextNodeInstance = {
  templateNode: {
    id: string;
    templatePath?: string;
  };
  instancePath?: readonly unknown[];
  scope?: ScopeRef;
  state?: unknown;
  cid?: number;
};

type ImportedLibraryModuleLike = {
  createNamespace(
    context: {
      runtime: ActionContext['runtime'];
      env: import('./actions.js').ImportedNamespaceContext['env'];
      actionScope: ImportActionScope;
      componentRegistry?: ComponentHandleRegistryCore;
      scope: ScopeRef;
      spec: XuiImportSpec;
      nodeInstance?: ImportContextNodeInstance;
    },
  ): Promise<ImportActionNamespaceProvider> | ImportActionNamespaceProvider;
  createExpressionHelpers?(
    context: {
      runtime: ActionContext['runtime'];
      env: import('./actions.js').ImportedNamespaceContext['env'];
      actionScope: ImportActionScope;
      componentRegistry?: ComponentHandleRegistryCore;
      scope: ScopeRef;
      spec: XuiImportSpec;
      nodeInstance?: ImportContextNodeInstance;
    },
  ): Promise<Record<string, unknown>> | Record<string, unknown>;
  getStaticMeta?(): ImportedLibraryStaticMeta | Promise<ImportedLibraryStaticMeta>;
};

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

export interface PreparedImportSpec {
  schemaUrl: string;
  spec: XuiImportSpec;
  resolvedSpec: XuiImportSpec;
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
  get(absUrl: string): ImportedLibraryModuleLike | undefined;
  set(absUrl: string, module: ImportedLibraryModuleLike): void;
  has(absUrl: string): boolean;
  getPending(absUrl: string): Promise<ImportedLibraryModuleLike> | undefined;
  setPending(absUrl: string, promise: Promise<ImportedLibraryModuleLike>): void;
  removePending(absUrl: string): void;
  clear(): void;
}

export interface ImportStackEntry {
  alias: string;
  spec: XuiImportSpec;
  actionProvider?: ImportActionNamespaceProvider;
  expressionHelpers?: Readonly<Record<string, unknown>>;
  staticMeta?: ImportedLibraryStaticMeta;
}

export interface ImportFrame {
  id: string;
  ownerNodeId: string;
  parentFrameId?: string;
  parentFrame?: ImportFrame;
  actionScope?: ImportActionScope;
  entries: Readonly<Record<string, ImportStackEntry>>;
}

export interface ImportStack {
  readonly frames: readonly ImportFrame[];
  preload(input: {
    imports?: readonly XuiImportSpec[];
    schemaUrl: string;
  }): Promise<void>;
  push(input: {
    ownerNodeId: string;
    parentFrameId?: string;
    imports?: readonly XuiImportSpec[];
    actionScope?: ImportActionScope;
    componentRegistry?: ComponentHandleRegistryCore;
    scope: ScopeRef;
    schemaUrl: string;
    nodeInstance?: ImportContextNodeInstance;
  }): Promise<ImportFrame | undefined>;
  installPrepared(input: {
    ownerNodeId: string;
    parentFrame?: ImportFrame;
    imports?: readonly PreparedImportSpec[];
    actionScope?: ImportActionScope;
    componentRegistry?: ComponentHandleRegistryCore;
    scope: ScopeRef;
    nodeInstance?: ImportContextNodeInstance;
  }): ImportFrame | undefined;
  pop(frameId: string): void;
  resolveAlias(alias: string, frameId?: string): ImportStackEntry | undefined;
  currentBindings(frameId?: string): Readonly<Record<string, unknown>>;
  dispose(): void;
}

export interface ExpressionCompileOptions {
  libraryNames?: ReadonlySet<string>;
  symbolTable?: CompileSymbolTable;
  sourcePath?: string;
  transform?: (value: unknown) => unknown;
  reportDiagnostic?: (issue: {
    code: SchemaDiagnosticCode;
    message: string;
    path: string;
    severity?: SchemaDiagnosticSeverity;
    source?: SchemaDiagnosticSource;
    cause?: unknown;
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

export interface ExpressionCompiler extends CompiledValueEvaluator {
  formulaCompiler: FormulaCompiler;
  compileNode<T = unknown>(input: T, options?: ExpressionCompileOptions): CompiledValueNode<T>;
  compileValue<T = unknown>(input: T, options?: ExpressionCompileOptions): CompiledRuntimeValue<T>;
  createState<T = unknown>(input: DynamicRuntimeValue<T>): RuntimeValueState<T>;
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

  /** Formula source expression (when kind === 'formula') */
  formula?: CompiledRuntimeValue<unknown>;

  /** Compiled action producer (when kind === 'action') */
  action?: CompiledActionProgram;

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

  /**
   * Compiled sendOn gate (raw boolean expression). When evaluated falsy (or when
   * evaluation throws) the refresh is skipped. Only consumed by action-kind sources.
   */
  sendOn?: CompiledRuntimeValue<boolean>;

  /**
   * Compiled initFetch gate. When explicitly `false`, the controller skips the
   * first automatic fetch on start (the source is still registered). Only consumed
   * by action-kind sources.
   */
  initFetch?: CompiledRuntimeValue<boolean>;

  /**
   * Compiled onSuccess lifecycle action. Dispatched with payload
   * `{ data, dataUpdatedAt }` after each successful fetch. Only consumed by
   * action-kind sources.
   */
  onSuccess?: CompiledActionProgram;

  /**
   * Compiled onError lifecycle action. Dispatched with payload
   * `{ error, failureCount }` after each failed fetch. Only consumed by
   * action-kind sources.
   */
  onError?: CompiledActionProgram;
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
