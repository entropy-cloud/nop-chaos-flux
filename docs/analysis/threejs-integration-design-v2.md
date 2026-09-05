# Three.js 3D场景集成设计文档 v2

> **文档版本**: 2.0  
> **更新日期**: 2026-09-05  
> **状态**: 设计评审中

---

## 1. 设计背景与目标

### 1.1 业务需求

在nop-chaos-flux低代码平台中集成Three.js 3D渲染能力，实现：

- **数据驱动3D场景**：外部状态变化自动驱动3D对象属性更新（如：阀门状态→旋转角度）
- **AI场景生成**：通过规范接口让AI自动生成3D场景配置
- **工业协议联动**：与Modbus/OPC-UA等工业协议数据源无缝集成

### 1.2 设计目标

| 目标         | 说明                     | 量化指标                       |
| ------------ | ------------------------ | ------------------------------ |
| **简单性**   | 方案易于理解和实现       | 接口数量 < 10个核心API         |
| **标准性**   | 遵循现有渲染器架构       | 复用RendererComponentProps模式 |
| **高性能**   | 支持60fps实时渲染        | 状态更新→渲染延迟 < 16ms       |
| **高可靠性** | 工业级稳定性             | 错误恢复时间 < 1s              |
| **AI友好**   | 接口规范清晰，易于AI生成 | JSON Schema完整覆盖            |

### 1.3 对比分析：FUXA vs nop-chaos-flux

| 维度         | FUXA                           | nop-chaos-flux             | 设计决策          |
| ------------ | ------------------------------ | -------------------------- | ----------------- |
| **渲染技术** | SVG + SVG.js                   | Leafer UI (2D)             | 新增Three.js (3D) |
| **状态管理** | Angular Service + EventEmitter | Zustand vanilla store      | 复用Zustand       |
| **数据绑定** | Socket.IO + 信号-Gauge映射     | 表达式 `${...}` + 作用域   | 复用表达式系统    |
| **组件模型** | 静态方法接口                   | RendererDefinition + Hooks | 复用渲染器契约    |
| **配置格式** | SVG字符串嵌入JSON              | 声明式Schema               | 复用Schema系统    |

**关键洞察**：FUXA的Socket.IO标签订阅模式适合实时工业场景，但其静态方法接口缺乏类型安全。nop-chaos-flux的表达式系统+作用域机制更强大，应充分利用。

---

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Flux Application                           │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      Zustand Store                            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │  │
│  │  │ Scene State │  │ App State   │  │ Industrial Protocol │  │  │
│  │  │ (3D对象属性)│  │ (UI/业务)   │  │ (Modbus/OPC-UA)    │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Three.js Renderer (新渲染器)                          │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  Schema: { type: "three-canvas", scene: {...}, bindings: [...] }│
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │ │
│  │  │ SceneParser │  │ BindingEngine│  │ AnimationController │   │ │
│  │  │ (AI生成配置)│  │ (表达式绑定) │  │ (动画插值)          │   │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘   │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Three.js Scene Graph                            │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  - GLTF/GLB模型加载                                          │ │
│  │  - 材质/纹理/光照                                             │ │
│  │  - 动画/粒子/后处理                                           │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 包结构设计

```
packages/
├── flux-renderers-3d/                    # 新增包
│   ├── src/
│   │   ├── index.ts                      # 包入口
│   │   ├── schemas.ts                    # Schema定义
│   │   ├── renderer-definitions.ts       # 渲染器定义
│   │   ├── renderer/
│   │   │   └── three-canvas-renderer.tsx # 核心渲染器组件
│   │   ├── engine/
│   │   │   ├── scene-manager.ts          # Three.js场景管理
│   │   │   ├── model-loader.ts           # 模型加载器
│   │   │   └── animation-controller.ts   # 动画控制器
│   │   ├── binding/
│   │   │   ├── binding-engine.ts         # 绑定引擎
│   │   │   └── expression-bridge.ts      # 表达式桥接
│   │   ├── ai/
│   │   │   ├── schema-generator.ts       # AI Schema生成器
│   │   │   └── prompt-templates.ts       # AI提示模板
│   │   └── types/
│   │       └── three-types.ts            # 类型定义
│   ├── package.json
│   └── tsconfig.json
```

---

## 3. 核心接口设计

### 3.1 Schema定义

