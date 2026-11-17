import type {
  ActionContext,
  ExpressionCompiler,
  ModuleCache,
  PageStoreApi,
  RendererEnv,
  RendererMonitor,
  RendererPlugin,
  RendererRegistry,
  SchemaCompiler,
} from '@nop-chaos/flux-core';

export interface CreateRendererRuntimeInput {
  registry: RendererRegistry;
  env: RendererEnv;
  expressionCompiler?: ExpressionCompiler;
  schemaCompiler?: SchemaCompiler;
  formulaRegistry?: import('@nop-chaos/flux-formula').FormulaRegistry;
  plugins?: RendererPlugin[];
  pageStore?: PageStoreApi;
  moduleCache?: ModuleCache;
  strictMode?: boolean;
  debugExpressionSamplingRate?: number;
  debugScopeDebounceMs?: number;
  onActionError?: (error: unknown, ctx: ActionContext) => void;
  monitor?: RendererMonitor;
}
