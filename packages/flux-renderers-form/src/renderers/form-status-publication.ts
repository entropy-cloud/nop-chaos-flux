import { useEffect } from 'react';
import type { FormStatusSummary, ScopeRef } from '@nop-chaos/flux-core';
import type { FormRuntime } from '@nop-chaos/flux-core';

export function usePublishedFormStatus(args: {
  statusPath?: string;
  parentScope: ScopeRef;
  ownedForm: FormRuntime;
}) {
  const { statusPath, parentScope, ownedForm } = args;

  useEffect(() => {
    if (!statusPath || !parentScope) {
      return;
    }

    const resolvedStatusPath = statusPath;
    const resolvedParentScope = parentScope;
    let lastSummary: FormStatusSummary | undefined;

    function publishStatus() {
      const state = ownedForm.store.getState();
      let errorCount = 0;
      let validating = false;
      let dirty = false;
      let touched = false;
      let visited = false;

      for (const fieldState of Object.values(state.fieldStates)) {
        if (fieldState.errors) {
          errorCount += fieldState.errors.length;
        }
        if (fieldState.validating) validating = true;
        if (fieldState.dirty) dirty = true;
        if (fieldState.touched) touched = true;
        if (fieldState.visited) visited = true;
      }

      const hasErrors = errorCount > 0;

      if (
        lastSummary &&
        lastSummary.submitting === state.submitting &&
        lastSummary.validating === validating &&
        lastSummary.dirty === dirty &&
        lastSummary.touched === touched &&
        lastSummary.visited === visited &&
        lastSummary.errorCount === errorCount
      ) {
        return;
      }

      const summary: FormStatusSummary = {
        id: ownedForm.id,
        name: ownedForm.name,
        submitting: state.submitting,
        validating,
        dirty,
        touched,
        visited,
        hasErrors,
        errorCount,
        valid: !hasErrors,
        invalid: hasErrors
      };

      lastSummary = summary;
      resolvedParentScope.update(resolvedStatusPath, summary);
    }

    publishStatus();

    return ownedForm.store.subscribe(publishStatus);
  }, [statusPath, ownedForm, parentScope]);
}

export function usePublishedFormValues(args: {
  valuesPath?: string;
  parentScope: ScopeRef;
  ownedForm: FormRuntime;
}) {
  const { valuesPath, parentScope, ownedForm } = args;

  useEffect(() => {
    if (!valuesPath || !parentScope) {
      return;
    }

    const resolvedValuesPath = valuesPath;
    const resolvedParentScope = parentScope;
    let lastPublishedValues: Record<string, unknown> | undefined;

    function publishValues() {
      const values = ownedForm.store.getState().values;
      if (Object.is(lastPublishedValues, values)) {
        return;
      }

      lastPublishedValues = values;
      resolvedParentScope.update(resolvedValuesPath, values);
    }

    publishValues();

    return ownedForm.store.subscribe(publishValues);
  }, [valuesPath, ownedForm, parentScope]);
}
