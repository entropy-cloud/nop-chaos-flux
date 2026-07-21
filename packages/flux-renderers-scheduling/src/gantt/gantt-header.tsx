import React from 'react';
import { Button, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { RenderRegionHandle } from '@nop-chaos/flux-react';
import { useGanttStore, useGanttLayoutSnapshot } from './gantt-context.js';

interface GanttHeaderProps {
  toolbarRegion?: RenderRegionHandle;
  className?: string;
  onScrollToToday?: () => void;
}

export function GanttHeader({ toolbarRegion, className, onScrollToToday }: GanttHeaderProps) {
  const store = useGanttStore();
  useGanttLayoutSnapshot();

  const handleZoomIn = () => {
    const zooms = store.getAvailableZooms();
    const idx = zooms.findIndex((z) => z.key === store.currentZoom);
    if (idx < zooms.length - 1) {
      store.setZoom(zooms[idx + 1].key);
    }
  };

  const handleZoomOut = () => {
    const zooms = store.getAvailableZooms();
    const idx = zooms.findIndex((z) => z.key === store.currentZoom);
    if (idx > 0) {
      store.setZoom(zooms[idx - 1].key);
    }
  };

  const handleZoomToFit = () => {
    const zooms = store.getAvailableZooms();
    if (zooms.length > 0) {
      store.setZoom(zooms[Math.floor(zooms.length / 2)].key);
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
