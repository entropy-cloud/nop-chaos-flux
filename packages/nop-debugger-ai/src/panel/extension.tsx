import type { NopDebuggerAutomationApi, NopDebuggerController, NopDebuggerRedactionOptions, NopSchemaPatch } from '@nop-chaos/nop-debugger';
import type { AiConnector, MessageEngine } from '@nop-chaos/flux-renderers-ai';
import { createMessageEngine, createReactMessageAdapter } from '@nop-chaos/flux-renderers-ai';
import { t } from '@nop-chaos/flux-i18n';
import { DEBUGGER_AI_SYSTEM_PROMPT } from './prompt.js';
import { AiSessionTab } from './session.js';
import { composeDebuggerAiToolset } from './propose-tool.js';
import { createPatchCandidateStore, type PatchCandidateStore } from './patch-candidates.js';
import { PatchQueue } from './patch-queue.js';

export interface AiDebuggerExtensionInput {
  controller: NopDebuggerController;
  /** Host-built connector (owner doc §Connector Injection Contract). Null = session disabled for sending. */
  connector: AiConnector | null;
  /** Automation surface; defaults to `controller.automation`. */
  automation?: NopDebuggerAutomationApi;
  redaction?: NopDebuggerRedactionOptions;
  maxResultChars?: number;
  /**
   * Host sandbox preview for staged patch candidates (text summary in v1).
   * The host typically takes this from its applier's own `preview?` method.
   */
  preview?: (patch: NopSchemaPatch) => Promise<{ kind: 'rendered'; summary: string } | { kind: 'unsupported' }>;
}

export interface AiDebuggerExtension {
  /** Unregister the AI tab and drop the shared engine + candidate store. */
  dispose(): void;
}

// Engines and candidate stores live outside React so tab unmount/remount
// keeps the conversation and staged proposals. Keyed by controller id.
const engines = new Map<string, MessageEngine>();
const candidateStores = new Map<string, PatchCandidateStore>();

function getOrCreateEngine(input: AiDebuggerExtensionInput): MessageEngine {
  const existing = engines.get(input.controller.id);
  if (existing) {
    return existing;
  }
  // Read-only diagnostics + stage-only propose behind one dispatcher; no
  // apply/revert tool exists on the model face (adoption is the human gate).
  const { tools, toolExecutor, store } = composeDebuggerAiToolset({
    controller: input.controller,
    ...(input.preview ? { preview: input.preview } : {}),
    ...(input.redaction ? { redaction: input.redaction } : {}),
    ...(input.maxResultChars !== undefined ? { maxResultChars: input.maxResultChars } : {}),
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
  candidateStores.set(input.controller.id, store);
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
  const candidateStore = candidateStores.get(controller.id) ?? createPatchCandidateStore();
  const unregister = controller.registerPanelTab({
    id: 'x-ai',
    label: t('flux.debugger.ai.tabLabel'),
    render: (context) => (
      <AiSessionTab
        engine={engine}
        connector={input.connector}
        getInspectSelection={context.getInspectSelection}
        redaction={input.redaction}
        patchQueue={
          <PatchQueue
            controller={input.controller}
            store={candidateStore}
            {...(input.preview ? { preview: input.preview } : {})}
          />
        }
      />
    ),
  });
  return {
    dispose() {
      unregister();
      engines.delete(controller.id);
      candidateStores.delete(controller.id);
    },
  };
}
