import { afterEach, describe, it, expect, vi } from 'vitest';
import type { ComponentType } from 'react';
import { cleanup, render, fireEvent } from '@testing-library/react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { AiAttachmentsRenderer } from '../ai-attachments.js';
import { buildImageContentParts, type AiAttachment } from '../ai-attachments.js';
import { AiChatProvider } from '../../adapters/ai-chat-context.js';
import type { ChatMessageContentPart } from '../../engine/types.js';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

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
        <Attachments
          props={schemaProps}
          meta={{ className: '', testid: '' }}
          regions={{}}
          events={events}
          path="/x"
          node={{ scope: undefined }}
        />
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
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'attachment-too-large' }),
      expect.anything(),
    );
  });

  it('attachment-too-many: rejects files beyond maxFiles and fires onError', () => {
    const onError = vi.fn();
    const { container } = harness({ maxFiles: 1 }, { onError });
    const input = container.querySelector('[data-slot="ai-attachments-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('a.png'), makeFile('b.png')] } });
    // Only one accepted.
    expect(container.querySelectorAll('[data-slot="ai-attachments-thumb"]')).toHaveLength(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'attachment-too-many' }),
      expect.anything(),
    );
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

  it('upload fires onUpload with the full attachment list payload (C8.2)', async () => {
    const onUpload = vi.fn();
    const { container } = harness({}, { onUpload });
    const input = container.querySelector('[data-slot="ai-attachments-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('a.png'), makeFile('b.png')] } });
    const uploadBtn = container.querySelector('[data-slot="ai-attachments-upload"]') as HTMLButtonElement;
    fireEvent.click(uploadBtn);
    await Promise.resolve();
    expect(onUpload).toHaveBeenCalledTimes(1);
    const [payload] = onUpload.mock.calls[0] as unknown[];
    expect(payload).toMatchObject({
      type: 'ai:attachments-upload',
      attachments: [
        expect.objectContaining({ name: 'a.png' }),
        expect.objectContaining({ name: 'b.png' }),
      ],
    });
  });

  it('validation onError carries the dispatch ctx (C8.2, CX-10 family)', () => {
    const onError = vi.fn();
    const { container } = harness({ maxSize: 1000 }, { onError });
    const input = container.querySelector('[data-slot="ai-attachments-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('big.png', { size: 5000 })] } });
    const [payload, ctx] = onError.mock.calls[0] as unknown[];
    expect(payload).toMatchObject({ type: 'ai:attachments-error', reason: 'attachment-too-large' });
    expect(ctx).toMatchObject({
      event: payload,
      evaluationBindings: expect.objectContaining({ reason: 'attachment-too-large' }),
    });
  });

  it('onChange fires with the attachment list payload + dispatch ctx (C8.2, CX-10 family)', () => {
    const onChange = vi.fn();
    const { container } = harness({}, { onChange });
    const input = container.querySelector('[data-slot="ai-attachments-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('a.png')] } });
    const [payload, ctx] = onChange.mock.calls[0] as unknown[];
    expect(payload).toMatchObject({ type: 'ai:attachments-change' });
    expect((payload as { attachments: unknown[] }).attachments).toHaveLength(1);
    expect(ctx).toMatchObject({
      event: payload,
      evaluationBindings: expect.objectContaining({ attachments: expect.any(Array) }),
    });
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

// ============================================================================
// AI-10 (resource lifecycle): object URLs created locally must be revoked on
// remove and on unmount (no blob memory leak).
// ============================================================================

describe('AiAttachmentsRenderer — AI-10 object URL lifecycle', () => {
  it('revokes the object URL when an attachment is removed', () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
    const { container } = harness();
    const input = container.querySelector('[data-slot="ai-attachments-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('a.png'), makeFile('b.png')] } });
    expect(container.querySelectorAll('[data-slot="ai-attachments-thumb"]')).toHaveLength(2);

    revokeSpy.mockClear();
    const removeButtons = container.querySelectorAll('[data-slot="ai-attachments-remove"]');
    fireEvent.click(removeButtons[0]);

    expect(revokeObjectURLCallsFor(revokeSpy).length).toBeGreaterThanOrEqual(1);
    revokeSpy.mockRestore();
  });

  it('revokes every locally-created object URL on unmount', () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
    const { container, unmount } = harness();
    const input = container.querySelector('[data-slot="ai-attachments-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('a.png'), makeFile('b.png'), makeFile('c.png')] } });
    expect(container.querySelectorAll('[data-slot="ai-attachments-thumb"]')).toHaveLength(3);

    revokeSpy.mockClear();
    unmount();

    expect(revokeObjectURLCallsFor(revokeSpy).length).toBe(3);
    revokeSpy.mockRestore();
  });
});

function revokeObjectURLCallsFor(spy: ReturnType<typeof vi.spyOn>): unknown[] {
  return spy.mock.calls;
}

// ============================================================================
// C8.2 P1-2: attachment `status` (uploading/error) must be visible (four-state
// contract, renderers.md §9.1 model). Host-driven status is exercised via the
// controlled `value` prop.
// ============================================================================

describe('AiAttachmentsRenderer — status rendering (C8.2 P1-2)', () => {
  function controlledHarness(value: unknown[]) {
    return harness(
      { value: [{ id: 'c1', url: 'https://host/img.png', name: 'remote.png', contentType: 'image/png' } as never, ...value] },
      {},
    );
  }

  it('renders data-status=error with failure copy for an errored attachment', () => {
    const { container } = controlledHarness([
      { id: 'e1', url: 'blob:x', name: 'failed.pdf', contentType: 'application/pdf', status: 'error' },
    ]);
    const items = container.querySelectorAll('[data-slot="ai-attachments-item"]');
    expect(items).toHaveLength(2);
    const errored = items[1] as HTMLElement;
    expect(errored.getAttribute('data-status')).toBe('error');
    expect(errored.textContent).toContain('failed');
    expect(errored.textContent).toContain('Upload failed');
  });

  it('renders data-status=uploading with pending copy for an uploading attachment', () => {
    const { container } = controlledHarness([
      { id: 'u1', url: 'blob:x', name: 'doc.pdf', contentType: 'application/pdf', status: 'uploading' },
    ]);
    const items = container.querySelectorAll('[data-slot="ai-attachments-item"]');
    const uploading = items[1] as HTMLElement;
    expect(uploading.getAttribute('data-status')).toBe('uploading');
    expect(uploading.textContent).toContain('Uploading');
  });

  it('image-mode item carries data-status for error too', () => {
    const { container } = controlledHarness([
      { id: 'e2', url: 'blob:x', name: 'bad.png', contentType: 'image/png', status: 'error' },
    ]);
    const items = container.querySelectorAll('[data-slot="ai-attachments-item"]');
    expect(items).toHaveLength(2);
    const errored = items[1] as HTMLElement;
    // mode auto → all images → image mode with 2 thumbs.
    expect(errored.getAttribute('data-status')).toBe('error');
    expect(errored.textContent).toContain('Upload failed');
  });
});

// ============================================================================
// C8.2 dim 18 safety regression: attachment URLs are only ever rendered as
// <img src> (never as executable anchors) and file names render as React text
// nodes (never as markup).
// ============================================================================

describe('AiAttachmentsRenderer — URL / file-name safety (C8.2 dim 18)', () => {
  it('javascript: URL in a controlled image value never becomes an anchor', () => {
    const { container } = harness({
      value: [
        {
          id: 'x1',
          url: 'javascript:alert(1)',
          name: 'evil.png',
          contentType: 'image/png',
        },
      ] as never,
    });
    // Rendered only as an <img> (auto mode, image mime) — no <a> anywhere.
    const thumb = container.querySelector('[data-slot="ai-attachments-thumb"]') as HTMLImageElement;
    expect(thumb).not.toBeNull();
    expect(thumb.getAttribute('src')).toBe('javascript:alert(1)');
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('[href]')).toBeNull();
  });

  it('a malicious file name renders as escaped text in card mode, not markup', () => {
    const { container } = harness({
      value: [
        {
          id: 'x2',
          url: 'https://host/f.pdf',
          // `.pdf` → card mode: the name renders as a React text node.
          name: '<img src=x onerror=alert(1)>.pdf',
          contentType: 'application/pdf',
        },
      ] as never,
    });
    const item = container.querySelector('[data-slot="ai-attachments-item"]') as HTMLElement;
    expect(item.textContent).toContain('<img src=x onerror=alert(1)>.pdf');
    // The injected markup must never materialize as elements.
    expect(container.querySelector('img[onerror]')).toBeNull();
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });

  it('a malicious name ending in an image extension only reaches the img alt (image mode)', () => {
    const { container } = harness({
      value: [
        {
          id: 'x3',
          url: 'https://host/f.png',
          name: '<img src=x onerror=alert(1)>.png',
          contentType: 'image/png',
        },
      ] as never,
    });
    const thumb = container.querySelector('[data-slot="ai-attachments-thumb"]') as HTMLImageElement;
    expect(thumb).not.toBeNull();
    // The name is rendered as the `alt` text attribute — never parsed as markup.
    expect(thumb.getAttribute('alt')).toBe('<img src=x onerror=alert(1)>.png');
    expect(container.querySelector('img[onerror]')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
  });
});
