import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Pause, Play, Trash2, Crosshair, Minimize2, Maximize2, Bug } from 'lucide-react';
import type { NopDebugEvent, NopDebuggerController, NopDebuggerFilterKind, NopDebuggerTab, NopInteractionTrace } from './types';
import { buildOverview, DEFAULT_FILTERS } from './diagnostics';

const DEBUGGER_STYLE_ID = 'nop-debugger-styles';
const DEBUGGER_STYLES = `
.nop-theme-root {
  --nop-debugger-bg:
    linear-gradient(180deg, rgba(16, 24, 34, 0.96), rgba(10, 18, 27, 0.98)),
    radial-gradient(circle at top right, rgba(240, 183, 79, 0.16), transparent 42%);
  --nop-debugger-border: rgba(255, 255, 255, 0.08);
  --nop-debugger-shadow: 0 24px 72px rgba(7, 12, 18, 0.32);
  --nop-debugger-text: #eef4fb;
  --nop-debugger-eyebrow: #ffcf8b;
  --nop-debugger-chip-bg: rgba(255, 255, 255, 0.05);
  --nop-debugger-chip-border: rgba(255, 255, 255, 0.12);
  --nop-debugger-chip-active-bg: rgba(255, 207, 139, 0.18);
  --nop-debugger-chip-active-border: rgba(255, 207, 139, 0.34);
  --nop-debugger-chip-active-text: #ffcf8b;
  --nop-debugger-card-bg: rgba(255, 255, 255, 0.05);
  --nop-debugger-card-border: rgba(255, 255, 255, 0.08);
  --nop-debugger-muted-text: rgba(238, 244, 251, 0.7);
  --nop-debugger-detail-bg: rgba(0, 0, 0, 0.26);
  --nop-debugger-detail-text: #bce6ff;
  --nop-debugger-launcher-bg: rgba(16, 24, 34, 0.94);
  --nop-debugger-launcher-shadow: 0 8px 24px rgba(7, 12, 18, 0.32);
  --nop-debugger-badge-render-bg: rgba(120, 198, 255, 0.16);
  --nop-debugger-badge-render-text: #9bd9ff;
  --nop-debugger-badge-action-bg: rgba(255, 205, 128, 0.16);
  --nop-debugger-badge-action-text: #ffd18a;
  --nop-debugger-badge-api-bg: rgba(125, 235, 182, 0.16);
  --nop-debugger-badge-api-text: #9df3ca;
  --nop-debugger-badge-compile-bg: rgba(210, 183, 255, 0.16);
  --nop-debugger-badge-compile-text: #dcc0ff;
  --nop-debugger-badge-notify-bg: rgba(255, 158, 177, 0.16);
  --nop-debugger-badge-notify-text: #ffbac8;
  --nop-debugger-badge-error-bg: rgba(255, 128, 128, 0.18);
  --nop-debugger-badge-error-text: #ffadad;
}

.nop-debugger {
  position: fixed;
  z-index: 9999;
  width: min(420px, calc(100vw - 32px));
  max-height: min(78vh, 760px);
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 22px;
  background: var(--nop-debugger-bg);
  border: 1px solid var(--nop-debugger-border);
  box-shadow: var(--nop-debugger-shadow);
  color: var(--nop-debugger-text);
  backdrop-filter: blur(16px);
  overflow: auto;
}

.ndbg-header {
  position: sticky;
  top: -14px;
  z-index: 1;
  background: var(--nop-debugger-bg);
  padding-bottom: 2px;
}

.ndbg-header {
  display: flex;

.ndbg-drag-handle {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  cursor: move;
  user-select: none;
  touch-action: none;
}

.ndbg-header h2 {
  margin: 4px 0 0;
  font-size: 20px;
}

.ndbg-eyebrow {
  margin: 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--nop-debugger-eyebrow);
}

.ndbg-header-actions,
.ndbg-tabs,
.ndbg-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ndbg-icon-button,
.ndbg-tab,
.ndbg-filter,
.nop-debugger-launcher {
  appearance: none;
  border: 1px solid var(--nop-debugger-chip-border);
  color: var(--nop-debugger-text);
  cursor: pointer;
}

.ndbg-icon-button,
.ndbg-tab,
.ndbg-filter {
  background: var(--nop-debugger-chip-bg);
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
}

.ndbg-tab[data-active],
.ndbg-filter[data-active] {
  background: var(--nop-debugger-chip-active-bg);
  border-color: var(--nop-debugger-chip-active-border);
  color: var(--nop-debugger-chip-active-text);
}

.ndbg-overview,
.ndbg-list {
  display: grid;
  gap: 10px;
  overflow: auto;
}

.ndbg-overview {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ndbg-metric-card,
.ndbg-entry {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 16px;
  background: var(--nop-debugger-card-bg);
  border: 1px solid var(--nop-debugger-card-border);
}

.ndbg-metric-card strong {
  font-size: 20px;
}

.ndbg-metric-card[data-error] strong {
  color: var(--nop-debugger-badge-error-text);
}

.ndbg-metric-label,
.ndbg-entry-meta,
.ndbg-entry time,
.ndbg-launcher-meta {
  font-size: 12px;
  color: var(--nop-debugger-muted-text);
}

.ndbg-entry-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.ndbg-entry-summary {
  font-size: 14px;
  line-height: 1.45;
}

.ndbg-entry-detail {
  display: block;
  overflow-x: auto;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--nop-debugger-detail-bg);
  color: var(--nop-debugger-detail-text);
  white-space: nowrap;
}

.ndbg-badge {
  width: fit-content;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.ndbg-badge[data-group="render"] { background: var(--nop-debugger-badge-render-bg); color: var(--nop-debugger-badge-render-text); }
.ndbg-badge[data-group="action"] { background: var(--nop-debugger-badge-action-bg); color: var(--nop-debugger-badge-action-text); }
.ndbg-badge[data-group="api"] { background: var(--nop-debugger-badge-api-bg); color: var(--nop-debugger-badge-api-text); }
.ndbg-badge[data-group="compile"] { background: var(--nop-debugger-badge-compile-bg); color: var(--nop-debugger-badge-compile-text); }
.ndbg-badge[data-group="notify"] { background: var(--nop-debugger-badge-notify-bg); color: var(--nop-debugger-badge-notify-text); }
.ndbg-badge[data-group="error"] { background: var(--nop-debugger-badge-error-bg); color: var(--nop-debugger-badge-error-text); }
.ndbg-badge[data-group="node"] { background: var(--nop-debugger-badge-compile-bg); color: var(--nop-debugger-badge-compile-text); }

.ndbg-badge[data-slow="true"] { background: rgba(255, 183, 77, 0.2); color: #ffcf8b; }

.ndbg-empty { margin: 0; color: var(--nop-debugger-muted-text); }

.ndbg-launcher-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ndbg-launcher-label { font-size: 12px; font-weight: 600; }

.ndbg-search {
  width: 100%;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--nop-debugger-chip-border);
  background: var(--nop-debugger-chip-bg);
  color: var(--nop-debugger-text);
  font-size: 12px;
  outline: none;
}
.ndbg-search:focus {
  border-color: var(--nop-debugger-chip-active-border);
}
.ndbg-search::placeholder {
  color: var(--nop-debugger-muted-text);
}

.ndbg-entry { cursor: pointer; }
.ndbg-entry-expanded {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--nop-debugger-detail-bg);
  max-height: 320px;
  overflow: auto;
}
.ndbg-json-key { color: #9bd9ff; }
.ndbg-json-string { color: #9df3ca; }
.ndbg-json-number { color: #ffd18a; }
.ndbg-json-boolean { color: #dcc0ff; }
.ndbg-json-null { color: var(--nop-debugger-muted-text); font-style: italic; }
.ndbg-json-toggle {
  cursor: pointer;
  user-select: none;
  color: var(--nop-debugger-muted-text);
  font-size: 11px;
}
.ndbg-json-toggle:hover { color: var(--nop-debugger-text); }

.nop-debugger-launcher {
  position: fixed;
  z-index: 9998;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 20px;
  background: var(--nop-debugger-launcher-bg);
  box-shadow: var(--nop-debugger-launcher-shadow);
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.ndbg-launcher-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: #ff6b6b;
  color: white;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: nop-debugger-pulse 2s ease-in-out infinite;
}
@keyframes nop-debugger-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.ndbg-status-pending { color: #ffd18a; }
.ndbg-status-completed { color: #9df3ca; }
.ndbg-status-failed { color: #ffadad; }
.ndbg-status-aborted { color: var(--nop-debugger-muted-text); }

.ndbg-node-input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--nop-debugger-chip-border);
  background: var(--nop-debugger-chip-bg);
  color: var(--nop-debugger-text);
  font-size: 12px;
  outline: none;
}
.ndbg-node-input:focus {
  border-color: var(--nop-debugger-chip-active-border);
}
.ndbg-node-input::placeholder {
  color: var(--nop-debugger-muted-text);
}

.ndbg-errors-only-toggle {
  background: var(--nop-debugger-badge-error-bg);
  color: var(--nop-debugger-badge-error-text);
}

@media (max-width: 760px) {
  .nop-debugger {
    width: calc(100vw - 24px);
    max-height: 72vh;
  }

  .ndbg-overview {
    grid-template-columns: 1fr;
  }
}

.nop-debugger-overlay {
  position: fixed;
  pointer-events: none;
  z-index: 10000;
  border-radius: 2px;
  transition: all 0.05s ease;
}
.nop-debugger-overlay--hover {
  outline: 1px dashed #1c76c4;
  background: rgba(28, 118, 196, 0.06);
}
.nop-debugger-overlay--active {
  outline: 2px solid #1c76c4;
  background: rgba(28, 118, 196, 0.1);
}
.ndbg-component-tree {
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid var(--nop-debugger-chip-border);
  border-radius: 8px;
  padding: 4px;
}
.ndbg-tree-item {
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
}
.ndbg-tree-item:hover {
  background: var(--nop-debugger-chip-active-bg);
}
.ndbg-tree-item.selected {
  background: rgba(28, 118, 196, 0.15);
  outline: 1px solid rgba(28, 118, 196, 0.3);
}
.ndbg-tree-section {
  display: grid;
  gap: 8px;
}
.ndbg-resize-handle {
  position: absolute;
  left: 0;
  top: 22px;
  bottom: 22px;
  width: 6px;
  cursor: ew-resize;
  border-radius: 3px 0 0 3px;
  z-index: 2;
}
.ndbg-resize-handle:hover,
.ndbg-resize-handle:active {
  background: rgba(255, 207, 139, 0.25);
}

.ndbg-errors-only-toggle {
  background: var(--nop-debugger-badge-error-bg);
  color: var(--nop-debugger-badge-error-text);
}

.nop-debugger--minimized {
  display: flex;
  align-items: center;
  gap: 8px;
  width: auto;
  max-height: none;
  padding: 8px 14px;
  border-radius: 999px;
  cursor: grab;
  user-select: none;
  touch-action: none;
  overflow: visible;
}

.nop-debugger--minimized .ndbg-resize-handle {
  display: none;
}

.ndbg-minimized-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ndbg-minimized-title {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.ndbg-minimized-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--nop-debugger-text);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ndbg-minimized-error-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(255, 128, 128, 0.2);
  color: var(--nop-debugger-badge-error-text);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ndbg-icon-button {
  position: relative;
}

.ndbg-icon-button::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 10;
}

.ndbg-icon-button:hover::after {
  opacity: 1;
}

.ndbg-icon-button::before {
  content: '';
  position: absolute;
  bottom: calc(100% + 2px);
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: rgba(0, 0, 0, 0.85);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 10;
}

.ndbg-icon-button:hover::before {
  opacity: 1;
}
`;

