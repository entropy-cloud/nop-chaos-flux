import type { AiConnector, AiConnectorChunk } from '@nop-chaos/flux-renderers-ai';

/**
 * Deterministic scripted connector: each `stream()` call replays the next
 * turn's chunks verbatim (last turn repeats when exhausted). No network.
 */
export function scriptedConnector(turns: AiConnectorChunk[][]): AiConnector {
  let call = 0;
  return {
    async *stream() {
      const chunks = turns[Math.min(call, turns.length - 1)];
      call += 1;
      for (const chunk of chunks) {
        yield chunk;
      }
    },
  };
}

/** Connector whose stream suspends until the gate opens (stop-button tests). */
export function hangingConnector(gate: { promise: Promise<void> }): AiConnector {
  return {
    async *stream() {
      await gate.promise;
      yield { delta: { role: 'assistant', content: 'late' } };
      yield { finishReason: 'stop' };
    },
  };
}

/** Connector that throws on the first call and replays the recovery text after. */
export function failingOnceConnector(recovery: string): AiConnector {
  let calls = 0;
  return {
    async *stream() {
      calls += 1;
      if (calls === 1) {
        throw new Error('connection refused (internal)');
      }
      yield { delta: { role: 'assistant', content: recovery } };
      yield { finishReason: 'stop' };
    },
  };
}
