import type {
  ActionContext,
  ActionNamespaceProvider,
  ActionResult,
} from '@nop-chaos/flux-core';
import type { MessageEngine } from '../engine/types.js';
import type { AiConversationController } from './ai-conversation-controller.js';

/**
 * The 7 actions exposed by the `ai` ActionScope namespace (design.md §14.2).
 * Kept in sync with the spec table; tests assert the list to catch drift.
 */
export const AI_NAMESPACE_ACTIONS = [
  'send',
  'abort',
  'clear',
  'createConversation',
  'switchConversation',
  'deleteConversation',
  'renameConversation',
] as const;

export interface CreateAiActionProviderInput {
  engine: MessageEngine;
  /**
   * Optional host-side conversation controller. When absent, conversation
   * actions return `ok:false` with a clear error (Failure Path
   * `ai-action-no-controller`); engine-only actions still work.
   */
  conversationController?: AiConversationController | null;
}

function ok(data?: unknown): ActionResult {
  return data === undefined ? { ok: true } : { ok: true, data };
}

function fail(message: string): ActionResult {
  return { ok: false, error: new Error(message) };
}

/**
 * Build the `ai` ActionScope namespace provider. The renderer registers it via
 * `useNamespaceRegistration(actionScope, 'ai', provider)` (live API; the
 * design.md §11.1 `runtime.actionScope?.registerNamespace` phrasing is stale —
 * see plan Non-Blocking Follow-ups).
 *
 * The provider closes over the engine (domain-internal) and an optional
 * conversation controller (host-owned). Schema can dispatch:
 *   { action: 'ai:send', args: { text: 'hello' } }
 *   { action: 'ai:abort' }
 *   { action: 'ai:createConversation', args: { title: 'New chat' } }
 */
export function createAiActionProvider(input: CreateAiActionProviderInput): ActionNamespaceProvider {
  const { engine, conversationController } = input;

  return {
    kind: 'host',
    listMethods() {
      return [...AI_NAMESPACE_ACTIONS];
    },
    async invoke(method, payload, _ctx: ActionContext): Promise<ActionResult> {
      const args = (payload ?? {}) as Record<string, unknown>;

      switch (method) {
        case 'send': {
          const text = args.text;
          if (typeof text !== 'string' || text.length === 0) {
            return fail('ai:send requires { text: string }');
          }
          await engine.sendMessage(text);
          return ok();
        }
        case 'abort': {
          await engine.abort();
          return ok();
        }
        case 'clear': {
          engine.clear();
          return ok();
        }
        case 'createConversation': {
          if (!conversationController) {
            return fail('ai:createConversation: no conversation controller bound');
          }
          const created = await conversationController.createConversation({
            title: typeof args.title === 'string' ? args.title : undefined,
            metadata: isRecord(args.metadata) ? args.metadata : undefined,
          });
          return ok(created);
        }
        case 'switchConversation': {
          if (!conversationController) {
            return fail('ai:switchConversation: no conversation controller bound');
          }
          if (typeof args.id !== 'string') {
            return fail('ai:switchConversation requires { id: string }');
          }
          await conversationController.switchConversation(args.id);
          return ok();
        }
        case 'deleteConversation': {
          if (!conversationController) {
            return fail('ai:deleteConversation: no conversation controller bound');
          }
          if (typeof args.id !== 'string') {
            return fail('ai:deleteConversation requires { id: string }');
          }
          await conversationController.deleteConversation(args.id);
          return ok();
        }
        case 'renameConversation': {
          if (!conversationController) {
            return fail('ai:renameConversation: no conversation controller bound');
          }
          if (typeof args.id !== 'string' || typeof args.title !== 'string') {
            return fail('ai:renameConversation requires { id, title }');
          }
          await conversationController.renameConversation(args.id, args.title);
          return ok();
        }
        default:
          return fail(`ai: unknown action "${method}"`);
      }
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
