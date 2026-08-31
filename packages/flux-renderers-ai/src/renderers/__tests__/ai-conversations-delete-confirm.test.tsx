import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

// [G5-视角10-01] (R2 consistency audit, P0): deleting a conversation used to be
// one click straight to the physical storage delete (session-delete-confirm).
// It must require an explicit destructive confirmation first.

function makeProps(onItemDelete: ReturnType<typeof vi.fn>) {
  const conversations: AiConversationInfo[] = [
    { id: 'c1', title: 'First', createdAt: 0, updatedAt: 0 },
    { id: 'c2', title: 'Second', createdAt: 0, updatedAt: 0 },
  ];
  return createMockRendererProps<AiConversationsSchema>({
    schema: { type: 'ai-conversations' },
    props: {
      type: 'ai-conversations',
      conversations: conversations as never,
      activeId: 'c1',
      showRenameControls: true,
    } as never,
    events: {
      onItemDelete: onItemDelete as never,
    },
  });
}

function deleteButtonOf(title: string): HTMLButtonElement {
  const item = screen.getByText(title).closest('li')!;
  return item.querySelector('[data-slot="ai-conversations-delete"]') as HTMLButtonElement;
}

describe('[G5-视角10-01] conversation delete requires confirmation (session-delete-confirm)', () => {
  it('does not dispatch the delete event when the delete button is clicked', () => {
    const onItemDelete = vi.fn();
    render(<Conversations {...(makeProps(onItemDelete) as unknown as Record<string, unknown>)} />);

    fireEvent.click(deleteButtonOf('First'));

    expect(onItemDelete).not.toHaveBeenCalled();
  });

  it('shows a destructive confirmation dialog after the delete click', () => {
    const onItemDelete = vi.fn();
    render(<Conversations {...(makeProps(onItemDelete) as unknown as Record<string, unknown>)} />);

    fireEvent.click(deleteButtonOf('First'));

    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(screen.getByRole('button', { name: /delete conversation/i })).toBeTruthy();
  });

  it('cancel keeps the conversation', () => {
    const onItemDelete = vi.fn();
    render(<Conversations {...(makeProps(onItemDelete) as unknown as Record<string, unknown>)} />);

    fireEvent.click(deleteButtonOf('First'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onItemDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByText('First')).toBeTruthy();
  });

  it('only dispatches the delete after explicit confirmation, with the right payload', () => {
    const onItemDelete = vi.fn();
    render(<Conversations {...(makeProps(onItemDelete) as unknown as Record<string, unknown>)} />);

    fireEvent.click(deleteButtonOf('First'));
    fireEvent.click(screen.getByRole('button', { name: /delete conversation/i }));

    expect(onItemDelete).toHaveBeenCalledTimes(1);
    const [payload] = onItemDelete.mock.calls[0]!;
    expect(payload.type).toBe('ai:conversation-delete');
    expect(payload.id).toBe('c1');
  });

  it('confirmation targets the conversation whose delete button was clicked', () => {
    const onItemDelete = vi.fn();
    render(<Conversations {...(makeProps(onItemDelete) as unknown as Record<string, unknown>)} />);

    fireEvent.click(deleteButtonOf('Second'));
    fireEvent.click(screen.getByRole('button', { name: /delete conversation/i }));

    const [payload] = onItemDelete.mock.calls[0]!;
    expect(payload.id).toBe('c2');
  });
});
