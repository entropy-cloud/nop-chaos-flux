import type {
  CompiledFormValidationModel,
  CompiledSchemaNode,
  CompiledValidationBehavior,
  ValidationTrigger,
  ValidationVisibilityTrigger
} from '@nop-chaos/flux-core';
import { buildCompiledFormValidationModel } from '@nop-chaos/flux-core';
import {
  collectSchemaValidationRules,
  compileValidationRules,
  mergeValidationRules,
  normalizeValidationTriggers,
  normalizeValidationVisibilityTriggers
} from '../validation';

function poolValidationBehavior(
  pool: Map<string, CompiledValidationBehavior>,
  triggers: ValidationTrigger[],
  showErrorOn: ValidationVisibilityTrigger[]
): CompiledValidationBehavior {
  const key = `${triggers.join('|')}::${showErrorOn.join('|')}`;
  const existing = pool.get(key);

  if (existing) {
    return existing;
  }

  const behavior: CompiledValidationBehavior = {
    triggers,
    showErrorOn
  };
  pool.set(key, behavior);
  return behavior;
}

export function collectValidationModel(
  node:
    | CompiledSchemaNode
    | CompiledSchemaNode[]
    | Array<CompiledSchemaNode | CompiledSchemaNode[]>
    | null
    | undefined,
  options: {
    defaultTriggers?: ValidationTrigger[];
    defaultShowErrorOn?: ValidationVisibilityTrigger[];
  } = {}
): CompiledFormValidationModel | undefined {
  if (!node) {
    return undefined;
  }

  const nodes: CompiledSchemaNode[] = [];
  const queue: Array<CompiledSchemaNode | CompiledSchemaNode[]> = Array.isArray(node) ? [...node] : [node];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      continue;
    }

    if (Array.isArray(current)) {
      queue.unshift(...current);
      continue;
    }

    nodes.push(current);
  }

  const validationNodes: Record<string, import('@nop-chaos/flux-core').CompiledValidationNode> = {
    '': {
      path: '',
      kind: 'form',
      rules: [],
      children: [],
      parent: undefined
    }
  };
  const behaviorPool = new Map<string, CompiledValidationBehavior>();
  let rootBehavior = poolValidationBehavior(
    behaviorPool,
    options.defaultTriggers ?? (['blur'] as ValidationTrigger[]),
    options.defaultShowErrorOn ?? (['touched', 'submit'] as ValidationVisibilityTrigger[])
  );

  const visit = (entry: CompiledSchemaNode) => {
    if (!entry.component) {
      return;
    }

    if (entry.type === 'form') {
      rootBehavior = poolValidationBehavior(
        behaviorPool,
        normalizeValidationTriggers(entry.schema.validateOn, ['blur']),
        normalizeValidationVisibilityTriggers(entry.schema.showErrorOn, ['touched', 'submit'])
      );
    }

    const contributor = entry.component.validation;

    if (contributor?.kind === 'field') {
      const ctx = {
        schema: entry.schema,
        renderer: entry.component,
        path: entry.path
      };
      const fieldPath = contributor.getFieldPath?.(entry.schema, ctx);

      if (fieldPath) {
        const compiledRules = compileValidationRules(
          fieldPath,
          mergeValidationRules(collectSchemaValidationRules(entry.schema), contributor.collectRules?.(entry.schema, ctx))
        );
        const parentPath = fieldPath.includes('.') ? fieldPath.split('.').slice(0, -1).join('.') : '';
        const nodeKind = contributor.valueKind === 'array' ? 'array' : contributor.valueKind === 'object' ? 'object' : 'field';

        const behavior = poolValidationBehavior(
          behaviorPool,
          normalizeValidationTriggers(entry.schema.validateOn, rootBehavior.triggers),
          normalizeValidationVisibilityTriggers(entry.schema.showErrorOn, rootBehavior.showErrorOn)
        );
        const label = typeof entry.schema.label === 'string' ? entry.schema.label : undefined;

        validationNodes[fieldPath] = {
          path: fieldPath,
          kind: nodeKind,
          controlType: entry.type,
          label,
          rules: compiledRules,
          behavior,
          children: [],
          parent: parentPath
        };

        if (validationNodes[parentPath]) {
          validationNodes[parentPath].children.push(fieldPath);
        }

      }
    }

    for (const region of Object.values(entry.regions)) {
      if (!region.node) {
        continue;
      }

      const childNodes = Array.isArray(region.node) ? region.node : [region.node];
      childNodes.forEach(visit);
    }
  };

  nodes.forEach(visit);

  return buildCompiledFormValidationModel({
    behavior: rootBehavior,
    nodes: validationNodes,
    rootPath: ''
  });
}
