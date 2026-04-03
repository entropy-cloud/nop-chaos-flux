import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NopComponentInspectResult, NopDebuggerController } from '../types';

export type ComponentTreeItem = {
  cid: number;
  type: string;
  label: string;
  depth: number;
  element: HTMLElement;
};

function collectComponentTree() {
  if (typeof document === 'undefined') {
    return [] as ComponentTreeItem[];
  }

  const elements = document.querySelectorAll('[data-cid]');
  const tree: ComponentTreeItem[] = [];
  const seen = new Set<string>();

  elements.forEach((el) => {
    const cid = el.getAttribute('data-cid') || '0';
    if (seen.has(cid)) {
      return;
    }
    seen.add(cid);

    const textContent = el.textContent?.trim().slice(0, 30) || '';
    const label = textContent || el.tagName.toLowerCase();
    let depth = 0;
    let parent = el.parentElement;
    while (parent && parent !== document.body) {
      if (parent.hasAttribute('data-cid')) {
        depth += 1;
      }
      parent = parent.parentElement;
    }

    tree.push({
      cid: parseInt(cid, 10),
      type: 'element',
      label,
      depth,
      element: el as HTMLElement,
    });
  });

  return tree;
}

function useInspectOverlays(inspectMode: boolean, hoveredElement: HTMLElement | null, selectedElement: HTMLElement | null) {
  const hoverOverlayRef = useRef<HTMLDivElement | null>(null);
  const activeOverlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const hover = document.createElement('div');
    hover.className = 'nop-debugger-overlay nop-debugger-overlay--hover';
    hover.style.display = 'none';
    document.body.appendChild(hover);
    hoverOverlayRef.current = hover;

    const active = document.createElement('div');
    active.className = 'nop-debugger-overlay nop-debugger-overlay--active';
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

  const inspectElement = useCallback((element: HTMLElement) => {
    const cid = element.getAttribute('data-cid') || '0';
    setSelectedElement(element);
    setInspectMode(false);
    args.controller.setActiveTab('node');
    args.setNodeIdInput(cid);

    const inspectResult = args.controller.inspectByElement(element);
    setInspectData(inspectResult ?? null);
    args.setFormTab('values');
    args.setEvalResult(null);
  }, [args]);

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
      if (!target || (event.target as HTMLElement).closest('.nop-debugger, .nop-debugger-launcher')) {
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
      return [] as ComponentTreeItem[];
    }
    return collectComponentTree();
  }, [args.activeTab, componentTreeRevision]);

  return {
    inspectMode,
    setInspectMode,
    inspectData,
    setInspectData,
    selectedElement,
    setSelectedElement,
    inspectElement,
    componentTree,
    scanComponentTree() {
      setComponentTreeRevision((value) => value + 1);
    },
  };
}