```typescript
// schemas.ts
import type { BaseSchema, SchemaInput, SchemaObject, ActionSchema } from '@nop-chaos/flux-core';

/**
 * Three.js Canvas渲染器Schema
 *
 * AI生成此配置，框架自动渲染3D场景并与外部数据联动
 */
export interface ThreeCanvasSchema extends BaseSchema {
  type: 'three-canvas';

  /** 3D场景配置 */
  scene: ThreeSceneConfig;

  /** 数据绑定配置 */
  bindings?: DataBinding[];

  /** 动画配置 */
  animations?: AnimationConfig[];

  /** 事件配置 */
  events?: ThreeCanvasEvents;

  /** 加载态 */
  loading?: SchemaInput;

  /** 空态/错误态 */
  empty?: SchemaInput;
}

/**
 * 3D场景配置
 */
export interface ThreeSceneConfig {
  /** 相机配置 */
  camera: {
    position: [number, number, number];
    fov?: number;
    near?: number;
    far?: number;
  };

  /** 光照配置 */
  lights: LightConfig[];

  /** 环境配置 */
  environment?: {
    background?: string;
    fog?: { color: string; near: number; far: number };
    skybox?: string;
  };

  /** 3D模型列表 */
  models: ModelConfig[];

  /** 后处理效果 */
  postProcessing?: PostProcessingConfig;
}

/**
 * 3D模型配置
 */
export interface ModelConfig {
  /** 模型ID（用于绑定引用） */
  id: string;

  /** 模型URL（GLTF/GLB） */
  url: string;

  /** 位置 [x, y, z] */
  position?: [number, number, number];

  /** 旋转 [x, y, z]（弧度） */
  rotation?: [number, number, number];

  /** 缩放 [x, y, z] */
  scale?: [number, number, number];

  /** 是否可交互 */
  interactive?: boolean;

  /** 初始动画 */
  initialAnimation?: string;
}

/**
 * 光照配置
 */
export interface LightConfig {
  type: 'ambient' | 'directional' | 'point' | 'spot' | 'hemisphere';
  color?: string;
  intensity?: number;
  position?: [number, number, number];
  target?: [number, number, number];
  castShadow?: boolean;
}

/**
 * 数据绑定配置
 * 核心：将外部状态路径绑定到3D对象属性
 */
export interface DataBinding {
  /** 绑定ID */
  id: string;

  /** 目标3D对象 */
  target: {
    /** 模型ID或对象名称 */
    modelId: string;

    /** 属性路径（支持点分语法） */
    path: string;

    /** 属性类型 */
    type: 'position' | 'rotation' | 'scale' | 'material' | 'visible' | 'custom';
  };

  /** 数据源（Flux表达式） */
  source: {
    /** 表达式，如 "${sceneState.valve1.open}" */
    expression: string;

    /** 表达式上下文（可选，默认当前作用域） */
    scope?: string;
  };

  /** 转换配置 */
  transform?: {
    /** 值转换函数（JavaScript函数体） */
    convert?: string;

    /** 值范围映射 */
    range?: {
      input: [number, number];
      output: [number, number];
    };

    /** 动画配置 */
    animation?: {
      type: 'tween' | 'spring' | 'step';
      duration?: number;
      easing?: string;
    };
  };

  /** 条件绑定（可选） */
  condition?: {
    /** 条件表达式 */
    expression: string;

    /** 条件为真时的值 */
    trueValue: any;

    /** 条件为假时的值 */
    falseValue: any;
  };
}

/**
 * 动画配置
 */
export interface AnimationConfig {
  /** 动画ID */
  id: string;

  /** 触发条件 */
  trigger: {
    type: 'state' | 'event' | 'time';
    /** 状态路径或事件名 */
    source: string;
    /** 触发值（可选） */
    value?: any;
  };

  /** 动画目标 */
  target: {
    modelId: string;
    property: string;
  };

  /** 动画关键帧 */
  keyframes: Array<{
    time: number;
    value: any;
    easing?: string;
  }>;

  /** 循环配置 */
  loop?: {
    type: 'once' | 'loop' | 'pingpong';
    count?: number;
  };
}

/**
 * 事件配置
 */
export interface ThreeCanvasEvents extends SchemaObject {
  /** 对象点击 */
  onObjectClick?: ActionSchema;

  /** 对象悬停 */
  onObjectHover?: ActionSchema;

  /** 场景就绪 */
  onReady?: ActionSchema;

  /** 场景错误 */
  onError?: ActionSchema;
}
```

### 3.2 渲染器定义