const FILTER_LABELS: Record<NopDebuggerFilterKind, string> = {
  render: 'Render',
  action: 'Action',
  api: 'API',
  compile: 'Compile',
  notify: 'Notify',
  error: 'Error',
  node: 'Node'
};

function formatClock(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}


function formatTraceSummary(trace: NopInteractionTrace | undefined) {
  if (!trace || trace.totalEvents === 0) {
    return {
      headline: 'No correlated trace yet',
      detail: 'Run an action or request to infer the latest chain.'
    };
  }

  const anchor = trace.anchorEvent?.summary ?? trace.latestError?.summary ?? trace.latestApi?.summary ?? trace.latestAction?.summary ?? 'Recent interaction';
  const relatedBits = [
    trace.resolvedQuery.nodeId ? `node ${trace.resolvedQuery.nodeId}` : undefined,
    trace.resolvedQuery.actionType ? `action ${trace.resolvedQuery.actionType}` : undefined,
    trace.resolvedQuery.requestKey ? 'request linked' : undefined
  ].filter(Boolean);

  return {
    headline: anchor,
    detail: `${trace.totalEvents} correlated event${trace.totalEvents === 1 ? '' : 's'}${relatedBits.length ? ` | ${relatedBits.join(' | ')}` : ''}`
  };
}

