import { useRef } from 'react';
import { useMessage, AiChatProvider, AiMessageListView, AiSenderView } from '@nop-chaos/flux-renderers-ai';
import type { AiConnector, MessageEngine } from '@nop-chaos/flux-renderers-ai';
import type { NopComponentInspectResult, NopDebuggerRedactionOptions } from '@nop-chaos/nop-debugger';
import { t } from '@nop-chaos/flux-i18n';
import { buildNodeContextCard, buildUserContentParts } from './prompt.js';

export interface AiSessionTabProps {
  engine: MessageEngine;
  connector: AiConnector | null;
  getInspectSelection: () => NopComponentInspectResult | null;
  redaction?: NopDebuggerRedactionOptions;
  /** Patch candidate queue (AD-4) rendered above the message list. */
  patchQueue?: React.ReactNode;
}

/**
 * AI tab session surface: message list + sender wired to the shared engine.
 * The inspect selection is read at send time and attached as a bounded
 * `data-node-context` part (never as text — injection assertions pin this).
 */
export function AiSessionTab(props: AiSessionTabProps) {
  const { engine, connector, getInspectSelection } = props;
  const view = useMessage({ engine, connector: connector ?? null });
  const lastSentCardRef = useRef<Record<string, unknown> | null>(null);

  // `view` is a fresh object per useMessage call — memoizing on it is a no-op
  // (closure audit m3). The provider re-renders with the engine subscription,
  // which is the actual reactivity source.
  const contextValue = {
    engine: view.engine,
    messages: view.messages,
    requestState: view.requestState,
    processingState: view.processingState,
    isProcessing: view.isProcessing,
    sendMessage: view.sendMessage,
    abortRequest: view.abortRequest,
  };

  const selection = getInspectSelection();
  const pendingCard = selection ? buildNodeContextCard(selection, { redaction: props.redaction }) : null;
  const requestError = view.requestState === 'error' ? view.snapshot.lastError : undefined;

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || view.isProcessing) {
      return;
    }
    lastSentCardRef.current = pendingCard;
    // The engine owns failure state (state.lastError); the error banner below
    // renders it. The rejection channel is deliberately inert.
    void view
      .sendMessage(buildUserContentParts(trimmed, selection, { redaction: props.redaction }))
      .catch(() => undefined);
  };

  return (
    <AiChatProvider value={contextValue}>
      <div className="ndbg-ai-tab flex min-h-0 flex-1 flex-col gap-2 p-2" data-slot="nop-ai-session">
        {props.patchQueue}
        <div className="ndbg-ai-context text-xs" data-slot="nop-ai-context" role="status">
          {pendingCard ? (
            <span className="ndbg-ai-context-title" data-testid="ndbg-ai-context-attached">
              {t('flux.debugger.ai.contextTitle')}
              {typeof pendingCard.path === 'string' ? ` · ${pendingCard.path}` : ''}
            </span>
          ) : (
            <span className="ndbg-ai-context-none text-muted-foreground" data-testid="ndbg-ai-context-none">
              {t('flux.debugger.ai.contextNone')}
            </span>
          )}
        </div>
        <AiMessageListView
          autoScroll
          className="min-h-0 flex-1 overflow-y-auto"
          emptyNode={
            <div className="px-2 py-6 text-xs text-muted-foreground" data-testid="ndbg-ai-empty" role="status">
              {connector ? t('flux.debugger.ai.emptyHint') : t('flux.debugger.ai.connectHint')}
            </div>
          }
        />
        {requestError ? (
          <div
            className="ndbg-ai-error flex items-center justify-between gap-2 rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive"
            data-testid="ndbg-ai-error"
            role="alert"
          >
            <span>{t('flux.debugger.ai.errorBanner')}</span>
            <button
              type="button"
              className="underline underline-offset-2"
              data-testid="ndbg-ai-retry"
              aria-label={t('flux.debugger.ai.retry')}
              onClick={() => {
                void engine.regenerate().catch(() => undefined);
              }}
            >
              {t('flux.debugger.ai.retry')}
            </button>
          </div>
        ) : null}
        <AiSenderView
          submitType="enter"
          placeholder={t('flux.debugger.ai.sendPlaceholder')}
          loading={view.isProcessing}
          disabled={!connector}
          onCancel={() => {
            void engine.abort().catch(() => undefined);
          }}
          onSubmit={handleSend}
          testid="ndbg-ai-sender"
        />
      </div>
    </AiChatProvider>
  );
}
