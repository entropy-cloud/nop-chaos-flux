import {
  useCurrentForm,
  useCurrentFormState,
  useCurrentValidationScope,
  useRenderScope,
  useRendererRuntime,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { getIn, reportRuntimeHostIssue } from '@nop-chaos/flux-core';
import { useEffect, useRef } from 'react';
import type { CodeEditorRendererProps } from './shared.js';

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return typeof value === 'object' && value !== null && 'then' in value;
}

function attachValidationRejectionHandler(
  result: unknown,
  report: (error: unknown) => void,
): void {
  if (isPromiseLike(result)) {
    void result.catch(report);
  }
}

export function useCodeEditorBinding(props: CodeEditorRendererProps, name: string) {
  const scope = useRenderScope();
  const currentForm = useCurrentForm();
  const currentValidationScope = useCurrentValidationScope();
  const runtime = useRendererRuntime();
  const hasName = name.length > 0;
  const readOnly = props.props.readOnly || props.props.disabled || false;
  const valueRef = useRef<string>(String(props.props.value ?? ''));

  const reportValidationFailure = (error: unknown) => {
    if (!runtime) {
      console.warn('[code-editor] validateField/validateAt failed', error);
      return;
    }
    reportRuntimeHostIssue({
      env: runtime.env,
      level: 'warning',
      message: 'Field validation failed',
      error,
      phase: 'action',
      path: name,
    });
  };

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
      attachValidationRejectionHandler(currentForm.validateField(name, 'change'), reportValidationFailure);
    } else if (hasName) {
      currentValidationScope?.touchField?.(name);
      scope.update(name, newValue);
      attachValidationRejectionHandler(currentValidationScope?.validateAt(name, 'change'), reportValidationFailure);
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
      attachValidationRejectionHandler(currentForm.validateField(name, 'blur'), reportValidationFailure);
    } else if (hasName) {
      currentValidationScope?.touchField?.(name);
      attachValidationRejectionHandler(currentValidationScope?.validateAt(name, 'blur'), reportValidationFailure);
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
