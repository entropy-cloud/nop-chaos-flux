import { useEffect, useRef } from 'react';
import type { DesignerXyflowControlledViewport } from './types.js';

export interface UseMinimapNavigationParams {
  surfaceRef: React.RefObject<HTMLDivElement | null>;
  viewport: DesignerXyflowControlledViewport;
  showMinimap: boolean;
  onViewportChange(
    viewport: { x: number; y: number; zoom: number },
    event?: React.MouseEvent,
  ): void;
}

export function useMinimapNavigation({
  surfaceRef,
  viewport,
  showMinimap,
  onViewportChange,
}: UseMinimapNavigationParams) {
  const viewportRef = useRef(viewport);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    if (!showMinimap) return;

    const minimapSvg = surfaceRef.current?.querySelector('.react-flow__minimap svg');
    if (minimapSvg && minimapSvg.getAttribute('preserveAspectRatio') !== 'none') {
      minimapSvg.setAttribute('preserveAspectRatio', 'none');
    }
  }, [showMinimap, surfaceRef]);

  useEffect(() => {
    if (!showMinimap) return;

    const svgEl = surfaceRef.current?.querySelector('.react-flow__minimap svg');
    if (!svgEl) return;

    let startClient: { x: number; y: number } | null = null;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      startClient = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!startClient) return;
      const dx = e.clientX - startClient.x;
      const dy = e.clientY - startClient.y;
      startClient = null;

      if (dx * dx + dy * dy > 25) return;

      const viewBox = svgEl.getAttribute('viewBox');
      if (!viewBox) return;
      const [vx, vy, vw, vh] = viewBox.split(/[\s,]+/).map(Number);
      const rect = svgEl.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      const relY = (e.clientY - rect.top) / rect.height;
      const flowX = vx + relX * vw;
      const flowY = vy + relY * vh;

      const cw = surfaceRef.current?.clientWidth ?? 0;
      const ch = surfaceRef.current?.clientHeight ?? 0;
      const z = viewportRef.current.zoom;
      onViewportChange(
        {
          x: cw / 2 - flowX * z,
          y: ch / 2 - flowY * z,
          zoom: z,
        },
        undefined,
      );
    };

    svgEl.addEventListener('mousedown', onMouseDown as EventListener);
    window.addEventListener('mouseup', onMouseUp as EventListener, true);

    return () => {
      svgEl.removeEventListener('mousedown', onMouseDown as EventListener);
      window.removeEventListener('mouseup', onMouseUp as EventListener, true);
    };
  }, [showMinimap, onViewportChange, surfaceRef]);
}
