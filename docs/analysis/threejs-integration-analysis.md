# Three.js 集成分析报告

## 1. 调研概述

### 1.1 调研目标

- 调研three.js相关开源项目
- 分析在nop-chaos-flux项目中集成three.js的可行性
- 设计3D场景与外部数据驱动之间的联系机制

### 1.2 已下载的开源项目

| 项目              | 说明                    | 路径                           |
| ----------------- | ----------------------- | ------------------------------ |
| threejs-core      | Three.js核心库          | ~/sources/3D/threejs-core      |
| react-three-fiber | React Three Fiber - R3F | ~/sources/3D/react-three-fiber |
| drei              | R3F实用组件库           | ~/sources/3D/drei              |
| zustand           | 轻量级状态管理库        | ~/sources/3D/zustand           |
| FUXA              | Web-based SCADA/HMI平台 | ~/sources/3D/FUXA              |
| CUBE.gl           | 数据驱动地理空间可视化  | ~/sources/3D/CUBE.gl           |

---

## 2. 现有方案分析

### 2.1 React Three Fiber (R3F) - 推荐方案

**核心特点**：

- React渲染器，JSX声明式定义3D场景
- 内置Zustand状态管理集成
- 支持React 19（v9版本）

**状态管理模式**：

```
┌─────────────────────────────────────────────────┐
│                  Zustand Store                   │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │ Scene State │  │ App State   │  │ UI State │ │
│  └─────────────┘  └─────────────┘  └──────────┘ │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│              React Three Fiber Canvas           │
│  ┌─────────────────────────────────────────────┐│
│  │  useFrame() - 每帧更新，不触发React重渲染  ││
│  │  useRef() - 直接操作Three.js对象           ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

**优点**：

- 声明式3D场景定义
- 与React生态无缝集成
- Zustand作为官方推荐状态管理
- 支持React.memo优化重渲染

**缺点**：

- 需要引入React依赖
- 对于非React项目有额外开销

### 2.2 直接Three.js + 自定义状态管理

**核心特点**：

- 直接使用Three.js API
- 自定义事件总线或Pub/Sub模式
- 更轻量级，无React依赖

**状态管理模式**：

```
┌─────────────────────────────────────────────────┐
│              外部数据源 (Flux Store)              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │ Valve State │  │ Sensor Data │  │ UI State │ │
│  └─────────────┘  └─────────────┘  └──────────┘ │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│            Event Bus (Pub/Sub模式)              │
│  - subscribe('valve:state', callback)           │
│  - publish('valve:state', { open: true })       │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│              Three.js Scene                     │
│  ┌─────────────────────────────────────────────┐│
│  │  监听事件，更新3D对象属性                  ││
│  │  requestAnimationFrame渲染循环             ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

**优点**：

- 轻量级，无额外框架依赖
- 灵活的状态管理方案
- 更适合已有React项目的增量集成

**缺点**：

- 需要手动管理场景图
- 状态同步需要额外工作

### 2.3 FUXA - SCADA/HMI参考实现

**核心特点**：

- 完整的Web SCADA/HMI平台
- 支持Modbus、OPC-UA、MQTT等工业协议
- 内置SVG图形渲染和动画

**数据绑定模式**：

```javascript
// FUXA的数据绑定示例
const binding = {
  tag: 'VALVE_001',
  property: 'state',
  transform: (value) => (value === 1 ? 'open' : 'closed'),
};
```

**参考价值**：

- 工业协议集成经验
- 实时数据绑定模式
- 告警和事件处理

---

## 3. nop-chaos-flux项目集成方案

### 3.1 项目现状分析

当前项目结构：

- `flux-renderers-industrial` - 已有2D SCADA渲染器（基于Leafer UI）
- 使用React 19 + Zustand进行状态管理
- 渲染器遵循`RendererComponentProps`模式

### 3.2 推荐集成架构

**方案：Three.js + Zustand + Event Bridge**

```
┌─────────────────────────────────────────────────────────┐
│                    Flux Application                     │
│  ┌─────────────────────────────────────────────────────┐│
│  │                  Zustand Store                      ││
│  │  - applicationState (UI状态、业务数据)              ││
│  │  - sceneState (3D场景状态: 阀门、管道等)           ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              3D Scene Renderer Component                │
│  ┌─────────────────────────────────────────────────────┐│
│  │  ThreeSceneRenderer (新渲染器)                     ││
│  │  - 使用Canvas组件挂载Three.js                      ││
│  │  - 监听Zustand store变化                           ││
│  │  - 更新3D对象属性                                  ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  Three.js Scene                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  - 3D模型加载 (GLTF/GLB)                          ││
│  │  - 材质和动画控制                                  ││
│  │  - 交互事件处理                                    ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### 3.3 数据驱动机制设计

#### 3.3.1 状态同步模式

**模式A：Zustand Store直接订阅（推荐）**

```typescript
// 3D场景组件
function ThreeSceneRenderer(props: RendererComponentProps) {
  const sceneState = useScopeSelector(state => state.sceneState);

  useFrame(() => {
    // 每帧检查状态变化，更新3D对象
    updateValveState(sceneState.valveOpen);
  });

  return <Canvas>...</Canvas>;
}
```

**模式B：Event Bridge（解耦方案）**

```typescript
// 事件总线
const eventBus = {
  subscribe: (event: string, callback: Function) => {...},
  publish: (event: string, data: any) => {...}
};

