import {
  getCompiledValidationField,
  type CompiledValidationBehavior,
  type FormRuntime,
  type ValidationScopeRuntime,
} from '@nop-chaos/flux-core';

export const defaultValidationBehavior: CompiledValidationBehavior = {
  triggers: ['blur'],
  showErrorOn: ['touched', 'submit'],
};

export function getFieldValidationBehavior(
  name: string,
  currentForm: FormRuntime | undefined,
): CompiledValidationBehavior {
  if (!currentForm || !name) {
    return defaultValidationBehavior;
  }

  const field = getCompiledValidationField(currentForm.validation, name);
  return field?.behavior ?? currentForm.validation?.behavior ?? defaultValidationBehavior;
}

export function getValidationBehaviorForOwner(
  name: string,
  owner: ValidationScopeRuntime | undefined,
): CompiledValidationBehavior {
  if (!owner || !name) {
    return defaultValidationBehavior;
  }

  const field = getCompiledValidationField(owner.validation, name);
  return field?.behavior ?? owner.validation?.behavior ?? defaultValidationBehavior;
}

export function shouldValidateOn(
  name: string,
  currentForm: FormRuntime | undefined,
  trigger: 'change' | 'blur' | 'submit',
) {
  return getFieldValidationBehavior(name, currentForm).triggers.includes(trigger);
}

export function shouldValidateOnOwner(
  name: string,
  owner: ValidationScopeRuntime | undefined,
  trigger: 'change' | 'blur' | 'submit',
) {
  return getValidationBehaviorForOwner(name, owner).triggers.includes(trigger);
}
