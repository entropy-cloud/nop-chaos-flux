import type {
  ComponentCapabilities,
  ComponentCapabilityActionContext,
  ComponentCapabilityResult,
  ComponentHandle,
} from '@nop-chaos/flux-core';
import type { ChatMessage, ChatMessageContentPart, MessageEngine } from '../engine/types.js';
import type { AiSenderDraftStore } from './ai-chat-context.js';

/** Logical method names exposed by the `ai-chat` ComponentHandle (design.md §14.3). */
export const AI_COMPONENT_METHODS = [
  'sendMessage',
  'abort',
  'clear',
  'getMessages',
  'setMessages',
  'regenerate',
  'setSenderDraft',
] as const;

export type AiComponentMethod = (typeof AI_COMPONENT_METHODS)[number];

/**
 * Build the Layer C `ComponentHandle` for an `ai-chat` instance. The handle
 * implements `ComponentCapabilities.invoke(method, payload, ctx)` and dispatches
 * to the engine's 7 logical methods (design.md §11.1/§14.3). Dispatch goes
 * through the live `invoke` model (not flat methods) — the action system calls
 * `component:<method>` which routes here via `action-adapter.ts`.
 *
 * `getMessages` returns a read-only snapshot; `setMessages` replaces the list
 * (Phase 1 engine extension). `sendMessage` accepts `{ text }` or multimodal
 * `{ parts }`.
 *
 * P2-8 (2026-08-10 multi-audit): `engine` may be `null` — the renderer binds
 * the handle to an explicit null engine during the engineNullSwitch window
 * (external engine A → null → B) so dispatch is an explicit rejection instead
 * of writing ghost messages into the hidden self-built engine.
 */
/**
 * FIND-04 (2026-08-11, plan 2026-08-11-0008-3): command-boundary failure
 * fidelity for `component:sendMessage`. The engine's `sendMessage` settles
 * void (documented void-settle contract — every failure branch settles into
 * `requestState`/`lastError`), so the handle must derive its result from the
 * post-await engine state instead of unconditionally reporting ok.
 */
function handleStateError(engine: MessageEngine): Error {
  const cause = engine.getState().lastError;
  return cause instanceof Error ? cause : new Error(String(cause ?? 'AI request failed'), { cause: cause });
}

function handleSendSettlement(engine: MessageEngine): ComponentCapabilityResult {
  if (engine.getState().requestState === 'error') {
    return { ok: false, error: handleStateError(engine) };
  }
  return { ok: true };
}

function handleBusy(): ComponentCapabilityResult {
  return { ok: false, error: new Error('engine busy: a previous request is still processing') };
}

export function createAiComponentHandle(input: {
  engine: MessageEngine | null;
  id: string;
  name?: string;
  /**
   * D4 (plan 2026-08-24-2317-1): the per-chat sender draft channel backing
   * `component:setSenderDraft`. Supplied by `ai-chat`; optional so callers
   * that only need the engine methods keep working (a `setSenderDraft`
   * dispatch on a handle without a channel rejects explicitly).
   */
  senderDraft?: AiSenderDraftStore | null;
}): ComponentHandle {
  const { engine, id, name, senderDraft } = input;
  const capabilities: ComponentCapabilities = {
    async invoke(
      method: string,
      payload: Record<string, unknown> | undefined,
      _ctx: ComponentCapabilityActionContext,
    ): Promise<ComponentCapabilityResult> {
      // P2-8: null-engine window — no live engine is bound. Reject explicitly;
      // the host sees a clear error instead of a silent drop into the hidden
      // self-built engine (whose messages would vanish when the external
      // engine arrives).
      if (!engine) {
        return {
          ok: false,
          error: new Error(
            'ai-chat engine is not ready (external engine switch in progress)',
          ),
        };
      }
      try {
        switch (method) {
          case 'sendMessage': {
            const text = payload?.text;
            const parts = payload?.parts;
            // FIND-04: busy-drop — a second send while a turn is in-flight is
            // silently discarded inside runTurn; report the drop explicitly.
            if (engine.getState().isProcessing) {
              return handleBusy();
            }
            if (Array.isArray(parts)) {
              await engine.sendMessage(parts as ChatMessageContentPart[]);
              return handleSendSettlement(engine);
            }
            if (typeof text === 'string' && text.length > 0) {
              await engine.sendMessage(text);
              return handleSendSettlement(engine);
            }
            return { ok: false, error: new Error('component:sendMessage requires { text } or { parts }') };
          }
          case 'abort': {
            await engine.abort();
            return { ok: true };
          }
          case 'clear': {
            // FIND-04 category-sweep: `engine.clear` silently no-ops while a
            // turn is in-flight (documented engine guard) — report the drop
            // instead of a lying ok:true.
            if (engine.getState().isProcessing) {
              return handleBusy();
            }
            engine.clear();
            return { ok: true };
          }
          case 'getMessages': {
            // getMessages() already returns a per-message shallow-isolated
            // copy (O-2), so the host receives an independent snapshot — no
            // second clone is needed at this public exit.
            const messages: ChatMessage[] = engine.getMessages();
            return { ok: true, data: messages };
          }
          case 'setMessages': {
            const messages = payload?.messages;
            if (!Array.isArray(messages)) {
              return { ok: false, error: new Error('component:setMessages requires { messages: ChatMessage[] }') };
            }
            engine.setMessages(messages as ChatMessage[]);
            return { ok: true };
          }
          case 'regenerate': {
            // FIND-04 category-sweep: `engine.regenerate` silently no-ops
            // while a turn is in-flight (documented engine guard) — report
            // the drop instead of a lying ok:true.
            if (engine.getState().isProcessing) {
              return handleBusy();
            }
            // A-16: optional explicit branch id; engine assigns one when omitted.
            const branchId = typeof payload?.branchId === 'string' ? payload.branchId : undefined;
            await engine.regenerate(branchId);
            return { ok: true };
          }
          case 'setSenderDraft': {
            const draftText = payload?.text;
            if (typeof draftText !== 'string') {
              return { ok: false, error: new Error('component:setSenderDraft requires { text: string }') };
            }
            if (!senderDraft) {
              return {
                ok: false,
                error: new Error('component:setSenderDraft: no sender draft channel bound to this ai-chat'),
              };
            }
            const mode = payload?.mode === 'replace' ? 'replace' : 'append';
            // P2-4 (2026-08-24 open-audit, plan 2026-08-25-0440-1): an empty
            // string under `replace` is a legal "clear the draft" intent;
            // under `append` it has no semantics and rejects explicitly.
            if (draftText.length === 0 && mode !== 'replace') {
              return {
                ok: false,
                error: new Error(
                  'component:setSenderDraft cannot append an empty string (use { mode: "replace" } to clear the draft)',
                ),
              };
            }
            senderDraft.apply(draftText, mode);
            return { ok: true };
          }
          default:
            return { ok: false, error: new Error(`Unsupported ai-chat method: ${method}`) };
        }
      } catch (error) {
        return { ok: false, error };
      }
    },
    hasMethod(method: string): boolean {
      return (AI_COMPONENT_METHODS as readonly string[]).includes(method);
    },
    listMethods(): readonly string[] {
      return [...AI_COMPONENT_METHODS];
    },
  };
  return {
    id,
    name,
    type: 'ai-chat',
    capabilities,
  };
}
