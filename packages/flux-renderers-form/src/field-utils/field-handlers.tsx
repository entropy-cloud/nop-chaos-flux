import { useEffect, useRef, useState } from 'react';
import {
  getIn,
  reportRuntimeHostIssue,
  type AdapterContext,
  type BaseSchema,
  type FormRuntime,
  type RendererComponentProps,
  type RendererEventHandler,
  type ScopeRef,
  type ValidationScopeRuntime,
  type ValueAdapter,
} from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import {
  useCurrentForm,
  useCurrentFormState,
  useCurrentValidationScope,
  useRenderScope,
  useRendererRuntime,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { shouldValidateOn, shouldValidateOnOwner } from './field-validation.js';
import { useFieldPresentation } from './field-presentation.js';

const UNUSED_VALUE: unique symbol = Symbol('unused');

function identityValue(nextValue: unknown) {
  return nextValue;
}

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof value === 'object' && value !== null && 'then' in value;
}

function reportFieldHandlerError(prefix: string, error: unknown) {
  console.warn(prefix, error);
}

function attachValidationRejectionHandler(result: void | Promise<unknown>, prefix: string) {
  if (isPromiseLike(result)) {
    void result.catch((error: unknown) => {
      reportFieldHandlerError(prefix, error);
    });
  }
}

// Plan 550 / IS-form-wizard-002: a control that was focused PROGRAMMATICALLY
// (APG wizard step-entry focus, dialog autofocus) and blurred without a single
// real user gesture on it must not be treated as touched — its blur would run
// blur-validation, insert a required error mid-press, shift the layout between
// pointerdown and pointerup, and swallow the in-flight click on another control
// (the wizard department picker trigger died exactly this way). Track whether a
// real pointerdown/keydown landed inside the focused element; a silent blur
// skips touchField + validateField. Missing tracking (unknown target) never
// suppresses — the gate only downgrades the programmatic-focus case.
interface ControlEngagementState {
  engaged: boolean;
  cleanup(): void;
}

const controlEngagement = new WeakMap<Element, ControlEngagementState>();

function armControlEngagement(target: unknown) {
  if (!(target instanceof Element)) {
    return;
  }
  controlEngagement.get(target)?.cleanup();
  const state: ControlEngagementState = { engaged: false, cleanup: () => {} };
  const markEngaged = (event: Event) => {
    if (!target.isConnected) {
      disarmControlEngagement(target);
      return;
    }
    if (event.target instanceof Node && (target === event.target || target.contains(event.target))) {
      state.engaged = true;
    }
  };
  document.addEventListener('pointerdown', markEngaged, { capture: true });
  document.addEventListener('keydown', markEngaged, { capture: true });
  state.cleanup = () => {
    document.removeEventListener('pointerdown', markEngaged, { capture: true });
    document.removeEventListener('keydown', markEngaged, { capture: true });
  };
  controlEngagement.set(target, state);
}

function isControlEngaged(target: unknown): boolean {
  if (!(target instanceof Element)) {
    return true;
  }
  return controlEngagement.get(target)?.engaged ?? true;
}

function disarmControlEngagement(target: unknown) {
  if (target instanceof Element) {
    controlEngagement.get(target)?.cleanup();
    controlEngagement.delete(target);
  }
}

export function useBoundFieldValue(
  name: string,
  currentForm: FormRuntime | undefined,
  areValuesEqual?: (a: unknown, b: unknown) => boolean,
): unknown {
  const eq = areValuesEqual ?? Object.is;
  const formValue = useCurrentFormState(
    currentForm ? (state) => (name ? getIn(state.values, name) : state.values) : () => UNUSED_VALUE,
    eq,
    { enabled: Boolean(currentForm), path: name || undefined },
  );
  const scopeValue = useScopeSelector(
    (scopeData) => (name ? getIn(scopeData, name) : scopeData),
    eq,
    { enabled: !currentForm, fallback: UNUSED_VALUE, paths: name ? [name] : undefined },
  );

  return currentForm ? formValue : scopeValue;
}

