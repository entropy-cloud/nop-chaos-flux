import {
  clampArrayIndex,
  clampInsertIndex,
  insertArrayValue,
  moveArrayValue,
  removeArrayValue,
  swapArrayValue
} from '@nop-chaos/flux-core';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { executeArrayMutation } from './form-runtime-array';
import { cancelValidationDebounce } from './form-runtime-validation';
import type { ManagedFormRuntimeSharedState } from './form-runtime-types';

export interface ArrayMutationContext {
  sharedState: ManagedFormRuntimeSharedState;
  scope: ScopeRef;
  getArrayValue: (path: string) => unknown;
  revalidateDependents: (path: string, reason?: import('@nop-chaos/flux-core').ValidationReason) => Promise<void>;
}

export function appendValueOp(ctx: ArrayMutationContext, path: string, value: unknown): void {
  executeArrayMutation({
    sharedState: ctx.sharedState,
    scope: ctx.scope,
    getArrayValue: ctx.getArrayValue,
    arrayPath: path,
    arrayOperation: (current) => insertArrayValue(current, Number.MAX_SAFE_INTEGER, value),
    indexTransform: (index) => index,
    cancelValidationDebounce: (targetPath) => cancelValidationDebounce(ctx.sharedState, targetPath),
    revalidateDependents: ctx.revalidateDependents
  });
}

export function prependValueOp(ctx: ArrayMutationContext, path: string, value: unknown): void {
  executeArrayMutation({
    sharedState: ctx.sharedState,
    scope: ctx.scope,
    getArrayValue: ctx.getArrayValue,
    arrayPath: path,
    arrayOperation: (current) => insertArrayValue(current, 0, value),
    indexTransform: (index) => index + 1,
    cancelValidationDebounce: (targetPath) => cancelValidationDebounce(ctx.sharedState, targetPath),
    revalidateDependents: ctx.revalidateDependents
  });
}

export function insertValueOp(ctx: ArrayMutationContext, path: string, index: number, value: unknown): void {
  const currentValue = ctx.getArrayValue(path);
  const safeArray = Array.isArray(currentValue) ? currentValue : [];
  const insertIndex = clampInsertIndex(index, safeArray.length);
  executeArrayMutation({
    sharedState: ctx.sharedState,
    scope: ctx.scope,
    getArrayValue: ctx.getArrayValue,
    arrayPath: path,
    arrayOperation: () => insertArrayValue(safeArray, insertIndex, value),
    indexTransform: (candidate) => (candidate >= insertIndex ? candidate + 1 : candidate),
    cancelValidationDebounce: (targetPath) => cancelValidationDebounce(ctx.sharedState, targetPath),
    revalidateDependents: ctx.revalidateDependents
  });
}

export function removeValueOp(ctx: ArrayMutationContext, path: string, index: number): void {
  const currentValue = ctx.getArrayValue(path);

  if (!Array.isArray(currentValue) || currentValue.length === 0) {
    return;
  }

  const removeIndex = clampArrayIndex(index, currentValue.length);
  executeArrayMutation({
    sharedState: ctx.sharedState,
    scope: ctx.scope,
    getArrayValue: ctx.getArrayValue,
    arrayPath: path,
    arrayOperation: () => removeArrayValue(currentValue, removeIndex),
    indexTransform: (candidate) => {
      if (candidate === removeIndex) {
        return undefined;
      }

      return candidate > removeIndex ? candidate - 1 : candidate;
    },
    cancelValidationDebounce: (targetPath) => cancelValidationDebounce(ctx.sharedState, targetPath),
    revalidateDependents: ctx.revalidateDependents
  });
}

export function moveValueOp(ctx: ArrayMutationContext, path: string, from: number, to: number): void {
  const currentValue = ctx.getArrayValue(path);

  if (!Array.isArray(currentValue) || currentValue.length <= 1) {
    return;
  }

  const fromIndex = clampArrayIndex(from, currentValue.length);
  const toIndex = clampArrayIndex(to, currentValue.length);

  if (fromIndex === toIndex) {
    return;
  }

  executeArrayMutation({
    sharedState: ctx.sharedState,
    scope: ctx.scope,
    getArrayValue: ctx.getArrayValue,
    arrayPath: path,
    arrayOperation: () => moveArrayValue(currentValue, fromIndex, toIndex),
    indexTransform: (candidate) => {
      if (candidate === fromIndex) {
        return toIndex;
      }

      if (fromIndex < toIndex && candidate > fromIndex && candidate <= toIndex) {
        return candidate - 1;
      }

      if (fromIndex > toIndex && candidate >= toIndex && candidate < fromIndex) {
        return candidate + 1;
      }

      return candidate;
    },
    cancelValidationDebounce: (targetPath) => cancelValidationDebounce(ctx.sharedState, targetPath),
    revalidateDependents: ctx.revalidateDependents
  });
}

export function swapValueOp(ctx: ArrayMutationContext, path: string, a: number, b: number): void {
  const currentValue = ctx.getArrayValue(path);

  if (!Array.isArray(currentValue) || currentValue.length <= 1) {
    return;
  }

  const first = clampArrayIndex(a, currentValue.length);
  const second = clampArrayIndex(b, currentValue.length);

  if (first === second) {
    return;
  }

  executeArrayMutation({
    sharedState: ctx.sharedState,
    scope: ctx.scope,
    getArrayValue: ctx.getArrayValue,
    arrayPath: path,
    arrayOperation: () => swapArrayValue(currentValue, first, second),
    indexTransform: (candidate) => {
      if (candidate === first) {
        return second;
      }

      if (candidate === second) {
        return first;
      }

      return candidate;
    },
    cancelValidationDebounce: (targetPath) => cancelValidationDebounce(ctx.sharedState, targetPath),
    revalidateDependents: ctx.revalidateDependents
  });
}

export function replaceValueOp(ctx: ArrayMutationContext, path: string, value: unknown): void {
  const nextValue = Array.isArray(value) ? value : [];
  executeArrayMutation({
    sharedState: ctx.sharedState,
    scope: ctx.scope,
    getArrayValue: ctx.getArrayValue,
    arrayPath: path,
    arrayOperation: () => nextValue,
    indexTransform: (candidate) => (candidate < nextValue.length ? candidate : undefined),
    cancelValidationDebounce: (targetPath) => cancelValidationDebounce(ctx.sharedState, targetPath),
    revalidateDependents: ctx.revalidateDependents
  });
}
