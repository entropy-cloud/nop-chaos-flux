import type {
  ApiSchema,
  CompiledApiConfig,
  CompiledRuntimeValue,
  DynamicRuntimeValue,
  RendererRuntime,
  RuntimeValueState,
  SchemaValue,
  ScopeDependencySet,
  ScopeRef,
  StaticRuntimeValue
} from '@nop-chaos/flux-core';
import { collectRuntimeDependencies } from '../node-runtime';

export { collectRuntimeDependencies };

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function applyMergeStrategy(input: {
  currentValue: unknown;
  nextValue: unknown;
  mergeStrategy?: 'replace' | 'append' | 'prepend' | 'merge' | 'upsert';
  mergeKey?: string;
}): unknown {
  const strategy = input.mergeStrategy ?? 'replace';

  if (strategy === 'replace') {
    return input.nextValue;
  }

  if (strategy === 'append') {
    const currentItems = Array.isArray(input.currentValue) ? input.currentValue : [];
    const nextItems = Array.isArray(input.nextValue) ? input.nextValue : [];
    return [...currentItems, ...nextItems];
  }

  if (strategy === 'prepend') {
    const currentItems = Array.isArray(input.currentValue) ? input.currentValue : [];
    const nextItems = Array.isArray(input.nextValue) ? input.nextValue : [];
    return [...nextItems, ...currentItems];
  }

  if (strategy === 'merge') {
    if (isObjectRecord(input.currentValue) && isObjectRecord(input.nextValue)) {
      return { ...input.currentValue, ...input.nextValue };
    }

    return input.nextValue;
  }

  if (strategy === 'upsert') {
    const mergeKey = input.mergeKey;
    if (!mergeKey) {
      return input.nextValue;
    }

    const currentItems = Array.isArray(input.currentValue) ? input.currentValue : [];
    const nextItems = Array.isArray(input.nextValue) ? input.nextValue : [];
    const keyedNextItems = new Map<unknown, Record<string, unknown>>();
    const passthroughNextItems: unknown[] = [];

    for (const item of nextItems) {
      if (isObjectRecord(item) && mergeKey in item) {
        keyedNextItems.set(item[mergeKey], item);
      } else {
        passthroughNextItems.push(item);
      }
    }

    const mergedItems = currentItems.map((item) => {
      if (!isObjectRecord(item) || !(mergeKey in item)) {
        return item;
      }

      const key = item[mergeKey];
      const nextItem = keyedNextItems.get(key);
      if (!nextItem) {
        return item;
      }

      keyedNextItems.delete(key);
      return { ...item, ...nextItem };
    });

    return [...mergedItems, ...Array.from(keyedNextItems.values()), ...passthroughNextItems];
  }

  return input.nextValue;
}

export function applyResultMapping(input: {
  runtime: RendererRuntime;
  scope: ScopeRef;
  compiledResultMapping?: CompiledRuntimeValue<unknown>;
  payload: unknown;
}): unknown {
  if (!input.compiledResultMapping) {
    return input.payload;
  }

  const mappingScope = input.runtime.createChildScope(
    input.scope,
    {
      payload: input.payload,
      result: input.payload,
      response: input.payload
    },
    { source: 'custom', pathSuffix: 'data-source-result-mapping' }
  );

  if (input.compiledResultMapping.isStatic) {
    return input.compiledResultMapping.value;
  }

  return input.runtime.expressionCompiler.evaluateValue(
    input.compiledResultMapping,
    mappingScope,
    input.runtime.env
  );
}

export function writeDataToScope(input: {
  scope: ScopeRef;
  targetPath?: string;
  mergeToScope?: boolean;
  mergeStrategy?: 'replace' | 'append' | 'prepend' | 'merge' | 'upsert';
  mergeKey?: string;
  data: unknown;
}): void {
  const { scope, targetPath, mergeToScope, mergeStrategy, mergeKey, data } = input;
  if (targetPath) {
    const currentValue = scope.get(targetPath);
    scope.update(
      targetPath,
      applyMergeStrategy({
        currentValue,
        nextValue: data,
        mergeStrategy,
        mergeKey
      })
    );
  }

  if (mergeToScope && isObjectRecord(data)) {
    scope.merge(data);
  }
}

export function trackApiRequestDependencies(input: {
  runtime: RendererRuntime;
  api: ApiSchema;
  scope: ScopeRef;
  state?: RuntimeValueState<ApiSchema>;
}): {
  resolvedApi: ApiSchema;
  dependencies?: ScopeDependencySet;
} {
  const compiled = input.runtime.expressionCompiler.compileValue(input.api);

  if (compiled.isStatic) {
    return {
      resolvedApi: (compiled as StaticRuntimeValue<ApiSchema>).value,
      dependencies: undefined
    };
  }

  const dynamicCompiled = compiled as DynamicRuntimeValue<ApiSchema>;
  const runtimeState = input.state ?? dynamicCompiled.createState();
  const result = input.runtime.expressionCompiler.evaluateWithState(dynamicCompiled, input.scope, input.runtime.env, runtimeState);

  return {
    resolvedApi: result.value,
    dependencies: collectRuntimeDependencies(runtimeState)
  };
}

