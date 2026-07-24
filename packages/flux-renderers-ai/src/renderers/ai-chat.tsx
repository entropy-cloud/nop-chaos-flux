import React, { useEffect, useMemo } from 'react';
import type { RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import {
  useCurrentActionScope,
  useCurrentComponentRegistry,
  useHostScope,
  useNamespaceRegistration,
} from '@nop-chaos/flux-react';
import { AiChatProvider } from '../adapters/ai-chat-context.js';
import { useMessage } from '../adapters/use-message.js';
import { createAiActionProvider } from '../adapters/ai-action-provider.js';
import { createAiComponentHandle } from '../adapters/ai-component-handle.js';
import type { AiConversationController } from '../adapters/ai-conversation-controller.js';
import type { AiConnector, ChatMessage, MessageEngine, RequestState, ToolExecutor } from '../engine/types.js';
import type { AiToolSchema } from '../engine/types.js';
import type { AiBranch, AiSenderExtensionProps } from '../schemas.js';
import { AiMessageListView } from './ai-message-list.js';
import { AiSenderView } from './ai-sender.js';
import type { AiChatSchema } from '../schemas.js';

/**
 * Duck-type guard: a value is a usable `MessageEngine` when it exposes the
 * `useSyncExternalStore` contract (`subscribe` + `getState`) plus the engine
 * mutation surface (`sendMessage`). Used to validate the host-injected
 * `engine` prop (Failure Path `engine-prop-not-engine`).
 */
function isMessageEngine(value: unknown): value is MessageEngine {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as MessageEngine).subscribe === 'function' &&
    typeof (value as MessageEngine).getState === 'function' &&
    typeof (value as MessageEngine).sendMessage === 'function'
  );
}

