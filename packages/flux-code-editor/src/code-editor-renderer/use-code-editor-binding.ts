import {
  useCurrentForm,
  useCurrentFormState,
  useCurrentValidationScope,
  useRenderScope,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { getIn } from '@nop-chaos/flux-core';
import type { CodeEditorRendererProps } from './shared.js';

export function useCodeEditorBinding(props: CodeEditorRendererProps, name: string) {
  const scope = useRenderScope();
  const currentForm = useCurrentForm();
  const currentValidationScope = useCurrentValidationScope();
  const hasName = name.length > 0;
  const readOnly = Boolean(props.props.readOnly) || Boolean(props.meta?.disabled);

  const formValue = useCurrentFormState(
    (state) => (hasName ? getIn(state.values, name) : undefined),
    Object.is,
    { enabled: hasName, path: hasName ? name : undefined },
  );
  const scopeValue = useScopeSelector(
    (data) => (hasName ? getIn(data, name) : undefined),
    Object.is,
    { enabled: hasName, fallback: undefined },
  );

  let value: string;
  if (currentForm && hasName) {
    value = String(formValue ?? '');
  } else if (hasName) {
    value = String(scopeValue ?? '');
  } else {
    value = String(props.props.value ?? '');
  }

  const handleChange = (newValue: string) => {
    if (readOnly) {
      return;
    }

    if (currentForm && hasName) {
      currentForm.setValue(name, newValue);
      void currentForm.validateField(name, 'change');
    } else if (hasName) {
      currentValidationScope?.touchField?.(name);
      scope.update(name, newValue);
      void currentValidationScope?.validateAt(name, 'change');
    }
    props.events.onChange?.({ value: newValue });
  };

  const handleFocus = () => {
    if (currentForm && hasName) {
      currentForm.visitField(name);
    } else if (hasName) {
      currentValidationScope?.visitField?.(name);
    }
    props.events.onFocus?.();
  };

  const handleBlur = () => {
    if (currentForm && hasName) {
      currentForm.touchField(name);
      void currentForm.validateField(name, 'blur');
    } else if (hasName) {
      currentValidationScope?.touchField?.(name);
      void currentValidationScope?.validateAt(name, 'blur');
    }
    props.events.onBlur?.();
  };

  return {
    scope,
    value,
    readOnly,
    handleChange,
    handleFocus,
    handleBlur,
  };
}
