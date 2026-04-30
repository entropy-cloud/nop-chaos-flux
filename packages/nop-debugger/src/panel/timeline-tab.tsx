import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { Button, Input } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { DEFAULT_FILTERS } from '../diagnostics';
import type { NopDebugEvent, NopDebuggerFilterKind, NopDebuggerSnapshot } from '../types';
import type { ErrorGroup } from './event-groups';
import { JsonViewer } from './json-viewer';

const VIRTUALIZE_AFTER = 60;
const VIRTUAL_ROW_HEIGHT = 96;
const VIRTUAL_OVERSCAN = 4;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isPlainHighlightQuery(query: string) {
  const trimmed = query.trim();
  return Boolean(trimmed) && !trimmed.startsWith('path:') && !/^\/(.*)\/([a-z]*)$/.test(trimmed);
}

function renderHighlightedText(text: string, query: string) {
  if (!isPlainHighlightQuery(query)) {
    return text;
  }

  const trimmed = query.trim();
  const regex = new RegExp(`(${escapeRegex(trimmed)})`, 'ig');
  const parts = text.split(regex);
  let searchFrom = 0;

  return parts.map((part) => {
    const start = text.indexOf(part, searchFrom);
    searchFrom = start >= 0 ? start + part.length : searchFrom;
    const partKey = `${trimmed}:${start}:${part.length}`;

    return part.toLowerCase() === trimmed.toLowerCase() ? (
      <mark key={partKey} className="ndbg-highlight">
        {part}
      </mark>
    ) : (
      <span key={partKey}>{part}</span>
    );
  });
}

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
  submitSearch(): void;
  searchHistory: string[];
  applySearchHistory(query: string): void;
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
  const {
    snapshot,
    searchText,
    setSearchText,
    submitSearch,
    searchHistory,
    applySearchHistory,
    errorsOnly,
    toggleErrorsOnly,
    filterLabels,
    toggleFilter,
    errorGroups,
    errorGroupExpanded,
    setErrorGroupExpanded,
    activeTimelineEvents,
    expandedId,
    setExpandedId,
  } = props;
  const virtualListRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(360);
  const virtualizationEnabled =
    !errorsOnly && expandedId == null && activeTimelineEvents.length > VIRTUALIZE_AFTER;

  useEffect(() => {
    if (!virtualizationEnabled) {
      return;
    }

    const element = virtualListRef.current;
    if (!element) {
      return;
    }

    const measure = () => {
      setViewportHeight(element.clientHeight || 360);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [virtualizationEnabled]);

  const resetKey = `${activeTimelineEvents.length}:${errorsOnly ? 'errors' : 'all'}:${searchText}:${snapshot.filters.join(',')}`;

  useEffect(() => {
    if (virtualListRef.current) {
      virtualListRef.current.scrollTop = 0;
    }
  }, [resetKey]);

  const virtualWindow = useMemo(() => {
    if (!virtualizationEnabled) {
      return null;
    }

    const startIndex = Math.max(0, Math.floor(scrollTop / VIRTUAL_ROW_HEIGHT) - VIRTUAL_OVERSCAN);
    const visibleCount = Math.ceil(viewportHeight / VIRTUAL_ROW_HEIGHT) + VIRTUAL_OVERSCAN * 2;
    const endIndex = Math.min(activeTimelineEvents.length, startIndex + visibleCount);

    return {
      startIndex,
      endIndex,
      offsetTop: startIndex * VIRTUAL_ROW_HEIGHT,
      totalHeight: activeTimelineEvents.length * VIRTUAL_ROW_HEIGHT,
      events: activeTimelineEvents.slice(startIndex, endIndex),
    };
  }, [activeTimelineEvents, scrollTop, viewportHeight, virtualizationEnabled]);

  const renderEventEntry = (event: NopDebugEvent) => {
    const isSlowRender =
      event.kind === 'render:end' && event.durationMs != null && event.durationMs > 16;
    return (
      <article
        key={event.id}
        className="ndbg-entry"
        onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
      >
        <div className="ndbg-entry-topline">
          <span
            className="ndbg-badge"
            data-group={event.group}
            data-slow={isSlowRender ? '' : undefined}
          >
            {event.group}
          </span>
          <time>{formatClock(event.timestamp)}</time>
        </div>
        <strong className="ndbg-entry-summary">
          {renderHighlightedText(event.summary, searchText)}
          {isSlowRender ? ' ⚠️ ' : ''}
        </strong>
        <span className="ndbg-entry-meta">{event.source}</span>
        {expandedId === event.id ? (
          <div
            className="ndbg-entry-expanded"
            onClick={(clickEvent) => clickEvent.stopPropagation()}
          >
            {event.detail ? <code className="ndbg-entry-detail">{event.detail}</code> : null}
            {event.network ? (
              <div>
                <span className="ndbg-json-key">{t('flux.debugger.network')}</span>
                <JsonViewer data={event.network} defaultExpanded={2} />
              </div>
            ) : null}
            {event.exportedData != null ? (
              <div>
                <span className="ndbg-json-key">{t('flux.debugger.data')}</span>
                <JsonViewer data={event.exportedData} defaultExpanded={2} />
              </div>
            ) : null}
            {!event.detail && !event.network && event.exportedData == null ? (
              <span className="ndbg-empty">{t('flux.debugger.noDetailedData')}</span>
            ) : null}
          </div>
        ) : null}
      </article>
    );
  };

  return (
    <>
      <Input
        type="search"
        className="ndbg-search"
        placeholder="Search events, /regex/, or path:body.0"
        size="sm"
        value={searchText}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchText(event.target.value)}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'Enter') {
            submitSearch();
          }
        }}
      />
      {searchHistory.length > 0 ? (
        <div className="ndbg-search-history">
          {searchHistory.map((query) => (
            <Button
              key={query}
              type="button"
              variant="ghost"
              size="sm"
              className="ndbg-filter"
              onClick={() => applySearchHistory(query)}
            >
              {query}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="ndbg-filters">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={['ndbg-filter', errorsOnly ? 'ndbg-errors-only-toggle' : null]
            .filter(Boolean)
            .join(' ')}
          data-active={errorsOnly ? '' : undefined}
          onClick={toggleErrorsOnly}
        >
          {t('flux.debugger.errorsOnly')}
        </Button>
        {!errorsOnly &&
          DEFAULT_FILTERS.map((filter) => {
            const active = snapshot.filters.includes(filter);
            return (
              <Button
                key={filter}
                type="button"
                variant="ghost"
                size="sm"
                className="ndbg-filter"
                data-active={active ? '' : undefined}
                onClick={() => toggleFilter(filter)}
              >
                {filterLabels[filter]}
              </Button>
            );
          })}
      </div>
      {errorsOnly ? (
        <div className="ndbg-list">
          {errorGroups.length === 0 ? (
            <p className="ndbg-empty">{t('flux.debugger.noErrors')}</p>
          ) : null}
          {errorGroups.map((group) => (
            <article key={group.source} className="ndbg-entry">
              <div className="ndbg-entry-topline">
                <span className="ndbg-badge" data-group="error">
                  {t('flux.debugger.error')}
                </span>
                <time>{formatClock(group.latestTimestamp)}</time>
              </div>
              <strong
                className="ndbg-entry-summary"
                onClick={() =>
                  setErrorGroupExpanded(errorGroupExpanded === group.source ? null : group.source)
                }
              >
                {group.source} ({group.count})
              </strong>
              {errorGroupExpanded === group.source ? (
                <div className="ndbg-entry-expanded">
                  {group.events.map((event) => (
                    <div key={event.id}>
                      <span className="ndbg-entry-meta">{formatClock(event.timestamp)}</span>
                      <strong>{event.summary}</strong>
                      {event.detail ? (
                        <code className="ndbg-entry-detail">{event.detail}</code>
                      ) : null}
                      {event.exportedData != null ? (
                        <JsonViewer data={event.exportedData} defaultExpanded={2} />
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : virtualizationEnabled && virtualWindow ? (
        <div
          ref={virtualListRef}
          className="ndbg-list ndbg-list--virtual"
          data-testid="ndbg-timeline-list"
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        >
          {activeTimelineEvents.length === 0 ? (
            <p className="ndbg-empty">{t('flux.debugger.noEventsMatch')}</p>
          ) : null}
          <div className="ndbg-virtual-spacer" style={{ height: `${virtualWindow.totalHeight}px` }}>
            <div
              className="ndbg-virtual-window"
              style={{ transform: `translateY(${virtualWindow.offsetTop}px)` }}
            >
              {virtualWindow.events.map(renderEventEntry)}
            </div>
          </div>
        </div>
      ) : (
        <div className="ndbg-list" data-testid="ndbg-timeline-list">
          {activeTimelineEvents.length === 0 ? (
            <p className="ndbg-empty">{t('flux.debugger.noEventsMatch')}</p>
          ) : null}
          {activeTimelineEvents.map(renderEventEntry)}
        </div>
      )}
    </>
  );
}
