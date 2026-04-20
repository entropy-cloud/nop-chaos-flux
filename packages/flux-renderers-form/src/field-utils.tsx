import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getIn,
  getCompiledValidationField,
  type AdapterContext,
  type CompiledValidationBehavior,
  type FormFieldStateSnapshot,
  type FormRuntime,
  type RendererComponentProps,
  type SchemaFieldRule,
  type ValueAdapter
} from '@nop-chaos/flux-core';
import {
  shouldShowFieldError,
  selectCurrentFormFieldPresentation,
  resolveRendererSlotContent,
  useCurrentForm,
  useCurrentFormState,
  useChildFieldState,
  useOwnedFieldState,
  useRenderScope,
  useScopeSelector
} from '@nop-chaos/flux-react';

export const formLabelFieldRule: SchemaFieldRule = {
  key: 'label',
  kind: 'value-or-region',
  regionKey: 'label'
};

export const defaultValidationBehavior: CompiledValidationBehavior = {
  triggers: ['blur'],
  showErrorOn: ['touched', 'submit']
};

export function getFieldValidationBehavior(name: string, currentForm: FormRuntime | undefined): CompiledValidationBehavior {
  if (!currentForm || !name) {
    return defaultValidationBehavior;
  }

  const field = getCompiledValidationField(currentForm.validation, name);
  return field?.behavior ?? currentForm.validation?.behavior ?? defaultValidationBehavior;
}

export function shouldValidateOn(name: string, currentForm: FormRuntime | undefined, trigger: 'change' | 'blur' | 'submit') {
  return getFieldValidationBehavior(name, currentForm).triggers.includes(trigger);
}

export function readFieldValue(scope: ReturnType<typeof useRenderScope>, name: string): unknown {
  return name ? scope.get(name) ?? '' : scope.readOwn();
}

export function readCheckboxGroupValue(scope: ReturnType<typeof useRenderScope>, name: string): string[] {
  const value = readFieldValue(scope, name);
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

const UNUSED_VALUE: unique symbol = Symbol('unused');

export function useBoundFieldValue(name: string, currentForm: FormRuntime | undefined, areValuesEqual?: (a: unknown, b: unknown) => boolean): unknown {
  const eq = areValuesEqual ?? Object.is;
  const formValue = useCurrentFormState(
    currentForm ? (state) => (name ? getIn(state.values, name) : state.values) : () => UNUSED_VALUE,
    eq
  );
  const scopeValue = useScopeSelector(
    (scopeData) => (name ? getIn(scopeData, name) : scopeData),
    eq,
    { enabled: !currentForm, fallback: UNUSED_VALUE }
  );

  return currentForm ? formValue : scopeValue;
}

export function createFieldHandlers(args: {
  name: string;
  currentForm: FormRuntime | undefined;
  setValue: (value: unknown) => void | Promise<void>;
}) {
  const { name, currentForm, setValue } = args;

  return {
    onFocus() {
      if (currentForm) {
        currentForm.visitField(name);
      }
    },
    onChange(nextValue: unknown) {
      if (currentForm) {
        void (async () => {
          await setValue(nextValue);

          if (shouldValidateOn(name, currentForm, 'change') && currentForm.isTouched(name)) {
            await currentForm.validateField(name);
          }
        })();

        return;
      }

      void setValue(nextValue);
    },
    onBlur() {
      if (currentForm) {
        currentForm.touchField(name);

        if (shouldValidateOn(name, currentForm, 'blur')) {
          void currentForm.validateField(name);
        }
      }
    }
  };
}

function identityValue(nextValue: unknown) {
  return nextValue;
}

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof value === 'object' && value !== null && 'then' in value;
}

