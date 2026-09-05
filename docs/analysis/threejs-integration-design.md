# Three.js 集成设计文档

## 1. 概述

### 1.1 设计目标

设计一个标准、简单的技术方案，实现Three.js 3D场景与nop-chaos-flux框架外部数据驱动之间的联系。

### 1.2 设计原则

1. **简单性**：方案应易于理解和实现
2. **标准性**：遵循现有渲染器架构模式
3. **解耦性**：3D场景与数据驱动逻辑分离
4. **可扩展性**：支持未来功能扩展

---

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    nop-chaos-flux 应用                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Zustand Store                        │  │
│  │  - applicationState (UI状态、业务数据)               │  │
│  │  - sceneState (3D场景状态)                           │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Three.js Renderer Component                   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  ThreeCanvasRenderer                                  │ │
│  │  - Canvas组件挂载Three.js                            │ │
│  │  - 监听Zustand store变化                             │ │
│  │  - 更新3D对象属性                                    │ │
│  │  - 处理用户交互事件                                  │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Three.js Scene                          │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  - 3D模型加载 (GLTF/GLB)                            │ │
│  │  - 材质和动画控制                                    │ │
│  │  - 光照和环境                                        │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 状态管理设计

#### 2.2.1 Zustand Store 结构

```typescript
// store.ts
interface ThreeSceneState {
  // 场景配置
  sceneConfig: {
    camera: { position: [x, y, z]; fov: number };
    lights: LightConfig[];
    environment: EnvironmentConfig;
  };

  // 3D对象状态
  objects: {
    [objectId: string]: {
      visible: boolean;
      position: [x, y, z];
      rotation: [x, y, z];
      scale: [x, y, z];
      material: {
        color?: string;
        opacity?: number;
        metalness?: number;
        roughness?: number;
      };
      // 自定义属性
      custom?: Record<string, any>;
    };
  };

  // 动画状态
  animations: {
    [animationId: string]: {
      playing: boolean;
      time: number;
      duration: number;
    };
  };

  // 用户交互状态
  interaction: {
    selectedObject: string | null;
    hoveredObject: string | null;
    cameraControls: boolean;
  };
}

interface ThreeSceneActions {
  // 场景配置更新
  updateSceneConfig: (config: Partial<ThreeSceneState['sceneConfig']>) => void;

  // 对象状态更新
  updateObject: (id: string, updates: Partial<ThreeSceneState['objects'][string]>) => void;
  updateObjectProperty: (id: string, path: string, value: any) => void;

  // 动画控制
  playAnimation: (id: string) => void;
  pauseAnimation: (id: string) => void;

  // 交互事件
  selectObject: (id: string | null) => void;
  hoverObject: (id: string | null) => void;
}
```

#### 2.2.2 状态同步机制

**模式A：Zustand Selector（推荐）**

```typescript
// ThreeCanvasRenderer组件中
function ThreeCanvasRenderer(props: RendererComponentProps) {
  const objects = useScopeSelector(state => state.threeScene.objects);
  const selectedObject = useScopeSelector(state => state.threeScene.interaction.selectedObject);

  // 使用useFrame进行每帧更新
  useFrame(() => {
    // 更新3D对象
    objects.forEach((obj, id) => {
      const mesh = scene.getObjectById(id);
      if (mesh) {
        mesh.position.set(...obj.position);
        mesh.rotation.set(...obj.rotation);
        mesh.scale.set(...obj.scale);
      }
    });
  });

  return <Canvas>...</Canvas>;
}
```

**模式B：Event Bridge（解耦方案）**

```typescript
// event-bridge.ts
class ThreeEventBridge {
  private listeners = new Map<string, Set<Function>>();

  subscribe(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  publish(event: string, data: any) {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }
}

// 使用示例
const bridge = new ThreeEventBridge();

// 3D场景监听
bridge.subscribe('object:update', (data) => {
  updateThreeObject(data.id, data.updates);
});

// 外部状态变化时发布
store.subscribe((state) => {
  bridge.publish('object:update', {
    id: 'valve-001',
    updates: state.valveStates.valve1,
  });
});
```

