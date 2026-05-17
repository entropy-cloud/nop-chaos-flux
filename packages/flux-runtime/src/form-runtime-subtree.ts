import {
  buildCompiledValidationOrder,
  getCompiledValidationDependents,
  getCompiledValidationNode,
  getCompiledValidationNodeMap,
  getCompiledValidationRootPath,
  getCompiledValidationTraversalOrder,
  hasCompiledValidationNodes,
} from '@nop-chaos/flux-core';
import type {
  FormRuntimeRegistrationState,
  FormRuntimeValidationState,
} from './form-runtime-types.js';

type SubtreeCollectionState = FormRuntimeRegistrationState &
  Pick<FormRuntimeValidationState, 'inputValue'>;

export function collectSubtreePaths(sharedState: SubtreeCollectionState, path: string): string[] {
  const paths = new Set<string>();
  const traversalTargets = getCompiledValidationTraversalOrder(sharedState.inputValue.validation);

  for (const candidate of traversalTargets) {
    if (candidate === path || candidate.startsWith(`${path}.`)) {
      paths.add(candidate);
    }
  }

  for (const entry of sharedState.runtimeFieldRegistrations.values()) {
    const registrationPath = entry.registration.path;

    if (registrationPath === path || registrationPath.startsWith(`${path}.`)) {
      paths.add(registrationPath);
    }

    for (const childPath of entry.registration.childPaths ?? []) {
      if (childPath === path || childPath.startsWith(`${path}.`)) {
        paths.add(childPath);
      }
    }
  }

  return Array.from(paths);
}

export function collectSubtreeNodePaths(
  sharedState: SubtreeCollectionState,
  path: string,
): string[] {
  const validation = sharedState.inputValue.validation;
  const nodes = getCompiledValidationNodeMap(validation);

  if (!hasCompiledValidationNodes(validation) || nodes == null) {
    return [];
  }

  const nodeMap = nodes;
  const traversalOrder = getCompiledValidationTraversalOrder(validation);
  const fallbackTraversalOrder =
    traversalOrder.length > 0
      ? traversalOrder
      : buildCompiledValidationOrder(nodeMap, getCompiledValidationRootPath(validation));
  const seen = new Set<string>();
  const ordered: string[] = [];

  function enqueue(candidatePath: string) {
    const node = getCompiledValidationNode(sharedState.inputValue.validation, candidatePath);

    if (!node || node.kind === 'form' || seen.has(candidatePath)) {
      return;
    }

    seen.add(candidatePath);
    ordered.push(candidatePath);

    for (const childPath of node.children) {
      enqueue(childPath);
    }
  }

  if (getCompiledValidationNode(sharedState.inputValue.validation, path)) {
    enqueue(path);
  } else {
    for (const candidatePath of fallbackTraversalOrder) {
      if (candidatePath === path || candidatePath.startsWith(`${path}.`)) {
        enqueue(candidatePath);
      }
    }
  }

  return ordered;
}

export function collectSubtreeValidationTargets(
  sharedState: SubtreeCollectionState,
  path: string,
): string[] {
  const orderedTargets: string[] = [];
  const targets = new Set<string>();

  function addTarget(candidatePath: string) {
    if (targets.has(candidatePath)) {
      return;
    }

    targets.add(candidatePath);
    orderedTargets.push(candidatePath);
  }

  for (const candidatePath of collectSubtreeNodePaths(sharedState, path)) {
    addTarget(candidatePath);
  }

  for (const candidatePath of collectSubtreePaths(sharedState, path)) {
    addTarget(candidatePath);
  }

  const queue = [...orderedTargets];
  while (queue.length > 0) {
    const candidatePath = queue.shift();

    if (!candidatePath) {
      continue;
    }

    for (const dependentPath of getCompiledValidationDependents(
      sharedState.inputValue.validation,
      candidatePath,
    )) {
      if (targets.has(dependentPath)) {
        continue;
      }

      addTarget(dependentPath);
      queue.push(dependentPath);
    }
  }

  return orderedTargets;
}
