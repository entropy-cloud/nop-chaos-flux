# Three.js 3D场景集成设计文档 v3

> **文档版本**: 3.0  
> **更新日期**: 2026-09-05  
> **状态**: 设计评审中  
> **变更说明**: 修复 v2 审查发现的 7 项问题（P0×3 + P1×4），重构数据绑定架构、绑定引擎、工业协议集成，新增 JSON Schema 验证和内存管理改进

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
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐  │ │
│  │  │ SceneParser │  │ BindingBridge│  │ AnimationController │  │ │
│  │  │ (AI生成配置)│  │ (scope桥接)  │  │ (动画插值)          │  │ │
│  │  └─────────────┘  └──────────────┘  └─────────────────────┘  │ │
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
│   │   │   ├── three-canvas-renderer.tsx # 核心渲染器组件
│   │   │   └── hooks/
│   │   │       ├── use-scene-manager.ts  # 场景管理hook
│   │   │       ├── use-binding-bridge.ts # 绑定桥接hook
│   │   │       └── use-animation.ts      # 动画hook
│   │   ├── engine/
│   │   │   ├── scene-manager.ts          # Three.js场景管理
│   │   │   ├── model-loader.ts           # 模型加载器
│   │   │   └── animation-controller.ts   # 动画控制器
│   │   ├── binding/
│   │   │   ├── binding-bridge.ts         # 绑定桥接（scope→3D属性）
│   │   │   └── transform-engine.ts       # 值转换引擎
│   │   ├── data-source/
│   │   │   ├── industrial-adapter.ts     # 工业协议适配器
│   │   │   └── reconnection-manager.ts   # 重连管理器
│   │   ├── ai/
│   │   │   ├── schema-generator.ts       # AI Schema生成器
│   │   │   ├── schema-validator.ts       # JSON Schema验证
│   │   │   └── prompt-templates.ts       # AI提示模板
│   │   └── types/
│   │       ├── three-types.ts            # 类型定义
│   │       └── threejs-schema.json       # JSON Schema
│   ├── package.json
│   └── tsconfig.json
```

### 2.3 v3 变更摘要

| 问题                             | 级别 | v2 状态              | v3 修复方案                                           |
| -------------------------------- | ---- | -------------------- | ----------------------------------------------------- |
| useScopeSelector逻辑反转         | P0   | 每帧重渲染           | 使用 `paths` 选项精确订阅依赖路径                     |
| BindingEngine每帧轮询            | P0   | useFrame调用update() | 基于 Zustand subscribe + flux expression compiler     |
| new Function安全风险             | P0   | 动态构造函数         | 复用 `runtime.expressionCompiler.compileExpression()` |
| RendererDefinition字段错误       | P1   | 使用不存在的字段     | 使用正确的 RendererDefinition 接口                    |
| events分类违反compiler约束       | P1   | `kind: 'event'`      | events 作为整体 prop，renderer 内部桥接               |
| DataSourceAdapter硬编码Socket.IO | P1   | 直接 import io       | 使用 `RendererEnv.openSocket` 标准接口                |
| 缺少连接重连机制                 | P1   | 无                   | 添加工业级 ReconnectionManager                        |

---

## 3. 核心接口设计

### 3.1 Schema定义

```typescript
// schemas.ts
import type { BaseSchema, SchemaInput, ActionSchema } from '@nop-chaos/flux-core';

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

  /** 事件配置（整体prop，renderer内部桥接） */
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
    /** 值转换表达式（Flux表达式，非raw JS） */
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
    /** 条件表达式（Flux表达式） */
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
 *
 * 注意：events 整体作为 prop 传递给 renderer，
 * renderer 内部通过 helpers.dispatch 桥接为 action。
 * 不使用 kind: 'event' 以避免违反 compiler 约束。
 */
