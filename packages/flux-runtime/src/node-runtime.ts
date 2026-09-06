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

function normalizeBooleanLike(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function projectRendererFacingMeta(input: {
  disabled?: boolean;
  className?: string;
  frameClassName?: string;
  testid?: string;
}): Record<string, unknown> {
  return {
    disabled: input.disabled,
    className: input.className,
    frameClassName: input.frameClassName,
    testid: input.testid,
    cid: undefined,
  };
}

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

const WILDCARD_DEPENDENCIES: ScopeDependencySet = {
  paths: ['*'],
  wildcard: true,
  broadAccess: true,
};

/**
 * Reference-stable empty-props fallback for the unpopulated-scope tolerance
 * in `resolveNodeProps`. A module-level frozen object keeps the equality gate
 * in node-renderer-resolved (`prev.resolvedProps.value === next.resolvedProps.value`)
 * satisfied across pending re-resolutions, avoiding child re-render churn.
 */
const EMPTY_NODE_PROPS: Record<string, unknown> = Object.freeze({});

/**
 * Matches "member access on a scope variable that has not been published
 * yet" — the same sentinel tolerated by the stopWhen evaluation precedent
 * (api-data-source-controller-state). The wrapped error comes from the
 * formula compiler (`Expression evaluation failed for: …` /
 * `Template evaluation failed for: …`, cause = the evaluator's null/undefined
 * member access error).
 */
function isUnpopulatedScopeError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.cause instanceof Error &&
    error.cause.message === 'Cannot access member of null or undefined'
  );
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

  try {
    // Safe: evaluateValue returns a value conforming to T by construction.
    return compiler.evaluateValue(value, scope, env, state) as T | undefined;
  } catch (error) {
    if (!isUnpopulatedScopeError(error)) {
      throw error;
    }
    // Meta expressions (when/visible/className/...) evaluated before their
    // data-source variable is published: resolve to undefined so renderer
    // defaults apply (visible→true, hidden→false, ...). The partially
    // collected dependencies (F1) keep the meta subscription armed, so the
    // meta re-resolves once the variable is published. Mirrors the stopWhen
    // tolerance precedent. No dev warn here: meta fires per node per pass and
    // the props-level tolerance already logs the mount-order signal.
    return undefined;
  }
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
    const structuralWhen =
      node.structuralWhen === undefined
        ? evaluateCompiledValue(input.expressionCompiler, meta.when, scope, env, state?.meta.when)
        : evaluateCompiledValue(
            input.expressionCompiler,
            node.structuralWhen,
            scope,
            env,
            state?.meta.when,
          );
    const resolved: ResolvedNodeMeta = {
      id: evaluateCompiledValue(input.expressionCompiler, meta.id, scope, env, state?.meta.id),
      className: evaluateCompiledValue(
        input.expressionCompiler,
        meta.className,
        scope,
        env,
        state?.meta.className,
      ),
      frameClassName: evaluateCompiledValue(
        input.expressionCompiler,
        meta.frameClassName,
        scope,
        env,
        state?.meta.frameClassName,
      ),
      when: normalizeBooleanLike(structuralWhen) ?? true,
      visible:
        normalizeBooleanLike(
          evaluateCompiledValue(
            input.expressionCompiler,
            meta.visible,
            scope,
            env,
            state?.meta.visible,
          ),
        ) ?? true,
      hidden:
        normalizeBooleanLike(
          evaluateCompiledValue(
            input.expressionCompiler,
            meta.hidden,
            scope,
            env,
            state?.meta.hidden,
          ),
        ) ?? false,
      disabled:
        normalizeBooleanLike(
          evaluateCompiledValue(
            input.expressionCompiler,
            meta.disabled,
            scope,
            env,
            state?.meta.disabled,
          ),
        ) ?? false,
      testid: evaluateCompiledValue(
        input.expressionCompiler,
        meta.testid,
        scope,
        env,
        state?.meta.testid,
      ),
      frameWrap: evaluateCompiledValue(
        input.expressionCompiler,
        // Safe: compiled meta program produces the correct type for frameWrap.
        meta.frameWrap as CompiledRuntimeValue<boolean | 'label' | 'group' | 'none' | undefined> | undefined,
        scope,
        env,
        // Safe: state mirrors the compiled program structure.
        state?.meta.frameWrap as RuntimeValueState<unknown> | undefined,
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
    let execution: ResolvedNodeProps;
    if (propsProgram.kind === 'static') {
      // Safe: object literal matches ResolvedNodeProps shape; _staticPropsResult is already typed.
      execution = (state?._staticPropsResult ?? {
        value: propsProgram.value,
        changed: false,
        reusedReference: true,
      }) as ResolvedNodeProps;
    } else {
      try {
        execution = input.expressionCompiler.evaluateWithState(
          propsProgram,
          scope,
          env,
          state?.props ?? propsProgram.createState(),
        );
      } catch (error) {
        if (!isUnpopulatedScopeError(error)) {
          throw error;
        }
        // Scope not yet populated (upstream data source has not published).
        // Fall back to a reference-stable pending result instead of throwing
        // through React render (which would latch NodeErrorBoundary). The
        // partial dependencies collected before the throw (recorded by the
        // evaluator even on failure) are written back to propsDependencies so
        // the node re-resolves once the variable is published. Mirrors the
        // stopWhen tolerance precedent.
        if (
          (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV !==
          'production'
        ) {
          console.warn(
            `[node-runtime] null-member access during props resolution (scope may not yet have data): node=${
              node.id ?? 'unknown'
            }`,
          );
        }
        if (!state) {
          return { value: EMPTY_NODE_PROPS, changed: false, reusedReference: true };
        }
        if (!state._pendingPropsResult) {
          // Last successfully resolved props win (graceful degradation);
          // otherwise the shared frozen empty object keeps references stable.
          state._pendingPropsResult = {
            value: state.resolvedProps ?? EMPTY_NODE_PROPS,
            changed: false,
            reusedReference: true,
          };
        }
        state.propsDependencies = mergeDependencySets([
          collectRuntimeDependencies(state.props),
          ...Object.values(node.structuralFields ?? {}).map((f) =>
            f.kind === 'dynamic' ? WILDCARD_DEPENDENCIES : undefined,
          ),
        ]);
        return state._pendingPropsResult;
      }
    }

    if (propsProgram.kind === 'static' && state && !state._staticPropsResult) {
      state._staticPropsResult = execution;
    }

    const result = execution;
    // Safe: props are always a Record<string, unknown> by schema contract.
    const propsValue = result.value as Record<string, unknown>;
    const projectedProps = projectRendererFacingMeta({
      disabled: normalizeBooleanLike(
        evaluateCompiledValue(
          input.expressionCompiler,
          node.metaProgram.disabled,
          scope,
          env,
          state?.meta.disabled,
        ),
      ),
      className: evaluateCompiledValue(
        input.expressionCompiler,
        node.metaProgram.className,
        scope,
        env,
        state?.meta.className,
      ),
      frameClassName: evaluateCompiledValue(
        input.expressionCompiler,
        node.metaProgram.frameClassName,
        scope,
        env,
        state?.meta.frameClassName,
      ),
      testid: evaluateCompiledValue(
        input.expressionCompiler,
        node.metaProgram.testid,
        scope,
        env,
        state?.meta.testid,
      ),
    });
    const finalValue = Object.assign({}, projectedProps, propsValue);
    // Safe: _lastPropsResult.value is always a Record from the same props pipeline.
    const lastProjectedValue = state?._lastPropsResult?.value as Record<string, unknown> | undefined;
    const finalResult =
      lastProjectedValue && shallowEqual(lastProjectedValue, finalValue)
        ? { ...result, value: lastProjectedValue, changed: false, reusedReference: true }
        : { ...result, value: finalValue };

    if (state) {
      state.resolvedProps = finalResult.value;
      state.propsDependencies = mergeDependencySets([
        collectRuntimeDependencies(state.props),
        ...Object.values(node.structuralFields ?? {}).map((f) =>
          f.kind === 'dynamic' ? WILDCARD_DEPENDENCIES : undefined,
        ),
      ]);
      if (!finalResult.reusedReference) {
        state._lastPropsResult = finalResult;
      }
    }

    return finalResult;
  }

  return {
    resolveNodeMeta,
    resolveNodeProps,
  };
}
