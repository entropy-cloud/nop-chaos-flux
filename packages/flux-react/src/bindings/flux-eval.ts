import {
  getIn,
  type ExpressionCompiler,
  type RendererEnv,
  type ScopeDependencySet,
  type ScopeRef,
} from '@nop-chaos/flux-core';

/**
 * Shared binding-expression evaluation core (cq-4 Phase 1) — previously
 * duplicated verbatim across flux-renderers-3d and flux-renderers-industrial
 * (design-data-binding.md §2/§9.1). Callers pin their scope `id`; the
 * value-domain policy (3d lenient arrays/objects vs industrial
 * ScadaPrimitive-constrained) stays in the caller packages.
 */

/**
 * Read-only private eval scope (INV-4: not schema-visible). Callers merge
 * `{...base, ...scopeData}` before injecting.
 */
export function createPrivateEvalScope(
  data: Record<string, unknown>,
  id: string,
): ScopeRef {
  return {
    id,
    path: '$',
    value: data,
    get(path: string) {
      return getIn(data, path);
    },
    has(path: string) {
      return getIn(data, path) !== undefined;
    },
    readOwn: () => data,
    readVisible: () => data,
    materializeVisible: () => data,
    update: () => undefined,
    merge: () => undefined,
  };
}

function createTolerantProbeScopeData(id: string): Record<string, unknown> {
  void id;
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, property) {
      if (typeof property !== 'string') return undefined;
      if (property === '__proto__' || property === 'constructor' || property === 'prototype') return undefined;
      if (property === 'valueOf') return () => 0;
      if (property === 'toString') return () => '';
      if (property === 'length') return 0;
      return new Proxy({} as Record<string, unknown>, handler);
    },
    has() {
      return true;
    },
  };
  return new Proxy({} as Record<string, unknown>, handler);
}

export type ExpressionDepsProbeResult =
  | { status: 'ok'; paths: string[] }
  | { status: 'compile-failed' }
  | { status: 'create-state-failed' }
  | { status: 'evaluate-failed' }
  | { status: 'deps-empty' };

/**
 * Complex expressions yield subscription paths via the platform dependency
 * collector: compile + probe evaluation over a tolerant Proxy scope + read
 * `state.root.dependencies.paths`. `scopeId` pins the eval-scope identity of
 * the calling family.
 */
export function extractExpressionDepsViaProbe(
  compiler: ExpressionCompiler,
  env: RendererEnv,
  expression: string,
  scopeId: string,
): ExpressionDepsProbeResult {
  let compiled: ReturnType<ExpressionCompiler['compileValue']>;
  try {
    compiled = compiler.compileValue(expression);
  } catch {
    return { status: 'compile-failed' };
  }
  if (compiled.kind !== 'dynamic') return { status: 'ok', paths: [] };
  let state: ReturnType<ExpressionCompiler['createState']>;
  try {
    state = compiler.createState(compiled);
  } catch {
    return { status: 'create-state-failed' };
  }
  const probeScope = createPrivateEvalScope(createTolerantProbeScopeData(scopeId), scopeId);
  try {
    compiler.evaluateWithState(compiled, probeScope, env, state);
  } catch {
    return { status: 'evaluate-failed' };
  }
  const root = state.root;
  if (root.kind !== 'leaf-state') return { status: 'deps-empty' };
  const deps: ScopeDependencySet | undefined = root.dependencies;
  if (!deps || deps.wildcard) return { status: 'deps-empty' };
  const paths = [...deps.paths];
  if (paths.length === 0) return { status: 'deps-empty' };
  return { status: 'ok', paths };
}

export interface FluxEvalContext {
  compiler: ExpressionCompiler;
  env: RendererEnv;
}

/**
 * Extract scope paths from a `${expr}` binding expression. Returns [] when
 * compiler/env are unavailable (backward compatible).
 */
export function probeExpressionPaths(
  expression: string,
  context: FluxEvalContext | undefined,
  scopeId: string,
  normalize: (expression: string) => string = (raw) => {
    const trimmed = raw.trim();
    return trimmed.startsWith('${') ? trimmed : `\${${trimmed}}`;
  },
): string[] {
  if (!context) return [];
  const normalized = normalize(expression);
  const result = extractExpressionDepsViaProbe(context.compiler, context.env, normalized, scopeId);
  return result.status === 'ok' ? result.paths : [];
}
