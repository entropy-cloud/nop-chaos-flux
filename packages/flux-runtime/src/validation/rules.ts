import type {
  BaseSchema,
  CompiledValidationRule,
  ValidationRule,
  ValidationTrigger,
  ValidationVisibilityTrigger
} from '@nop-chaos/flux-core';

type ValidationRuleSource = BaseSchema & {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  atLeastOneFilled?: boolean | { itemPath?: string; message?: string };
  allOrNone?: { itemPaths: string[]; message?: string };
  uniqueBy?: { itemPath: string; message?: string };
  atLeastOneOf?: { paths: string[]; message?: string };
  pattern?: string;
  patternMessage?: string;
  equalsField?: string;
  notEqualsField?: string;
  requiredWhen?: {
    path: string;
    equals: unknown;
    message?: string;
  };
  requiredUnless?: {
    path: string;
    equals: unknown;
    message?: string;
  };
};

export function collectSchemaValidationRules(schema: BaseSchema): ValidationRule[] {
  const ruleSource = schema as ValidationRuleSource;
  const rules: ValidationRule[] = [];

  if (ruleSource.required) {
    rules.push({ kind: 'required' });
  }

  if (typeof ruleSource.minLength === 'number') {
    rules.push({ kind: 'minLength', value: ruleSource.minLength });
  }

  if (typeof ruleSource.maxLength === 'number') {
    rules.push({ kind: 'maxLength', value: ruleSource.maxLength });
  }

  if (typeof ruleSource.minItems === 'number') {
    rules.push({ kind: 'minItems', value: ruleSource.minItems });
  }

  if (typeof ruleSource.maxItems === 'number') {
    rules.push({ kind: 'maxItems', value: ruleSource.maxItems });
  }

  if (ruleSource.atLeastOneFilled) {
    rules.push({
      kind: 'atLeastOneFilled',
      itemPath: typeof ruleSource.atLeastOneFilled === 'object' ? ruleSource.atLeastOneFilled.itemPath : undefined,
      message: typeof ruleSource.atLeastOneFilled === 'object' ? ruleSource.atLeastOneFilled.message : undefined
    });
  }

  if (ruleSource.allOrNone?.itemPaths?.length) {
    rules.push({
      kind: 'allOrNone',
      itemPaths: ruleSource.allOrNone.itemPaths,
      message: ruleSource.allOrNone.message
    });
  }

  if (typeof ruleSource.uniqueBy?.itemPath === 'string' && ruleSource.uniqueBy.itemPath) {
    rules.push({
      kind: 'uniqueBy',
      itemPath: ruleSource.uniqueBy.itemPath,
      message: ruleSource.uniqueBy.message
    });
  }

  if (ruleSource.atLeastOneOf?.paths?.length) {
    rules.push({
      kind: 'atLeastOneOf',
      paths: ruleSource.atLeastOneOf.paths,
      message: ruleSource.atLeastOneOf.message
    });
  }

  if (typeof ruleSource.pattern === 'string' && ruleSource.pattern) {
    rules.push({
      kind: 'pattern',
      value: ruleSource.pattern,
      message: ruleSource.patternMessage
    });
  }

  if (typeof ruleSource.equalsField === 'string' && ruleSource.equalsField) {
    rules.push({
      kind: 'equalsField',
      path: ruleSource.equalsField
    });
  }

  if (typeof ruleSource.notEqualsField === 'string' && ruleSource.notEqualsField) {
    rules.push({
      kind: 'notEqualsField',
      path: ruleSource.notEqualsField
    });
  }

  if (ruleSource.requiredWhen && typeof ruleSource.requiredWhen.path === 'string' && ruleSource.requiredWhen.path) {
    rules.push({
      kind: 'requiredWhen',
      path: ruleSource.requiredWhen.path,
      equals: ruleSource.requiredWhen.equals,
      message: ruleSource.requiredWhen.message
    });
  }

  if (ruleSource.requiredUnless && typeof ruleSource.requiredUnless.path === 'string' && ruleSource.requiredUnless.path) {
    rules.push({
      kind: 'requiredUnless',
      path: ruleSource.requiredUnless.path,
      equals: ruleSource.requiredUnless.equals,
      message: ruleSource.requiredUnless.message
    });
  }

  return rules;
}

export function mergeValidationRules(...groups: Array<ValidationRule[] | undefined>): ValidationRule[] {
  return groups.flatMap((group) => group ?? []);
}

export function normalizeValidationTriggers(input: unknown, fallback: ValidationTrigger[] = ['blur']): ValidationTrigger[] {
  const candidates = Array.isArray(input) ? input : input != null ? [input] : [];
  const normalized = candidates.filter(
    (candidate): candidate is ValidationTrigger => candidate === 'change' || candidate === 'blur' || candidate === 'submit'
  );

  return normalized.length > 0 ? Array.from(new Set(normalized)) : fallback;
}

export function normalizeValidationVisibilityTriggers(
  input: unknown,
  fallback: ValidationVisibilityTrigger[] = ['touched', 'submit']
): ValidationVisibilityTrigger[] {
  const candidates = Array.isArray(input) ? input : input != null ? [input] : [];
  const normalized = candidates.filter(
    (candidate): candidate is ValidationVisibilityTrigger =>
      candidate === 'touched' || candidate === 'dirty' || candidate === 'visited' || candidate === 'submit'
  );

  return normalized.length > 0 ? Array.from(new Set(normalized)) : fallback;
}

export function collectValidationDependencyPaths(rule: ValidationRule): string[] {
  switch (rule.kind) {
    case 'equalsField':
    case 'notEqualsField':
    case 'requiredWhen':
    case 'requiredUnless':
      return [rule.path];
    default:
      return [];
  }
}

export function compileValidationRules(path: string, rules: ValidationRule[]): CompiledValidationRule[] {
  return rules.map((rule, index) => ({
    id: `${path}#${index}:${rule.kind}`,
    rule,
    dependencyPaths: collectValidationDependencyPaths(rule),
    precompiled:
      rule.kind === 'pattern'
        ? {
            regex: new RegExp(rule.value)
          }
        : undefined
  }));
}

