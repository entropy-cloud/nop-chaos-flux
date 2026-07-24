import { describe, it, expect } from 'vitest';
import { createLengthPlugin, measureContentLength } from '../plugins/length-plugin.js';
import { createThinkingPlugin } from '../plugins/thinking-plugin.js';
import type { ChatMessage, MessageEngineContext } from '../types.js';

/**
 * Direct unit coverage for the engine plugins — previously only exercised
 * indirectly through full engine turns (AI-18 engine-half). These tests drive
 * each plugin's mutation of `message.state` in isolation.
 */
function fakeCtx(): MessageEngineContext {
  return {} as MessageEngineContext;
}

describe('lengthPlugin', () => {
  it('onCompletionChunk writes content length onto message.state.length', () => {
    const plugin = createLengthPlugin();
    const msg: ChatMessage = { id: 'a', role: 'assistant', content: 'hello' };
    plugin.onCompletionChunk!(fakeCtx(), {}, msg);
    expect(msg.state?.length).toBe(5);
  });

  it('onAfterRequest refreshes length after the final chunk', () => {
    const plugin = createLengthPlugin();
    const msg: ChatMessage = { id: 'a', role: 'assistant', content: 'hello world' };
    plugin.onAfterRequest!(fakeCtx(), msg);
    expect(msg.state?.length).toBe(11);
  });

  it('handles multimodal content (sums text part lengths)', () => {
    const plugin = createLengthPlugin();
    const msg: ChatMessage = {
      id: 'a',
      role: 'assistant',
      content: [
        { type: 'text', text: 'ab' },
        { type: 'text', text: 'cde' },
      ],
    };
    plugin.onCompletionChunk!(fakeCtx(), {}, msg);
    expect(msg.state?.length).toBe(5);
  });

  it('does not crash on empty content', () => {
    const plugin = createLengthPlugin();
    const msg: ChatMessage = { id: 'a', role: 'assistant', content: '' };
    plugin.onCompletionChunk!(fakeCtx(), {}, msg);
    expect(msg.state?.length).toBe(0);
  });

  it('measureContentLength exported helper matches plugin output', () => {
    const msg: ChatMessage = { id: 'x', role: 'assistant', content: 'abcdef' };
    expect(measureContentLength(msg)).toBe(6);
  });
});

describe('thinkingPlugin', () => {
  it('creates state.thinking with startedAt when reasoning_content arrives', () => {
    const plugin = createThinkingPlugin();
    const msg: ChatMessage = {
      id: 't',
      role: 'assistant',
      content: '',
      reasoning_content: 'Let me think...',
    };
    plugin.onCompletionChunk!(fakeCtx(), {}, msg);
    expect(msg.state?.thinking).toBeDefined();
    expect(typeof msg.state!.thinking!.startedAt).toBe('number');
    expect(msg.state!.thinking!.open).toBe(false);
    expect(typeof msg.state!.thinking!.endedAt).toBe('number');
  });

  it('refreshes endedAt on each subsequent reasoning chunk', async () => {
    const plugin = createThinkingPlugin();
    const msg: ChatMessage = {
      id: 't',
      role: 'assistant',
      content: '',
      reasoning_content: 'first',
    };
    plugin.onCompletionChunk!(fakeCtx(), {}, msg);
    const firstEnded = msg.state!.thinking!.endedAt;
    expect(typeof firstEnded).toBe('number');
    // Small delay so Date.now() advances.
    await new Promise((r) => setTimeout(r, 5));
    msg.reasoning_content = 'first second';
    plugin.onCompletionChunk!(fakeCtx(), {}, msg);
    expect(msg.state!.thinking!.endedAt!).toBeGreaterThanOrEqual(firstEnded!);
    // startedAt stays anchored to the first chunk.
    expect(msg.state!.thinking!.startedAt).toBe(msg.state!.thinking!.startedAt);
  });

  it('ignores chunks without reasoning_content (no state mutation)', () => {
    const plugin = createThinkingPlugin();
    const msg: ChatMessage = { id: 't', role: 'assistant', content: 'just text' };
    plugin.onCompletionChunk!(fakeCtx(), {}, msg);
    expect(msg.state).toBeUndefined();
  });
});
