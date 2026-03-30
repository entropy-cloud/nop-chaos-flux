import { getCompiledValidationNode, getCompiledValidationNodeMap, getCompiledValidationRootPath, getCompiledValidationTraversalOrder, hasCompiledValidationNodes } from '@nop-chaos/flux-core';
import { createValidationTraversalOrder } from './schema-compiler';
export function collectSubtreePaths(sharedState, path) {
    const paths = new Set();
    const traversalTargets = getCompiledValidationTraversalOrder(sharedState.inputValue.validation);
    for (const candidate of traversalTargets) {
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
export function collectSubtreeNodePaths(sharedState, path) {
    const validation = sharedState.inputValue.validation;
    const nodes = getCompiledValidationNodeMap(validation);
    if (!hasCompiledValidationNodes(validation) || nodes == null) {
        return [];
    }
    const nodeMap = nodes;
    const traversalOrder = getCompiledValidationTraversalOrder(validation);
    const fallbackTraversalOrder = traversalOrder.length > 0 ? traversalOrder : createValidationTraversalOrder(nodeMap, getCompiledValidationRootPath(validation));
    const seen = new Set();
    const ordered = [];
    function enqueue(candidatePath) {
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
    }
    else {
        for (const candidatePath of fallbackTraversalOrder) {
            if (candidatePath === path || candidatePath.startsWith(`${path}.`)) {
                enqueue(candidatePath);
            }
        }
    }
    return ordered;
}
export function collectSubtreeValidationTargets(sharedState, path) {
    const ordered = collectSubtreeNodePaths(sharedState, path);
    const targets = new Set(ordered);
    for (const candidatePath of collectSubtreePaths(sharedState, path)) {
        targets.add(candidatePath);
    }
    return Array.from(targets);
}
//# sourceMappingURL=form-runtime-subtree.js.map