import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { AmisDebugEvent, AmisDebuggerController, AmisDebuggerFilterKind, AmisDebuggerTab, AmisInteractionTrace } from './types';
import { buildOverview, DEFAULT_FILTERS } from './diagnostics';

const DEBUGGER_STYLE_ID = 'na-debugger-styles';
const DEBUGGER_STYLES = `
.na-debugger {
  position: fixed;
  z-index: 9999;
  width: min(420px, calc(100vw - 32px));
  max-height: min(78vh, 760px);
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(16, 24, 34, 0.96), rgba(10, 18, 27, 0.98)),
    radial-gradient(circle at top right, rgba(240, 183, 79, 0.16), transparent 42%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 72px rgba(7, 12, 18, 0.32);
  color: #eef4fb;
  backdrop-filter: blur(16px);
}

.na-debugger__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  cursor: move;
}

.na-debugger__header h2 {
  margin: 4px 0 0;
  font-size: 20px;
}

.na-debugger__eyebrow {
  margin: 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: #ffcf8b;
}

.na-debugger__header-actions,
.na-debugger__tabs,
.na-debugger__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.na-debugger__icon-button,
.na-debugger__tab,
.na-debugger__filter,
.na-debugger-launcher {
  appearance: none;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #eef4fb;
  cursor: pointer;
}

.na-debugger__icon-button,
.na-debugger__tab,
.na-debugger__filter {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
}

.na-debugger__tab--active,
.na-debugger__filter--active {
  background: rgba(255, 207, 139, 0.18);
  border-color: rgba(255, 207, 139, 0.34);
  color: #ffcf8b;
}

.na-debugger__overview,
.na-debugger__list {
  display: grid;
  gap: 10px;
  overflow: auto;
}

.na-debugger__overview {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.na-debugger__metric-card,
.na-debugger__entry {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.na-debugger__metric-card strong {
  font-size: 20px;
}

.na-debugger__metric-card--error strong {
  color: #ff9d9d;
}

.na-debugger__metric-label,
.na-debugger__entry-meta,
.na-debugger__entry time,
.na-debugger-launcher__meta {
  font-size: 12px;
  color: rgba(238, 244, 251, 0.7);
}

.na-debugger__entry-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.na-debugger__entry-summary {
  font-size: 14px;
  line-height: 1.45;
}

.na-debugger__entry-detail {
  display: block;
  overflow-x: auto;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.26);
  color: #bce6ff;
  white-space: nowrap;
}

.na-debugger__badge {
  width: fit-content;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.na-debugger__badge--render { background: rgba(120, 198, 255, 0.16); color: #9bd9ff; }
.na-debugger__badge--action { background: rgba(255, 205, 128, 0.16); color: #ffd18a; }
.na-debugger__badge--api { background: rgba(125, 235, 182, 0.16); color: #9df3ca; }
.na-debugger__badge--compile { background: rgba(210, 183, 255, 0.16); color: #dcc0ff; }
.na-debugger__badge--notify { background: rgba(255, 158, 177, 0.16); color: #ffbac8; }
.na-debugger__badge--error { background: rgba(255, 128, 128, 0.18); color: #ffadad; }

.na-debugger__empty { margin: 0; color: rgba(238, 244, 251, 0.74); }

.na-debugger-launcher {
  position: fixed;
  z-index: 9998;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 20px;
  background: rgba(16, 24, 34, 0.94);
  box-shadow: 0 8px 24px rgba(7, 12, 18, 0.32);
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.na-debugger-launcher:active {
  cursor: grabbing;
}

.na-debugger-launcher__icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.na-debugger-launcher__label { font-size: 12px; font-weight: 600; }

@media (max-width: 760px) {
  .na-debugger {
    width: calc(100vw - 24px);
    max-height: 72vh;
  }

  .na-debugger__overview {
    grid-template-columns: 1fr;
  }
}
`;

const FILTER_LABELS: Record<AmisDebuggerFilterKind, string> = {
  render: 'Render',
  action: 'Action',
  api: 'API',
  compile: 'Compile',
  notify: 'Notify',
  error: 'Error'
};

