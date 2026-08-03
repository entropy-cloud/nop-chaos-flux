import { registerRendererDefinitions, type RendererRegistry } from '@nop-chaos/flux-core';
import { registerBuiltinScadaSymbols } from './symbols/register-builtin.js';
import { industrialRendererDefinitions } from './renderer-definitions.js';

export type { ScadaCanvasSchema, ScadaCanvasEvents } from './schemas.js';
export type {
  ScadaConfig,
  ScadaSymbolNode,
  ScadaPointDeclaration,
  ScadaConfigDiff,
  ScadaBinding,
  ScadaAnimation,
  ScadaAnimationKind,
  ScadaStateDeclaration,
  ScadaStateDefinition,
  ScadaSymbolEvent,
  ScadaPrimitive,
} from './serialization/config-types.js';
export type { ScadaSymbolDefinition, ScadaSymbolProps, ScadaSymbolStylePatch, ScadaFillStyle } from './symbols/symbol-types.js';
export {
  scadaImageType,
  scadaVideoType,
  SCADA_IMAGE_PLACEHOLDER,
  SCADA_VIDEO_PLACEHOLDER,
} from './symbols/base-shapes/index.js';
export type {
  ScadaPointValue,
  ScadaPointState,
  ScadaPointChangeEvent,
  PointChangeListener,
  Unsubscribe,
} from './binding/point-store.js';
export { PointStore, EventHub } from './binding/point-store.js';
export { ReverseIndex, extractPointIdRefs, collectBindingPointIds, type BindingTarget, type SymbolBindingTarget } from './binding/reverse-index.js';
export {
  DirtyCollector,
  RefreshPipeline,
  createTickScheduler,
  type ApplyAttrs,
  type CollectedEntry,
  type TickScheduler,
  type FrameScheduler,
  type RefreshPipelineOptions,
} from './binding/dirty-collector.js';
export { ExpressionEvaluator, type EvaluationResult, type ExpressionEvaluatorContext } from './binding/expression-evaluator.js';
export {
  BindResolver,
  applyScale,
  formatValue,
  isBindableProperty,
  BINDABLE_PROPERTIES,
  type BindResolverDeps,
  type ResolvedBinding,
  type BindableProperty,
} from './binding/bind-resolver.js';
export { resolveState, type ResolveStateOptions } from './binding/value-to-state.js';
export { Animator, type AnimatorOptions, type AnimatorEvents, type AnimationStartStopEvent } from './binding/animator.js';
export { HitResolver, type HitResolverOptions } from './engine/hit.js';
export {
  EventBridge,
  buildSymbolEventPayload,
  type EventBridgeOptions,
  type ScadaSymbolEventName,
  type ScadaSymbolEventPayload,
  type BuildSymbolEventPayloadInput,
} from './engine/event-bridge.js';

export { ScadaCanvasEngine, type ScadaEngineOptions } from './engine/scada-engine.js';
export { InteractionOverlay, INTERACTION_STYLE_PRESETS, type InteractionStyle, type InteractionState } from './engine/interaction-overlay.js';
export { StateVisualApplier } from './symbols/visual-state.js';
export { registerScadaSymbol, unregisterScadaSymbol, hasScadaSymbol } from './symbols/symbol-registry.js';
export { resolveSymbolStyle } from './symbols/style-resolver.js';
export {
  deepMergeInstanceProps,
  mergeInstanceProps,
  instantiateInstance,
  diffInstanceProps,
  scadaGroupType,
  scadaGroupDefinition,
} from './symbols/compound.js';
export {
  worldToViewport,
  viewportToWorld,
  fit,
  center,
  zoomAt,
  setViewport,
  MIN_SCALE,
  MAX_SCALE,
} from './engine/viewport.js';

export type { IndustrialRendererSchema } from './renderer-definitions.js';

registerBuiltinScadaSymbols();

export function registerScadaRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, industrialRendererDefinitions);
}
