import type {
  NodeRuntimeState,
  CompiledRuntimeValue,
  TemplateNode,
  ExpressionCompiler,
  RendererEnv,
  ResolvedNodeMeta,
  ResolvedNodeProps,
  RuntimeValueState,
  ScopeDependencySet,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { shallowEqual } from '@nop-chaos/flux-core';

function mergeDependencySets(
  sets: Array<ScopeDependencySet | undefined>,
): ScopeDependencySet | undefined {
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
    broadAccess,
  };
}

function evaluateCompiledValue<T>(
  compiler: ExpressionCompiler,
  value: CompiledRuntimeValue<T> | undefined,
  scope: ScopeRef,
  env: RendererEnv,
  state?: RuntimeValueState<unknown>,
): T | undefined {
  if (!value) {
    return undefined;
  }

  return compiler.evaluateValue(value, scope, env, state) as T | undefined;
}

export function collectRuntimeDependencies(
  state: RuntimeValueState<unknown> | undefined,
): ScopeDependencySet | undefined {
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
    broadAccess,
  };
}

function collectMetaDependencies(
  state: NodeRuntimeState | undefined,
): ScopeDependencySet | undefined {
  if (!state) {
    return undefined;
  }

  const sets: Array<ScopeDependencySet | undefined> = Object.values(state.meta).map(
    collectRuntimeDependencies,
  );

  return mergeDependencySets(sets);
}

export function createNodeRuntime(input: {
  expressionCompiler: ExpressionCompiler;
  getEnv: () => RendererEnv;
}) {
  function resolveNodeMeta(
    node: TemplateNode,
    scope: ScopeRef,
    state?: NodeRuntimeState,
  ): ResolvedNodeMeta {
    const env = input.getEnv();
    const meta = node.metaProgram;
    const resolved: ResolvedNodeMeta = {
      id: evaluateCompiledValue(input.expressionCompiler, meta.id, scope, env, state?.meta.id),
      className: evaluateCompiledValue(
        input.expressionCompiler,
        meta.className,
        scope,
        env,
        state?.meta.className,
      ),
      visible: Boolean(
        evaluateCompiledValue(
          input.expressionCompiler,
          meta.visible,
          scope,
          env,
          state?.meta.visible,
        ) ?? true,
      ),
      hidden: Boolean(
        evaluateCompiledValue(
          input.expressionCompiler,
          meta.hidden,
          scope,
          env,
          state?.meta.hidden,
        ) ?? false,
      ),
      disabled: Boolean(
        evaluateCompiledValue(
          input.expressionCompiler,
          meta.disabled,
          scope,
          env,
          state?.meta.disabled,
        ) ?? false,
      ),
      testid: evaluateCompiledValue(
        input.expressionCompiler,
        meta.testid,
        scope,
        env,
        state?.meta.testid,
      ),
      changed: true,
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

  function resolveNodeProps(
    node: TemplateNode,
    scope: ScopeRef,
    state?: NodeRuntimeState,
  ): ResolvedNodeProps {
    const env = input.getEnv();
    const propsProgram = node.propsProgram;
    const execution =
      propsProgram.kind === 'static'
        ? (state?._staticPropsResult ?? {
            value: propsProgram.value,
            changed: false,
            reusedReference: true,
          })
        : input.expressionCompiler.evaluateWithState(
            propsProgram,
            scope,
            env,
            state?.props ?? propsProgram.createState(),
          );

    if (propsProgram.kind === 'static' && state && !state._staticPropsResult) {
      state._staticPropsResult = execution;
    }

    const result = execution;

    if (state) {
      state.resolvedProps = result.value;
      state.propsDependencies = collectRuntimeDependencies(state.props);
      if (!result.reusedReference) {
        state._lastPropsResult = result;
      }
    }

    return result;
  }

  return {
    resolveNodeMeta,
    resolveNodeProps,
  };
}
