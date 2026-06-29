import { isRecord } from '@nop-chaos/flux-core';
import type { ConditionGroupValue, ConditionItemValue, ConditionValueNode } from './types.js';

export function sanitizeRight(v: unknown): unknown {
  if (v == null) return undefined;
  if (Array.isArray(v)) {
    const hasDefined = v.some((e) => e !== undefined && e !== null);
    if (!hasDefined) return undefined;
    return v;
  }
  return v;
}

export function sanitizeNode(
  node: ConditionGroupValue | ConditionItemValue,
): ConditionGroupValue | ConditionItemValue {
  if ('children' in node) {
    return {
      ...node,
      children: (node as ConditionGroupValue).children.map(sanitizeNode),
    };
  }
  const item = node as ConditionItemValue;
  return { ...item, right: sanitizeRight(item.right) };
}

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

/**
 * Rewrite a single condition item's `right` value, matched by id. Short-circuits
 * on the FIRST matching item (DFS): item ids are expected to be unique, but if
 * two items ever collide on an id, only the first is rewritten so the survivor
 * is not silently cross-written (串值) with the other's value (H29).
 */
export function rewriteItemRight(
  group: ConditionGroupValue,
  itemId: string,
  right: unknown,
): ConditionGroupValue {
  let resolved = false;
  const walk = (node: ConditionGroupValue): ConditionGroupValue => ({
    ...node,
    children: node.children.map((child) => {
      if (resolved) return child;
      if ('children' in child) {
        return walk(child);
      }
      if (child.id !== itemId) {
        return child;
      }
      resolved = true;
      return { ...child, right };
    }),
  });
  return walk(group);
}
