import { hasRendererSlotContent } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Spinner } from '@nop-chaos/ui';

interface TableLoadingOverlayProps {
  loadingContent: React.ReactNode;
}

export function TableLoadingOverlay({ loadingContent }: TableLoadingOverlayProps) {
  // H23: route the fallback status text through i18n instead of a hardcoded
  // English literal so check:i18n-keys and non-English locales cover it.
  const statusText = hasRendererSlotContent(loadingContent) ? loadingContent : t('flux.table.loading');

  return (
    <div
      data-slot="table-loading-overlay"
      className="absolute inset-0 bg-background/80 flex items-center justify-center z-10"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-2">
        <Spinner className="size-6" />
        <span className="text-sm text-muted-foreground">{statusText}</span>
      </div>
    </div>
  );
}
