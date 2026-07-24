import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
 * Decision-A (design.md §3): the host scope projection and event handoffs MUST
 * hand descendants/host independent copies — never the live `engine.messages`
 * reference (mutating a projected array would otherwise pollute the engine's
 * internal state). `structuredClone` is the primary path (deep, faithful to the
 * "host 必须 copy" rule); the shallow fallback covers runtimes without it.
 */
function cloneMessages(messages: ChatMessage[]): ChatMessage[] {
  if (typeof structuredClone === 'function') return structuredClone(messages);
  return messages.map((m) => ({ ...m }));
}

function cloneMessage(message: ChatMessage): ChatMessage {
  if (typeof structuredClone === 'function') return structuredClone(message);
  return { ...message };
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

  // AI-12/AI-31 (latest-ref): the runtime builds a fresh `props.events`
  // object every render. Read it through a ref so callbacks/effects that need
  // the latest events can keep stable identities (subscribe effect deps
  // `[engine]` only; context-value useMemo not invalidated every render).
  const eventsRef = useRef(props.events);
  useEffect(() => {
    eventsRef.current = props.events;
  });

  // ---- Layer B: ActionScope namespace `ai` registration ----
  const actionScope = useCurrentActionScope();
  const actionProvider = createAiActionProvider({ engine, conversationController });
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
  const componentHandle = createAiComponentHandle({
    engine,
    id: (resolved.componentId as string | undefined) || props.meta.testid || props.id,
    name: (resolved.componentName as string | undefined) ?? 'ai-chat',
  });
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
  // AI-31: stable identity for the context value. Reads the latest handler via
  // eventsRef so the callback (and thus the context value) is not rebuilt every
  // render. No-ops when the host never wires `onBranchChange`; consumers invoke
  // it via optional chaining so an always-defined stable no-op is equivalent.
  const onBranchChange = useCallback((branchId: string) => {
    void eventsRef.current.onBranchChange?.({ type: 'ai:branch-change', branchId });
  }, []);
  // Decision-A (AI-02): project a SNAPSHOT of the engine messages, not the
  // live internal array. Descendants that read `${messages}` (via
  // `useScopeSelector`) receive an independent copy, so a host/descendant that
  // mutates the projected array cannot pollute the engine's domain state.
  //
  // P1#2 — clone frequency is gated to TURN BOUNDARIES. The snapshot is rebuilt
  // only when a turn ends, detected as the `isProcessing` true→false flip (the
  // engine always pairs this with a terminal `requestState`). During streaming
  // the projection holds the previous turn-boundary snapshot (a point-in-time
  // copy, not a live feed), avoiding a per-chunk `structuredClone` whose cost
  // grows with conversation length; hosts needing the current full set call
  // `component:getMessages`. The actual message list still renders from the
  // live `messages` via `AiChatProvider` (this projection only feeds the
  // header / beforeMessages / afterMessages / footer / emptyState regions).
  //
  // Implemented via the React "adjusting state during render" pattern (not a
  // ref), so it satisfies `react-hooks/refs`. On a turn-start flip (false→true)
  // only the tracked flag updates (no clone); only the boundary flip (true→
  // false) re-clones. It converges: after the update `prevIsProcessing ===
  // isProcessing`, so the guard is false on the next render.
  const [projection, setProjection] = useState<{ prevIsProcessing: boolean; snap: ChatMessage[] }>(
    () => ({ prevIsProcessing: isProcessing, snap: cloneMessages(messages) }),
  );
  if (projection.prevIsProcessing !== isProcessing) {
    const crossedBoundary = projection.prevIsProcessing && !isProcessing;
    setProjection({
      prevIsProcessing: isProcessing,
      snap: crossedBoundary ? cloneMessages(messages) : projection.snap,
    });
  }
  const projectedMessages = projection.snap;
  const hostScopeData = {
    isProcessing,
    messages: projectedMessages,
    activeConversationId,
  };
  const hostScope = useHostScope(hostScopeData, props.path, 'ai');

  // AI-12 (subscribe stability): the `requestState` subscription below depends
  // only on `[engine]`. It reads the latest events through `eventsRef` (declared
  // above) so it is not re-subscribed on every render's fresh events object — a
  // mid-transition re-subscribe could otherwise drop a `processing→completed`
  // transition (Failure Path `subscribe-transition-not-dropped`).

  // Fire schema events on turn transitions via a subscribe callback. The
  // previous state is tracked in a closure local (no ref read during render,
  // keeping this React-Compiler friendly).
  useEffect(() => {
    let prev: RequestState = engine.getState().requestState;
    const unsubscribe = engine.subscribe('requestState', (state) => {
      const current = state.requestState;
      if (prev === 'processing' && current !== 'processing') {
        const events = eventsRef.current;
        if (current === 'completed' && events.onResponseComplete) {
          const latest = engine.getState().messages;
          const last = latest[latest.length - 1];
          // AI-09: hand off a snapshot so a host that mutates the delivered
          // message (e.g. on a later regenerate) cannot write back into the
          // engine's internal message object.
          void events.onResponseComplete({ message: last ? cloneMessage(last) : last });
        } else if (current === 'error' && events.onError) {
          // AI-19/F1.5: surface the engine's real error cause (written to
          // `state.lastError` by the engine-half, Plan {1} Phase 4) instead of
          // a placeholder. Non-Error causes are wrapped with `{ cause }`.
          const cause = state.lastError;
          const error =
            cause instanceof Error ? cause : new Error(String(cause ?? 'AI request failed'), { cause: cause });
          void events.onError({ error });
        } else if (current === 'aborted' && events.onAbort) {
          void events.onAbort();
        }
      }
      prev = current;
    });
    return unsubscribe;
  }, [engine]);

  const headerNode = props.regions.header ? (props.regions.header.render({ scope: hostScope }) as React.ReactNode) : null;
  const beforeNode = props.regions.beforeMessages ? (props.regions.beforeMessages.render({ scope: hostScope }) as React.ReactNode) : null;
  const afterNode = props.regions.afterMessages ? (props.regions.afterMessages.render({ scope: hostScope }) as React.ReactNode) : null;
  const footerNode = props.regions.footer ? (props.regions.footer.render({ scope: hostScope }) as React.ReactNode) : null;
  const emptyNode = props.regions.emptyState ? (props.regions.emptyState.render({ scope: hostScope }) as React.ReactNode) : undefined;

  // AI-31 (context value stability): the AiChatProvider value crosses a
  // Provider boundary, so React Compiler cannot memoize the inline object
  // literal for context consumers. Stabilize the reference with useMemo so
  // context consumers do not re-render on each parent render. (Documented
  // exception to the "prefer plain derivation" guidance: solves a concrete
  // re-render problem across the Provider boundary.) Declared before the early
  // returns so the hook order is unconditional (rules-of-hooks).
  const chatContextValue = useMemo(
    () => ({ engine, messages, requestState, processingState, isProcessing, sendMessage, abortRequest, branches, activeBranchId, onBranchChange }),
    [engine, messages, requestState, processingState, isProcessing, sendMessage, abortRequest, branches, activeBranchId, onBranchChange],
  );

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
        data-cid={props.meta.cid || undefined}
        data-testid={props.meta.testid || undefined}
      >
        {emptyNode ? (
          <div data-slot="ai-chat-empty">{emptyNode}</div>
        ) : (
          <div data-slot="ai-chat-empty">
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
        data-cid={props.meta.cid || undefined}
        data-testid={props.meta.testid || undefined}
      >
        <div data-slot="ai-chat-error">
          {t('flux.ai.connectorMissing')}
        </div>
      </section>
    );
  }

  return (
    <AiChatProvider value={chatContextValue}>
      <section
        className={cn('nop-ai-chat', props.meta.className)}
        data-slot="ai-chat-root"
        data-state={requestState}
        data-cid={props.meta.cid || undefined}
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
