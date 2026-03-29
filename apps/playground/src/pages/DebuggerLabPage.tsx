import type { NopDebuggerController } from '@nop-chaos/nop-debugger';

interface DebuggerLabPageProps {
  debuggerController: NopDebuggerController;
  onBack: () => void;
}

export function DebuggerLabPage({ debuggerController, onBack }: DebuggerLabPageProps) {
  const api = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>).__NOP_DEBUGGER_API__ : null;
  const hub = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>).__NOP_DEBUGGER_HUB__ : null;

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <section className="max-w-[1100px] p-10 rounded-3xl bg-[var(--nop-hero-bg)] border border-[var(--nop-hero-border)] shadow-[var(--nop-hero-shadow)]">
        <button type="button" className="mb-[18px] px-3.5 py-2.5 rounded-full border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] text-[var(--nop-text-strong)] font-sans text-[13px] font-bold cursor-pointer transition-[transform,box-shadow,border-color] duration-160 hover:-translate-y-px hover:shadow-[var(--nop-nav-shadow-active)] hover:border-[var(--nop-nav-hover-border)]" onClick={onBack}>
          Back to Home
        </button>
        <p className="mb-3 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">DevTools</p>
        <h1 className="m-0 mb-4">Debugger Lab</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)]">
          This page demonstrates the debugger API and automation hooks. The debugger runs as a floating panel
          that can be minimized to a launcher button in the bottom-left corner.
        </p>
        <p className="mt-2.5 text-[15px] leading-relaxed text-[var(--nop-body-copy)]">
          Click the launcher to expand the full panel, or click "Minimize" to collapse it back to the launcher.
          The launcher itself is draggable.
        </p>
        <div className="mt-[18px] p-[18px] rounded-[18px] bg-[var(--nop-debug-card-bg)] border border-[var(--nop-debug-card-border)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <p className="mb-2.5 uppercase tracking-[0.14em] text-[11px] font-bold text-[var(--nop-debug-card-eyebrow)]">Global API Status</p>
          <pre className="p-3.5 rounded-[14px] bg-[var(--nop-debug-card-code-bg)] text-[var(--nop-debug-card-code-text)] text-[13px] leading-relaxed overflow-x-auto">
            {JSON.stringify({
              hasApi: !!api,
              hasHub: !!hub,
              controllerId: debuggerController.id
            }, null, 2)}
          </pre>
        </div>
        <div className="mt-[18px] p-[18px] rounded-[18px] bg-[var(--nop-debug-card-bg)] border border-[var(--nop-debug-card-border)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <p className="mb-2.5 uppercase tracking-[0.14em] text-[11px] font-bold text-[var(--nop-debug-card-eyebrow)]">Controller Methods</p>
          <pre className="p-3.5 rounded-[14px] bg-[var(--nop-debug-card-code-bg)] text-[var(--nop-debug-card-code-text)] text-[13px] leading-relaxed overflow-x-auto">{`debuggerController.id = "${debuggerController.id}"
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
        <div className="mt-[18px] p-[18px] rounded-[18px] bg-[var(--nop-debug-card-bg)] border border-[var(--nop-debug-card-border)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <p className="mb-2.5 uppercase tracking-[0.14em] text-[11px] font-bold text-[var(--nop-debug-card-eyebrow)]">Snapshot Structure</p>
          <pre className="p-3.5 rounded-[14px] bg-[var(--nop-debug-card-code-bg)] text-[var(--nop-debug-card-code-text)] text-[13px] leading-relaxed overflow-x-auto">{`interface FluxDebuggerSnapshot {
  enabled: boolean;
  panelOpen: boolean;
  paused: boolean;
  activeTab: 'overview' | 'timeline' | 'network';
  position: { x: number; y: number };
  events: FluxDebugEvent[];
  filters: FluxDebuggerFilterKind[];
}`}</pre>
        </div>
        <div className="mt-[18px] p-[18px] rounded-[18px] bg-[var(--nop-debug-card-bg)] border border-[var(--nop-debug-card-border)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <p className="mb-2.5 uppercase tracking-[0.14em] text-[11px] font-bold text-[var(--nop-debug-card-eyebrow)]">Event Groups (Filters)</p>
          <pre className="p-3.5 rounded-[14px] bg-[var(--nop-debug-card-code-bg)] text-[var(--nop-debug-card-code-text)] text-[13px] leading-relaxed overflow-x-auto">{`type FluxDebuggerFilterKind =
  | 'render'
  | 'action'
  | 'api'
  | 'compile'
  | 'notify'
  | 'error';`}</pre>
        </div>
        <div className="mt-[18px] p-[18px] rounded-[18px] bg-[var(--nop-debug-card-bg)] border border-[var(--nop-debug-card-border)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <p className="mb-2.5 uppercase tracking-[0.14em] text-[11px] font-bold text-[var(--nop-debug-card-eyebrow)]">Interaction Trace</p>
          <pre className="p-3.5 rounded-[14px] bg-[var(--nop-debug-card-code-bg)] text-[var(--nop-debug-card-code-text)] text-[13px] leading-relaxed overflow-x-auto">{`interface FluxInteractionTrace {
  totalEvents: number;
  anchorEvent?: FluxDebugEvent;
  latestError?: FluxDebugEvent;
  latestApi?: FluxDebugEvent;
  latestAction?: FluxDebugEvent;
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
