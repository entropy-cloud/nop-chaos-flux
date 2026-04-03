import type { NopDebuggerOverview, NopInteractionTrace } from '../types';

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
  latestTrace?: NopInteractionTrace;
  latestTraceSummary: { headline: string; detail: string };
}) {
  const { overview, paused, latestTrace, latestTraceSummary } = props;
  return (
    <div className="ndbg-overview">
      <article className="ndbg-metric-card">
        <span className="ndbg-metric-label">Events</span>
        <strong>{overview.totalEvents}</strong>
        <span>{paused ? 'stream paused' : 'stream live'}</span>
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
  );
}
