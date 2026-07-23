import { Spinner } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { BubbleContentRendererProps } from '../types.js';

/** Loading placeholder shown while waiting for the first chunk. */
export function LoadingContentRenderer({ message }: BubbleContentRendererProps) {
  void message;
  return (
    <div data-slot="ai-bubble-loading" className="flex items-center gap-2 text-muted-foreground">
      <Spinner className="size-3" />
      <span className="text-sm">{t('flux.ai.thinking')}</span>
    </div>
  );
}
