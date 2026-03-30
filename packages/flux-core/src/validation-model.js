export function isCompiledValidationFieldNode(node) {
    return !!node && node.kind !== 'form' && typeof node.controlType === 'string' && !!node.behavior;
}
export function toCompiledValidationField(node, fallbackBehavior) {
    if (!isCompiledValidationFieldNode(node)) {
        return undefined;
    }
    return {
        path: node.path,
        controlType: node.controlType,
        label: node.label,
        rules: node.rules,
        behavior: node.behavior ?? fallbackBehavior
    };
}
export function getCompiledValidationField(model, path) {
    if (!model) {
        return undefined;
    }
    return model.fields[path] ?? (model.nodes?.[path] ? toCompiledValidationField(model.nodes[path], model.behavior) : undefined);
}
export function buildCompiledValidationFieldMap(nodes, fallbackBehavior) {
    if (!nodes) {
        return {};
    }
    const fields = {};
    for (const [path, node] of Object.entries(nodes)) {
        const field = toCompiledValidationField(node, fallbackBehavior);
        if (field) {
            fields[path] = field;
        }
    }
    return fields;
}
export function buildCompiledValidationDependentMap(nodes) {
    if (!nodes) {
        return {};
    }
    const dependents = new Map();
    for (const [path, node] of Object.entries(nodes)) {
        for (const compiledRule of node.rules) {
            for (const dependencyPath of compiledRule.dependencyPaths) {
                const nextDependents = dependents.get(dependencyPath) ?? new Set();
                nextDependents.add(path);
                dependents.set(dependencyPath, nextDependents);
            }
        }
    }
    return Object.fromEntries(Array.from(dependents.entries()).map(([path, targets]) => [path, Array.from(targets)]));
}
export function buildCompiledValidationOrder(nodes, rootPath) {
    if (!nodes) {
        return [];
    }
    const nodeMap = nodes;
    const seen = new Set();
    const ordered = [];
    function visit(path) {
        const node = nodeMap[path];
        if (!node || seen.has(path)) {
            return;
        }
        seen.add(path);
        if (node.kind !== 'form') {
            ordered.push(path);
        }
        for (const childPath of node.children) {
            visit(childPath);
        }
    }
    if (rootPath && nodeMap[rootPath]) {
        visit(rootPath);
    }
    for (const path of Object.keys(nodeMap)) {
        visit(path);
    }
    return ordered;
}
export function buildCompiledFormValidationModel(input) {
    const nodes = input.nodes;
    const rootPath = input.rootPath;
    const validationOrder = buildCompiledValidationOrder(nodes, rootPath);
    if (validationOrder.length === 0) {
        return undefined;
    }
    return {
        fields: buildCompiledValidationFieldMap(nodes, input.behavior),
        order: validationOrder,
        behavior: input.behavior,
        dependents: buildCompiledValidationDependentMap(nodes),
        nodes,
        validationOrder,
        rootPath
    };
}
export function getCompiledValidationTraversalOrder(model) {
    if (!model) {
        return [];
    }
    return model.validationOrder ?? model.order;
}
export function getCompiledValidationDependents(model, path) {
    if (!model) {
        return [];
    }
    return model.dependents[path] ?? [];
}
export function getCompiledValidationNode(model, path) {
    if (!model) {
        return undefined;
    }
    return model.nodes?.[path];
}
export function getCompiledValidationNodeMap(model) {
    return model?.nodes;
}
export function getCompiledValidationRootPath(model) {
    return model?.rootPath;
}
export function hasCompiledValidationNodes(model) {
    const nodes = model?.nodes;
    return !!nodes && Object.keys(nodes).length > 0;
}
//# sourceMappingURL=validation-model.js.map