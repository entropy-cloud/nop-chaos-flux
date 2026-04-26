import { isRecord } from '@nop-chaos/flux-core';
import type { ConditionItemValue, ConditionValueNode } from './types';

export function computeUsedFields(children: ConditionValueNode[], excludeId?: string): Set<string> {
  const used = new Set<string>();
  for (const child of children) {
    if (child.id === excludeId) continue;
    if ('children' in child) {
      const nested = computeUsedFields(child.children);
      for (const f of nested) used.add(f);
    } else {
      const item = child as ConditionItemValue;
      if (item.left?.field) used.add(item.left.field);
    }
  }
  return used;
}

function conditionValueEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }

    for (let index = 0; index < left.length; index += 1) {
      if (!conditionValueEqual(left[index], right[index])) {
        return false;
      }
    }

    return true;
  }

  if (!isRecord(left) || !isRecord(right)) {
    return false;
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (const key of leftKeys) {
    if (!(key in right) || !conditionValueEqual(left[key], right[key])) {
      return false;
    }
  }

  return true;
}

export function groupValuesEqual(a: unknown, b: unknown): boolean {
  return conditionValueEqual(a, b);
}
