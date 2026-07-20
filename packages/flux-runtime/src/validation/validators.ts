import type {
  CompiledFormValidationField,
  CompiledValidationRule,
  ScopeRef,
  ValidationError,
  ValidationRule,
} from '@nop-chaos/flux-core';
import { getIn, resolveRelativePath } from '@nop-chaos/flux-core';
import { createValidationError } from './errors.js';
import { buildValidationMessage } from './message.js';

export type AsyncValidationRule = Extract<ValidationRule, { kind: 'async' }>;
export type SyncValidationRule = Exclude<ValidationRule, AsyncValidationRule>;
export type SyncValidationRuleKind = SyncValidationRule['kind'];
export type SyncValidationRuleFor<K extends SyncValidationRuleKind> = Extract<
  SyncValidationRule,
  { kind: K }
>;

export interface SyncValidationContext<R extends SyncValidationRule = SyncValidationRule> {
  compiledRule: CompiledValidationRule;
  value: unknown;
  field: CompiledFormValidationField;
  scope: ScopeRef;
  rule: R;
}

export type SyncValidator<R extends SyncValidationRule = SyncValidationRule> = (
  input: SyncValidationContext<R>,
) => ValidationError | undefined;

type SyncValidatorMap = {
  [K in SyncValidationRuleKind]: SyncValidator<SyncValidationRuleFor<K>>;
};

export function isEmptyValue(value: unknown): boolean {
  return value == null || value === '' || (Array.isArray(value) && value.length === 0);
}

function hasFilledArrayItem(value: unknown, itemPath?: string): boolean {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.some((item) => {
    const candidate = itemPath ? getIn(item, itemPath) : item;
    return !isEmptyValue(candidate);
  });
}

function violatesAllOrNone(value: unknown, itemPaths: string[]): boolean {
  if (itemPaths.length === 0) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => {
      const flags = itemPaths.map((itemPath) => !isEmptyValue(getIn(item, itemPath)));
      return flags.some(Boolean) && flags.some((flag) => !flag);
    });
  }

  if (value == null || typeof value !== 'object') {
    return false;
  }

  const flags = itemPaths.map((itemPath) => !isEmptyValue(getIn(value, itemPath)));
  return flags.some(Boolean) && flags.some((flag) => !flag);
}

function violatesUniqueBy(value: unknown, itemPath: string): boolean {
  if (!Array.isArray(value) || !itemPath) {
    return false;
  }

  const seen = new Set<unknown>();

  for (const item of value) {
    const candidate = getIn(item, itemPath);

    if (isEmptyValue(candidate)) {
      continue;
    }

    if (seen.has(candidate)) {
      return true;
    }

    seen.add(candidate);
  }

  return false;
}

function lacksAtLeastOneOf(value: unknown, paths: string[]): boolean {
  if (value == null || typeof value !== 'object' || paths.length === 0) {
    return true;
  }

  return !paths.some((path) => !isEmptyValue(getIn(value, path)));
}

function createBuiltInError(
  input: SyncValidationContext,
  overrides?: Partial<ValidationError>,
): ValidationError {
  return createValidationError(
    input.field,
    input.compiledRule,
    buildValidationMessage(input.rule, input.field),
    overrides,
  );
}

function createPatternConfigurationError(input: SyncValidationContext, message: string) {
  return createBuiltInError(input, {
    message,
    sourceKind: 'runtime-registration',
  });
}

