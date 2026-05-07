import type {
  ActionContext,
  ActionResult,
  ActionRuntimeAdapter,
  CompiledActionProgram,
  RendererEnv,
  RendererPlugin,
  RendererRuntime,
} from '@nop-chaos/flux-core';
import type { ActionEvaluator } from '../action-core.js';

export interface ActionDispatcherConfig {
  getEnv: () => RendererEnv;
  plugins?: RendererPlugin[];
  onActionError?: (error: unknown, ctx: ActionContext) => void;
  evaluator: ActionEvaluator;
  adapter: ActionRuntimeAdapter;
  runtime: RendererRuntime;
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
  runtime: RendererRuntime;
  compiledProgramCache: WeakMap<object, CompiledActionProgram>;
  pendingDebounces: Map<string, PendingDebounceEntry>;
}
