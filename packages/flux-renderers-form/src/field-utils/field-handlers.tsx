import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  getIn,
  reportRuntimeHostIssue,
  type AdapterContext,
  type FormRuntime,
  type ScopeRef,
  type ValidationScopeRuntime,
  type ValueAdapter,
} from '@nop-chaos/flux-core';
import {
  useCurrentForm,
  useCurrentFormState,
  useCurrentValidationScope,
  useRenderScope,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { RuntimeContext } from '@nop-chaos/flux-react/unstable';
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
}) {
  const { name, currentForm, currentValidationScope, setValue, readOnly, onError } = args;
  const validationOwnerWithFieldState = currentValidationScope as Partial<FormRuntime> | undefined;

  return {
    onFocus() {
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
    onBlur() {
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
  const runtime = useContext(RuntimeContext);
  const generationRef = useRef(0);

  const handleAsyncFieldError = useMemo(
    () => (error: unknown, operation: string) => {
        if (!runtime) {
          return;
        }

        reportRuntimeHostIssue({
          env: runtime.env,
          level: 'warning',
          message:
            error instanceof Error && error.message ? error.message : 'Field update failed',
          error,
          phase: 'action',
          path: name,
          details: {
            operation: `field-${operation}`,
            fieldName: name,
          },
        });
      },
    [name, runtime],
  );

  return useMemo(
    () =>
      /* eslint-disable react-hooks/refs */
      createFieldHandlers({
        name,
        currentForm,
        currentValidationScope,
        readOnly: adapterContext?.readOnly,
        onError: handleAsyncFieldError,
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
      }),
    /* eslint-enable react-hooks/refs */
    [
      name,
      currentForm,
      currentValidationScope,
      scope,
      toFormValue,
      adapter,
      adapterContext,
      handleAsyncFieldError,
    ],
  );
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

export function useFormFieldController(
  name: string,
  options?: {
    toFormValue?: (value: unknown) => unknown;
    adapter?: ValueAdapter<unknown, unknown>;
    disabled?: boolean;
    required?: boolean;
    readOnly?: boolean;
    areValuesEqual?: (a: unknown, b: unknown) => boolean;
  },
) {
  const scope = useRenderScope();
  const currentForm = useCurrentForm();
  const currentValidationScope = useCurrentValidationScope();
  const rawValue = useBoundFieldValue(name, currentForm, options?.areValuesEqual);
  const adapterContext = useMemo(
    () => ({
      name,
      readOnly: options?.readOnly ?? false,
    }),
    [name, options?.readOnly],
  );
  const value = useAdaptedFieldValue(rawValue, options?.adapter, adapterContext);
  const presentation = useFieldPresentation(name, currentValidationScope, {
    disabled: options?.disabled,
    required: options?.required,
    readOnly: options?.readOnly,
  });
  const handlers = useFieldHandlers({
    name,
    currentForm,
    scope,
    toFormValue: options?.toFormValue,
    adapter: options?.adapter,
    adapterContext,
  });

  return {
    currentForm,
    scope,
    value,
    presentation,
    handlers,
  };
}