```typescript
// renderer-definitions.ts
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { ThreeCanvasRenderer } from './renderer/three-canvas-renderer.js';

export const threeCanvasRendererDefinition: RendererDefinition = {
  type: 'three-canvas',
  displayName: 'Three.js Canvas',
  category: '3d',
  sourcePackage: '@nop-chaos/flux-renderers-3d',

  rendererClass: 'instance-renderer',
  component: ThreeCanvasRenderer,

  propContracts: {
    scene: {
      shape: { kind: 'object', fields: { camera: {...}, lights: {...}, models: {...} } },
      displayName: 'Scene Config',
      editorType: 'code',
    },
    bindings: {
      shape: { kind: 'array', items: { kind: 'object' } },
      displayName: 'Data Bindings',
      editorType: 'code',
    },
    animations: {
      shape: { kind: 'array', items: { kind: 'object' } },
      displayName: 'Animations',
      editorType: 'code',
    },
  },

  eventContracts: {
    onObjectClick: {
      displayName: 'Object Click',
      payload: {
        kind: 'object',
        fields: {
          modelId: { kind: 'string' },
          point: { kind: 'object', fields: { x: { kind: 'number' }, y: { kind: 'number' }, z: { kind: 'number' } } },
        },
      },
    },
    onObjectHover: {
      displayName: 'Object Hover',
      payload: {
        kind: 'object',
        fields: {
          modelId: { kind: 'string' },
          hovered: { kind: 'boolean' },
        },
      },
    },
    onReady: { displayName: 'Scene Ready' },
    onError: {
      displayName: 'Scene Error',
      payload: { kind: 'object', fields: { code: { kind: 'string' }, message: { kind: 'string' } } },
    },
  },

  componentCapabilityContracts: [
    { handle: 'loadModel', displayName: 'Load Model', args: { kind: 'object', fields: { url: {...}, position: {...} } } },
    { handle: 'unloadModel', displayName: 'Unload Model', args: { kind: 'string' } },
    { handle: 'setCameraPosition', displayName: 'Set Camera Position', args: { kind: 'array', items: { kind: 'number' } } },
    { handle: 'focusModel', displayName: 'Focus Model', args: { kind: 'string' } },
    { handle: 'playAnimation', displayName: 'Play Animation', args: { kind: 'string' } },
    { handle: 'captureScreenshot', displayName: 'Capture Screenshot', result: { kind: 'string' } },
    { handle: 'destroy', displayName: 'Destroy' },
  ],

  fields: [
    { key: 'scene', kind: 'prop' },
    { key: 'bindings', kind: 'prop' },
    { key: 'animations', kind: 'prop' },
    { key: 'events', kind: 'prop' },
    { key: 'loading', kind: 'region', regionKey: 'loading' },
    { key: 'empty', kind: 'region', regionKey: 'empty' },
  ],
};
```

### 3.3 核心渲染器组件

```typescript
// renderer/three-canvas-renderer.tsx
import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useRendererRuntime, useScopeSelector, useActionDispatcher } from '@nop-chaos/flux-react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { ThreeCanvasSchema, DataBinding } from '../schemas.js';
import { SceneManager } from '../engine/scene-manager.js';
import { BindingEngine } from '../binding/binding-engine.js';

/**
 * Three.js Canvas渲染器
 *
 * 核心职责：
 * 1. 挂载Three.js Canvas
 * 2. 管理场景生命周期
 * 3. 执行数据绑定（表达式→3D属性）
 * 4. 处理用户交互事件
 */
export function ThreeCanvasRenderer(
  props: RendererComponentProps<ThreeCanvasSchema>
) {
  const { scene, bindings, animations, events, loading, empty } = props.props;
  const { disabled, visible, className, testid } = props.meta;
  const { regions, events: rendererEvents, helpers } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const runtime = useRendererRuntime();
  const scope = useRenderScope();
  const dispatch = useActionDispatcher();

  // 场景管理器
  const sceneManager = useMemo(
    () => new SceneManager(scene),
    [scene]
  );

  // 绑定引擎
  const bindingEngine = useMemo(
    () => new BindingEngine({
      scope,
      runtime,
      onUpdate: (modelId, path, value) => {
        sceneManager.updateProperty(modelId, path, value);
      },
    }),
    [scope, runtime, sceneManager]
  );

  // 初始化绑定
  useEffect(() => {
    if (bindings) {
      bindings.forEach(binding => bindingEngine.register(binding));
    }
    return () => bindingEngine.dispose();
  }, [bindings, bindingEngine]);

  // 监听作用域变化
  useScopeSelector(
    (state) => {
      // 提取所有绑定依赖的路径
      const paths = bindings?.map(b => b.source.expression) ?? [];
      return { state, paths };
    },
    (prev, next) => {
      // 仅当依赖路径变化时触发更新
      return prev.paths === next.paths;
    }
  );

  // 处理对象点击
  const handleObjectClick = useCallback((modelId: string, point: THREE.Vector3) => {
    if (events?.onObjectClick) {
      dispatch(events.onObjectClick, {
        modelId,
        point: { x: point.x, y: point.y, z: point.z },
      });
    }
  }, [events?.onObjectClick, dispatch]);

  // 处理对象悬停
  const handleObjectHover = useCallback((modelId: string, hovered: boolean) => {
    if (events?.onObjectHover) {
      dispatch(events.onObjectHover, { modelId, hovered });
    }
  }, [events?.onObjectHover, dispatch]);

  // 场景就绪回调
  const handleReady = useCallback(() => {
    if (events?.onReady) {
      dispatch(events.onReady);
    }
  }, [events?.onReady, dispatch]);

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      className={`three-canvas ${className ?? ''}`}
      data-testid={testid}
      style={{ width: '100%', height: '400px' }}
    >
      <Canvas
        camera={scene.camera}
        gl={{ antialias: true, alpha: true }}
        onCreated={handleReady}
      >
        <SceneContent
          sceneManager={sceneManager}
          bindingEngine={bindingEngine}
          onObjectClick={handleObjectClick}
          onObjectHover={handleObjectHover}
        />
      </Canvas>
    </div>
  );
}

/**
 * 场景内容组件
 * 负责实际的Three.js场景渲染
 */
function SceneContent({
  sceneManager,
  bindingEngine,
  onObjectClick,
  onObjectHover,
}: {
  sceneManager: SceneManager;
  bindingEngine: BindingEngine;
  onObjectClick: (modelId: string, point: THREE.Vector3) => void;
  onObjectHover: (modelId: string, hovered: boolean) => void;
}) {
  const { scene, camera, gl } = useThree();

  // 初始化场景
  useEffect(() => {
    sceneManager.init(scene, camera, gl);
    return () => sceneManager.dispose();
  }, [scene, camera, gl, sceneManager]);

  // 每帧更新
  useFrame((state, delta) => {
    // 更新绑定值
    bindingEngine.update();

    // 更新动画
    sceneManager.updateAnimations(delta);

    // 更新控制器
    sceneManager.updateControls();
  });

  return (
    <>
      {/* 光照 */}
      {sceneManager.getLights().map((light, i) => (
        <primitive key={i} object={light} />
      ))}

      {/* 模型 */}
      {sceneManager.getModels().map((model) => (
        <primitive
          key={model.id}
          object={model.mesh}
          onClick={(e) => onObjectClick(model.id, e.point)}
          onPointerOver={() => onObjectHover(model.id, true)}
          onPointerOut={() => onObjectHover(model.id, false)}
        />
      ))}
    </>
  );
}
```

