import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Badge, Button, ScrollArea } from '@nop-chaos/ui';

interface SpecEntry {
  spec: string;
}

interface RunResult {
  id: number;
  spec: string;
  status: string;
  durationMs: number;
  error?: string;
}

interface KernelLogEntry {
  id: number;
  seq: number;
  kind: string;
  summary: string;
}

export function ConsoleApp(): React.ReactElement {
  const [specs, setSpecs] = useState<SpecEntry[]>([]);
  const [runningSpec, setRunningSpec] = useState<string | null>(null);
  const [results, setResults] = useState<RunResult[]>([]);
  const [logs, setLogs] = useState<KernelLogEntry[]>([]);
  const [dropped, setDropped] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const nextIdRef = useRef(1);

  useEffect(() => {
    void fetch('/__flux_test__/api/specs')
      .then((res) => res.json() as Promise<{ specs: string[] }>)
      .then((data) => setSpecs(data.specs.map((spec) => ({ spec }))));
  }, []);

  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.host}/gateway?targetId=__console__`);
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data)) as { method: string; params: Record<string, unknown> };
      if (msg.method === 'console.run.started') {
        setRunningSpec(String(msg.params.spec));
        setLogs([]);
        setDropped(0);
      } else if (msg.method === 'console.run.finished') {
        setRunningSpec(null);
        const summary = msg.params.summary as { results: RunResult[] } | undefined;
        if (summary) {
          setResults((prev) => [
            ...summary.results.map((result) => ({ ...result, id: nextIdRef.current++ })),
            ...prev,
          ]);
        }
      } else if (msg.method === 'console.log') {
        const payload = msg.params.payload as { entries?: Array<{ seq: number; kind: string; summary: string }>; dropped?: number } | undefined;
        if (payload?.entries) {
          setLogs((prev) => [
            ...prev,
            ...payload.entries!.map((entry) => ({ id: nextIdRef.current++, seq: entry.seq, kind: entry.kind, summary: entry.summary })),
          ].slice(-500));
        }
        if (typeof payload?.dropped === 'number') setDropped(payload.dropped);
      }
    });
    return () => ws.close();
  }, []);

  const runSpec = async (spec: string): Promise<void> => {
    setError(null);
    const res = await fetch('/__flux_test__/api/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ spec }),
    });
    if (res.status === 409) setError('已有运行在途（run-in-progress）');
    else if (!res.ok) setError(`run 请求失败：HTTP ${res.status}`);
  };

  return (
    <div style={{ display: 'flex', width: '100%', color: '#e7e9ea' }}>
      <aside style={{ width: 300, borderRight: '1px solid #2a2d31', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h1 style={{ fontSize: 16, margin: 0 }}>Flux Test Console</h1>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Launchpad · {specs.length} specs</div>
        <ScrollArea style={{ maxHeight: '70vh' }}>
          {specs.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.6 }}>空态：当前目录无 spec</div>
          ) : (
            specs.map(({ spec }) => (
              <div key={spec} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px', borderBottom: '1px solid #1d2023' }}>
                <span style={{ fontSize: 12 }}>{spec}</span>
                <Button size="sm" disabled={runningSpec !== null} onClick={() => void runSpec(spec)}>
                  {runningSpec === spec ? 'Running' : 'Run'}
                </Button>
              </div>
            ))
          )}
        </ScrollArea>
      </aside>
      <main style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {error ? <Badge variant="destructive">{error}</Badge> : null}
        {runningSpec ? <Badge>Runner · {runningSpec} in progress</Badge> : <Badge variant="secondary">Runner · idle</Badge>}
        <section style={{ minHeight: 120 }}>
          <h2 style={{ fontSize: 13, margin: '0 0 6px' }}>Results</h2>
          {results.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.6 }}>尚无结果</div>
          ) : (
            results.map((result) => (
              <div key={result.id} style={{ fontSize: 12, padding: '4px 0' }}>
                <Badge variant={result.status === 'passed' ? 'secondary' : 'destructive'}>{result.status}</Badge>{' '}
                {result.spec} ({result.durationMs}ms){result.error ? ` — ${result.error}` : ''}
              </div>
            ))
          )}
        </section>
        <section style={{ flex: 1 }}>
          <h2 style={{ fontSize: 13, margin: '0 0 6px' }}>
            Command Log {dropped > 0 ? <span style={{ opacity: 0.6 }}>({dropped} dropped)</span> : null}
          </h2>
          <ScrollArea style={{ maxHeight: '45vh' }}>
            {logs.map((entry) => (
              <div key={entry.id} style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', padding: '2px 0', opacity: 0.85 }}>
                [{entry.kind}] {entry.summary}
              </div>
            ))}
            {logs.length === 0 ? <div style={{ fontSize: 12, opacity: 0.6 }}>运行 spec 后此处显示内核 Command Log 流</div> : null}
          </ScrollArea>
        </section>
      </main>
    </div>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<ConsoleApp />);
}
