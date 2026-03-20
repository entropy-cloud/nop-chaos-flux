import { getCompiledValidationTraversalOrder, getIn } from '@nop-chaos/amis-schema';
import type { CompiledFormValidationModel } from '@nop-chaos/amis-schema';
import type { InitialFieldState } from './form-runtime-types';

export function buildInitialFieldState(
  values: Record<string, any>,
  validation?: CompiledFormValidationModel
): InitialFieldState {
  const initialValues: Record<string, unknown> = {};
  const dirty: Record<string, boolean> = {};

  for (const path of getCompiledValidationTraversalOrder(validation)) {
    initialValues[path] = getIn(values, path);
    dirty[path] = false;
  }

  return {
    initialValues,
    dirty
  };
}
