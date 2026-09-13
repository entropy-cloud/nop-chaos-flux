export { threeCanvasRendererDefinition, registerThreeRenderers } from './renderer-definitions.js';
export { ThreeCanvasRenderer } from './renderer/three-canvas.js';
export { SceneManager, type FrameUpdate, type FrameUpdateQueue, type PickEvent, type HoverEvent, type DiagnosticEvent } from './engine/scene-manager.js';
export { ModelLoader } from './engine/model-loader.js';
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
  AnimationConfig,
} from './schemas.js';
