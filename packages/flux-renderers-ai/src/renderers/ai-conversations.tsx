import { useMemo, useState } from 'react';
import type { RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Input,
  cn,
} from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { Pencil, Plus, X } from 'lucide-react';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { buildDispatchCtx } from './dispatch-ctx.js';
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
  // P2-5 (2026-08-10 multi-audit): node-level `meta.disabled` control —
  // disables create / item / rename / delete (cross-package contract).
  const disabled = props.meta.disabled === true;
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  // [G5-视角10-01] conversation delete is an irreversible storage-level delete —
  // the click only arms a destructive confirmation; the event dispatches after
  // explicit confirmation (session-delete-confirm).
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  // plan 529 Phase 4：会话检索（标题子串，大小写不敏感）+ 空结果态
  const [query, setQuery] = useState('');
  const filteredConversations = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return conversations;
    return conversations.filter((conv) => (conv.title ?? '').toLowerCase().includes(needle));
  }, [conversations, query]);
  const isFiltering = query.trim().length > 0;

  function commitRename() {
    if (disabled) return;
    if (renamingId && draftTitle.trim().length > 0) {
      const payload = { type: 'ai:conversation-rename', id: renamingId, title: draftTitle.trim() };
      void props.events.onItemRename?.(payload, buildDispatchCtx(payload, props.node.scope as ScopeRef | undefined));
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
          disabled={disabled}
          onClick={() => {
            const payload = { type: 'ai:conversation-create' };
            void props.events.onCreate?.(payload, buildDispatchCtx(payload, props.node.scope as ScopeRef | undefined));
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          {t('flux.ai.newConversation')}
        </Button>
      </div>
      <div data-slot="ai-conversations-search" className="px-0.5 pb-1">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('flux.ai.conversationsSearchPlaceholder')}
          aria-label={t('flux.ai.conversationsSearchLabel')}
          data-testid="ai-conversations-search"
        />
      </div>
      {isFiltering && filteredConversations.length === 0 ? (
        <p data-testid="ai-conversations-empty" className="px-1 py-2 text-sm text-muted-foreground">
          {t('flux.ai.conversationsNoMatch', { query: query.trim() })}
        </p>
      ) : null}
      <ul data-slot="ai-conversations-list" className="flex flex-col gap-1">
        {filteredConversations.map((conv) => {
          const isActive = conv.id === activeId;
          const isRenaming = renamingId === conv.id;
          return (
            <li
              key={conv.id}
              data-slot="ai-conversations-item"
              data-id={conv.id}
              data-active={isActive ? '' : undefined}
              // P2-17 (2026-08-10 multi-audit): screen readers need the
              // current-conversation state programmatically (WCAG 1.3.1 /
              // 4.1.2) — `data-active` + border/background color alone are
              // not SR-observable.
              aria-current={isActive ? 'true' : undefined}
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
                  disabled={disabled}
                  onClick={() => {
                    const payload = { type: 'ai:conversation-click', id: conv.id, conversation: conv };
                    void props.events.onItemClick?.(payload, buildDispatchCtx(payload, props.node.scope as ScopeRef | undefined));
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
                    disabled={disabled}
                    onClick={() => {
                      setRenamingId(conv.id);
                      setDraftTitle(conv.title ?? '');
                    }}
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-slot="ai-conversations-delete"
                    aria-label={t('flux.ai.deleteConversation')}
                    disabled={disabled}
                    onClick={() => setPendingDeleteId(conv.id)}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </Button>
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingDeleteId(null);
        }}
      >
        <AlertDialogContent data-slot="ai-conversations-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('flux.ai.deleteConversationConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('flux.ai.deleteConversationConfirmBody')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingDeleteId(null)}>
              {t('flux.common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={disabled}
              onClick={() => {
                if (disabled || pendingDeleteId === null) return;
                const payload = { type: 'ai:conversation-delete', id: pendingDeleteId };
                void props.events.onItemDelete?.(payload, buildDispatchCtx(payload, props.node.scope as ScopeRef | undefined));
                setPendingDeleteId(null);
              }}
            >
              {t('flux.ai.deleteConversationConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}

function normalizeConversations(value: unknown): AiConversationInfo[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (x): x is AiConversationInfo => typeof x === 'object' && x !== null && 'id' in x,
  );
}
