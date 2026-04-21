import type { ActionNamespaceProvider, ActionScope, ImportedLibraryModule } from './actions';
import type { EvalContext, ScopeDependencySet, ScopeRef } from './scope';
import type { RendererEnv } from './renderer';

export type CompileSymbolKind =
  | 'builtin-namespace'
  | 'import-alias'
  | 'injected-local'
  | 'slot-root'
  | 'ambient';

export interface SymbolInfo {
  name: string;
  kind: CompileSymbolKind;
  members?: readonly string[];
}

export interface SymbolFrame {
  id: string;
  kind: 'root' | 'imports' | 'region' | 'owner';
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
}

export interface ImportFrame {
  id: string;
  ownerNodeId: string;
  parentFrameId?: string;
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
  compileExpression<T = unknown>(source: string, options?: ExpressionCompileOptions): CompiledExpression<T>;
  compileTemplate<T = unknown>(source: string, options?: ExpressionCompileOptions): CompiledStringTemplate<T>;
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
  exec(context: EvalContext, env: RendererEnv, state?: RuntimeValueState<T>): ValueEvaluationResult<T>;
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
    state?: RuntimeValueState<T>
  ): T;
  evaluateWithState<T = unknown>(
    input: DynamicRuntimeValue<T>,
    scope: ScopeRef,
    env: RendererEnv,
    state: RuntimeValueState<T>
  ): ValueEvaluationResult<T>;
}
