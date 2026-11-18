import { useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Button, Input, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { NopComponentInspectResult, NopComponentTreeItem, NopNodeDiagnostics } from '../types.js';
import { DisclosureTrigger } from './disclosure-trigger.js';
import { formatClock } from './format.js';
import { JsonViewer } from './json-viewer.js';

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
  whyApi?: {
    why(cid: number): Promise<{ verdict: string; confidence: string; parts: Array<{ category: string; verdict: string }>; evidence: Array<{ type: string; target: string; label: string }>; screenshotTag?: string }>;
    suggestSelector(cid: string): Promise<{ selector: string; tier: string; unique: boolean } | null>;
    getSnapshotAt?(epoch: number): unknown | null;
    inspectByCid?(cid: number): unknown;
  };
}) {
  const {
    whyApi,
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
  const [whyReport, setWhyReport] = useState<string | null>(null);
  const [whyBusy, setWhyBusy] = useState(false);
  const [selectorSuggestion, setSelectorSuggestion] = useState<string | null>(null);
  const [whyCidInput, setWhyCidInput] = useState('');
  const [whyEvidenceLinks, setWhyEvidenceLinks] = useState<Array<{ type: string; target: string; label: string }>>([]);

  const [whyEvidenceResolved, setWhyEvidenceResolved] = useState<string | null>(null);

  const followEvidenceLink = async (link: { type: string; target: string }) => {
    if (!whyApi) return;
    if (link.type === 'epoch' && whyApi.getSnapshotAt) {
      const snapshot = whyApi.getSnapshotAt(Number(link.target));
      setWhyEvidenceResolved(`epoch ${link.target}: ${snapshot ? '快照存在' : '快照不存在'}`);
      return;
    }
    if (link.type === 'cid' && whyApi.inspectByCid) {
      const inspect = whyApi.inspectByCid(Number(link.target));
      setWhyEvidenceResolved(`cid ${link.target}: ${inspect ? '节点可检视' : '节点不可检视'}`);
      return;
    }
    setWhyEvidenceResolved(`${link.type}: ${link.target}（表达式，可用 Evaluate 面板求值）`);
  };

  const runWhy = async (cid: number) => {
    if (!whyApi) return;
    setWhyBusy(true);
    try {
      const report = await whyApi.why(cid);
      const lines = [`verdict: ${report.verdict} (${report.confidence})`];
      for (const part of report.parts) lines.push(`${part.category}: ${part.verdict}`);
      if (report.screenshotTag) lines.push(`screenshot: ${report.screenshotTag}`);
      setWhyReport(lines.join('\n'));
      setWhyEvidenceLinks(report.evidence);
    } catch (error) {
      setWhyReport(`why failed cause: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setWhyBusy(false);
    }
  };

  const runSelector = async (cid: number) => {
    if (!whyApi) return;
    try {
      const suggestion = await whyApi.suggestSelector(String(cid));
      setSelectorSuggestion(suggestion ? `${suggestion.tier}: ${suggestion.selector}${suggestion.unique ? '' : ' (非唯一)'}` : '未找到节点');
    } catch (error) {
      setSelectorSuggestion(`selector failed cause: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

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
                     'h-auto w-full justify-start whitespace-normal px-2 py-1',
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
      {whyApi && (
        <section className="ndbg-why" data-testid="ndbg-why-section">
          <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-white/40 font-bold">
            {t('flux.debugger.whySection')}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Input
              size="sm"
              placeholder={t('flux.debugger.whyCidPlaceholder')}
              className="ndbg-why-cid-input w-24"
              value={whyCidInput}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setWhyCidInput(event.target.value)}
              data-testid="ndbg-why-cid-input"
            />
            <Button variant="ghost" size="sm" data-testid="ndbg-why-run" onClick={() => runWhy(Number(whyCidInput))} disabled={whyBusy || !whyCidInput}>
              {whyBusy ? '…' : t('flux.debugger.whyRun')}
            </Button>
            <Button variant="ghost" size="sm" data-testid="ndbg-selector-run" onClick={() => runSelector(Number(whyCidInput))} disabled={!whyCidInput}>
              {t('flux.debugger.whySelector')}
            </Button>
          </div>
          {whyReport && (
            <pre className="mt-2 p-2 rounded-[8px] bg-black/30 text-[11px] font-mono text-white/70 whitespace-pre-wrap" data-testid="ndbg-why-report">
              {whyReport}
            </pre>
          )}
          {whyEvidenceLinks.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5" data-testid="ndbg-why-evidence">
              {whyEvidenceLinks.map((link) => (
                <Button
                  key={`${link.type}:${link.target}`}
                  variant="ghost"
                  size="sm"
                  onClick={() => void followEvidenceLink(link)}
                >
                  {link.label} ({link.type}:{link.target})
                </Button>
              ))}
            </div>
          )}
          {whyEvidenceResolved && (
            <div className="mt-1 text-[11px] font-mono text-white/50" data-testid="ndbg-why-evidence-resolved">
              {whyEvidenceResolved}
            </div>
          )}
          {selectorSuggestion && (
            <pre className="mt-1 p-2 rounded-[8px] bg-black/30 text-[11px] font-mono text-white/70" data-testid="ndbg-selector-suggestion">
              {selectorSuggestion}
            </pre>
          )}
        </section>
      )}
    </>
  );
}
