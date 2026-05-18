import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  NopComponentInspectResult,
  NopComponentTreeItem,
  NopDebuggerController,
} from '../types.js';

function findMountedElement(cid: number) {
  if (typeof document === 'undefined') {
    return null;
  }

  return document.querySelector(`[data-cid="${cid}"]`) as HTMLElement | null;
}

function useInspectOverlays(
  inspectMode: boolean,
  hoveredElement: HTMLElement | null,
  selectedElement: HTMLElement | null,
) {
  const hoverOverlayRef = useRef<HTMLDivElement | null>(null);
  const activeOverlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const hover = document.createElement('div');
    hover.className = 'nop-debugger-overlay';
    hover.setAttribute('data-overlay-state', 'hover');
    hover.style.display = 'none';
    document.body.appendChild(hover);
    hoverOverlayRef.current = hover;

    const active = document.createElement('div');
    active.className = 'nop-debugger-overlay';
    active.setAttribute('data-overlay-state', 'active');
    active.style.display = 'none';
    document.body.appendChild(active);
    activeOverlayRef.current = active;

    return () => {
      hover.remove();
      active.remove();
    };
  }, []);

  const visibleHoveredElement = inspectMode ? hoveredElement : null;

  useEffect(() => {
    if (!inspectMode || !visibleHoveredElement || !hoverOverlayRef.current) {
      if (hoverOverlayRef.current) {
        hoverOverlayRef.current.style.display = 'none';
      }
      return;
    }

    const rect = visibleHoveredElement.getBoundingClientRect();
    hoverOverlayRef.current.style.display = 'block';
    hoverOverlayRef.current.style.top = `${rect.top}px`;
    hoverOverlayRef.current.style.left = `${rect.left}px`;
    hoverOverlayRef.current.style.width = `${rect.width}px`;
    hoverOverlayRef.current.style.height = `${rect.height}px`;
  }, [inspectMode, visibleHoveredElement]);

  useEffect(() => {
    if (!selectedElement || !activeOverlayRef.current) {
      if (activeOverlayRef.current) {
        activeOverlayRef.current.style.display = 'none';
      }
      return;
    }

    const rect = selectedElement.getBoundingClientRect();
    activeOverlayRef.current.style.display = 'block';
    activeOverlayRef.current.style.top = `${rect.top}px`;
    activeOverlayRef.current.style.left = `${rect.left}px`;
    activeOverlayRef.current.style.width = `${rect.width}px`;
    activeOverlayRef.current.style.height = `${rect.height}px`;
  }, [selectedElement]);
}

export function useInspectMode(args: {
  controller: NopDebuggerController;
  activeTab: string;
  setNodeIdInput(value: string): void;
  setFormTab(value: 'values' | 'errors' | 'meta'): void;
  setEvalResult(value: string | null): void;
}) {
  const [inspectMode, setInspectMode] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [componentTreeRevision, setComponentTreeRevision] = useState(0);
  const [inspectData, setInspectData] = useState<NopComponentInspectResult | null>(null);

  useInspectOverlays(inspectMode, hoveredElement, selectedElement);

  const inspectElement = useCallback(
    (element: HTMLElement) => {
      const inspectResult = args.controller.inspectByElement(element);
      if (!inspectResult) {
        return;
      }

      const cid = String(inspectResult.cid);
      setSelectedElement(element);
      setInspectMode(false);
      args.controller.setActiveTab('node');
      args.setNodeIdInput(cid);
      setInspectData(inspectResult ?? null);
      args.setFormTab('values');
      args.setEvalResult(null);
    },
    [args],
  );

  const inspectTreeItem = useCallback(
    (item: NopComponentTreeItem) => {
      const element = findMountedElement(item.cid);

      setSelectedElement(element);
      setInspectMode(false);
      args.controller.setActiveTab('node');
      args.setNodeIdInput(String(item.cid));

      const inspectResult =
        args.controller.inspectByCid(item.cid) ??
        (element ? args.controller.inspectByElement(element) : undefined);

      setInspectData(inspectResult ?? null);
      args.setFormTab('values');
      args.setEvalResult(null);
    },
    [args],
  );

  useEffect(() => {
    if (!inspectMode) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest('[data-cid]');
      setHoveredElement(target as HTMLElement | null);
    };

    const handleClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest('[data-cid]');
      if (
        !target ||
        (event.target as HTMLElement).closest('.nop-debugger, .nop-debugger-launcher')
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      inspectElement(target as HTMLElement);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick, true);
    };
  }, [inspectElement, inspectMode]);

  useEffect(() => {
    if (!inspectMode) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setInspectMode(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [inspectMode]);

  const componentTree = useMemo(() => {
    void componentTreeRevision;
    if (args.activeTab !== 'node') {
      return [] as NopComponentTreeItem[];
    }
    return args.controller.getComponentTree();
  }, [args.activeTab, args.controller, componentTreeRevision]);

  return {
    inspectMode,
    setInspectMode,
    inspectData,
    setInspectData,
    selectedElement,
    setSelectedElement,
    inspectTreeItem,
    componentTree,
    scanComponentTree() {
      setComponentTreeRevision((value) => value + 1);
    },
  };
}
