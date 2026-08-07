import { useEffect, useRef } from 'react';
import type { RendererComponentProps, RendererRuntime, ScopeRef } from '@nop-chaos/flux-core';
import type { FormSchema } from '../schemas.js';
import { reportFormInitActionError } from './form-lifecycle-helpers.js';

type FormLoadAction = NonNullable<RendererComponentProps<FormSchema>['events']['loadAction']>;

/**
 * Owns the form `loadAction` orchestration: run once per activation key,
 * abort-supersede in-flight requests, hydrate values on success, and expose a
 * refresh handler on the owned form. `lifecycleScope`/`ownedForm` are
 * snapshotted into refs so the effects do not re-run (and abort the in-flight
 * request) on every render. Imports are always prepared by the time the form
 * renders (preload failure blocks compilation), so no import-ready gate is
 * needed here.
 */
export function useFormLoadAction(input: {
  loadAction: FormLoadAction | undefined;
  autoLoad: boolean;
  activationKey: string;
  lifecycleScope: ScopeRef;
  ownedForm: ReturnType<RendererRuntime['createFormRuntime']>;
  runtime: RendererRuntime;
  path: string;
}): void {
  const { loadAction, autoLoad, activationKey, lifecycleScope, ownedForm, runtime, path } = input;
  const loadActionKeyRef = useRef<string | undefined>(undefined);
  const loadAbortRef = useRef<AbortController | null>(null);
  const loadRequestIdRef = useRef(0);
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
        reportFormInitActionError(runtime, path, error);
        // A real failure must not strand the activation key: the effect body
        // bails on `loadActionKeyRef.current === activationKey`, so keeping the
        // key would permanently disable autoLoad for this activation. Clear it
        // (controller-identity-guarded) so a later effect re-run can retry.
        if (loadActionKeyRef.current === activationKey && loadAbortRef.current === controller) {
          loadActionKeyRef.current = undefined;
        }
      })
      .finally(() => {
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
      const result = await loadAction(undefined, {
        scope: loadLifecycleScopeRef.current,
        form: loadOwnedFormRef.current,
      });
      if (result.ok && !result.cancelled && result.data != null) {
        loadOwnedFormRef.current.setValues(result.data as Record<string, unknown>);
      }
    });

    return () => {
      ownedForm.setRefreshHandler(undefined);
    };
  }, [loadAction, ownedForm]);
}
