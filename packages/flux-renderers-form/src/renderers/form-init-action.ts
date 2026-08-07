import { useEffect, useRef } from 'react';
import type { RendererComponentProps, RendererRuntime, ScopeRef } from '@nop-chaos/flux-core';
import type { FormSchema } from '../schemas.js';
import { reportFormInitActionError } from './form-lifecycle-helpers.js';

type FormInitAction = NonNullable<RendererComponentProps<FormSchema>['events']['initAction']>;

/**
 * Owns the form `initAction` activation effect: run once per activation key,
 * abort-supersede in-flight runs, and route failures to the host diagnostics
 * seam (never a user-visible error).
 */
export function useFormInitAction(input: {
  initAction: FormInitAction | undefined;
  importsReady: boolean;
  autoInit: boolean;
  activationKey: string;
  lifecycleScope: ScopeRef;
  ownedForm: ReturnType<RendererRuntime['createFormRuntime']>;
  runtime: RendererRuntime;
  path: string;
}): void {
  const { initAction, importsReady, autoInit, activationKey, lifecycleScope, ownedForm, runtime, path } =
    input;
  const lastInitKeyRef = useRef<string | undefined>(undefined);
  const inFlightInitKeyRef = useRef<string | undefined>(undefined);
  const initActionAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!initAction || !importsReady || !autoInit) {
      return;
    }

    if (lastInitKeyRef.current === activationKey) {
      return;
    }

    if (inFlightInitKeyRef.current === activationKey) {
      return;
    }

    initActionAbortRef.current?.abort();
    const controller = new AbortController();
    initActionAbortRef.current = controller;
    inFlightInitKeyRef.current = activationKey;

    void initAction(undefined, { scope: lifecycleScope, form: ownedForm, signal: controller.signal })
      .then(() => {
        if (initActionAbortRef.current === controller) {
          lastInitKeyRef.current = activationKey;
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

        if (inFlightInitKeyRef.current === activationKey) {
          inFlightInitKeyRef.current = undefined;
        }
      })
      .finally(() => {
        if (inFlightInitKeyRef.current === activationKey && initActionAbortRef.current === controller) {
          inFlightInitKeyRef.current = undefined;
        }
        if (initActionAbortRef.current === controller) {
          initActionAbortRef.current = null;
        }
      });

    return () => {
      if (initActionAbortRef.current === controller) {
        controller.abort();
        initActionAbortRef.current = null;
        // Refs outlive the effect body, so an abort strands the in-flight marker;
        // clear it or the next effect body bails for the same activationKey and
        // init is silently dropped. `.finally` is controller-identity-guarded so a
        // stale aborted promise cannot clear a fresh re-run's marker.
        if (inFlightInitKeyRef.current === activationKey) {
          inFlightInitKeyRef.current = undefined;
        }
      }
    };
  }, [activationKey, autoInit, importsReady, initAction, lifecycleScope, ownedForm, path, runtime]);
}
