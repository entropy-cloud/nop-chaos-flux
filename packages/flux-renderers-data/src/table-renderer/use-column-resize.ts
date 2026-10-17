import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  OwnershipMode,
  getIn,
} from '@nop-chaos/flux-core';
import { parseColumnWidth } from './parse-column-width.js';
import { measureColumnWidthsFromTable } from './column-width-measure.js';
import { useOwnershipScopeValue, useRenderScope } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import type { TableColumnSchema } from '../schemas.js';

const DEFAULT_MIN_WIDTH = 40;

function isDevRuntime() {
  const importMeta = import.meta as ImportMeta & { env?: { DEV?: boolean } };
  return importMeta.env?.DEV === true;
}

export function resolveColumnWidth(column: TableColumnSchema, fallback = 120): number {
  return parseColumnWidth(column.width, fallback);
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
  // Returns the tracked/resized width when present, otherwise the column's
  // declared `column.width` (string or number), otherwise `undefined` — a
  // no-width column must fall back to the schema semantic and stay
  // auto-stretchable (P1-01: never invent a 120px default here).
  getColumnWidth(column: TableColumnSchema, index: number): number | string | undefined;
  // `snapshotWidths` (fixed-key space `name:index`, from the handle's DOM
  // measurement) pins the whole column set for the drag session; the hook
  // falls back to tracked widths, then declared schema widths (FM-0 plan 642:
  // deterministic layout under content pressure).
  startResize(
    column: TableColumnSchema,
    index: number,
    startClientX: number,
    measuredWidth?: number,
    snapshotWidths?: Record<string, number>,
  ): () => void;
  // Keyboard entry point (WCAG 2.1 SC 2.1.1): ArrowLeft/ArrowRight step the
  // width by `delta` px, clamped to [minWidth, maxWidth], and commit through the
  // same ownership path as a pointer drag (mirrors use-row-drag-sort H6).
  stepResize(column: TableColumnSchema, index: number, delta: number, measuredWidth?: number): void;
  /** FM-0 plan 642: live drag marker (hook-key space), null when idle. */
  readonly resizingKey?: string | null;
  /** FM-0 plan 642: drag-session pin map (fixed-key space `name:index`). */
  readonly sessionPinnedWidths?: Record<string, number> | null;
  /** FM-0 plan 642: true once the user committed at least one resize. */
  readonly hasCommittedResize?: boolean;
}

interface ActiveResize {
  key: string;
  fixedKey: string;
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
  columnWidthsOwnership?: OwnershipMode;
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
        ? parseColumnWidth(raw, NaN)
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