### 2.3 数据绑定配置

#### 2.3.1 绑定配置格式

```typescript
// binding-config.ts
interface SceneBindingConfig {
  id: string;
  name: string;

  // 3D对象标识
  target: {
    type: 'object' | 'material' | 'light';
    id: string;
    path?: string; // 属性路径，如 'material.color'
  };

  // 数据源配置
  source: {
    type: 'state' | 'expression' | 'api';
    value?: string; // Zustand状态路径
    expression?: string; // Flux表达式
    api?: {
      url: string;
      method: 'GET' | 'POST';
      interval?: number;
    };
  };

  // 转换配置
  transform?: {
    // 值转换函数
    convert?: (value: any) => any;
    // 动画配置
    animation?: {
      type: 'tween' | 'spring' | 'step';
      duration?: number;
      easing?: string;
    };
  };
}
```

#### 2.3.2 绑定配置示例

```json
{
  "bindings": [
    {
      "id": "valve-state-binding",
      "name": "阀门状态绑定",
      "target": {
        "type": "object",
        "id": "valve-001",
        "path": "rotation.y"
      },
      "source": {
        "type": "state",
        "value": "sceneState.valves.valve1.open"
      },
      "transform": {
        "convert": "(value) => value ? Math.PI / 2 : 0",
        "animation": {
          "type": "tween",
          "duration": 500,
          "easing": "easeInOut"
        }
      }
    },
    {
      "id": "sensor-color-binding",
      "name": "传感器颜色绑定",
      "target": {
        "type": "material",
        "id": "sensor-001",
        "path": "color"
      },
      "source": {
        "type": "expression",
        "expression": "temperature > 80 ? '#ff0000' : '#00ff00'"
      },
      "transform": {
        "animation": {
          "type": "tween",
          "duration": 300
        }
      }
    }
  ]
}
```

---

## 3. 组件设计

### 3.1 ThreeCanvasRenderer 组件

```typescript
// three-canvas-renderer.tsx
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useScopeSelector, useRendererRuntime } from '@nop-chaos/flux-react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';

interface ThreeCanvasRendererProps extends RendererComponentProps {
  schema: {
    type: 'three-canvas';
    width?: number;
    height?: number;
    config: string | SceneConfig;
    bindings?: SceneBindingConfig[];
    events?: {
      onObjectClick?: ActionSchema;
      onObjectHover?: ActionSchema;
      onReady?: ActionSchema;
    };
  };
}

function SceneContent({ bindings }: { bindings?: SceneBindingConfig[] }) {
  const { scene, camera, gl } = useThree();
  const objects = useScopeSelector(state => state.threeScene.objects);
  const selectedObject = useScopeSelector(state => state.threeScene.interaction.selectedObject);

  // 加载3D模型
  useEffect(() => {
    const loader = new THREE.GLTFLoader();
    loader.load('/models/scene.glb', (gltf) => {
      scene.add(gltf.scene);
    });

    return () => {
      // 清理场景
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          object.material.dispose();
        }
      });
    };
  }, [scene]);

  // 每帧更新对象状态
  useFrame(() => {
    objects.forEach((obj, id) => {
      const mesh = scene.getObjectByName(id);
      if (mesh) {
        // 更新位置、旋转、缩放
        mesh.position.set(...obj.position);
        mesh.rotation.set(...obj.rotation);
        mesh.scale.set(...obj.scale);

        // 更新材质
        if (mesh instanceof THREE.Mesh && obj.material) {
          const material = mesh.material as THREE.MeshStandardMaterial;
          if (obj.material.color) material.color.set(obj.material.color);
          if (obj.material.opacity !== undefined) material.opacity = obj.material.opacity;
        }
      }
    });

    // 处理选中状态
    if (selectedObject) {
      const selectedMesh = scene.getObjectByName(selectedObject);
      if (selectedMesh) {
        // 添加选中效果，如高亮
        selectedMesh.scale.set(1.1, 1.1, 1.1);
      }
    }
  });

  return null;
}

export function ThreeCanvasRenderer(props: ThreeCanvasRendererProps) {
  const { width, height, config, bindings } = props.schema;

  return (
    <div style={{ width: width || '100%', height: height || '400px' }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        gl={{ antialias: true }}
      >
        <SceneContent bindings={bindings} />
      </Canvas>
    </div>
  );
}
```

