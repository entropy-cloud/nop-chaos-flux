import { useState, useRef, useCallback, useEffect } from 'react';
import type { ActionNamespaceProvider } from '@nop-chaos/flux-core';
import { useRendererEnv } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';

type RendererEnv = ReturnType<typeof useRendererEnv>;

interface UseWordEditorSaveParams {
  actionProvider: ActionNamespaceProvider;
  env: RendererEnv;
  mountedRef: React.RefObject<boolean>;
}

export function useWordEditorSave({ actionProvider, env, mountedRef }: UseWordEditorSaveParams) {
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const saveMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const saveAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      saveAbortRef.current?.abort();
      if (saveMessageTimerRef.current) clearTimeout(saveMessageTimerRef.current);
    };
  }, []);

  const handleSave = useCallback(async () => {
    if (isSavingRef.current) return;

    isSavingRef.current = true;
    saveAbortRef.current?.abort();
    const controller = new AbortController();
    saveAbortRef.current = controller;
    try {
      const result = await actionProvider.invoke('save', undefined, { signal: controller.signal } as any);
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
    }
  }, [actionProvider, env, mountedRef]);

  return { handleSave, saveMessage };
}
