import {
  useCurrentForm,
  useCurrentFormState,
  useCurrentValidationScope,
  useRenderScope,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { getIn } from '@nop-chaos/flux-core';
import type { CodeEditorRendererProps } from './shared';

export function useCodeEditorBinding(props: CodeEditorRendererProps, name: string) {
  const scope = useRenderScope();
  const currentForm = useCurrentForm();
  const currentValidationScope = useCurrentValidationScope();

  const formValue = useCurrentFormState(
    (state) => (name ? getIn(state.values, name) : state.values),
    Object.is,
    { path: name || undefined },
  );
  const scopeValue = useScopeSelector((data) => (name ? getIn(data, name) : data), Object.is);

  let value: string;
  if (currentForm && name) {
    value = String(formValue ?? '');
  } else if (name) {
    value = String(scopeValue ?? '');
  } else {
    value = String(props.props.value ?? '');
  }

  const handleChange = (newValue: string) => {
    if (currentForm && name) {
      currentForm.setValue(name, newValue);
      void currentForm.validateField(name, 'change');
    } else if (name) {
      currentValidationScope?.touchField?.(name);
      scope.update(name, newValue);
      void currentValidationScope?.validateAt(name, 'change');
    }
    props.events.onChange?.({ value: newValue });
  };

  const handleFocus = () => {
    if (currentForm && name) {
      currentForm.visitField(name);
    } else if (name) {
      currentValidationScope?.visitField?.(name);
    }
    props.events.onFocus?.();
  };

  const handleBlur = () => {
    if (currentForm && name) {
      currentForm.touchField(name);
      void currentForm.validateField(name, 'blur');
    } else if (name) {
      currentValidationScope?.touchField?.(name);
      void currentValidationScope?.validateAt(name, 'blur');
    }
    props.events.onBlur?.();
  };

  return {
    scope,
    value,
    handleChange,
    handleFocus,
    handleBlur,
  };
}
