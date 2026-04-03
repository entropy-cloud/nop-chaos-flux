import type { NopComponentInspectResult, NopNodeDiagnostics } from '../types';
import { JsonViewer } from './json-viewer';

function formatClock(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

type ComponentTreeItem = { cid: number; type: string; label: string; depth: number; element: HTMLElement };

export function NodeTab(props: {
  componentTree: ComponentTreeItem[];
  scanComponentTree(): void;
  inspectMode: boolean;
  inspectData: NopComponentInspectResult | null;
  selectedElement: HTMLElement | null;
  setSelectedElement(value: HTMLElement | null): void;
  inspectElement(element: HTMLElement): void;
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
    inspectElement,
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

  return (
    <>
      <div className="ndbg-tree-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="ndbg-metric-label">Components ({componentTree.length})</span>
          <button onClick={scanComponentTree} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--nop-debugger-chip-border)', background: 'transparent', color: 'var(--nop-debugger-text)', cursor: 'pointer' }}>
            Scan
          </button>
        </div>
        {inspectMode ? (
          <div className="ndbg-inspect-hint">
            🔍 Click an element on the page to inspect it. (Press Esc to cancel)
          </div>
        ) : null}
        {inspectData ? (
          <div className="ndbg-inspect-panel">
            <article className="ndbg-metric-card">
              <div className="ndbg-inspect-header">
                <span className="ndbg-metric-label">Component Inspector</span>
                <button onClick={() => setSelectedElement(null)} style={{ fontSize: '11px', background: 'none', border: 'none', color: 'var(--nop-debugger-text)', cursor: 'pointer', padding: 0 }}>✕</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong>#{inspectData.cid}</strong>
                {inspectData.tagName ? <span className="ndbg-inspect-tag">&lt;{inspectData.tagName}&gt;</span> : null}
                {inspectData.handleType ? <span className="ndbg-badge" data-group="node">{inspectData.handleType}</span> : null}
              </div>
              <div className="ndbg-inspect-meta">
                {inspectData.handleName ? <span>Name: {inspectData.handleName}</span> : null}
                {inspectData.handleId ? <span>ID: {inspectData.handleId}</span> : null}
                {inspectData.className ? <span>Class: {inspectData.className.slice(0, 60)}{inspectData.className.length > 60 ? '…' : ''}</span> : null}
                <span>{inspectData.mounted ? '● mounted' : '○ unmounted'}</span>
              </div>
            </article>

            {inspectData.formState ? (
              <div className="ndbg-inspect-section">
                <span className="ndbg-inspect-section-title">Form State</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['values', 'errors', 'meta'] as const).map((tab) => (
                    <button key={tab} type="button" className="ndbg-form-tab" data-active={formTab === tab ? '' : undefined} onClick={() => setFormTab(tab)}>
                      {tab}
                    </button>
                  ))}
                </div>
                <JsonViewer
                  data={
                    formTab === 'values' ? inspectData.formState.values :
                    formTab === 'errors' ? inspectData.formState.errors :
                    { touched: inspectData.formState.touched, dirty: inspectData.formState.dirty, visited: inspectData.formState.visited, submitting: inspectData.formState.submitting }
                  }
                  defaultExpanded={2}
                />
              </div>
            ) : null}

            {inspectData.scopeData ? (
              <div className="ndbg-inspect-section">
                <span className="ndbg-inspect-section-title">Scope Data</span>
                <JsonViewer data={inspectData.scopeData} defaultExpanded={2} />
              </div>
            ) : null}
          </div>
        ) : selectedElement ? (
          <article className="ndbg-metric-card" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="ndbg-metric-label">Selected Element</span>
              <button onClick={() => setSelectedElement(null)} style={{ fontSize: '11px', background: 'none', border: 'none', color: 'var(--nop-debugger-text)', cursor: 'pointer', padding: 0 }}>✕</button>
            </div>
            <strong>data-cid: {selectedElement.getAttribute('data-cid')}</strong>
            <span>{selectedElement.tagName.toLowerCase()}</span>
          </article>
        ) : null}
        {componentTree.length > 0 ? (
          <div className="ndbg-component-tree">
            {componentTree.map((item) => (
              <div
                key={item.cid}
                className={`ndbg-tree-item ${selectedElement === item.element ? 'selected' : ''}`}
                onClick={() => inspectElement(item.element)}
                style={{ paddingLeft: `${item.depth * 16 + 8}px` }}
              >
                <span style={{ fontSize: '11px', color: 'var(--nop-debugger-muted-text)' }}>#{item.cid}</span>
                {' '}
                <span style={{ fontSize: '12px' }}>{item.label || 'element'}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="ndbg-empty">Click "Scan" to find components.</p>
        )}
      </div>
      <input
        type="text"
        className="ndbg-node-input"
        placeholder="Enter nodeId to inspect..."
        value={nodeIdInput}
        onChange={(e) => onNodeIdInputChange(e.target.value)}
      />
      {nodeDiagnostics && nodeIdInput.trim() ? (
        <div className="ndbg-list">
          <article className="ndbg-entry">
            <div className="ndbg-entry-topline">
              <span className="ndbg-badge" data-group="node">Node</span>
              <span className="ndbg-entry-meta">{nodeDiagnostics.nodeId ?? 'n/a'}</span>
            </div>
            <strong className="ndbg-entry-summary">
              {nodeDiagnostics.rendererTypes.length > 0 ? nodeDiagnostics.rendererTypes.join(', ') : 'Unknown type'}
            </strong>
            <span className="ndbg-entry-meta">
              {nodeDiagnostics.path ?? 'no path'} | {nodeDiagnostics.totalEvents} events
            </span>
          </article>
          {nodeDiagnostics.totalEvents === 0 ? (
            <p className="ndbg-empty">No events found for this node.</p>
          ) : (
            <>
              <div className="ndbg-overview">
                <article className="ndbg-metric-card">
                  <span className="ndbg-metric-label">Render events</span>
                  <strong>{nodeDiagnostics.countsByGroup.render ?? 0}</strong>
                </article>
                <article className="ndbg-metric-card">
                  <span className="ndbg-metric-label">Action events</span>
                  <strong>{nodeDiagnostics.countsByGroup.action ?? 0}</strong>
                </article>
                <article className="ndbg-metric-card">
                  <span className="ndbg-metric-label">API events</span>
                  <strong>{nodeDiagnostics.countsByGroup.api ?? 0}</strong>
                </article>
                <article className="ndbg-metric-card" data-error="">
                  <span className="ndbg-metric-label">Errors</span>
                  <strong>{nodeDiagnostics.countsByGroup.error ?? 0}</strong>
                </article>
                {(() => {
                  const renderEndEvents = nodeDiagnostics.recentEvents.filter((e) => e.kind === 'render:end' && e.durationMs != null);
                  if (renderEndEvents.length === 0) return null;
                  const slowest = Math.max(...renderEndEvents.map((e) => e.durationMs!));
                  const avg = renderEndEvents.reduce((sum, e) => sum + e.durationMs!, 0) / renderEndEvents.length;
                  return (
                    <article className="ndbg-metric-card" data-slow="">
                      <span className="ndbg-metric-label">Render performance</span>
                      <strong>Slowest: {slowest}ms</strong>
                      <span>Avg: {avg.toFixed(1)}ms ({renderEndEvents.length} renders)</span>
                    </article>
                  );
                })()}
              </div>
              {nodeDiagnostics.recentEvents.map((event) => (
                <article key={event.id} className="ndbg-entry" onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}>
                  <div className="ndbg-entry-topline">
                    <span className="ndbg-badge" data-group={event.group}>{event.kind}</span>
                    <time>{formatClock(event.timestamp)}</time>
                  </div>
                  <strong className="ndbg-entry-summary">{event.summary}</strong>
                  {event.durationMs != null ? (
                    <span className="ndbg-entry-meta">{event.durationMs}ms</span>
                  ) : null}
                  {expandedId === event.id ? (
                    <div className="ndbg-entry-expanded" onClick={(e) => e.stopPropagation()}>
                      {event.detail ? <code className="ndbg-entry-detail">{event.detail}</code> : null}
                      {event.exportedData != null ? <JsonViewer data={event.exportedData} defaultExpanded={2} /> : null}
                    </div>
                  ) : null}
                </article>
              ))}
            </>
          )}
        </div>
      ) : (
        <p className="ndbg-empty">Enter a nodeId above to view node diagnostics.</p>
      )}
      {inspectData ? (
        <div className="ndbg-inspect-section">
          <span className="ndbg-inspect-section-title">Expression Evaluator</span>
          <input
            type="text"
            className="ndbg-eval-input"
            placeholder="Evaluate formula expression on component data..."
            value={evalInput}
            onChange={(e) => setEvalInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleEvalExpression(); }}
          />
          {evalResult !== null ? <div className="ndbg-eval-result">{evalResult}</div> : null}
        </div>
      ) : null}
    </>
  );
}
