import { hasRendererSlotContent } from '@nop-chaos/flux-react';
import { Spinner } from '@nop-chaos/ui';

interface TableLoadingOverlayProps {
  loadingContent: React.ReactNode;
}

export function TableLoadingOverlay({ loadingContent }: TableLoadingOverlayProps) {
  const statusText = hasRendererSlotContent(loadingContent) ? loadingContent : 'Loading';

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