// 3D场景监听
eventBus.subscribe('valve:state', (data) => {
  updateValveMesh(data.open);
});

// 外部状态变化时发布事件
store.subscribe((state) => {
  eventBus.publish('valve:state', { open: state.valveOpen });
});
```

#### 3.3.2 3D对象属性绑定

**数据模型定义**：

```typescript
interface SceneBinding {
  id: string; // 3D对象ID
  statePath: string; // Zustand状态路径
  propertyMap: {
    [key: string]: {
      transform?: (value: any) => any;
      animation?: AnimationConfig;
    };
  };
}
```

**绑定示例**：

```typescript
const bindings: SceneBinding[] = [
  {
    id: 'valve-001',
    statePath: 'valveStates.valve1',
    propertyMap: {
      open: {
        transform: (value) => value,
        animation: {
          type: 'rotation',
          axis: 'y',
          from: 0,
          to: Math.PI / 2,
          duration: 500,
        },
      },
    },
  },
];
```

### 3.4 技术选型建议

| 场景                  | 推荐方案               | 理由                    |
| --------------------- | ---------------------- | ----------------------- |
| 新建React应用         | React Three Fiber      | 声明式，与React生态集成 |
| 已有React应用增量集成 | 直接Three.js + Zustand | 灵活，无额外依赖        |
| 复杂SCADA/HMI         | FUXA参考               | 完整的工业协议支持      |
| 轻量级3D可视化        | Three.js + Event Bus   | 最轻量级                |

**对于nop-chaos-flux项目**：

- 推荐使用**直接Three.js + Zustand**方案
- 原因：
  1. 项目已有Zustand状态管理
  2. `flux-renderers-industrial`包可以扩展
  3. 避免引入React Three Fiber的额外复杂性
  4. 更符合现有渲染器架构

---

## 4. 实现计划

### 4.1 阶段一：基础设施

1. 创建`flux-renderers-3d`包
2. 集成Three.js核心库
3. 实现基础3D渲染器组件
4. 设计状态同步接口

### 4.2 阶段二：数据绑定

1. 实现Zustand Store与3D场景的桥接
2. 设计属性绑定配置格式
3. 实现状态变化到3D属性的转换
4. 支持动画过渡

### 4.3 阶段三：功能扩展

1. 支持GLTF/GLB模型加载
2. 实现材质和纹理管理
3. 添加交互事件处理
4. 性能优化（LOD、实例化渲染）

### 4.4 阶段四：工业场景集成

1. 参考FUXA实现工业协议支持
2. 实现告警和事件处理
3. 添加数据历史记录
4. 完善文档和示例

---

## 5. 风险评估

### 5.1 技术风险

| 风险               | 影响 | 缓解措施            |
| ------------------ | ---- | ------------------- |
| Three.js版本兼容性 | 高   | 锁定版本，定期更新  |
| 性能瓶颈           | 中   | LOD、实例化、LOD    |
| 内存泄漏           | 中   | 正确的dispose和清理 |
| WebGL兼容性        | 低   | 降级方案，错误处理  |

### 5.2 架构风险

| 风险             | 影响 | 缓解措施                       |
| ---------------- | ---- | ------------------------------ |
| 状态同步复杂性   | 高   | 清晰的接口设计                 |
| 与现有渲染器集成 | 中   | 遵循RendererComponentProps模式 |
| 包体积增大       | 低   | 按需加载，Tree Shaking         |

---

## 6. 结论

### 6.1 推荐方案

**直接Three.js + Zustand** 是最适合nop-chaos-flux项目的集成方案，原因：

1. 与现有React 19 + Zustand技术栈一致
2. 可以扩展现有的`flux-renderers-industrial`包
3. 灵活的状态管理机制
4. 更符合低代码渲染器架构

### 6.2 下一步

1. 创建详细设计文档
2. 实现原型验证
3. 编写技术规范
4. 开发MVP版本

---

## 附录：参考资源

### 开源项目

- [Three.js](https://github.com/mrdoob/three.js)
- [React Three Fiber](https://github.com/pmndrs/react-three-fiber)
- [Drei](https://github.com/pmndrs/drei)
- [Zustand](https://github.com/pmndrs/zustand)
- [FUXA](https://github.com/frangoteam/FUXA)

### 文档

- [Three.js文档](https://threejs.org/docs/)
- [R3F文档](https://r3f.docs.pmnd.rs/)
- [Zustand文档](https://github.com/pmndrs/zustand)

### 工业应用参考

- [FUXA SCADA/HMI](https://github.com/frangoteam/FUXA)
- [JointJS SCADA Demo](https://www.jointjs.com/demos/scada)
