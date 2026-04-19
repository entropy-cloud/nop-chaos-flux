import type { CompiledValidationBehavior, ValidationVisibilityTrigger } from '@nop-chaos/flux-core';

const defaultShowErrorOn: readonly ValidationVisibilityTrigger[] = ['touched', 'submit'];
type ValidationVisibilityBehavior = { showErrorOn: readonly ValidationVisibilityTrigger[] };

export function resolveShowErrorTriggers(
  behavior: Pick<CompiledValidationBehavior, 'showErrorOn'> | ValidationVisibilityBehavior | undefined
): readonly ValidationVisibilityTrigger[] {
  return behavior?.showErrorOn ?? defaultShowErrorOn;
}

export function shouldShowFieldError(
  behavior: Pick<CompiledValidationBehavior, 'showErrorOn'> | ValidationVisibilityBehavior | undefined,
  state: { touched: boolean; dirty: boolean; visited: boolean; submitting: boolean }
): boolean {
  return resolveShowErrorTriggers(behavior).some((trigger) => {
    switch (trigger) {
      case 'touched':
        return state.touched;
      case 'dirty':
        return state.dirty;
      case 'visited':
        return state.visited;
      case 'submit':
        return state.submitting;
      default:
        return false;
    }
  });
}
