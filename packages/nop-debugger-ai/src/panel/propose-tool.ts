import type { NopDebuggerController, NopSchemaPatch, NopSchemaPatchScope } from '@nop-chaos/nop-debugger';
import type { AiToolSchema, ToolExecutionResult, ToolExecutor } from '@nop-chaos/flux-renderers-ai';
import { normalizeRedactionOptions, redactData } from '@nop-chaos/nop-debugger';
import { truncateToCharCap } from '../trim.js';
import { createDebuggerAiTools } from '../create-debugger-ai-tools.js';
import { createPatchCandidateStore, type PatchCandidateDeps, type PatchCandidateStore } from './patch-candidates.js';

const PROPOSE_TOOL_NAME = 'propose_schema_patch';

const PROPOSE_TOOL_SCHEMA: AiToolSchema = {
  type: 'function',
  function: {
    name: PROPOSE_TOOL_NAME,
    description:
      'Propose a schema/expression-level patch for a mounted node (set a property value or an expression). The proposal is VALIDATED and STAGED for human review — it is never applied automatically. Structural changes and page control are not supported.',
    parameters: {
      type: 'object',
      properties: {
        target: {
          type: 'object',
          properties: {
            cid: { type: 'number', description: 'mounted node cid' },
            nodeId: { type: 'string' },
            path: { type: 'string' },
          },
          description: 'exactly one node target (cid, or unique nodeId/path)',
        },
        ops: {
          type: 'array',
          description: '1-20 ops; each { type: "set-prop", field, value } or { type: "set-expression", field, expression }',
          items: { type: 'object' },
        },
        reason: { type: 'string', description: 'why this patch is proposed (shown to the human reviewer)' },
      },
      required: ['target', 'ops'],
    },
  },
};

interface ProposeToolDeps {
  controller: NopDebuggerController;
  store: PatchCandidateStore;
}

let proposeSequence = 0;

function buildPatch(deps: ProposeToolDeps, args: Record<string, unknown>): NopSchemaPatch {
  const rawTarget = (args.target ?? {}) as { cid?: number; nodeId?: string; path?: string };
  const target: NopSchemaPatchScope['target'] = {};
  if (typeof rawTarget.cid === 'number') target.cid = rawTarget.cid;
  if (typeof rawTarget.nodeId === 'string') target.nodeId = rawTarget.nodeId;
  if (typeof rawTarget.path === 'string') target.path = rawTarget.path;
  proposeSequence += 1;
  return {
    id: `patch-${Date.now()}-${proposeSequence}`,
    createdAt: Date.now(),
    scope: { controllerId: deps.controller.id, target },
    ops: args.ops as NopSchemaPatch['ops'],
    ...(typeof args.reason === 'string' && args.reason.trim() ? { reason: args.reason } : {}),
  };
}

function toToolResult(payload: unknown, ok: boolean, error?: string): ToolExecutionResult {
  if (!ok) {
    return { ok: false, error };
  }
  const redacted = redactData(payload, normalizeRedactionOptions(undefined));
  return { ok: true, result: truncateToCharCap(JSON.stringify(redacted) ?? 'null', 4_000) };
}

/**
 * Validate-and-stage the model's patch proposal. Never applies: the ONLY path
 * to the host applier is the human adopt action on the preview card.
 */
export async function executeProposeSchemaPatch(
  deps: ProposeToolDeps,
  rawArgs: unknown,
): Promise<ToolExecutionResult> {
  if (!rawArgs || typeof rawArgs !== 'object' || Array.isArray(rawArgs)) {
    return toToolResult(undefined, false, 'invalid arguments: expected a JSON object with target and ops');
  }
  const args = rawArgs as Record<string, unknown>;
  if (!args.target || typeof args.target !== 'object' || Array.isArray(args.target)) {
    return toToolResult(null, false, 'invalid arguments: "target" (object with cid/nodeId/path) is required');
  }
  if (!Array.isArray(args.ops)) {
    return toToolResult(null, false, 'invalid arguments: "ops" (array) is required');
  }
  const patch = buildPatch(deps, args);
  const validation = deps.controller.validateSchemaPatch(patch);
  if (!validation.ok) {
    return toToolResult(null, false, `proposal rejected by validation: ${validation.errors.join('; ')}`);
  }
  const staged = deps.store.stage(patch, validation);
  if (!staged.ok) {
    return toToolResult(null, false, staged.error);
  }
  return toToolResult(
    {
      candidateId: patch.id,
      resolvedTarget: validation.resolvedTarget,
      stagedOps: patch.ops.length,
      note: 'staged for human review; it is NOT applied until the reviewer adopts it in the debugger panel',
    },
    true,
  );
}

/**
 * The model-facing toolset: the 10 read-only diagnostics tools + the stage-only
 * proposal tool, behind ONE dispatcher. No apply/revert channel exists on this
 * surface — adoption is a human action on the preview card (pinned by tests).
 */
export function composeDebuggerAiToolset(input: {
  controller: NopDebuggerController;
  store?: PatchCandidateStore;
  preview?: PatchCandidateDeps['preview'];
  redaction?: Parameters<typeof normalizeRedactionOptions>[0];
  maxResultChars?: number;
}): { tools: AiToolSchema[]; toolExecutor: ToolExecutor; store: PatchCandidateStore } {
  const store = input.store ?? createPatchCandidateStore();
  const readOnly = createDebuggerAiTools({
    automation: input.controller.automation,
    redaction: input.redaction,
    maxResultChars: input.maxResultChars,
  });
  const deps: ProposeToolDeps & PatchCandidateDeps = {
    controller: input.controller,
    store,
    ...(input.preview ? { preview: input.preview } : {}),
  };
  const toolExecutor: ToolExecutor = async ({ toolCall, signal }) => {
    if (toolCall.function?.name === PROPOSE_TOOL_NAME) {
      if (signal.aborted) {
        return { ok: false, error: 'aborted before execution' };
      }
      let rawArgs: unknown;
      try {
        rawArgs = JSON.parse(toolCall.function.arguments || '{}');
      } catch {
        return { ok: false, error: 'invalid arguments: not valid JSON' };
      }
      return executeProposeSchemaPatch(deps, rawArgs);
    }
    return readOnly.toolExecutor({ toolCall, signal });
  };
  return {
    tools: [...readOnly.tools, PROPOSE_TOOL_SCHEMA],
    toolExecutor,
    store,
  };
}
