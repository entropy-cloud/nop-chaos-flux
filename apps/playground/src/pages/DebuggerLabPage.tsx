import type { AmisDebuggerController } from '@nop-chaos/amis-debugger';

interface DebuggerLabPageProps {
  debuggerController: AmisDebuggerController;
}

export function DebuggerLabPage({ debuggerController }: DebuggerLabPageProps) {
  const api = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>).__NOP_AMIS_DEBUGGER_API__ : null;
  const hub = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>).__NOP_AMIS_DEBUGGER_HUB__ : null;

  return (
    <main className="app-shell">
      <section className="hero-card hero-card--wide">
        <p className="eyebrow">DevTools</p>
        <h1>Debugger Lab</h1>
        <p className="body-copy">
          This page demonstrates the debugger API and automation hooks. The debugger runs as a floating panel
          that can be minimized to a launcher button in the bottom-left corner.
        </p>
        <p className="body-copy body-copy--compact">
          Click the launcher to expand the full panel, or click "Minimize" to collapse it back to the launcher.
          The launcher itself is draggable.
        </p>
        <div className="na-ai-debug-card">
          <p className="na-ai-debug-card__eyebrow">Global API Status</p>
          <pre className="na-ai-debug-card__code">
            {JSON.stringify({
              hasApi: !!api,
              hasHub: !!hub,
              controllerId: debuggerController.id
            }, null, 2)}
          </pre>
        </div>
        <div className="na-ai-debug-card" style={{ marginTop: 18 }}>
          <p className="na-ai-debug-card__eyebrow">Controller Methods</p>
          <pre className="na-ai-debug-card__code">{`debuggerController.id = "${debuggerController.id}"
debuggerController.getSnapshot()
debuggerController.show()
debuggerController.hide()
debuggerController.toggle()
debuggerController.pause()
debuggerController.resume()
debuggerController.clear()
debuggerController.setActiveTab(tab)
debuggerController.setPanelPosition({ x, y })
debuggerController.toggleFilter(filter)
debuggerController.decorateEnv(env)
debuggerController.plugin
debuggerController.onActionError
debuggerController.getLatestError()
debuggerController.waitForEvent(options)
debuggerController.getNodeDiagnostics(options)
debuggerController.getInteractionTrace(options)
debuggerController.exportSession(options)
debuggerController.createDiagnosticReport(options)`}</pre>
        </div>
        <div className="na-ai-debug-card" style={{ marginTop: 18 }}>
          <p className="na-ai-debug-card__eyebrow">Snapshot Structure</p>
          <pre className="na-ai-debug-card__code">{`interface AmisDebuggerSnapshot {
  enabled: boolean;
  panelOpen: boolean;
  paused: boolean;
  activeTab: 'overview' | 'timeline' | 'network';
  position: { x: number; y: number };
  events: AmisDebugEvent[];
  filters: AmisDebuggerFilterKind[];
}`}</pre>
        </div>
        <div className="na-ai-debug-card" style={{ marginTop: 18 }}>
          <p className="na-ai-debug-card__eyebrow">Event Groups (Filters)</p>
          <pre className="na-ai-debug-card__code">{`type AmisDebuggerFilterKind =
  | 'render'
  | 'action'
  | 'api'
  | 'compile'
  | 'notify'
  | 'error';`}</pre>
        </div>
        <div className="na-ai-debug-card" style={{ marginTop: 18 }}>
          <p className="na-ai-debug-card__eyebrow">Interaction Trace</p>
          <pre className="na-ai-debug-card__code">{`interface AmisInteractionTrace {
  totalEvents: number;
  anchorEvent?: AmisDebugEvent;
  latestError?: AmisDebugEvent;
  latestApi?: AmisDebugEvent;
  latestAction?: AmisDebugEvent;
  resolvedQuery: {
    nodeId?: string;
    actionType?: string;
    requestKey?: string;
  };
}`}</pre>
        </div>
      </section>
    </main>
  );
}
