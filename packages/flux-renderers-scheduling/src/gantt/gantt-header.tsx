import React from 'react';
import { Button, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { RenderRegionHandle } from '@nop-chaos/flux-react';
import { useGanttStore } from './gantt-context.js';

interface GanttHeaderProps {
  toolbarRegion?: RenderRegionHandle;
  className?: string;
  onScrollToToday?: () => void;
  onZoomChange?: (zoomKey: string) => void;
}

export function GanttHeader({ toolbarRegion, className, onScrollToToday, onZoomChange }: GanttHeaderProps) {
  const store = useGanttStore();

  const handleZoomIn = () => {
    const zooms = store.getAvailableZooms();
    const idx = zooms.findIndex((z) => z.key === store.currentZoom);
    if (idx < zooms.length - 1) {
      const next = zooms[idx + 1];
      store.setZoom(next.key);
      onZoomChange?.(next.key);
    }
  };

  const handleZoomOut = () => {
    const zooms = store.getAvailableZooms();
    const idx = zooms.findIndex((z) => z.key === store.currentZoom);
    if (idx > 0) {
      const prev = zooms[idx - 1];
      store.setZoom(prev.key);
      onZoomChange?.(prev.key);
    }
  };

  const handleZoomToFit = () => {
    const zooms = store.getAvailableZooms();
    if (zooms.length > 0) {
      const fit = zooms[Math.floor(zooms.length / 2)];
      store.setZoom(fit.key);
      onZoomChange?.(fit.key);
    }
  };

  const handleScrollToToday = () => {
    onScrollToToday?.();
  };

  if (toolbarRegion) {
    return <div className={cn('nop-gantt-toolbar flex items-center gap-2 p-2 border-b', className)} data-slot="gantt-toolbar">{toolbarRegion.render()}</div>;
  }

  return (
    <div className={cn('nop-gantt-toolbar flex items-center gap-1 p-2 border-b bg-gray-50', className)} data-slot="gantt-toolbar">
      <Button variant="ghost" size="sm" onClick={handleZoomOut}>−</Button>
      <Button variant="ghost" size="sm" onClick={handleZoomIn}>+</Button>
      <Button variant="ghost" size="sm" onClick={handleZoomToFit}>{t('scheduling.gantt.zoomFit')}</Button>
      <Button variant="ghost" size="sm" onClick={handleScrollToToday}>{t('scheduling.today')}</Button>
    </div>
  );
}