### 3.2 绑定处理器

```typescript
// binding-handler.ts
export class BindingHandler {
  private bindings: SceneBindingConfig[] = [];
  private unsubscribe: (() => void)[] = [];

  constructor(
    private store: any,
    private scene: THREE.Scene,
  ) {}

  // 注册绑定
  register(binding: SceneBindingConfig) {
    this.bindings.push(binding);

    // 根据绑定类型订阅状态变化
    if (binding.source.type === 'state') {
      const unsubscribe = this.store.subscribe(
        (state: any) => this.getNestedValue(state, binding.source.value!),
        (value: any) => this.updateBinding(binding, value),
      );
      this.unsubscribe.push(unsubscribe);
    }
  }

  // 更新绑定
  private updateBinding(binding: SceneBindingConfig, value: any) {
    const target = this.findTarget(binding.target);
    if (!target) return;

    // 应用转换
    let transformedValue = value;
    if (binding.transform?.convert) {
      transformedValue = binding.transform.convert(value);
    }

    // 更新目标属性
    this.setProperty(target, binding.target.path!, transformedValue);

    // 应用动画
    if (binding.transform?.animation) {
      this.animateProperty(
        target,
        binding.target.path!,
        transformedValue,
        binding.transform.animation,
      );
    }
  }

  // 查找目标对象
  private findTarget(target: SceneBindingConfig['target']): any {
    switch (target.type) {
      case 'object':
        return this.scene.getObjectByName(target.id);
      case 'material':
        const mesh = this.scene.getObjectByName(target.id) as THREE.Mesh;
        return mesh?.material;
      case 'light':
        return this.scene.getObjectByName(target.id);
      default:
        return null;
    }
  }

  // 设置属性值
  private setProperty(obj: any, path: string, value: any) {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
  }

  // 动画属性
  private animateProperty(obj: any, path: string, targetValue: any, config: any) {
    // 实现动画逻辑
    const startValue = this.getProperty(obj, path);
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / (config.duration || 500), 1);

      // 应用缓动函数
      const easedProgress = this.applyEasing(progress, config.easing);

      // 插值计算
      const currentValue = this.interpolate(startValue, targetValue, easedProgress);
      this.setProperty(obj, path, currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  // 清理
  dispose() {
    this.unsubscribe.forEach((unsub) => unsub());
    this.bindings = [];
  }
}
```

---

## 4. 数据流设计

### 4.1 数据流图

