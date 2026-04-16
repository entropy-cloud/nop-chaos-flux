import type { ConditionGroupValue, ConditionItemValue, ConditionValueNode } from './types';

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

export function groupValuesEqual(a: ConditionGroupValue | undefined, b: ConditionGroupValue | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.conjunction !== b.conjunction) return false;
  if (a.not !== b.not) return false;
  if (a.children.length !== b.children.length) return false;
  for (let i = 0; i < a.children.length; i++) {
    const ac = a.children[i];
    const bc = b.children[i];
    if ('children' in ac && 'children' in bc) {
      if (!groupValuesEqual(ac, bc)) return false;
    } else if ('children' in ac || 'children' in bc) {
      return false;
    } else {
      if (ac.id !== bc.id || ac.op !== bc.op) return false;
    }
  }
  return true;
}
