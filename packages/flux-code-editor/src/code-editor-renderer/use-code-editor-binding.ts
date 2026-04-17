import { useCurrentForm, useRenderScope } from '@nop-chaos/flux-react';
import type { CodeEditorRendererProps } from './shared';

function getValueAtPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    return (current as Record<string, unknown>)[key];
  }, obj);
}

export function useCodeEditorBinding(props: CodeEditorRendererProps, name: string) {
  const scope = useRenderScope();
  const currentForm = useCurrentForm();

  let value: string;
  if (currentForm && name) {
    value = String(getValueAtPath(currentForm.store.getState().values, name) ?? '');
  } else if (name) {
    value = String(scope.get(name) ?? '');
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
    handleBlur
  };
}
