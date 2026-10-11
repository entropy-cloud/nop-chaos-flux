import type { CompiledFormValidationModel, CompiledValidationNode } from '@nop-chaos/flux-core';
import { buildCompiledFormValidationModel, createPathBinding } from '@nop-chaos/flux-core';

// WA-fadv-003: single source for the validation-model projection shared by
// projected-form-runtime and projected-validation-runtime — the two copies
// were verbatim (2-day apart) and only differed in type synonyms.

interface ProjectValidationModelOptions {
  ownerRootPath?: string;
  scalarValueAlias?: string;
}

function isProjectedValidationPath(path: string, ownerRootPath: string): boolean {
  if (!ownerRootPath) {
    return true;
  }

  return path === ownerRootPath || path.startsWith(`${ownerRootPath}.`);
}

export function projectValidationModel(
  model: CompiledFormValidationModel | undefined,
  options: ProjectValidationModelOptions,
): CompiledFormValidationModel | undefined {
  const ownerRootPath = options.ownerRootPath;

  if (!model || !ownerRootPath) {
    return model;
  }

  const binding = createPathBinding({
    ownerRootPath,
    scalarValueAlias: options.scalarValueAlias,
  });
  const nodeEntries = Object.entries(model.nodes ?? {}).filter(([path]) =>
    isProjectedValidationPath(path, ownerRootPath),
  );

  if (nodeEntries.length === 0) {
    return undefined;
  }

  const projectedNodes: Record<string, CompiledValidationNode> = {};

  for (const [path, node] of nodeEntries) {
    const relativePath = binding.toRelative(path);
    if (relativePath === undefined) {
      continue;
    }

    projectedNodes[relativePath] = {
      ...node,
      path: relativePath,
      parent: node.parent ? binding.toRelative(node.parent) : undefined,
      children: node.children
        .map((childPath) => binding.toRelative(childPath))
        .filter((childPath): childPath is string => childPath !== undefined),
      rules: node.rules.map((rule) => ({
        ...rule,
        dependencyPaths: rule.dependencyPaths
          .map((dependencyPath) => binding.toRelative(dependencyPath))
          .filter((dependencyPath): dependencyPath is string => dependencyPath !== undefined),
      })),
    };
  }

  const rootPath = binding.toRelative(ownerRootPath) ?? '';
  const projectedModel = buildCompiledFormValidationModel({
    behavior: model.behavior,
    nodes: projectedNodes,
    rootPath,
    defaultHiddenFieldPolicy: model.defaultHiddenFieldPolicy,
  });

  if (!projectedModel) {
    return undefined;
  }

  return {
    ...projectedModel,
    ownerId: model.ownerId,
  };
}
