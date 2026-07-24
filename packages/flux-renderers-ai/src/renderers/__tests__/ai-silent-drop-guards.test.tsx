import { afterEach, describe, it, expect, vi } from 'vitest';
import type { ComponentType } from 'react';
import { cleanup, render, fireEvent, act } from '@testing-library/react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { AiChatProvider } from '../../adapters/ai-chat-context.js';
import { AiSenderView } from '../ai-sender.js';
import { AiAttachmentsRenderer } from '../ai-attachments.js';
import type { ChatMessageContentPart } from '../../engine/types.js';
import type { AiSenderExtensionProps } from '../../schemas.js';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
});

/**
 * Stub extension component that fires `onSubmit` without gating on `loading`
 * (mimics a host senderExtensions that forgot to disable its Enter handler).
 * Used to verify the commit() guard catches the silent-drop path even when
 * the extension component itself does not self-disable.
 */
function UnguardedStub(props: AiSenderExtensionProps): React.ReactElement | null {
  return (
    <textarea
      data-testid="stub-extension"
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          props.onSubmit();
        }
      }}
    />
  );
}

function Harness({
  isProcessing,
  sendMessage,
  children,
}: {
  isProcessing: boolean;
  sendMessage: (c: string | ChatMessageContentPart[]) => Promise<void>;
  children: React.ReactNode;
}) {
  return (
    <AiChatProvider
      value={{
        engine: {} as never,
        messages: [],
        requestState: isProcessing ? 'processing' : 'idle',
        isProcessing,
        sendMessage,
        abortRequest: async () => undefined,
      }}
    >
      {children}
    </AiChatProvider>
  );
}

describe('FP sender-commit-stream — commit() guards isProcessing', () => {
  it('host extension onSubmit during streaming: draft preserved, sendMessage NOT called', async () => {
    const sendMessage = vi.fn(async () => undefined);
    const { getByTestId } = render(
      <Harness isProcessing={true} sendMessage={sendMessage}>
        <AiSenderView extensionComponent={UnguardedStub as ComponentType<AiSenderExtensionProps>} clearOnSubmit />
      </Harness>,
    );
    const stub = getByTestId('stub-extension') as HTMLTextAreaElement;
    fireEvent.change(stub, { target: { value: 'streaming text' } });

    await act(async () => {
      fireEvent.keyDown(stub, { key: 'Enter' });
    });

    // Guard fired: no silent drop.
    expect(sendMessage).not.toHaveBeenCalled();
    // Draft is preserved (commit() early-returned before setDraft('')).
    expect(stub.value).toBe('streaming text');
  });

  it('commit() proceeds when idle (no over-block regression)', async () => {
    const sendMessage = vi.fn(async () => undefined);
    const { getByTestId } = render(
      <Harness isProcessing={false} sendMessage={sendMessage}>
        <AiSenderView extensionComponent={UnguardedStub as ComponentType<AiSenderExtensionProps>} clearOnSubmit />
      </Harness>,
    );
    const stub = getByTestId('stub-extension') as HTMLTextAreaElement;
    fireEvent.change(stub, { target: { value: 'idle text' } });

    await act(async () => {
      fireEvent.keyDown(stub, { key: 'Enter' });
    });

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith('idle text');
  });
});

describe('FP attachments-upload-stream — upload button + handleUpload guard', () => {
  const Attachments = AiAttachmentsRenderer as unknown as ComponentType<Record<string, unknown>>;

  function makeFile(name: string): File {
    return new File([new Array(100).fill('x').join('')], name, { type: 'image/png' });
  }

  function attachmentsHarness(
    schemaProps: Record<string, unknown>,
    isProcessing: boolean,
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
            requestState: isProcessing ? 'processing' : 'idle',
            isProcessing,
            sendMessage: send,
            abortRequest: async () => undefined,
          }}
        >
          <Attachments props={schemaProps} meta={{ className: '', testid: '' }} regions={{}} events={{}} path="/x" />
        </AiChatProvider>,
      ),
    };
  }

  it('upload button is disabled while streaming', () => {
    const { container } = attachmentsHarness({}, true);
    const input = container.querySelector('[data-slot="ai-attachments-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('a.png')] } });
    const upload = container.querySelector('[data-slot="ai-attachments-upload"]') as HTMLButtonElement;
    expect(upload).toBeTruthy();
    expect(upload.disabled).toBe(true);
  });

  it('upload button is enabled when idle (no regression)', () => {
    const { container } = attachmentsHarness({}, false);
    const input = container.querySelector('[data-slot="ai-attachments-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('a.png')] } });
    const upload = container.querySelector('[data-slot="ai-attachments-upload"]') as HTMLButtonElement;
    expect(upload.disabled).toBe(false);
  });

  it('handleUpload during streaming: sendMessage NOT called (no silent multimodal drop)', async () => {
    const send = vi.fn(async () => undefined);
    const { container } = attachmentsHarness({}, true, send);
    const input = container.querySelector('[data-slot="ai-attachments-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('a.png')] } });
    const upload = container.querySelector('[data-slot="ai-attachments-upload"]') as HTMLButtonElement;

    await act(async () => {
      // Even though the button is disabled, the guard must also catch an
      // imperative click (e.g. host code dispatching click()).
      fireEvent.click(upload);
    });
    // Wait a microtask in case handleUpload's await reached sendMessage.
    await Promise.resolve();
    await Promise.resolve();
    expect(send).not.toHaveBeenCalled();
  });

  it('handleUpload proceeds when idle (no over-block regression)', async () => {
    const send = vi.fn(async () => undefined);
    const { container } = attachmentsHarness({}, false, send);
    const input = container.querySelector('[data-slot="ai-attachments-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('a.png')] } });
    const upload = container.querySelector('[data-slot="ai-attachments-upload"]') as HTMLButtonElement;

    await act(async () => {
      fireEvent.click(upload);
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(send).toHaveBeenCalledTimes(1);
  });
});
