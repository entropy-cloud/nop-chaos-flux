import { t } from '@nop-chaos/flux-i18n';
import type { NopDebuggerOverview, NopInteractionTrace } from '../types.js';

function formatClock(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function OverviewTab(props: {
  overview: NopDebuggerOverview;
  paused: boolean;
  strictMode: boolean;
  latestTrace?: NopInteractionTrace;
  latestTraceSummary: { headline: string; detail: string };
}) {
  const { overview, paused, strictMode, latestTrace, latestTraceSummary } = props;
  return (
    <div className="ndbg-overview">
      <article className="ndbg-metric-card">
        <span className="ndbg-metric-label">{t('flux.debugger.events')}</span>
        <strong>{overview.totalEvents}</strong>
        <span>{paused ? t('flux.debugger.streamPaused') : t('flux.debugger.streamLive')}</span>
      </article>
      <article className="ndbg-metric-card">
        <span className="ndbg-metric-label">{t('flux.debugger.latestCompile')}</span>
        <strong>
          {overview.latestCompile
            ? formatClock(overview.latestCompile.timestamp)
            : t('flux.debugger.notAvailable')}
        </strong>
        <span>{overview.latestCompile?.summary ?? t('flux.debugger.noCompileEventYet')}</span>
      </article>
      <article className="ndbg-metric-card">
        <span className="ndbg-metric-label">{t('flux.debugger.latestAction')}</span>
        <strong>
          {overview.latestAction
            ? formatClock(overview.latestAction.timestamp)
            : t('flux.debugger.notAvailable')}
        </strong>
        <span>{overview.latestAction?.summary ?? t('flux.debugger.noActionEventYet')}</span>
      </article>
      <article className="ndbg-metric-card">
        <span className="ndbg-metric-label">{t('flux.debugger.latestApi')}</span>
        <strong>
          {overview.latestApi
            ? formatClock(overview.latestApi.timestamp)
            : t('flux.debugger.notAvailable')}
        </strong>
        <span>{overview.latestApi?.summary ?? t('flux.debugger.noApiEventYet')}</span>
      </article>
      <article className="ndbg-metric-card" data-error="">
        <span className="ndbg-metric-label">{t('flux.debugger.errors')}</span>
        <strong>{overview.errorCount}</strong>
        <span>
          {overview.errorCount > 0
            ? t('flux.debugger.needsAttention')
            : t('flux.debugger.noErrorsRecorded')}
        </span>
      </article>
      <article className="ndbg-metric-card">
        <span className="ndbg-metric-label">{t('flux.debugger.latestTrace')}</span>
        <strong>{latestTrace ? latestTrace.totalEvents : 0}</strong>
        <span>{latestTraceSummary.headline}</span>
        <span className="ndbg-metric-label">{latestTraceSummary.detail}</span>
      </article>
      <article
        className="ndbg-metric-card"
        data-slow={
          overview.slowestRenderMs != null && overview.slowestRenderMs > 16 ? '' : undefined
        }
      >
        <span className="ndbg-metric-label">{t('flux.debugger.renderCommitHints')}</span>
        <strong>{overview.renderCommitCount}</strong>
        <span>
          {overview.slowestRenderMs != null
            ? t('flux.debugger.slowestRenderCommit', {
                ms: overview.slowestRenderMs,
                suffix: overview.slowestRenderMs > 16 ? t('flux.debugger.slowSuffix') : '',
              })
            : t('flux.debugger.noRenderCommitEvents')}
        </span>
        <span className="ndbg-metric-label">
          {t('flux.debugger.renderBurstAndNodes', {
            burstCount: overview.renderBurstCount,
            nodeCount: overview.renderUniqueNodeCount,
          })}
        </span>
      </article>
      <article className="ndbg-metric-card" data-error={strictMode ? undefined : ''}>
        <span className="ndbg-metric-label">{t('flux.debugger.strictValidation')}</span>
        <strong>
          {strictMode ? t('flux.debugger.strictModeOn') : t('flux.debugger.strictModeOff')}
        </strong>
        <span>
          {strictMode
            ? t('flux.debugger.strictModeOnDescription')
            : t('flux.debugger.strictModeOffDescription')}
        </span>
      </article>
    </div>
  );
}
