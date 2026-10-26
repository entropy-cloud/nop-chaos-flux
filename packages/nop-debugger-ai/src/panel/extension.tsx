import type { NopDebuggerAutomationApi, NopDebuggerController, NopDebuggerRedactionOptions } from '@nop-chaos/nop-debugger';
import type { AiConnector, MessageEngine } from '@nop-chaos/flux-renderers-ai';
import { createMessageEngine, createReactMessageAdapter } from '@nop-chaos/flux-renderers-ai';
import { t } from '@nop-chaos/flux-i18n';
import { createDebuggerAiTools } from '../create-debugger-ai-tools.js';
import { DEBUGGER_AI_SYSTEM_PROMPT } from './prompt.js';
import { AiSessionTab } from './session.js';

export interface AiDebuggerExtensionInput {
  controller: NopDebuggerController;
  /** Host-built connector (owner doc §Connector Injection Contract). Null = session disabled for sending. */
  connector: AiConnector | null;
  /** Automation surface; defaults to `controller.automation`. */
  automation?: NopDebuggerAutomationApi;
  redaction?: NopDebuggerRedactionOptions;
  maxResultChars?: number;
}

export interface AiDebuggerExtension {
  /** Unregister the AI tab and drop the shared engine. */
  dispose(): void;
}

// Engines live outside React so tab unmount/remount keeps the conversation.
const engines = new Map<string, MessageEngine>();

function getOrCreateEngine(input: AiDebuggerExtensionInput): MessageEngine {
  const existing = engines.get(input.controller.id);
  if (existing) {
    return existing;
  }
  const { tools, toolExecutor } = createDebuggerAiTools({
    automation: input.automation ?? input.controller.automation,
    redaction: input.redaction,
    maxResultChars: input.maxResultChars,
  });
  const engine = createMessageEngine({
    // React-bound engines require the snapshot-caching adapter (useEngineView
    // contract) or useSyncExternalStore loops on fresh snapshots per getState.
    adapter: createReactMessageAdapter(),
    connector: input.connector,
    tools,
    toolExecutor,
    systemPrompt: DEBUGGER_AI_SYSTEM_PROMPT,
  });
  engines.set(input.controller.id, engine);
  return engine;
}

/**
 * Register the `x-ai` panel tab. Default-off by construction: nothing renders
 * or loads unless the host calls this (owner doc §AI Panel Tab Extension
 * Seam). The tab label is captured at registration time — re-create the
 * extension after a language switch.
 */
export function createAiDebuggerExtension(input: AiDebuggerExtensionInput): AiDebuggerExtension {
  const controller = input.controller;
  const engine = getOrCreateEngine(input);
  const unregister = controller.registerPanelTab({
    id: 'x-ai',
    label: t('flux.debugger.ai.tabLabel'),
    render: (context) => (
      <AiSessionTab
        engine={engine}
        connector={input.connector}
        getInspectSelection={context.getInspectSelection}
        redaction={input.redaction}
      />
    ),
  });
  return {
    dispose() {
      unregister();
      engines.delete(controller.id);
    },
  };
}
