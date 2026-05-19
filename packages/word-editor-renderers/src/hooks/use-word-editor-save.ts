import { useState, useRef, useCallback, useEffect } from 'react';
import type { ActionContext, ActionNamespaceProvider } from '@nop-chaos/flux-core';
import {
  useCurrentActionScope,
  useCurrentComponentRegistry,
  useCurrentPage,
  useCurrentSurfaceRuntime,
  useRenderScope,
  useRendererEnv,
  useRendererRuntime,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';

type RendererEnv = ReturnType<typeof useRendererEnv>;

interface UseWordEditorSaveParams {
  actionProvider: ActionNamespaceProvider;
  env: RendererEnv;
  mountedRef: React.RefObject<boolean>;
  setSaving?(saving: boolean): void;
}

export function useWordEditorSave({
  actionProvider,
  env,
  mountedRef,
  setSaving,
}: UseWordEditorSaveParams) {
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const saveMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const saveAbortRef = useRef<AbortController | null>(null);
  const runtime = useRendererRuntime();
  const scope = useRenderScope();
  const actionScope = useCurrentActionScope();
  const componentRegistry = useCurrentComponentRegistry();
  const page = useCurrentPage();
  const surfaceRuntime = useCurrentSurfaceRuntime();

  useEffect(() => {
    return () => {
      saveAbortRef.current?.abort();
      if (saveMessageTimerRef.current) clearTimeout(saveMessageTimerRef.current);
    };
  }, []);

  const handleSave = useCallback(async () => {
    if (isSavingRef.current) return;

    isSavingRef.current = true;
    setSaving?.(true);
    saveAbortRef.current?.abort();
    const controller = new AbortController();
    saveAbortRef.current = controller;
    const actionContext: ActionContext = {
      runtime,
      scope,
      signal: controller.signal,
      actionScope,
      componentRegistry,
      page,
      surfaceRuntime,
    };
    try {
      const result = await actionProvider.invoke('save', undefined, actionContext);
      if (!mountedRef.current) return;

      if (result.ok) {
        setSaveMessage(t('flux.wordEditor.saved'));
        if (saveMessageTimerRef.current) clearTimeout(saveMessageTimerRef.current);
        saveMessageTimerRef.current = setTimeout(() => {
          if (mountedRef.current) {
            setSaveMessage(null);
          }
        }, 2000);
        return;
      }

      env.notify?.(
        'warning',
        result.error instanceof Error && result.error.message
          ? result.error.message
          : t('flux.common.saveFailed'),
      );
    } catch (error) {
      if (!mountedRef.current) return;

      if (
        controller.signal.aborted ||
        (error instanceof Error && error.name === 'AbortError') ||
        ((error as { name?: string } | null | undefined)?.name === 'AbortError')
      ) {
        return;
      }

      env.notify?.(
        'warning',
        error instanceof Error && error.message ? error.message : t('flux.common.saveFailed'),
      );
    } finally {
      if (saveAbortRef.current === controller) {
        saveAbortRef.current = null;
      }
      isSavingRef.current = false;
      setSaving?.(false);
    }
  }, [
    actionProvider,
    actionScope,
    componentRegistry,
    env,
    mountedRef,
    page,
    runtime,
    setSaving,
    scope,
    surfaceRuntime,
  ]);

  return { handleSave, saveMessage };
}