```
┌─────────────────────────────────────────────────────────────┐
│                    外部数据源                                │
│  - 用户交互 (按钮、开关)                                    │
│  - API数据 (传感器数据、状态)                               │
│  - 定时器 (实时更新)                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Zustand Store                              │
│  - 应用状态更新                                             │
│  - 触发订阅者                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Binding Handler                                │
│  - 监听状态变化                                             │
│  - 应用转换函数                                             │
│  - 生成3D属性更新                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Three.js Scene                                 │
│  - 更新对象属性                                             │
│  - 应用动画                                                 │
│  - 重新渲染                                                 │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 事件流设计

#### 4.2.1 用户交互事件

```typescript
// 用户点击3D对象
onObjectClick: (objectId: string) => {
  // 1. 更新Zustand store
  store.getState().selectObject(objectId);

  // 2. 触发Flux action
  dispatch({
    type: 'OBJECT_CLICKED',
    payload: { objectId },
  });

  // 3. 可选：更新外部状态
  // 例如：打开属性面板、显示详情等
};
```

#### 4.2.2 状态变化事件

```typescript
// 状态变化触发3D更新
store.subscribe(
  (state) => state.valveStates,
  (valveStates) => {
    // 1. 更新3D场景
    bindingHandler.updateBindings();

    // 2. 触发渲染
    invalidate(); // 请求重新渲染
  },
);
```

---

## 5. 性能优化

### 5.1 渲染优化

1. **按需渲染**：使用`frameloop="demand"`，仅在状态变化时渲染
2. **实例化渲染**：相同材质的对象使用InstancedMesh
3. **LOD（细节层次）**：根据距离动态调整模型复杂度
4. **视锥剔除**：自动剔除不可见对象

### 5.2 状态优化

1. **选择性订阅**：使用Zustand selector仅订阅需要的状态切片
2. **批量更新**：合并多个状态更新，避免频繁渲染
3. **不可变更新**：使用不可变数据结构，优化比较

### 5.3 内存优化

1. **资源释放**：及时释放Geometry、Material、Texture
2. **对象池**：重用3D对象，避免频繁创建/销毁
3. **懒加载**：按需加载3D模型和纹理

---

## 6. 实现计划

### 6.1 阶段一：基础设施（1-2周）

- [ ] 创建`flux-renderers-3d`包
- [ ] 集成Three.js核心库
- [ ] 实现基础ThreeCanvasRenderer组件
- [ ] 设计Zustand store结构

### 6.2 阶段二：数据绑定（2-3周）

- [ ] 实现BindingHandler类
- [ ] 设计绑定配置格式
- [ ] 实现状态到3D属性的转换
- [ ] 添加动画支持

### 6.3 阶段三：功能扩展（3-4周）

- [ ] 支持GLTF/GLB模型加载
- [ ] 实现材质和纹理管理
- [ ] 添加交互事件处理
- [ ] 性能优化（LOD、实例化）

### 6.4 阶段四：工业场景集成（2-3周）

- [ ] 参考FUXA实现工业协议支持
- [ ] 实现告警和事件处理
- [ ] 添加数据历史记录
- [ ] 完善文档和示例

---

## 7. 集成示例

### 7.1 基本使用示例

```typescript
// 在Flux JSON中使用three-canvas渲染器
{
  "type": "three-canvas",
  "width": 800,
  "height": 600,
  "config": {
    "camera": { "position": [0, 2, 5], "fov": 75 },
    "lights": [
      { "type": "ambient", "intensity": 0.5 },
      { "type": "directional", "position": [5, 5, 5], "intensity": 1 }
    ],
    "models": [
      { "url": "/models/factory.glb", "position": [0, 0, 0] }
    ]
  },
  "bindings": [
    {
      "id": "valve-binding",
      "target": { "type": "object", "id": "valve-001", "path": "rotation.y" },
      "source": { "type": "state", "value": "sceneState.valves.valve1.open" },
      "transform": {
        "convert": "(value) => value ? Math.PI / 2 : 0",
        "animation": { "type": "tween", "duration": 500 }
      }
    }
  ],
  "events": {
    "onObjectClick": { "type": "action", "action": "selectObject" }
  }
}
```

### 7.2 与现有渲染器集成

```typescript
// 在页面中组合使用2D和3D渲染器
{
  "type": "hstack",
  "children": [
    {
      "type": "scada-canvas",
      "config": "..."  // 2D SCADA视图
    },
    {
      "type": "three-canvas",
      "config": "..."  // 3D场景视图
    }
  ]
}
```

---

## 8. 总结

本设计文档提出了一种基于**Three.js + Zustand**的3D场景与外部数据驱动集成方案，具有以下特点：

1. **简单性**：使用Zustand作为状态桥梁，无需复杂的事件总线
2. **标准性**：遵循现有渲染器架构模式，易于集成
3. **解耦性**：3D场景与数据驱动逻辑分离，便于维护
4. **可扩展性**：支持未来功能扩展，如工业协议、动画系统等

该方案可以有效实现"状态设置为开，则3D场景中的阀门变成打开"这样的数据驱动需求，同时保持代码的简洁和可维护性。
