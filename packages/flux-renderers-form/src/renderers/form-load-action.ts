import { useEffect, useRef, useState } from 'react';
import type { RendererComponentProps, RendererRuntime, ScopeRef } from '@nop-chaos/flux-core';
import type { FormSchema } from '../schemas.js';
import { reportFormInitActionError } from './form-lifecycle-helpers.js';

type FormLoadAction = NonNullable<RendererComponentProps<FormSchema>['events']['loadAction']>;

export interface FormLoadActionState {
  /** True while an autoLoad/refresh loadAction request is in flight. */
  loadLoading: boolean;
}

/**
 * Owns the form `loadAction` orchestration: run once per activation key,
 * abort-supersede in-flight requests, hydrate values on success, and expose a
 * refresh handler on the owned form. `lifecycleScope`/`ownedForm` are
 * snapshotted into refs so the effects do not re-run (and abort the in-flight
 * request) on every render. Imports are always prepared by the time the form
 * renders (preload failure blocks compilation), so no import-ready gate is
 * needed here.
 *
 * G2-视角5-03 (plan 486 Phase 1): exposes the in-flight load state so the form
 * render surface can show busy feedback (previously the hook kept ALL state in
 * refs and nothing consumed it).
 */
export function useFormLoadAction(input: {
  loadAction: FormLoadAction | undefined;
  autoLoad: boolean;
  activationKey: string;
  lifecycleScope: ScopeRef;
  ownedForm: ReturnType<RendererRuntime['createFormRuntime']>;
  runtime: RendererRuntime;
  path: string;
}): FormLoadActionState {
  const { loadAction, autoLoad, activationKey, lifecycleScope, ownedForm, runtime, path } = input;
  const loadActionKeyRef = useRef<string | undefined>(undefined);
  const loadAbortRef = useRef<AbortController | null>(null);
  const loadRequestIdRef = useRef(0);
  // G2-视角5-03: React state mirror of "a load request is in flight" — only the
  // start/finish transitions re-render (the request bookkeeping below stays in
  // refs so a mid-flight re-render cannot abort the request).
  const [loadLoading, setLoadLoading] = useState(false);
  // latest instances via refs so the load action effect does not re-run (and
  // abort the in-flight request) on every render — only on activation/action
  // change. `lifecycleScope`/`ownedForm` identities are volatile across renders.
  const loadLifecycleScopeRef = useRef(lifecycleScope);
  const loadOwnedFormRef = useRef(ownedForm);
  useEffect(() => {
    loadLifecycleScopeRef.current = lifecycleScope;
    loadOwnedFormRef.current = ownedForm;
  });

  useEffect(() => {
    if (!loadAction || !autoLoad) {
      return;
    }

    if (loadActionKeyRef.current === activationKey) {
      return;
    }

    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;
    loadActionKeyRef.current = activationKey;
    const requestId = ++loadRequestIdRef.current;
    setLoadLoading(true);

    void loadAction(undefined, {
      scope: loadLifecycleScopeRef.current,
      form: loadOwnedFormRef.current,
      signal: controller.signal,
    })
      .then((result) => {
        if (loadRequestIdRef.current !== requestId) {
          return;
        }
        if (result.ok && !result.cancelled && result.data != null) {
          loadOwnedFormRef.current.setValues(result.data as Record<string, unknown>);
        }
      })
      .catch((error) => {
        if (
          controller.signal.aborted ||
          (error instanceof Error && error.name === 'AbortError') ||
          ((error as { name?: string } | null | undefined)?.name === 'AbortError')
        ) {
          return;
        }
        reportFormInitActionError(runtime, path, error, 'Form loadAction failed');
        // A real failure must not strand the activation key: the effect body
        // bails on `loadActionKeyRef.current === activationKey`, so keeping the
        // key would permanently disable autoLoad for this activation. Clear it
        // (controller-identity-guarded) so a later effect re-run can retry.
        if (loadActionKeyRef.current === activationKey && loadAbortRef.current === controller) {
          loadActionKeyRef.current = undefined;
        }
      })
      .finally(() => {
        // Only the latest request clears the busy flag; a superseded request's
        // finally must not turn it off while a newer one is still in flight.
        if (loadRequestIdRef.current === requestId) {
          setLoadLoading(false);
        }
        if (loadAbortRef.current === controller) {
          loadAbortRef.current = null;
        }
      });

    return () => {
      if (loadAbortRef.current === controller) {
        controller.abort();
        loadAbortRef.current = null;
        // Refs outlive the effect body, so an abort strands the activation key;
        // clear it or the next effect body bails for the same activationKey and
        // autoLoad is silently dropped (StrictMode double-mount). `.catch` is
        // controller-identity-guarded so a stale aborted promise cannot clear a
        // fresh re-run's key.
        if (loadActionKeyRef.current === activationKey) {
          loadActionKeyRef.current = undefined;
        }
        if (loadRequestIdRef.current === requestId) {
          setLoadLoading(false);
        }
      }
    };
  }, [activationKey, autoLoad, loadAction, runtime, path]);

  useEffect(() => {
    if (!loadAction) {
      ownedForm.setRefreshHandler(undefined);
      return;
    }

    ownedForm.setRefreshHandler(async () => {
      // A refresh supersedes any in-flight autoLoad response: bump the request
      // id so the autoLoad `then` guard (`loadRequestIdRef.current !==
      // requestId`) drops the stale result instead of overwriting fresh data.
      loadRequestIdRef.current = loadRequestIdRef.current + 1;
      const requestId = loadRequestIdRef.current;
      setLoadLoading(true);
      try {
        const result = await loadAction(undefined, {
          scope: loadLifecycleScopeRef.current,
          form: loadOwnedFormRef.current,
        });
        if (result.ok && !result.cancelled && result.data != null) {
          loadOwnedFormRef.current.setValues(result.data as Record<string, unknown>);
        }
      } finally {
        if (loadRequestIdRef.current === requestId) {
          setLoadLoading(false);
        }
      }
    });

    return () => {
      ownedForm.setRefreshHandler(undefined);
    };
  }, [loadAction, ownedForm]);

  return { loadLoading };
}
