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
}

/**
 * User-message edit affordance (design.md §4.7 / §11.5). Renders a pencil
 * toggle; in edit mode shows a textarea + resubmit. Resubmit truncates the
 * conversation at the edited message (removing it and all later messages) and
 * re-sends the new text, regenerating the assistant reply.
 *
 * Editing state (flag + draft) is engine-held (`message.state.editing`, written
 * via `engine.setMessageEditing`) so A-8 virtual recycling cannot drop it. The
 * `message` prop is the engine snapshot supplied by the parent (`ai-message-list`
 * subscribes to the engine and passes fresh snapshots).
 *
 * Only active inside an `ai-chat` (relies on `useAiChatContext`); renders
 * nothing when used standalone.
 */
export function UserMessageActions({ message }: UserMessageActionsProps): React.ReactElement | null {
  const ctx = useAiChatContext();
  const editingState = message.state?.editing;
  const editing = editingState?.active === true;
  const draft = editingState?.draft ?? '';

  const engine: MessageEngine | undefined = ctx?.engine;
  if (!engine) return null;
  // Explicitly-typed alias so nested closures keep the non-undefined type.
  const e: MessageEngine = engine;

  function startEdit() {
    e.setMessageEditing(message.id, { active: true, draft: extractText(message) });
  }

  function cancelEdit() {
    e.setMessageEditing(message.id, { active: false });
  }

  async function resubmit() {
    // P1-1: never re-send while a turn is streaming — the engine would drop
    // the request silently (runTurn's isProcessing guard). Keep the editor
    // open + draft intact so nothing is lost (Failure Path FP-3). The pencil
    // button is also disabled while processing; this guards the submit button
    // + any keyboard-driven activation.
    if (e.getState().isProcessing) return;
    const text = draft.trim();
    if (text.length === 0) return;
    const msgs = e.getMessages();
    const idx = msgs.findIndex((m) => m.id === message.id);
    if (idx < 0) return;
    // Clear editing state on this message before truncating it away (defensive
    // — Failure Path edit-resubmit-clear). The truncate below removes the
    // message entirely, but the explicit clear keeps the snapshot consistent
    // for any subscriber that observed the editing flag mid-flight.
    e.setMessageEditing(message.id, null);
    // Truncate the edited message and everything after, then re-send the new
    // text so the engine regenerates the assistant reply.
    e.setMessages(msgs.slice(0, idx));
    await e.sendMessage(text);
  }

  if (editing) {
    return (
      <div data-slot="ai-bubble-edit" className={cn('flex flex-col gap-2')}>
        <Textarea
          data-slot="ai-bubble-edit-input"
          value={draft}
          rows={2}
          onChange={(ev) => e.setMessageEditing(message.id, { active: true, draft: ev.target.value })}
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
      aria-label={t('flux.ai.editMessage')}
      disabled={ctx?.isProcessing ?? false}
      onClick={startEdit}
    >
      <Pencil className="h-3 w-3" />
    </Button>
  );
}