function JsonViewer(props: { data: unknown; maxDepth?: number; defaultExpanded?: number }) {
  const maxDepth = props.maxDepth ?? 3;
  const defaultExpanded = props.defaultExpanded ?? 1;
  return (
    <div className="ndbg-entry-expanded">
      <JsonNode data={props.data} path="$" depth={0} maxDepth={maxDepth} defaultExpanded={defaultExpanded} />
    </div>
  );
}

function JsonNode(props: { data: unknown; path: string; depth: number; maxDepth: number; defaultExpanded: number }) {
  const { data, depth, maxDepth, defaultExpanded } = props;
  const [collapsed, setCollapsed] = useState(depth >= defaultExpanded);

  if (data === null || data === undefined) {
    return <span className="ndbg-json-null">{String(data)}</span>;
  }

  if (typeof data === 'string') {
    return <span className="ndbg-json-string">&quot;{data.length > 500 ? data.slice(0, 500) + '…' : data}&quot;</span>;
  }

  if (typeof data === 'number') {
    return <span className="ndbg-json-number">{String(data)}</span>;
  }

  if (typeof data === 'boolean') {
    return <span className="ndbg-json-boolean">{String(data)}</span>;
  }

  if (depth >= maxDepth) {
    return <span className="ndbg-json-null">...</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span>[]</span>;
    }
    const displayItems = data.length > 50 ? data.slice(0, 10) : data;
    const hasMore = data.length > 50;
    return (
      <div>
        <span className="ndbg-json-toggle" onClick={() => setCollapsed((c) => !c)}>
          {collapsed ? `▶ Array(${data.length})` : `▼ Array(${data.length})`}
        </span>
        {!collapsed && (
          <div style={{ paddingLeft: 12 }}>
            {displayItems.map((item, i) => (
              <div key={i}>
                <span className="ndbg-json-key">{i}: </span>
                <JsonNode data={item} path={`${props.path}[${i}]`} depth={depth + 1} maxDepth={maxDepth} defaultExpanded={defaultExpanded} />
              </div>
            ))}
            {hasMore && <span className="ndbg-json-null">... and {data.length - 10} more items</span>}
          </div>
        )}
      </div>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) {
      return <span>{'{}'}</span>;
    }
    return (
      <div>
        <span className="ndbg-json-toggle" onClick={() => setCollapsed((c) => !c)}>
          {collapsed ? `▶ Object{${entries.length}}` : `▼ Object{${entries.length}}`}
        </span>
        {!collapsed && (
          <div style={{ paddingLeft: 12 }}>
            {entries.map(([key, value]) => (
              <div key={key}>
                <span className="ndbg-json-key">{key}: </span>
                <JsonNode data={value} path={`${props.path}.${key}`} depth={depth + 1} maxDepth={maxDepth} defaultExpanded={defaultExpanded} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <span>{String(data)}</span>;
}

function includesText(target: string | undefined, query: string) {
  return (target ?? '').toLowerCase().includes(query.toLowerCase());
}

type MergedRequest = {
  requestKey: string;
  startEvent?: NopDebugEvent;
  endEvent?: NopDebugEvent;
  abortEvent?: NopDebugEvent;
  status: 'pending' | 'completed' | 'failed' | 'aborted';
  durationMs?: number;
  summary: string;
};

function mergeNetworkRequests(events: NopDebugEvent[]): MergedRequest[] {
  const map = new Map<string, MergedRequest>();

  for (const event of events) {
    const key = event.requestKey ?? event.summary;
    const existing = map.get(key);

    if (event.kind === 'api:start') {
      if (!existing) {
        map.set(key, {
          requestKey: key,
          startEvent: event,
          status: 'pending',
          summary: event.summary
        });
      } else if (!existing.startEvent) {
        map.set(key, { ...existing, startEvent: event, summary: event.summary });
      }
    } else if (event.kind === 'api:end') {
      const base = existing ?? { requestKey: key, status: 'pending' as const, summary: event.summary };
      const ok = event.level === 'success' || event.level === 'info';
      map.set(key, {
        ...base,
        endEvent: event,
        status: ok ? 'completed' : 'failed',
        durationMs: event.durationMs,
        summary: base.summary ?? event.summary
      });
    } else if (event.kind === 'api:abort') {
      const base = existing ?? { requestKey: key, status: 'pending' as const, summary: event.summary };
      map.set(key, {
        ...base,
        abortEvent: event,
        status: 'aborted',
        summary: base.summary ?? event.summary
      });
    }
  }

  const results = Array.from(map.values());
  results.sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (b.status === 'pending' && a.status !== 'pending') return 1;
    const aTime = a.endEvent?.timestamp ?? a.startEvent?.timestamp ?? 0;
    const bTime = b.endEvent?.timestamp ?? b.startEvent?.timestamp ?? 0;
    return bTime - aTime;
  });

  return results;
}

type ErrorGroup = {
  source: string;
  count: number;
  latestTimestamp: number;
  events: NopDebugEvent[];
};

function groupErrors(events: NopDebugEvent[]): ErrorGroup[] {
  const groups = new Map<string, ErrorGroup>();

  for (const event of events) {
    if (event.group !== 'error' && event.level !== 'error' && event.level !== 'warning') {
      continue;
    }

    const key = event.source ?? 'unknown';
    const existing = groups.get(key);

    if (existing) {
      existing.count++;
      existing.events.push(event);
      if (event.timestamp > existing.latestTimestamp) {
        existing.latestTimestamp = event.timestamp;
      }
    } else {
      groups.set(key, {
        source: key,
        count: 1,
        latestTimestamp: event.timestamp,
        events: [event]
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.latestTimestamp - a.latestTimestamp);
}

function useDebuggerSnapshot(controller: NopDebuggerController) {
  const [snapshot, setSnapshot] = useState(controller.getSnapshot());

  useEffect(() => {
    setSnapshot(controller.getSnapshot());
    return controller.subscribe(() => {
      setSnapshot(controller.getSnapshot());
    });
  }, [controller]);

  return snapshot;
}

function useDraggablePosition(controller: NopDebuggerController, initial: { x: number; y: number }, onTap?: () => void) {
  const [position, setPosition] = useState(initial);
  const positionRef = useRef(initial);
  const dragState = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    hasMoved: boolean;
    target: HTMLElement;
  } | null>(null);
  const hasMovedRef = useRef(false);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    setPosition(initial);
    positionRef.current = initial;
  }, [initial]);

  useEffect(() => {
    const clearDrag = (event: PointerEvent) => {
      if (!dragState.current || dragState.current.pointerId !== event.pointerId) {
        return;
      }

      try {
        dragState.current.target.releasePointerCapture(event.pointerId);
      } catch (error) {
        void error;
      }

      if (dragState.current.hasMoved) {
        controller.setPanelPosition(positionRef.current);
      } else {
        onTap?.();
      }

      hasMovedRef.current = dragState.current.hasMoved;
      dragState.current = null;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragState.current || dragState.current.pointerId !== event.pointerId) {
        return;
      }

      if (event.buttons === 0) {
        clearDrag(event);
        return;
      }

      const deltaX = event.clientX - dragState.current.startX;
      const deltaY = event.clientY - dragState.current.startY;

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        dragState.current.hasMoved = true;
      }

      const next = {
        x: Math.max(12, event.clientX - dragState.current.offsetX),
        y: Math.max(12, event.clientY - dragState.current.offsetY)
      };

      positionRef.current = next;
      setPosition(next);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', clearDrag);
    window.addEventListener('pointercancel', clearDrag);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', clearDrag);
      window.removeEventListener('pointercancel', clearDrag);
    };
  }, [controller, onTap]);

  const bind = {
    onPointerDown(event: ReactPointerEvent<HTMLElement>) {
      if (event.button !== 0) {
        return;
      }

      const target = event.currentTarget.parentElement;
      if (!target) {
        return;
      }

      hasMovedRef.current = false;
      dragState.current = {
        pointerId: event.pointerId,
        offsetX: event.clientX - position.x,
        offsetY: event.clientY - position.y,
        startX: event.clientX,
        startY: event.clientY,
        hasMoved: false,
        target
      };

      target.setPointerCapture(event.pointerId);
      event.preventDefault();
    }
  };

  const consumeClick = () => {
    if (hasMovedRef.current) {
      hasMovedRef.current = false;
      return true;
    }
    hasMovedRef.current = false;
    return false;
  };

  return { position, bind, consumeClick };
}

function useResizablePanel() {
  const [width, setWidth] = useState(420);
  const resizeState = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    const clear = (event: PointerEvent) => {
      if (!resizeState.current || resizeState.current.pointerId !== event.pointerId) return;
      resizeState.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    const move = (event: PointerEvent) => {
      if (!resizeState.current || resizeState.current.pointerId !== event.pointerId) {
        clear(event);
        return;
      }
      const delta = event.clientX - resizeState.current.startX;
      const next = Math.max(280, Math.min(window.innerWidth - 40, resizeState.current.startWidth - delta));
      setWidth(next);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', clear);
    window.addEventListener('pointercancel', clear);

    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', clear);
      window.removeEventListener('pointercancel', clear);
    };
  }, []);

  const bind = {
    onPointerDown(event: ReactPointerEvent<HTMLElement>) {
      if (event.button !== 0) return;
      resizeState.current = { pointerId: event.pointerId, startX: event.clientX, startWidth: width };
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      event.preventDefault();
    }
  };

  return { width, bind };
}

function useLauncherDrag(
  controller: NopDebuggerController,
  initial: { x: number; y: number }
) {
  const [position, setPosition] = useState(initial);
  const positionRef = useRef(initial);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
    hasMoved: boolean;
    target: HTMLElement;
  } | null>(null);
  const wasDraggedRef = useRef(false);
  const suppressNextClickRef = useRef(false);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    setPosition(initial);
    positionRef.current = initial;
  }, [initial]);

  useEffect(() => {
    const clearDrag = (event: PointerEvent) => {
      if (!dragState.current || dragState.current.pointerId !== event.pointerId) {
        return;
      }

      try {
        dragState.current.target.releasePointerCapture(event.pointerId);
      } catch (error) {
        void error;
      }

      if (dragState.current.hasMoved) {
        controller.setPanelPosition(positionRef.current);
        wasDraggedRef.current = true;
        suppressNextClickRef.current = true;
      }

      dragState.current = null;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragState.current || dragState.current.pointerId !== event.pointerId) {
        return;
      }

      if (event.buttons === 0) {
        clearDrag(event);
        return;
      }

      const deltaX = event.clientX - dragState.current.startX;
      const deltaY = event.clientY - dragState.current.startY;

      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        dragState.current.hasMoved = true;
      }

      if (!dragState.current.hasMoved) {
        return;
      }

      const newX = Math.max(8, Math.min(window.innerWidth - 80, dragState.current.startPosX + deltaX));
      const newY = Math.max(8, Math.min(window.innerHeight - 50, dragState.current.startPosY + deltaY));
      const next = { x: newX, y: newY };

      positionRef.current = next;
      setPosition(next);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', clearDrag);
    window.addEventListener('pointercancel', clearDrag);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', clearDrag);
      window.removeEventListener('pointercancel', clearDrag);
    };
  }, [controller]);

  const bind = {
    onPointerDown(event: ReactPointerEvent<HTMLElement>) {
      if (event.button !== 0) {
        return;
      }

      const target = event.currentTarget;
      wasDraggedRef.current = false;
      dragState.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startPosX: position.x,
        startPosY: position.y,
        hasMoved: false,
        target
      };
      target.setPointerCapture(event.pointerId);
      event.preventDefault();
    }
  };

  const consumeSuppressedClick = () => {
    if (!suppressNextClickRef.current) {
      return false;
    }

    suppressNextClickRef.current = false;
    wasDraggedRef.current = false;
    return true;
  };

  return { position, bind, wasDraggedRef, consumeSuppressedClick };
}

