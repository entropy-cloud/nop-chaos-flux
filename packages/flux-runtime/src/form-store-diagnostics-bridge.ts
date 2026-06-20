import type {
  FormRuntime,
  FormStoreDiagnosticsBridge,
  FormStoreDiagnosticsOptions,
  FormStoreDiagnosticsOwnerQuery,
  FormStoreDiagnosticsOwnerSummary,
  FormStoreDiagnosticsSnapshot,
} from '@nop-chaos/flux-core';

function matchOwner(form: FormRuntime, query: FormStoreDiagnosticsOwnerQuery | undefined): boolean {
  if (!query || Object.keys(query).length === 0) {
    return true;
  }

  if (query.formId !== undefined && form.id === query.formId) {
    return true;
  }

  if (query.formName !== undefined && form.name === query.formName) {
    return true;
  }

  if (query.scopeId !== undefined && form.scopeId === query.scopeId) {
    return true;
  }

  return false;
}

function pickOwner(
  forms: ReadonlySet<FormRuntime>,
  query: FormStoreDiagnosticsOwnerQuery | undefined,
): FormRuntime | undefined {
  if (!query || Object.keys(query).length === 0) {
    if (forms.size === 1) {
      return forms.values().next().value;
    }
    return undefined;
  }

  for (const form of forms) {
    if (matchOwner(form, query)) {
      return form;
    }
  }

  return undefined;
}

export function createFormStoreDiagnosticsBridge(
  forms: ReadonlySet<FormRuntime>,
): FormStoreDiagnosticsBridge {
  const listOwners = (): FormStoreDiagnosticsOwnerSummary[] =>
    Array.from(forms).map((form) => ({
      formId: form.id,
      formName: form.name,
      scopeId: form.scopeId,
    }));

  const startSession = (
    query: FormStoreDiagnosticsOwnerQuery,
    options?: FormStoreDiagnosticsOptions,
  ): boolean => {
    const owner = pickOwner(forms, query);
    if (!owner) {
      return false;
    }
    owner.store.startDiagnosticsSession(options);
    return true;
  };

  const stopSession = (query: FormStoreDiagnosticsOwnerQuery): boolean => {
    const owner = pickOwner(forms, query);
    if (!owner) {
      return false;
    }
    owner.store.stopDiagnosticsSession();
    return true;
  };

  const clearSession = (query: FormStoreDiagnosticsOwnerQuery): boolean => {
    const owner = pickOwner(forms, query);
    if (!owner) {
      return false;
    }
    owner.store.clearDiagnosticsSession();
    return true;
  };

  const getSnapshot = (
    query: FormStoreDiagnosticsOwnerQuery,
  ): FormStoreDiagnosticsSnapshot | undefined => pickOwner(forms, query)?.store.getDiagnosticsSnapshot();

  return {
    listOwners,
    startSession,
    stopSession,
    clearSession,
    getSnapshot,
  };
}

export {
  matchOwner as matchFormStoreDiagnosticsOwnerForTesting,
  pickOwner as pickFormStoreDiagnosticsOwnerForTesting,
};
