import type {
  CompiledNodeRuntimeState,
  CompiledRuntimeValue,
  CompiledSchemaNode,
  ExpressionCompiler,
  RendererEnv,
  ResolvedNodeMeta,
  ResolvedNodeProps,
  RuntimeValueState,
  ScopeDependencySet,
  ScopeRef
} from '@nop-chaos/flux-core';
import { shallowEqual } from '@nop-chaos/flux-core';

function mergeDependencySets(sets: Array<ScopeDependencySet | undefined>): ScopeDependencySet | undefined {
  const paths = new Set<string>();
  let wildcard = false;
  let broadAccess = false;

  for (const set of sets) {
    if (!set) {
      continue;
    }

    wildcard = wildcard || set.wildcard;
    broadAccess = broadAccess || set.broadAccess;

    for (const path of set.paths) {
      if (path === '*') {
        wildcard = true;
        broadAccess = true;
      } else {
        paths.add(path);
      }
    }
  }

  if (!wildcard && paths.size === 0 && !broadAccess) {
    return undefined;
  }

  return {
    paths: wildcard ? ['*'] : Array.from(paths).sort(),
    wildcard,
    broadAccess
  };
}

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

function collectRuntimeDependencies(state: RuntimeValueState<unknown> | undefined): ScopeDependencySet | undefined {
  if (!state) {
    return undefined;
  }

  const paths = new Set<string>();
  let wildcard = false;
  let broadAccess = false;

  function visit(node: RuntimeValueState['root']) {
    if (node.kind === 'leaf-state') {
      if (!node.dependencies) {
        return;
      }

      wildcard = wildcard || node.dependencies.wildcard;
      broadAccess = broadAccess || node.dependencies.broadAccess;

      for (const path of node.dependencies.paths) {
        if (path === '*') {
          wildcard = true;
          broadAccess = true;
        } else {
          paths.add(path);
        }
      }
      return;
    }

    if (node.kind === 'array-state') {
      node.items.forEach(visit);
      return;
    }

    Object.values(node.entries).forEach(visit);
  }

  visit(state.root);

  return {
    paths: wildcard ? ['*'] : Array.from(paths).sort(),
    wildcard,
    broadAccess
  };
}

function collectMetaDependencies(state: CompiledNodeRuntimeState | undefined): ScopeDependencySet | undefined {
  if (!state) {
    return undefined;
  }

  return mergeDependencySets(Object.values(state.meta).map((entry) => collectRuntimeDependencies(entry)));
}

export function createNodeRuntime(input: {
  expressionCompiler: ExpressionCompiler;
  getEnv: () => RendererEnv;
}) {
  function resolveNodeMeta(node: CompiledSchemaNode, scope: ScopeRef, state?: CompiledNodeRuntimeState): ResolvedNodeMeta {
    const env = input.getEnv();
    const cidFromSchema = (node.schema as unknown as { _cid?: unknown })._cid;
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
      changed: true,
      cid: typeof cidFromSchema === 'number' ? cidFromSchema : undefined,
    };

    if (state?.resolvedMeta && shallowEqual(state.resolvedMeta, resolved)) {
      state.metaDependencies = collectMetaDependencies(state);
      state.resolvedMeta.changed = false;
      return state.resolvedMeta;
    }

    if (state) {
      state.metaDependencies = collectMetaDependencies(state);
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
      state.propsDependencies = collectRuntimeDependencies(state.props);
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
