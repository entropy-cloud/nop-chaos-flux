import React from 'react';
import type {
  ChildValidationMode,
  FormRuntime,
  RendererComponentProps,
  ValidationScopeRuntime,
} from '@nop-chaos/flux-core';

type BaseNodeInstance = RendererComponentProps<any>['node'];

export interface AsyncSequencer {
  nextToken(): number;
  isCurrent(token: number): boolean;
  invalidate(): void;
}

export function useAsyncSequencer(): AsyncSequencer {
  const currentTokenRef = React.useRef(0);

  return React.useMemo(
    () => ({
      nextToken() {
        currentTokenRef.current += 1;
        return currentTokenRef.current;
      },
      isCurrent(token: number) {
        return currentTokenRef.current === token;
      },
      invalidate() {
        currentTokenRef.current += 1;
      },
    }),
    [],
  );
}

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
  const openSequencer = useAsyncSequencer();
  const confirmSequencer = useAsyncSequencer();

  React.useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      openSequencer.invalidate();
      confirmSequencer.invalidate();
      draftFormRef.current?.dispose();
      draftFormRef.current = undefined;
    };
  }, [confirmSequencer, openSequencer]);

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

      confirmSequencer.invalidate();
      setConfirming(false);
      draftFormRef.current?.dispose();
      assignDraftForm(nextDraftForm);
      setDraftError(undefined);
      setOpen(true);
    },
    [assignDraftForm, confirmSequencer],
  );

  const closeDraft = React.useCallback(() => {
    if (!mountedRef.current) {
      return;
    }

    openSequencer.invalidate();
    confirmSequencer.invalidate();
    setConfirming(false);
    setOpen(false);
    draftFormRef.current?.dispose();
    assignDraftForm(undefined);
    setDraftError(undefined);
  }, [assignDraftForm, confirmSequencer, openSequencer]);

  const beginConfirm = React.useCallback(() => {
    if (!mountedRef.current) {
      return undefined;
    }

    const token = confirmSequencer.nextToken();
    setConfirming(true);
    setDraftError(undefined);
    return token;
  }, [confirmSequencer]);

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
    openSequencer,
    confirmSequencer,
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
