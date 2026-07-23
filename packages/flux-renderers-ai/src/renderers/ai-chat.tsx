import { useEffect, useMemo } from 'react';
import type { RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import {
  useCurrentActionScope,
  useHostScope,
  useNamespaceRegistration,
} from '@nop-chaos/flux-react';
import { AiChatProvider } from '../adapters/ai-chat-context.js';
import { useMessage } from '../adapters/use-message.js';
import { createAiActionProvider } from '../adapters/ai-action-provider.js';
import type { AiConversationController } from '../adapters/ai-conversation-controller.js';
import type { AiConnector, ChatMessage, RequestState } from '../engine/types.js';
import { AiMessageListView } from './ai-message-list.js';
import { AiSenderView } from './ai-sender.js';
import type { AiChatSchema } from '../schemas.js';

/**
 * ai-chat (Layout, P0/P1): the conversation panel root.
 *
 * Creates the message engine from the resolved `connector` expression, wraps
 * its subtree in `AiChatProvider` so child renderers (message-list / sender)
 * share one engine, and renders the header / beforeMessages / messages /
 * afterMessages / sender / footer slots. Marker `nop-ai-chat`; Layout — no
 * hardcoded spacing (schema className drives layout).
 *
 * P1 (Layer B): registers the `ai` ActionScope namespace (7 actions, see
 * `createAiActionProvider`) when the host provides an ActionScope, and
 * projects engine state (`isProcessing`, `messages`, `activeConversationId`)
 * into a host scope so descendants can read it reactively. Capability check:
 * when no ActionScope is provided the registration is silently skipped
 * (Failure Path `ai-action-no-scope`).
 */
export function AiChatRenderer(props: RendererComponentProps<AiChatSchema>): RendererRenderOutput {
  const resolved = props.props;
  const connector = resolved.connector as AiConnector | undefined;
  const systemPrompt = typeof resolved.systemPrompt === 'string' ? resolved.systemPrompt : undefined;
  const initialMessages = Array.isArray(resolved.initialMessages)
    ? (resolved.initialMessages as unknown as ChatMessage[])
    : undefined;
  const conversationController = (resolved.conversationController as
    | AiConversationController
    | undefined) ?? null;

  const { messages, requestState, processingState, isProcessing, sendMessage, abortRequest, engine } = useMessage({
    connector: connector ?? null,
    systemPrompt,
    initialMessages,
  });

  // ---- Layer B: ActionScope namespace `ai` registration ----
  const actionScope = useCurrentActionScope();
  const actionProvider = useMemo(
    () => createAiActionProvider({ engine, conversationController }),
    [engine, conversationController],
  );
  // `useNamespaceRegistration` performs the capability check internally
  // (`actionScope` undefined → no-op). Returns the unregister fn on cleanup.
  useNamespaceRegistration(actionScope, 'ai', actionProvider);

  // ---- Host scope projection: `$ai`-equivalent reactive state for descendants ----
  // Projected under scopeLabel 'ai' so descendants read via `useScopeSelector`
  // (e.g. `${isProcessing}`). The literal `${$ai.xxx}` schema-expression
  // form additionally requires the host to alias this scope via `xui:imports`
  // (renderer publishes the data; host configures the alias). Region renders
  // are explicitly given this scope so schema fragments inside header /
  // beforeMessages / afterMessages / footer / emptyState see the projection.
  const activeConversationId = (resolved.activeConversationId as string | null | undefined) ?? null;
  const hostScopeData = useMemo(
    () => ({
      isProcessing,
      messages,
      activeConversationId,
    }),
    [isProcessing, messages, activeConversationId],
  );
  const hostScope = useHostScope(hostScopeData, props.path, 'ai');

  // Fire schema events on turn transitions via a subscribe callback. The
  // previous state is tracked in a closure local (no ref read during render,
  // keeping this React-Compiler friendly).
  useEffect(() => {
    let prev: RequestState = engine.getState().requestState;
    const unsubscribe = engine.subscribe('requestState', (state) => {
      const current = state.requestState;
      if (prev === 'processing' && current !== 'processing') {
        const events = props.events;
        if (current === 'completed' && events.onResponseComplete) {
          const latest = engine.getState().messages;
          const last = latest[latest.length - 1];
          void events.onResponseComplete({ message: last });
        } else if (current === 'error' && events.onError) {
          void events.onError({ error: new Error('AI request failed') });
        } else if (current === 'aborted' && events.onAbort) {
          void events.onAbort();
        }
      }
      prev = current;
    });
    return unsubscribe;
  }, [engine, props.events]);

  const headerNode = props.regions.header ? (props.regions.header.render({ scope: hostScope }) as React.ReactNode) : null;
  const beforeNode = props.regions.beforeMessages ? (props.regions.beforeMessages.render({ scope: hostScope }) as React.ReactNode) : null;
  const afterNode = props.regions.afterMessages ? (props.regions.afterMessages.render({ scope: hostScope }) as React.ReactNode) : null;
  const footerNode = props.regions.footer ? (props.regions.footer.render({ scope: hostScope }) as React.ReactNode) : null;
  const emptyNode = props.regions.emptyState ? (props.regions.emptyState.render({ scope: hostScope }) as React.ReactNode) : undefined;

  // connector-missing: show an inline error, never crash (Failure Path `connector-missing`).
  if (!connector) {
    return (
      <section
        className={cn('nop-ai-chat', props.meta.className)}
        data-slot="ai-chat-root"
        data-state="error"
        data-testid={props.meta.testid || undefined}
      >
        <div data-slot="ai-chat-error" className="p-4 text-sm text-destructive">
          {t('flux.ai.connectorMissing')}
        </div>
      </section>
    );
  }

  return (
    <AiChatProvider value={{ engine, messages, requestState, processingState, isProcessing, sendMessage, abortRequest }}>
      <section
        className={cn('nop-ai-chat', props.meta.className)}
        data-slot="ai-chat-root"
        data-state={requestState}
        data-testid={props.meta.testid || undefined}
      >
        {headerNode ? <header data-slot="ai-chat-header">{headerNode}</header> : null}
        {beforeNode ? <div data-slot="ai-chat-before">{beforeNode}</div> : null}
        <AiMessageListView emptyNode={emptyNode} />
        {afterNode ? <div data-slot="ai-chat-after">{afterNode}</div> : null}
        <AiSenderView
          placeholder={resolved.placeholder}
          submitType={resolved.submitType}
          maxLength={resolved.maxLength}
          showWordLimit={resolved.showWordLimit}
        />
        {footerNode ? <footer data-slot="ai-chat-footer">{footerNode}</footer> : null}
      </section>
    </AiChatProvider>
  );
}
