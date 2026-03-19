import { createValidationTraversalOrder } from './schema-compiler';
import type { ManagedFormRuntimeSharedState } from './form-runtime-types';

export function collectSubtreePaths(sharedState: ManagedFormRuntimeSharedState, path: string): string[] {
  const paths = new Set<string>();

  for (const candidate of sharedState.inputValue.validation?.validationOrder ?? sharedState.inputValue.validation?.order ?? []) {
    if (candidate === path || candidate.startsWith(`${path}.`)) {
      paths.add(candidate);
    }
  }

  for (const [registrationPath, registration] of sharedState.runtimeFieldRegistrations) {
    if (registrationPath === path || registrationPath.startsWith(`${path}.`) || path.startsWith(`${registrationPath}.`)) {
      paths.add(registrationPath);
    }

    for (const childPath of registration.childPaths ?? []) {
      if (childPath === path || childPath.startsWith(`${path}.`) || path.startsWith(`${childPath}.`)) {
        paths.add(childPath);
      }
    }
  }

  return Array.from(paths);
}

export function collectSubtreeNodePaths(sharedState: ManagedFormRuntimeSharedState, path: string): string[] {
  const nodes = sharedState.inputValue.validation?.nodes;

  if (nodes == null || Object.keys(nodes).length === 0) {
    return [];
  }

  const nodeMap = nodes;
  const traversalOrder =
    sharedState.inputValue.validation?.validationOrder ??
    createValidationTraversalOrder(nodeMap, sharedState.inputValue.validation?.rootPath);
  const seen = new Set<string>();
  const ordered: string[] = [];

  function enqueue(candidatePath: string) {
    const node = nodeMap[candidatePath];

    if (!node || node.kind === 'form' || seen.has(candidatePath)) {
      return;
    }

    seen.add(candidatePath);
    ordered.push(candidatePath);

    for (const childPath of node.children) {
      enqueue(childPath);
    }
  }

  if (nodeMap[path]) {
    enqueue(path);
  } else {
    for (const candidatePath of traversalOrder) {
      if (candidatePath === path || candidatePath.startsWith(`${path}.`)) {
        enqueue(candidatePath);
      }
    }
  }

  return ordered;
}

export function collectSubtreeValidationTargets(sharedState: ManagedFormRuntimeSharedState, path: string): string[] {
  const ordered = collectSubtreeNodePaths(sharedState, path);
  const targets = new Set<string>(ordered);

  for (const candidatePath of collectSubtreePaths(sharedState, path)) {
    targets.add(candidatePath);
  }

  return Array.from(targets);
}
