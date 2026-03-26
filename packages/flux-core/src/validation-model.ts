import type {
  CompiledFormValidationField,
  CompiledFormValidationModel,
  CompiledValidationBehavior,
  CompiledValidationNode,
  CompiledValidationNodeKind
} from './types';

export function isCompiledValidationFieldNode(
  node: CompiledValidationNode | undefined
): node is CompiledValidationNode & {
  kind: Exclude<CompiledValidationNodeKind, 'form'>;
  controlType: string;
  behavior: CompiledValidationBehavior;
} {
  return !!node && node.kind !== 'form' && typeof node.controlType === 'string' && !!node.behavior;
}

export function toCompiledValidationField(
  node: CompiledValidationNode,
  fallbackBehavior: CompiledValidationBehavior
): CompiledFormValidationField | undefined {
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

export function getCompiledValidationField(
  model: CompiledFormValidationModel | undefined,
  path: string
): CompiledFormValidationField | undefined {
  if (!model) {
    return undefined;
  }

  return model.fields[path] ?? (model.nodes?.[path] ? toCompiledValidationField(model.nodes[path], model.behavior) : undefined);
}

export function buildCompiledValidationFieldMap(
  nodes: Record<string, CompiledValidationNode> | undefined,
  fallbackBehavior: CompiledValidationBehavior
): Record<string, CompiledFormValidationField> {
  if (!nodes) {
    return {};
  }

  const fields: Record<string, CompiledFormValidationField> = {};

  for (const [path, node] of Object.entries(nodes)) {
    const field = toCompiledValidationField(node, fallbackBehavior);

    if (field) {
      fields[path] = field;
    }
  }

  return fields;
}

export function buildCompiledValidationDependentMap(
  nodes: Record<string, CompiledValidationNode> | undefined
): Record<string, string[]> {
  if (!nodes) {
    return {};
  }

  const dependents = new Map<string, Set<string>>();

  for (const [path, node] of Object.entries(nodes)) {
    for (const compiledRule of node.rules) {
      for (const dependencyPath of compiledRule.dependencyPaths) {
        const nextDependents = dependents.get(dependencyPath) ?? new Set<string>();
        nextDependents.add(path);
        dependents.set(dependencyPath, nextDependents);
      }
    }
  }

  return Object.fromEntries(Array.from(dependents.entries()).map(([path, targets]) => [path, Array.from(targets)]));
}

export function buildCompiledValidationOrder(
  nodes: Record<string, CompiledValidationNode> | undefined,
  rootPath: string | undefined
): string[] {
  if (!nodes) {
    return [];
  }

  const nodeMap = nodes;

  const seen = new Set<string>();
  const ordered: string[] = [];

  function visit(path: string) {
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

export function buildCompiledFormValidationModel(input: {
  behavior: CompiledValidationBehavior;
  nodes: Record<string, CompiledValidationNode> | undefined;
  rootPath?: string;
}): CompiledFormValidationModel | undefined {
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

export function getCompiledValidationTraversalOrder(model: CompiledFormValidationModel | undefined): string[] {
  if (!model) {
    return [];
  }

  return model.validationOrder ?? model.order;
}

export function getCompiledValidationDependents(
  model: CompiledFormValidationModel | undefined,
  path: string
): string[] {
  if (!model) {
    return [];
  }

  return model.dependents[path] ?? [];
}

export function getCompiledValidationNode(
  model: CompiledFormValidationModel | undefined,
  path: string
): CompiledValidationNode | undefined {
  if (!model) {
    return undefined;
  }

  return model.nodes?.[path];
}

export function getCompiledValidationNodeMap(
  model: CompiledFormValidationModel | undefined
): Record<string, CompiledValidationNode> | undefined {
  return model?.nodes;
}

export function getCompiledValidationRootPath(model: CompiledFormValidationModel | undefined): string | undefined {
  return model?.rootPath;
}

export function hasCompiledValidationNodes(model: CompiledFormValidationModel | undefined): boolean {
  const nodes = model?.nodes;
  return !!nodes && Object.keys(nodes).length > 0;
}
