import type {
  ApiSchema,
  DynamicRuntimeValue,
  RendererRuntime,
  RuntimeValueState,
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
  resultMapping?: unknown;
  payload: unknown;
}): unknown {
  if (!isObjectRecord(input.resultMapping)) {
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

  return input.runtime.evaluate(input.resultMapping, mappingScope);
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
