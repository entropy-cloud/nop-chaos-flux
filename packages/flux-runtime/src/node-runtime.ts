import type {
  CompiledNodeLinkage,
  CompiledNodeLinkageEffect,
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

export function collectRuntimeDependencies(state: RuntimeValueState<unknown> | undefined): ScopeDependencySet | undefined {
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

function createDependencySet(paths: readonly string[] | undefined): ScopeDependencySet | undefined {
  if (!paths || paths.length === 0) {
    return undefined;
  }

  return {
    paths: Array.from(new Set(paths)).sort(),
    wildcard: paths.includes('*'),
    broadAccess: paths.includes('*')
  };
}

function evaluateLinkageEffect(
  effect: CompiledNodeLinkageEffect | undefined,
  compiler: ExpressionCompiler,
  scope: ScopeRef,
  env: RendererEnv,
  stateBucket: Record<string, RuntimeValueState<unknown>> | undefined
) {
  return {
    visible: evaluateCompiledValue(compiler, effect?.visible, scope, env, stateBucket?.visible),
    disabled: evaluateCompiledValue(compiler, effect?.disabled, scope, env, stateBucket?.disabled),
    required: evaluateCompiledValue(compiler, effect?.required, scope, env, stateBucket?.required),
    options: evaluateCompiledValue(compiler, effect?.options, scope, env, stateBucket?.options)
  };
}

function collectLinkageDependencies(
  linkage: CompiledNodeLinkage | undefined,
  state: CompiledNodeRuntimeState | undefined,
  target: 'meta' | 'props'
): ScopeDependencySet | undefined {
  if (!linkage || !state?.linkage) {
    return createDependencySet(linkage?.dependencies);
  }

  const explicit = createDependencySet(linkage.dependencies);
  const effectBucket = state.linkage.fulfill && target === 'meta'
    ? [state.linkage.fulfill.visible, state.linkage.fulfill.disabled]
    : state.linkage.fulfill && target === 'props'
      ? [state.linkage.fulfill.required, state.linkage.fulfill.options]
      : [];
  const otherwiseBucket = state.linkage.otherwise && target === 'meta'
    ? [state.linkage.otherwise.visible, state.linkage.otherwise.disabled]
    : state.linkage.otherwise && target === 'props'
      ? [state.linkage.otherwise.required, state.linkage.otherwise.options]
      : [];

  return mergeDependencySets([
    explicit,
    collectRuntimeDependencies(state.linkage.when),
    ...effectBucket.map((entry) => collectRuntimeDependencies(entry)),
    ...otherwiseBucket.map((entry) => collectRuntimeDependencies(entry))
  ]);
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
      changed: true,
      cid: node.cid,
    };

    if (node.linkage) {
      const whenResult = Boolean(evaluateCompiledValue(input.expressionCompiler, node.linkage.when, scope, env, state?.linkage?.when) ?? false);
      const branch = whenResult ? node.linkage.fulfill : node.linkage.otherwise;
      const branchValues = evaluateLinkageEffect(branch, input.expressionCompiler, scope, env, whenResult ? state?.linkage?.fulfill : state?.linkage?.otherwise);

      if (branchValues.visible !== undefined) {
        resolved.visible = Boolean(branchValues.visible);
      }

      if (branchValues.disabled !== undefined) {
        resolved.disabled = Boolean(branchValues.disabled);
      }
    }

    if (state?.resolvedMeta && shallowEqual(state.resolvedMeta, resolved)) {
      state.metaDependencies = mergeDependencySets([collectMetaDependencies(state), collectLinkageDependencies(node.linkage, state, 'meta')]);
      state.resolvedMeta.changed = false;
      return state.resolvedMeta;
    }

    if (state) {
      state.metaDependencies = mergeDependencySets([collectMetaDependencies(state), collectLinkageDependencies(node.linkage, state, 'meta')]);
      state.resolvedMeta = resolved;
    }

    return resolved;
  }

  function resolveNodeProps(node: CompiledSchemaNode, scope: ScopeRef, state?: CompiledNodeRuntimeState): ResolvedNodeProps {
    const env = input.getEnv();
    const execution = node.props.kind === 'static'
      ? (state?._staticPropsResult ?? {
          value: node.props.value,
          changed: false,
          reusedReference: true
        })
      : input.expressionCompiler.evaluateWithState(
          node.props,
          scope,
          env,
          state?.props ?? node.props.createState()
        );

    if (node.props.kind === 'static' && state && !state._staticPropsResult) {
      state._staticPropsResult = execution;
    }

    let nextValue = execution.value;

    if (node.linkage) {
      const env = input.getEnv();
      const whenResult = Boolean(evaluateCompiledValue(input.expressionCompiler, node.linkage.when, scope, env, state?.linkage?.when) ?? false);
      const branch = whenResult ? node.linkage.fulfill : node.linkage.otherwise;
      const branchValues = evaluateLinkageEffect(branch, input.expressionCompiler, scope, env, whenResult ? state?.linkage?.fulfill : state?.linkage?.otherwise);
      const overrides: Record<string, unknown> = {};

      if (branchValues.required !== undefined) {
        overrides.required = Boolean(branchValues.required);
      }

      if (branchValues.options !== undefined) {
        overrides.options = branchValues.options;
      }

      if (Object.keys(overrides).length > 0) {
        nextValue = {
          ...nextValue,
          ...overrides
        };
      }
    }

    const result = nextValue === execution.value
      ? execution
      : {
          value: nextValue,
          changed: true,
          reusedReference: false
        };

    if (state) {
      state.resolvedProps = result.value;
      state.propsDependencies = mergeDependencySets([collectRuntimeDependencies(state.props), collectLinkageDependencies(node.linkage, state, 'props')]);
      if (!result.reusedReference) {
        state._lastPropsResult = result;
      }
    }

    return result;
  }

  return {
    resolveNodeMeta,
    resolveNodeProps
  };
}
