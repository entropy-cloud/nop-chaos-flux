import type { ActionSchema, BaseSchema, SchemaInput, SchemaObject } from '@nop-chaos/flux-core';

/**
 * three-canvas 渲染器 schema（design-renderer.md §1，v5）。
 *
 * `AnimationConfig` 与 `DataBinding.transform`/`condition` 在 I2.1 仅类型声明：
 * TransformEngine/插值消费在 I2.2（plan 465 Non-Goals），绑定管线内 transform 阶段为 identity 接缝。
 */

export interface ThreeCanvasEvents extends SchemaObject {
  /** 对象点击，payload: { modelId, point: {x,y,z} } */
  onObjectClick?: ActionSchema;
  /** 对象悬停进/出，payload: { modelId, hovered } */
  onObjectHover?: ActionSchema;
  /** 场景就绪（模型全部加载完成后触发一次） */
  onReady?: ActionSchema;
  /** 运行时诊断（model-load-failed / webgl-unavailable 等），payload: { code, message } */
  onError?: ActionSchema;
}

export interface ThreeCanvasSchema extends BaseSchema {
  type: 'three-canvas';
  /** 结构化 prop 按平台索引签名约束以 `& SchemaObject` 承载（scada config 字段同法），渲染期经 parseThreeSceneConfig 收紧 */
  scene: ThreeSceneConfig & SchemaObject;
  bindings?: (DataBinding & SchemaObject)[];
  animations?: (AnimationConfig & SchemaObject)[];
  /**
   * events 对象整体注册为 kind: 'prop'（design.md D3）：平台 classifyField 仅按顶层 key
   * 精确分类、无点号路径（industrial renderer-definitions.ts:37-38 先例）；
   * 渲染器内经 createNormalizedActionEvent + helpers.dispatch 桥接。
   */
  events?: ThreeCanvasEvents;
  loading?: SchemaInput;
  empty?: SchemaInput;
}

export interface ThreeSceneConfig {
  camera: CameraConfig;
  lights: LightConfig[];
  environment?: EnvironmentConfig;
  models: ModelConfig[];
}

export interface CameraConfig {
  position: [number, number, number];
  fov?: number;
  near?: number;
  far?: number;
}

export interface EnvironmentConfig {
  background?: string;
  fog?: FogConfig;
}

export interface FogConfig {
  color: string;
  near: number;
  far: number;
}

export interface ModelConfig {
  /** 唯一 id，绑定引用键；加载后 mesh.name = id */
  id: string;
  /** GLTF/GLB 资源地址 */
  url: string;
  position?: [number, number, number];
  /** 弧度；Euler.set 要求三元（z 必填） */
  rotation?: [number, number, number];
  scale?: [number, number, number];
  /** false 的模型不参与射线拾取（默认 false） */
  interactive?: boolean;
  initialAnimation?: string;
}

export type LightType = 'ambient' | 'directional' | 'point' | 'spot' | 'hemisphere';

export interface LightConfig {
  type: LightType;
  color?: string;
  intensity?: number;
  position?: [number, number, number];
  /** directional 专用；设置后 target 需 scene.add(light.target) */
  target?: [number, number, number];
  /** hemisphere 专用：地面色（天空色取 color） */
  groundColor?: string;
  castShadow?: boolean;
}

export type BindingTargetType = 'position' | 'rotation' | 'scale' | 'material' | 'visible' | 'custom';

export interface DataBinding {
  id: string;
  target: {
    modelId: string;
    /** 点分路径：position / rotation / scale / visible / material.color / material.opacity */
    path: string;
    type: BindingTargetType;
  };
  source: {
    /** `${expr}` 平台语法（唯一入口） */
    expression: string;
    /** 预留：跨 scope 引用（首版不实现） */
    scope?: string;
  };
  /** I2.2 TransformEngine 消费；I2.1 仅类型 */
  transform?: TransformConfig;
  /** I2.2 TransformEngine 消费；I2.1 仅类型 */
  condition?: ConditionConfig;
}

export interface TransformConfig {
  /** flux 表达式，注入 value 变量 */
  convert?: string;
  range?: RangeConfig;
  animation?: BindingAnimationConfig;
}

export interface RangeConfig {
  input: [number, number];
  output: [number, number];
}

export interface BindingAnimationConfig {
  type: 'tween' | 'spring' | 'step';
  duration?: number;
  easing?: string;
}

export interface ConditionConfig {
  expression: string;
  trueValue: unknown;
  falseValue: unknown;
}

export interface AnimationKeyframe {
  time: number;
  value: unknown;
  easing?: string;
}

export interface AnimationConfig {
  id: string;
  trigger: {
    type: 'state' | 'event' | 'time';
    source: string;
    value?: unknown;
  };
  target: {
    modelId: string;
    property: string;
  };
  keyframes: AnimationKeyframe[];
  loop?: {
    type: 'once' | 'loop' | 'pingpong';
    count?: number;
  };
}