export function useFieldHandlers(args: {
  name: string;
  currentForm: FormRuntime | undefined;
  scope: ReturnType<typeof useRenderScope>;
  toFormValue?: (value: unknown) => unknown;
  adapter?: ValueAdapter<unknown, unknown>;
  adapterContext?: AdapterContext;
}) {
  const { name, currentForm, scope, toFormValue = identityValue, adapter, adapterContext } = args;

  return useMemo(
    () => createFieldHandlers({
      name,
      currentForm,
      setValue(nextValue) {
        const convertedValue = adapter
          ? adapter.out(nextValue, adapterContext ?? { name, readOnly: false })
          : toFormValue(nextValue);

        if (isPromiseLike(convertedValue)) {
          return convertedValue.then((resolvedValue) => {
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
      }
    }),
    [name, currentForm, scope, toFormValue, adapter, adapterContext]
  );
}

function useAdaptedFieldValue(
  value: unknown,
  adapter: ValueAdapter<unknown, unknown> | undefined,
  context: AdapterContext
) {
  const syncAdapter = adapter as { __syncIn?: true } | undefined;
  const canResolveSynchronously = !adapter || syncAdapter?.__syncIn;
  const synchronousValue = canResolveSynchronously
    ? (adapter ? adapter.in(value, context) : value)
    : value;
  const [adaptedValue, setAdaptedValue] = useState(value);
  const seq = useRef(0);

  useEffect(() => {
    if (!adapter) {
      return;
    }

    if (syncAdapter?.__syncIn) {
      return;
    }

    const currentSeq = seq.current + 1;
    seq.current = currentSeq;
    let active = true;
    const result = adapter.in(value, context);

    if (!isPromiseLike(result)) {
      queueMicrotask(() => {
        if (seq.current === currentSeq && active) {
          setAdaptedValue(result);
        }
      });
      return () => {
        active = false;
      };
    }

    void result.then((nextValue) => {
      if (active && seq.current === currentSeq) {
        setAdaptedValue(nextValue);
      }
    });

    return () => {
      active = false;
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
  }
) {
  const scope = useRenderScope();
  const currentForm = useCurrentForm();
  const rawValue = useBoundFieldValue(name, currentForm, options?.areValuesEqual);
  const adapterContext = useMemo(
    () => ({
      name,
      readOnly: Boolean(options?.readOnly)
    }),
    [name, options?.readOnly]
  );
  const value = useAdaptedFieldValue(rawValue, options?.adapter, adapterContext);
  const presentation = useFieldPresentation(name, currentForm, {
    disabled: options?.disabled,
    required: options?.required,
    readOnly: options?.readOnly
  });
  const handlers = useFieldHandlers({
    name,
    currentForm,
    scope,
    toFormValue: options?.toFormValue,
    adapter: options?.adapter,
    adapterContext
  });

  return {
    currentForm,
    scope,
    value,
    presentation,
    handlers
  };
}

function useFormFieldState(name: string) {
  return useOwnedFieldState(name);
}

export function resolveFieldLabelContent(props: Pick<RendererComponentProps, 'props' | 'meta' | 'regions'>) {
  return resolveRendererSlotContent(props, 'label');
}

export function resolveFieldLabelText(props: Pick<RendererComponentProps, 'props' | 'meta'>, fallback?: string) {
  if (typeof props.props.label === 'string' && props.props.label) {
    return props.props.label;
  }

  return fallback;
}

export function getChildFieldUiState(input: {
  behavior: CompiledValidationBehavior;
  fieldState: FormFieldStateSnapshot;
}) {
  const error = input.fieldState.error;
  const touched = input.fieldState.touched;
  const dirty = input.fieldState.dirty;
  const visited = input.fieldState.visited;
  const showError = Boolean(
    error &&
      shouldShowFieldError(input.behavior, {
        touched,
        dirty,
        visited,
        submitting: input.fieldState.submitting
      })
  );

  return {
    error,
    touched,
    dirty,
    visited,
    showError,
    className: undefined,
    'data-child-field-visited': visited ? '' : undefined,
    'data-child-field-touched': touched ? '' : undefined,
    'data-child-field-dirty': dirty ? '' : undefined,
    'data-child-field-invalid': showError ? '' : undefined,
  };
}

export function useFieldPresentation(
  name: string,
  currentForm: FormRuntime | undefined,
  options?: {
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
  }
) {
  const fieldState = useFormFieldState(name);
  const behavior = getFieldValidationBehavior(name, currentForm);
  const currentPresentation = useCurrentFormState(
    (state) => selectCurrentFormFieldPresentation(state, {
      path: name,
      validation: currentForm?.validation,
      disabled: options?.disabled,
      readOnly: options?.readOnly,
      required: options?.required,
      query: { path: name, ownerPath: name }
    }),
    (left, right) =>
      left.error === right.error &&
      left.validating === right.validating &&
      left.touched === right.touched &&
      left.dirty === right.dirty &&
      left.visited === right.visited &&
      left.submitting === right.submitting &&
      left.effectiveDisabled === right.effectiveDisabled &&
      left.effectiveRequired === right.effectiveRequired &&
      left.showError === right.showError &&
      left.interactive === right.interactive &&
      left.readOnly === right.readOnly
  );
  const presentation = currentForm
    ? currentPresentation
    : {
        ...fieldState,
        effectiveDisabled: Boolean(options?.disabled),
        effectiveRequired: Boolean(options?.required),
        showError: Boolean(
          fieldState.error &&
            shouldShowFieldError(behavior, {
              touched: fieldState.touched,
              dirty: fieldState.dirty,
              visited: fieldState.visited,
              submitting: fieldState.submitting
            })
        ),
        interactive: !options?.disabled && !options?.readOnly,
        readOnly: Boolean(options?.readOnly)
      };

  return {
    fieldState: {
      ...presentation,
      error: presentation.error
    },
    effectiveDisabled: presentation.effectiveDisabled,
    effectiveRequired: presentation.effectiveRequired,
    interactive: presentation.interactive,
    readOnly: presentation.readOnly,
    showError: presentation.showError,
    className: undefined,
    'data-field-visited': presentation.visited ? '' : undefined,
    'data-field-touched': presentation.touched ? '' : undefined,
    'data-field-dirty': presentation.dirty ? '' : undefined,
    'data-field-invalid': presentation.showError ? '' : undefined,
  };
}

export function useCompositeChildFieldState(path: string) {
  return useChildFieldState(path);
}

export function useHiddenFieldPolicy(name: string, hidden: boolean) {
  const currentForm = useCurrentForm();

  useEffect(() => {
    if (!currentForm || !name) {
      return;
    }

    currentForm.notifyFieldHidden(name, hidden);

    return () => {
      currentForm.notifyFieldHidden(name, false);
    };
  }, [currentForm, name, hidden]);
}
