import type {
  CompiledFormValidationField,
  ValidationError,
  ValidationReason,
  ValidationResult,
} from '@nop-chaos/flux-core';
import { getCompiledValidationNode } from '@nop-chaos/flux-core';
import type { FormRuntimeValidationState } from './form-runtime-types.js';

export const VALIDATION_CANCELLED = Symbol('validation-cancelled');

function createValidationResult(errors: ValidationError[]): ValidationResult {
  return {
    ok: errors.length === 0,
    errors,
  };
}

// Plan 550 / IS-combo-editor-001 + IS-business-document-002: rules on array
// row children (combo items, input-table rows) compile under the TEMPLATE
// path (`lines.name`) because row instances only exist at runtime. The
// template path never exists in the form values (`scope.get('lines.name')`
// is undefined), so any required rule on a row child failed EVERY submit
// with a false "required" error even when every visible row was filled.
// Detection: a compiled field whose path runs through an array node without
// an index segment. Such a field expands to one validation per current item
// instance, each anchored at its instance path.
export function resolveArrayTemplateChildExpansion(
  sharedState: FormRuntimeValidationState,
  path: string,
): { arrayPath: string; suffix: string } | undefined {
  const segments = path.split('.');
  for (let index = 0; index < segments.length; index += 1) {
    if (/^\d+$/.test(segments[index])) {
      return undefined;
    }
    const ancestorPath = segments.slice(0, index + 1).join('.');
    const ancestorNode = getCompiledValidationNode(
      sharedState.inputValue.validation,
      ancestorPath,
    );
    if (ancestorNode?.kind !== 'array') {
      continue;
    }
    const rest = segments.slice(index + 1);
    if (rest.length === 0 || rest.some((segment) => /^\d+$/.test(segment))) {
      return undefined;
    }
    return { arrayPath: ancestorPath, suffix: rest.join('.') };
  }
  return undefined;
}

export async function validateArrayTemplateChildInstances(
  sharedState: FormRuntimeValidationState,
  field: CompiledFormValidationField,
  expansion: { arrayPath: string; suffix: string },
  validateCompiledField: (
    sharedState: FormRuntimeValidationState,
    path: string,
    field: CompiledFormValidationField,
    reason?: ValidationReason,
    options?: { signal?: AbortSignal },
  ) => Promise<ValidationResult>,
  reason?: ValidationReason,
  options?: { signal?: AbortSignal },
): Promise<ValidationResult> {
  const arrayValue = sharedState.scope.get(expansion.arrayPath);
  if (!Array.isArray(arrayValue)) {
    return createValidationResult([]);
  }

  const errors: ValidationError[] = [];
  for (let index = 0; index < arrayValue.length; index += 1) {
    if (options?.signal?.aborted) {
      throw Object.assign(new Error('Validation aborted'), { name: 'AbortError' });
    }
    const instancePath = `${expansion.arrayPath}.${index}.${expansion.suffix}`;
    const instanceField: CompiledFormValidationField = { ...field, path: instancePath };
    try {
      const result = await validateCompiledField(
        sharedState,
        instancePath,
        instanceField,
        reason,
        options,
      );
      if (!result.ok) {
        errors.push(...result.errors);
      }
    } catch (error) {
      if (error === VALIDATION_CANCELLED) {
        return createValidationResult([]);
      }
      throw error;
    }
  }
  return createValidationResult(errors);
}
