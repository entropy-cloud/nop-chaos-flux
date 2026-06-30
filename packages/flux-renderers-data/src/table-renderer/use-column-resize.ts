import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getIn } from '@nop-chaos/flux-core';
import { useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import type { TableColumnSchema } from '../schemas.js';

const DEFAULT_MIN_WIDTH = 40;

function isDevRuntime() {
  const importMeta = import.meta as ImportMeta & { env?: { DEV?: boolean } };
  return importMeta.env?.DEV === true;
}

function toNumericWidth(value: number | string | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(/px$/, ''));
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

export function resolveColumnWidth(column: TableColumnSchema, fallback = 120): number {
  return toNumericWidth(column.width, fallback);
}

export function resolveColumnMinWidth(column: TableColumnSchema): number {
  const min = typeof column.minWidth === 'number' && Number.isFinite(column.minWidth)
    ? column.minWidth
    : DEFAULT_MIN_WIDTH;
  return Math.max(min, DEFAULT_MIN_WIDTH);
}

export function resolveColumnMaxWidth(column: TableColumnSchema): number | undefined {
  if (typeof column.maxWidth === 'number' && Number.isFinite(column.maxWidth) && column.maxWidth > 0) {
    return column.maxWidth;
  }

  return undefined;
}

export function isColumnResizable(column: TableColumnSchema, columnResize: boolean | undefined): boolean {
  if (columnResize === false) {
    return false;
  }

  return column.resizable !== false;
}

export interface ColumnResizeApi {
  widths: Record<string, number>;
  getColumnWidth(column: TableColumnSchema, index: number): number;
  startResize(column: TableColumnSchema, index: number, startClientX: number): () => void;
}

interface ActiveResize {
  key: string;
  minWidth: number;
  maxWidth: number | undefined;
  startWidth: number;
  startClientX: number;
  // Live dragged-to width, updated on every pointermove and committed on pointerup.
  next: number;
  // Whether pointermove should reflect visual feedback for this drag. Under
  // `controlled` without an `onWidthsChange` channel the handle is read-only, so
  // reflecting a transient width would falsely imply a successful drag.
  feedback: boolean;
}

export interface UseColumnResizeOptions {
  columnWidthsOwnership?: 'local' | 'controlled' | 'scope';
  columnWidthsStatePath?: string;
  // Controlled write-back channel (mirrors use-row-drag-sort's `onReorder`).
  onWidthsChange?: (next: Record<string, number>) => void;
}

function normalizeWidthsRecord(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const result: Record<string, number> = {};
  for (const [key, raw] of Object.entries(record)) {
    const numeric = typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? toNumericWidth(raw, NaN)
        : NaN;
    if (Number.isFinite(numeric) && numeric > 0) {
      result[key] = numeric;
    }
  }
  return result;
}

export function useColumnResize(
  columns: TableColumnSchema[],
  columnResize: boolean | undefined,
  options?: UseColumnResizeOptions,
): ColumnResizeApi {
  const ownership = options?.columnWidthsOwnership ?? 'local';
  const statePath = options?.columnWidthsStatePath;
  const onWidthsChange = options?.onWidthsChange;
  const renderScope = useRenderScope();

  if (ownership === 'scope' && !statePath && isDevRuntime()) {
    console.warn(
      '[TableRenderer] columnWidthsOwnership: "scope" requires columnWidthsStatePath; falling back to local persistence (widths will be lost on unmount).',
    );
  }

  const effectiveOwnership: 'local' | 'controlled' | 'scope' =
    ownership === 'scope' && !statePath ? 'local' : ownership;

  // G10 parity (mirrors use-row-drag-sort): controlled ownership without an
  // onWidthsChange channel is read-only, so a drag would otherwise be a fully
  // silent no-op. Surface it as a dev warning so the misconfiguration is
  // diagnosable instead of invisible.
  if (effectiveOwnership === 'controlled' && !onWidthsChange && isDevRuntime()) {
    console.warn(
      '[TableRenderer] columnWidthsOwnership "controlled" is read-only without an onWidthsChange handler. ' +
        'The resize handle cannot persist a drag. Supply onWidthsChange to receive width changes, or switch to "local"/"scope".',
    );
  }

  const initialWidths = useMemo(() => {
    const map: Record<string, number> = {};
    columns.forEach((column, index) => {
      if (!isColumnResizable(column, columnResize)) {
        return;
      }
      const key = column.name ?? `column-${index}`;
      map[key] = resolveColumnWidth(column);
    });
    return map;
  }, [columns, columnResize]);

  const [localWidths, setLocalWidths] = useState<Record<string, number>>(initialWidths);
  // Transient overlay applied during a drag so the column visually tracks the
  // pointer under every ownership mode (scope had zero feedback before). For
  // scope/controlled it is retained past pointerup until the authoritative owner
  // reflects the same value, avoiding a revert-flicker; the sync effect below
  // clears synced scope entries.
  const [draggingWidths, setDraggingWidths] = useState<Record<string, number>>({});
  const activeResizeRef = useRef<ActiveResize | null>(null);
  // Teardown for the window listeners attached during the active drag. Owned by
  // React via the unmount effect below so a mid-drag unmount / pointercancel /
  // touch-scroll takeover never leaks listeners or leaves activeResizeRef stuck.
  const listenerCleanupRef = useRef<(() => void) | null>(null);

  const scopeWidths = useScopeSelector(
    (scopeData) => {
      if (effectiveOwnership !== 'scope' || !statePath) {
        return undefined;
      }
      return normalizeWidthsRecord(getIn(scopeData, statePath));
    },
    (a, b) => {
      if (!a || !b) return a === b;
      const aKeys = Object.keys(a);
      const bKeys = Object.keys(b);
      if (aKeys.length !== bKeys.length) return false;
      return aKeys.every((key) => a[key] === b[key]);
    },
    { paths: statePath && effectiveOwnership === 'scope' ? [statePath] : undefined },
  );

  const widths: Record<string, number> = useMemo(() => {
    const base =
      effectiveOwnership === 'scope' && scopeWidths
        ? { ...initialWidths, ...scopeWidths }
        : effectiveOwnership === 'controlled'
          ? { ...initialWidths }
          : { ...initialWidths, ...localWidths };
    return { ...base, ...draggingWidths };
  }, [effectiveOwnership, initialWidths, localWidths, scopeWidths, draggingWidths]);

  // Latest-values ref so the (closure-based) pointer listeners always read fresh
  // values without stale-capture bugs. Synced in an effect (never during render).
  const latest = useRef({
    effectiveOwnership,
    statePath,
    onWidthsChange,
    scopeWidths,
    initialWidths,
    draggingWidths,
    renderScope,
  });
  useEffect(() => {
    latest.current = {
      effectiveOwnership,
      statePath,
      onWidthsChange,
      scopeWidths,
      initialWidths,
      draggingWidths,
      renderScope,
    };
  });

  // The dragging overlay is bounded (only the actively-resized column is added on
  // pointermove, and local mode clears it on pointerup). For scope/controlled the
  // last-dragged entry is retained so there is no revert-flicker before the owner
  // propagates the same value; it is naturally superseded by the next drag and
  // agrees with the owner once it catches up, so no render-time setState sync is
  // needed.

  // H4: unmount teardown. If a drag is in progress when the table unmounts, the
  // window listeners must be removed and activeResizeRef reset (no persist — a
  // half-drag should not be committed to scope/local on teardown).
  useEffect(() => {
    return () => {
      listenerCleanupRef.current?.();
      listenerCleanupRef.current = null;
      activeResizeRef.current = null;
    };
  }, []);

  const columnKey = useCallback(
    (column: TableColumnSchema, index: number): string =>
      column.name ?? `column-${index}`,
    [],
  );

  const getColumnWidth = useCallback(
    (column: TableColumnSchema, index: number): number => {
      const key = columnKey(column, index);
      return widths[key] ?? resolveColumnWidth(column);
    },
    [columnKey, widths],
  );

  const stopListeners = useCallback(() => {
    listenerCleanupRef.current?.();
    listenerCleanupRef.current = null;
  }, []);

  const startResize = useCallback(
    (column: TableColumnSchema, index: number, startClientX: number) => {
      const key = columnKey(column, index);
      const minWidth = resolveColumnMinWidth(column);
      const maxWidth = resolveColumnMaxWidth(column);
      const startWidth = widths[key] ?? resolveColumnWidth(column);
      const { effectiveOwnership: eo, onWidthsChange: oc } = latest.current;

      stopListeners();
      activeResizeRef.current = {
        key,
        minWidth,
        maxWidth,
        startWidth,
        startClientX,
        next: startWidth,
        feedback: eo !== 'controlled' || Boolean(oc),
      };

      const onPointerMove = (event: PointerEvent) => {
        const active = activeResizeRef.current;
        if (!active) return;
        const delta = event.clientX - active.startClientX;
        let next = active.startWidth + delta;
        if (next < active.minWidth) next = active.minWidth;
        if (active.maxWidth !== undefined && next > active.maxWidth) next = active.maxWidth;
        active.next = next;
        if (active.feedback) {
          setDraggingWidths((prev) => (prev[active.key] === next ? prev : { ...prev, [active.key]: next }));
        }
      };

      const finish = () => {
        stopListeners();
        const active = activeResizeRef.current;
        activeResizeRef.current = null;
        if (!active) return;
        const finalWidth = active.next;
        const key = active.key;
        const {
          effectiveOwnership: eo2,
          statePath: sp,
          onWidthsChange: oc2,
          scopeWidths: sw,
          initialWidths: iw,
          draggingWidths: dw,
          renderScope: rs,
        } = latest.current;

        if (eo2 === 'scope' && sp) {
          const current = sw && typeof sw === 'object' ? sw : { ...iw };
          // H1: persist the dragged-TO width (active.next), not the pre-drag width.
          rs.update(sp, { ...current, [key]: finalWidth });
          // keep dragging overlay until scope syncs (sync effect clears it)
        } else if (eo2 === 'local') {
          setLocalWidths((prev) => ({ ...prev, [key]: finalWidth }));
          setDraggingWidths((prev) => {
            if (!(key in prev)) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
          });
        } else if (eo2 === 'controlled') {
          if (oc2) {
            oc2({ ...iw, ...dw, [key]: finalWidth });
            // keep overlay (no upstream store to sync within the hook)
          }
          // no callback: read-only; warning already issued at render (G10).
        }
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', finish);
      window.addEventListener('pointercancel', finish);
      listenerCleanupRef.current = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', finish);
        window.removeEventListener('pointercancel', finish);
      };

      return stopListeners;
    },
    [columnKey, stopListeners, widths],
  );

  const persistWidth = useCallback((next: Record<string, number>) => {
    const { effectiveOwnership: eo, statePath: sp, onWidthsChange: oc, renderScope: rs } = latest.current;
    if (eo === 'scope' && sp) {
      rs.update(sp, next);
    } else if (eo === 'local') {
      setLocalWidths(next);
    } else if (eo === 'controlled' && oc) {
      oc(next);
    }
  }, []);

  return {
    widths,
    getColumnWidth,
    startResize,
    persistWidth,
  } as ColumnResizeApi & { persistWidth: (next: Record<string, number>) => void };
}
