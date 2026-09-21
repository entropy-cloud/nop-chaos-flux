import { afterEach, describe, it, expect, vi } from 'vitest';
import type { ComponentType } from 'react';
import { cleanup, render, fireEvent, waitFor } from '@testing-library/react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { AiAttachmentsRenderer } from '../ai-attachments.js';
import { AiChatProvider } from '../../adapters/ai-chat-context.js';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
});

// G5-R3-视角5-01: the attachments "send" action was not a closed loop —
// (1) non-image attachments silently no-op'd on send (buildImageContentParts
// filtered everything out), and (2) a successful send left the list intact so
// the same batch could be re-sent. Mirror the ai-sender clearOnSubmit closure:
// send-disabled + visible note when nothing is sendable, list cleared after a
// successful send.

const Attachments = AiAttachmentsRenderer as unknown as ComponentType<Record<string, unknown>>;

function makeFile(name: string, size = 10, type = 'image/png'): File {
  const content = new Array(size).fill('x').join('');
  return new File([content], name, { type });
}

function harness(
  schemaProps: Record<string, unknown> = {},
  events: Record<string, (...args: unknown[]) => unknown> = {},
  sendMessage = vi.fn(async () => undefined),
) {
  const renderResult = render(
    <AiChatProvider
      value={{
        engine: {} as never,
        messages: [],
        requestState: 'idle',
        isProcessing: false,
        sendMessage,
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
  return { ...renderResult, sendMessage };
}

function pickInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('[data-slot="ai-attachments-input"]') as HTMLInputElement;
}

function sendButton(container: HTMLElement): HTMLButtonElement {
  return container.querySelector('[data-slot="ai-attachments-upload"]') as HTMLButtonElement;
}

describe('AiAttachmentsRenderer — send loop closure (G5-R3-视角5-01)', () => {
  it('non-image-only list: send is disabled and a visible note explains why (no silent no-effect)', () => {
    const { container, sendMessage } = harness();
    fireEvent.change(pickInput(container), {
      target: { files: [makeFile('doc.pdf', 10, 'application/pdf')] },
    });
    const send = sendButton(container);
    expect(send).toBeTruthy();
    expect(send.disabled).toBe(true);
    const note = container.querySelector('[data-slot="ai-attachments-send-blocked"]');
    expect(note).not.toBeNull();
    expect(note?.textContent).toBe('Only image attachments can be sent');
    // Even an imperative click must not dispatch a message.
    fireEvent.click(send);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('image list: send stays enabled with no blocked note', () => {
    const { container } = harness();
    fireEvent.change(pickInput(container), { target: { files: [makeFile('a.png')] } });
    expect(sendButton(container).disabled).toBe(false);
    expect(container.querySelector('[data-slot="ai-attachments-send-blocked"]')).toBeNull();
  });

  it('mixed list keeps send enabled (image part present) and clears the list after send', async () => {
    const onChange = vi.fn();
    const { container, sendMessage } = harness({}, { onChange });
    fireEvent.change(pickInput(container), {
      target: { files: [makeFile('a.png'), makeFile('doc.pdf', 10, 'application/pdf')] },
    });
    expect(sendButton(container).disabled).toBe(false);
    fireEvent.click(sendButton(container));
    await waitFor(() =>
      expect(container.querySelector('[data-slot="ai-attachments-list"]')).toBeNull(),
    );
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const changePayloads = onChange.mock.calls.map((call) => call[0]) as Array<{
      attachments: unknown[];
    }>;
    expect(changePayloads.at(-1)).toMatchObject({ type: 'ai:attachments-change', attachments: [] });
  });

  it('successful send clears the list so the same batch cannot be re-sent', async () => {
    const { container, sendMessage } = harness();
    fireEvent.change(pickInput(container), { target: { files: [makeFile('a.png'), makeFile('b.png')] } });
    expect(container.querySelectorAll('[data-slot="ai-attachments-item"]')).toHaveLength(2);
    fireEvent.click(sendButton(container));
    await waitFor(() =>
      expect(container.querySelector('[data-slot="ai-attachments-list"]')).toBeNull(),
    );
    expect(sendMessage).toHaveBeenCalledTimes(1);
    // Send button is gone with the emptied list (no duplicate-send path).
    expect(container.querySelector('[data-slot="ai-attachments-upload"]')).toBeNull();
  });
});
