import type {
  CompiledFormValidationModel,
  CompiledValidationNode,
  CompiledValidationRule,
  ValidationRule,
} from '@nop-chaos/flux-core';
import type { FormCrossFieldRule } from '../schemas.js';

const FORM_RULE_ID_PREFIX = 'form-rule:';

function toValidationRule(entry: FormCrossFieldRule): ValidationRule | undefined {
  switch (entry.rule) {
    case 'equalsField':
      return {
        kind: 'equalsField',
        path: entry.target,
        message: entry.message,
      };
    case 'notEqualsField':
      return {
        kind: 'notEqualsField',
        path: entry.target,
        message: entry.message,
      };
    default:
      return undefined;
  }
}

function compileFormRule(fieldPath: string, entry: FormCrossFieldRule): CompiledValidationRule | undefined {
  const rule = toValidationRule(entry);
  if (!rule) {
    return undefined;
  }
  const dependencyPaths =
    rule.kind === 'equalsField' || rule.kind === 'notEqualsField' ? [rule.path] : [];
  return {
    id: `${fieldPath}#${FORM_RULE_ID_PREFIX}${entry.rule}:${entry.target}`,
    rule,
    dependencyPaths,
    precompiled: undefined,
  };
}

function appendDependent(
  dependents: Record<string, string[]>,
  target: string,
  fieldPath: string,
): Record<string, string[]> {
  const existing = dependents[target] ?? [];
  if (existing.includes(fieldPath)) {
    return dependents;
  }
  return { ...dependents, [target]: [...existing, fieldPath] };
}

export function compileFormLevelValidationModel(
  base: CompiledFormValidationModel | undefined,
  rules: FormCrossFieldRule[] | undefined,
): CompiledFormValidationModel | undefined {
  if (!rules || rules.length === 0) {
    return base;
  }

  const baseNodes = base?.nodes ?? {};
  const baseDependents = base?.dependents ?? {};
  let nextNodes: Record<string, CompiledValidationNode> | undefined;
  let nextDependents: Record<string, string[]> = baseDependents;
  let nodesMutated = false;
  let dependentsMutated = false;

  for (const entry of rules) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const fieldPath = typeof entry.field === 'string' ? entry.field : undefined;
    const targetPath = typeof entry.target === 'string' ? entry.target : undefined;
    if (!fieldPath || !targetPath) {
      continue;
    }
    const compiled = compileFormRule(fieldPath, entry);
    if (!compiled) {
      continue;
    }

    if (!nextNodes) {
      nextNodes = { ...baseNodes };
    }
    const existingNode = nextNodes[fieldPath];
    if (existingNode) {
      nextNodes[fieldPath] = {
        ...existingNode,
        rules: [...existingNode.rules, compiled],
      };
    } else {
      const parentPath = fieldPath.includes('.')
        ? fieldPath.split('.').slice(0, -1).join('.')
        : '';
      nextNodes[fieldPath] = {
        path: fieldPath,
        kind: 'field',
        controlType: 'form-rule',
        rules: [compiled],
        behavior: base?.behavior,
        children: [],
        parent: parentPath,
      };
      const parentNode = parentPath ? nextNodes[parentPath] : undefined;
      if (parentNode) {
        nextNodes[parentPath] = {
          ...parentNode,
          children: [...parentNode.children, fieldPath],
        };
      }
    }
    nodesMutated = true;

    const before = nextDependents;
    nextDependents = appendDependent(nextDependents, targetPath, fieldPath);
    if (before !== nextDependents) {
      dependentsMutated = true;
    }
  }

  if (!nodesMutated && !dependentsMutated) {
    return base;
  }

  const mergedNodes = nextNodes ?? baseNodes;
  const mergedDependents = nextDependents ?? baseDependents;

  if (!base) {
    return {
      order: Object.keys(mergedNodes),
      behavior: {
        triggers: ['blur'],
        showErrorOn: ['touched', 'submit'],
      },
      dependents: mergedDependents,
      nodes: mergedNodes,
      rootPath: '',
    };
  }

  const order = base.order.includes(rules[0]?.field ?? '')
    ? base.order
    : [...base.order, ...Object.keys(mergedNodes).filter((key) => !base.order.includes(key))];

  return {
    ...base,
    order,
    nodes: mergedNodes,
    dependents: mergedDependents,
  };
}
