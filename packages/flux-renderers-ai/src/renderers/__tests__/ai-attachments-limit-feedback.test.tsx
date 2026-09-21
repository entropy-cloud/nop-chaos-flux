import { afterEach, describe, it, expect, vi } from 'vitest';
import type { ComponentType } from 'react';
import { cleanup, render, fireEvent } from '@testing-library/react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { AiAttachmentsRenderer } from '../ai-attachments.js';
import { AiChatProvider } from '../../adapters/ai-chat-context.js';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
});

// G5-R2-视角5-01 (plan 485 Phase 2): over-limit files were dropped silently —
// only the schema onError event fired, which renders nothing. The rejection
// must also surface as a visible destructive note (existing i18n keys
// flux.ai.fileTooLarge / flux.ai.tooManyFiles), bounded (cleared by a later
// fully-accepted batch).

const Attachments = AiAttachmentsRenderer as unknown as ComponentType<Record<string, unknown>>;

function makeFile(name: string, size: number): File {
  const content = new Array(size).fill('x').join('');
  return new File([content], name, { type: 'image/png' });
}

function harness(
  schemaProps: Record<string, unknown> = {},
  events: Record<string, (...args: unknown[]) => unknown> = {},
) {
  return render(
    <AiChatProvider
      value={{
        engine: {} as never,
        messages: [],
        requestState: 'idle',
        isProcessing: false,
        sendMessage: vi.fn(async () => undefined),
        abortRequest: async () => undefined,
      }}
    >
      <Attachments
        props={schemaProps}
        meta={{ className: '', testid: '' }}
        regions={{}}
        events={events}
        path="/x"
        node={{ scope: undefined }}
      />
    </AiChatProvider>,
  );
}

describe('AiAttachmentsRenderer — visible over-limit rejection feedback (G5-R2-视角5-01)', () => {
  it('shows a visible rejection note when a file exceeds maxSize', () => {
    const onError = vi.fn();
    const { container } = harness({ maxSize: 50 }, { onError });
    const input = container.querySelector('[data-slot="ai-attachments-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('big.png', 200)] } });

    expect(onError).toHaveBeenCalledTimes(1);
    const note = container.querySelector('[data-slot="ai-attachments-rejection"]');
    expect(note).not.toBeNull();
    expect(note?.getAttribute('role')).toBe('alert');
    expect(note?.textContent).toBe('File is too large');
    // The over-limit file was not added.
    expect(container.querySelectorAll('[data-slot="ai-attachments-item"]')).toHaveLength(0);
  });

  it('shows a visible rejection note when maxFiles is exceeded', () => {
    const onError = vi.fn();
    const { container } = harness({ maxFiles: 1 }, { onError });
    const input = container.querySelector('[data-slot="ai-attachments-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('a.png', 10), makeFile('b.png', 10)] } });

    expect(onError).toHaveBeenCalledTimes(1);
    const note = container.querySelector('[data-slot="ai-attachments-rejection"]');
    expect(note).not.toBeNull();
    expect(note?.textContent).toBe('Too many files');
    // Only the first file was kept.
    expect(container.querySelectorAll('[data-slot="ai-attachments-item"]')).toHaveLength(1);
  });

  it('clears the note after a later fully-accepted batch (bounded feedback)', () => {
    const { container } = harness({ maxSize: 50 });
    const input = container.querySelector('[data-slot="ai-attachments-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('big.png', 200)] } });
    expect(container.querySelector('[data-slot="ai-attachments-rejection"]')).not.toBeNull();

    fireEvent.change(input, { target: { files: [makeFile('ok.png', 10)] } });
    expect(container.querySelector('[data-slot="ai-attachments-rejection"]')).toBeNull();
  });
});
