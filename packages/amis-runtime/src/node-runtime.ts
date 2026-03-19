import type {
  CompiledNodeRuntimeState,
  CompiledRuntimeValue,
  CompiledSchemaNode,
  ExpressionCompiler,
  RendererEnv,
  ResolvedNodeMeta,
  ResolvedNodeProps,
  ScopeRef
} from '@nop-chaos/amis-schema';
import { shallowEqual } from '@nop-chaos/amis-schema';

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
  env: RendererEnv;
}) {
  function resolveNodeMeta(node: CompiledSchemaNode, scope: ScopeRef, state?: CompiledNodeRuntimeState): ResolvedNodeMeta {
    const resolved: ResolvedNodeMeta = {
      id: evaluateCompiledValue(input.expressionCompiler, node.meta.id, scope, input.env, state?.meta.id),
      name: evaluateCompiledValue(input.expressionCompiler, node.meta.name, scope, input.env, state?.meta.name),
      label: evaluateCompiledValue(input.expressionCompiler, node.meta.label, scope, input.env, state?.meta.label),
      title: evaluateCompiledValue(input.expressionCompiler, node.meta.title, scope, input.env, state?.meta.title),
      className: evaluateCompiledValue(input.expressionCompiler, node.meta.className, scope, input.env, state?.meta.className),
      visible: Boolean(evaluateCompiledValue(input.expressionCompiler, node.meta.visible, scope, input.env, state?.meta.visible) ?? true),
      hidden: Boolean(evaluateCompiledValue(input.expressionCompiler, node.meta.hidden, scope, input.env, state?.meta.hidden) ?? false),
      disabled: Boolean(evaluateCompiledValue(input.expressionCompiler, node.meta.disabled, scope, input.env, state?.meta.disabled) ?? false),
      changed: true
    };

    if (state?.resolvedMeta && shallowEqual(state.resolvedMeta, resolved)) {
      return {
        ...state.resolvedMeta,
        changed: false
      };
    }

    if (state) {
      state.resolvedMeta = resolved;
    }

    return resolved;
  }

  function resolveNodeProps(node: CompiledSchemaNode, scope: ScopeRef, state?: CompiledNodeRuntimeState): ResolvedNodeProps {
    if (node.props.kind === 'static') {
      return {
        value: node.props.value,
        changed: false,
        reusedReference: true
      };
    }

    const execution = input.expressionCompiler.evaluateWithState(
      node.props,
      scope,
      input.env,
      state?.props ?? node.props.createState()
    );

    if (state) {
      state.resolvedProps = execution.value;
    }

    return execution;
  }

  return {
    resolveNodeMeta,
    resolveNodeProps
  };
}
