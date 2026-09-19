import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { AssistantActions } from '../ai-bubble/assistant-actions.js';
import { clipboardAdapter } from '../ai-bubble/renderers/markdown.js';
import type { ChatMessage, MessageEngine } from '../../engine/types.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function assistantMessage(id: string, content: string): ChatMessage {
  return { id, role: 'assistant', content, loading: false } as ChatMessage;
}

function fakeEngine(): MessageEngine {
  return { regenerate: vi.fn().mockResolvedValue(undefined) } as unknown as MessageEngine;
}

describe('AssistantActions (plan 472 V2 / survey §1.4)', () => {
  it('renders copy for every assistant bubble and mounts retry only with an engine', () => {
    const message = assistantMessage('a1', 'hello');
    const { container, rerender } = render(<AssistantActions message={message} />);

    expect(container.querySelector('[data-slot="ai-action-copy"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="ai-action-retry"]')).toBeNull();

    rerender(<AssistantActions message={message} engine={fakeEngine()} />);
    expect(container.querySelector('[data-slot="ai-action-retry"]')).not.toBeNull();
    expect((screen.getByLabelText('重试') as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables retry while the request is in flight and calls engine.regenerate on click', async () => {
    const engine = fakeEngine();
    const message = assistantMessage('a1', 'hello');
    const { container, rerender } = render(<AssistantActions message={message} engine={engine} busy={true} />);

    const retry = container.querySelector('[data-slot="ai-action-retry"]') as HTMLButtonElement;
    expect(retry.disabled).toBe(true);
    fireEvent.click(retry);
    expect(engine.regenerate).not.toHaveBeenCalled();

    rerender(<AssistantActions message={message} engine={engine} busy={false} />);
    const enabled = container.querySelector('[data-slot="ai-action-retry"]') as HTMLButtonElement;
    fireEvent.click(enabled);
    await vi.waitFor(() => expect(engine.regenerate).toHaveBeenCalledTimes(1));
  });

  it('copy writes the message text through the shared clipboardAdapter channel', async () => {
    const writeText = vi.spyOn(clipboardAdapter, 'writeText').mockResolvedValue(undefined);
    const message = assistantMessage('a1', 'plain text body');
    render(<AssistantActions message={message} />);

    fireEvent.click(screen.getByLabelText('复制'));
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('plain text body'));
    expect(screen.getByLabelText('复制')).toBeTruthy();
    writeText.mockRestore();
  });

  it('a rejected clipboard write keeps the button in its pre-copy state', async () => {
    const writeText = vi.spyOn(clipboardAdapter, 'writeText').mockRejectedValue(new Error('denied'));
    const message = assistantMessage('a1', 'text');
    render(<AssistantActions message={message} />);

    fireEvent.click(screen.getByLabelText('复制'));
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    // no false "copied" swap (R2-F2 semantics carried over)
    expect((screen.getByLabelText('复制').firstChild as Element).tagName).toBe('svg');
    writeText.mockRestore();
  });
});
