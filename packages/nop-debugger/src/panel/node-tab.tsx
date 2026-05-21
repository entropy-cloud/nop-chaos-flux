import type { ChangeEvent, KeyboardEvent } from 'react';
import { Button, Input, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { NopComponentInspectResult, NopComponentTreeItem, NopNodeDiagnostics } from '../types.js';
import { DisclosureTrigger } from './disclosure-trigger.js';
import { JsonViewer } from './json-viewer.js';

function formatClock(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function NodeTab(props: {
  componentTree: NopComponentTreeItem[];
  scanComponentTree(): void;
  inspectMode: boolean;
  inspectData: NopComponentInspectResult | null;
  selectedElement: HTMLElement | null;
  setSelectedElement(value: HTMLElement | null): void;
  inspectTreeItem(item: NopComponentTreeItem): void;
  nodeIdInput: string;
  onNodeIdInputChange(value: string): void;
  nodeDiagnostics: NopNodeDiagnostics | null;
  expandedId: number | null;
  setExpandedId(value: number | null): void;
  formTab: 'values' | 'errors' | 'meta';
  setFormTab(value: 'values' | 'errors' | 'meta'): void;
  evalInput: string;
  setEvalInput(value: string): void;
  evalResult: string | null;
  handleEvalExpression(): void;
}) {
  const {
    componentTree,
    scanComponentTree,
    inspectMode,
    inspectData,
    selectedElement,
    setSelectedElement,
    inspectTreeItem,
    nodeIdInput,
    onNodeIdInputChange,
    nodeDiagnostics,
    expandedId,
    setExpandedId,
    formTab,
    setFormTab,
    evalInput,
    setEvalInput,
    evalResult,
    handleEvalExpression,
  } = props;
  const formTabLabels = {
    values: t('flux.debugger.formTabValues'),
    errors: t('flux.debugger.formTabErrors'),
    meta: t('flux.debugger.formTabMeta'),
  } as const;

  return (
    <>
      <div className="ndbg-tree-section">
        <div className="ndbg-row ndbg-row--between ndbg-row--center">
          <span className="ndbg-metric-label">
            {t('flux.debugger.components')} ({componentTree.length})
          </span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="ndbg-inline-button"
            onClick={scanComponentTree}
          >
            {t('flux.debugger.scan')}
          </Button>
        </div>
        {inspectMode ? (
          <div className="ndbg-inspect-hint">{t('flux.debugger.inspectHint')}</div>
        ) : null}
        {inspectData ? (
          <div className="ndbg-inspect-panel">
            <article className="ndbg-metric-card">
              <div className="ndbg-inspect-header">
                <span className="ndbg-metric-label">{t('flux.debugger.componentInspector')}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="ndbg-icon-button ndbg-close-button"
                  onClick={() => setSelectedElement(null)}
                  aria-label={t('flux.debugger.clearSelectedElement')}
                >
                  ✕
                </Button>
              </div>
              <div className="ndbg-row ndbg-row--center">
                <strong>#{inspectData.cid}</strong>
                {inspectData.tagName ? (
                  <span className="ndbg-inspect-tag">&lt;{inspectData.tagName}&gt;</span>
                ) : null}
                {inspectData.handleType ? (
                  <span className="ndbg-badge" data-group="node">
                    {inspectData.handleType}
                  </span>
                ) : null}
              </div>
              <div className="ndbg-inspect-meta">
                {inspectData.handleName ? (
                  <span>
                    {t('flux.debugger.name')}
                    {inspectData.handleName}
                  </span>
                ) : null}
                {inspectData.handleId ? (
                  <span>
                    {t('flux.debugger.id')}
                    {inspectData.handleId}
                  </span>
                ) : null}
                {inspectData.className ? (
                  <span>
                    {t('flux.debugger.class')}
                    {inspectData.className.slice(0, 60)}
                    {inspectData.className.length > 60 ? '…' : ''}
                  </span>
                ) : null}
                <span>
                  {t('flux.debugger.mountedState', {
                    indicator: inspectData.mounted ? '●' : '○',
                    state: inspectData.mounted
                      ? t('flux.debugger.mounted')
                      : t('flux.debugger.unmounted'),
                  })}
                </span>
              </div>
            </article>

            {inspectData.formState ? (
              <div className="ndbg-inspect-section">
                <span className="ndbg-inspect-section-title">{t('flux.debugger.formState')}</span>
                <div className="ndbg-row ndbg-row--tight">
                  {(['values', 'errors', 'meta'] as const).map((tab) => (
                    <Button
                      key={tab}
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="ndbg-form-tab"
                      data-active={formTab === tab ? '' : undefined}
                      onClick={() => setFormTab(tab)}
                    >
                      {formTabLabels[tab]}
                    </Button>
                  ))}
                </div>
                <JsonViewer
                  data={
                    formTab === 'values'
                      ? inspectData.formState.values
                      : formTab === 'errors'
                        ? inspectData.formState.errors
                        : {
                            touched: inspectData.formState.touched,
                            dirty: inspectData.formState.dirty,
                            visited: inspectData.formState.visited,
                            submitting: inspectData.formState.submitting,
                          }
                  }
                  defaultExpanded={2}
                />
              </div>
            ) : null}

            {inspectData.scopeData ? (
              <div className="ndbg-inspect-section">
                <span className="ndbg-inspect-section-title">{t('flux.debugger.scopeData')}</span>
                <JsonViewer data={inspectData.scopeData} defaultExpanded={2} />
              </div>
            ) : null}

            {inspectData.scopeChain?.length ? (
              <div className="ndbg-inspect-section">
                <span className="ndbg-inspect-section-title">{t('flux.debugger.scopeChain')}</span>
                <JsonViewer data={inspectData.scopeChain} defaultExpanded={3} />
              </div>
            ) : null}

            {inspectData.metaSummary ? (
              <div className="ndbg-inspect-section">
                <span className="ndbg-inspect-section-title">{t('flux.debugger.metaSummary')}</span>
                <JsonViewer data={inspectData.metaSummary} defaultExpanded={2} />
              </div>
            ) : null}

            {inspectData.propsSummary ? (
              <div className="ndbg-inspect-section">
                <span className="ndbg-inspect-section-title">
                  {t('flux.debugger.propsSummary')}
                </span>
                <JsonViewer data={inspectData.propsSummary} defaultExpanded={2} />
              </div>
            ) : null}

            {inspectData.availableMethods?.length ? (
              <div className="ndbg-inspect-section">
                <span className="ndbg-inspect-section-title">
                  {t('flux.debugger.availableMethods')}
                </span>
                <JsonViewer data={inspectData.availableMethods} defaultExpanded={1} />
              </div>
            ) : null}
          </div>
        ) : selectedElement ? (
          <article className="ndbg-metric-card ndbg-metric-card--spaced">
            <div className="ndbg-row ndbg-row--between ndbg-row--center">
              <span className="ndbg-metric-label">{t('flux.debugger.selectedElement')}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="ndbg-icon-button ndbg-close-button"
                onClick={() => setSelectedElement(null)}
                aria-label={t('flux.debugger.clearSelectedElement')}
              >
                ✕
              </Button>
            </div>
            <strong>
              {t('flux.debugger.dataCid')}
              {selectedElement.getAttribute('data-cid')}
            </strong>
            <span>{selectedElement.tagName.toLowerCase()}</span>
          </article>
        ) : null}
        {componentTree.length > 0 ? (
          <div className="ndbg-component-tree">
            {componentTree.map((item) => {
              const isSelected =
                inspectData?.cid === item.cid ||
                selectedElement?.getAttribute('data-cid') === String(item.cid);
              const itemClassName = ['ndbg-tree-item', isSelected ? 'selected' : null]
                .filter(Boolean)
                .join(' ');

                return (
                 <Button
                   key={item.cid}
                   variant="ghost"
                   className={cn(
                     itemClassName,
                     'h-auto w-full justify-start whitespace-normal px-2 py-1 active:translate-y-0',
                   )}
                   onClick={() => inspectTreeItem(item)}
                   style={{ paddingLeft: `${item.depth * 16 + 8}px` }}
                 >
                   <span className="ndbg-tree-item-id">
                     #{item.cid}
                   </span>{' '}
                   <span className="ndbg-tree-item-label">
                     {item.label || t('flux.debugger.element')}
                   </span>
                 </Button>
               );
             })}
          </div>
        ) : (
          <p className="ndbg-empty">{t('flux.debugger.clickScanHint')}</p>
        )}
      </div>
      <Input
        type="text"
        className="ndbg-node-input"
        placeholder={t('flux.debugger.nodeIdPlaceholder')}
        size="sm"
        value={nodeIdInput}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onNodeIdInputChange(e.target.value)}
      />
      {nodeDiagnostics && nodeIdInput.trim() ? (
        <div className="ndbg-list">
          <article className="ndbg-entry">
            <div className="ndbg-entry-topline">
              <span className="ndbg-badge" data-group="node">
                {t('flux.debugger.node')}
              </span>
              <span className="ndbg-entry-meta">{nodeDiagnostics.nodeId ?? 'n/a'}</span>
            </div>
            <strong className="ndbg-entry-summary">
              {nodeDiagnostics.rendererTypes.length > 0
                ? nodeDiagnostics.rendererTypes.join(', ')
                : t('flux.debugger.unknownType')}
            </strong>
            <span className="ndbg-entry-meta">
              {t('flux.debugger.nodeEventsSummary', {
                path: nodeDiagnostics.path ?? t('flux.debugger.noPath'),
                count: nodeDiagnostics.totalEvents,
              })}
            </span>
          </article>
          {nodeDiagnostics.totalEvents === 0 ? (
            <p className="ndbg-empty">{t('flux.debugger.noEventsForNode')}</p>
          ) : (
            <>
              <div className="ndbg-overview">
                <article className="ndbg-metric-card">
                  <span className="ndbg-metric-label">
                    {t('flux.debugger.renderCommitHints')}
                  </span>
                  <strong>{nodeDiagnostics.renderCommitCount}</strong>
                  <span>
                    {t('flux.debugger.renderBurstHints', {
                      burstCount: nodeDiagnostics.renderBurstCount,
                    })}
                  </span>
                </article>
                <article className="ndbg-metric-card">
                  <span className="ndbg-metric-label">{t('flux.debugger.actionEvents')}</span>
                  <strong>{nodeDiagnostics.countsByGroup.action ?? 0}</strong>
                </article>
                <article className="ndbg-metric-card">
                  <span className="ndbg-metric-label">{t('flux.debugger.apiEvents')}</span>
                  <strong>{nodeDiagnostics.countsByGroup.api ?? 0}</strong>
                </article>
                <article className="ndbg-metric-card" data-error="">
                  <span className="ndbg-metric-label">{t('flux.debugger.errors')}</span>
                  <strong>{nodeDiagnostics.countsByGroup.error ?? 0}</strong>
                </article>
                {(() => {
                  const renderEndEvents = nodeDiagnostics.recentEvents.filter(
                    (e) => e.kind === 'render:end' && e.durationMs != null,
                  );
                  if (renderEndEvents.length === 0) return null;
                  const slowest = Math.max(...renderEndEvents.map((e) => e.durationMs!));
                  const avg =
                    renderEndEvents.reduce((sum, e) => sum + e.durationMs!, 0) /
                    renderEndEvents.length;
                  return (
                    <article className="ndbg-metric-card" data-slow="">
                      <span className="ndbg-metric-label">
                        {t('flux.debugger.renderPerformance')}
                      </span>
                      <strong>{t('flux.debugger.slowest', { ms: slowest })}</strong>
                      <span>
                        {t('flux.debugger.average', {
                          avg: avg.toFixed(1),
                          count: renderEndEvents.length,
                        })}
                      </span>
                    </article>
                  );
                })()}
              </div>
                {nodeDiagnostics.recentEvents.map((event) => {
                  const expanded = expandedId === event.id;
                  const detailId = `ndbg-node-event-detail-${event.id}`;

                  return (
                    <article key={event.id} className="ndbg-entry">
                      <DisclosureTrigger
                        expanded={expanded}
                        controlsId={detailId}
                        onToggle={() => setExpandedId(expanded ? null : event.id)}
                      >
                        <div className="ndbg-entry-topline">
                          <span className="ndbg-badge" data-group={event.group}>
                            {event.kind}
                          </span>
                          <time>{formatClock(event.timestamp)}</time>
                        </div>
                        <strong className="ndbg-entry-summary">{event.summary}</strong>
                        {event.durationMs != null ? (
                          <span className="ndbg-entry-meta">{event.durationMs}ms</span>
                        ) : null}
                      </DisclosureTrigger>
                      {expanded ? (
                        <div id={detailId} className="ndbg-entry-expanded">
                          {event.detail ? (
                            <code className="ndbg-entry-detail">{event.detail}</code>
                          ) : null}
                          {event.exportedData != null ? (
                            <JsonViewer data={event.exportedData} defaultExpanded={2} />
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
            </>
          )}
        </div>
      ) : (
        <p className="ndbg-empty">{t('flux.debugger.enterNodeId')}</p>
      )}
      {inspectData ? (
        <div className="ndbg-inspect-section">
          <span className="ndbg-inspect-section-title">
            {t('flux.debugger.expressionEvaluator')}
          </span>
          <Input
            type="text"
            className="ndbg-eval-input"
            placeholder={t('flux.debugger.expressionPlaceholder')}
            size="sm"
            value={evalInput}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEvalInput(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') handleEvalExpression();
            }}
          />
          {evalResult !== null ? <div className="ndbg-eval-result">{evalResult}</div> : null}
        </div>
      ) : null}
    </>
  );
}