  const effectiveOwnership: OwnershipMode =
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
      // Only columns with a valid explicit width are tracked up front. A
      // no-width column must NOT be prefilled with the 120 fallback — otherwise
      // getColumnWidth/effectiveMainColumns turn the fallback into a hard cap
      // and a write-back (P1-01).
      if (!Number.isFinite(parseColumnWidth(column.width, NaN))) {
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
  // FM-0 plan 642 deterministic-layout session state: the live drag marker and
  // the whole-column pin map (fixed-key space `name:index`) captured at drag
  // start so the renderer can switch the table to `table-layout: fixed` with
  // every column pinned — content pressure can no longer eat the drag.
  const [resizingKey, setResizingKey] = useState<string | null>(null);
  const [sessionPinnedWidths, setSessionPinnedWidths] = useState<Record<string, number> | null>(null);
  // Committed-resize latch (user-driven commits only — the initialWidths
  // declared-width prefill must NOT flip the table into fixed layout).
  const [hasCommittedResize, setHasCommittedResize] = useState(false);
  const activeResizeRef = useRef<ActiveResize | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  // Teardown for the window listeners attached during the active drag. Owned by
  // React via the unmount effect below so a mid-drag unmount / pointercancel /
  // touch-scroll takeover never leaks listeners or leaves activeResizeRef stuck.
  const listenerCleanupRef = useRef<(() => void) | null>(null);

  const scopeWidths = useOwnershipScopeValue<Record<string, number> | undefined>(
    effectiveOwnership === 'scope' && statePath ? 'scope' : 'local',
    statePath,
    {
      select: (scopeData) => normalizeWidthsRecord(getIn(scopeData, statePath as string)),
      equality: (a, b) => {
        if (!a || !b) return a === b;
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) return false;
        return aKeys.every((key) => a[key] === b[key]);
      },
    },
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
      if (dragFrameRef.current !== null) {
        cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = null;
      }
    };
  }, []);

  const columnKey = useCallback(
    (column: TableColumnSchema, index: number): string =>
      column.name ?? `column-${index}`,
    [],
  );

  const getColumnWidth = useCallback(
    (column: TableColumnSchema, index: number): number | string | undefined => {
      const key = columnKey(column, index);
      if (key in widths) {
        return widths[key];
      }
      return column.width;
    },
    [columnKey, widths],
  );

  const stopListeners = useCallback(() => {
    listenerCleanupRef.current?.();
    listenerCleanupRef.current = null;
  }, []);

  const startResize = useCallback(
    (
      column: TableColumnSchema,
      index: number,
      startClientX: number,
      measuredWidth?: number,
      snapshotWidths?: Record<string, number>,
    ) => {
      const key = columnKey(column, index);
      const fixedKey = `${column.name ?? 'column'}:${index}`;
      const minWidth = resolveColumnMinWidth(column);
      const maxWidth = resolveColumnMaxWidth(column);
      // Anchor on the RENDERED width for a no-width (stretch) column — the
      // 120px schema fallback diverges from the auto layout (IS-5 colw-001:
      // 200px rendered vs 120px anchor → 80px dead zone) and negative drags
      // get silently swallowed while polluting tracked state.
      const startWidth = widths[key] ?? parseColumnWidth(measuredWidth, resolveColumnWidth(column));
      const { effectiveOwnership: eo, onWidthsChange: oc } = latest.current;

      // Whole-column pin map for the drag session (fixed-key space): DOM
      // snapshot first, then tracked widths, then declared schema widths. A
      // widthless column with none of these stays unpinned (P1-01: never invent
      // a width).
      const pinned: Record<string, number> = {};
      if (snapshotWidths) {
        for (const [snapshotKey, snapshotWidth] of Object.entries(snapshotWidths)) {
          if (typeof snapshotWidth === 'number' && Number.isFinite(snapshotWidth) && snapshotWidth > 0) {
            pinned[snapshotKey] = snapshotWidth;
          }
        }
      }
      columns.forEach((sessionColumn, columnIndex) => {
        const sessionFixedKey = `${sessionColumn.name ?? 'column'}:${columnIndex}`;
        if (pinned[sessionFixedKey] !== undefined) {
          return;
        }
        const tracked = widths[sessionColumn.name ?? `column-${columnIndex}`];
        if (tracked !== undefined) {
          pinned[sessionFixedKey] = tracked;
          return;
        }
        const declared = parseColumnWidth(sessionColumn.width, NaN);
        if (Number.isFinite(declared)) {
          pinned[sessionFixedKey] = declared;
        }
      });

      stopListeners();
      activeResizeRef.current = {
        key,
        fixedKey,
        minWidth,
        maxWidth,
        startWidth,
        startClientX,
        next: startWidth,
        feedback: eo !== 'controlled' || Boolean(oc),
      };
      setResizingKey(key);
      setSessionPinnedWidths(pinned);

      // rAF-coalesced drag reflection: pointermove only records the pending
      // width; one setState pair per frame drives the overlay + session pin.
      const applyFrame = () => {
        dragFrameRef.current = null;
        const active = activeResizeRef.current;
        if (!active) return;
        setDraggingWidths((prev) => (prev[active.key] === active.next ? prev : { ...prev, [active.key]: active.next }));
        setSessionPinnedWidths((prev) =>
          prev && prev[active.fixedKey] === active.next ? prev : { ...prev, [active.fixedKey]: active.next },
        );
      };

      const onPointerMove = (event: PointerEvent) => {
        const active = activeResizeRef.current;
        if (!active) return;
        const delta = event.clientX - active.startClientX;
        let next = active.startWidth + delta;
        if (next < active.minWidth) next = active.minWidth;
        if (active.maxWidth !== undefined && next > active.maxWidth) next = active.maxWidth;
        active.next = next;
        if (active.feedback && dragFrameRef.current === null) {
          dragFrameRef.current = requestAnimationFrame(applyFrame);
        }
      };

      const finish = () => {
        stopListeners();
        if (dragFrameRef.current !== null) {
          cancelAnimationFrame(dragFrameRef.current);
          dragFrameRef.current = null;
        }
        setResizingKey(null);
        setSessionPinnedWidths(null);
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
          setHasCommittedResize(true);
          // keep dragging overlay until scope syncs (sync effect clears it)
        } else if (eo2 === 'local') {
          setLocalWidths((prev) => ({ ...prev, [key]: finalWidth }));
          setDraggingWidths((prev) => {
            if (!(key in prev)) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
          });
          setHasCommittedResize(true);
        } else if (eo2 === 'controlled') {
          if (oc2) {
            oc2({ ...iw, ...dw, [key]: finalWidth });
            setHasCommittedResize(true);
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
    [columnKey, stopListeners, widths, columns],
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

  const stepResize = useCallback(
    (column: TableColumnSchema, index: number, delta: number, measuredWidth?: number) => {
      const key = columnKey(column, index);
      const minWidth = resolveColumnMinWidth(column);
      const maxWidth = resolveColumnMaxWidth(column);
      const current =
        widths[key] ?? parseColumnWidth(measuredWidth, resolveColumnWidth(column));
      let next = current + delta;
      if (next < minWidth) next = minWidth;
      if (maxWidth !== undefined && next > maxWidth) next = maxWidth;
      if (next === current) return;
      persistWidth({ ...widths, [key]: next });
    },
    [columnKey, persistWidth, widths],
  );

  return {
    widths,
    getColumnWidth,
    startResize,
    stepResize,
    persistWidth,
    resizingKey,
    sessionPinnedWidths,
    hasCommittedResize,
  } as ColumnResizeApi & {
    persistWidth: (next: Record<string, number>) => void;
    resizingKey: string | null;
    sessionPinnedWidths: Record<string, number> | null;
    hasCommittedResize: boolean;
  };
}

export const COLUMN_RESIZE_KEYBOARD_STEP = 10;

/**
 * Column-resize separator props ([oversized-file governance]: moved verbatim
 * from table-header-row.tsx). Keyboard resize (WCAG 2.1 SC 2.1.1): the handle
 * is a focusable separator, so ArrowLeft/ArrowRight step the column width
 * along the same commit path as a pointer drag (mirrors use-row-drag-sort H6).
 */
export function createColumnResizeHandleProps(options: {
  column: TableColumnSchema;
  index: number;
  resizable: boolean;
  resizeApi?: ColumnResizeApi;
  /** Active-drag marker for this column (drives data-resizing feedback). */
  resizing?: boolean;
}): {
  'data-slot': 'table-column-resize-handle';
  'aria-label': string;
  role: 'separator';
  'aria-orientation': 'vertical';
  tabIndex: number;
  onPointerDown: (event: React.PointerEvent<HTMLSpanElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLSpanElement>) => void;
  className: string;
  style: { touchAction: 'none' };
} {
  const { column, index, resizable, resizeApi, resizing } = options;
  const measuredColumnWidth = (event: {
    currentTarget: { closest: (selector: string) => HTMLElement | null };
  }): number | undefined => {
    const th = event.currentTarget.closest('th');
    const width = th?.getBoundingClientRect().width;
    return typeof width === 'number' && Number.isFinite(width) && width > 0 ? width : undefined;
  };
  // Whole-column measured snapshot (fixed-key space) for the drag session —
  // lets the renderer pin every column and switch to fixed layout mid-drag.
  const measuredColumnSnapshot = (event: {
    currentTarget: { closest: (selector: string) => HTMLElement | null };
  }): Record<string, number> => {
    const table = event.currentTarget.closest('table');
    const { widths: measured } = measureColumnWidthsFromTable(table);
    const snapshot: Record<string, number> = {};
    measured.forEach((width, key) => {
      snapshot[key] = width;
    });
    return snapshot;
  };
  const resizeStart = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (!resizable || !resizeApi) return;
    event.preventDefault();
    event.stopPropagation();
    resizeApi.startResize(
      column,
      index,
      event.clientX,
      measuredColumnWidth(event),
      measuredColumnSnapshot(event),
    );
  };
  const resizeKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
    if (!resizable || !resizeApi) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    event.stopPropagation();
    resizeApi.stepResize(
      column,
      index,
      event.key === 'ArrowLeft' ? -COLUMN_RESIZE_KEYBOARD_STEP : COLUMN_RESIZE_KEYBOARD_STEP,
      measuredColumnWidth(event),
    );
  };
  return {
    'data-slot': 'table-column-resize-handle',
    'aria-label': t('flux.table.resizeColumn'),
    role: 'separator',
    'aria-orientation': 'vertical',
    tabIndex: 0,
    ...(resizing ? { 'data-resizing': true } : {}),
    onPointerDown: resizeStart,
    onKeyDown: resizeKeyDown,
    // AMIS colDragLine parity (~/sources/amis _table.scss): 7px hit area with a
    // 4px overhang past the column edge (-right-1 → 3px inside / 4px outside),
    // stacked above sticky cells (z-[15]), highlight on hover and while dragging.
    className:
      'absolute -right-1 top-0 z-[15] h-full w-[7px] cursor-col-resize select-none hover:bg-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[resizing]:bg-primary/70',
    style: { touchAction: 'none' },
  };
}
