import { useEffect, useRef, useState } from 'react';
import type { RendererComponentProps, RendererRuntime, ScopeRef } from '@nop-chaos/flux-core';
import type { FormSchema } from '../schemas.js';
import { reportFormInitActionError } from './form-lifecycle-helpers.js';

type FormLoadAction = NonNullable<RendererComponentProps<FormSchema>['events']['loadAction']>;

/**
 * C1 contract (plan 593): first-frame-honest load lifecycle state projected to
 * the form root as `data-load-state`. Vocabulary is frozen — downstream e2e
 * waits on `loaded`/`error` instead of networkidle blinding.
 *
 * - `idle`    — no loadAction, autoLoad disabled, or the load was cancelled
 * - `loading` — a load request is in flight (true from the first frame when
 *               autoLoad will fire — closes the old busy-absent window)
 * - `loaded`  — load settled successfully (same commit boundary as value hydration)
 * - `error`   — load settled with a non-abort failure
 */
export type FormLoadState = 'idle' | 'loading' | 'loaded' | 'error';

export interface FormLoadActionState {
  /** True while an autoLoad/refresh loadAction request is in flight. */
  loadLoading: boolean;
  /** C1 contract projection for `data-load-state` on the form root. */
  loadState: FormLoadState;
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
  // C1 (plan 593): first-frame-honest load state. Lazy init makes autoLoad
  // forms report `loading` on the very first commit — before the effect that
  // dispatches the request even runs — so there is never a frame where the
  // request is (about to be) in flight but the DOM claims otherwise.
  const [loadState, setLoadState] = useState<FormLoadState>(() =>
    loadAction && autoLoad ? 'loading' : 'idle',
  );
  const loadLoading = loadState === 'loading';
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
    // C1 contract: the state machine must enter `loading` synchronously when
    // the activation key changes — deferring to a microtask would create a
    // frame where the request is about to dispatch but the DOM still claims
    // idle. This is the one deliberate sync setState in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- C1 contract: activation-key change must set loading in the same commit boundary as the dispatch effect
    setLoadState('loading');

    void loadAction(undefined, {
      scope: loadLifecycleScopeRef.current,
      form: loadOwnedFormRef.current,
      signal: controller.signal,
    })
      .then((result) => {
        if (loadRequestIdRef.current !== requestId) {
          return;
        }
        if (result.ok && !result.cancelled) {
          if (result.data != null) {
            loadOwnedFormRef.current.setValues(result.data as Record<string, unknown>);
          }
          // C1: `loaded` lands on the same commit boundary as value hydration —
          // a downstream wait on data-load-state="loaded" implies fields are filled.
          setLoadState('loaded');
        } else if (!result.ok) {
          setLoadState('error');
        } else {
          // Cancelled result: the load was intentionally cancelled, not failed.
          setLoadState('idle');
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
        if (loadRequestIdRef.current === requestId) {
          setLoadState('error');
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
        // C1: an abort is not an error — return to idle. A superseding request
        // immediately re-enters `loading`; an unmount discards the state anyway.
        if (loadRequestIdRef.current === requestId) {
          setLoadState('idle');
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
      setLoadState('loading');
      try {
        const result = await loadAction(undefined, {
          scope: loadLifecycleScopeRef.current,
          form: loadOwnedFormRef.current,
        });
        if (loadRequestIdRef.current !== requestId) {
          return;
        }
        if (result.ok && !result.cancelled) {
          if (result.data != null) {
            loadOwnedFormRef.current.setValues(result.data as Record<string, unknown>);
          }
          setLoadState('loaded');
        } else if (!result.ok) {
          setLoadState('error');
        } else {
          setLoadState('idle');
        }
      } catch (error) {
        if (loadRequestIdRef.current === requestId) {
          setLoadState('error');
        }
        throw error;
      }
    });

    return () => {
      ownedForm.setRefreshHandler(undefined);
    };
  }, [loadAction, ownedForm]);

  return { loadLoading, loadState };
}
