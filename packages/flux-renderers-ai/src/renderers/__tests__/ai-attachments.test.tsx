import { afterEach, describe, it, expect, vi } from 'vitest';
import type { ComponentType } from 'react';
import { cleanup, render, fireEvent } from '@testing-library/react';
import { AiAttachmentsRenderer } from '../ai-attachments.js';
import { buildImageContentParts, type AiAttachment } from '../ai-attachments.js';
import { AiChatProvider } from '../../adapters/ai-chat-context.js';
import type { ChatMessageContentPart } from '../../engine/types.js';

afterEach(() => {
  cleanup();
});

// Registered renderers return `RendererRenderOutput`; cast to ComponentType so
// JSX accepts them in tests (same pattern as p1-renderers.test.tsx).
const Attachments = AiAttachmentsRenderer as unknown as ComponentType<Record<string, unknown>>;

function makeFile(name: string, opts: { type?: string; size?: number } = {}): File {
  const content = new Array(opts.size ?? 100).fill('x').join('');
  return new File([content], name, { type: opts.type ?? 'image/png' });
}

function harness(
  schemaProps: Record<string, unknown> = {},
  events: Record<string, (...args: unknown[]) => unknown> = {},
  sendMessage?: (c: string | ChatMessageContentPart[]) => Promise<void>,
) {
  const send = sendMessage ?? vi.fn(async () => undefined);
  return {
    send,
    ...render(
      <AiChatProvider
        value={{
          engine: {} as never,
          messages: [],
          requestState: 'idle',
          isProcessing: false,
          sendMessage: send,
          abortRequest: async () => undefined,
        }}
      >
        <Attachments props={schemaProps} meta={{ className: '', testid: '' }} regions={{}} events={events} path="/x" />
      </AiChatProvider>,
    ),
  };
}

describe('AiAttachmentsRenderer — picker + preview + remove', () => {
  it('adds files via the hidden input and previews them as images', () => {
    const { container } = harness();
    const input = container.querySelector('[data-slot="ai-attachments-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('a.png', { type: 'image/png' })] } });
    const thumbs = container.querySelectorAll('[data-slot="ai-attachments-thumb"]');
    expect(thumbs).toHaveLength(1);
  });

  it('removes an attachment when the remove button is clicked', () => {
    const { container } = harness();
    const input = container.querySelector('[data-slot="ai-attachments-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('a.png'), makeFile('b.png')] } });
    expect(container.querySelectorAll('[data-slot="ai-attachments-thumb"]')).toHaveLength(2);
    const removeButtons = container.querySelectorAll('[data-slot="ai-attachments-remove"]');
    fireEvent.click(removeButtons[0]);
    expect(container.querySelectorAll('[data-slot="ai-attachments-thumb"]')).toHaveLength(1);
  });

  it('renders card mode for non-image files', () => {
    const { container } = harness({ mode: 'card' });
    const input = container.querySelector('[data-slot="ai-attachments-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('doc.pdf', { type: 'application/pdf' })] } });
    const items = container.querySelectorAll('[data-slot="ai-attachments-item"]');
    expect(items).toHaveLength(1);
    // No thumbnail for non-image card mode.
    expect(container.querySelectorAll('[data-slot="ai-attachments-thumb"]')).toHaveLength(0);
    expect(container.querySelector('[data-slot="ai-attachments"]')?.getAttribute('data-mode')).toBe('card');
  });
});

describe('AiAttachmentsRenderer — validation Failure Paths', () => {
  it('attachment-too-large: rejects files over maxSize and fires onError', () => {
    const onError = vi.fn();
    const { container } = harness({ maxSize: 1000 }, { onError });
    const input = container.querySelector('[data-slot="ai-attachments-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('big.png', { size: 5000 })] } });
    expect(container.querySelectorAll('[data-slot="ai-attachments-thumb"]')).toHaveLength(0);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ reason: 'attachment-too-large' }));
  });

  it('attachment-too-many: rejects files beyond maxFiles and fires onError', () => {
    const onError = vi.fn();
    const { container } = harness({ maxFiles: 1 }, { onError });
    const input = container.querySelector('[data-slot="ai-attachments-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('a.png'), makeFile('b.png')] } });
    // Only one accepted.
    expect(container.querySelectorAll('[data-slot="ai-attachments-thumb"]')).toHaveLength(1);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ reason: 'attachment-too-many' }));
  });
});

describe('AiAttachmentsRenderer — drag and drop', () => {
  it('collects files from drop handler', () => {
    const { container } = harness();
    const drop = container.querySelector('[data-slot="ai-attachments"]') as HTMLDivElement;
    fireEvent.drop(drop, {
      dataTransfer: { files: [makeFile('dropped.png')] },
    });
    expect(container.querySelectorAll('[data-slot="ai-attachments-thumb"]')).toHaveLength(1);
  });
});

describe('AiAttachmentsRenderer — multimodal send', () => {
  it('upload assembles image_url parts and calls engine.sendMessage', async () => {
    const send = vi.fn(async () => undefined);
    const { container } = harness({}, {}, send);
    const input = container.querySelector('[data-slot="ai-attachments-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('a.png')] } });
    const uploadBtn = container.querySelector('[data-slot="ai-attachments-upload"]') as HTMLButtonElement;
    fireEvent.click(uploadBtn);
    await Promise.resolve();
    expect(send).toHaveBeenCalledTimes(1);
    const calls = (send as { mock: { calls: unknown[][] } }).mock.calls;
    const parts = calls[0]?.[0] as ChatMessageContentPart[] | undefined;
    expect(Array.isArray(parts)).toBe(true);
    expect(parts!.length).toBe(1);
    expect(parts![0]).toMatchObject({ type: 'image_url' });
    expect((parts![0] as { image_url: { url: string } }).image_url.url).toBeTruthy();
  });
});

describe('buildImageContentParts', () => {
  it('filters to image attachments and builds image_url parts', () => {
    const attachments: AiAttachment[] = [
      { id: '1', url: 'u1', contentType: 'image/png', name: 'a.png' },
      { id: '2', url: 'u2', contentType: 'application/pdf', name: 'b.pdf' },
      { id: '3', url: 'u3', name: 'c.jpg' },
    ];
    const parts = buildImageContentParts(attachments);
    expect(parts).toHaveLength(2);
    expect(parts.every((p) => p.type === 'image_url')).toBe(true);
  });
});
