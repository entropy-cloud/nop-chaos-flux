import { useState } from 'react';
import type { RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import { Button, Input, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { ActionContext, FluxActionEvent, ScopeRef } from '@nop-chaos/flux-core';
import type { AiConversationInfo } from '../engine/types.js';
import type { AiConversationsSchema } from '../schemas.js';

/**
 * ai-conversations (Widget, P1): conversation list sidebar (new/switch/rename/
 * delete). Marker `nop-ai-conversations`. Reads `conversations` and
 * `activeId` from resolved props (host provides via schema expressions,
 * scope-owned per design.md §11.5). All mutations fire schema events — the
 * renderer itself owns no list state (design.md §5.1).
 */
export function AiConversationsRenderer(
  props: RendererComponentProps<AiConversationsSchema>,
): RendererRenderOutput {
  const resolved = props.props;
  const conversations = normalizeConversations(resolved.conversations);
  const activeId = typeof resolved.activeId === 'string' ? (resolved.activeId as string) : null;
  const showRenameControls = resolved.showRenameControls !== false;
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  // C8.1 P1 (bug 83 family convention): pass `{ event, evaluationBindings,
  // scope }` as the second dispatch arg so action-args templates can read the
  // payload keys (`${id}`, `${conversation.title}`, `${title}`).
  const dispatchCtx = (payload: Record<string, unknown>): Partial<ActionContext> => ({
    event: payload as FluxActionEvent,
    evaluationBindings: payload,
    scope: props.node.scope as ScopeRef | undefined,
  });

  function commitRename() {
    if (renamingId && draftTitle.trim().length > 0) {
      const payload = { type: 'ai:conversation-rename', id: renamingId, title: draftTitle.trim() };
      void props.events.onItemRename?.(payload, dispatchCtx(payload));
    }
    setRenamingId(null);
    setDraftTitle('');
  }

  return (
    <aside
      className={cn('nop-ai-conversations flex flex-col gap-2', props.meta.className)}
      data-slot="ai-conversations"
      data-cid={props.meta.cid || undefined}
      data-testid={props.meta.testid || undefined}
    >
      <div data-slot="ai-conversations-header" className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-slot="ai-conversations-create"
          onClick={() => {
            const payload = { type: 'ai:conversation-create' };
            void props.events.onCreate?.(payload, dispatchCtx(payload));
          }}
        >
          {t('flux.ai.newConversation')}
        </Button>
      </div>
      <ul data-slot="ai-conversations-list" className="flex flex-col gap-1">
        {conversations.map((conv) => {
          const isActive = conv.id === activeId;
          const isRenaming = renamingId === conv.id;
          return (
            <li
              key={conv.id}
              data-slot="ai-conversations-item"
              data-id={conv.id}
              data-active={isActive ? '' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm',
                isActive ? 'border-primary bg-accent' : 'border-transparent hover:bg-accent/50',
              )}
            >
              {isRenaming ? (
                <Input
                  value={draftTitle}
                  data-slot="ai-conversations-rename-input"
                  aria-label={t('flux.ai.renameConversation')}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    else if (e.key === 'Escape') {
                      setRenamingId(null);
                      setDraftTitle('');
                    }
                  }}
                />
              ) : (
                <Button
                  variant="ghost"
                  data-slot="ai-conversations-item-button"
                  className="flex-1 justify-start text-left"
                  onClick={() => {
                    const payload = { type: 'ai:conversation-click', id: conv.id, conversation: conv };
                    void props.events.onItemClick?.(payload, dispatchCtx(payload));
                  }}
                >
                  {conv.title?.trim() || t('flux.ai.emptyConversationTitle')}
                </Button>
              )}

              {showRenameControls && !isRenaming ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-slot="ai-conversations-rename"
                    aria-label={t('flux.ai.renameConversation')}
                    onClick={() => {
                      setRenamingId(conv.id);
                      setDraftTitle(conv.title ?? '');
                    }}
                  >
                    ✎
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-slot="ai-conversations-delete"
                    aria-label={t('flux.ai.deleteConversation')}
                    onClick={() => {
                      const payload = { type: 'ai:conversation-delete', id: conv.id };
                      void props.events.onItemDelete?.(payload, dispatchCtx(payload));
                    }}
                  >
                    ×
                  </Button>
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function normalizeConversations(value: unknown): AiConversationInfo[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (x): x is AiConversationInfo => typeof x === 'object' && x !== null && 'id' in x,
  );
}