export const builtInValidators: SyncValidatorMap = {
  required(input) {
    return isEmptyValue(input.value) ? createBuiltInError(input) : undefined;
  },
  requiredRange(input) {
    const value = input.value;
    if (typeof value !== 'string' || value === '') {
      // Fully empty is handled by the generic `required` rule; range-aware check
      // only applies to a delimited composite value.
      return undefined;
    }
    const delimiter = input.rule.delimiter ?? ',';
    const parts = value.split(delimiter);
    if (parts.length < 2) {
      return undefined;
    }
    const hasFilled = parts.some((part) => part.trim() !== '');
    const hasEmpty = parts.some((part) => part.trim() === '');
    // Partial range: one bound filled, the other empty → required not satisfied.
    // Fully filled (no empty) or fully empty (no filled) are left to other rules.
    return hasFilled && hasEmpty ? createBuiltInError(input) : undefined;
  },
  minLength(input) {
    return typeof input.value === 'string' && input.value.length < input.rule.value
      ? createBuiltInError(input)
      : undefined;
  },
  maxLength(input) {
    return typeof input.value === 'string' && input.value.length > input.rule.value
      ? createBuiltInError(input)
      : undefined;
  },
  minItems(input) {
    return Array.isArray(input.value) && input.value.length < input.rule.value
      ? createBuiltInError(input)
      : undefined;
  },
  maxItems(input) {
    return Array.isArray(input.value) && input.value.length > input.rule.value
      ? createBuiltInError(input)
      : undefined;
  },
  atLeastOneFilled(input) {
    return !hasFilledArrayItem(input.value, input.rule.itemPath)
      ? createBuiltInError(input, {
          relatedPaths: input.rule.itemPath ? [input.rule.itemPath] : undefined,
        })
      : undefined;
  },
  allOrNone(input) {
    return violatesAllOrNone(input.value, input.rule.itemPaths)
      ? createBuiltInError(input, {
          relatedPaths: input.rule.itemPaths,
        })
      : undefined;
  },
  uniqueBy(input) {
    return violatesUniqueBy(input.value, input.rule.itemPath)
      ? createBuiltInError(input, {
          relatedPaths: [input.rule.itemPath],
        })
      : undefined;
  },
  atLeastOneOf(input) {
    return lacksAtLeastOneOf(input.value, input.rule.paths)
      ? createBuiltInError(input, {
          relatedPaths: input.rule.paths,
        })
      : undefined;
  },
  pattern(input) {
    const precompiled = input.compiledRule.precompiled;
    if (precompiled?.error) {
      return createPatternConfigurationError(input, `Invalid validation pattern: ${precompiled.error}`);
    }
    const regex = precompiled?.regex ?? new RegExp(input.rule.value);
    return typeof input.value === 'string' && input.value !== '' && !regex.test(input.value)
      ? createBuiltInError(input)
      : undefined;
  },
  email(input) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return typeof input.value === 'string' && input.value !== '' && !emailPattern.test(input.value)
      ? createBuiltInError(input)
      : undefined;
  },
  equalsField(input) {
    const targetPath = input.rule.path?.startsWith('../')
      ? resolveRelativePath(input.field.path, input.rule.path)
      : input.rule.path;
    const peerValue = input.scope.get(targetPath);

    if (isEmptyValue(input.value) && isEmptyValue(peerValue)) {
      return undefined;
    }

    return !Object.is(input.value, peerValue)
      ? createBuiltInError(input, {
          relatedPaths: [targetPath],
        })
      : undefined;
  },
  notEqualsField(input) {
    const targetPath = input.rule.path?.startsWith('../')
      ? resolveRelativePath(input.field.path, input.rule.path)
      : input.rule.path;
    const peerValue = input.scope.get(targetPath);

    if (isEmptyValue(input.value) && isEmptyValue(peerValue)) {
      return undefined;
    }

    return Object.is(input.value, peerValue)
      ? createBuiltInError(input, {
          relatedPaths: [targetPath],
        })
      : undefined;
  },
  requiredWhen(input) {
    const targetPath = input.rule.path?.startsWith('../')
      ? resolveRelativePath(input.field.path, input.rule.path)
      : input.rule.path;
    const dependencyValue = input.scope.get(targetPath);
    const shouldRequire = Object.is(dependencyValue, input.rule.equals);

    return shouldRequire && isEmptyValue(input.value)
      ? createBuiltInError(input, {
          relatedPaths: [targetPath],
        })
      : undefined;
  },
  requiredUnless(input) {
    const targetPath = input.rule.path?.startsWith('../')
      ? resolveRelativePath(input.field.path, input.rule.path)
      : input.rule.path;
    const dependencyValue = input.scope.get(targetPath);
    const shouldRequire = !Object.is(dependencyValue, input.rule.equals);

    return shouldRequire && isEmptyValue(input.value)
      ? createBuiltInError(input, {
          relatedPaths: [targetPath],
        })
      : undefined;
  },
};
