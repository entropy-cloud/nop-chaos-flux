import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Pause, Play, Trash2, Crosshair, Minimize2, Bug } from 'lucide-react';
import type { NopDebuggerController, NopDebuggerFilterKind, NopDebuggerTab } from './types';
import { buildOverview } from './diagnostics';
import { loadPersistedSearchHistory, persistSearchHistory } from './controller-helpers';
import { formatTraceSummary, groupErrors, mergeNetworkRequests } from './panel/event-groups';
import { useDebuggerSnapshot, useDraggablePosition, useLauncherDrag, useResizablePanel } from './panel/hooks';
import { NetworkTab } from './panel/network-tab';
import { NodeTab } from './panel/node-tab';
import { OverviewTab } from './panel/overview-tab';
import { useInjectDebuggerStyles } from './panel/styles';
import { TimelineTab } from './panel/timeline-tab';
import { useInspectMode } from './panel/use-inspect-mode';

const FILTER_LABELS: Record<NopDebuggerFilterKind, string> = {
  render: 'Render',
  action: 'Action',
  api: 'API',
  compile: 'Compile',
  notify: 'Notify',
  error: 'Error',
  node: 'Node'
};

function includesText(target: string | undefined, query: string) {
  return (target ?? '').toLowerCase().includes(query.toLowerCase());
}

function parseRegexLiteral(input: string): RegExp | null {
  const match = /^\/(.*)\/([a-z]*)$/.exec(input.trim());
  if (!match) {
    return null;
  }

  try {
    return new RegExp(match[1], match[2]);
  } catch {
    return null;
  }
}

function matchesRegex(event: import('./types').NopDebugEvent, regex: RegExp): boolean {
  return [
    event.summary,
    event.detail,
    event.source,
    event.nodeId,
    event.path,
    event.requestKey
  ].some((value) => value != null && regex.test(value));
}

