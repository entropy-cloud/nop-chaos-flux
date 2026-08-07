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
 * request) on every render.
 */
export function useFormLoadAction(input: {
  loadAction: FormLoadAction | undefined;
  autoLoad: boolean;
  importsReady: boolean;
  activationKey: string;
  lifecycleScope: ScopeRef;
  ownedForm: ReturnType<RendererRuntime['createFormRuntime']>;
  runtime: RendererRuntime;
  path: string;
}): void {
  const { loadAction, autoLoad, importsReady, activationKey, lifecycleScope, ownedForm, runtime, path } =
    input;
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
    if (!loadAction || !autoLoad || !importsReady) {
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
      }
    };
  }, [activationKey, autoLoad, importsReady, loadAction, runtime, path]);

  useEffect(() => {
    if (!loadAction || !importsReady) {
      ownedForm.setRefreshHandler(undefined);
      return;
    }

    ownedForm.setRefreshHandler(async () => {
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
  }, [loadAction, importsReady, ownedForm]);
}