---

## 4. 绑定引擎设计

### 4.1 绑定引擎核心

```typescript
// binding/binding-engine.ts
import type { ScopeRef, ExpressionCompiler } from '@nop-chaos/flux-core';
import type { DataBinding } from '../schemas.js';

/**
 * 绑定引擎
 *
 * 核心职责：
 * 1. 注册数据绑定配置
 * 2. 编译绑定表达式
 * 3. 监听作用域变化
 * 4. 执行值转换和更新
 */
export class BindingEngine {
  private bindings: Map<string, CompiledBinding> = new Map();
  private unsubscribe: (() => void)[] = [];

  constructor(
    private config: {
      scope: ScopeRef;
      runtime: any;
      onUpdate: (modelId: string, path: string, value: any) => void;
    },
  ) {}

  /**
   * 注册绑定
   */
  register(binding: DataBinding): void {
    const compiled = this.compileBinding(binding);
    this.bindings.set(binding.id, compiled);

    // 订阅作用域变化
    const unsub = this.config.scope.store?.subscribe(() => {
      this.updateBinding(binding.id);
    });
    if (unsub) this.unsubscribe.push(unsub);
  }

  /**
   * 编译绑定表达式
   */
  private compileBinding(binding: DataBinding): CompiledBinding {
    const { expression, scope } = binding.source;

    // 使用flux表达式编译器
    const compiledExpression = this.config.runtime.expressionCompiler.compileExpression(expression);

    return {
      ...binding,
      compiledExpression,
      lastValue: undefined,
    };
  }

  /**
   * 更新单个绑定
   */
  private updateBinding(bindingId: string): void {
    const binding = this.bindings.get(bindingId);
    if (!binding) return;

    // 求值表达式
    const newValue = this.evaluateExpression(binding);

    // 值变化检查
    if (newValue === binding.lastValue) return;

    // 应用转换
    const transformedValue = this.applyTransform(binding, newValue);

    // 更新3D属性
    this.config.onUpdate(binding.target.modelId, binding.target.path, transformedValue);

    binding.lastValue = newValue;
  }

  /**
   * 求值表达式
   */
  private evaluateExpression(binding: CompiledBinding): any {
    const { compiledExpression } = binding;

    // 创建求值上下文
    const context = {
      read: (path: string) => this.config.scope.get(path),
      has: (path: string) => this.config.scope.has(path),
    };

    return compiledExpression.exec(context, this.config.runtime.env);
  }

  /**
   * 应用值转换
   */
  private applyTransform(binding: CompiledBinding, value: any): any {
    const { transform } = binding;

    if (!transform) return value;

    let result = value;

    // 范围映射
    if (transform.range) {
      const [inputMin, inputMax] = transform.range.input;
      const [outputMin, outputMax] = transform.range.output;

      // 线性插值
      const t = (result - inputMin) / (inputMax - inputMin);
      result = outputMin + t * (outputMax - outputMin);
    }

    // 自定义转换函数
    if (transform.convert) {
      const convertFn = new Function('value', transform.convert);
      result = convertFn(result);
    }

    // 条件绑定
    if (binding.condition) {
      const conditionFn = new Function('value', `return ${binding.condition.expression}`);
      const conditionResult = conditionFn(result);
      result = conditionResult ? binding.condition.trueValue : binding.condition.falseValue;
    }

    return result;
  }

  /**
   * 批量更新（用于高性能场景）
   */
  update(): void {
    this.bindings.forEach((_, id) => {
      this.updateBinding(id);
    });
  }

  /**
   * 清理
   */
  dispose(): void {
    this.unsubscribe.forEach((unsub) => unsub());
    this.bindings.clear();
  }
}

interface CompiledBinding extends DataBinding {
  compiledExpression: any;
  lastValue: any;
}
```

