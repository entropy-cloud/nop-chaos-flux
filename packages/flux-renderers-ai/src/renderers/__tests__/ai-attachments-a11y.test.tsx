import { afterEach, describe, it, expect, vi } from 'vitest';
import type { ComponentType } from 'react';
import { cleanup, render, fireEvent } from '@testing-library/react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { AiAttachmentsRenderer } from '../ai-attachments.js';
import { AiChatProvider } from '../../adapters/ai-chat-context.js';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const Attachments = AiAttachmentsRenderer as unknown as ComponentType<Record<string, unknown>>;

function makeFile(name: string, opts: { type?: string; size?: number } = {}): File {
  const content = new Array(opts.size ?? 100).fill('x').join('');
  return new File([content], name, { type: opts.type ?? 'image/png' });
}

function harness(schemaProps: Record<string, unknown> = {}) {
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
        events={{}}
        path="/x"
        node={{ scope: undefined }}
      />
    </AiChatProvider>,
  );
}

describe('11-01 ai-attachments container must not masquerade as a button', () => {
  it('renders the container without role="button" / tabIndex / aria-label (drop surface is a plain region)', () => {
    const { container } = harness();
    const root = container.querySelector('[data-slot="ai-attachments"]') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.getAttribute('role')).not.toBe('button');
    expect(root.hasAttribute('tabindex')).toBe(false);
    expect(root.getAttribute('aria-label')).toBeNull();
  });

  it('Enter/Space on the container does not hijack the hidden input click; the pick button still activates it', () => {
    const clickSpy = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(function (this: HTMLInputElement) {
        // no-op: keep the hidden file input inert in tests
        void this;
      });
    const { container } = harness();
    const root = container.querySelector('[data-slot="ai-attachments"]') as HTMLElement;
    const input = container.querySelector('[data-slot="ai-attachments-input"]') as HTMLInputElement;
    const pickButton = container.querySelector('[data-slot="ai-attachments-pick"]') as HTMLElement;

    clickSpy.mockClear();
    fireEvent.keyDown(root, { key: 'Enter' });
    fireEvent.keyDown(root, { key: ' ' });
    expect(clickSpy).not.toHaveBeenCalled();

    fireEvent.click(pickButton);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    void input;
  });
});

describe('20-06 ai-attachments image remove button focus visibility (WCAG 2.4.7)', () => {
  it('keeps the image-mode remove button visible on keyboard focus (focus-visible:opacity-100)', () => {
    const { container } = harness();
    const input = container.querySelector('[data-slot="ai-attachments-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('a.png')] } });

    const removeButton = container.querySelector(
      '[data-slot="ai-attachments-remove"]',
    ) as HTMLElement;
    expect(removeButton).toBeTruthy();
    const className = removeButton.getAttribute('class') ?? '';
    expect(className).toContain('opacity-0');
    expect(className).toContain('group-hover:opacity-100');
    expect(className).toContain('focus-visible:opacity-100');
  });
});
