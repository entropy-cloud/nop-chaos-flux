import { describe, it, expect, vi } from 'vitest';
import { createMessageEngine } from '../create-engine.js';
import { createReactMessageAdapter } from '../../adapters/react-adapter.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  ChatMessage,
  ToolExecutor,
} from '../types.js';

/**
 * Snapshot write-path invariants (Plan: AI Message-Snapshot & State Contract
 * Remediation — Phase 1). The engine must never mutate, outside a `mutate`
 * recipe, a message object that is already referenced by a published cached
 * snapshot. These proofs capture the cached element reference (via a React
 * adapter, the production path) and assert it is not written through in place.
 */
function scriptedConnector(rounds: AiConnectorChunk[][]): AiConnector {
  let round = 0;
  return {
    async stream(_req: AiConnectorRequest) {
      const chunks = rounds[Math.min(round, rounds.length - 1)];
      round += 1;
      async function* gen(): AsyncGenerator<AiConnectorChunk> {
        for (const c of chunks) yield c;
      }
      void _req;
      return gen();
    },
  };
}

const toolCallChunks = (id: string, name: string, args: string): AiConnectorChunk[] => [
  {
    delta: {
      tool_calls: [
        { index: 0, id, type: 'function', function: { name, arguments: args } },
      ],
    },
  },
  { finishReason: 'tool_calls' },
];

describe('Phase 1 — engine write-path snapshot discipline', () => {
  it('tool-loop-max: the cached tail message is NOT mutated in place; the marker lands on a fresh ref via mutate', async () => {
    // Always returns tool_calls → loop terminates via maxToolRounds after one
    // tool-execution round. The tool message appended by executeToolCalls is
    // the tail when the loop-max path runs.
    const connector = scriptedConnector([toolCallChunks('r0', 'loop', '{}')]);
    const executor: ToolExecutor = async () => 'ok';
    const engine = createMessageEngine({
      connector,
      toolExecutor: executor,
      maxToolRounds: 1,
      adapter: createReactMessageAdapter(),
    });

    // Capture the cached tool-message element reference the moment it is first
    // published (its pre-loop-max state — no toolLoopMaxReached marker yet).
    let capturedToolMessage: ChatMessage | null = null;
    engine.subscribe('messages', (state) => {
      const tool = state.messages.find((m) => m.role === 'tool');
      if (tool && capturedToolMessage === null) {
        capturedToolMessage = tool;
      }
    });

    await engine.sendMessage('loop');

    expect(capturedToolMessage).not.toBeNull();
    // INVARIANT: the cached element ref captured before the loop-max write must
    // NOT have been mutated in place. Before the fix the engine did
    // `last.metadata = { ...last.metadata, toolLoopMaxReached: true }` directly
    // on the cached object — this assertion would then fail.
    expect(capturedToolMessage!.metadata?.toolLoopMaxReached).not.toBe(true);

    // The marker IS set — but on a fresh reference produced inside the mutate
    // recipe (read-old → build-new → replace), reachable via getState().
    const finalTail = engine.getState().messages.at(-1) as ChatMessage;
    expect(finalTail.metadata?.toolLoopMaxReached).toBe(true);
    // The fresh tail is a distinct object from the cached pre-write element.
    expect(finalTail).not.toBe(capturedToolMessage);
  });

  it('executeToolCalls: the cached owner message state.toolCall is NOT mutated in place; the per-call state lands on a fresh ref via mutate', async () => {
    const connector = scriptedConnector([
      toolCallChunks('call_owner', 'get_weather', '{"city":"sf"}'),
      [{ delta: { content: 'sunny' } }, { finishReason: 'stop' }],
    ]);
    const executor: ToolExecutor = vi.fn(async () => 'sunny, 18C');
    const engine = createMessageEngine({
      connector,
      toolExecutor: executor,
      adapter: createReactMessageAdapter(),
    });

    // Track the LATEST cached owner (assistant w/ tool_calls) that has no
    // toolCall UI state yet. runOnce replaces the streaming assistant with a
    // fresh ref per chunk, so capturing only the first occurrence would alias
    // an orphaned ref. We keep updating until executeToolCalls commits toolCall
    // state — the last update is then the exact cached element the loop is
    // about to write to.
    let capturedOwner: ChatMessage | null = null;
    engine.subscribe('messages', (state) => {
      const owner = state.messages.find(
        (m) => m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0,
      );
      if (owner && !owner.state?.toolCall) {
        capturedOwner = owner;
      }
    });

    await engine.sendMessage('weather?');

    expect(capturedOwner).not.toBeNull();
    // INVARIANT: the cached owner element captured before execution must NOT
    // have had its `state.toolCall` written through in place. Before the fix
    // the loop did `owner.state = {}; owner.state.toolCall = ...` directly on
    // the cached object — this assertion would then fail.
    expect(capturedOwner!.state?.toolCall).toBeUndefined();

    // The per-call UI state IS recorded — on a fresh ref produced inside the
    // mutate recipe, reachable via getState().
    const finalOwner = engine
      .getState()
      .messages.find((m) => m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0) as ChatMessage;
    expect(finalOwner.state?.toolCall?.['call_owner']?.status).toBe('success');
    expect(finalOwner.state?.toolCall?.['call_owner']?.result).toBe('sunny, 18C');
    // The fresh owner is a distinct object from the cached pre-write element.
    expect(finalOwner).not.toBe(capturedOwner);
  });
});
