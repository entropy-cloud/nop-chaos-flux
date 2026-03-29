import { useCallback, useMemo, useState } from 'react';
import type { NopDebuggerController, NopDebuggerTab } from '@nop-chaos/nop-debugger';

interface DebuggerLabPageProps {
  debuggerController: NopDebuggerController;
  onBack: () => void;
}

const TABS: NopDebuggerTab[] = ['overview', 'timeline', 'network', 'node'];

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-[18px] rounded-[18px] bg-gradient-to-b from-slate-900/94 to-slate-950/98 border border-amber-200/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <p className="mb-2.5 uppercase tracking-[0.14em] text-[11px] font-bold text-amber-300">{title}</p>
      {children}
    </div>
  );
}

function ActionButton({ label, onClick, variant }: { label: string; onClick: () => void; variant?: 'primary' | 'danger' }) {
  const base = 'px-3 py-1.5 rounded-lg text-[13px] font-semibold cursor-pointer transition-all duration-150 border';
  const styles = variant === 'danger'
    ? `${base} bg-red-900/40 border-red-500/30 text-red-200 hover:bg-red-900/60`
    : variant === 'primary'
      ? `${base} bg-amber-900/40 border-amber-500/30 text-amber-200 hover:bg-amber-900/60`
      : `${base} bg-white/5 border-white/10 text-white/80 hover:bg-white/10`;

  return (
    <button type="button" className={styles} onClick={onClick}>
      {label}
    </button>
  );
}

function OutputPanel({ content }: { content: string | null }) {
  if (!content) return null;
  return (
    <pre className="mt-2 p-3 rounded-[12px] bg-black/30 text-sky-200 text-[12px] leading-relaxed overflow-x-auto max-h-[320px] overflow-y-auto whitespace-pre-wrap break-all">
      {content}
    </pre>
  );
}

