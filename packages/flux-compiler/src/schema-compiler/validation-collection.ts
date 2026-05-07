import type {
  CompiledFormValidationModel,
  CompiledValidationBehavior,
  HiddenFieldPolicy,
  TemplateNode,
  ValidationTrigger,
  ValidationVisibilityTrigger,
} from '@nop-chaos/flux-core';
import { buildCompiledFormValidationModel } from '@nop-chaos/flux-core';
import {
  collectSchemaValidationRules,
  compileValidationRules,
  mergeValidationRules,
  normalizeValidationTriggers,
  normalizeValidationVisibilityTriggers,
} from '../validation-lowering.js';

function poolValidationBehavior(
  pool: Map<string, CompiledValidationBehavior>,
  triggers: ValidationTrigger[],
  showErrorOn: ValidationVisibilityTrigger[],
): CompiledValidationBehavior {
  const key = `${triggers.join('|')}::${showErrorOn.join('|')}`;
  const existing = pool.get(key);

  if (existing) {
    return existing;
  }

  const behavior: CompiledValidationBehavior = {
    triggers,
    showErrorOn,
  };
  pool.set(key, behavior);
  return behavior;
}

export function collectValidationModel(
  node: TemplateNode | TemplateNode[] | Array<TemplateNode | TemplateNode[]> | null | undefined,
  options: {
    defaultTriggers?: ValidationTrigger[];
    defaultShowErrorOn?: ValidationVisibilityTrigger[];
    defaultHiddenFieldPolicy?: HiddenFieldPolicy;
  } = {},
): CompiledFormValidationModel | undefined {
  if (!node) {
    return undefined;
  }

  const nodes: TemplateNode[] = [];
  const queue: Array<TemplateNode | TemplateNode[]> = Array.isArray(node) ? [...node] : [node];

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
      parent: undefined,
    },
  };
  const behaviorPool = new Map<string, CompiledValidationBehavior>();
  let rootBehavior = poolValidationBehavior(
    behaviorPool,
    options.defaultTriggers ?? (['blur'] as ValidationTrigger[]),
    options.defaultShowErrorOn ?? (['touched', 'submit'] as ValidationVisibilityTrigger[]),
  );
  let formDefaultHiddenFieldPolicy: HiddenFieldPolicy | undefined =
    options.defaultHiddenFieldPolicy;

  const visit = (entry: TemplateNode, fieldPathPrefix?: string) => {
    if (!entry.component) {
      return;
    }

    if (entry.validationOwnerPlan?.boundary === 'create-owner') {
      return;
    }

    if (entry.type === 'form') {
      rootBehavior = poolValidationBehavior(
        behaviorPool,
        normalizeValidationTriggers(entry.schema.validateOn, ['blur']),
        normalizeValidationVisibilityTriggers(entry.schema.showErrorOn, ['touched', 'submit']),
      );
      const formHiddenPolicy = (entry.schema as { hiddenFieldPolicy?: HiddenFieldPolicy })
        .hiddenFieldPolicy;
      if (formHiddenPolicy) {
        formDefaultHiddenFieldPolicy = formHiddenPolicy;
      }
    }

    const contributor = entry.component.validation;

    if (contributor?.kind === 'field') {
      const ctx = {
        schema: entry.schema,
        renderer: entry.component,
        path: entry.templatePath,
        fieldPathPrefix,
      };
      const rawFieldPath = contributor.getFieldPath?.(entry.schema, ctx);
      const fieldPath = rawFieldPath
        ? fieldPathPrefix
          ? `${fieldPathPrefix}.${rawFieldPath}`
          : rawFieldPath
        : undefined;

      if (fieldPath) {
        const compiledRules = compileValidationRules(
          fieldPath,
          mergeValidationRules(
            collectSchemaValidationRules(entry.schema),
            contributor.collectRules?.(entry.schema, ctx),
          ),
        );
        const parentPath = fieldPath.includes('.')
          ? fieldPath.split('.').slice(0, -1).join('.')
          : '';
        const nodeKind =
          contributor.valueKind === 'array'
            ? 'array'
            : contributor.valueKind === 'object'
              ? 'object'
              : 'field';

        const behavior = poolValidationBehavior(
          behaviorPool,
          normalizeValidationTriggers(entry.schema.validateOn, rootBehavior.triggers),
          normalizeValidationVisibilityTriggers(entry.schema.showErrorOn, rootBehavior.showErrorOn),
        );
        const label = typeof entry.schema.label === 'string' ? entry.schema.label : undefined;
        const fieldHiddenPolicy = (entry.schema as { hiddenFieldPolicy?: HiddenFieldPolicy })
          .hiddenFieldPolicy;

        validationNodes[fieldPath] = {
          path: fieldPath,
          kind: nodeKind,
          controlType: entry.type,
          label,
          rules: compiledRules,
          behavior,
          children: [],
          parent: parentPath,
          hiddenFieldPolicy: fieldHiddenPolicy,
        };

        if (validationNodes[parentPath] !== undefined) {
          validationNodes[parentPath].children.push(fieldPath);
        }

        const childPrefix = contributor.getChildFieldPathPrefix?.(entry.schema, {
          ...ctx,
          fieldPathPrefix,
        });

        if (childPrefix === false) {
          return;
        }

        const nextChildPrefix = childPrefix
          ? fieldPathPrefix
            ? `${fieldPathPrefix}.${childPrefix}`
            : childPrefix
          : fieldPathPrefix;

        for (const region of Object.values(entry.regions)) {
          if (!region.node) {
            continue;
          }

          const childNodes = Array.isArray(region.node) ? region.node : [region.node];
          childNodes.forEach((child) => visit(child, nextChildPrefix));
        }

        return;
      }
    }

    const contributor2 = entry.component.validation;
    const childPrefix2 = contributor2?.getChildFieldPathPrefix?.(entry.schema, {
      schema: entry.schema,
      renderer: entry.component,
      path: entry.templatePath,
      fieldPathPrefix,
    });

    if (childPrefix2 === false) {
      return;
    }

    const nextPrefix = childPrefix2
      ? fieldPathPrefix
        ? `${fieldPathPrefix}.${childPrefix2}`
        : childPrefix2
      : fieldPathPrefix;

    for (const region of Object.values(entry.regions)) {
      if (!region.node) {
        continue;
      }

      const childNodes = Array.isArray(region.node) ? region.node : [region.node];
      childNodes.forEach((child) => visit(child, nextPrefix));
    }
  };

  nodes.forEach((n) => visit(n, undefined));

  return buildCompiledFormValidationModel({
    behavior: rootBehavior,
    nodes: validationNodes,
    rootPath: '',
    defaultHiddenFieldPolicy: formDefaultHiddenFieldPolicy,
  });
}
