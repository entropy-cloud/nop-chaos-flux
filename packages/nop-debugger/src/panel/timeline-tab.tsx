import { DEFAULT_FILTERS } from '../diagnostics';
import type { NopDebugEvent, NopDebuggerFilterKind, NopDebuggerSnapshot } from '../types';
import type { ErrorGroup } from './event-groups';
import { JsonViewer } from './json-viewer';

function formatClock(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function TimelineTab(props: {
  snapshot: NopDebuggerSnapshot;
  searchText: string;
  setSearchText(value: string): void;
  errorsOnly: boolean;
  toggleErrorsOnly(): void;
  filterLabels: Record<NopDebuggerFilterKind, string>;
  toggleFilter(filter: NopDebuggerFilterKind): void;
  errorGroups: ErrorGroup[];
  errorGroupExpanded: string | null;
  setErrorGroupExpanded(value: string | null): void;
  activeTimelineEvents: NopDebugEvent[];
  expandedId: number | null;
  setExpandedId(value: number | null): void;
}) {
  const { snapshot, searchText, setSearchText, errorsOnly, toggleErrorsOnly, filterLabels, toggleFilter, errorGroups, errorGroupExpanded, setErrorGroupExpanded, activeTimelineEvents, expandedId, setExpandedId } = props;
  return (
    <>
      <input type="search" className="ndbg-search" placeholder="Search events..." value={searchText} onChange={(event) => setSearchText(event.target.value)} />
      <div className="ndbg-filters">
        <button type="button" className={`ndbg-filter ${errorsOnly ? 'ndbg-errors-only-toggle' : ''}`} data-active={errorsOnly ? '' : undefined} onClick={toggleErrorsOnly}>
          Errors Only
        </button>
        {!errorsOnly && DEFAULT_FILTERS.map((filter) => {
          const active = snapshot.filters.includes(filter);
          return (
            <button key={filter} type="button" className="ndbg-filter" data-active={active ? '' : undefined} onClick={() => toggleFilter(filter)}>
              {filterLabels[filter]}
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
                <strong className="ndbg-entry-summary">{event.summary}{isSlowRender ? ' ⚠️ ' : ''}</strong>
                <span className="ndbg-entry-meta">{event.source}</span>
                {expandedId === event.id ? (
                  <div className="ndbg-entry-expanded" onClick={(clickEvent) => clickEvent.stopPropagation()}>
                    {event.detail ? <code className="ndbg-entry-detail">{event.detail}</code> : null}
                    {event.network ? <div><span className="ndbg-json-key">Network: </span><JsonViewer data={event.network} defaultExpanded={2} /></div> : null}
                    {event.exportedData != null ? <div><span className="ndbg-json-key">Data: </span><JsonViewer data={event.exportedData} defaultExpanded={2} /></div> : null}
                    {!event.detail && !event.network && event.exportedData == null ? <span className="ndbg-empty">No detailed data available.</span> : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
