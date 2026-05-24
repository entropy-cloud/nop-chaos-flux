import { useDeferredValue, useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { Pause, Play, Trash2, Crosshair, Minimize2, Bug } from 'lucide-react';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { NopDebuggerController, NopDebuggerFilterKind, NopDebuggerTab } from './types.js';
import { buildOverview } from './diagnostics.js';
import { loadPersistedSearchHistory, persistSearchHistory } from './controller-helpers.js';
import { formatTraceSummary, groupErrors, mergeNetworkRequests } from './panel/event-groups.js';
import {
  useDebuggerSnapshot,
  useDraggablePosition,
  useLauncherDrag,
  useResizablePanel,
} from './panel/hooks.js';
import { NetworkTab } from './panel/network-tab.js';
import { NodeTab } from './panel/node-tab.js';
import { OverviewTab } from './panel/overview-tab.js';
import { useInjectDebuggerStyles } from './panel/styles.js';
import { TimelineTab } from './panel/timeline-tab.js';
import { useInspectMode } from './panel/use-inspect-mode.js';

function equalFilters(
  a: NopDebuggerFilterKind[],
  b: NopDebuggerFilterKind[],
) {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

function equalChromeState(
  a: {
    enabled: boolean;
    panelOpen: boolean;
    minimized: boolean;
    paused: boolean;
    strictMode: boolean;
    activeTab: NopDebuggerTab;
    position: { x: number; y: number };
  },
  b: {
    enabled: boolean;
    panelOpen: boolean;
    minimized: boolean;
    paused: boolean;
    strictMode: boolean;
    activeTab: NopDebuggerTab;
    position: { x: number; y: number };
  },
) {
  return (
    a.enabled === b.enabled &&
    a.panelOpen === b.panelOpen &&
    a.minimized === b.minimized &&
    a.paused === b.paused &&
    a.strictMode === b.strictMode &&
    a.activeTab === b.activeTab &&
    a.position === b.position
  );
}

function getFilterLabels(): Record<NopDebuggerFilterKind, string> {
  return {
    render: t('flux.debugger.renderEvents'),
    action: t('flux.debugger.actionEvents'),
    api: t('flux.debugger.apiEvents'),
    compile: t('flux.debugger.latestCompile'),
    notify: t('flux.common.more'),
    error: t('flux.debugger.error'),
    node: t('flux.debugger.node'),
  };
}

function getTabLabels(): Record<NopDebuggerTab, string> {
  return {
    overview: t('flux.debugger.tabOverview'),
    timeline: t('flux.debugger.tabTimeline'),
    network: t('flux.debugger.tabNetwork'),
    node: t('flux.debugger.tabNode'),
  };
}

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

function matchesRegex(event: import('./types.js').NopDebugEvent, regex: RegExp): boolean {
  return [
    event.summary,
    event.detail,
    event.source,
    event.nodeId,
    event.path,
    event.requestKey,
  ].some((value) => value != null && regex.test(value));
}

function matchesSearchQuery(event: import('./types.js').NopDebugEvent, rawQuery: string): boolean {
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
  const filterLabels = getFilterLabels();
  const tabLabels = getTabLabels();
  const chrome = useDebuggerSnapshot(
    props.controller,
    (snapshot) => ({
      enabled: snapshot.enabled,
      panelOpen: snapshot.panelOpen,
      minimized: snapshot.minimized,
      paused: snapshot.paused,
      strictMode: snapshot.strictMode,
      activeTab: snapshot.activeTab,
      position: snapshot.position,
    }),
    equalChromeState,
  );
  const events = useDebuggerSnapshot(props.controller, (snapshot) => snapshot.events);
  const filters = useDebuggerSnapshot(
    props.controller,
    (snapshot) => snapshot.filters,
    equalFilters,
  );
  const handlePanelTap = chrome.minimized ? () => props.controller.unminimize() : undefined;
  const { position, bind: dragBind } = useDraggablePosition(
    props.controller,
    chrome.position,
    handlePanelTap,
  );
  const { width: panelWidth, bind: resizeBind } = useResizablePanel();
  const {
    position: launcherPosition,
    bind: launcherBind,
    wasDraggedRef,
    consumeSuppressedClick,
  } = useLauncherDrag(props.controller, chrome.position);
  useInjectDebuggerStyles(chrome.enabled);

  const [searchHistory, setSearchHistory] = useState<string[]>(() =>
    loadPersistedSearchHistory(props.controller.id),
  );
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
    inspectTreeItem,
    componentTree,
    scanComponentTree,
  } = useInspectMode({
    controller: props.controller,
    activeTab: chrome.activeTab,
    setNodeIdInput,
    setFormTab,
    setEvalResult,
  });

  const handleEvalExpression = () => {
    if (!evalInput.trim() || !inspectData) return;
    const evaluated = props.controller.evaluateNodeExpression({
      cid: inspectData.cid,
      expression: evalInput.trim(),
    });
    setEvalResult(
      evaluated.ok ? JSON.stringify(evaluated.value, null, 2) : `Error: ${evaluated.error}`,
    );
  };

  const filteredEvents = events.filter((event) => filters.includes(event.group));

  const searchedEvents = (() => {
    if (!deferredSearchText.trim()) return filteredEvents;
    return filteredEvents.filter((event) => matchesSearchQuery(event, deferredSearchText));
  })();

  const networkEvents = filteredEvents.filter((event) => event.group === 'api');

  const mergedRequests = mergeNetworkRequests(networkEvents);

  const errorGroups = groupErrors(events);

  const overview = buildOverview(events);
  const latestTrace = (() => {
    void events;
    return props.controller.createDiagnosticReport({
      eventLimit: 20,
      includeLatestInteractionTrace: true,
    }).latestInteractionTrace;
  })();
  const latestTraceSummary = formatTraceSummary(latestTrace);

  const nodeDiagnostics = (() => {
    if (!nodeIdInput.trim()) return null;
    return props.controller.getNodeDiagnostics({ nodeId: nodeIdInput.trim() });
  })();

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

  if (!chrome.enabled) {
    return null;
  }

  if (!chrome.panelOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="nop-debugger-launcher nop-theme-root"
        style={{ left: `${launcherPosition.x}px`, top: `${launcherPosition.y}px` }}
        onPointerDown={launcherBind.onPointerDown}
        title={t('flux.debugger.openDebugger')}
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
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
          {errorCount > 0
            ? t('flux.debugger.launcherErrorCount', { count: errorCount })
            : t('flux.debugger.launcherEventCount', { count: events.length })}
        </span>
        {errorCount > 0 ? <span className="ndbg-launcher-badge">{badgeDisplay}</span> : null}
      </Button>
    );
  }

  if (chrome.minimized) {
    return (
      <div
        className="nop-debugger nop-theme-root ndbg-minimized"
        data-panel-state="minimized"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        {...dragBind}
      >
        <span className="ndbg-launcher-icon">
          <Bug size={14} />
        </span>
        {errorCount > 0 ? (
          <span className="ndbg-minimized-error-badge">{badgeDisplay}</span>
        ) : (
           <span className="ndbg-minimized-badge">{events.length}</span>
        )}
      </div>
    );
  }

  const activeTimelineEvents = errorsOnly
    ? searchedEvents.filter(
        (e) => e.group === 'error' || e.level === 'error' || e.level === 'warning',
      )
    : searchedEvents;

  return (
    <div
      className="nop-debugger nop-theme-root"
      style={{ left: `${position.x}px`, top: `${position.y}px`, width: `${panelWidth}px` }}
    >
      <div className="ndbg-resize-handle" {...resizeBind} />
      <div className="ndbg-header">
        <div className="ndbg-drag-handle" {...dragBind}>
          <p className="ndbg-eyebrow">{t('flux.debugger.title')}</p>
          <h2>{t('flux.debugger.console')}</h2>
        </div>
        <div className="ndbg-header-actions">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="ndbg-icon-button"
            data-testid="ndbg-pause"
            onClick={() => (chrome.paused ? props.controller.resume() : props.controller.pause())}
            data-tooltip={chrome.paused ? t('flux.debugger.resume') : t('flux.debugger.pause')}
            aria-label={chrome.paused ? t('flux.debugger.resume') : t('flux.debugger.pause')}
          >
            {chrome.paused ? <Play size={14} /> : <Pause size={14} />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="ndbg-icon-button"
            data-testid="ndbg-clear"
            onClick={() => props.controller.clear()}
            data-tooltip={t('flux.debugger.clear')}
            aria-label={t('flux.debugger.clear')}
          >
            <Trash2 size={14} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="ndbg-icon-button"
            data-testid="ndbg-pick-element"
            onClick={() => {
              if (!chrome.panelOpen) {
                props.controller.show();
              }
              setInspectMode(!inspectMode);
            }}
            data-tooltip={inspectMode ? t('flux.debugger.cancelPick') : t('flux.debugger.pickElement')}
            data-active={inspectMode ? '' : undefined}
            aria-label={inspectMode ? t('flux.debugger.cancelPick') : t('flux.debugger.pickElement')}
          >
            <Crosshair size={14} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="ndbg-icon-button"
            data-testid="ndbg-minimize"
            onClick={() => props.controller.minimize()}
            data-tooltip={t('flux.debugger.minimize')}
            aria-label={t('flux.debugger.minimize')}
          >
            <Minimize2 size={14} />
          </Button>
        </div>
      </div>

      <Tabs
        value={chrome.activeTab}
        onValueChange={(value) => props.controller.setActiveTab(value as NopDebuggerTab)}
        className="gap-0"
      >
        <TabsList className="ndbg-tabs h-auto w-full justify-start rounded-none bg-transparent p-0" aria-label={t('flux.debugger.tabsLabel')}>
          {(['overview', 'timeline', 'network', 'node'] as NopDebuggerTab[]).map((tab) => (
            <TabsTrigger key={tab} value={tab} className="ndbg-tab rounded-none px-3 py-2 data-[active]:bg-transparent">
              {tabLabels[tab]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            overview={overview}
            paused={chrome.paused}
            strictMode={chrome.strictMode}
            latestTrace={latestTrace}
            latestTraceSummary={latestTraceSummary}
          />
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineTab
            filters={filters}
            searchText={searchText}
            setSearchText={handleSearchTextChange}
            submitSearch={handleSearchSubmit}
            searchHistory={searchHistory}
            applySearchHistory={handleSearchHistorySelect}
            errorsOnly={errorsOnly}
            toggleErrorsOnly={toggleErrorsOnly}
            filterLabels={filterLabels}
            toggleFilter={(filter) => props.controller.toggleFilter(filter)}
            errorGroups={errorGroups}
            errorGroupExpanded={errorGroupExpanded}
            setErrorGroupExpanded={setErrorGroupExpanded}
            activeTimelineEvents={activeTimelineEvents}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
          />
        </TabsContent>

        <TabsContent value="network">
          <NetworkTab
            mergedRequests={mergedRequests}
            networkExpandedKey={networkExpandedKey}
            setNetworkExpandedKey={setNetworkExpandedKey}
          />
        </TabsContent>

        <TabsContent value="node">
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
            inspectTreeItem={inspectTreeItem}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
