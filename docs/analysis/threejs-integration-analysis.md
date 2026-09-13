# Three.js 集成分析报告

> 更新：2026-09-13（I0.1 调研收口，plan `docs/plans/463-threejs-i0-research-plan.md`）新增 §7 industrial-hmi 复用点确认、§8 设计 v4 API 用法核对与待裁定分歧、§9 Three.js 核心 API 深度分析、§10 性能基准框架。§1–6 为 2026-09 调研原文，保留不改。

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

## 7. industrial-hmi 复用点确认（I0.1，live repo 核对）

以下每项均经 live 代码核对（2026-09-13，分支 `feat-threejs-integration`）。行号以当前工作区为准。

### 7.1 表达式求值与订阅路径提取（`packages/flux-renderers-industrial`）

| 复用点                                                     | live 位置                                           | 契约要点                                                                                                                                                                                                                                                                                 | 3D 集成复用方式                                                                       |
| ---------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `createPrivateEvalScope(data)`                             | `src/binding/flux-eval.ts:17`                       | 构造只读私有求值 ScopeRef（INV-4 非 schema-visible 边界），合并优先级 `{...pointValues, ...scopeData}`（scope 遮蔽 point）                                                                                                                                                               | three-canvas 绑定引擎求值时构造同样的私有求值 scope                                   |
| `extractExpressionDepsViaProbe(compiler, env, expression)` | `src/binding/flux-eval.ts:64`（结果类型 `:53-58`）  | `compileValue` → `createState` → 宽容 Proxy probe scope → `evaluateWithState` → 读 `state.root.dependencies.paths`；结果 `ok / compile-failed / create-state-failed / evaluate-failed / deps-empty` 五态；root 非 `leaf-state` 或 wildcard 或空 paths 均按 `deps-empty` 处理（`:88-93`） | three-canvas 复杂表达式订阅路径提取直接复用（import 或按此模式实现）                  |
| `probeExpressionPaths(expression, context?)`               | `src/binding/flux-eval.ts:106`                      | 自动补 `${}` 包裹，probe 失败返空数组                                                                                                                                                                                                                                                    | 绑定表达式扫描                                                                        |
| `analyzeFluxSubscriptions(config, options?)`               | `src/renderer/hooks/use-scada-points-bridge.ts:56`  | 仅认 `${expr}` 入口（I18 表达式一元化）；纯路径正则 `/^[a-zA-Z_][a-zA-Z0-9_.-]*$/` 直取；复杂表达式走 probe；同时返回 `depsEmptyExpressions`（读 scope 但 collector 返空嫌疑集）                                                                                                         | `analyzeBindingSubscriptions`（设计 v4 §4.2）应对齐此实现，而非 v4 文中简化的重复实现 |
| `useScadaPointsBridge`（精确订阅 + 合帧）                  | `src/renderer/hooks/use-scada-points-bridge.ts:225` | `useScopeSelector((snapshot) => snapshot, Object.is, { enabled, fallback: {}, paths })` 精确订阅；compiledCache 随 config/compiler 变更清空（`:284-288`）；错误按 `(expression, code)` 去重上报（`:290-296`）；求值结果进 PointStore + `pipeline.requestRender` 合帧，不逐点 setState    | 绑定桥接 hook 的骨架模式：paths 精确订阅 → 编译缓存 → 批量应用（flush）               |

### 7.2 帧合并与脏收集（数据流下半段）

- `PointStore`（`src/binding/point-store.ts`）+ `RefreshPipeline`（`src/binding/refresh-pipeline.ts`）+ `ApplyAttrs`（`src/binding/dirty-collector.ts`）：点值批量写入 + 请求帧统一重绘，避免逐对象直刷。3D 侧对应物是「pendingUpdates 队列 + useFrame flush」（设计 v4 §4.3），语义同构：**写缓存、帧边界批量应用**。
- `errorMessage`（`src/renderer/scada-errors.ts`）：错误消息提取，3D 侧错误上报可复用。

