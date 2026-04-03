import type {
  CompiledNodeRuntimeState,
  CompiledRuntimeValue,
  CompiledSchemaNode,
  ExpressionCompiler,
  RendererEnv,
  ResolvedNodeMeta,
  ResolvedNodeProps,
  ScopeRef
} from '@nop-chaos/flux-core';
import { shallowEqual } from '@nop-chaos/flux-core';

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

export function createNodeRuntime(input: {
  expressionCompiler: ExpressionCompiler;
  getEnv: () => RendererEnv;
}) {
  function resolveNodeMeta(node: CompiledSchemaNode, scope: ScopeRef, state?: CompiledNodeRuntimeState): ResolvedNodeMeta {
    const env = input.getEnv();
    const resolved: ResolvedNodeMeta = {
      id: evaluateCompiledValue(input.expressionCompiler, node.meta.id, scope, env, state?.meta.id),
      name: evaluateCompiledValue(input.expressionCompiler, node.meta.name, scope, env, state?.meta.name),
      label: evaluateCompiledValue(input.expressionCompiler, node.meta.label, scope, env, state?.meta.label),
      title: evaluateCompiledValue(input.expressionCompiler, node.meta.title, scope, env, state?.meta.title),
      className: evaluateCompiledValue(input.expressionCompiler, node.meta.className, scope, env, state?.meta.className),
      visible: Boolean(evaluateCompiledValue(input.expressionCompiler, node.meta.visible, scope, env, state?.meta.visible) ?? true),
      hidden: Boolean(evaluateCompiledValue(input.expressionCompiler, node.meta.hidden, scope, env, state?.meta.hidden) ?? false),
      disabled: Boolean(evaluateCompiledValue(input.expressionCompiler, node.meta.disabled, scope, env, state?.meta.disabled) ?? false),
      testid: evaluateCompiledValue(input.expressionCompiler, node.meta.testid, scope, env, state?.meta.testid),
      changed: true
    };

    if (state?.resolvedMeta && shallowEqual(state.resolvedMeta, resolved)) {
      state.resolvedMeta.changed = false;
      return state.resolvedMeta;
    }

    if (state) {
      state.resolvedMeta = resolved;
    }

    return resolved;
  }

  function resolveNodeProps(node: CompiledSchemaNode, scope: ScopeRef, state?: CompiledNodeRuntimeState): ResolvedNodeProps {
    if (node.props.kind === 'static') {
      if (state?._staticPropsResult) {
        return state._staticPropsResult;
      }
      const result: ResolvedNodeProps = {
        value: node.props.value,
        changed: false,
        reusedReference: true
      };
      if (state) {
        state._staticPropsResult = result;
      }
      return result;
    }

    const env = input.getEnv();
    const execution = input.expressionCompiler.evaluateWithState(
      node.props,
      scope,
      env,
      state?.props ?? node.props.createState()
    );

    if (state) {
      state.resolvedProps = execution.value;
      if (!execution.reusedReference) {
        state._lastPropsResult = execution;
      }
    }

    return execution;
  }

  return {
    resolveNodeMeta,
    resolveNodeProps
  };
}
