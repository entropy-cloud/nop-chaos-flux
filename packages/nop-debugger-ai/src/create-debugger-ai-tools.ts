import type { ToolExecutionResult } from '@nop-chaos/flux-renderers-ai';
import type { ChatToolCall } from '@nop-chaos/flux-renderers-ai';
import { ToolArgsError } from './errors.js';
import { debuggerToolDefinitions } from './tools.js';
import {
  applyResultRedaction,
  DEFAULT_MAX_RESULT_CHARS,
  normalizeRedaction,
  truncateToCharCap,
} from './trim.js';
import type { DebuggerAiTools, DebuggerAiToolsOptions } from './types.js';

/**
 * Adapt the debugger automation API into engine-consumable model tools.
 *
 * Security shape (owner doc `docs/architecture/nop-debugger-ai.md`):
 * - explicit whitelist only — names outside the registry never reach automation
 * - `evaluateNodeExpression` and panel/session control methods are absent
 * - every result is per-tool projected, then redacted, then char-capped
 * - failures normalize to `ToolExecutionResult`; raw exception text never ships
 */
export function createDebuggerAiTools(options: DebuggerAiToolsOptions): DebuggerAiTools {
  const { automation } = options;
  const redaction = normalizeRedaction(options.redaction);
  const maxResultChars = options.maxResultChars ?? DEFAULT_MAX_RESULT_CHARS;

  const registry = new Map(debuggerToolDefinitions.map((definition) => [definition.name, definition]));
  const tools = debuggerToolDefinitions.map((definition) => ({
    type: 'function' as const,
    function: {
      name: definition.name,
      description: definition.description,
      parameters: definition.parameters,
    },
  }));

  const toolExecutor = async ({ toolCall, signal }: { toolCall: ChatToolCall; signal: AbortSignal }): Promise<ToolExecutionResult> => {
    if (signal.aborted) {
      return { ok: false, error: 'aborted before execution' };
    }

    const name = toolCall.function?.name ?? '';
    const definition = registry.get(name);
    if (!definition) {
      return {
        ok: false,
        error: `unknown tool: ${name || '(empty)'}. available tools: ${[...registry.keys()].join(', ')}`,
      };
    }

    let rawArgs: unknown;
    try {
      rawArgs = JSON.parse(toolCall.function.arguments || '{}');
    } catch {
      return {
        ok: false,
        error: `invalid arguments: not valid JSON; expected object matching schema for ${name}`,
      };
    }
    if (rawArgs === null || typeof rawArgs !== 'object' || Array.isArray(rawArgs)) {
      return { ok: false, error: `invalid arguments: expected a JSON object for ${name}` };
    }

    let args: unknown[];
    try {
      args = definition.parse(rawArgs as Record<string, unknown>);
    } catch (error) {
      if (error instanceof ToolArgsError) {
        return { ok: false, error: error.message };
      }
      return { ok: false, error: `tool ${name} failed (internal error)` };
    }

    let result: unknown;
    try {
      result = definition.invoke(automation, args);
    } catch {
      return { ok: false, error: `tool ${name} failed (internal error)` };
    }

    const projected = definition.project ? definition.project(result) : result;
    const redacted = applyResultRedaction(projected, redaction);
    return {
      ok: true,
      result: truncateToCharCap(JSON.stringify(redacted) ?? 'null', maxResultChars),
    };
  };

  return { tools, toolExecutor };
}