### 7.3 Socket 契约与 host 实现（路线图复用表的勘误）

路线图 Framework Reuse 表写「Socket 模式 | industrial-hmi | 复用 scada 的 socket 数据桥接模式」。**live 核对结果：`flux-renderers-industrial` 包内没有任何 `openSocket` 调用**（全包 grep 零命中）。真实分布是：

| 层            | live 位置                                              | 要点                                                                                                                                                                                                            |
| ------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 契约          | `packages/flux-core/src/types/renderer-api.ts:136-167` | `openSocket?: WebSocketOpener` **同步返回** `WebSocketConnection`；事件为 `onopen/onmessage/onclose/onerror` **属性赋值**（`:157`）；使用前必须 capability check（`:186-188` 注释、`utils/renderer-env.ts:50`） |
| host 默认实现 | `apps/playground/src/env/socket-impl.ts`               | `createDefaultOpenSocket`（`:98`）代理原生 WebSocket；`mapWebSocket`（`:53`）做事件映射；`options.signal` abort 触发 `close()`（`:114-121`）                                                                    |

因此 I3.1 的「socket 数据桥接」= 消费 `env.openSocket` 契约（capability check + 属性赋值事件）+ 自建重连；scada 可复用的是 §7.1/§7.2 的**数据合帧模式**，不是 socket 代码本身。

### 7.4 ExpressionCompiler 实际 API 面（`packages/flux-core`）

- `ExpressionCompiler`（`src/types/compilation.ts:225-229`）：`formulaCompiler` / `compileNode` / `compileValue` / `createState`，继承 `CompiledValueEvaluator`。
- `FormulaCompiler`（`src/types/compilation.ts:213-223`）：`hasExpression` / `compileExpression` / `compileTemplate`。
- 求值器（`src/types/compiled-value-types.ts:132-145`）：`evaluateValue(input: CompiledRuntimeValue, scope, env, state?)` 与 `evaluateWithState(input: DynamicRuntimeValue, scope, env, state)`（返回 `ValueEvaluationResult{value, changed, reusedReference}`）。
- **关键类型关系**：`CompiledExpression`（`:19-24`，`kind:'expression'`，字段 `source/staticValue/exec`）**不是** `DynamicRuntimeValue`（`:117-128`，`kind:'dynamic'`，要求 `node/createState/isStatic:false`）。`formulaCompiler.compileExpression()` 的产物只能 `compiled.exec(context, env)` 手动执行，**不能**喂给 `evaluateValue`/`evaluateWithState`。

---

## 8. 设计 v4 API 用法核对表与待裁定分歧（I0.1 → I1.1 输入）

### 8.1 设计 v4（`docs/components/threejs-integration/design.md`）API 用法逐条核对

