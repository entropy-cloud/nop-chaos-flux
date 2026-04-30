import type {
  ActionResult,
  CompiledFormValidationModel,
  RuntimeFieldRegistration,
} from '@nop-chaos/flux-core';
import {
  getCompiledValidationField,
  getCompiledValidationTraversalOrder,
} from '@nop-chaos/flux-core';

export function classifySubmitResult(result: ActionResult): 'success' | 'failure' | 'neutral' {
  if (result.skipped) {
    return 'neutral';
  }

  if (!result.ok || result.cancelled || result.timedOut) {
    return 'failure';
  }

  return 'success';
}

export function buildTouchedStateWithPath(
  input: Record<string, boolean>,
  path: string,
): Record<string, boolean> {
  if (input[path]) {
    return input;
  }

  return {
    ...input,
    [path]: true,
  };
}

export function buildSubmitTouchedState(input: {
  touched: Record<string, boolean>;
  validation: CompiledFormValidationModel | undefined;
  runtimeFieldRegistrations: Iterable<RuntimeFieldRegistration>;
  defaultValidationTriggers: readonly string[];
}) {
  let nextTouched = input.touched;
  const submitTargets = getCompiledValidationTraversalOrder(input.validation);

  for (const path of submitTargets) {
    const behavior = getCompiledValidationField(input.validation, path)?.behavior;
    const triggers = behavior?.triggers ?? input.defaultValidationTriggers;
    const showErrorOn = behavior?.showErrorOn ??
      input.validation?.behavior.showErrorOn ?? ['touched', 'submit'];

    if (triggers.includes('submit') || showErrorOn.includes('submit')) {
      nextTouched = buildTouchedStateWithPath(nextTouched, path);
    }
  }

  for (const registration of input.runtimeFieldRegistrations) {
    nextTouched = buildTouchedStateWithPath(nextTouched, registration.path);

    for (const childPath of registration.childPaths ?? []) {
      nextTouched = buildTouchedStateWithPath(nextTouched, childPath);
    }
  }

  return nextTouched;
}
