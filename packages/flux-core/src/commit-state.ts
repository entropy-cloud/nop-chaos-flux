import type { ValueEvaluationResult } from './types/compiled-value-types.js';
import { shallowEqual } from './utils/object.js';

export function commitCompositeState<T = unknown>(
  state: { initialized: boolean; lastValue?: unknown },
  nextValue: T,
  anyChildChanged: boolean,
  isEqual: (left: unknown, right: unknown) => boolean = shallowEqual,
): ValueEvaluationResult<T> {
  if (!anyChildChanged && state.initialized && state.lastValue) {
    return {
      value: state.lastValue as T,
      changed: false,
      reusedReference: true,
    };
  }

  if (state.initialized && state.lastValue && isEqual(state.lastValue, nextValue)) {
    return {
      value: state.lastValue as T,
      changed: false,
      reusedReference: true,
    };
  }

  state.initialized = true;
  state.lastValue = nextValue;

  return {
    value: nextValue,
    changed: true,
    reusedReference: false,
  };
}
