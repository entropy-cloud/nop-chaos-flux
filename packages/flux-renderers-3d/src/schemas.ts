import type { ActionSchema, BaseSchema, SchemaInput, SchemaObject } from '@nop-chaos/flux-core';

/**
 * three-canvas 渲染器 schema（design-renderer.md §1，v5）。
 *
 * 559 后记（2026-10-10，用户裁定）：自研绑定过渡（tween/spring/step）与自研关键帧 clip
 * （time/state/event）已整体删除——时间线动画统一走 three 原生体系（GLTF clip
 * `initialAnimation`、SceneJSON 自带动画资产）；绑定只保留纯数据映射
 * （range/convert/condition），事件只有 onObjectClick/Hover/Ready/Error。
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
  /**
   * events 对象整体注册为 kind: 'prop'（design.md D3）：平台 classifyField 仅按顶层 key
   * 精确分类、无点号路径（industrial renderer-definitions.ts:37-38 先例）；
   * 渲染器内经 createNormalizedActionEvent + helpers.dispatch 桥接。
   */
  events?: ThreeCanvasEvents;
  loading?: SchemaInput;
  empty?: SchemaInput;
  /**
   * plan 473 (V3-F4): 容器高度（CSS 值）。默认 '400px' 向后兼容；容器样式属性，
   * 不参与场景语义（renderer definition fields 保护区触碰已按 plan-first 评估，
   * 见 docs/analysis/visual-quality/V3-threejs-visuals.md §2）。
   */
  height?: string;
}

/**
 * 场景双形态（559 Phase 2，薄桥接裁定）：
 * - `{ models: [...] }`：自定义声明式图元（兼容保留，primitive 直建 / GLTF loader）；
 * - `{ json: <SceneJSON> }`：three.js 原生 SceneJSON（Object3D.toJSON / three 编辑器导出），
 *   经 THREE.ObjectLoader 直接装配——外部引擎 JSON 即渲染契约；绑定按对象 `name` 寻址
 *   （traverse 注册 name 非空对象，首名注册、重名 `scene-json-duplicate-name` 诊断跳过）；
 *   拾取交互缺省关闭，`interactiveObjects` 点名开启。二选一：json 存在时优先。
 */
export interface ThreeSceneConfig {
  camera: CameraConfig;
  lights: LightConfig[];
  environment?: EnvironmentConfig;
  models?: ModelConfig[];
  json?: unknown;
  /** json 形态下参与射线拾取（click/hover）的对象 name 清单；models 形态忽略。 */
  interactiveObjects?: string[];
}

export interface CameraConfig {
  position: [number, number, number];
  fov?: number;
  near?: number;
  far?: number;
  /** 轨道控制可配置面（559 Phase 2）；缺省维持引擎内置（damping 开、其余 three 默认）。 */
  controls?: CameraControlsConfig;
}

export interface CameraControlsConfig {
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  minDistance?: number;
  maxDistance?: number;
  maxPolarAngle?: number;
  enablePan?: boolean;
}

export interface EnvironmentConfig {
  background?: string;
  fog?: FogConfig;
  /** 色调映射（559 Phase 2）；缺省 none 维持既有视觉（NoToneMapping）。 */
  toneMapping?: 'none' | 'aces' | 'reinhard';
}

export interface FogConfig {
  color: string;
  near: number;
  far: number;
}

export type PrimitiveGeometryType = 'box' | 'sphere' | 'cylinder' | 'plane' | 'cone' | 'torus' | 'tube' | 'capsule';

export interface PrimitiveGeometryConfig {
  type: PrimitiveGeometryType;
  /** 几何参数（按 type 约定：box width/height/depth；sphere radius/widthSegments/heightSegments 等） */
  args?: Record<string, number>;
  /** tube 专用：CatmullRom 样条控制点序列（工业管线布线）；args.radius/args.tubularSegments/args.closed 配合 */
  path?: [number, number, number][];
}

export type PrimitiveMaterialType = 'standard' | 'basic' | 'lambert' | 'phong';

export interface PrimitiveMaterialConfig {
  type?: PrimitiveMaterialType;
  color?: string;
  opacity?: number;
  transparent?: boolean;
  wireframe?: boolean;
  flatShading?: boolean;
  /** PBR 参数（standard 材质；559 Phase 2）：金属度/粗糙度。 */
  metalness?: number;
  roughness?: number;
  /** 自发光（standard/lambert/phong；告警变色通道）：颜色 + 强度。 */
  emissive?: string;
  emissiveIntensity?: number;
}

/** 声明式图元（无 GLB）：geometry 必填，material 缺省 MeshStandardMaterial */
export interface PrimitiveModelConfig {
  geometry: PrimitiveGeometryConfig;
  material?: PrimitiveMaterialConfig;
}

export interface ModelConfig {
  /** 唯一 id，绑定引用键；加载后 mesh.name = id */
  id: string;
  /** GLTF/GLB 资源地址（与 primitive 互斥：url XOR primitive，双源 primitive 优先） */
  url?: string;
  /** 声明式图元：给定时同步注册（即时就绪，不经 loader） */
  primitive?: PrimitiveModelConfig;
  position?: [number, number, number];
  /** 弧度；Euler.set 要求三元（z 必填） */
  rotation?: [number, number, number];
  scale?: [number, number, number];
  /** false 的模型不参与射线拾取（默认 false） */
  interactive?: boolean;
  /** 模型标注文字（559 Phase 2）：CanvasTexture Sprite 挂为子节点，锚定包围盒上方或 labelOffset。 */
  label?: string;
  /** label 悬挂偏移；缺省自动置于包围盒上方。 */
  labelOffset?: [number, number, number];
  /** plan 473 (V3-F2): mesh-level shadow flags (applied to all child meshes). */
  castShadow?: boolean;
  receiveShadow?: boolean;
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
}

export interface RangeConfig {
  input: [number, number];
  output: [number, number];
}


export interface ConditionConfig {
  expression: string;
  trueValue: unknown;
  falseValue: unknown;
}

