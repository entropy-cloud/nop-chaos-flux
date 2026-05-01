import { useCurrentForm, useCurrentFormState, useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import { getIn } from '@nop-chaos/flux-core';
import type { CodeEditorRendererProps } from './shared';

export function useCodeEditorBinding(props: CodeEditorRendererProps, name: string) {
  const scope = useRenderScope();
  const currentForm = useCurrentForm();

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
    } else if (name) {
      scope.update(name, newValue);
    }
    props.events.onChange?.({ value: newValue });
  };

  const handleFocus = () => {
    if (currentForm && name) {
      currentForm.visitField(name);
    }
    props.events.onFocus?.();
  };

  const handleBlur = () => {
    if (currentForm && name) {
      currentForm.touchField(name);
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
