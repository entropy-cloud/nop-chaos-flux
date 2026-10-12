import { t } from '@nop-chaos/flux-i18n';
import type { RendererEnv } from '@nop-chaos/flux-core';

// Unified canvas-command call protocol for the toolbar family
// (WA-wordr-004): canvas-editor commands reject synchronously when no
// editable range / page surface exists. Every toolbar invocation goes through
// here so a rejection is surfaced as a host warning instead of being silently
// swallowed (or inconsistently caught per call site).
export function invokeCanvasCommand(env: RendererEnv | undefined, action: () => void): void {
  try {
    action();
  } catch (error) {
    env?.notify?.(
      'warning',
      error instanceof Error && error.message
        ? error.message
        : t('flux.wordEditor.canvasCommandFailed'),
    );
  }
}