### 4.2 场景管理器

```typescript
// engine/scene-manager.ts
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { ThreeSceneConfig, ModelConfig } from '../schemas.js';

/**
 * 场景管理器
 *
 * 核心职责：
 * 1. 初始化Three.js场景
 * 2. 加载和管理3D模型
 * 3. 处理动画和交互
 */
export class SceneManager {
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private models: Map<string, ManagedModel> = new Map();
  private animations: Map<string, AnimationMixer> = new Map();
  private loader = new GLTFLoader();

  constructor(private config: ThreeSceneConfig) {}

  /**
   * 初始化场景
   */
  init(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer): void {
    this.scene = scene;
    this.camera = camera as THREE.PerspectiveCamera;
    this.renderer = renderer as THREE.WebGLRenderer;

    // 配置光照
    this.config.lights.forEach((lightConfig) => {
      const light = this.createLight(lightConfig);
      scene.add(light);
    });

    // 配置环境
    if (this.config.environment?.background) {
      scene.background = new THREE.Color(this.config.environment.background);
    }

    if (this.config.environment?.fog) {
      scene.fog = new THREE.Fog(
        this.config.environment.fog.color,
        this.config.environment.fog.near,
        this.config.environment.fog.far,
      );
    }

    // 加载模型
    this.config.models.forEach((modelConfig) => {
      this.loadModel(modelConfig);
    });

    // 启用控制器
    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.enableDamping = true;
  }

  /**
   * 创建光照
   */
  private createLight(config: any): THREE.Light {
    switch (config.type) {
      case 'ambient':
        return new THREE.AmbientLight(config.color, config.intensity);
      case 'directional':
        const dirLight = new THREE.DirectionalLight(config.color, config.intensity);
        if (config.position) dirLight.position.set(...config.position);
        if (config.target) dirLight.target.position.set(...config.target);
        if (config.castShadow) dirLight.castShadow = true;
        return dirLight;
      case 'point':
        const pointLight = new THREE.PointLight(config.color, config.intensity);
        if (config.position) pointLight.position.set(...config.position);
        return pointLight;
      case 'spot':
        const spotLight = new THREE.SpotLight(config.color, config.intensity);
        if (config.position) spotLight.position.set(...config.position);
        return spotLight;
      default:
        return new THREE.AmbientLight(0xffffff, 0.5);
    }
  }

  /**
   * 加载3D模型
   */
  async loadModel(config: ModelConfig): Promise<void> {
    try {
      const gltf = await this.loader.loadAsync(config.url);
      const mesh = gltf.scene;

      // 配置变换
      if (config.position) mesh.position.set(...config.position);
      if (config.rotation) mesh.rotation.set(...config.rotation);
      if (config.scale) mesh.scale.set(...config.scale);

      // 设置名称（用于绑定引用）
      mesh.name = config.id;

      // 添加到场景
      this.scene?.add(mesh);

      // 存储管理信息
      this.models.set(config.id, {
        config,
        mesh,
        animations: gltf.animations,
      });

      // 处理动画
      if (gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(mesh);
        this.animations.set(config.id, mixer);

        // 播放初始动画
        if (config.initialAnimation) {
          const clip = gltf.animations.find((a) => a.name === config.initialAnimation);
          if (clip) mixer.clipAction(clip).play();
        }
      }
    } catch (error) {
      console.error(`Failed to load model: ${config.url}`, error);
    }
  }

  /**
   * 更新属性（由绑定引擎调用）
   */
  updateProperty(modelId: string, path: string, value: any): void {
    const model = this.models.get(modelId);
    if (!model) return;

    const parts = path.split('.');
    let target: any = model.mesh;

    // 导航到目标属性
    for (let i = 0; i < parts.length - 1; i++) {
      target = target[parts[i]];
    }

    // 设置值
    const lastPart = parts[parts.length - 1];
    if (target && typeof target === 'object') {
      // 处理THREE.Vector3/Color等类型
      if (target[lastPart] && typeof target[lastPart].set === 'function') {
        if (Array.isArray(value)) {
          target[lastPart].set(...value);
        } else {
          target[lastPart].set(value);
        }
      } else {
        target[lastPart] = value;
      }
    }
  }

  /**
   * 更新动画
   */
  updateAnimations(delta: number): void {
    this.animations.forEach((mixer) => {
      mixer.update(delta);
    });
  }

  /**
   * 更新控制器
   */
  updateControls(): void {
    this.controls?.update();
  }

  /**
   * 获取所有模型
   */
  getModels(): ManagedModel[] {
    return Array.from(this.models.values());
  }

  /**
   * 获取所有光照
   */
  getLights(): THREE.Light[] {
    return (
      (this.scene?.children.filter((child) => child instanceof THREE.Light) as THREE.Light[]) ?? []
    );
  }

  /**
   * 清理
   */
  dispose(): void {
    this.models.forEach((model) => {
      model.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    });

    this.animations.forEach((mixer) => mixer.stopAllAction());

    this.models.clear();
    this.animations.clear();
    this.controls?.dispose();
  }
}

interface ManagedModel {
  config: ModelConfig;
  mesh: THREE.Group;
  animations: THREE.AnimationClip[];
}
```