function matchesSearchQuery(event: import('./types').NopDebugEvent, rawQuery: string): boolean {
  const query = rawQuery.trim();
  if (!query) {
    return true;
  }

  if (query.startsWith('path:')) {
    const pathQuery = query.slice(5).trim();
    if (!pathQuery) {
      return true;
    }

    const pathRegex = parseRegexLiteral(pathQuery);
    if (pathRegex) {
      return pathRegex.test(event.path ?? '');
    }

    return includesText(event.path, pathQuery);
  }

  const regex = parseRegexLiteral(query);
  if (regex) {
    return matchesRegex(event, regex);
  }

  return (
    includesText(event.summary, query) ||
    includesText(event.detail, query) ||
    includesText(event.source, query) ||
    includesText(event.nodeId, query) ||
    includesText(event.path, query) ||
    includesText(event.requestKey, query)
  );
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

  const [searchHistory, setSearchHistory] = useState<string[]>(() => loadPersistedSearchHistory(props.controller.id));
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const deferredSearchText = useDeferredValue(searchText);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [nodeIdInput, setNodeIdInput] = useState('');
  const [networkExpandedKey, setNetworkExpandedKey] = useState<string | null>(null);
  const [errorGroupExpanded, setErrorGroupExpanded] = useState<string | null>(null);
  const [evalInput, setEvalInput] = useState('');
  const [evalResult, setEvalResult] = useState<string | null>(null);
  const [formTab, setFormTab] = useState<'values' | 'errors' | 'meta'>('values');
  const {
    inspectMode,
    setInspectMode,
    inspectData,
    setInspectData,
    selectedElement,
    setSelectedElement,
    inspectElement,
    componentTree,
    scanComponentTree,
  } = useInspectMode({
    controller: props.controller,
    activeTab: snapshot.activeTab,
    setNodeIdInput,
    setFormTab,
    setEvalResult,
  });

  const handleEvalExpression = () => {
    if (!evalInput.trim() || !inspectData) return;
    const evaluated = props.controller.evaluateNodeExpression({
      cid: inspectData.cid,
      expression: evalInput.trim()
    });
    setEvalResult(evaluated.ok ? JSON.stringify(evaluated.value, null, 2) : `Error: ${evaluated.error}`);
  };

  const filteredEvents = useMemo(
    () => snapshot.events.filter((event) => snapshot.filters.includes(event.group)),
    [snapshot.events, snapshot.filters]
  );

  const searchedEvents = useMemo(() => {
    if (!deferredSearchText.trim()) return filteredEvents;
    return filteredEvents.filter((event) => matchesSearchQuery(event, deferredSearchText));
  }, [deferredSearchText, filteredEvents]);

  const networkEvents = useMemo(
    () => filteredEvents.filter((event) => event.group === 'api'),
    [filteredEvents]
  );

  const mergedRequests = useMemo(() => mergeNetworkRequests(networkEvents), [networkEvents]);

  const errorGroups = useMemo(() => groupErrors(snapshot.events), [snapshot.events]);

  const overview = useMemo(() => buildOverview(snapshot.events), [snapshot.events]);
  const latestTrace = useMemo(() => props.controller.createDiagnosticReport({
    eventLimit: 20,
    includeLatestInteractionTrace: true
  }).latestInteractionTrace, [props.controller]);
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

  useEffect(() => {
    persistSearchHistory(props.controller.id, searchHistory);
  }, [props.controller.id, searchHistory]);

  const handleSearchTextChange = (value: string) => {
    setSearchText(value);
  };

  const handleSearchSubmit = () => {
    const query = searchText.trim();
    if (!query) {
      return;
    }

    setSearchHistory((current) => {
      const next = [query, ...current.filter((item) => item !== query)];
      return next.slice(0, 8);
    });
  };

  const handleSearchHistorySelect = (query: string) => {
    setSearchText(query);
  };

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

      {snapshot.activeTab === 'overview' ? <OverviewTab overview={overview} paused={snapshot.paused} latestTrace={latestTrace} latestTraceSummary={latestTraceSummary} /> : null}

      {snapshot.activeTab === 'timeline' ? (
        <TimelineTab
          snapshot={snapshot}
          searchText={searchText}
          setSearchText={handleSearchTextChange}
          submitSearch={handleSearchSubmit}
          searchHistory={searchHistory}
          applySearchHistory={handleSearchHistorySelect}
          errorsOnly={errorsOnly}
          toggleErrorsOnly={toggleErrorsOnly}
          filterLabels={FILTER_LABELS}
          toggleFilter={(filter) => props.controller.toggleFilter(filter)}
          errorGroups={errorGroups}
          errorGroupExpanded={errorGroupExpanded}
          setErrorGroupExpanded={setErrorGroupExpanded}
          activeTimelineEvents={activeTimelineEvents}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
        />
      ) : null}

      {snapshot.activeTab === 'network' ? <NetworkTab mergedRequests={mergedRequests} networkExpandedKey={networkExpandedKey} setNetworkExpandedKey={setNetworkExpandedKey} /> : null}

      {snapshot.activeTab === 'node' ? (
        <NodeTab
          componentTree={componentTree}
          scanComponentTree={scanComponentTree}
          inspectMode={inspectMode}
          inspectData={inspectData}
          selectedElement={selectedElement}
          setSelectedElement={(element) => {
            setSelectedElement(element);
            if (element == null) {
              setInspectData(null);
            }
          }}
          inspectElement={inspectElement}
          nodeIdInput={nodeIdInput}
          onNodeIdInputChange={setNodeIdInput}
          nodeDiagnostics={nodeDiagnostics}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          formTab={formTab}
          setFormTab={setFormTab}
          evalInput={evalInput}
          setEvalInput={setEvalInput}
          evalResult={evalResult}
          handleEvalExpression={handleEvalExpression}
        />
      ) : null}
    </div>
  );
}
