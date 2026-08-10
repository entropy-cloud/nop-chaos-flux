import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { ComponentType } from 'react';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { AiConversationsRenderer } from '../ai-conversations.js';
import { createMockRendererProps } from '../../test-support.js';
import type { AiConversationsSchema } from '../../schemas.js';
import type { AiConversationInfo } from '../../engine/types.js';

resetFluxI18n();
initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
});

const Conversations = AiConversationsRenderer as unknown as ComponentType<Record<string, unknown>>;

// ============================================================================
// multi-audit P2-17 (plan 2026-08-10-1606-2): the current conversation item
// conveyed state only via `data-active` + border/background color. Screen
// readers need an explicit `aria-current` (WCAG 1.3.1 / 4.1.2).
// ============================================================================

describe('ai-conversations — current-item aria-current (multi-audit P2-17)', () => {
  function makeProps(conversations: AiConversationInfo[], activeId: string | null) {
    return createMockRendererProps<AiConversationsSchema>({
      schema: { type: 'ai-conversations' },
      props: {
        type: 'ai-conversations',
        conversations: conversations as never,
        activeId,
        showRenameControls: false,
      } as never,
    });
  }

  function renderWith(conversations: AiConversationInfo[], activeId: string | null) {
    return render(<Conversations {...(makeProps(conversations, activeId) as unknown as Record<string, unknown>)} />);
  }

  it('the active conversation item exposes aria-current="true"; inactive items omit it', () => {
    const convs: AiConversationInfo[] = [
      { id: 'c1', title: 'First', createdAt: 0, updatedAt: 0 },
      { id: 'c2', title: 'Second', createdAt: 0, updatedAt: 0 },
    ];
    const { container } = renderWith(convs, 'c2');

    const items = container.querySelectorAll('[data-slot="ai-conversations-item"]');
    expect(items.length).toBe(2);

    const active = Array.from(items).find((li) => li.getAttribute('data-id') === 'c2');
    const inactive = Array.from(items).find((li) => li.getAttribute('data-id') === 'c1');
    expect(active?.getAttribute('aria-current')).toBe('true');
    expect(inactive?.getAttribute('aria-current')).toBeNull();
  });

  it('aria-current tracks activeId changes across re-renders', () => {
    const convs: AiConversationInfo[] = [
      { id: 'c1', title: 'First', createdAt: 0, updatedAt: 0 },
      { id: 'c2', title: 'Second', createdAt: 0, updatedAt: 0 },
    ];
    const { container, rerender } = renderWith(convs, 'c1');
    const itemOf = (id: string) =>
      Array.from(container.querySelectorAll('[data-slot="ai-conversations-item"]')).find(
        (li) => li.getAttribute('data-id') === id,
      );
    expect(itemOf('c1')?.getAttribute('aria-current')).toBe('true');
    expect(itemOf('c2')?.getAttribute('aria-current')).toBeNull();

    rerender(<Conversations {...(makeProps(convs, 'c2') as unknown as Record<string, unknown>)} />);
    expect(itemOf('c1')?.getAttribute('aria-current')).toBeNull();
    expect(itemOf('c2')?.getAttribute('aria-current')).toBe('true');
  });
});
