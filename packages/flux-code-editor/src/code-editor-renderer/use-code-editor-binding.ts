import {
  useCurrentForm,
  useCurrentFormState,
  useCurrentValidationScope,
  useRenderScope,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { getIn } from '@nop-chaos/flux-core';
import { useEffect, useRef } from 'react';
import type { CodeEditorRendererProps } from './shared.js';

export function useCodeEditorBinding(props: CodeEditorRendererProps, name: string) {
  const scope = useRenderScope();
  const currentForm = useCurrentForm();
  const currentValidationScope = useCurrentValidationScope();
  const hasName = name.length > 0;
  const readOnly = props.props.readOnly || props.props.disabled || false;
  const valueRef = useRef<string>(String(props.props.value ?? ''));

  const formValue = useCurrentFormState(
    (state) => (hasName ? getIn(state.values, name) : undefined),
    Object.is,
    { enabled: Boolean(currentForm && hasName), path: hasName ? name : undefined },
  );
  const scopeValue = useScopeSelector(
    (data) => (hasName ? getIn(data, name) : undefined),
    Object.is,
    { enabled: !currentForm && hasName, fallback: undefined, paths: hasName ? [name] : undefined },
  );

  let value: string;
  if (currentForm && hasName) {
    value = String(formValue ?? '');
  } else if (hasName) {
    value = String(scopeValue ?? '');
  } else {
    value = String(props.props.value ?? '');
  }

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    const owner = currentForm ?? currentValidationScope;

    if (!owner || !hasName) {
      return;
    }

    return owner.registerField({
      path: name,
      childPaths: [],
      getValue() {
        return valueRef.current;
      },
      syncValue() {
        return valueRef.current;
      },
      validateChild() {
        return [];
      },
    }).unregister;
  }, [currentForm, currentValidationScope, hasName, name]);

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
