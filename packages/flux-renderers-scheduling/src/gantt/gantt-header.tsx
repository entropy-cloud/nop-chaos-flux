import React from 'react';
import { Button, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { MinusIcon, PlusIcon } from 'lucide-react';
import type { RenderRegionHandle } from '@nop-chaos/flux-react';
import type { GanttStoreApi } from './gantt.types.js';

interface GanttHeaderProps {
  store: GanttStoreApi;
  toolbarRegion?: RenderRegionHandle;
  className?: string;
  onZoomChange?: (zoomKey: string) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  /** Fired from the Today button (scroll + schema scrollToToday reaction). */
  onTodayClick?: () => void;
  /** [G4-R3-视角11-01] Fired from the Fit button — the parent performs the
   *  real fit computation (store.zoomToFit) so the copy's promise holds. */
  onZoomToFit?: () => void;
}

export function GanttHeader({ store, toolbarRegion, className, onZoomIn, onZoomOut, onTodayClick, onZoomToFit }: GanttHeaderProps) {
  const handleZoomIn = () => {
    const zooms = store.getAvailableZooms();
    const idx = zooms.findIndex((z) => z.key === store.currentZoom);
    if (idx < zooms.length - 1) {
      // Single driver (22-01): the parent's onZoomIn performs store.setZoom +
      // onZoomChange. Calling them here too would double-dispatch.
      onZoomIn?.();
    }
  };

  const handleZoomOut = () => {
    const zooms = store.getAvailableZooms();
    const idx = zooms.findIndex((z) => z.key === store.currentZoom);
    if (idx > 0) {
      onZoomOut?.();
    }
  };

  const handleZoomToFit = () => {
    // [G4-R3-视角11-01] single driver (22-01): the parent runs the real fit
    // (store.zoomToFit) + dispatch — no fake middle-zoom-slot jump here.
    onZoomToFit?.();
  };

  const handleScrollToToday = () => {
    onTodayClick?.();
  };

  if (toolbarRegion) {
    return <div className={cn('nop-gantt-toolbar flex items-center gap-2 p-2 border-b', className)} data-slot="gantt-toolbar">{toolbarRegion.render()}</div>;
  }

  return (
    <div className={cn('nop-gantt-toolbar flex items-center gap-1 p-2 border-b bg-muted', className)} data-slot="gantt-toolbar">
      <Button variant="ghost" size="sm" onClick={handleZoomOut} aria-label={t('scheduling.gantt.zoomOut')}>
        <MinusIcon className="size-4" aria-hidden="true" />
      </Button>
      <Button variant="ghost" size="sm" onClick={handleZoomIn} aria-label={t('scheduling.gantt.zoomIn')}>
        <PlusIcon className="size-4" aria-hidden="true" />
      </Button>
      <Button variant="ghost" size="sm" onClick={handleZoomToFit}>{t('scheduling.gantt.zoomFit')}</Button>
      <Button variant="ghost" size="sm" onClick={handleScrollToToday}>{t('scheduling.today')}</Button>
    </div>
  );
}
