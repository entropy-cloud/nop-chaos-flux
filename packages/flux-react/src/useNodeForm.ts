import { useRef } from 'react';
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
  const formRef = useRef<{
    nodeId: string;
    formId: string;
    formName?: string;
    parentScope: ScopeRef;
    page?: PageRuntime;
    validation: CompiledSchemaNode['validation'];
    form: FormRuntime;
  } | undefined>(undefined);
  let activeForm = form;

  if (node.component.scopePolicy === 'form') {
    const formId = typeof resolvedProps.value.id === 'string' ? resolvedProps.value.id : node.id;
    const formName = typeof resolvedProps.value.name === 'string' ? resolvedProps.value.name : undefined;
    const initialValues =
      resolvedProps.value.data && typeof resolvedProps.value.data === 'object'
        ? (resolvedProps.value.data as Record<string, unknown>)
        : undefined;

    if (
      !formRef.current ||
      formRef.current.nodeId !== node.id ||
      formRef.current.formId !== formId ||
      formRef.current.formName !== formName ||
      formRef.current.parentScope !== scope ||
      formRef.current.page !== page ||
      formRef.current.validation !== node.validation
    ) {
      formRef.current = {
        nodeId: node.id,
        formId,
        formName,
        parentScope: scope,
        page,
        validation: node.validation,
        form: runtime.createFormRuntime({
          id: formId,
          name: formName,
          initialValues,
          parentScope: scope,
          page,
          validation: node.validation
        })
      };
    }

    activeForm = formRef.current.form;
  }

  return activeForm;
}
