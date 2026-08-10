import type {
  ComponentCapabilities,
  ComponentCapabilityActionContext,
  ComponentCapabilityResult,
  ComponentHandle,
} from '@nop-chaos/flux-core';
import type { ChatMessage, ChatMessageContentPart, MessageEngine } from '../engine/types.js';

/** Logical method names exposed by the `ai-chat` ComponentHandle (design.md §14.3). */
export const AI_COMPONENT_METHODS = [
  'sendMessage',
  'abort',
  'clear',
  'getMessages',
  'setMessages',
  'regenerate',
] as const;

export type AiComponentMethod = (typeof AI_COMPONENT_METHODS)[number];

/**
 * Build the Layer C `ComponentHandle` for an `ai-chat` instance. The handle
 * implements `ComponentCapabilities.invoke(method, payload, ctx)` and dispatches
 * to the engine's 6 logical methods (design.md §11.1/§14.3). Dispatch goes
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
export function createAiComponentHandle(input: {
  engine: MessageEngine | null;
  id: string;
  name?: string;
}): ComponentHandle {
  const { engine, id, name } = input;
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
            if (Array.isArray(parts)) {
              await engine.sendMessage(parts as ChatMessageContentPart[]);
              return { ok: true };
            }
            if (typeof text === 'string' && text.length > 0) {
              await engine.sendMessage(text);
              return { ok: true };
            }
            return { ok: false, error: new Error('component:sendMessage requires { text } or { parts }') };
          }
          case 'abort': {
            await engine.abort();
            return { ok: true };
          }
          case 'clear': {
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
            // A-16: optional explicit branch id; engine assigns one when omitted.
            const branchId = typeof payload?.branchId === 'string' ? payload.branchId : undefined;
            await engine.regenerate(branchId);
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
