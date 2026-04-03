import type { MergedRequest } from './event-groups';
import { JsonViewer } from './json-viewer';

function formatClock(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function NetworkTab(props: {
  mergedRequests: MergedRequest[];
  networkExpandedKey: string | null;
  setNetworkExpandedKey(value: string | null): void;
}) {
  const { mergedRequests, networkExpandedKey, setNetworkExpandedKey } = props;
  return (
    <div className="ndbg-list">
      {mergedRequests.length === 0 ? <p className="ndbg-empty">No network events recorded yet.</p> : null}
      {mergedRequests.map((request) => (
        <article key={request.requestKey} className="ndbg-entry" onClick={() => setNetworkExpandedKey(networkExpandedKey === request.requestKey ? null : request.requestKey)}>
          <div className="ndbg-entry-topline">
            <span className={`ndbg-badge ndbg-status-${request.status}`} data-group="api">{request.status}</span>
            <time>{formatClock(request.startEvent?.timestamp ?? 0)}</time>
          </div>
          <strong className="ndbg-entry-summary">{request.summary}</strong>
          <span className="ndbg-entry-meta">{request.durationMs != null ? `${request.durationMs}ms` : request.status === 'pending' ? 'pending...' : ''}</span>
          {networkExpandedKey === request.requestKey ? (
            <div className="ndbg-entry-expanded" onClick={(event) => event.stopPropagation()}>
              {request.startEvent?.network ? <div><span className="ndbg-json-key">Request: </span><JsonViewer data={request.startEvent.network} defaultExpanded={2} /></div> : null}
              {request.endEvent?.network ? <div><span className="ndbg-json-key">Response: </span><JsonViewer data={request.endEvent.network} defaultExpanded={2} /></div> : null}
              {request.endEvent?.exportedData != null ? <div><span className="ndbg-json-key">Response Data: </span><JsonViewer data={request.endEvent.exportedData} defaultExpanded={2} /></div> : null}
              {request.startEvent?.detail ? <code className="ndbg-entry-detail">{request.startEvent.detail}</code> : null}
              {request.endEvent?.detail ? <code className="ndbg-entry-detail">{request.endEvent.detail}</code> : null}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