export function createFieldHandlers(args: {
  name: string;
  currentForm: FormRuntime | undefined;
  currentValidationScope: ValidationScopeRuntime | undefined;
  setValue: (value: unknown) => void | Promise<void>;
  readOnly?: boolean;
  onError?: (error: unknown, operation: string) => void;
  onEngagementArmed?: (target: Element) => void;
}) {
  const { name, currentForm, currentValidationScope, setValue, readOnly, onError, onEngagementArmed } = args;
  const validationOwnerWithFieldState = currentValidationScope as Partial<FormRuntime> | undefined;

  return {
    onFocus(handlerEvent?: { target?: unknown }) {
      armControlEngagement(handlerEvent?.target);
      if (handlerEvent?.target instanceof Element) {
        onEngagementArmed?.(handlerEvent.target);
      }
      if (currentForm) {
        currentForm.visitField(name);
        return;
      }

      validationOwnerWithFieldState?.visitField?.(name);
    },
    onChange(nextValue: unknown) {
      if (readOnly) {
        return;
      }

      if (currentForm) {
        void (async () => {
          await setValue(nextValue);

          if (shouldValidateOn(name, currentForm, 'change')) {
            await currentForm.validateField(name, 'change');
          }
        })().catch((error: unknown) => {
          console.warn('[field-utils] adapter.out failed in onChange', error);
          onError?.(error, 'change');
        });

        return;
      }

      if (currentValidationScope) {
        void (async () => {
          await setValue(nextValue);

          if (shouldValidateOnOwner(name, currentValidationScope, 'change')) {
            await currentValidationScope.validateAt(name, 'change');
          }
        })().catch((error: unknown) => {
          console.warn('[field-utils] adapter.out failed in onChange', error);
          onError?.(error, 'change');
        });

        return;
      }

      const result = setValue(nextValue);
      if (isPromiseLike(result)) {
        void result.catch((error: unknown) => {
          console.warn('[field-utils] adapter.out failed in onChange', error);
          onError?.(error, 'change');
        });
      } else {
        void result;
      }
    },
    onBlur(handlerEvent?: { target?: unknown }) {
      const blurTarget = handlerEvent?.target;
      if (!isControlEngaged(blurTarget)) {
        disarmControlEngagement(blurTarget);
        return;
      }
      disarmControlEngagement(blurTarget);

      if (currentForm) {
        currentForm.touchField(name);

        if (shouldValidateOn(name, currentForm, 'blur')) {
          attachValidationRejectionHandler(
            currentForm.validateField(name, 'blur'),
            '[field-utils] validateField failed in onBlur',
          );
        }

        return;
      }

      if (currentValidationScope) {
        validationOwnerWithFieldState?.touchField?.(name);

        if (shouldValidateOnOwner(name, currentValidationScope, 'blur')) {
          attachValidationRejectionHandler(
            currentValidationScope.validateAt(name, 'blur'),
            '[field-utils] validateAt failed in onBlur',
          );
        }
      }
    },
  };
}

export function useFieldHandlers(args: {
  name: string;
  currentForm: FormRuntime | undefined;
  scope: ScopeRef;
  toFormValue?: (value: unknown) => unknown;
  adapter?: ValueAdapter<unknown, unknown>;
  adapterContext?: AdapterContext;
}) {
  const { name, currentForm, scope, toFormValue = identityValue, adapter, adapterContext } = args;
  const currentValidationScope = useCurrentValidationScope();
  const runtime = useRendererRuntime();
  const generationRef = useRef(0);
  const armedTargetRef = useRef<Element | null>(null);

  // A focused control removed from the DOM never fires blur, so the
  // document-level engagement listeners must also be released on unmount.
  useEffect(() => {
    const armedTarget = armedTargetRef;
    return () => {
      if (armedTarget.current) {
        disarmControlEngagement(armedTarget.current);
      }
    };
  }, []);

  const handleAsyncFieldError = (error: unknown, operation: string) => {
        if (!runtime) {
          return;
        }

        reportRuntimeHostIssue({
          env: runtime.env,
          level: 'warning',
          message:
            error instanceof Error
              ? t('flux.form.fieldUpdateFailedDetail', { message: error.message })
              : t('flux.form.fieldUpdateFailed'),
          error,
          phase: 'action',
          path: name,
          details: {
            operation: `field-${operation}`,
            fieldName: name,
          },
        });
      };

  /* eslint-disable react-hooks/refs */
  return createFieldHandlers({
        name,
        currentForm,
        currentValidationScope,
        readOnly: adapterContext?.readOnly,
        onError: handleAsyncFieldError,
        onEngagementArmed(target) {
          armedTargetRef.current = target;
        },
        setValue(nextValue) {
          const convertedValue = adapter
            ? adapter.out(nextValue, adapterContext ?? { name, readOnly: false })
            : toFormValue(nextValue);

          if (isPromiseLike(convertedValue)) {
            const gen = ++generationRef.current;
            return convertedValue.then((resolvedValue) => {
              if (gen !== generationRef.current) return;

              if (currentForm) {
                currentForm.setValue(name, resolvedValue);
                return;
              }

              scope.update(name, resolvedValue);
            });
          }

          if (currentForm) {
            currentForm.setValue(name, convertedValue);
            return;
          }

          scope.update(name, convertedValue);
        },
      });
  /* eslint-enable react-hooks/refs */
}