export function DebuggerLabPage({ debuggerController, onBack }: DebuggerLabPageProps) {
  const [output, setOutput] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [cidInput, setCidInput] = useState('');

  const env = useMemo(
    () => debuggerController.decorateEnv({
      fetcher: async <T = unknown>() => ({ ok: true, status: 200, data: null as unknown as T }),
      notify: () => {}
    }),
    [debuggerController]
  );

  const api = typeof window !== 'undefined' ? window.__NOP_DEBUGGER_API__ : undefined;
  const hub = typeof window !== 'undefined' ? window.__NOP_DEBUGGER_HUB__ : undefined;

  const handleShowOutput = useCallback((label: string, fn: () => unknown) => {
    try {
      const result = fn();
      setOutput(`[${label}]\n${JSON.stringify(result, null, 2)}`);
    } catch (e) {
      setOutput(`[${label}] ERROR: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  const fireRenderEvent = useCallback(() => {
    const payload = { nodeId: 'lab-node', path: 'lab.path', type: 'lab-render' };
    env.monitor?.onRenderStart?.(payload);
    env.monitor?.onRenderEnd?.({ ...payload, durationMs: 42 });
    setOutput('[Render Event] Fired render:start + render:end for lab-node');
  }, [env]);

  const fireActionEvent = useCallback(() => {
    const payload = { actionType: 'lab:testAction', nodeId: 'lab-node', path: 'lab.path' };
    env.monitor?.onActionStart?.(payload);
    env.monitor?.onActionEnd?.({ ...payload, durationMs: 15, result: { ok: true } });
    setOutput('[Action Event] Fired action:start + action:end for lab:testAction');
  }, [env]);

  const fireApiEvent = useCallback(() => {
    const payload = { api: { url: '/api/lab-test', method: 'GET' }, nodeId: 'lab-node', path: 'lab.path' };
    env.monitor?.onApiRequest?.(payload);
    setOutput('[API Event] Fired api:start for /api/lab-test');
  }, [env]);

  const fireErrorEvent = useCallback(() => {
    debuggerController.onActionError(new Error('Lab test error'), { action: { type: 'lab:test' } } as never);
    setOutput('[Error Event] Fired error via onActionError');
  }, [debuggerController]);

  const inspectByCid = useCallback(() => {
    const cid = Number(cidInput);
    if (isNaN(cid)) {
      setOutput('[Inspect by CID] Invalid CID number');
      return;
    }
    const result = debuggerController.inspectByCid(cid);
    setOutput(`[Inspect CID=${cid}]\n${JSON.stringify(result, null, 2)}`);
  }, [debuggerController, cidInput]);

  const togglePause = useCallback(() => {
    if (paused) {
      debuggerController.resume();
      setPaused(false);
    } else {
      debuggerController.pause();
      setPaused(true);
    }
  }, [debuggerController, paused]);

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <section className="max-w-[1100px] w-full p-10 rounded-3xl bg-[var(--nop-hero-bg)] border border-[var(--nop-hero-border)] shadow-[var(--nop-hero-shadow)]">
        <button
          type="button"
          className="mb-[18px] px-3.5 py-2.5 rounded-full border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] text-[var(--nop-text-strong)] font-sans text-[13px] font-bold cursor-pointer transition-[transform,box-shadow,border-color] duration-160 hover:-translate-y-px hover:shadow-[var(--nop-nav-shadow-active)] hover:border-[var(--nop-nav-hover-border)]"
          onClick={onBack}
        >
          Back to Home
        </button>
        <p className="mb-3 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">DevTools</p>
        <h1 className="m-0 mb-4">Debugger Lab</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)]">
          Interactive testing page for the nop-debugger API. Use the controls below to exercise panel
          operations, inject events, query diagnostics, and test the automation API. The floating debugger
          panel updates in real time.
        </p>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          <div className="flex flex-col gap-5">
            <SectionCard title="Panel Controls">
              <div className="flex flex-wrap gap-2">
                <ActionButton label="Show" onClick={() => debuggerController.show()} />
                <ActionButton label="Hide" onClick={() => debuggerController.hide()} />
                <ActionButton label="Toggle" onClick={() => debuggerController.toggle()} />
                <ActionButton label="Clear" onClick={() => debuggerController.clear()} variant="danger" />
                <ActionButton label={paused ? 'Resume' : 'Pause'} onClick={togglePause} variant={paused ? 'primary' : undefined} />
              </div>
              <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-white/40 font-bold">Active Tab</p>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {TABS.map((tab) => (
                  <ActionButton key={tab} label={tab} onClick={() => debuggerController.setActiveTab(tab)} />
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Event Injection">
              <div className="flex flex-wrap gap-2">
                <ActionButton label="Fire Render" onClick={fireRenderEvent} variant="primary" />
                <ActionButton label="Fire Action" onClick={fireActionEvent} variant="primary" />
                <ActionButton label="Fire API" onClick={fireApiEvent} variant="primary" />
                <ActionButton label="Fire Error" onClick={fireErrorEvent} variant="danger" />
              </div>
            </SectionCard>

            <SectionCard title="Snapshot & Diagnostics">
              <div className="flex flex-wrap gap-2">
                <ActionButton label="Get Snapshot" onClick={() => handleShowOutput('Snapshot', () => debuggerController.getSnapshot())} />
                <ActionButton label="Get Overview" onClick={() => handleShowOutput('Overview', () => debuggerController.getOverview())} />
                <ActionButton label="Export Session" onClick={() => handleShowOutput('Export', () => debuggerController.exportSession())} />
                <ActionButton label="Diagnostic Report" onClick={() => handleShowOutput('Report', () => debuggerController.createDiagnosticReport({ includeLatestInteractionTrace: true }))} />
                <ActionButton label="Latest Error" onClick={() => handleShowOutput('LatestError', () => debuggerController.getLatestError())} />
                <ActionButton label="Pinned Errors" onClick={() => handleShowOutput('PinnedErrors', () => debuggerController.getPinnedErrors())} />
              </div>
            </SectionCard>
          </div>

          <div className="flex flex-col gap-5">
            <SectionCard title="Automation API (window global)">
              <div className="p-3 rounded-[12px] bg-black/30 text-[12px] font-mono text-white/70 space-y-1">
                <p>__NOP_DEBUGGER_API__: <span className={api ? 'text-green-400' : 'text-red-400'}>{api ? 'available' : 'not found'}</span></p>
                <p>__NOP_DEBUGGER_HUB__: <span className={hub ? 'text-green-400' : 'text-red-400'}>{hub ? 'available' : 'not found'}</span></p>
                <p>controller: <span className="text-sky-300">{debuggerController.id}</span></p>
                <p>sessionId: <span className="text-sky-300">{debuggerController.sessionId}</span></p>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <ActionButton label="Get Latest Error" onClick={() => handleShowOutput('LatestError (API)', () => api?.getLatestError())} />
                <ActionButton label="Get Pinned Errors" onClick={() => handleShowOutput('PinnedErrors (API)', () => api?.getPinnedErrors())} />
                <ActionButton label="Get Overview" onClick={() => handleShowOutput('Overview (API)', () => api?.getOverview())} />
              </div>
            </SectionCard>

            <SectionCard title="Inspect by CID">
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  className="px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-white text-[13px] w-32 outline-none focus:border-amber-500/50"
                  placeholder="CID number"
                  value={cidInput}
                  onChange={(e) => setCidInput(e.target.value)}
                />
                <ActionButton label="Inspect" onClick={inspectByCid} variant="primary" />
              </div>
              <p className="mt-2 text-[11px] text-white/40">
                Calls controller.inspectByCid(cid). Requires components with data-cid attributes rendered via flux-react.
              </p>
            </SectionCard>

            <SectionCard title="Output">
              <OutputPanel content={output} />
              {output && (
                <button
                  type="button"
                  className="mt-2 text-[11px] text-white/40 hover:text-white/70 cursor-pointer"
                  onClick={() => setOutput(null)}
                >
                  Clear output
                </button>
              )}
            </SectionCard>
          </div>
        </div>
      </section>
    </main>
  );
}
