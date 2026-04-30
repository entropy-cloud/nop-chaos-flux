import React from 'react';
import type { FormRuntime, RendererComponentProps } from '@nop-chaos/flux-core';

type BaseNodeInstance = RendererComponentProps<any>['node'];

export function buildDetailDraftInitialValues(
  adaptedValue: unknown,
  fallback: Record<string, unknown> = {}
): Record<string, unknown> {
  if (typeof adaptedValue === 'object' && adaptedValue !== null) {
    return { ...(adaptedValue as Record<string, unknown>) };
  }

  if (adaptedValue !== undefined) {
    return { __value: adaptedValue };
  }

  return fallback;
}

export function readDetailDraftValues(draftForm: FormRuntime) {
  const rawDraftValues = draftForm.scope.readOwn() as Record<string, unknown> & { $form?: unknown };
  const draftValues = { ...rawDraftValues };
  delete draftValues.$form;

  return {
    draftValues,
    workingValue: draftValues.__value !== undefined ? draftValues.__value : draftValues
  };
}

export function useDetailAdaptationAction(input: {
  helpers: RendererComponentProps['helpers'];
  parentScope: RendererComponentProps['node']['scope'];
  parentForm?: FormRuntime;
  node: BaseNodeInstance;
}) {
  const { helpers, parentScope, parentForm, node } = input;

  return React.useCallback(
    (actionSchema: unknown) => helpers.dispatch(actionSchema as any, {
      scope: parentScope,
      form: parentForm ?? undefined,
      page: undefined,
      nodeInstance: node as BaseNodeInstance
    }),
    [helpers, node, parentForm, parentScope]
  );
}

export function useDetailDraftControllerState() {
  const [open, setOpen] = React.useState(false);
  const [draftForm, setDraftForm] = React.useState<FormRuntime | undefined>(undefined);
  const [confirming, setConfirming] = React.useState(false);
  const [draftError, setDraftError] = React.useState<string | undefined>(undefined);
  const mountedRef = React.useRef(true);
  const draftFormRef = React.useRef<FormRuntime | undefined>(undefined);

  React.useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      draftFormRef.current?.dispose();
      draftFormRef.current = undefined;
    };
  }, []);

  const assignDraftForm = React.useCallback((nextDraftForm: FormRuntime | undefined) => {
    draftFormRef.current = nextDraftForm;
    setDraftForm(nextDraftForm);
  }, []);

  const openDraft = React.useCallback((nextDraftForm: FormRuntime) => {
    if (!mountedRef.current) {
      nextDraftForm.dispose();
      return;
    }

    assignDraftForm(nextDraftForm);
    setDraftError(undefined);
    setOpen(true);
  }, [assignDraftForm]);

  const closeDraft = React.useCallback(() => {
    if (!mountedRef.current) {
      return;
    }

    setOpen(false);
    draftFormRef.current?.dispose();
    assignDraftForm(undefined);
    setDraftError(undefined);
  }, [assignDraftForm]);

  const beginConfirm = React.useCallback(() => {
    if (!mountedRef.current) {
      return;
    }

    setConfirming(true);
    setDraftError(undefined);
  }, []);

  const finishConfirm = React.useCallback(() => {
    if (mountedRef.current) {
      setConfirming(false);
    }
  }, []);

  const setDraftErrorSafe = React.useCallback((message: string | undefined) => {
    if (mountedRef.current) {
      setDraftError(message);
    }
  }, []);

  return {
    open,
    draftForm,
    confirming,
    draftError,
    mountedRef,
    openDraft,
    closeDraft,
    beginConfirm,
    finishConfirm,
    setDraftErrorSafe
  };
}
