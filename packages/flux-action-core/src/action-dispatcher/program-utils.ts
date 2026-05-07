import type {
  ActionSchema,
  CompiledActionNode,
  CompiledActionProgram,
  OperationControlConfig,
} from '@nop-chaos/flux-core';
import { compileActions } from '@nop-chaos/flux-compiler';
import type { ActionDispatcherContext } from './types.js';

export function isRequestBackedAction(action: CompiledActionNode): boolean {
  return action.action === 'ajax' || action.action === 'submitForm' || action.action === 'submit';
}

export function isCompiledActionProgram(action: unknown): action is CompiledActionProgram {
  return Boolean(
    action &&
    typeof action === 'object' &&
    'nodes' in action &&
    Array.isArray((action as CompiledActionProgram).nodes),
  );
}

export function normalizeCompiledActionProgram(
  action: ActionSchema | ActionSchema[] | CompiledActionProgram,
  ctx: ActionDispatcherContext,
): CompiledActionProgram {
  if (isCompiledActionProgram(action)) {
    return action;
  }

  const cached = ctx.compiledProgramCache.get(action as object);

  if (cached) {
    return cached;
  }

  const compiled = compileActions(action, ctx.runtime.expressionCompiler);
  ctx.compiledProgramCache.set(action as object, compiled);
  return compiled;
}

export function applyActionControl(
  action: CompiledActionNode,
  control: OperationControlConfig | undefined,
): CompiledActionNode {
  if (!control) {
    if (action.control) {
      return action;
    }

    return {
      ...action,
      control: {},
    };
  }

  return {
    ...action,
    control: {
      ...(action.control ?? {}),
      timeout: action.control?.timeout ?? control.timeout,
      debounce: action.control?.debounce ?? control.debounce,
      retry: action.control?.retry ?? control.retry,
      control: action.control?.control ?? control,
    },
  };
}
