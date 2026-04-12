import type { CompiledFormValidationModel } from '@nop-chaos/flux-core';

export type OwnerBoundaryKind = 'inherit-owner' | 'create-owner' | 'no-owner';

export function isOwnerCompatible(
  oldModel: CompiledFormValidationModel,
  newModel: CompiledFormValidationModel,
  oldBoundaryKind: OwnerBoundaryKind,
  newBoundaryKind: OwnerBoundaryKind,
  oldOwnerSlotId: string,
  newOwnerSlotId: string
): boolean {
  return (
    oldBoundaryKind === newBoundaryKind &&
    oldOwnerSlotId === newOwnerSlotId &&
    oldModel.ownerId === newModel.ownerId &&
    oldModel.rootPath === newModel.rootPath
  );
}

export function buildRuleIdentitySet(model: CompiledFormValidationModel, path: string): Set<string> {
  const node = model.nodes?.[path];
  if (!node) return new Set();
  const set = new Set<string>();
  for (const r of node.rules) {
    set.add(`${r.id}:${r.rule.kind}`);
  }
  return set;
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) {
    if (!b.has(v)) return false;
  }
  return true;
}

export function computeRefreshErrorRetention(
  oldModel: CompiledFormValidationModel,
  newModel: CompiledFormValidationModel,
  currentErrors: Record<string, import('@nop-chaos/flux-core').ValidationError[]>
): Record<string, import('@nop-chaos/flux-core').ValidationError[]> {
  const newNodePaths = new Set(Object.keys(newModel.nodes ?? {}));
  const nextErrors: Record<string, import('@nop-chaos/flux-core').ValidationError[]> = {};

  for (const [path, errors] of Object.entries(currentErrors)) {
    if (!newNodePaths.has(path)) {
      continue;
    }

    const oldSet = buildRuleIdentitySet(oldModel, path);
    const newSet = buildRuleIdentitySet(newModel, path);

    if (setsEqual(oldSet, newSet)) {
      nextErrors[path] = errors;
    }
  }

  return nextErrors;
}
