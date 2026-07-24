import { afterEach, describe, it, expect, vi } from 'vitest';
import type { ComponentType } from 'react';
import { cleanup, render, fireEvent } from '@testing-library/react';
import { AiAttachmentsRenderer, type AiAttachment } from '../ai-attachments.js';
import { AiChatProvider } from '../../adapters/ai-chat-context.js';

afterEach(() => {
  cleanup();
});

const Attachments = AiAttachmentsRenderer as unknown as ComponentType<Record<string, unknown>>;

/**
 * Build two File objects that are indistinguishable by the pre-fix id scheme
 * (same name + size + lastModified) so a derived id would collide. O-4.
 */
function makeCollidingPair(): { a: File; b: File } {
  const content = new Array(64).fill('x').join('');
  const shared = { type: 'image/png', lastModified: 1700000000000 };
  return {
    a: new File([content], 'dup.png', shared),
    b: new File([content], 'dup.png', shared),
  };
}

function harness(events: Record<string, (...args: unknown[]) => unknown> = {}) {
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
      <Attachments props={{}} meta={{ className: '', testid: '' }} regions={{}} events={events} path="/x" />
    </AiChatProvider>,
  );
}

describe('AiAttachmentsRenderer — O-4 attachment id collision', () => {
  it('assigns distinct ids to two same-name/size/lastModified files', () => {
    const onChange = vi.fn();
    const { container } = harness({ onChange });
    const input = container.querySelector('[data-slot="ai-attachments-input"]') as HTMLInputElement;

    const { a, b } = makeCollidingPair();
    fireEvent.change(input, { target: { files: [a, b] } });

    expect(container.querySelectorAll('[data-slot="ai-attachments-thumb"]')).toHaveLength(2);
    // The change event carries the runtime attachments with their ids.
    const delivered = (onChange.mock.calls[0]?.[0] as { attachments?: AiAttachment[] } | undefined)
      ?.attachments ?? [];
    expect(delivered).toHaveLength(2);
    const ids = delivered.map((att) => att.id);
    expect(ids[0]).toBeTruthy();
    expect(ids[1]).toBeTruthy();
    // The core O-4 assertion: two seemingly-identical files get unique ids.
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('removing one of two colliding files leaves the other intact (no mis-delete)', () => {
    const onChange = vi.fn();
    const { container } = harness({ onChange });
    const input = container.querySelector('[data-slot="ai-attachments-input"]') as HTMLInputElement;

    const { a, b } = makeCollidingPair();
    fireEvent.change(input, { target: { files: [a, b] } });
    expect(container.querySelectorAll('[data-slot="ai-attachments-thumb"]')).toHaveLength(2);

    const firstDelivered = (onChange.mock.calls[0]?.[0] as { attachments?: AiAttachment[] })
      ?.attachments ?? [];
    const firstId = firstDelivered[0]?.id;
    const secondId = firstDelivered[1]?.id;

    // Remove the FIRST attachment; the second must survive (pre-fix both shared
    // one id so handleRemove filtered out both).
    const removeButtons = container.querySelectorAll('[data-slot="ai-attachments-remove"]');
    fireEvent.click(removeButtons[0]);

    expect(container.querySelectorAll('[data-slot="ai-attachments-thumb"]')).toHaveLength(1);
    const afterRemoval = (onChange.mock.calls[1]?.[0] as { attachments?: AiAttachment[] })
      ?.attachments ?? [];
    expect(afterRemovalHasOnly(afterRemoval, firstId, secondId)).toBe(true);
  });
});

function afterRemovalHasOnly(
  remaining: AiAttachment[],
  removedId: unknown,
  keptId: unknown,
): boolean {
  if (remaining.length !== 1) return false;
  if (remaining.some((att) => att.id === removedId)) return false;
  return remaining.some((att) => att.id === keptId);
}
