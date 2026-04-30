import React from 'react';
import type {
  ChildValidationMode,
  FormRuntime,
  RendererComponentProps,
  ValidationScopeRuntime,
} from '@nop-chaos/flux-core';

type BaseNodeInstance = RendererComponentProps<any>['node'];

export function buildDetailDraftInitialValues(
  adaptedValue: unknown,
  fallback: Record<string, unknown> = {},
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
    workingValue: draftValues.__value !== undefined ? draftValues.__value : draftValues,
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
    (actionSchema: unknown) =>
      helpers.dispatch(actionSchema as any, {
        scope: parentScope,
        form: parentForm ?? undefined,
        page: undefined,
        nodeInstance: node as BaseNodeInstance,
      }),
    [helpers, node, parentForm, parentScope],
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

  const openDraft = React.useCallback(
    (nextDraftForm: FormRuntime) => {
      if (!mountedRef.current) {
        nextDraftForm.dispose();
        return;
      }

      assignDraftForm(nextDraftForm);
      setDraftError(undefined);
      setOpen(true);
    },
    [assignDraftForm],
  );

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
    setDraftErrorSafe,
  };
}

export function useDetailChildValidationContract(input: {
  parentValidationOwner?: ValidationScopeRuntime;
  draftForm?: FormRuntime;
  childOwnerId: string;
  mode?: ChildValidationMode;
  active: boolean;
}) {
  const { parentValidationOwner, draftForm, childOwnerId, mode = 'summary-gate', active } = input;

  React.useEffect(() => {
    if (!parentValidationOwner || !draftForm || !active) {
      return;
    }

    parentValidationOwner.registerChildContract({
      childOwnerId,
      mode,
      active: true,
      unregister() {
        parentValidationOwner.unregisterChildContract(childOwnerId);
      },
      getState() {
        const state = draftForm.getScopeState();
        return {
          ready: state.ready,
          validating: state.validating,
          valid: state.valid,
          hasErrors: state.hasErrors,
        };
      },
      async triggerValidation() {
        const result = await draftForm.validateAll('submit');
        return {
          ok: result.ok,
          errors: result.errors,
        };
      },
    });

    return () => {
      parentValidationOwner.unregisterChildContract(childOwnerId);
    };
  }, [active, childOwnerId, draftForm, mode, parentValidationOwner]);
}