/**
 * ai-chat (Layout, P0/P1): the conversation panel root.
 *
 * Creates the message engine from the resolved `connector` expression, wraps
 * its subtree in `AiChatProvider` so child renderers (message-list / sender)
 * share one engine, and renders the header / beforeMessages / messages /
 * afterMessages / sender / footer slots. Marker `nop-ai-chat`; Layout — no
 * hardcoded spacing (schema className drives layout).
 *
 * External engine injection (design.md §11.2/§11.5): when the resolved `engine`
 * prop is a `MessageEngine` (e.g. `useConversation.activeEngine`), `ai-chat`
 * binds it instead of self-creating one — unifying ai-chat with conversation
 * managers / persistence. Failure Paths: `engine-prop-not-engine` (non-engine
 * value → warn + self-built fallback) and `engine-null-switch` (null during a
 * conversation switch → render emptyState).
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

  // P2 agentic tool loop: forward host-injected tools / executor / round cap
  // (schema expressions resolve to host objects via xui:imports).
  const tools = Array.isArray(resolved.tools) ? (resolved.tools as unknown as AiToolSchema[]) : undefined;
  const toolExecutor = (typeof resolved.toolExecutor === 'function'
    ? (resolved.toolExecutor as ToolExecutor)
    : undefined);
  const maxToolRounds = typeof resolved.maxToolRounds === 'number' ? resolved.maxToolRounds : undefined;

  // ---- External engine injection (design.md §11.2/§11.5) ----
  // When the host binds an external `MessageEngine` (e.g.
  // `useConversation.activeEngine`) via the `engine` prop, `ai-chat` binds it
  // instead of self-creating one — unifying ai-chat with conversation managers
  // / persistence so the same engine (and its stored messages) backs the chat.
  const rawEngine = resolved.engine;
  const externalEngine = isMessageEngine(rawEngine) ? rawEngine : undefined;
  if (rawEngine !== undefined && rawEngine !== null && !externalEngine) {
    // Failure Path `engine-prop-not-engine`: host injected a non-MessageEngine
    // value. Degrade to the self-built path (same level as connector-missing)
    // + console warn, never crash.
    if (typeof console !== 'undefined') {
      console.warn(
        '[ai-chat] `engine` prop resolved to a non-MessageEngine value; falling back to a self-built engine.',
      );
    }
  }
  // Failure Path `engine-null-switch`: the host explicitly injected `null`
  // (e.g. `useConversation.activeEngine` is null during a conversation switch).
  // Hooks still run unconditionally below (rules-of-hooks); we render the
  // emptyState instead of the message list after the hooks resolve.
  const engineNullSwitch = rawEngine === null;

  const { messages, requestState, processingState, isProcessing, sendMessage, abortRequest, engine } = useMessage({
    engine: externalEngine,
    connector: connector ?? null,
    systemPrompt,
    initialMessages,
    tools,
    toolExecutor,
    maxToolRounds,
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

  // ---- Layer C: ComponentHandle registration (design.md §11.1/§14.3) ----
  // Register an imperative handle so schema actions like
  // `{ action:'component:sendMessage', componentId, args:{ text } }` can drive
  // this chat from sibling components. Dispatch is via the live
  // `ComponentCapabilities.invoke(method, payload, ctx)` model (NOT flat
  // methods). Capability check: when no `componentRegistry` is provided the
  // registration is silently skipped (Failure Path `component-handle-no-registry`).
  const componentRegistry = useCurrentComponentRegistry();
  const componentHandle = useMemo(
    () =>
      createAiComponentHandle({
        engine,
        id: (resolved.componentId as string | undefined) || props.meta.testid || props.id,
        name: (resolved.componentName as string | undefined) ?? 'ai-chat',
      }),
    [engine, props.meta.testid, props.id, resolved.componentId, resolved.componentName],
  );
  useEffect(() => {
    if (!componentRegistry) return;
    return componentRegistry.register(componentHandle, { cid: props.meta.cid });
  }, [componentRegistry, props.meta.cid, componentHandle]);

  // ---- Host scope projection: `$ai`-equivalent reactive state for descendants ----
  // Projected under scopeLabel 'ai' so descendants read via `useScopeSelector`
  // (e.g. `${isProcessing}`). The literal `${$ai.xxx}` schema-expression
  // form additionally requires the host to alias this scope via `xui:imports`
  // (renderer publishes the data; host configures the alias). Region renders
  // are explicitly given this scope so schema fragments inside header /
  // beforeMessages / afterMessages / footer / emptyState see the projection.
  const activeConversationId = (resolved.activeConversationId as string | null | undefined) ?? null;
  // A-16: host-managed branch set + active id, projected into context so each
  // bubble can render a prev/next picker for branch-point messages.
  const branches = Array.isArray(resolved.branches) ? (resolved.branches as unknown as AiBranch[]) : undefined;
  const activeBranchId = typeof resolved.activeBranchId === 'string' ? resolved.activeBranchId : undefined;
  const onBranchChange = props.events.onBranchChange
    ? (branchId: string) => {
        void props.events.onBranchChange?.({ branchId });
      }
    : undefined;
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

  // engine-null-switch: the host injected `null` (activeEngine is null during
  // a conversation switch / before the first selection). Render the emptyState
  // (or a default prompt) instead of the message list; recover automatically
  // once a new engine arrives (Failure Path `engine-null-switch`). Checked
  // before connector-missing: a null engine is a deliberate "switching" signal,
  // not a misconfiguration.
  if (engineNullSwitch) {
    return (
      <section
        className={cn('nop-ai-chat', props.meta.className)}
        data-slot="ai-chat-root"
        data-state="empty"
        data-testid={props.meta.testid || undefined}
      >
        {emptyNode ? (
          <div data-slot="ai-chat-empty">{emptyNode}</div>
        ) : (
          <div data-slot="ai-chat-empty" className="p-4 text-sm text-muted-foreground">
            {t('flux.ai.selectConversation')}
          </div>
        )}
      </section>
    );
  }

  // connector-missing: fatal only when no engine backs the chat. An external
  // engine (e.g. useConversation.activeEngine) already owns its connector, so
  // requiring one here would false-positive on persistence / conversation
  // demos (Failure Path `connector-missing`).
  if (!externalEngine && !connector) {
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
    <AiChatProvider value={{ engine, messages, requestState, processingState, isProcessing, sendMessage, abortRequest, branches, activeBranchId, onBranchChange }}>
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
          extensionComponent={
            (resolved.senderExtensions as React.ComponentType<AiSenderExtensionProps> | undefined | null) ?? null
          }
        />
        {footerNode ? <footer data-slot="ai-chat-footer">{footerNode}</footer> : null}
      </section>
    </AiChatProvider>
  );
}