function formatClock(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function getEventBadgeClass(event: AmisDebugEvent) {
  return `na-debugger__badge na-debugger__badge--${event.group}`;
}

function formatTraceSummary(trace: AmisInteractionTrace | undefined) {
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

function useDebuggerSnapshot(controller: AmisDebuggerController) {
  const [snapshot, setSnapshot] = useState(controller.getSnapshot());

  useEffect(() => {
    setSnapshot(controller.getSnapshot());
    return controller.subscribe(() => {
      setSnapshot(controller.getSnapshot());
    });
  }, [controller]);

  return snapshot;
}

function useDraggablePosition(controller: AmisDebuggerController, initial: { x: number; y: number }) {
  const [position, setPosition] = useState(initial);
  const dragState = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    setPosition(initial);
  }, [initial]);

  const bind = {
    onPointerDown(event: ReactPointerEvent<HTMLElement>) {
      const target = event.currentTarget.parentElement;
      if (!target) {
        return;
      }

      dragState.current = {
        pointerId: event.pointerId,
        offsetX: event.clientX - position.x,
        offsetY: event.clientY - position.y
      };

      target.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: ReactPointerEvent<HTMLElement>) {
      if (!dragState.current || dragState.current.pointerId !== event.pointerId) {
        return;
      }

      const next = {
        x: Math.max(12, event.clientX - dragState.current.offsetX),
        y: Math.max(12, event.clientY - dragState.current.offsetY)
      };

      setPosition(next);
    },
    onPointerUp(event: ReactPointerEvent<HTMLElement>) {
      if (!dragState.current || dragState.current.pointerId !== event.pointerId) {
        return;
      }

      controller.setPanelPosition(position);
      dragState.current = null;
    }
  };

  return { position, bind };
}

function useLauncherDrag(
  controller: AmisDebuggerController,
  initial: { x: number; y: number }
) {
  const [position, setPosition] = useState(initial);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
    hasMoved: boolean;
  } | null>(null);
  const wasDraggedRef = useRef(false);

  useEffect(() => {
    setPosition(initial);
  }, [initial]);

  const bind = {
    onPointerDown(event: ReactPointerEvent<HTMLElement>) {
      const target = event.currentTarget;
      wasDraggedRef.current = false;
      dragState.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startPosX: position.x,
        startPosY: position.y,
        hasMoved: false
      };
      target.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: ReactPointerEvent<HTMLElement>) {
      if (!dragState.current || dragState.current.pointerId !== event.pointerId) {
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

      setPosition({ x: newX, y: newY });
    },
    onPointerUp(event: ReactPointerEvent<HTMLElement>) {
      if (!dragState.current || dragState.current.pointerId !== event.pointerId) {
        return;
      }

      if (dragState.current.hasMoved) {
        controller.setPanelPosition(position);
        wasDraggedRef.current = true;
      }

      dragState.current = null;
    }
  };

  return { position, bind, wasDraggedRef };
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

