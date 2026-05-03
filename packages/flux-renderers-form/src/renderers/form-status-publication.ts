import { useEffect } from 'react';
import type { FormStatusSummary, ScopeRef } from '@nop-chaos/flux-core';
import type { FormRuntime } from '@nop-chaos/flux-core';
import { buildFormStatusSummary, publishOwnerStatus } from '@nop-chaos/flux-runtime';

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
      const summary = buildFormStatusSummary(
        ownedForm.store.getState(),
        ownedForm.id,
        ownedForm.name,
        ownedForm.getScopeState().validating ? 1 : 0,
      );

      if (
        lastSummary &&
        lastSummary.submitting === summary.submitting &&
        lastSummary.validating === summary.validating &&
        lastSummary.dirty === summary.dirty &&
        lastSummary.touched === summary.touched &&
        lastSummary.visited === summary.visited &&
        lastSummary.errorCount === summary.errorCount
      ) {
        return;
      }

      lastSummary = summary;
      publishOwnerStatus(resolvedParentScope, resolvedStatusPath, summary);
    }

    publishStatus();

    const unsubscribe = ownedForm.store.subscribe(publishStatus);

    return () => {
      unsubscribe();
      publishOwnerStatus(resolvedParentScope, resolvedStatusPath, undefined);
    };
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

    const unsubscribe = ownedForm.store.subscribe(publishValues);

    return () => {
      unsubscribe();
      resolvedParentScope.update(resolvedValuesPath, undefined);
    };
  }, [valuesPath, ownedForm, parentScope]);
}
