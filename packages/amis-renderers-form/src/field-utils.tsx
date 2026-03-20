import {
  getIn,
  getCompiledValidationField,
  type CompiledValidationBehavior,
  type FormFieldStateSnapshot,
  type FormRuntime,
  type RendererComponentProps,
  type SchemaFieldRule
} from '@nop-chaos/amis-schema';
import {
  resolveRendererSlotContent,
  useAggregateError,
  useChildFieldState,
  useCurrentFormState,
  useOwnedFieldState,
  useRenderScope,
  useScopeSelector
} from '@nop-chaos/amis-react';

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

export function shouldShowFieldError(
  behavior: CompiledValidationBehavior,
  state: { touched: boolean; dirty: boolean; visited: boolean; submitting: boolean }
) {
  return behavior.showErrorOn.some((trigger) => {
    switch (trigger) {
      case 'touched':
        return state.touched;
      case 'dirty':
        return state.dirty;
      case 'visited':
        return state.visited;
      case 'submit':
        return state.submitting;
    }
  });
}

export function readFieldValue(scope: ReturnType<typeof useRenderScope>, name: string): unknown {
  return name ? scope.get(name) ?? '' : '';
}

export function readCheckboxGroupValue(scope: ReturnType<typeof useRenderScope>, name: string): string[] {
  const value = readFieldValue(scope, name);
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

export function useBoundFieldValue(name: string, currentForm: FormRuntime | undefined): unknown {
  const formValue = useCurrentFormState((state) => (name ? getIn(state.values, name) : undefined), Object.is);
  const scopeValue = useScopeSelector((scopeData) => (name ? getIn(scopeData, name) : undefined), Object.is);

  return currentForm ? formValue : scopeValue;
}

function getFieldClassName(state: {
  visited: boolean;
  touched: boolean;
  dirty: boolean;
  showError: boolean;
}) {
  return [
    'na-field',
    state.visited ? 'na-field--visited' : '',
    state.touched ? 'na-field--touched' : '',
    state.dirty ? 'na-field--dirty' : '',
    state.showError ? 'na-field--invalid' : ''
  ]
    .filter(Boolean)
    .join(' ');
}

export function createFieldHandlers(args: {
  name: string;
  currentForm: FormRuntime | undefined;
  scope: ReturnType<typeof useRenderScope>;
  setValue: (value: unknown) => void;
}) {
  const { name, currentForm, scope, setValue } = args;

  return {
    onFocus() {
      if (currentForm && name) {
        currentForm.visitField(name);
      }
    },
    onChange(nextValue: unknown) {
      if (currentForm) {
        setValue(nextValue);

        if (shouldValidateOn(name, currentForm, 'change') && currentForm.isTouched(name)) {
          void currentForm.validateField(name);
        }

        return;
      }

      scope.update(name, nextValue);
    },
    onBlur() {
      if (currentForm && name) {
        currentForm.touchField(name);

        if (shouldValidateOn(name, currentForm, 'blur')) {
          void currentForm.validateField(name);
        }
      }
    }
  };
}

function useFormFieldState(name: string) {
  return useOwnedFieldState(name);
}

export function resolveFieldLabelContent(props: Pick<RendererComponentProps, 'props' | 'meta' | 'regions'>) {
  return resolveRendererSlotContent(props, 'label', { metaKey: 'label' });
}

export function resolveFieldLabelText(props: Pick<RendererComponentProps, 'props' | 'meta'>, fallback?: string) {
  if (typeof props.props.label === 'string' && props.props.label) {
    return props.props.label;
  }

  if (typeof props.meta.label === 'string' && props.meta.label) {
    return props.meta.label;
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
    className: [
      'na-child-field',
      visited ? 'na-child-field--visited' : '',
      touched ? 'na-child-field--touched' : '',
      dirty ? 'na-child-field--dirty' : '',
      showError ? 'na-child-field--invalid' : ''
    ]
      .filter(Boolean)
      .join(' ')
  };
}

export function useFieldPresentation(name: string, currentForm: FormRuntime | undefined) {
  const fieldState = useFormFieldState(name);
  const behavior = getFieldValidationBehavior(name, currentForm);
  const aggregateError = useAggregateError(name);
  const visibleError = aggregateError ?? fieldState.error;
  const showError = Boolean(
    visibleError &&
      shouldShowFieldError(behavior, {
        touched: fieldState.touched,
        dirty: fieldState.dirty,
        visited: fieldState.visited,
        submitting: fieldState.submitting
      })
  );

  return {
    fieldState: {
      ...fieldState,
      error: visibleError
    },
    showError,
    className: getFieldClassName({ ...fieldState, showError })
  };
}

export function useCompositeChildFieldState(path: string) {
  return useChildFieldState(path);
}
