import type {
  CompiledFormValidationField,
  CompiledFormValidationModel,
  CompiledValidationNode,
  CompiledValidationRule,
  ScopeRef,
  ValidationRule,
} from '@nop-chaos/flux-core';
import { buildCompiledFormValidationModel } from '@nop-chaos/flux-core';
import { createScopeRef, createScopeStore } from '../scope.js';
import { builtInValidators } from '../validation/validators.js';
import type { SyncValidationContext, SyncValidationRule, SyncValidationRuleKind } from '../validation/validators.js';

export function makeField(overrides?: Partial<CompiledFormValidationField>): CompiledFormValidationField {
  return {
    path: 'field',
    controlType: 'input-text',
    label: 'Field',
    rules: [],
    behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
    hiddenFieldPolicy: {},
    ...overrides,
  };
}

export function makeCompiledRule(rule: ValidationRule, index = 0): CompiledValidationRule {
  return {
    id: `field#${index}:${rule.kind}`,
    rule,
    dependencyPaths:
      rule.kind === 'equalsField' ||
      rule.kind === 'notEqualsField' ||
      rule.kind === 'requiredWhen' ||
      rule.kind === 'requiredUnless'
        ? [(rule as any).path]
        : [],
  };
}

export function makeScope(data: Record<string, unknown> = {}): ScopeRef {
  return {
    id: 'scope-0',
    path: '',
    value: data,
    get(path: string) {
      const keys = path.split('.');
      let current: Record<string, unknown> | undefined = data as Record<string, unknown>;
      for (const key of keys) {
        if (current == null || typeof current !== 'object') return undefined;
        current = current[key] as Record<string, unknown> | undefined;
      }
      return current;
    },
    has(path: string) {
      return this.get(path) !== undefined;
    },
    readOwn() {
      return { ...data };
    },
    readVisible() {
      return { ...data };
    },
    materializeVisible() {
      return { ...data };
    },
    update() {},
    merge() {},
  } as ScopeRef;
}

export function invoke<R extends SyncValidationRule>(
  kind: R['kind'],
  rule: R,
  value: unknown,
  scopeData?: Record<string, unknown>,
) {
  const ctx: SyncValidationContext<R> = {
    compiledRule: makeCompiledRule(rule),
    value,
    field: makeField(),
    scope: makeScope(scopeData),
    rule: rule as any,
  };
  return builtInValidators[kind as SyncValidationRuleKind](ctx as any);
}

export function createStubScope(initialValues: Record<string, unknown> = {}): ScopeRef {
  const store = createScopeStore(initialValues);
  return createScopeRef({ id: 'parent', path: '$', store });
}

export function makeNode(
  path: string,
  opts: {
    parent?: string;
    children?: string[];
    required?: boolean;
    rules?: CompiledValidationRule[];
    kind?: CompiledValidationNode['kind'];
  } = {},
): CompiledValidationNode {
  const rules =
    opts.rules ??
    (opts.required
      ? [{ id: `${path}#0:required`, rule: { kind: 'required' as const }, dependencyPaths: [] }]
      : []);
  return {
    path,
    kind: opts.kind ?? 'field',
    controlType: 'input-text',
    rules,
    behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
    children: opts.children ?? [],
    parent: opts.parent ?? '',
  };
}

export function makeFormModel(
  fields: Record<string, CompiledValidationNode>,
  behavior: CompiledFormValidationModel['behavior'] = {
    triggers: ['blur'],
    showErrorOn: ['touched', 'submit'],
  },
): CompiledFormValidationModel {
  return buildCompiledFormValidationModel({
    behavior,
    nodes: {
      '': { path: '', kind: 'form', rules: [], children: Object.keys(fields), parent: undefined },
      ...fields,
    },
    rootPath: '',
  })!;
}