export interface ApiConfigRuntimeState {
  url?: RuntimeValueState<string>;
  method?: RuntimeValueState<string>;
  data?: RuntimeValueState<unknown>;
  params?: RuntimeValueState<unknown>;
  headers?: RuntimeValueState<Record<string, string>>;
}

export function createApiConfigRuntimeState(
  compiledApi: CompiledApiConfig,
  _runtime: RendererRuntime
): ApiConfigRuntimeState {
  const state: ApiConfigRuntimeState = {};

  if (!compiledApi.url.isStatic) {
    state.url = (compiledApi.url as DynamicRuntimeValue<string>).createState();
  }
  if (compiledApi.method && !compiledApi.method.isStatic) {
    state.method = (compiledApi.method as DynamicRuntimeValue<string>).createState();
  }
  if (compiledApi.data && !compiledApi.data.isStatic) {
    state.data = (compiledApi.data as DynamicRuntimeValue<unknown>).createState();
  }
  if (compiledApi.params && !compiledApi.params.isStatic) {
    state.params = (compiledApi.params as DynamicRuntimeValue<unknown>).createState();
  }
  if (compiledApi.headers && !compiledApi.headers.isStatic) {
    state.headers = (compiledApi.headers as DynamicRuntimeValue<Record<string, string>>).createState();
  }

  return state;
}

function evaluateCompiledValue<T>(
  compiled: CompiledRuntimeValue<T> | undefined,
  scope: ScopeRef,
  runtime: RendererRuntime,
  state?: RuntimeValueState<T>
): T | undefined {
  if (!compiled) return undefined;
  if (compiled.isStatic) return compiled.value;

  if (state) {
    return runtime.expressionCompiler.evaluateWithState(
      compiled as DynamicRuntimeValue<T>,
      scope,
      runtime.env,
      state
    ).value;
  }

  return runtime.expressionCompiler.evaluateValue(compiled, scope, runtime.env);
}

export function evaluateCompiledApiConfig(input: {
  compiledApi: CompiledApiConfig;
  scope: ScopeRef;
  runtime: RendererRuntime;
  state?: ApiConfigRuntimeState;
}): {
  resolvedApi: ApiSchema;
  dependencies?: ScopeDependencySet;
} {
  const { compiledApi, scope, runtime, state } = input;

  const resolvedApi: ApiSchema = {
    url: evaluateCompiledValue(compiledApi.url, scope, runtime, state?.url) ?? '',
    method: evaluateCompiledValue(compiledApi.method, scope, runtime, state?.method),
    data: evaluateCompiledValue(compiledApi.data, scope, runtime, state?.data) as SchemaValue | undefined,
    params: evaluateCompiledValue(compiledApi.params, scope, runtime, state?.params) as SchemaValue | undefined,
    headers: evaluateCompiledValue(compiledApi.headers, scope, runtime, state?.headers),
    includeScope: compiledApi.includeScope as '*' | string[] | undefined,
    responseAdaptor: compiledApi.responseAdaptor,
    requestAdaptor: compiledApi.requestAdaptor,
    cacheTTL: compiledApi.cacheTTL,
    cacheKey: compiledApi.cacheKey,
    dedupStrategy: compiledApi.dedupStrategy
  };

  if (!state) {
    return { resolvedApi, dependencies: undefined };
  }

  const allStates = [state.url, state.method, state.data, state.params, state.headers].filter(Boolean) as RuntimeValueState<unknown>[];
  const allDependencies = allStates.map(s => collectRuntimeDependencies(s)).filter(Boolean) as ScopeDependencySet[];

  if (allDependencies.length === 0) {
    return { resolvedApi, dependencies: undefined };
  }

  const mergedPaths: string[] = [];
  let hasWildcard = false;
  let hasBroadAccess = false;

  for (const dep of allDependencies) {
    if (dep.paths) {
      for (const path of dep.paths) {
        if (!mergedPaths.includes(path)) {
          mergedPaths.push(path);
        }
      }
    }
    if (dep.wildcard) hasWildcard = true;
    if (dep.broadAccess) hasBroadAccess = true;
  }

  return {
    resolvedApi,
    dependencies: mergedPaths.length > 0 || hasWildcard || hasBroadAccess
      ? { paths: mergedPaths, wildcard: hasWildcard, broadAccess: hasBroadAccess }
      : undefined
  };
}