| #   | v4 位置   | v4 写法                                                                                         | 核对结果                   | 说明 / 建议修正                                                                                                                                                                                                                                                |
| --- | --------- | ----------------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | §4.2/§4.3 | `formulaCompiler.compileExpression()` 产物喂 `evaluateWithState`                                | ❌ 类型不匹配              | `CompiledExpression` 非 `DynamicRuntimeValue`（§7.4）。应改用 `compileValue()`，并按 `flux-eval.ts:75` 先判 `.kind === 'dynamic'`                                                                                                                              |
| 2   | §4.2      | `extractExpressionDepsViaProbe` 函数体（伪 probeContext 对象强转 any）                          | ⚠️ 签名同名但实现劣于 live | live 版（`flux-eval.ts:64`）用宽容 Proxy scope、含 `create-state-failed` 态、`root.kind === 'leaf-state'` + wildcard 判定。I2 应直接 import 工业包实现或按其语义复制                                                                                           |
| 3   | §4.5      | `loader.loadAsync(url, undefined, undefined, abortController.signal as any)`                    | ❌ 参数不存在              | three 0.186 `Loader.loadAsync(url, onProgress)` 仅 2 参（`three/src/loaders/Loader.js:91`）。取消需自行 generation-guard：abort 后丢弃迟到结果并 dispose                                                                                                       |
| 4   | §4.5      | `OrbitControls` / `GLTFLoader` 的 `three/examples/jsm/*` 导入路径                               | ✅ 0.186 存在              | 同目录另有 `three/examples/jsm/Addons.js` 聚合入口                                                                                                                                                                                                             |
| 5   | §3.3      | `socket.onmessage = fn` 属性赋值 + openSocket 同步返回                                          | ✅ 与契约一致              | `renderer-api.ts:136-167`、playground `socket-impl.ts`                                                                                                                                                                                                         |
| 6   | §4.3      | `useScopeSelector(selector, eqFn, { paths, enabled })`                                          | ✅ 与 live 选项一致        | live 另有 `fallback`；可对照 `use-scada-points-bridge.ts:251-259`                                                                                                                                                                                              |
| 7   | §3.2      | events 注册为 `kind: 'prop'` + 渲染器内 `helpers.dispatch` 桥接，理由「避免违反 compiler 约束」 | ⚠️ 待裁定                  | 平台标准是 `kind: 'event'` → `props.events[key]`（`renderer-core.ts:268`；字段生命周期见 `docs/references/quick-reference.md`）；`contract-honesty.ts:446` 对 event 字段有校验。v4 未指明是哪条约束。I1.1 需裁定：除非找到具体约束，否则应回归 `kind: 'event'` |
| 8   | §4.5      | `mesh.rotation.set(...config.rotation)` / `position.set(...)`                                   | ✅（附条件）               | `Vector3.set(x,y,z?)` z 可省（`Vector3.d.ts:53`），`Euler.set(x,y,z,order?)` **z 必填**（`Euler.d.ts:35`）——数组必须是 3 元                                                                                                                                    |
| 9   | §4.5      | `new THREE.Fog(color, near, far)`、`scene.background = new THREE.Color(...)`                    | ✅                         | `Fog.d.ts:28`；`Color.set(...[color]                                                                                                                                                                                                                           | [r,g,b])` 同时接受 hex 串与三数值（`Color.d.ts:225`），利好 material.color 绑定 |
| 10  | §3.3      | `useRendererEnv()` 自 `@nop-chaos/flux-react` 导入                                              | ✅                         | `packages/flux-react/src/index.tsx` 已导出（含 `useActionDispatcher`/`useScopeSelector`）                                                                                                                                                                      |

### 8.2 待裁定分歧（I1.1 设计共识审查的裁定项）

**分歧 (a)：渲染技术路线——R3F vs 裸 Three.js**

- 设计 v4 代码以 `@react-three/fiber` 为基础（`Canvas`/`useFrame`/`useThree`）；本文 §3.4/§6.1 推荐裸 Three.js + 自管 rAF。
- 事实面：R3F v9.7.0 官方支持 React 19；代价是引入 react-reconciler 自定义渲染器栈。裸 Three.js 需自写 ~40 行 rAF 循环 + resize/dispose 生命周期，但与「渲染器组件自管命令式引擎」的 scada-canvas（Leafer）先例同构。
- 裁定建议（供 I1.1，不预决）：若选裸 Three.js，v4 的 `useFrame flush` 模式迁移为自有 rAF 循环内 flush，§4 绑定引擎设计不变。

**分歧 (b)：包落点——新建 `flux-renderers-3d` vs 扩展 `flux-renderers-industrial`**

- v4 §2.2 新建包；本文 §6.1 建议扩展 industrial。
- 事实面：industrial 绑定 Leafer UI（2D canvas 引擎）；并入 three 会让单包携带两套渲染引擎（消费方 bundle 体积）。仓库先例：渲染器包按域拆分（`flux-renderers-map`/`-graph`/`-dashboard` 各自独立）。
- 裁定建议（供 I1.1，不预决）：新建包与既有按域拆分惯例一致，且 I3/I4 复用的都是 flux-core/flux-react 层能力而非 industrial 包实体。

