import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, Trash2, Crosshair, Minimize2, Bug } from 'lucide-react';
import type { NopComponentInspectResult, NopDebuggerController, NopDebuggerFilterKind, NopDebuggerTab } from './types';
import { buildOverview, DEFAULT_FILTERS } from './diagnostics';
import { formatTraceSummary, groupErrors, mergeNetworkRequests } from './panel/event-groups';
import { useDebuggerSnapshot, useDraggablePosition, useLauncherDrag, useResizablePanel } from './panel/hooks';
import { JsonViewer } from './panel/json-viewer';
import { useInjectDebuggerStyles } from './panel/styles';

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


function includesText(target: string | undefined, query: string) {
  return (target ?? '').toLowerCase().includes(query.toLowerCase());
}

function collectComponentTree() {
  if (typeof document === 'undefined') {
    return [] as Array<{cid: number; type: string; label: string; depth: number; element: HTMLElement}>;
  }

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

  return tree;
}

export function NopDebuggerPanel(props: { controller: NopDebuggerController }) {
  const snapshot = useDebuggerSnapshot(props.controller);
  const handlePanelTap = useMemo(
    () => (snapshot.minimized ? () => props.controller.unminimize() : undefined),
    [props.controller, snapshot.minimized]
  );
  const { position, bind: dragBind } = useDraggablePosition(props.controller, snapshot.position, handlePanelTap);
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
  const [componentTreeRevision, setComponentTreeRevision] = useState(0);
  const [inspectData, setInspectData] = useState<NopComponentInspectResult | null>(null);
  const [evalInput, setEvalInput] = useState('');
  const [evalResult, setEvalResult] = useState<string | null>(null);
  const [formTab, setFormTab] = useState<'values' | 'errors' | 'meta'>('values');

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
  const componentTree = useMemo(() => {
    void componentTreeRevision;
    if (snapshot.activeTab !== 'node') {
      return [] as Array<{cid: number; type: string; label: string; depth: number; element: HTMLElement}>;
    }

    return collectComponentTree();
  }, [componentTreeRevision, snapshot.activeTab]);

  useEffect(() => {
    if (!inspectMode || !visibleHoveredElement || !hoverOverlayRef.current) {
      if (hoverOverlayRef.current) hoverOverlayRef.current.style.display = 'none';
      return;
    }
    const rect = visibleHoveredElement.getBoundingClientRect();
    hoverOverlayRef.current.style.display = 'block';
    hoverOverlayRef.current.style.top = rect.top + 'px';
    hoverOverlayRef.current.style.left = rect.left + 'px';
    hoverOverlayRef.current.style.width = rect.width + 'px';
    hoverOverlayRef.current.style.height = rect.height + 'px';
  }, [inspectMode, visibleHoveredElement]);

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

      const inspectResult = props.controller.inspectByElement(target as HTMLElement);
      setInspectData(inspectResult ?? null);
      setFormTab('values');
      setEvalResult(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick, true);
    };
  }, [inspectMode, props.controller]);

  useEffect(() => {
    if (!inspectMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInspectMode(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [inspectMode]);

  const scanComponentTree = () => {
    setComponentTreeRevision((prev) => prev + 1);
  };

  const handleEvalExpression = () => {
    if (!evalInput.trim()) return;
    setEvalResult('Expression evaluation is disabled. Inspect scope data directly instead.');
  };

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
            {inspectMode ? (
              <div className="ndbg-inspect-hint">
                🔍 Click an element on the page to inspect it. (Press Esc to cancel)
              </div>
            ) : null}
            {inspectData ? (
              <div className="ndbg-inspect-panel">
                <article className="ndbg-metric-card">
                  <div className="ndbg-inspect-header">
                    <span className="ndbg-metric-label">Component Inspector</span>
                    <button onClick={() => { setSelectedElement(null); setInspectData(null); }} style={{ fontSize: '11px', background: 'none', border: 'none', color: 'var(--nop-debugger-text)', cursor: 'pointer', padding: 0 }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong>#{inspectData.cid}</strong>
                    {inspectData.tagName ? <span className="ndbg-inspect-tag">&lt;{inspectData.tagName}&gt;</span> : null}
                    {inspectData.handleType ? <span className="ndbg-badge" data-group="node">{inspectData.handleType}</span> : null}
                  </div>
                  <div className="ndbg-inspect-meta">
                    {inspectData.handleName ? <span>Name: {inspectData.handleName}</span> : null}
                    {inspectData.handleId ? <span>ID: {inspectData.handleId}</span> : null}
                    {inspectData.className ? <span>Class: {inspectData.className.slice(0, 60)}{inspectData.className.length > 60 ? '…' : ''}</span> : null}
                    <span>{inspectData.mounted ? '● mounted' : '○ unmounted'}</span>
                  </div>
                </article>

                {inspectData.formState ? (
                  <div className="ndbg-inspect-section">
                    <span className="ndbg-inspect-section-title">Form State</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {(['values', 'errors', 'meta'] as const).map((tab) => (
                        <button key={tab} type="button" className="ndbg-form-tab" data-active={formTab === tab ? '' : undefined} onClick={() => setFormTab(tab)}>
                          {tab}
                        </button>
                      ))}
                    </div>
                    <JsonViewer
                      data={
                        formTab === 'values' ? inspectData.formState.values :
                        formTab === 'errors' ? inspectData.formState.errors :
                        { touched: inspectData.formState.touched, dirty: inspectData.formState.dirty, visited: inspectData.formState.visited, submitting: inspectData.formState.submitting }
                      }
                      defaultExpanded={2}
                    />
                  </div>
                ) : null}

                {inspectData.scopeData ? (
                  <div className="ndbg-inspect-section">
                    <span className="ndbg-inspect-section-title">Scope Data</span>
                    <JsonViewer data={inspectData.scopeData} defaultExpanded={2} />
                  </div>
                ) : null}
              </div>
            ) : selectedElement ? (
              <article className="ndbg-metric-card" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="ndbg-metric-label">Selected Element</span>
                  <button onClick={() => setSelectedElement(null)} style={{ fontSize: '11px', background: 'none', border: 'none', color: 'var(--nop-debugger-text)', cursor: 'pointer', padding: 0 }}>✕</button>
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

                      const inspectResult = props.controller.inspectByElement(item.element);
                      setInspectData(inspectResult ?? null);
                      setFormTab('values');
                      setEvalResult(null);
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
          {inspectData ? (
            <div className="ndbg-inspect-section">
              <span className="ndbg-inspect-section-title">Expression Evaluator</span>
              <input
                type="text"
                className="ndbg-eval-input"
                placeholder="Evaluate formula expression on component data..."
                value={evalInput}
                onChange={(e) => setEvalInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleEvalExpression(); }}
              />
              {evalResult !== null ? <div className="ndbg-eval-result">{evalResult}</div> : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