function useAdaptedFieldValue(
  value: unknown,
  adapter: ValueAdapter<unknown, unknown> | undefined,
  context: AdapterContext,
) {
  const syncAdapter = adapter as { __syncIn?: true } | undefined;
  const canResolveSynchronously = !adapter || syncAdapter?.__syncIn;
  const synchronousValue = canResolveSynchronously
    ? adapter
      ? adapter.in(value, context)
      : value
    : value;
  const [adaptedValue, setAdaptedValue] = useState(value);

  useEffect(() => {
    if (!adapter) {
      return;
    }

    if (syncAdapter?.__syncIn) {
      return;
    }

    const ac = new AbortController();
    const result = adapter.in(value, context);

    if (!isPromiseLike(result)) {
      queueMicrotask(() => {
        if (!ac.signal.aborted) {
          setAdaptedValue(result);
        }
      });
      return () => {
        ac.abort();
      };
    }

    void result
      .then((nextValue) => {
        if (!ac.signal.aborted) {
          setAdaptedValue(nextValue);
        }
      })
      .catch((error: unknown) => {
        if (!ac.signal.aborted) {
          console.warn('[field-utils] adapter.in failed', error);
        }
      });

    return () => {
      ac.abort();
    };
  }, [adapter, context, syncAdapter, value]);

  return canResolveSynchronously ? synchronousValue : adaptedValue;
}

export function useDefaultValuePush(args: {
  name: string;
  defaultValue: unknown;
  currentForm: FormRuntime | undefined;
  scope: ScopeRef;
  hasInitialValue?: boolean;
}): { markUserEdited: () => void } {
  const hadInitialValueRef = useRef(args.hasInitialValue ?? false);
  const userEditedRef = useRef(false);
  const lastAppliedDefaultRef = useRef<{ hasValue: false } | { hasValue: true; value: unknown }>(
    { hasValue: false },
  );

  const { name, defaultValue, currentForm, scope } = args;

  useEffect(() => {
    if (!name || defaultValue === undefined) return;
    if (hadInitialValueRef.current) return;
    if (userEditedRef.current) return;
    if (
      lastAppliedDefaultRef.current.hasValue &&
      Object.is(lastAppliedDefaultRef.current.value, defaultValue)
    )
      return;
    lastAppliedDefaultRef.current = { hasValue: true, value: defaultValue };
    if (currentForm) {
      currentForm.setValue(name, defaultValue);
    } else {
      scope.update(name, defaultValue);
    }
  }, [name, defaultValue, currentForm, scope]);

  return {
    markUserEdited: () => {
      userEditedRef.current = true;
    },
  };
}

type FieldEventPayload = { name: string; value: unknown };

function reportFieldEventFailure(args: {
  eventName: 'onChange' | 'onBlur';
  error: unknown;
  runtime: ReturnType<typeof useRendererRuntime>;
  name: string;
}) {
  const { eventName, error, runtime, name } = args;
  if (!runtime) {
    return;
  }

  reportRuntimeHostIssue({
    env: runtime.env,
    level: 'warning',
    message: `${eventName} action failed`,
    error,
    phase: 'action',
    path: name,
  });
}

