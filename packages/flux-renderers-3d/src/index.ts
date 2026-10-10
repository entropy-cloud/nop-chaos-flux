export { threeCanvasRendererDefinition, registerThreeRenderers } from './renderer-definitions.js';
// 统一延迟加载：three.js 只能经 renderer-definitions 的异步 chunk（three-canvas）触达；
// 包入口不再静态再导出 ThreeCanvasRenderer / SceneManager / ModelLoader（zero-consumer
// 收敛先例：flux-renderers-industrial plan 2026-08-04-1558-1 Phase 2），宿主运行时只需
// registerThreeRenderers；引擎直用方走包内 relative path 或自行动态 import。
export { ReconnectionManager } from './data-source/reconnection-manager.js';
export { IndustrialAdapter } from './data-source/industrial-adapter.js';
export { SchemaValidator } from './ai/schema-validator.js';
export { AISchemaGenerator } from './ai/schema-generator.js';
export type { LlmProvider } from './ai/schema-generator.js';
export type { ValidationError, ValidationResult } from './ai/schema-validator.js';
export type { IndustrialTagConfig, IndustrialTag } from './data-source/industrial-adapter.js';
export {
  analyzeBindingSubscriptions,
  createPrivateEvalScope,
  extractExpressionDepsViaProbe,
  normalizeBindingExpression,
  probeExpressionPaths,
} from './binding/flux-eval.js';
export type {
  ThreeCanvasSchema,
  ThreeSceneConfig,
  ModelConfig,
  LightConfig,
  DataBinding,
  ThreeCanvasEvents,
} from './schemas.js';
