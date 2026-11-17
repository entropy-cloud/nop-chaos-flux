import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { Button, Input } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { DEFAULT_FILTERS } from '../diagnostics.js';
import type { NopDebugEvent, NopDebuggerFilterKind } from '../types.js';
import { DisclosureTrigger } from './disclosure-trigger.js';
import { formatClock } from './format.js';
import type { ErrorGroup } from './event-groups.js';
import { JsonViewer } from './json-viewer.js';
import { diffForestSnapshots, type ForestSnapshot, type ForestSnapshotPathChange } from '../snapshot-repository.js';

export interface TimelinePreviewApi {
  getSnapshotEpochs(): number[];
  getSnapshotAt(epoch: number): unknown | null;
  enterPreview(epoch: number): boolean;
  leavePreview(): void;
  setPreviewPinned(pin: boolean): void;
  isPreviewActive(): boolean;
}

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

export function TimelineTab(props: {
  filters: NopDebuggerFilterKind[];
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
  previewApi?: TimelinePreviewApi;
}) {
  const {
    filters,
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
    previewApi,
  } = props;
  const [previewEpoch, setPreviewEpoch] = useState<number | null>(null);
  const [previewPinned, setPreviewPinned] = useState(false);
  const [previewChanges, setPreviewChanges] = useState<ForestSnapshotPathChange[]>([]);

  const enterPreviewAt = (epoch: number) => {
    if (!previewApi) return;
    if (!previewApi.enterPreview(epoch)) return;
    setPreviewEpoch(epoch);
    const epochs = previewApi.getSnapshotEpochs();
    const index = epochs.indexOf(epoch);
    const prev = index > 0 ? (previewApi.getSnapshotAt(epochs[index - 1]!) as ForestSnapshot | null) : null;
    const current = previewApi.getSnapshotAt(epoch) as ForestSnapshot | null;
    setPreviewChanges(current ? diffForestSnapshots(prev ?? null, current) : []);
  };
  const exitPreview = () => {
    previewApi?.leavePreview();
    setPreviewEpoch(null);
    setPreviewChanges([]);
  };
  const togglePreviewPin = () => {
    const next = !previewPinned;
    setPreviewPinned(next);
    previewApi?.setPreviewPinned(next);
  };
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

  // P1-MA5.1-004 (plan 740): resetKey must NOT include event count — new
  // timeline events arriving during playback would force scrollTop to 0,
  // making history review impossible. Only reset on filter/search changes.
  const resetKey = `${errorsOnly ? 'errors' : 'all'}:${searchText}:${filters.join(',')}`;

  useEffect(() => {
    if (virtualListRef.current) {
      virtualListRef.current.scrollTop = 0;
    }
  }, [resetKey]);

  const virtualWindow = (() => {
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
  })();

  const renderEventEntry = (event: NopDebugEvent) => {
    const isSlowRender =
      event.kind === 'render:end' && event.durationMs != null && event.durationMs > 16;
    const expanded = expandedId === event.id;
    const detailId = `ndbg-timeline-detail-${event.id}`;

    return (
      <article key={event.id} className="ndbg-entry">
        <DisclosureTrigger
          expanded={expanded}
          controlsId={detailId}
          onToggle={() => setExpandedId(expanded ? null : event.id)}
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
        </DisclosureTrigger>
        {expanded ? (
          <div id={detailId} className="ndbg-entry-expanded">
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
      {previewApi && (
        <section className="ndbg-preview-scrub" data-testid="ndbg-timeline-scrub">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-white/40 font-bold">
            <span>{t('flux.debugger.timeTravel')}</span>
            <span data-testid="ndbg-preview-state">
              {previewEpoch !== null ? `epoch ${previewEpoch}` : 'live'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <input
              type="range"
              data-testid="ndbg-preview-range"
              min={0}
              max={Math.max(0, previewApi.getSnapshotEpochs().length - 1)}
              value={previewEpoch !== null ? previewApi.getSnapshotEpochs().indexOf(previewEpoch) : 0}
              onChange={(event) => {
                const epochs = previewApi.getSnapshotEpochs();
                const epoch = epochs[Number(event.target.value)];
                if (epoch !== undefined) enterPreviewAt(epoch);
              }}
            />
            <Button variant="ghost" size="sm" data-testid="ndbg-preview-pin" onClick={togglePreviewPin}>
              {previewPinned ? t('flux.debugger.pinned') : t('flux.debugger.pin')}
            </Button>
            {previewEpoch !== null && (
              <Button variant="ghost" size="sm" data-testid="ndbg-preview-exit" onClick={exitPreview}>
                {t('flux.debugger.exitPreview')}
              </Button>
            )}
          </div>
          {previewChanges.length > 0 && (
            <ul className="mt-1.5 text-[11px] font-mono text-white/60 max-h-28 overflow-auto" data-testid="ndbg-snapshot-diff">
              {previewChanges.slice(0, 50).map((change) => (
                <li key={`${change.scopeId}:${change.path}:${change.kind}`}>
                  {change.kind} {change.scopeId}.{change.path}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <Input
        type="search"
        className="ndbg-search"
        placeholder={t('flux.debugger.searchPlaceholder')}
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
            const active = filters.includes(filter);
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
              <DisclosureTrigger
                expanded={errorGroupExpanded === group.source}
                controlsId={`ndbg-error-group-${group.events[0]?.id ?? group.source}`}
                onToggle={() =>
                  setErrorGroupExpanded(errorGroupExpanded === group.source ? null : group.source)
                }
                className="gap-0"
              >
                <strong className="ndbg-entry-summary">
                  {group.source} ({group.count})
                </strong>
              </DisclosureTrigger>
              {errorGroupExpanded === group.source ? (
                <div
                  id={`ndbg-error-group-${group.events[0]?.id ?? group.source}`}
                  className="ndbg-entry-expanded"
                >
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
