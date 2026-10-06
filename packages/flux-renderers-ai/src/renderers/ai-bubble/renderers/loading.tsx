import { t } from '@nop-chaos/flux-i18n';
import type { BubbleContentRendererProps } from '../types.js';

/** Loading placeholder shown while waiting for the first chunk.
 * plan 529 Phase 3：三点交错脉冲（业界思考态形态；Spinner 移除）——动画走
 * styles.css（prefers-reduced-motion 降级为静态半透明点）。 */
export function LoadingContentRenderer({ message }: BubbleContentRendererProps) {
  void message;
  return (
    <div data-slot="ai-bubble-loading" className="flex items-center gap-2 text-muted-foreground">
      <span data-slot="ai-bubble-loading-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="text-sm">{t('flux.ai.thinking')}</span>
      <span role="status" aria-live="polite" className="sr-only">
        {t('flux.ai.thinking')}
      </span>
    </div>
  );
}