function useInjectDebuggerStyles(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') {
      return;
    }

    let style = document.getElementById(DEBUGGER_STYLE_ID) as HTMLStyleElement | null;

    if (!style) {
      style = document.createElement('style');
      style.id = DEBUGGER_STYLE_ID;
      style.textContent = DEBUGGER_STYLES;
      document.head.appendChild(style);
    }
  }, [enabled]);
}

export function NopDebuggerPanel(props: { controller: NopDebuggerController }) {
  const snapshot = useDebuggerSnapshot(props.controller);
  const onTapRef = useRef<(() => void) | undefined>(undefined);
  onTapRef.current = snapshot.minimized ? () => props.controller.unminimize() : undefined;
  const { position, bind: dragBind, consumeClick } = useDraggablePosition(props.controller, snapshot.position, () => onTapRef.current?.());
  const { width: panelWidth, bind: resizeBind } = useResizablePanel();
  const { position: launcherPosition, bind: launcherBind, wasDraggedRef, consumeSuppressedClick } = useLauncherDrag(props.controller, snapshot.position);
  useInjectDebuggerStyles(snapshot.enabled);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [nodeIdInput, setNodeIdInput] = useState('');
  const [networkExpandedKey, setNetworkExpandedKey] = useState<string | null>(null);
  const [errorGroupExpanded, setErrorGroupExpanded] = useState<string | null>(null);
  const [inspectMode, setInspectMode] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const hoverOverlayRef = useRef<HTMLDivElement | null>(null);
  const activeOverlayRef = useRef<HTMLDivElement | null>(null);
  const [componentTree, setComponentTree] = useState<Array<{cid: number; type: string; label: string; depth: number; element: HTMLElement}>>([]);

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

  useEffect(() => {
    if (!inspectMode || !hoveredElement || !hoverOverlayRef.current) {
      if (hoverOverlayRef.current) hoverOverlayRef.current.style.display = 'none';
      return;
    }
    const rect = hoveredElement.getBoundingClientRect();
    hoverOverlayRef.current.style.display = 'block';
    hoverOverlayRef.current.style.top = rect.top + 'px';
    hoverOverlayRef.current.style.left = rect.left + 'px';
    hoverOverlayRef.current.style.width = rect.width + 'px';
    hoverOverlayRef.current.style.height = rect.height + 'px';
  }, [inspectMode, hoveredElement]);

  useEffect(() => {
    if (!selectedElement || !activeOverlayRef.current) {
      if (activeOverlayRef.current) activeOverlayRef.current.style.display = 'none';
      return;
    }
    const rect = selectedElement.getBoundingClientRect();
    activeOverlayRef.current.style.display = 'block';
    activeOverlayRef.current.style.top = rect.top + 'px';
    activeOverlayRef.current.style.left = rect.left + 'px';
    activeOverlayRef.current.style.width = rect.width + 'px';
    activeOverlayRef.current.style.height = rect.height + 'px';
  }, [selectedElement]);

  useEffect(() => {
    if (!inspectMode) {
      setHoveredElement(null);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-cid]');
      setHoveredElement(target as HTMLElement | null);
    };

    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-cid]');
      if (!target || (e.target as HTMLElement).closest('.nop-debugger, .nop-debugger-launcher')) return;
      e.preventDefault();
      e.stopPropagation();
      const cid = target.getAttribute('data-cid') || '0';
      setSelectedElement(target as HTMLElement);
      setInspectMode(false);
      props.controller.setActiveTab('node');
      setNodeIdInput(cid);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick, true);
    };
  }, [inspectMode, props.controller]);

  const scanComponentTree = () => {
    const elements = document.querySelectorAll('[data-cid]');
    const tree: Array<{cid: number; type: string; label: string; depth: number; element: HTMLElement}> = [];
    const seen = new Set<string>();

    elements.forEach((el) => {
      const cid = el.getAttribute('data-cid') || '0';
      if (seen.has(cid)) return;
      seen.add(cid);
      const textContent = el.textContent?.trim().slice(0, 30) || '';
      const label = textContent || el.tagName.toLowerCase();
      let depth = 0;
      let parent = el.parentElement;
      while (parent && parent !== document.body) {
        if (parent.hasAttribute('data-cid')) depth++;
        parent = parent.parentElement;
      }
      tree.push({ cid: parseInt(cid, 10), type: 'element', label, depth, element: el as HTMLElement });
    });
    setComponentTree(tree);
  };

  useEffect(() => {
    if (snapshot.activeTab === 'node') {
      scanComponentTree();
    }
  }, [snapshot.activeTab]);

  const filteredEvents = useMemo(
    () => snapshot.events.filter((event) => snapshot.filters.includes(event.group)),
    [snapshot.events, snapshot.filters]
  );

  const searchedEvents = useMemo(() => {
    if (!searchText.trim()) return filteredEvents;
    return filteredEvents.filter((event) =>
      includesText(event.summary, searchText) ||
      includesText(event.detail, searchText) ||
      includesText(event.source, searchText) ||
      includesText(event.nodeId, searchText) ||
      includesText(event.path, searchText) ||
      includesText(event.requestKey, searchText)
    );
  }, [filteredEvents, searchText]);

  const networkEvents = useMemo(
    () => filteredEvents.filter((event) => event.group === 'api'),
    [filteredEvents]
  );

  const mergedRequests = useMemo(() => mergeNetworkRequests(networkEvents), [networkEvents]);

  const errorGroups = useMemo(() => groupErrors(snapshot.events), [snapshot.events]);

  const overview = useMemo(() => buildOverview(snapshot.events), [snapshot.events]);
  const latestTrace = props.controller.createDiagnosticReport({
    eventLimit: 20,
    includeLatestInteractionTrace: true
  }).latestInteractionTrace;
  const latestTraceSummary = useMemo(() => formatTraceSummary(latestTrace), [latestTrace]);

  const nodeDiagnostics = useMemo(() => {
    if (!nodeIdInput.trim()) return null;
    return props.controller.getNodeDiagnostics({ nodeId: nodeIdInput.trim() });
  }, [props.controller, nodeIdInput]);

  const toggleErrorsOnly = () => {
    if (errorsOnly) {
      props.controller.setActiveTab('timeline');
      setErrorsOnly(false);
    } else {
      setErrorsOnly(true);
    }
  };

  const errorCount = overview.errorCount;
  const badgeDisplay = errorCount > 99 ? '99+' : String(errorCount);

  if (!snapshot.enabled) {
    return null;
  }

  if (!snapshot.panelOpen) {
    return (
      <button
        type="button"
        className="nop-debugger-launcher nop-theme-root"
        style={{ left: `${launcherPosition.x}px`, top: `${launcherPosition.y}px` }}
        onPointerDown={launcherBind.onPointerDown}
        title="Open Debugger"
        onClick={(event) => {
          if (consumeSuppressedClick()) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          if (!wasDraggedRef.current) {
            props.controller.show();
          }
        }}
      >
        <span className="ndbg-launcher-icon">
          <Bug size={14} />
        </span>
        <span className="ndbg-launcher-label">
          {errorCount > 0 ? `${errorCount} err` : `${snapshot.events.length}`}
        </span>
        {errorCount > 0 ? <span className="ndbg-launcher-badge">{badgeDisplay}</span> : null}
      </button>
    );
  }

  if (snapshot.minimized) {
    return (
      <div
        className="nop-debugger nop-theme-root nop-debugger--minimized"
        style={{ left: `${position.x}px`, top: `${position.y}px`, display: 'flex', borderRadius: '999px', padding: '8px 14px', width: 'auto', maxHeight: 'none', overflow: 'visible', gap: '8px', alignItems: 'center', cursor: 'grab' }}
        {...dragBind}
      >
        <span className="ndbg-launcher-icon">
          <Bug size={14} />
        </span>
        <span className="ndbg-minimized-title">Debugger</span>
        {errorCount > 0 ? (
          <span className="ndbg-minimized-error-badge">{badgeDisplay}</span>
        ) : (
          <span className="ndbg-minimized-badge">{snapshot.events.length}</span>
        )}
      </div>
    );
  }

  const activeTimelineEvents = errorsOnly
    ? searchedEvents.filter((e) => e.group === 'error' || e.level === 'error' || e.level === 'warning')
    : searchedEvents;

  return (
    <div className="nop-debugger nop-theme-root" style={{ left: `${position.x}px`, top: `${position.y}px`, width: `${panelWidth}px` }}>
      <div className="ndbg-resize-handle" {...resizeBind} />
      <div className="ndbg-header">
        <div className="ndbg-drag-handle" {...dragBind}>
          <p className="ndbg-eyebrow">Framework Debugger</p>
          <h2>Runtime Console</h2>
        </div>
        <div className="ndbg-header-actions">
          <button type="button" className="ndbg-icon-button" onClick={() => (snapshot.paused ? props.controller.resume() : props.controller.pause())} data-tooltip={snapshot.paused ? 'Resume' : 'Pause'}>
            {snapshot.paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <button type="button" className="ndbg-icon-button" onClick={() => props.controller.clear()} data-tooltip="Clear">
            <Trash2 size={14} />
          </button>
          <button
            type="button"
            className="ndbg-icon-button"
            onClick={() => {
              if (!snapshot.panelOpen) {
                props.controller.show();
              }
              setInspectMode(!inspectMode);
            }}
            data-tooltip={inspectMode ? 'Cancel pick' : 'Pick element'}
            style={inspectMode ? { background: 'rgba(28,118,196,0.3)', color: '#9bd9ff' } : undefined}
          >
            <Crosshair size={14} />
          </button>
          <button type="button" className="ndbg-icon-button" data-testid="ndbg-minimize" onClick={() => props.controller.minimize()} data-tooltip="Minimize">
            <Minimize2 size={14} />
          </button>
        </div>
      </div>

      <div className="ndbg-tabs" role="tablist" aria-label="Debugger tabs">
        {(['overview', 'timeline', 'network', 'node'] as NopDebuggerTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            className="ndbg-tab"
            data-active={snapshot.activeTab === tab ? '' : undefined}
            onClick={() => props.controller.setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {snapshot.activeTab === 'overview' ? (
        <div className="ndbg-overview">
          <article className="ndbg-metric-card">
            <span className="ndbg-metric-label">Events</span>
            <strong>{overview.totalEvents}</strong>
            <span>{snapshot.paused ? 'stream paused' : 'stream live'}</span>
          </article>
          <article className="ndbg-metric-card">
            <span className="ndbg-metric-label">Latest compile</span>
            <strong>{overview.latestCompile ? formatClock(overview.latestCompile.timestamp) : 'n/a'}</strong>
            <span>{overview.latestCompile?.summary ?? 'No compile event yet'}</span>
          </article>
          <article className="ndbg-metric-card">
            <span className="ndbg-metric-label">Latest action</span>
            <strong>{overview.latestAction ? formatClock(overview.latestAction.timestamp) : 'n/a'}</strong>
            <span>{overview.latestAction?.summary ?? 'No action event yet'}</span>
          </article>
          <article className="ndbg-metric-card">
            <span className="ndbg-metric-label">Latest API</span>
            <strong>{overview.latestApi ? formatClock(overview.latestApi.timestamp) : 'n/a'}</strong>
            <span>{overview.latestApi?.summary ?? 'No API event yet'}</span>
          </article>
          <article className="ndbg-metric-card" data-error="">
            <span className="ndbg-metric-label">Errors</span>
            <strong>{overview.errorCount}</strong>
            <span>{overview.errorCount > 0 ? 'Needs attention' : 'No errors recorded'}</span>
          </article>
          <article className="ndbg-metric-card">
            <span className="ndbg-metric-label">Latest trace</span>
            <strong>{latestTrace ? latestTrace.totalEvents : 0}</strong>
            <span>{latestTraceSummary.headline}</span>
            <span className="ndbg-metric-label">{latestTraceSummary.detail}</span>
          </article>
          <article className="ndbg-metric-card" data-slow={overview.slowestRenderMs != null && overview.slowestRenderMs > 16 ? '' : undefined}>
            <span className="ndbg-metric-label">Renders</span>
            <strong>{overview.countsByGroup.render ?? 0}</strong>
            <span>
              {overview.slowestRenderMs != null
                ? `Slowest: ${overview.slowestRenderMs}ms${overview.slowestRenderMs > 16 ? ' (slow)' : ''}`
                : 'No render:end events'}
            </span>
          </article>
        </div>
      ) : null}

      {snapshot.activeTab === 'timeline' ? (
        <>
          <input
            type="search"
            className="ndbg-search"
            placeholder="Search events..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <div className="ndbg-filters">
            <button
              type="button"
              className={`ndbg-filter ${errorsOnly ? 'ndbg-errors-only-toggle' : ''}`}
              data-active={errorsOnly ? '' : undefined}
              onClick={toggleErrorsOnly}
            >
              Errors Only
            </button>
            {!errorsOnly && DEFAULT_FILTERS.map((filter) => {
              const active = snapshot.filters.includes(filter);
              return (
                <button
                  key={filter}
                  type="button"
                  className="ndbg-filter"
                  data-active={active ? '' : undefined}
                  onClick={() => props.controller.toggleFilter(filter)}
                >
                  {FILTER_LABELS[filter]}
                </button>
              );
            })}
          </div>

          {errorsOnly ? (
            <div className="ndbg-list">
              {errorGroups.length === 0 ? <p className="ndbg-empty">No errors recorded.</p> : null}
              {errorGroups.map((group) => (
                <article key={group.source} className="ndbg-entry">
                  <div className="ndbg-entry-topline">
                    <span className="ndbg-badge" data-group="error">Error</span>
                    <time>{formatClock(group.latestTimestamp)}</time>
                  </div>
                  <strong className="ndbg-entry-summary" onClick={() => setErrorGroupExpanded(errorGroupExpanded === group.source ? null : group.source)}>
                    {group.source} ({group.count})
                  </strong>
                  {errorGroupExpanded === group.source ? (
                    <div className="ndbg-entry-expanded">
                      {group.events.map((event) => (
                        <div key={event.id}>
                          <span className="ndbg-entry-meta">{formatClock(event.timestamp)}</span>
                          <strong>{event.summary}</strong>
                          {event.detail ? <code className="ndbg-entry-detail">{event.detail}</code> : null}
                          {event.exportedData != null ? <JsonViewer data={event.exportedData} defaultExpanded={2} /> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="ndbg-list">
              {activeTimelineEvents.length === 0 ? <p className="ndbg-empty">No events match the active filters.</p> : null}
              {activeTimelineEvents.map((event) => {
                const isSlowRender = event.kind === 'render:end' && event.durationMs != null && event.durationMs > 16;
                return (
                  <article key={event.id} className="ndbg-entry" onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}>
                    <div className="ndbg-entry-topline">
                      <span className="ndbg-badge" data-group={event.group} data-slow={isSlowRender ? '' : undefined}>{event.group}</span>
                      <time>{formatClock(event.timestamp)}</time>
                    </div>
                    <strong className="ndbg-entry-summary">
                      {event.summary}
                      {isSlowRender ? ' \u26A0\uFE0F ' : ''}
                    </strong>
                    <span className="ndbg-entry-meta">{event.source}</span>
                    {expandedId === event.id ? (
                      <div className="ndbg-entry-expanded" onClick={(e) => e.stopPropagation()}>
                        {event.detail ? <code className="ndbg-entry-detail">{event.detail}</code> : null}
                        {event.network ? (
                          <div>
                            <span className="ndbg-json-key">Network: </span>
                            <JsonViewer data={event.network} defaultExpanded={2} />
                          </div>
                        ) : null}
                        {event.exportedData != null ? (
                          <div>
                            <span className="ndbg-json-key">Data: </span>
                            <JsonViewer data={event.exportedData} defaultExpanded={2} />
                          </div>
                        ) : null}
                        {!event.detail && !event.network && event.exportedData == null && (
                          <span className="ndbg-empty">No detailed data available.</span>
                        )}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </>
      ) : null}

      {snapshot.activeTab === 'network' ? (
        <div className="ndbg-list">
          {mergedRequests.length === 0 ? <p className="ndbg-empty">No network events recorded yet.</p> : null}
          {mergedRequests.map((req) => (
            <article key={req.requestKey} className="ndbg-entry" onClick={() => setNetworkExpandedKey(networkExpandedKey === req.requestKey ? null : req.requestKey)}>
              <div className="ndbg-entry-topline">
                <span className={`ndbg-badge ndbg-status-${req.status}`} data-group="api">{req.status}</span>
                <time>{formatClock(req.startEvent?.timestamp ?? 0)}</time>
              </div>
              <strong className="ndbg-entry-summary">{req.summary}</strong>
              <span className="ndbg-entry-meta">
                {req.durationMs != null ? `${req.durationMs}ms` : req.status === 'pending' ? 'pending...' : ''}
              </span>
              {networkExpandedKey === req.requestKey ? (
                <div className="ndbg-entry-expanded" onClick={(e) => e.stopPropagation()}>
                  {req.startEvent?.network ? (
                    <div>
                      <span className="ndbg-json-key">Request: </span>
                      <JsonViewer data={req.startEvent.network} defaultExpanded={2} />
                    </div>
                  ) : null}
                  {req.endEvent?.network ? (
                    <div>
                      <span className="ndbg-json-key">Response: </span>
                      <JsonViewer data={req.endEvent.network} defaultExpanded={2} />
                    </div>
                  ) : null}
                  {req.endEvent?.exportedData != null ? (
                    <div>
                      <span className="ndbg-json-key">Response Data: </span>
                      <JsonViewer data={req.endEvent.exportedData} defaultExpanded={2} />
                    </div>
                  ) : null}
                  {req.startEvent?.detail ? <code className="ndbg-entry-detail">{req.startEvent.detail}</code> : null}
                  {req.endEvent?.detail ? <code className="ndbg-entry-detail">{req.endEvent.detail}</code> : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {snapshot.activeTab === 'node' ? (
        <>
          <div className="ndbg-tree-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="ndbg-metric-label">Components ({componentTree.length})</span>
              <button onClick={scanComponentTree} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--nop-debugger-chip-border)', background: 'transparent', color: 'var(--nop-debugger-text)', cursor: 'pointer' }}>
                Scan
              </button>
            </div>
            {selectedElement ? (
              <article className="ndbg-metric-card" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="ndbg-metric-label">Selected Element</span>
                  <button onClick={() => { setSelectedElement(null); }} style={{ fontSize: '11px', background: 'none', border: 'none', color: 'var(--nop-debugger-text)', cursor: 'pointer', padding: 0 }}>✕</button>
                </div>
                <strong>data-cid: {selectedElement.getAttribute('data-cid')}</strong>
                <span>{selectedElement.tagName.toLowerCase()}</span>
              </article>
            ) : null}
            {componentTree.length > 0 ? (
              <div className="ndbg-component-tree">
                {componentTree.map((item) => (
                  <div
                    key={item.cid}
                    className={`ndbg-tree-item ${selectedElement === item.element ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedElement(item.element);
                      setInspectMode(false);
                      props.controller.setActiveTab('node');
                      setNodeIdInput(String(item.cid));
                    }}
                    style={{ paddingLeft: `${item.depth * 16 + 8}px` }}
                  >
                    <span style={{ fontSize: '11px', color: 'var(--nop-debugger-muted-text)' }}>#{item.cid}</span>
                    {' '}
                    <span style={{ fontSize: '12px' }}>{item.label || 'element'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="ndbg-empty">Click "Scan" to find components.</p>
            )}
          </div>
          <input
            type="text"
            className="ndbg-node-input"
            placeholder="Enter nodeId to inspect..."
            value={nodeIdInput}
            onChange={(e) => setNodeIdInput(e.target.value)}
          />
          {nodeDiagnostics && nodeIdInput.trim() ? (
            <div className="ndbg-list">
              <article className="ndbg-entry">
                <div className="ndbg-entry-topline">
                  <span className="ndbg-badge" data-group="node">Node</span>
                  <span className="ndbg-entry-meta">{nodeDiagnostics.nodeId ?? 'n/a'}</span>
                </div>
                <strong className="ndbg-entry-summary">
                  {nodeDiagnostics.rendererTypes.length > 0 ? nodeDiagnostics.rendererTypes.join(', ') : 'Unknown type'}
                </strong>
                <span className="ndbg-entry-meta">
                  {nodeDiagnostics.path ?? 'no path'} | {nodeDiagnostics.totalEvents} events
                </span>
              </article>
              {nodeDiagnostics.totalEvents === 0 ? (
                <p className="ndbg-empty">No events found for this node.</p>
              ) : (
                <>
                  <div className="ndbg-overview">
                    <article className="ndbg-metric-card">
                      <span className="ndbg-metric-label">Render events</span>
                      <strong>{nodeDiagnostics.countsByGroup.render ?? 0}</strong>
                    </article>
                    <article className="ndbg-metric-card">
                      <span className="ndbg-metric-label">Action events</span>
                      <strong>{nodeDiagnostics.countsByGroup.action ?? 0}</strong>
                    </article>
                    <article className="ndbg-metric-card">
                      <span className="ndbg-metric-label">API events</span>
                      <strong>{nodeDiagnostics.countsByGroup.api ?? 0}</strong>
                    </article>
                    <article className="ndbg-metric-card" data-error="">
                      <span className="ndbg-metric-label">Errors</span>
                      <strong>{nodeDiagnostics.countsByGroup.error ?? 0}</strong>
                    </article>
                    {(() => {
                      const renderEndEvents = nodeDiagnostics.recentEvents.filter((e) => e.kind === 'render:end' && e.durationMs != null);
                      if (renderEndEvents.length === 0) return null;
                      const slowest = Math.max(...renderEndEvents.map((e) => e.durationMs!));
                      const avg = renderEndEvents.reduce((sum, e) => sum + e.durationMs!, 0) / renderEndEvents.length;
                      return (
                        <article className="ndbg-metric-card" data-slow="">
                          <span className="ndbg-metric-label">Render performance</span>
                          <strong>Slowest: {slowest}ms</strong>
                          <span>Avg: {avg.toFixed(1)}ms ({renderEndEvents.length} renders)</span>
                        </article>
                      );
                    })()}
                  </div>
                  {nodeDiagnostics.recentEvents.map((event) => (
                    <article key={event.id} className="ndbg-entry" onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}>
                      <div className="ndbg-entry-topline">
                        <span className="ndbg-badge" data-group={event.group}>{event.kind}</span>
                        <time>{formatClock(event.timestamp)}</time>
                      </div>
                      <strong className="ndbg-entry-summary">{event.summary}</strong>
                      {event.durationMs != null ? (
                        <span className="ndbg-entry-meta">{event.durationMs}ms</span>
                      ) : null}
                      {expandedId === event.id ? (
                        <div className="ndbg-entry-expanded" onClick={(e) => e.stopPropagation()}>
                          {event.detail ? <code className="ndbg-entry-detail">{event.detail}</code> : null}
                          {event.exportedData != null ? <JsonViewer data={event.exportedData} defaultExpanded={2} /> : null}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </>
              )}
            </div>
          ) : (
            <p className="ndbg-empty">Enter a nodeId above to view node diagnostics.</p>
          )}
        </>
      ) : null}
    </div>
  );
}