---

## 5. AI场景生成接口规范

### 5.1 AI Schema生成器

```typescript
// ai/schema-generator.ts
import type { ThreeCanvasSchema, ThreeSceneConfig, DataBinding } from '../schemas.js';

/**
 * AI场景生成器
 *
 * 提供结构化接口，让AI自动生成3D场景配置
 */
export class AISchemaGenerator {
  /**
   * 生成完整的ThreeCanvasSchema
   */
  static generateSchema(config: {
    sceneType: 'industrial' | 'architectural' | 'product' | 'custom';
    models: Array<{
      name: string;
      type: string;
      position?: [number, number, number];
    }>;
    dataPoints: Array<{
      name: string;
      type: 'number' | 'boolean' | 'enum';
      range?: [number, number];
    }>;
    interactions?: string[];
  }): ThreeCanvasSchema {
    return {
      type: 'three-canvas',
      scene: this.generateSceneConfig(config),
      bindings: this.generateBindings(config),
      events: this.generateEvents(config.interactions),
    };
  }

  /**
   * 生成场景配置
   */
  private static generateSceneConfig(config: any): ThreeSceneConfig {
    return {
      camera: {
        position: [5, 3, 5],
        fov: 75,
      },
      lights: [
        { type: 'ambient', intensity: 0.4 },
        { type: 'directional', position: [5, 5, 5], intensity: 0.8, castShadow: true },
      ],
      models: config.models.map((m) => ({
        id: m.name,
        url: `/models/${m.type}.glb`,
        position: m.position ?? [0, 0, 0],
      })),
    };
  }

  /**
   * 生成数据绑定
   */
  private static generateBindings(config: any): DataBinding[] {
    return config.dataPoints.map((point) => ({
      id: `binding-${point.name}`,
      target: {
        modelId: config.models[0]?.name ?? 'default',
        path: point.type === 'boolean' ? 'visible' : 'material.color',
        type: point.type === 'boolean' ? 'visible' : 'material',
      },
      source: {
        expression: `\${sceneState.${point.name}}`,
      },
      transform:
        point.type === 'boolean'
          ? undefined
          : {
              range: {
                input: point.range ?? [0, 100],
                output: [0, 1], // 颜色强度范围
              },
            },
    }));
  }

  /**
   * 生成事件配置
   */
  private static generateEvents(interactions?: string[]): any {
    if (!interactions) return {};

    const events: any = {};

    if (interactions.includes('click')) {
      events.onObjectClick = {
        action: 'setValue',
        args: {
          path: 'sceneState.selectedObject',
          value: '${event.modelId}',
        },
      };
    }

    return events;
  }
}
```

### 5.2 AI提示模板

```typescript
// ai/prompt-templates.ts

/**
 * AI提示模板
 *
 * 用于指导AI生成ThreeCanvasSchema
 */
export const PROMPT_TEMPLATES = {
  /**
   * 工业SCADA场景
   */
  industrial: `你是一个工业SCADA/HMI场景设计专家。请根据以下需求生成Three.js 3D场景配置。

## 输入信息
- 场景类型：工业SCADA
- 设备列表：{devices}
- 数据点：{dataPoints}
- 交互需求：{interactions}

## 输出格式
请生成符合ThreeCanvasSchema的JSON配置，包含：
1. scene：场景配置（相机、光照、模型）
2. bindings：数据绑定（将数据点映射到3D对象属性）
3. events：交互事件

