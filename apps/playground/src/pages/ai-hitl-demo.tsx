import { useState } from 'react';
import { Button, Toaster } from '@nop-chaos/ui';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { AiToolCallView, type ChatToolCall, type ChatToolCallUIState } from '@nop-chaos/flux-renderers-ai';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

interface Props {
  onBack: () => void;
}

const PENDING_TOOL_CALL: ChatToolCall = {
  index: 0,
  id: 'call_hitl_demo',
  type: 'function',
  function: {
    name: 'transfer_funds',
    arguments: '{\n  "to": "acct_123",\n  "amount": 2500,\n  "currency": "USD"\n}',
  },
};

/**
 * P3 demo (A-14): human-in-the-loop tool approval. The host renders an
 * `ai-tool-call` card whose `state.approval` starts `'pending'`. The host
 * `onApproval` handler is the workflow owner — approve advances the tool to
 * success, reject records a rejection. The engine only holds the `approval`
 * field; it never pauses/resumes the turn itself (design.md §5.2).
 */
export function AiHitlDemoPage({ onBack }: Props) {
  const [approval, setApproval] = useState<ChatToolCallUIState['approval']>('pending');
  const [status, setStatus] = useState<ChatToolCallUIState['status']>('running');
  const [log, setLog] = useState<string[]>([]);

  function handleApproval(action: 'approve' | 'reject') {
    if (approval !== 'pending') return;
    if (action === 'approve') {
      setApproval('approved');
      setStatus('success');
      setLog((prev) => [...prev, 'Approved → executing transfer_funds… result: ok']);
    } else {
      setApproval('rejected');
      setStatus('failed');
      setLog((prev) => [...prev, 'Rejected → posted role:"tool" denial message']);
    }
  }

  function reset() {
    setApproval('pending');
    setStatus('running');
    setLog([]);
  }

  return (
    <div className="nop-theme-root min-h-screen flex flex-col">
      <Toaster />
      <header className="flex items-center gap-3 p-3 border-b bg-background">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <h1 className="text-lg font-semibold">AI HITL Approval — P3 (A-14)</h1>
        <Button variant="outline" size="sm" onClick={reset} data-testid="hitl-reset">
          Reset
        </Button>
      </header>
      <main className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-4">
        <p className="text-sm text-muted-foreground">
          The tool card below requires approval. Use <kbd>Tab</kbd> to move between Approve/Reject and{' '}
          <kbd>Esc</kbd> to return focus. Approve runs the tool; Reject records a denial.
        </p>
        <AiToolCallView
          toolCall={PENDING_TOOL_CALL}
          state={{ status, approval, open: true }}
          defaultOpen
          onApproval={handleApproval}
        />
        {log.length > 0 ? (
          <ul data-testid="hitl-log" className="text-xs space-y-1 mt-4 border-t pt-3">
            {log.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        ) : null}
      </main>
    </div>
  );
}
