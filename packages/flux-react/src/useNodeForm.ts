import { useMemo } from 'react';
import type {
  CompiledSchemaNode,
  FormRuntime,
  PageRuntime,
  RendererRuntime,
  ResolvedNodeProps,
  ScopeRef
} from '@nop-chaos/flux-core';

export function useNodeForm(
  runtime: RendererRuntime,
  node: CompiledSchemaNode,
  scope: ScopeRef,
  page: PageRuntime | undefined,
  resolvedProps: ResolvedNodeProps,
  form: FormRuntime | undefined
): FormRuntime | undefined {
  const formId = typeof resolvedProps.value.id === 'string' ? resolvedProps.value.id : node.id;
  const formName = typeof resolvedProps.value.name === 'string' ? resolvedProps.value.name : undefined;
  const initialValues =
    resolvedProps.value.data && typeof resolvedProps.value.data === 'object'
      ? (resolvedProps.value.data as Record<string, unknown>)
      : undefined;
  const ownedForm = useMemo(() => {
    if (node.component.scopePolicy !== 'form') {
      return undefined;
    }

    return runtime.createFormRuntime({
      id: formId,
      name: formName,
      initialValues,
      parentScope: scope,
      page,
      validation: node.validation
    });
  }, [runtime, node.component.scopePolicy, formId, formName, initialValues, scope, page, node.validation]);

  return ownedForm ?? form;
}
