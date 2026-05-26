import type {
  ActionContext,
  ActionResult,
  ActionRuntimeAdapter,
  ActionSchema,
  CompiledActionProgram,
  ExpressionCompiler,
  RendererEnv,
  RendererPlugin,
} from '@nop-chaos/flux-core';
import type { ActionEvaluator } from '../action-core.js';

export interface ActionProgramCompiler {
  compile(
    action: ActionSchema | ActionSchema[],
    compiler: ExpressionCompiler,
  ): CompiledActionProgram;
}

export interface ActionDispatcherConfig {
  getEnv: () => RendererEnv;
  plugins?: RendererPlugin[];
  onActionError?: (error: unknown, ctx: ActionContext) => void;
  evaluator: ActionEvaluator;
  adapter: ActionRuntimeAdapter;
  expressionCompiler?: ExpressionCompiler;
  actionProgramCompiler?: ActionProgramCompiler;
}

export interface PendingDebounceEntry {
  timer: ReturnType<typeof setTimeout>;
  resolve: (result: ActionResult) => void;
  reject: (error: unknown) => void;
}

export interface ActionDispatcherContext {
  getEnv: () => RendererEnv;
  plugins?: RendererPlugin[];
  onActionError?: (error: unknown, ctx: ActionContext) => void;
  evaluator: ActionEvaluator;
  adapter: ActionRuntimeAdapter;
  expressionCompiler?: ExpressionCompiler;
  actionProgramCompiler?: ActionProgramCompiler;
  compiledProgramCache: WeakMap<object, CompiledActionProgram>;
  pendingDebounces: Map<string, PendingDebounceEntry>;
  rootAbortController: AbortController;
}
