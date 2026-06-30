import type { FormRuntime } from '@nop-chaos/flux-core';

export type ScalarItemValidationMetadata = {
  label?: string;
  required?: boolean;
};

/**
 * Resolve the scalar-array item validation metadata (label / required) authored
 * on the `item` region's first child node. Pure function; returns `undefined`
 * when neither field is declared.
 */
export function getScalarItemValidationMetadata(
  value: unknown,
): ScalarItemValidationMetadata | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const label = typeof record.label === 'string' && record.label ? record.label : undefined;
  const required = record.required === true ? true : undefined;

  if (label === undefined && required === undefined) {
    return undefined;
  }

  return { label, required };
}

export type ScalarArrayItemError = {
  path: string;
  ownerPath: string;
  rule: 'required';
  message: string;
  sourceKind: 'runtime-registration';
};

/**
 * Collect `required` errors for the given scalar-array child paths. Pure
 * function: derives errors from the live `items` array + declared `required`
 * flag without touching the form runtime.
 */
export function collectScalarArrayItemErrors(input: {
  items: unknown[];
  arrayPath: string;
  childPaths: string[];
  childLabel: string;
  required: boolean;
}): ScalarArrayItemError[] {
  if (!input.required) {
    return [];
  }

  const errors: ScalarArrayItemError[] = [];

  for (const path of input.childPaths) {
    const relativePath = path.startsWith(`${input.arrayPath}.`)
      ? path.slice(input.arrayPath.length + 1)
      : path;
    const match = relativePath.match(/^(\d+)$/);
    if (!match) {
      continue;
    }

    const rawValue = input.items[Number(match[1])];
    const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue;
    if (value === '' || value === undefined || value === null) {
      errors.push({
        path,
        ownerPath: path,
        rule: 'required',
        message: `${input.childLabel} is required`,
        sourceKind: 'runtime-registration',
      });
    }
  }

  return errors;
}

/**
 * Glue helper: collect scalar-array item errors and publish them to the owning
 * form via `applyExternalErrors` (replace scope). Has side effects through the
 * form runtime.
 */
export function publishScalarArrayItemErrors(input: {
  form: FormRuntime;
  sourceId: string;
  childPaths: string[];
  items: unknown[];
  arrayPath: string;
  childLabel: string;
  required: boolean;
}): ScalarArrayItemError[] {
  const errors = collectScalarArrayItemErrors({
    items: input.items,
    arrayPath: input.arrayPath,
    childPaths: input.childPaths,
    childLabel: input.childLabel,
    required: input.required,
  });

  input.form.applyExternalErrors({
    sourceId: input.sourceId,
    errors,
    replace: true,
  });

  return errors;
}
