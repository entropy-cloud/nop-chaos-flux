import {
  isRecord,
  type CompiledRuntimeValue,
  type RendererRuntime,
  type ScopeRef,
} from '@nop-chaos/flux-core';
import { collectRuntimeDependencies } from '../node-runtime.js';

export { collectRuntimeDependencies };

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
    if (isRecord(input.currentValue) && isRecord(input.nextValue)) {
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
      if (isRecord(item) && mergeKey in item) {
        keyedNextItems.set(item[mergeKey], item);
      } else {
        passthroughNextItems.push(item);
      }
    }

    const mergedItems = currentItems.map((item) => {
      if (!isRecord(item) || !(mergeKey in item)) {
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
      response: input.payload,
    },
    { source: 'custom', pathSuffix: 'data-source-result-mapping' },
  );

  if (input.compiledResultMapping.isStatic) {
    return input.compiledResultMapping.value;
  }

  return input.runtime.expressionCompiler.evaluateValue(
    input.compiledResultMapping,
    mappingScope,
    input.runtime.env,
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
        mergeKey,
      }),
    );
  }

  if (mergeToScope && isRecord(data)) {
    scope.merge(data);
  }
}