## 设计原则
1. 每个设备对应一个3D模型
2. 数据点通过表达式绑定到模型属性
3. 支持点击选择、悬停高亮等交互
4. 使用动画平滑过渡状态变化

## 示例输出
{
  "type": "three-canvas",
  "scene": {
    "camera": { "position": [10, 5, 10], "fov": 60 },
    "lights": [
      { "type": "ambient", "intensity": 0.3 },
      { "type": "directional", "position": [10, 10, 5], "castShadow": true }
    ],
    "models": [
      { "id": "valve-001", "url": "/models/valve.glb", "position": [0, 0, 0] },
      { "id": "pipe-001", "url": "/models/pipe.glb", "position": [2, 0, 0] }
    ]
  },
  "bindings": [
    {
      "id": "valve-state",
      "target": { "modelId": "valve-001", "path": "rotation.y", "type": "rotation" },
      "source": { "expression": "\${sceneState.valve1.open ? Math.PI / 2 : 0}" },
      "transform": { "animation": { "type": "tween", "duration": 500 } }
    }
  ],
  "events": {
    "onObjectClick": {
      "action": "setValue",
      "args": { "path": "sceneState.selectedDevice", "value": "${event.modelId}" }
    }
  }
}`,

  /**
   * 产品展示场景
   */
  product: `你是一个产品3D展示场景设计专家。请根据以下需求生成配置。

## 输入信息
- 产品名称：{productName}
- 产品模型：{modelUrl}
- 展示属性：{attributes}
- 交互需求：{interactions}

## 设计原则
1. 突出产品外观
2. 支持旋转、缩放查看
3. 属性变化驱动材质/动画
4. 适合嵌入网页展示`,

  /**
   * 建筑可视化场景
   */
  architectural: `你是一个建筑可视化场景设计专家。请根据以下需求生成配置。

## 输入信息
- 建筑模型：{buildingModel}
- 环境配置：{environment}
- 数据监控点：{monitoringPoints}

## 设计原则
1. 真实光照和材质
2. 支持漫游和聚焦
3. 监控数据可视化
4. 告警状态高亮`,
};
```

---

## 6. 高性能优化策略

### 6.1 渲染优化

```typescript
// engine/render-optimizer.ts

/**
 * 渲染优化器
 */
export class RenderOptimizer {
  private frameRequest: number | null = null;
  private needsRender = false;

  constructor(private renderer: THREE.WebGLRenderer) {}

  /**
   * 请求渲染（防抖）
   */
  requestRender(): void {
    this.needsRender = true;

    if (this.frameRequest === null) {
      this.frameRequest = requestAnimationFrame(() => {
        if (this.needsRender) {
          this.renderer.render(this.scene, this.camera);
          this.needsRender = false;
        }
        this.frameRequest = null;
      });
    }
  }

  /**
   * 批量更新后渲染
   */
  batchUpdate(updates: Array<() => void>): void {
    updates.forEach((update) => update());
    this.requestRender();
  }
}
```

### 6.2 内存管理

```typescript
// engine/memory-manager.ts

/**
 * 内存管理器
 *
 * 管理3D资源的生命周期，防止内存泄漏
 */
export class MemoryManager {
  private disposables: Map<string, Disposable> = new Map();

  /**
   * 注册可释放资源
   */
  register(id: string, disposable: Disposable): void {
    this.disposables.set(id, disposable);
  }

  /**
   * 释放资源
   */
  dispose(id: string): void {
    const disposable = this.disposables.get(id);
    if (disposable) {
      disposable.dispose();
      this.disposables.delete(id);
    }
  }

  /**
   * 释放所有资源
   */
  disposeAll(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables.clear();
  }

  /**
   * 获取内存使用统计
   */
  getStats(): MemoryStats {
    let geometries = 0;
    let materials = 0;
    let textures = 0;

    this.disposables.forEach((d) => {
      if (d instanceof THREE.Geometry) geometries++;
      if (d instanceof THREE.Material) materials++;
      if (d instanceof THREE.Texture) textures++;
    });

    return { geometries, materials, textures };
  }
}

interface Disposable {
  dispose(): void;
}

interface MemoryStats {
  geometries: number;
  materials: number;
  textures: number;
}
```

### 6.3 性能监控

```typescript
// engine/performance-monitor.ts

/**
 * 性能监控器
 */
export class PerformanceMonitor {
  private fps = 0;
  private frameCount = 0;
  private lastTime = performance.now();

  constructor(private onFpsUpdate?: (fps: number) => void) {}

  /**
   * 开始帧计时
   */
  beginFrame(): void {
    this.frameCount++;
  }

  /**
   * 结束帧计时
   */
  endFrame(): void {
    const now = performance.now();
    const elapsed = now - this.lastTime;

    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastTime = now;

      this.onFpsUpdate?.(this.fps);
    }
  }

  /**
   * 获取当前FPS
   */
  getFps(): number {
    return this.fps;
  }
}
```

