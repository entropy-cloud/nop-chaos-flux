import type {
  CompiledRuntimeValue,
  CompiledValueNode,
  DynamicRuntimeValue,
  EvalContext,
  ExpressionCompiler,
  FormulaCompiler,
  RendererEnv,
  RuntimeValueState,
  ScopeRef,
  StaticRuntimeValue,
  ValueEvaluationResult
} from '@nop-chaos/flux-core';
import { compileNode, createFormulaCompiler } from './compile';
import { createEvalContext, createStateFromNode, evaluateNode } from './evaluate';

export { createFormulaCompiler } from './compile';

export function createExpressionCompiler(formulaCompiler: FormulaCompiler = createFormulaCompiler()): ExpressionCompiler {
  return {
    formulaCompiler,
    compileNode<T = unknown>(input: T): CompiledValueNode<T> {
      return compileNode(input, formulaCompiler);
    },
    compileValue<T = unknown>(input: T): CompiledRuntimeValue<T> {
      const node = compileNode(input, formulaCompiler);

      if (node.kind === 'static-node') {
        return {
          kind: 'static',
          isStatic: true,
          node,
          value: node.value
        } as StaticRuntimeValue<T>;
      }

      return {
        kind: 'dynamic',
        isStatic: false,
        node,
        createState() {
          return createStateFromNode(node);
        },
        exec(context: EvalContext, env: RendererEnv, state?: RuntimeValueState<T>) {
          const resolvedState = state ?? createStateFromNode(node);
          return evaluateNode(node, context, env, resolvedState.root);
        }
      } as DynamicRuntimeValue<T>;
    },
    createState<T = unknown>(input: DynamicRuntimeValue<T>): RuntimeValueState<T> {
      return input.createState();
    },
    evaluateValue<T = unknown>(
      input: CompiledRuntimeValue<T>,
      scope: ScopeRef,
      env: RendererEnv,
      state?: RuntimeValueState<T>
    ): T {
      if (input.kind === 'static') {
        return input.value;
      }

      return input.exec(createEvalContext(scope), env, state).value;
    },
    evaluateWithState<T = unknown>(
      input: DynamicRuntimeValue<T>,
      scope: ScopeRef,
      env: RendererEnv,
      state: RuntimeValueState<T>
    ): ValueEvaluationResult<T> {
      return input.exec(createEvalContext(scope), env, state);
    }
  };
}