---

## 9. Three.js 核心 API 深度分析（I0.1，版本锁定 three@0.186.0）

> 事实来源：`node_modules/@types/three@0.186.0` 与 `node_modules/three/src/`。只覆盖设计 v4 用到的 API 面。

### 9.1 场景图与 Object3D 属性模型

- `Object3D.position: Vector3` / `scale: Vector3` / `rotation: Euler` 三者均为 **readonly 引用**（`Object3D.d.ts:164-185`）：只能就地变更（`.set()`/`.copy()`/分量赋值），**不可整体重新赋值**。这是绑定引擎 `updateProperty` 必须走 `.set()` 的根本原因。
- `Vector3.set(x, y, z?): this`（`Vector3.d.ts:53`，z 可省略）；`Euler.set(x, y, z, order?): Euler`（`Euler.d.ts:35`，z 必填，rotation 单位弧度，默认 order `'XYZ'`）。
- `.set()` 家族返回 `this`，可链式；`Color.set(...args: [color: ColorRepresentation] | [r: number, g: number, b: number]): this`（`Color.d.ts:225`）——绑定 `material.color` 时同一入口既接受 `'#ff0000'` 也接受 `[1, 0, 0]`。
- `visible: boolean`（`Object3D.d.ts:30`）直接赋值即可，无 `.set()`。

### 9.2 渲染器与帧循环

- `WebGLRenderer({ antialias, alpha, powerPreference, ... })`；`dispose(): void`（`WebGLRenderer.d.ts:340`）；帧循环由调用方驱动（R3F `useFrame` 或自管 `requestAnimationFrame`），每帧 `renderer.render(scene, camera)`。
- 裸 three 方案的组件需自管：resize（`ResizeObserver` → `renderer.setSize` + `camera.aspect` + `updateProjectionMatrix`）、rAF 取消、context lost 监听。
- `OrbitControls`（`three/examples/jsm/controls/OrbitControls.js`）：`enableDamping` 开启后每帧必须 `controls.update()`；`dispose()` 释放事件监听。

### 9.3 几何与材质

- 内置几何（`BufferGeometry` 子类）：`BoxGeometry` / `SphereGeometry` / `CylinderGeometry` / `PlaneGeometry` 等；基类 `BufferGeometry` 用后需 `dispose()`（`BufferGeometry.d.ts:179,532`）。
- 常用材质（`MeshStandardMaterial` 为 PBR 默认选择）：`MeshBasicMaterial`（无光照）/ `MeshLambertMaterial` / `MeshPhongMaterial` / `MeshStandardMaterial` / `MeshPhysicalMaterial`；`Material.dispose()`（`Material.d.ts:649`）；`transparent` + `opacity` 控制透明度。
- 资源释放链（组件卸载）：`object.traverse(child => { child.geometry?.dispose(); 材质单/数组分别 dispose() })`。

### 9.4 灯光（五类，对应设计 v4 `LightConfig`）

| 类型               | 构造参数                                             | 备注                                                                                                |
| ------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `AmbientLight`     | (color, intensity)                                   | 无方向，全局底光                                                                                    |
| `DirectionalLight` | (color, intensity)                                   | `.position` + `.target.position`（target 需 `scene.add(light.target)`）；`castShadow` + shadow 相机 |
| `PointLight`       | (color, intensity, distance, decay)                  | 点光源，物理衰减                                                                                    |
| `SpotLight`        | (color, intensity, distance, angle, penumbra, decay) | 锥形光                                                                                              |
| `HemisphereLight`  | (skyColor, groundColor, intensity)                   | 天地光                                                                                              |

### 9.5 动画与加载

