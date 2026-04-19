import { hasRendererSlotContent } from '@nop-chaos/flux-react';
import { Spinner } from '@nop-chaos/ui';

interface TableLoadingOverlayProps {
  loadingContent: React.ReactNode;
}

export function TableLoadingOverlay({ loadingContent }: TableLoadingOverlayProps) {
  return (
    <div data-slot="table-loading-overlay" className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
      <div className="flex flex-col items-center gap-2">
        <Spinner className="size-6" />
        {hasRendererSlotContent(loadingContent) ? <span className="text-sm text-muted-foreground">{loadingContent}</span> : null}
      </div>
    </div>
  );
}
