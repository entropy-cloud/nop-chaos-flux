import { useEffect, useState } from 'react';
import { createMessageEngine } from '../engine/create-engine.js';
import { createReactMessageAdapter } from './react-adapter.js';
import { useEngineView, type UseEngineViewReturn } from './use-engine-view.js';
import type {
  AiConnector,
  AiToolSchema,
  ChatMessage,
  MessageEngine,
  MessageEnginePlugin,
  ToolExecutor,
} from '../engine/types.js';

export interface UseMessageOptions {
  /**
   * Optional external `MessageEngine` to bind instead of self-creating one
   * (design.md §11.2/§11.5). When provided, `useMessage` binds this engine —
   * e.g. `useConversation.activeEngine` — so the chat surface shares the
   * conversation manager's single engine (persistence / multi-conversation
   * scenarios). When omitted or null, `useMessage` self-creates an engine
   * (zero-regression default).
   *
   * The self-built engine is still instantiated once via a lazy `useState`
   * initializer (rules-of-hooks: the hook is always called unconditionally;
   * the condition falls on the value, not the call) but kept idle when an
   * external engine is bound.
   */
  engine?: MessageEngine | null;
  connector: AiConnector | null;
  initialMessages?: ChatMessage[];
  plugins?: MessageEnginePlugin[];
  /** Extra OpenAI-compatible params forwarded on every request. */
  extraRequestParams?: Record<string, unknown>;
  systemPrompt?: string;
  /** Host-provided tool schemas forwarded as `request.tools`. */
  tools?: AiToolSchema[];
  /** Host-provided tool executor (enables multi-round tool_calls loops). */
  toolExecutor?: ToolExecutor | null;
  /** Max consecutive tool-calling rounds (default 8). */
  maxToolRounds?: number;
}

export type UseMessageReturn = UseEngineViewReturn;

/**
 * Bind a `MessageEngine` to React. By default the engine is created once via a
 * lazy `useState` initializer with a `createReactMessageAdapter`, so
 * `useSyncExternalStore` receives stable snapshot references. A connector
 * reference change hot-swaps via `engine.setConnector` without rebuilding the
 * engine (design.md §18.3 #18; setConnector is idempotent on mount).
 *
 * When `options.engine` is provided, that external engine is bound instead and
 * the self-built engine stays idle — this unifies `ai-chat` with host-side
 * conversation managers (`useConversation.activeEngine`). The external engine
 * owns its own connector lifecycle, so the hot-swap effect is skipped for it
 * (review m4: never touch an external engine's connector).
 *
 * Per AGENTS.md React 19 guidance: no `useMemo`/`useCallback` by default; the
 * stable bound `subscribe`/`getSnapshot` come from the engine closure (via the
 * shared `useEngineView` binding).
 */
export function useMessage(options: UseMessageOptions): UseMessageReturn {
  const [selfEngine] = useState<MessageEngine>(() =>
    createMessageEngine({
      connector: options.connector,
      initialMessages: options.initialMessages,
      plugins: options.plugins,
      extraRequestParams: options.extraRequestParams,
      systemPrompt: options.systemPrompt,
      tools: options.tools,
      toolExecutor: options.toolExecutor,
      maxToolRounds: options.maxToolRounds,
      adapter: createReactMessageAdapter(),
    }),
  );

  const externalEngine = options.engine ?? undefined;
  const engine = externalEngine ?? selfEngine;

  // Hot-swap the connector when the host passes a new instance (model/provider
  // switch). Only applies to the SELF-BUILT engine: an external engine (e.g.
  // `useConversation.activeEngine`) is built by its owner with the host
  // connector already wired, so touching it here would race the owner.
  // In-flight requests keep the old connector; the next send uses the new one
  // (design.md §10.5). Idempotent on mount / when ref is unchanged.
  const { connector } = options;
  useEffect(() => {
    if (externalEngine) return;
    if (connector) {
      selfEngine.setConnector(connector);
    }
  }, [selfEngine, connector, externalEngine]);

  return useEngineView(engine);
}