function dispatchFieldEvent(args: {
  eventName: 'onChange' | 'onBlur';
  payload: FieldEventPayload;
  events: Readonly<Record<string, RendererEventHandler | undefined>> | undefined;
  currentForm: FormRuntime | undefined;
  runtime: ReturnType<typeof useRendererRuntime>;
  name: string;
}) {
  const { eventName, payload, events, currentForm, runtime, name } = args;
  const handler = events?.[eventName];
  if (!handler) {
    return;
  }

  try {
    const result = handler(payload, { form: currentForm });

    if (!isPromiseLike(result)) {
      return;
    }

    void result.catch((error: unknown) => {
      reportFieldEventFailure({ eventName, error, runtime, name });
    });
  } catch (error) {
    reportFieldEventFailure({ eventName, error, runtime, name });
  }
}

export function useFormFieldController(
  name: string,
  options?: {
    toFormValue?: (value: unknown) => unknown;
    adapter?: ValueAdapter<unknown, unknown>;
    disabled?: boolean;
    required?: boolean;
    readOnly?: boolean;
    areValuesEqual?: (a: unknown, b: unknown) => boolean;
    defaultValue?: unknown;
    events?: Readonly<Record<string, RendererEventHandler | undefined>>;
  },
) {
  const scope = useRenderScope();
  const currentForm = useCurrentForm();
  const currentValidationScope = useCurrentValidationScope();
  const runtime = useRendererRuntime();
  const readOnly = options?.readOnly ?? false;
  const rawValue = useBoundFieldValue(name, currentForm, options?.areValuesEqual);
  const adapterContext = {
    name,
    readOnly,
  };
  const value = useAdaptedFieldValue(rawValue, options?.adapter, adapterContext);
  const presentation = useFieldPresentation(name, currentValidationScope, {
    disabled: options?.disabled,
    required: options?.required,
    readOnly,
  });
  const handlers = useFieldHandlers({
    name,
    currentForm,
    scope,
    toFormValue: options?.toFormValue,
    adapter: options?.adapter,
    adapterContext,
  });

  const defaultPush = useDefaultValuePush({
    name,
    defaultValue: options?.defaultValue,
    currentForm,
    scope,
    hasInitialValue: rawValue !== undefined,
  });

  const events = options?.events;

  const wrappedHandlers = {
    ...handlers,
    onChange(nextValue: unknown) {
      if (readOnly) {
        return;
      }

      defaultPush.markUserEdited();
      handlers.onChange(nextValue);
      dispatchFieldEvent({
        eventName: 'onChange',
        payload: { name, value: nextValue },
        events,
        currentForm,
        runtime,
        name,
      });
    },
    onBlur(handlerEvent?: { target?: unknown }) {
      if (readOnly) {
        return;
      }

      handlers.onBlur(handlerEvent);
      dispatchFieldEvent({
        eventName: 'onBlur',
        payload: { name, value },
        events,
        currentForm,
        runtime,
        name,
      });
    },
  };

  return {
    currentForm,
    scope,
    value,
    presentation,
    handlers: wrappedHandlers,
  };
}

export function useFormFieldFromProps<P extends BaseSchema = BaseSchema>(
  props: RendererComponentProps<P>,
  options?: {
    adapter?: ValueAdapter<unknown, unknown>;
    toFormValue?: (value: unknown) => unknown;
    areValuesEqual?: (a: unknown, b: unknown) => boolean;
    pushDefaultValue?: boolean;
  },
) {
  const schemaProps = props.props;
  // Initial-value channel precedence (plan 595): documented `value` wins; an
  // authored `defaultValue` (amis-ism, declared on the closed field
  // definitions) feeds the same initial-value slot when `value` is absent —
  // both apply once through the controller's default-push (never overrides
  // existing form data or later user edits).
  const authoredInitialValue =
    schemaProps.value !== undefined
      ? schemaProps.value
      : (schemaProps as { defaultValue?: unknown }).defaultValue;
  return useFormFieldController(String(schemaProps.name ?? ''), {
    adapter: options?.adapter,
    toFormValue: options?.toFormValue,
    areValuesEqual: options?.areValuesEqual,
    disabled: schemaProps.disabled as boolean | undefined,
    required: schemaProps.required as boolean | undefined,
    readOnly: schemaProps.readOnly as boolean | undefined,
    defaultValue: options?.pushDefaultValue === false ? undefined : authoredInitialValue,
    events: props.events,
  });
}
