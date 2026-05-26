import type { ExpressionExecutionEnv } from './expression-env-types.js';
import type { EvalContext, ScopeDependencySet, ScopeRef } from './scope.js';

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

export interface CompiledExpression<T = unknown> {
  kind: 'expression';
  source: string;
  staticValue?: T;
  exec(context: EvalContext | object, env: ExpressionExecutionEnv): T;
}

export interface CompiledStringTemplate<T = unknown> {
  kind: 'template';
  source: string;
  staticValue?: T;
  exec(context: EvalContext | object, env: ExpressionExecutionEnv): T;
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
  transform?: (value: unknown) => unknown;
  createState(): RuntimeValueState<T>;
  exec(
    context: EvalContext,
    env: ExpressionExecutionEnv,
    state?: RuntimeValueState<T>,
  ): ValueEvaluationResult<T>;
}

export type CompiledRuntimeValue<T = unknown> = StaticRuntimeValue<T> | DynamicRuntimeValue<T>;

export interface CompiledValueEvaluator {
  evaluateValue<T = unknown>(
    input: CompiledRuntimeValue<T>,
    scope: ScopeRef,
    env: ExpressionExecutionEnv,
    state?: RuntimeValueState<T>,
  ): T;
  evaluateWithState<T = unknown>(
    input: DynamicRuntimeValue<T>,
    scope: ScopeRef,
    env: ExpressionExecutionEnv,
    state: RuntimeValueState<T>,
  ): ValueEvaluationResult<T>;
}