---

## 7. 工业协议集成

### 7.1 数据源适配器

```typescript
// binding/data-source-adapter.ts

/**
 * 数据源适配器
 *
 * 将外部工业协议数据源适配到Flux作用域
 */
export class DataSourceAdapter {
  private subscriptions: Map<string, () => void> = new Map();

  constructor(private scope: ScopeRef) {}

  /**
   * 连接Modbus数据源
   */
  async connectModbus(config: {
    host: string;
    port: number;
    polling: number;
    tags: Array<{
      name: string;
      address: string;
      type: 'bool' | 'int16' | 'float32';
    }>;
  }): Promise<void> {
    // 创建Socket.IO连接
    const socket = io(`http://${config.host}:${config.port}`);

    // 订阅标签变化
    socket.emit('subscribe', {
      tags: config.tags.map((t) => t.address),
      polling: config.polling,
    });

    // 监听数据更新
    socket.on('data', (data: Record<string, any>) => {
      // 更新到Flux作用域
      Object.entries(data).forEach(([address, value]) => {
        const tag = config.tags.find((t) => t.address === address);
        if (tag) {
          this.scope.update(`dataSources.modbus.${tag.name}`, value);
        }
      });
    });

    // 存储取消订阅函数
    this.subscriptions.set('modbus', () => {
      socket.disconnect();
    });
  }

  /**
   * 连接OPC-UA数据源
   */
  async connectOPCUA(config: {
    endpoint: string;
    nodes: Array<{
      name: string;
      nodeId: string;
    }>;
  }): Promise<void> {
    // 实现OPC-UA连接逻辑
  }

  /**
   * 连接MQTT数据源
   */
  async connectMQTT(config: {
    broker: string;
    topics: Array<{
      name: string;
      topic: string;
    }>;
  }): Promise<void> {
    // 实现MQTT连接逻辑
  }

  /**
   * 断开所有连接
   */
  disconnectAll(): void {
    this.subscriptions.forEach((unsub) => unsub());
    this.subscriptions.clear();
  }
}
```

### 7.2 与FUXA对比

| 能力         | FUXA实现               | nop-chaos-flux实现           | 优势                     |
| ------------ | ---------------------- | ---------------------------- | ------------------------ |
| **设备抽象** | 工厂模式 + 动态require | DataSourceAdapter + 依赖注入 | 更灵活，支持Tree Shaking |
| **数据同步** | Socket.IO轮询          | Zustand + 表达式             | 更高效，精确更新         |
| **状态管理** | Angular Service        | Zustand vanilla store        | 更轻量，框架无关         |
| **配置格式** | SVG字符串              | 声明式Schema                 | 更清晰，易于AI生成       |
| **扩展性**   | 静态方法接口           | RendererDefinition + Hooks   | 类型安全，易于测试       |

---

## 8. 实现计划

### 8.1 阶段一：核心基础设施（2周）

- [ ] 创建`flux-renderers-3d`包
- [ ] 实现ThreeCanvasSchema类型定义
- [ ] 实现SceneManager核心
- [ ] 实现BindingEngine核心
- [ ] 编写单元测试

### 8.2 阶段二：数据绑定（2周）

- [ ] 实现表达式桥接
- [ ] 实现值转换引擎
- [ ] 实现动画控制器
- [ ] 集成测试

### 8.3 阶段三：AI生成接口（1周）

- [ ] 实现AISchemaGenerator
- [ ] 编写AI提示模板
- [ ] 添加JSON Schema验证
- [ ] 文档和示例

### 8.4 阶段四：工业协议集成（2周）

- [ ] 实现DataSourceAdapter
- [ ] 集成Modbus/OPC-UA
- [ ] 性能优化
- [ ] 压力测试

### 8.5 阶段五：文档和示例（1周）

- [ ] 编写使用文档
- [ ] 创建示例项目
- [ ] 编写AI提示指南
- [ ] 代码审查

---

## 9. 总结

本设计文档提出了一种基于**Three.js + Flux表达式系统 + Zustand**的3D场景集成方案，具有以下核心优势：

1. **充分利用Flux能力**：复用表达式系统、作用域机制、动作系统，无需重新发明轮子
2. **AI友好接口**：清晰的Schema规范，AI可自动生成完整配置
3. **高性能设计**：精细的更新控制、内存管理、性能监控
4. **工业级可靠性**：错误恢复、资源清理、状态一致性保证
5. **易于扩展**：模块化设计，支持新的模型格式、数据源、交互方式

该方案可以实现"状态设置为开，则3D场景中的阀门变成打开"这样的数据驱动需求，同时保持代码的简洁、可维护和高性能。
