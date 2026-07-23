import { useState } from 'react';
import { Check, Pencil } from 'lucide-react';
import { Button, Textarea, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { useAiChatContext } from '../../adapters/ai-chat-context.js';
import type { ChatMessage, MessageEngine } from '../../engine/types.js';

function extractText(message: ChatMessage): string {
  const content = message.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((p) => (p && typeof p === 'object' && 'text' in p ? String((p as { text: unknown }).text) : ''))
      .join('');
  }
  return '';
}

export interface UserMessageActionsProps {
  message: ChatMessage;
  /** Notified when edit mode toggles, so the bubble can hide its content. */
  onEditingChange?: (editing: boolean) => void;
}

/**
 * User-message edit affordance (design.md §4.7 / §11.5). Renders a pencil
 * toggle; in edit mode shows a textarea + resubmit. Resubmit truncates the
 * conversation at the edited message (removing it and all later messages) and
 * re-sends the new text, regenerating the assistant reply.
 *
 * Only active inside an `ai-chat` (relies on `useAiChatContext`); renders
 * nothing when used standalone.
 */
export function UserMessageActions({ message, onEditingChange }: UserMessageActionsProps): React.ReactElement | null {
  const ctx = useAiChatContext();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const engine: MessageEngine | undefined = ctx?.engine;
  if (!engine) return null;
  // Explicitly-typed alias so nested closures keep the non-undefined type.
  const e: MessageEngine = engine;

  function startEdit() {
    setDraft(extractText(message));
    setEditing(true);
    onEditingChange?.(true);
  }

  function cancelEdit() {
    setEditing(false);
    onEditingChange?.(false);
  }

  async function resubmit() {
    const text = draft.trim();
    if (text.length === 0) return;
    const msgs = e.getMessages();
    const idx = msgs.findIndex((m) => m.id === message.id);
    if (idx < 0) {
      cancelEdit();
      return;
    }
    // Truncate the edited message and everything after, then re-send the new
    // text so the engine regenerates the assistant reply.
    e.setMessages(msgs.slice(0, idx));
    cancelEdit();
    await e.sendMessage(text);
  }

  if (editing) {
    return (
      <div data-slot="ai-bubble-edit" className={cn('flex flex-col gap-2')}>
        <Textarea
          data-slot="ai-bubble-edit-input"
          value={draft}
          rows={2}
          onChange={(e) => setDraft(e.target.value)}
          className="min-h-[60px]"
        />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" data-slot="ai-bubble-edit-cancel" onClick={cancelEdit}>
            {t('flux.ai.stop')}
          </Button>
          <Button size="sm" data-slot="ai-bubble-edit-submit" onClick={() => void resubmit()}>
            <Check className="h-3 w-3" />
            {t('flux.ai.send')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="self-end opacity-60 hover:opacity-100"
      data-slot="ai-bubble-edit-toggle"
      aria-label={t('flux.ai.copy')}
      onClick={startEdit}
    >
      <Pencil className="h-3 w-3" />
    </Button>
  );
}