export function AmisDebuggerPanel(props: { controller: AmisDebuggerController }) {
  const snapshot = useDebuggerSnapshot(props.controller);
  const { position, bind } = useDraggablePosition(props.controller, snapshot.position);
  const { position: launcherPosition, bind: launcherBind, wasDraggedRef } = useLauncherDrag(props.controller, snapshot.position);
  useInjectDebuggerStyles(snapshot.enabled);

  const filteredEvents = useMemo(
    () => snapshot.events.filter((event) => snapshot.filters.includes(event.group)),
    [snapshot.events, snapshot.filters]
  );

  const networkEvents = useMemo(
    () => filteredEvents.filter((event) => event.group === 'api'),
    [filteredEvents]
  );

  const overview = useMemo(() => buildOverview(snapshot.events), [snapshot.events]);
  const latestTrace = props.controller.createDiagnosticReport({
    eventLimit: 20,
    includeLatestInteractionTrace: true
  }).latestInteractionTrace;
  const latestTraceSummary = useMemo(() => formatTraceSummary(latestTrace), [latestTrace]);

  if (!snapshot.enabled) {
    return null;
  }

  if (!snapshot.panelOpen) {
    const errorCount = overview.errorCount;
    return (
      <button
        type="button"
        className="na-debugger-launcher"
        style={{ left: `${launcherPosition.x}px`, top: `${launcherPosition.y}px` }}
        onPointerDown={launcherBind.onPointerDown}
        onPointerMove={launcherBind.onPointerMove}
        onPointerUp={(e) => {
          launcherBind.onPointerUp(e);
          if (!wasDraggedRef.current) {
            props.controller.show();
          }
        }}
      >
        <span className="na-debugger-launcher__icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </span>
        <span className="na-debugger-launcher__label">
          {errorCount > 0 ? `${errorCount} err` : `${snapshot.events.length}`}
        </span>
      </button>
    );
  }

  return (
    <div className="na-debugger" style={{ left: `${position.x}px`, top: `${position.y}px` }}>
      <div className="na-debugger__header" {...bind}>
        <div>
          <p className="na-debugger__eyebrow">Framework Debugger</p>
          <h2>Runtime Console</h2>
        </div>
        <div className="na-debugger__header-actions">
          <button type="button" className="na-debugger__icon-button" onClick={() => (snapshot.paused ? props.controller.resume() : props.controller.pause())}>
            {snapshot.paused ? 'Resume' : 'Pause'}
          </button>
          <button type="button" className="na-debugger__icon-button" onClick={() => props.controller.clear()}>
            Clear
          </button>
          <button type="button" className="na-debugger__icon-button" onClick={() => props.controller.hide()} title="Minimize">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="4 14 10 14 10 20" />
              <polyline points="20 10 14 10 14 4" />
              <line x1="14" y1="10" x2="21" y2="3" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        </div>
      </div>

      <div className="na-debugger__tabs" role="tablist" aria-label="Debugger tabs">
        {(['overview', 'timeline', 'network'] as AmisDebuggerTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`na-debugger__tab ${snapshot.activeTab === tab ? 'na-debugger__tab--active' : ''}`}
            onClick={() => props.controller.setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {snapshot.activeTab === 'overview' ? (
        <div className="na-debugger__overview">
          <article className="na-debugger__metric-card">
            <span className="na-debugger__metric-label">Events</span>
            <strong>{overview.totalEvents}</strong>
            <span>{snapshot.paused ? 'stream paused' : 'stream live'}</span>
          </article>
          <article className="na-debugger__metric-card">
            <span className="na-debugger__metric-label">Latest compile</span>
            <strong>{overview.latestCompile ? formatClock(overview.latestCompile.timestamp) : 'n/a'}</strong>
            <span>{overview.latestCompile?.summary ?? 'No compile event yet'}</span>
          </article>
          <article className="na-debugger__metric-card">
            <span className="na-debugger__metric-label">Latest action</span>
            <strong>{overview.latestAction ? formatClock(overview.latestAction.timestamp) : 'n/a'}</strong>
            <span>{overview.latestAction?.summary ?? 'No action event yet'}</span>
          </article>
          <article className="na-debugger__metric-card">
            <span className="na-debugger__metric-label">Latest API</span>
            <strong>{overview.latestApi ? formatClock(overview.latestApi.timestamp) : 'n/a'}</strong>
            <span>{overview.latestApi?.summary ?? 'No API event yet'}</span>
          </article>
          <article className="na-debugger__metric-card na-debugger__metric-card--error">
            <span className="na-debugger__metric-label">Errors</span>
            <strong>{overview.errorCount}</strong>
            <span>{overview.errorCount > 0 ? 'Needs attention' : 'No errors recorded'}</span>
          </article>
          <article className="na-debugger__metric-card">
            <span className="na-debugger__metric-label">Latest trace</span>
            <strong>{latestTrace ? latestTrace.totalEvents : 0}</strong>
            <span>{latestTraceSummary.headline}</span>
            <span className="na-debugger__metric-label">{latestTraceSummary.detail}</span>
          </article>
        </div>
      ) : null}

      {snapshot.activeTab === 'timeline' ? (
        <>
          <div className="na-debugger__filters">
            {DEFAULT_FILTERS.map((filter) => {
              const active = snapshot.filters.includes(filter);
              return (
                <button
                  key={filter}
                  type="button"
                  className={`na-debugger__filter ${active ? 'na-debugger__filter--active' : ''}`}
                  onClick={() => props.controller.toggleFilter(filter)}
                >
                  {FILTER_LABELS[filter]}
                </button>
              );
            })}
          </div>
          <div className="na-debugger__list">
            {filteredEvents.length === 0 ? <p className="na-debugger__empty">No events match the active filters.</p> : null}
            {filteredEvents.map((event) => (
              <article key={event.id} className="na-debugger__entry">
                <div className="na-debugger__entry-topline">
                  <span className={getEventBadgeClass(event)}>{event.group}</span>
                  <time>{formatClock(event.timestamp)}</time>
                </div>
                <strong className="na-debugger__entry-summary">{event.summary}</strong>
                <span className="na-debugger__entry-meta">{event.source}</span>
                {event.detail ? <code className="na-debugger__entry-detail">{event.detail}</code> : null}
              </article>
            ))}
          </div>
        </>
      ) : null}

      {snapshot.activeTab === 'network' ? (
        <div className="na-debugger__list">
          {networkEvents.length === 0 ? <p className="na-debugger__empty">No network events recorded yet.</p> : null}
          {networkEvents.map((event) => (
            <article key={event.id} className="na-debugger__entry">
              <div className="na-debugger__entry-topline">
                <span className={getEventBadgeClass(event)}>{event.kind}</span>
                <time>{formatClock(event.timestamp)}</time>
              </div>
              <strong className="na-debugger__entry-summary">{event.summary}</strong>
              <span className="na-debugger__entry-meta">
                {event.durationMs != null ? `${event.durationMs}ms` : 'pending'}
                {event.requestKey ? ` | ${event.requestKey}` : ''}
              </span>
              {event.detail ? <code className="na-debugger__entry-detail">{event.detail}</code> : null}
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
