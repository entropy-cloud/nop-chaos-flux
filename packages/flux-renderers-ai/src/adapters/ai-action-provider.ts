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
  /**
   * The engine backing the chat. P2-8 (2026-08-10 multi-audit): may be `null`
   * — the renderer binds the provider to an explicit null engine during the
   * engineNullSwitch window (external engine A → null → B) so engine actions
   * return an explicit error instead of writing ghost messages into the hidden
   * self-built engine. Conversation actions (controller-bound) still work.
   */
  engine: MessageEngine | null;
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
 * FIND-04 (2026-08-11, plan 2026-08-11-0008-3): derive the command-boundary
 * error from the engine's post-await state. `engine.sendMessage` settles void
 * (documented void-settle contract — every failure branch settles into
 * `requestState`/`lastError`), so a failed turn must surface `lastError`
 * (non-Error causes wrapped with `{ cause }`) instead of an unconditional ok.
 */
function engineStateError(engine: MessageEngine): Error {
  const cause = engine.getState().lastError;
  return cause instanceof Error ? cause : new Error(String(cause ?? 'AI request failed'), { cause: cause });
}

function engineBusy(): ActionResult {
  return fail('engine busy: a previous request is still processing');
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

      // P2-8: null-engine window — no live engine is bound. Engine actions
      // reject explicitly (no ghost writes into the hidden self-built engine);
      // conversation actions stay functional (controller-bound).
      if (!engine) {
        const needsEngine = method === 'send' || method === 'abort' || method === 'clear';
        if (needsEngine) {
          return fail('ai-chat engine is not ready (external engine switch in progress)');
        }
      }

      switch (method) {
        case 'send': {
          const text = args.text;
          if (typeof text !== 'string' || text.length === 0) {
            return fail('ai:send requires { text: string }');
          }
          if (!engine) {
            return fail('ai-chat engine is not ready (external engine switch in progress)');
          }
          // FIND-04: busy-drop — a second send while a turn is in-flight is
          // silently discarded inside runTurn (isProcessing entry guard); the
          // command boundary must report the drop explicitly, not ok:true.
          if (engine.getState().isProcessing) {
            return engineBusy();
          }
          await engine.sendMessage(text);
          if (engine.getState().requestState === 'error') {
            return { ok: false, error: engineStateError(engine) };
          }
          return ok();
        }
        case 'abort': {
          if (!engine) {
            return fail('ai-chat engine is not ready (external engine switch in progress)');
          }
          await engine.abort();
          return ok();
        }
        case 'clear': {
          if (!engine) {
            return fail('ai-chat engine is not ready (external engine switch in progress)');
          }
          // FIND-04 category-sweep: `engine.clear` silently no-ops while a
          // turn is in-flight (documented engine guard) — report the drop
          // instead of a lying ok:true.
          if (engine.getState().isProcessing) {
            return engineBusy();
          }
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
