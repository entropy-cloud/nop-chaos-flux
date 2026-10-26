import type { AiToolSchema, ToolExecutor } from '@nop-chaos/flux-renderers-ai';
import type { NopDebuggerAutomationApi, NopDebuggerRedactionOptions } from '@nop-chaos/nop-debugger';

export interface DebuggerAiToolsOptions {
  automation: NopDebuggerAutomationApi;
  /** Redaction policy applied to every serialized tool result; defaults to the debugger defaults. */
  redaction?: NopDebuggerRedactionOptions;
  /** Serialized tool results are truncated to this many characters (default 20000). */
  maxResultChars?: number;
}

export interface DebuggerAiTools {
  tools: AiToolSchema[];
  toolExecutor: ToolExecutor;
}
