import { describe, it, expect } from 'vitest';
import { createMessageEngine } from '../create-engine.js';
import { BaseMessageStateAdapter } from '../state-adapter.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  ChatMessage,
  InternalMessageState,
} from '../types.js';
import { okChunks, slowConnector } from '../../adapters/__tests__/use-conversation-test-helpers.js';

/**
 * 2026-08-10 multi P2-1 — Invariant ⑧ branch-stamp reset extension members
 * (break / throw / regenerate-sequence arms).
 *
 * Split out of `engine-invariants.test.ts` (check:oversized-code-files limit)
 * following the `engine-invariants-i4.test.ts` precedent: the original file
 * stays within the limit while the multi P2-1 additions keep the same
 * invariants-suite family. The members were landed RED (`it.fails`) before the
 * create-engine.ts fix, then flipped to `it`.
 */

class InspectableAdapter extends BaseMessageStateAdapter {
  peek(): InternalMessageState {
    return this.state;
  }
}

function makeEngine(connector?: AiConnector) {
  const adapter = new InspectableAdapter();
  adapter.initialize({
    messages: [],
    requestState: 'idle',
    isProcessing: false,
    abortController: null,
    connector: connector ?? null,
  });
  return {
    engine: createMessageEngine({ connector: connector ?? undefined, adapter }),
    adapter,
  };
}

describe('Invariant ⑧ — multi P2-1 branch-stamp reset extension (break/throw/sequence)', () => {
  // multi P2-1 (2026-08-10): the static scanner only covered `return;` paths,
  // so the abort `while` break and the onTurnStart throw paths leaked the
  // stamp into the next unrelated turn (branch mis-grouping + regenerate
  // sequence shift). The three members below are the break / throw /
  // regenerate-sequence arms of the branch-stamp reset invariant.

  it('⑧ multi P2-1 break arm: abort during onTurnStart must not leak the stamp into the next turn', async () => {
    // regenerate stamps `pendingBranchId`; the turn hangs in a gated
    // `onTurnStart`; abort() flips the signal; when the gate releases, the
    // while-head `if (aborted) break` exits BEFORE runOnce consumes the stamp
    // — pre-fix the next unrelated sendMessage is wrongly stamped.
    let resolveTurnStart!: () => void;
    const turnStartGate = new Promise<void>((r) => {
      resolveTurnStart = r;
    });
    let streamCalls = 0;
    const connector: AiConnector = {
      async stream(_req: AiConnectorRequest) {
        streamCalls += 1;
        async function* gen(): AsyncGenerator<AiConnectorChunk> {
          if (streamCalls === 2) await new Promise<void>((r) => setTimeout(r, 1));
          yield { delta: { content: 'ok' } };
          yield { finishReason: 'stop' };
        }
        void _req;
        return gen();
      },
    };
    const { engine, adapter } = makeEngine(connector);
    engine.registerPlugin({
      name: 'gated-start',
      onTurnStart: async () => {
        await turnStartGate;
      },
    });
    engine.setMessages([
      { id: 'u1', role: 'user', content: 'first' },
      { id: 'a1', role: 'assistant', content: 'old' },
    ] as ChatMessage[]);

    const regen = engine.regenerate('branch-1');
    await Promise.resolve();
    await Promise.resolve();
    expect(adapter.peek().isProcessing).toBe(true);

    await engine.abort();
    resolveTurnStart();
    await regen;
    await Promise.resolve();
    expect(adapter.peek().requestState).toBe('aborted');

    // The next unrelated turn must be stamp-free.
    await engine.sendMessage('normal');
    const assistant = adapter.peek().messages.filter((m) => m.role === 'assistant').at(-1);
    expect(assistant?.metadata?.branchId).toBeUndefined();
  });

  it('⑧ multi P2-1 throw arm: onTurnStart rejection must clear the pending stamp', async () => {
    // regenerate stamps `pendingBranchId`; the plugin onTurnStart rejects →
    // runTurn's catch settles the turn as 'error' WITHOUT clearing the stamp
    // — pre-fix the next unrelated sendMessage is wrongly stamped.
    const { engine, adapter } = makeEngine(slowConnector(okChunks, 1));
    const unregisterThrower = engine.registerPlugin({
      name: 'start-throws',
      onTurnStart: async () => {
        throw new Error('start-boom');
      },
    });
    engine.setMessages([
      { id: 'u1', role: 'user', content: 'first' },
      { id: 'a1', role: 'assistant', content: 'old' },
    ] as ChatMessage[]);

    await engine.regenerate('branch-1');
    expect(adapter.peek().requestState).toBe('error');
    // Drop the throwing plugin so the unrelated turn actually streams.
    unregisterThrower();

    await engine.sendMessage('normal');
    const assistant = adapter.peek().messages.filter((m) => m.role === 'assistant').at(-1);
    expect(assistant?.metadata?.branchId).toBeUndefined();
  });

  it('⑧ multi P2-1 sequence arm: a leaked stamp shifts the regenerate sequence', async () => {
    // End-to-end sequence consequence of the leak: the leaked stamp is
    // consumed by an unrelated 'normal' turn (mis-grouping), so the NEXT
    // regenerate derives its branch id from that wrongly-stamped message —
    // 'branch-2' instead of the fresh 'branch-1'.
    let resolveTurnStart!: () => void;
    const turnStartGate = new Promise<void>((r) => {
      resolveTurnStart = r;
    });
    const connector: AiConnector = {
      async stream(_req: AiConnectorRequest) {
        async function* gen(): AsyncGenerator<AiConnectorChunk> {
          yield { delta: { content: 'ok' } };
          yield { finishReason: 'stop' };
        }
        void _req;
        return gen();
      },
    };
    const { engine, adapter } = makeEngine(connector);
    engine.registerPlugin({
      name: 'gated-start',
      onTurnStart: async () => {
        await turnStartGate;
      },
    });
    engine.setMessages([
      { id: 'u1', role: 'user', content: 'first' },
      { id: 'a1', role: 'assistant', content: 'old' },
    ] as ChatMessage[]);

    const regen1 = engine.regenerate('branch-1');
    await Promise.resolve();
    await Promise.resolve();
    await engine.abort();
    resolveTurnStart();
    await regen1;

    // The unrelated turn consumes the leaked stamp pre-fix; the sequence arm:
    // the next regenerate must derive 'branch-1' (fresh), not 'branch-2'.
    await engine.sendMessage('normal');
    await engine.regenerate();
    const assistant = adapter.peek().messages.filter((m) => m.role === 'assistant').at(-1);
    expect(assistant?.metadata?.branchId).toBe('branch-1');
  });
});
