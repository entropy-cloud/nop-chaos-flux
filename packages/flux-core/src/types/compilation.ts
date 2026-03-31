import type { EvalContext, ScopeRef } from './scope';
import type { RendererEnv } from './renderer';

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
  compileNode<T = unknown>(input: T): CompiledValueNode<T>;
  compileValue<T = unknown>(input: T): CompiledRuntimeValue<T>;
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