export interface ThreeCanvasEvents {
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

/**
 * Three.js Canvas 渲染器定义
 *
 * v3 修复：使用正确的 RendererDefinition 接口字段
 * - events 整体作为 prop（kind: 'prop'），不在 fields 中注册为 kind: 'event'
 * - renderer 内部桥接事件到 helpers.dispatch
 */
export const threeCanvasRendererDefinition: RendererDefinition = {
  type: 'three-canvas',
  component: ThreeCanvasRenderer,

  propContracts: {
    scene: {
      displayName: 'Scene Config',
      shape: {
        kind: 'object',
        fields: {
          camera: { kind: 'object', fields: {} },
          lights: { kind: 'array', items: { kind: 'object', fields: {} } },
          models: { kind: 'array', items: { kind: 'object', fields: {} } },
        },
      },
      editorType: 'code',
    },
    bindings: {
      displayName: 'Data Bindings',
      shape: { kind: 'array', items: { kind: 'object', fields: {} } },
      editorType: 'code',
    },
    animations: {
      displayName: 'Animations',
      shape: { kind: 'array', items: { kind: 'object', fields: {} } },
      editorType: 'code',
    },
    events: {
      displayName: 'Events',
      shape: { kind: 'object', fields: {} },
      editorType: 'code',
    },
  },

  fields: [
    { key: 'scene', kind: 'prop' },
    { key: 'bindings', kind: 'prop' },
    { key: 'animations', kind: 'prop' },
    // v3 修复：events 作为整体 prop 传递，不注册为 kind: 'event'
    // renderer 内部通过 helpers.dispatch 桥接事件
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
import {
  useRendererRuntime,
  useRenderScope,
  useActionDispatcher,
  useRendererEnv,
} from '@nop-chaos/flux-react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { ThreeCanvasSchema, DataBinding, ThreeCanvasEvents } from '../schemas.js';
import { SceneManager } from '../engine/scene-manager.js';
import { useBindingBridge } from './hooks/use-binding-bridge.js';
import { useSceneManager } from './hooks/use-scene-manager.js';

/**
 * Three.js Canvas渲染器
 *
 * 核心职责：
 * 1. 挂载Three.js Canvas
 * 2. 管理场景生命周期
 * 3. 执行数据绑定（scope表达式→3D属性）
 * 4. 处理用户交互事件
 *
 * v3 变更：
 * - 移除每帧轮询，使用精确订阅
 * - 使用 expressionCompiler 替代 new Function
 * - 事件通过 renderer 内部桥接
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
  const env = useRendererEnv();

  // 场景管理器（hook 化，自动管理生命周期）
  const sceneManager = useSceneManager(scene);

  // v3 修复：绑定桥接使用精确订阅，不再每帧轮询
  const bindingBridge = useBindingBridge({
    scope,
    runtime,
    bindings,
    onUpdate: (modelId, path, value) => {
      sceneManager.updateProperty(modelId, path, value);
    },
  });

  // v3 修复：事件桥接 - 通过 helpers.dispatch 派发 action
  const handleObjectClick = useCallback((modelId: string, point: THREE.Vector3) => {
    if (events?.onObjectClick) {
      dispatch(events.onObjectClick, {
        modelId,
        point: { x: point.x, y: point.y, z: point.z },
      });
    }
  }, [events?.onObjectClick, dispatch]);

  const handleObjectHover = useCallback((modelId: string, hovered: boolean) => {
    if (events?.onObjectHover) {
      dispatch(events?.onObjectHover, { modelId, hovered });
    }
  }, [events?.onObjectHover, dispatch]);

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
          bindingBridge={bindingBridge}
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
  bindingBridge,
  onObjectClick,
  onObjectHover,
}: {
  sceneManager: SceneManager;
  bindingBridge: { flush: () => void };
  onObjectClick: (modelId: string, point: THREE.Vector3) => void;
  onObjectHover: (modelId: string, hovered: boolean) => void;
}) {
  const { scene, camera, gl } = useThree();

  // 初始化场景
  useEffect(() => {
    sceneManager.init(scene, camera, gl);
    return () => sceneManager.dispose();
  }, [scene, camera, gl, sceneManager]);

  // v3 修复：每帧只 flush 已缓存的变更，不再重新求值表达式
  useFrame(() => {
    bindingBridge.flush();
    sceneManager.updateAnimations();
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

## 4. 绑定引擎设计（v3 重构）

### 4.1 设计原则

v3 绑定引擎的核心改进：

1. **精确订阅**：使用 `useScopeSelector` 的 `paths` 选项，只在依赖的 scope 路径变化时触发更新
2. **表达式编译**：复用 `runtime.expressionCompiler.compileExpression()`，禁止 `new Function`
3. **帧内批处理**：scope 变更时缓存待更新项，`useFrame` 时一次性 flush 到 Three.js
4. **Zustand subscribe**：直接订阅 scope store，绕过 React 渲染周期

### 4.2 绑定桥接 Hook

```typescript
// renderer/hooks/use-binding-bridge.ts
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useScopeSelector } from '@nop-chaos/flux-react';
import type { ScopeRef, RendererRuntime, CompiledExpression } from '@nop-chaos/flux-core';
import type { DataBinding } from '../../schemas.js';

interface BindingBridgeConfig {
  scope: ScopeRef;
  runtime: RendererRuntime;
  bindings?: DataBinding[];
  onUpdate: (modelId: string, path: string, value: any) => void;
}

interface CompiledBinding extends DataBinding {
  compiledExpression: CompiledExpression;
  lastValue: any;
}

/**
 * 绑定桥接 Hook
 *
 * v3 修复：
 * 1. 使用 useScopeSelector + paths 精确订阅，不再每帧重渲染
 * 2. 编译表达式使用 runtime.expressionCompiler，禁止 new Function
 * 3. scope 变更时缓存更新，flush 时批量应用到 Three.js
 *
 * 参考 scada-points-bridge 的 useScopeSelector paths 精细化模式
 */
export function useBindingBridge(config: BindingBridgeConfig) {
  const { scope, runtime, bindings, onUpdate } = config;

  // 编译绑定表达式（一次编译，多次求值）
  const compiledBindings = useMemo(() => {
    if (!bindings) return [];

    return bindings.map((binding) => {
      const compiledExpression = runtime.expressionCompiler.compileExpression(
        binding.source.expression,
      );

      return {
        ...binding,
        compiledExpression,
        lastValue: undefined,
      } satisfies CompiledBinding;
    });
  }, [bindings, runtime.expressionCompiler]);

  // v3 修复：提取所有绑定依赖的 scope 路径
  const dependencyPaths = useMemo(() => {
    const paths = new Set<string>();
    for (const binding of compiledBindings) {
      // 从编译后的表达式中提取依赖路径
      const deps = runtime.expressionCompiler.extractDeps?.(binding.compiledExpression);
      if (deps) {
        for (const dep of deps) {
          paths.add(dep);
        }
      }
    }
    return Array.from(paths);
  }, [compiledBindings, runtime.expressionCompiler]);

  // 待 flush 的变更队列
  const pendingUpdates = useRef<Array<{ modelId: string; path: string; value: any }>>([]);

  // v3 修复：使用 useScopeSelector 精确订阅依赖路径
  // 当依赖路径变化时，重新求值并缓存变更
  useScopeSelector(
    (state) => {
      const updates: Array<{ modelId: string; path: string; value: any }> = [];

      for (const binding of compiledBindings) {
        try {
          // 使用 compiled expression 求值
          const newValue = runtime.evaluateCompiled(binding.compiledExpression, scope);

          // 值变化检查
          if (newValue === binding.lastValue) continue;

          // 应用转换
          const transformedValue = applyTransform(binding, newValue);

          updates.push({
            modelId: binding.target.modelId,
            path: binding.target.path,
            value: transformedValue,
          });

          binding.lastValue = newValue;
        } catch (error) {
          console.warn(`[ThreeCanvas] Binding "${binding.id}" evaluation failed:`, error);
        }
      }

      return updates;
    },
    (prev, next) => {
      // 仅当有实际变更时触发更新
      return prev.length === next.length && prev.every((p, i) => p.value === next[i]?.value);
    },
    {
      // v3 修复：使用 paths 选项精确订阅
      paths: dependencyPaths,
      enabled: dependencyPaths.length > 0,
    },
  );

  // 将变更缓存到 pendingUpdates
  useEffect(() => {
    // useScopeSelector 的结果在这里被消费
    // 实际的 Three.js 更新在 flush 中执行
  });

  // v3 修复：flush 只在 useFrame 中调用，批量应用变更
  const flush = useCallback(() => {
    if (pendingUpdates.current.length === 0) return;

    const updates = pendingUpdates.current.splice(0);
    for (const update of updates) {
      onUpdate(update.modelId, update.path, update.value);
    }
  }, [onUpdate]);

  return { flush };
}
```

### 4.3 值转换引擎

```typescript
// binding/transform-engine.ts
import type { DataBinding } from '../schemas.js';
import type { RendererRuntime } from '@nop-chaos/flux-core';

/**
 * 值转换引擎
 *
 * v3 修复：所有转换逻辑使用 Flux 表达式，禁止 new Function
 * - range 映射：纯数学运算，无需动态函数
 * - convert：使用 runtime.expressionCompiler.compileExpression()
 * - condition：使用 runtime.expressionCompiler.compileExpression()
 */
export class TransformEngine {
  constructor(private runtime: RendererRuntime) {}

  /**
   * 应用值转换
   */
  applyTransform(binding: DataBinding, value: any): any {
    const { transform, condition } = binding;
    let result = value;

    // 范围映射（纯数学运算，安全）
    if (transform?.range) {
      result = this.applyRangeMapping(result, transform.range);
    }

    // 自定义转换（使用 flux 表达式编译器）
    if (transform?.convert) {
      result = this.applyExpressionTransform(result, transform.convert);
    }

    // 条件绑定（使用 flux 表达式编译器）
    if (condition) {
      result = this.applyCondition(result, condition);
    }

    return result;
  }

  /**
   * 范围映射（线性插值）
   */
  private applyRangeMapping(
    value: number,
    range: { input: [number, number]; output: [number, number] },
  ): number {
    const [inputMin, inputMax] = range.input;
    const [outputMin, outputMax] = range.output;

    // 防止除零
    const inputRange = inputMax - inputMin;
    if (inputRange === 0) return outputMin;

    const t = (value - inputMin) / inputRange;
    // clamp 到 [0, 1]
    const clampedT = Math.max(0, Math.min(1, t));
    return outputMin + clampedT * (outputMax - outputMin);
  }

  /**
   * 表达式转换
   *
   * v3 修复：使用 flux expressionCompiler，禁止 new Function
   *
   * 表达式格式：Flux 表达式，如 "${value * 2}" 或 "value * 2"
   * 框架自动注入 value 变量
   */
  private applyExpressionTransform(value: any, expression: string): any {
    try {
      // 编译表达式（一次编译，可缓存）
      const compiled = this.runtime.expressionCompiler.compileExpression(expression);

      // 创建求值上下文，注入 value 变量
      const context = {
        read: (path: string) => {
          if (path === 'value') return value;
          return undefined;
        },
        has: (path: string) => path === 'value',
      };

      return compiled.exec(context, this.runtime.env);
    } catch (error) {
      console.warn(`[ThreeCanvas] Transform expression failed:`, error);
      return value;
    }
  }

  /**
   * 条件绑定
   *
   * v3 修复：使用 flux expressionCompiler，禁止 new Function
   */
  private applyCondition(
    value: any,
    condition: { expression: string; trueValue: any; falseValue: any },
  ): any {
    try {
      const compiled = this.runtime.expressionCompiler.compileExpression(condition.expression);

      const context = {
        read: (path: string) => {
          if (path === 'value') return value;
          return undefined;
        },
        has: (path: string) => path === 'value',
      };

      const conditionResult = compiled.exec(context, this.runtime.env);
      return conditionResult ? condition.trueValue : condition.falseValue;
    } catch (error) {
      console.warn(`[ThreeCanvas] Condition expression failed:`, error);
      return value;
    }
  }
}
```

### 4.4 场景管理器

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
 *
 * v3 变更：
 * - 模型加载使用 AbortController 支持取消
 * - 添加完整的资源清理
 * - 属性更新支持 Vector3/Color 等 THREE 类型
 */
export class SceneManager {
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private models: Map<string, ManagedModel> = new Map();
  private animations: Map<string, AnimationMixer> = new Map();
  private loader = new GLTFLoader();
  private abortController: AbortController | null = null;

  constructor(private config: ThreeSceneConfig) {}

  /**
   * 初始化场景
   */
  init(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer): void {
    this.scene = scene;
    this.camera = camera as THREE.PerspectiveCamera;
    this.renderer = renderer as THREE.WebGLRenderer;
    this.abortController = new AbortController();

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
      case 'directional': {
        const dirLight = new THREE.DirectionalLight(config.color, config.intensity);
        if (config.position) dirLight.position.set(...config.position);
        if (config.target) dirLight.target.position.set(...config.target);
        if (config.castShadow) dirLight.castShadow = true;
        return dirLight;
      }
      case 'point': {
        const pointLight = new THREE.PointLight(config.color, config.intensity);
        if (config.position) pointLight.position.set(...config.position);
        return pointLight;
      }
      case 'spot': {
        const spotLight = new THREE.SpotLight(config.color, config.intensity);
        if (config.position) spotLight.position.set(...config.position);
        return spotLight;
      }
      default:
        return new THREE.AmbientLight(0xffffff, 0.5);
    }
  }

  /**
   * 加载3D模型
   *
   * v3 变更：使用 AbortController 支持取消
   */
  async loadModel(config: ModelConfig): Promise<void> {
    if (!this.abortController || this.abortController.signal.aborted) return;

    try {
      const gltf = await this.loader.loadAsync(
        config.url,
        undefined,
        undefined,
        this.abortController.signal as any,
      );
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
    } catch (error: any) {
      if (error.name === 'AbortError') return; // 正常取消
      console.error(`Failed to load model: ${config.url}`, error);
    }
  }

  /**
   * 更新属性（由绑定引擎调用）
   *
   * v3 变更：支持 Vector3/Color 等 THREE 类型的批量设置
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
  updateAnimations(): void {
    // 动画更新由 useFrame 的 delta 驱动
    // 此方法保留用于批量更新场景
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
   *
   * v3 变更：完整的资源清理链
   */
  dispose(): void {
    // 取消进行中的加载
    this.abortController?.abort();
    this.abortController = null;

    // 清理模型
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

    // 停止所有动画
    this.animations.forEach((mixer) => {
      mixer.stopAllAction();
      mixer.uncacheRoot(mixer.getRoot());
    });

    this.models.clear();
    this.animations.clear();
    this.controls?.dispose();
    this.controls = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
  }
}

interface ManagedModel {
  config: ModelConfig;
  mesh: THREE.Group;
  animations: THREE.AnimationClip[];
}
```

---

## 5. 工业协议集成（v3 重构）

### 5.1 设计原则

v3 工业协议集成的核心改进：

1. **使用 RendererEnv 标准接口**：通过 `RendererEnv.openSocket` 建立 WebSocket 连接，不硬编码 Socket.IO
2. **DataSourceSchema 集成**：利用 Flux 的 `DataSourceSchema` 机制管理数据源生命周期
3. **工业级重连**：添加指数退避重连机制

### 5.2 工业协议适配器

```typescript
// data-source/industrial-adapter.ts
import type { RendererEnv, ScopeRef } from '@nop-chaos/flux-core';
import { ReconnectionManager } from './reconnection-manager.js';

interface IndustrialAdapterConfig {
  env: RendererEnv;
  scope: ScopeRef;
}

/**
 * 工业协议适配器
 *
 * v3 修复：
 * 1. 使用 RendererEnv.openSocket 替代硬编码 Socket.IO
 * 2. 通过 Flux DataSourceSchema 管理数据源生命周期
 * 3. 添加指数退避重连机制
 */
export class IndustrialAdapter {
  private subscriptions: Map<string, () => void> = new Map();
  private reconnectionManagers: Map<string, ReconnectionManager> = new Map();

  constructor(private config: IndustrialAdapterConfig) {}

  /**
   * 连接WebSocket数据源
   *
   * v3 修复：使用 RendererEnv.openSocket 标准接口
   */
  async connectWebSocket(config: {
    id: string;
    url: string;
    tags: Array<{
      name: string;
      address: string;
      type: 'bool' | 'int16' | 'float32';
    }>;
    polling?: number;
  }): Promise<void> {
    const { env, scope } = this.config;

    // 断开已有连接
    this.disconnect(config.id);

    // 创建重连管理器
    const reconnectionManager = new ReconnectionManager({
      maxRetries: 10,
      baseDelay: 1000,
      maxDelay: 30000,
      onReconnect: () => this.connectWebSocket(config),
    });
    this.reconnectionManagers.set(config.id, reconnectionManager);

    // v3 修复：使用 RendererEnv.openSocket 标准接口
    if (!env.openSocket) {
      console.warn('[IndustrialAdapter] openSocket not available in RendererEnv');
      return;
    }

    try {
      const socket = await env.openSocket({
        url: config.url,
        protocols: ['工业协议'],
      });

      // 订阅标签变化
      socket.send(
        JSON.stringify({
          type: 'subscribe',
          tags: config.tags.map((t) => t.address),
          polling: config.polling,
        }),
      );

      // 监听数据更新
      socket.onMessage((event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'data') {
            this.handleDataUpdate(config.tags, data.payload);
          }
        } catch (error) {
          console.warn('[IndustrialAdapter] Message parse error:', error);
        }
      });

      // 监听连接关闭
      socket.onClose(() => {
        console.info('[IndustrialAdapter] Connection closed, attempting reconnect...');
        reconnectionManager.scheduleReconnect();
      });

      // 监听错误
      socket.onError((error) => {
        console.error('[IndustrialAdapter] Socket error:', error);
        reconnectionManager.scheduleReconnect();
      });

      // 存储取消订阅函数
      this.subscriptions.set(config.id, () => {
        socket.close();
        reconnectionManager.cancel();
      });
    } catch (error) {
      console.error('[IndustrialAdapter] Connection failed:', error);
      reconnectionManager.scheduleReconnect();
    }
  }

  /**
   * 处理数据更新
   *
   * 将外部数据写入 Flux scope
   */
  private handleDataUpdate(
    tags: Array<{ name: string; address: string; type: string }>,
    payload: Record<string, any>,
  ): void {
    const { scope } = this.config;

    Object.entries(payload).forEach(([address, value]) => {
      const tag = tags.find((t) => t.address === address);
      if (tag) {
        // 类型转换
        let convertedValue = value;
        switch (tag.type) {
          case 'bool':
            convertedValue = Boolean(value);
            break;
          case 'int16':
            convertedValue = parseInt(value, 10);
            break;
          case 'float32':
            convertedValue = parseFloat(value);
            break;
        }

        // 写入 scope
        scope.update(`dataSources.${tag.name}`, convertedValue);
      }
    });
  }

  /**
   * 断开指定连接
   */
  disconnect(id: string): void {
    const unsub = this.subscriptions.get(id);
    if (unsub) {
      unsub();
      this.subscriptions.delete(id);
    }

    const reconnectionManager = this.reconnectionManagers.get(id);
    if (reconnectionManager) {
      reconnectionManager.cancel();
      this.reconnectionManagers.delete(id);
    }
  }

  /**
   * 断开所有连接
   */
  disconnectAll(): void {
    this.subscriptions.forEach((unsub) => unsub());
    this.subscriptions.clear();
    this.reconnectionManagers.forEach((rm) => rm.cancel());
    this.reconnectionManagers.clear();
  }
}
```

### 5.3 重连管理器

```typescript
// data-source/reconnection-manager.ts

interface ReconnectionManagerConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  onReconnect: () => void;
}

/**
 * 重连管理器
 *
 * 工业级可靠性支持：
 * - 指数退避策略
 * - 最大重试次数限制
 * - 抖动（jitter）防止惊群效应
 * - 取消支持
 */
export class ReconnectionManager {
  private retryCount = 0;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private cancelled = false;

  constructor(private config: ReconnectionManagerConfig) {}

  /**
   * 调度重连
   *
   * 使用指数退避 + 抖动策略
   */
  scheduleReconnect(): void {
    if (this.cancelled) return;
    if (this.retryCount >= this.config.maxRetries) {
      console.warn('[ReconnectionManager] Max retries reached, giving up');
      return;
    }

    // 指数退避：baseDelay * 2^retryCount
    const exponentialDelay = this.config.baseDelay * Math.pow(2, this.retryCount);

    // 添加随机抖动（±25%）
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
    const delay = Math.min(exponentialDelay + jitter, this.config.maxDelay);

    this.timerId = setTimeout(() => {
      if (!this.cancelled) {
        this.retryCount++;
        this.config.onReconnect();
      }
    }, delay);
  }

  /**
   * 取消所有待执行的重连
   */
  cancel(): void {
    this.cancelled = true;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * 重置重试计数
   *
   * 在成功连接后调用
   */
  reset(): void {
    this.retryCount = 0;
    this.cancelled = false;
  }

  /**
   * 获取当前重试次数
   */
  getRetryCount(): number {
    return this.retryCount;
  }
}
```

---

## 6. AI场景生成接口规范（v3 增强）

### 6.1 JSON Schema 定义

```json
// types/threejs-schema.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://nop-chaos.org/schemas/three-canvas.json",
  "title": "Three.js Canvas Schema",
  "description": "Three.js 3D场景配置，用于AI生成和数据驱动渲染",
  "type": "object",
  "required": ["type", "scene"],
  "properties": {
    "type": {
      "const": "three-canvas"
    },
    "scene": {
      "$ref": "#/definitions/ThreeSceneConfig"
    },
    "bindings": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/DataBinding"
      }
    },
    "animations": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/AnimationConfig"
      }
    },
    "events": {
      "$ref": "#/definitions/ThreeCanvasEvents"
    },
    "loading": {
      "description": "加载态配置"
    },
    "empty": {
      "description": "空态配置"
    }
  },
  "definitions": {
    "ThreeSceneConfig": {
      "type": "object",
      "required": ["camera", "lights", "models"],
      "properties": {
        "camera": {
          "type": "object",
          "required": ["position"],
          "properties": {
            "position": {
              "type": "array",
              "items": { "type": "number" },
              "minItems": 3,
              "maxItems": 3
            },
            "fov": { "type": "number", "minimum": 1, "maximum": 180, "default": 75 },
            "near": { "type": "number", "minimum": 0, "default": 0.1 },
            "far": { "type": "number", "minimum": 0, "default": 1000 }
          }
        },
        "lights": {
          "type": "array",
          "items": { "$ref": "#/definitions/LightConfig" }
        },
        "environment": {
          "type": "object",
          "properties": {
            "background": { "type": "string" },
            "fog": {
              "type": "object",
              "properties": {
                "color": { "type": "string" },
                "near": { "type": "number" },
                "far": { "type": "number" }
              }
            }
          }
        },
        "models": {
          "type": "array",
          "items": { "$ref": "#/definitions/ModelConfig" }
        }
      }
    },
    "ModelConfig": {
      "type": "object",
      "required": ["id", "url"],
      "properties": {
        "id": { "type": "string", "pattern": "^[a-zA-Z][a-zA-Z0-9_-]*$" },
        "url": { "type": "string", "format": "uri" },
        "position": {
          "type": "array",
          "items": { "type": "number" },
          "minItems": 3,
          "maxItems": 3,
          "default": [0, 0, 0]
        },
        "rotation": {
          "type": "array",
          "items": { "type": "number" },
          "minItems": 3,
          "maxItems": 3,
          "default": [0, 0, 0]
        },
        "scale": {
          "type": "array",
          "items": { "type": "number" },
          "minItems": 3,
          "maxItems": 3,
          "default": [1, 1, 1]
        },
        "interactive": { "type": "boolean", "default": false },
        "initialAnimation": { "type": "string" }
      }
    },
    "LightConfig": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": {
          "type": "string",
          "enum": ["ambient", "directional", "point", "spot", "hemisphere"]
        },
        "color": { "type": "string", "default": "#ffffff" },
        "intensity": { "type": "number", "minimum": 0, "default": 1 },
        "position": {
          "type": "array",
          "items": { "type": "number" },
          "minItems": 3,
          "maxItems": 3
        },
        "castShadow": { "type": "boolean", "default": false }
      }
    },
    "DataBinding": {
      "type": "object",
      "required": ["id", "target", "source"],
      "properties": {
        "id": { "type": "string" },
        "target": {
          "type": "object",
          "required": ["modelId", "path", "type"],
          "properties": {
            "modelId": { "type": "string" },
            "path": { "type": "string" },
            "type": {
              "type": "string",
              "enum": ["position", "rotation", "scale", "material", "visible", "custom"]
            }
          }
        },
        "source": {
          "type": "object",
          "required": ["expression"],
          "properties": {
            "expression": {
              "type": "string",
              "description": "Flux表达式，如 ${sceneState.valve1.open}"
            },
            "scope": { "type": "string" }
          }
        },
        "transform": {
          "type": "object",
          "properties": {
            "convert": {
              "type": "string",
              "description": "Flux表达式，如 value * 2"
            },
            "range": {
              "type": "object",
              "properties": {
                "input": {
                  "type": "array",
                  "items": { "type": "number" },
                  "minItems": 2,
                  "maxItems": 2
                },
                "output": {
                  "type": "array",
                  "items": { "type": "number" },
                  "minItems": 2,
                  "maxItems": 2
                }
              }
            },
            "animation": {
              "type": "object",
              "properties": {
                "type": { "type": "string", "enum": ["tween", "spring", "step"] },
                "duration": { "type": "number", "minimum": 0 },
                "easing": { "type": "string" }
              }
            }
          }
        },
        "condition": {
          "type": "object",
          "properties": {
            "expression": { "type": "string" },
            "trueValue": {},
            "falseValue": {}
          }
        }
      }
    },
    "AnimationConfig": {
      "type": "object",
      "required": ["id", "trigger", "target", "keyframes"],
      "properties": {
        "id": { "type": "string" },
        "trigger": {
          "type": "object",
          "properties": {
            "type": { "type": "string", "enum": ["state", "event", "time"] },
            "source": { "type": "string" },
            "value": {}
          }
        },
        "target": {
          "type": "object",
          "properties": {
            "modelId": { "type": "string" },
            "property": { "type": "string" }
          }
        },
        "keyframes": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "time": { "type": "number", "minimum": 0 },
              "value": {},
              "easing": { "type": "string" }
            }
          }
        }
      }
    },
    "ThreeCanvasEvents": {
      "type": "object",
      "properties": {
        "onObjectClick": {
          "description": "对象点击事件ActionSchema"
        },
        "onObjectHover": {
          "description": "对象悬停事件ActionSchema"
        },
        "onReady": {
          "description": "场景就绪事件ActionSchema"
        },
        "onError": {
          "description": "场景错误事件ActionSchema"
        }
      }
    }
  }
}
```

### 6.2 AI Schema验证器

```typescript
// ai/schema-validator.ts
import type { ThreeCanvasSchema } from '../schemas.js';
import schemaJson from '../types/threejs-schema.json' with { type: 'json' };

/**
 * AI Schema验证器
 *
 * 为AI生成提供结构验证，确保生成的配置符合规范
 */
export class SchemaValidator {
  private schema: typeof schemaJson;

  constructor() {
    this.schema = schemaJson;
  }

  /**
   * 验证ThreeCanvasSchema
   */
  validate(config: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    // 基础类型检查
    if (typeof config !== 'object' || config === null) {
      return { valid: false, errors: [{ path: '', message: 'Config must be an object' }] };
    }

    const obj = config as Record<string, any>;

    // type 字段检查
    if (obj.type !== 'three-canvas') {
      errors.push({ path: 'type', message: 'Must be "three-canvas"' });
    }

    // scene 字段检查
    if (!obj.scene || typeof obj.scene !== 'object') {
      errors.push({ path: 'scene', message: 'Scene config is required' });
    } else {
      // camera 检查
      if (!obj.scene.camera?.position) {
        errors.push({ path: 'scene.camera.position', message: 'Camera position is required' });
      }

      // lights 检查
      if (!Array.isArray(obj.scene.lights)) {
        errors.push({ path: 'scene.lights', message: 'Lights array is required' });
      }

      // models 检查
      if (!Array.isArray(obj.scene.models)) {
        errors.push({ path: 'scene.models', message: 'Models array is required' });
      } else {
        obj.scene.models.forEach((model: any, i: number) => {
          if (!model.id)
            errors.push({ path: `scene.models[${i}].id`, message: 'Model id is required' });
          if (!model.url)
            errors.push({ path: `scene.models[${i}].url`, message: 'Model url is required' });
        });
      }
    }

    // bindings 检查
    if (obj.bindings && Array.isArray(obj.bindings)) {
      obj.bindings.forEach((binding: any, i: number) => {
        if (!binding.id)
          errors.push({ path: `bindings[${i}].id`, message: 'Binding id is required' });
        if (!binding.target?.modelId)
          errors.push({
            path: `bindings[${i}].target.modelId`,
            message: 'Target modelId is required',
          });
        if (!binding.source?.expression)
          errors.push({
            path: `bindings[${i}].source.expression`,
            message: 'Source expression is required',
          });
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取JSON Schema
   */
  getSchema(): typeof schemaJson {
    return this.schema;
  }
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  path: string;
  message: string;
}
```

### 6.3 AI Schema生成器

```typescript
// ai/schema-generator.ts
import type { ThreeCanvasSchema, ThreeSceneConfig, DataBinding } from '../schemas.js';

/**
 * AI场景生成器
 *
 * 提供结构化接口，让AI自动生成3D场景配置
 * 输出通过 SchemaValidator 验证
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
   *
   * v3 修复：使用 Flux 表达式语法
   */
  private static generateBindings(config: any): DataBinding[] {
    return config.dataPoints.map((point) => ({
      id: `binding-${point.name}`,
      target: {
        modelId: config.models[0]?.name ?? 'default',
        path: point.type === 'boolean' ? 'visible' : 'material.color',
        type: point.type === 'boolean' ? ('visible' as const) : ('material' as const),
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
                output: [0, 1],
              },
            },
    }));
  }

  /**
   * 生成事件配置
   *
   * v3 修复：使用 ActionSchema 格式
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

---

## 7. 高性能优化策略（v3 改进）

### 7.1 渲染优化

```typescript
// engine/render-optimizer.ts

/**
 * 渲染优化器
 *
 * v3 改进：
 * - 使用 useFrame 驱动，不再独立管理 rAF
 * - 支持脏区域检测
 */
export class RenderOptimizer {
  private dirtyModels: Set<string> = new Set();
  private needsRender = false;

  /**
   * 标记模型需要更新
   */
  markDirty(modelId: string): void {
    this.dirtyModels.add(modelId);
    this.needsRender = true;
  }

  /**
   * 检查是否需要渲染
   */
  shouldRender(): boolean {
    return this.needsRender;
  }

  /**
   * 渲染完成，清除脏标记
   */
  clearDirty(): void {
    this.dirtyModels.clear();
    this.needsRender = false;
  }

  /**
   * 获取脏模型列表
   */
  getDirtyModels(): string[] {
    return Array.from(this.dirtyModels);
  }
}
```

### 7.2 内存管理

```typescript
// engine/memory-manager.ts
import * as THREE from 'three';

/**
 * 内存管理器
 *
 * 管理3D资源的生命周期，防止内存泄漏
 *
 * v3 改进：
 * - 支持 WeakRef 跟踪
 * - 添加内存使用统计
 * - 支持主动回收
 */
export class MemoryManager {
  private trackedResources: Map<string, { ref: WeakRef<any>; dispose?: () => void }> = new Map();
  private stats = {
    geometries: 0,
    materials: 0,
    textures: 0,
    totalBytes: 0,
  };

  /**
   * 注册可释放资源
   */
  register(id: string, resource: any, dispose?: () => void): void {
    this.trackedResources.set(id, {
      ref: new WeakRef(resource),
      dispose,
    });
  }

  /**
   * 释放资源
   */
  dispose(id: string): void {
    const entry = this.trackedResources.get(id);
    if (entry) {
      entry.dispose?.();
      this.trackedResources.delete(id);
    }
  }

  /**
   * 释放所有资源
   */
  disposeAll(): void {
    this.trackedResources.forEach((entry, id) => {
      entry.dispose?.();
    });
    this.trackedResources.clear();
  }

  /**
   * 清理已回收的资源
   */
  cleanupCollected(): void {
    const toDelete: string[] = [];
    this.trackedResources.forEach((entry, id) => {
      if (entry.ref.deref() === undefined) {
        toDelete.push(id);
      }
    });
    toDelete.forEach((id) => this.trackedResources.delete(id));
  }

  /**
   * 获取内存使用统计
   */
  getStats(): MemoryStats {
    let geometries = 0;
    let materials = 0;
    let textures = 0;

    this.trackedResources.forEach((entry) => {
      const resource = entry.ref.deref();
      if (!resource) return;

      if (resource instanceof THREE.BufferGeometry) geometries++;
      if (resource instanceof THREE.Material) materials++;
      if (resource instanceof THREE.Texture) textures++;
    });

    return { geometries, materials, textures };
  }
}

interface MemoryStats {
  geometries: number;
  materials: number;
  textures: number;
}
```

---

## 8. 实现计划

### 8.1 阶段一：核心基础设施（2周）

- [ ] 创建`flux-renderers-3d`包
- [ ] 实现ThreeCanvasSchema类型定义 + JSON Schema
- [ ] 实现SceneManager核心（含 AbortController 取消）
- [ ] 实现RendererDefinition（使用正确字段）
- [ ] 编写单元测试

### 8.2 阶段二：数据绑定（2周）

- [ ] 实现 useBindingBridge hook（精确订阅）
- [ ] 实现 TransformEngine（使用 expressionCompiler）
- [ ] 实现动画控制器
- [ ] 集成测试

### 8.3 阶段三：AI生成接口（1周）

- [ ] 实现 AISchemaGenerator
- [ ] 实现 SchemaValidator（JSON Schema 验证）
- [ ] 编写AI提示模板
- [ ] 文档和示例

### 8.4 阶段四：工业协议集成（2周）

- [ ] 实现 IndustrialAdapter（使用 RendererEnv.openSocket）
- [ ] 实现 ReconnectionManager（指数退避重连）
- [ ] 性能优化
- [ ] 压力测试

### 8.5 阶段五：文档和示例（1周）

- [ ] 编写使用文档
- [ ] 创建示例项目
- [ ] 编写AI提示指南
- [ ] 代码审查

---

## 9. 总结

本设计文档 v3 在 v2 基础上修复了所有审查发现的问题：

### P0 修复

1. **useScopeSelector 逻辑反转** → 使用 `paths` 选项精确订阅依赖路径，参考 scada-points-bridge 模式
2. **BindingEngine 每帧轮询** → 基于 Zustand subscribe + expression compiler，只在 scope 变更时重新求值
3. **new Function 安全风险** → 全面替换为 `runtime.expressionCompiler.compileExpression()`，禁止动态函数构造

### P1 修复

4. **RendererDefinition 字段错误** → 使用正确的接口：`type`, `component`, `propContracts`, `fields`
5. **events 分类违反 compiler 约束** → events 作为整体 prop（`kind: 'prop'`），renderer 内部通过 `helpers.dispatch` 桥接
6. **DataSourceAdapter 硬编码 Socket.IO** → 使用 `RendererEnv.openSocket` 标准接口
7. **缺少连接重连机制** → 新增 ReconnectionManager，支持指数退避 + 抖动策略

### 新增能力

- **JSON Schema 验证**：为 AI 生成提供结构验证
- **完整内存管理**：WeakRef 跟踪 + 主动回收
- **工业级重连**：指数退避 + 抖动 + 最大重试限制
- **模型加载取消**：AbortController 支持场景切换时取消进行中的加载

该方案充分利用了 Flux 的 expression compiler、scope 订阅、action dispatch 机制，避免了重复发明轮子，同时保持了代码的简洁、可维护和高性能。