- `AnimationMixer(root)` + `mixer.clipAction(clip)`（`AnimationMixer.d.ts:97`）→ `action.play()`；每帧 `mixer.update(delta)`；销毁 `stopAllAction()` + `uncacheRoot(root)`。
- `GLTFLoader`（`three/examples/jsm/loaders/GLTFLoader.js`）：`loadAsync(url, onProgress)` **仅 2 参，无 AbortSignal**（§8.1 #3）；产物 `gltf.scene: Group` + `gltf.animations: AnimationClip[]`。
- 场景环境：`scene.background: Color | Texture`；`scene.fog = new Fog(color, near?, far?)`（`Fog.d.ts:28`）。

---

## 10. 性能基准框架（I0.1）

### 10.1 目标指标（承设计 v4 §1.2）

| 指标              | 目标   | 本阶段可测性                                               |
| ----------------- | ------ | ---------------------------------------------------------- |
| 实时渲染帧率      | 60fps  | 浏览器侧（需渲染器落地后挂 e2e，见 10.4）                  |
| 状态更新→渲染延迟 | < 16ms | CPU 侧路径可测（绑定求值 + 属性写入，本阶段基准）          |
| 错误恢复时间      | < 1s   | I3.1 重连基准（ReconnectionManager 落地后测 backoff 序列） |

### 10.2 基准脚本

- 位置：`scripts/three-perf/bench-scene-graph.mjs`（node 直跑，`three` 由根 devDependencies 提供）。
- 运行：`node scripts/three-perf/bench-scene-graph.mjs`（人读表格）；`--json`（机器可读，供后续 e2e 门禁对比）。
- 场景：(a) 几何+材质批量构建与 dispose 吞吐（资源生命周期成本）；(b) Object3D 属性写入路径（模拟绑定引擎 `updateProperty`：点分路径导航 + `Vector3.set`，即「状态更新→渲染延迟」的 CPU 段）；(c) 场景+灯光组装成本（schema→scene 解析下限）。

### 10.3 基线数据（2026-09-13，本机 node，仅作相对回归基线）

<!-- BENCH_BASELINE -->

基线（2026-09-13，node v25.3.0，darwin arm64，three r186，200ms/场景，median ops/s）：

| 场景                                                       | median ops/s   | 单次成本 |
| ---------------------------------------------------------- | -------------- | -------- |
| geometry-material: Box+MeshStandardMaterial 构建+dispose   | ~255,000       | ~3.9µs   |
| geometry-material: Sphere(32,16)+MeshPhong+dispose         | ~39,600        | ~25µs    |
| property-write: 位置导航+Vector3.set (position)            | ~185,000,000   | ~5.4ns   |
| property-write: 旋转 Euler.set (rotation, z 必填)          | ~57,000,000    | ~17.5ns  |
| property-write: 材质颜色 Color.set hex 串 (material.color) | ~5,400,000     | ~185ns   |
| property-write: visible 布尔直赋                           | ~2,400,000,000 | ~0.4ns   |
| scene-assembly: Scene+fog+5 灯+10 网格+清理                | ~16,600        | ~60µs    |

结论：绑定热路径（求值 + 属性写入）单次成本在 ns 量级，16ms 帧预算可容纳 10⁴–10⁵ 次属性写入——「状态更新→渲染延迟 <16ms」的 CPU 段对常规场景（<10² 绑定数）余量充足；瓶颈在 GPU 渲染帧率（10.4 挂接 e2e 后验证）。

### 10.4 浏览器侧 fps 基准挂接点

node 无 GL 上下文，GPU 帧率不可测。挂接方案：渲染器落地（I2.1）后在 `tests/e2e/` 增 perf 抽查 spec（Playwright 页面内 rAF 采样），对比本节 CPU 基线与浏览器实测，形成「绑定热路径 + 端到端帧率」两级基准。已登记为 plan 463 的 Deferred（successor: I2.1）。

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
