# Flux 设计原则

## 定位

本文档从 `docs/architecture/frontend-programming-model.md` 中提炼 Flux 的核心设计原则。

规范性定义、原语合约和边界规则仍在编程模型文档中；本文档解释其背后的**设计意图**。

---

## 1. DSL 优先

DSL 不是给运行时喂的输入格式，而是平台的**一级制品**——一个独立可操作的结构层，在运行时执行之前就拥有完整的生命周期。

很多系统也有 DSL，但 DSL 只是运行时的输入格式，不存在独立的结构操作。Flux 的 DSL 是独立于运行时存在的结构层，拥有自己的操作族：

| 操作 | 含义 |
|------|------|
| 编辑 | 源码位置保留、别名、编辑器元数据、round-trip 保真 |
| 合并/继承 | `x:extends` 式继承、覆写展开、片段组合 |
| 裁剪 | 权限裁剪、feature flag 裁剪、profile 组装 |
| 变换 | i18n 字符串替换、静态默认展开 |
| 元编程 | 通过结构约定（而非运行时接口增长）表达变异 |

### 要点

- DSL 是可组合的：继承、覆写、片段引用组合出最终结构。
- DSL 变换是分层的：权限裁剪、i18n 替换、默认展开各自独立运作。
- DSL 与运行时解耦：移除编写态元数据不得改变运行时行为。
- DSL 复杂度通过扩展已有的简单形式来增长，而非替换基线心智模型。

---

## 2. 编写-执行分离

即使选择了 DSL 优先，很多系统仍然只维护一种模型——运行时直接处理编辑态结构。Flux 刻意将 Authoring Model 与 Execution Model 分离为两个有不同优化目标的独立模型。

这是一个**双向最优化边界**：两侧有根本不同的评价标准，预编译边界使得 Flux 有可能实现比手写 React 应用更优的性能。

### 双向优化目标

| 维度 | 编写模型 | 执行模型 |
|------|---------|---------|
| 优化目标 | 可理解性、领域表达力、编辑保真 | 性能、内部概念统一、运行时开销最小化 |
| 结构形态 | 保留源码位置、别名、编辑器元数据、领域编辑结构 | 已组装的 Final Execution Schema，无冗余 |
| 正确性标准 | round-trip 保真、作者意图不丢失 | 行为等价、执行确定性 |
| 可替换性 | 多种编辑器/设计器/协作引擎可产出同一 DSL | 同一 Final Execution Schema 可在不同运行时宿主执行 |

### 预编译性能优势

传统 React 应用的运行时开销来自 JSX 运行时解析、hook 链式调度、context 传播、reconciler diff。Flux 预编译消除或降低这些开销：

1. **编译期结构决策** — type 解析、renderer 绑定、默认展开在 loader 阶段完成，运行时零开销。
2. **编译期策略裁剪** — 权限节点、feature flag 分支在进入运行时之前已删除，运行时根本看不到。
3. **编译期 action DAG 组装** — `then`/`onError`/`parallel` 编译时组装为无环执行图，运行时不需要图发现或环检测。
4. **统一 Value IR** — Value 的所有形式（literal/expression/template/array/object）编译为统一 IR，运行时统一求值。

> 如果一个问题能在结构变换层解决，就绝不拖进运行时表面。

---

## 3. 响应式数据驱动

Flux 的核心执行模型是响应式的：表达式求值、依赖追踪、定点失效。但它选择通过 React 的 pull 模式而非 Vue 的 push 模式来实现渲染层衔接。

### 响应式模型对比

| | Vue 模式 | Flux 模式 |
|--|---------|----------|
| 响应机制 | Proxy 劫持 getter/setter，push 通知 | 运行时动态求值收集 Dependency Set，pull 式定点重求值 |
| 订阅粒度 | 属性级自动追踪 | 表达式级 Dependency Set + changedPaths |
| 渲染触发 | 细粒度 DOM 更新 | Store 通知 → `useSyncExternalStore` → React reconciliation |
| 数据所有权 | 响应式侵入数据对象本身 | 响应式在 Store 层，数据保持 plain value |

### 读写分离与效果收敛

响应式模型中，读写严格分离，所有副作用收敛到单一通道：

- **读**：Value / Resource 发布值 / Host Projection 快照 → 全部通过 ScopeRef 只读访问。
- **写**：所有作者可见的副作用（scope 写入、API 调用、导航、宿主命令）只通过 Capability 派发。
- **依赖变化 → 效果**：数据变化不直接触发任意 action，中间必须经过 Reaction（值变化 → 效果派发）或 Semantic Lifecycle Entry（语义生命周期入口）。

这意味着：
- 依赖追踪是顶级执行规则，不是实现提示。Value / Resource / Reaction 共享同一依赖模型，但后果不同（重计算 / 标脏刷新 / 可能触发 Capability）。
- Store 层自洽运行响应式逻辑，React 只是渲染宿主订阅 Store 快照。
- `Settled Update Turn` 是 runtime-store 概念，不是 React `useEffect` 排序概念。
- React 的 concurrent mode 不得重定义 Flux 认为的当前轮次的已发布值集合。

---

## 4. 渐进式演化

Flux 的核心只包含 7 个 Primitive Category（Base Tree, ScopeRef, Value, Resource, Reaction, Capability, Host Projection），这个集合是闭合的。系统的复杂能力通过两个层面的渐进演化获得，而非通过膨胀原语集。

### DSL 层演化：简单形式自然生长

当一个简单需求已有自然的简单 DSL 形式时，后续复杂度应扩展该形式，而非替换为不同的基线心智模型。

| 概念 | 简单形式 | → | 复杂形式 |
|------|---------|---|---------|
| 值 | literal → expression → anonymous source | → | named `data-source`（Resource） |
| 动作 | 单步派发 | → | `when` 守卫 → `then`/`onError` 分支 → `parallel` 扇出 → 显式 DAG |
| 结构 | `visible`（显示级） | → | `when`（生命周期激活） → `loop`（集合展开） → `dynamic-renderer`（远程装配） |
| 宿主写入 | 语义命令 | → | 通用 patch 式 `applyPatch` |

### 运行时层演化：派生系统组合原语

复杂的运行时能力不是通过增加原语获得的，而是通过从已有原语组合派生系统获得。Promotion Test 是演化的护栏：新概念必须在跨域、不可归约、语义稳定、作者可见、非实现便利、非宿主逃逸这六条全部满足时才能升格为原语。

| 派生系统 | 从哪些原语派生 | 解决什么问题 |
|---------|-------------|------------|
| Action Algebra | Capability + Value | 效果编排：when/then/onError/parallel 组合为编译期组装的 DAG，实现顺序、分支、聚合、超时、重试等控制流 |
| Operation Control | Capability + Resource | 共享执行控制：超时、取消、节流、防抖、去重、重试、并发策略——不属于 ApiSchema，不被任何单一消费者独占 |
| Semantic Lifecycle Entry | Base Tree + ScopeRef + Value + Capability + Reaction | 节点拥有的业务管道：表单提交、对话框确认、页面进入等语义操作由生命周期节点拥有，而非 UI 触发器 |
| FormRuntime / PageRuntime | 全部原语 | 领域特定运行时：表单验证-提交管道、页面生命周期等 |

这些系统在实现上可能非常重要，但它们是**派生的**，不自动升格为 Primitive Category。

### 演化护栏

三条排除规则确保演化不越界：

1. 不是所有重要的运行时系统都是原语。
2. Schema-visible Scope 承载数据，不承载命令对象。
3. Schema 产生副作用只通过 Capability。

### 要点

- Value 提升为命名 Resource 只是增加了生产者生命周期和命名语义，消费者端读值的方式不变。
- Action DAG 在编译时从 schema 结构组装，作者端仍使用嵌套的 `then`/`onError`/`parallel` 结构，而非手写运行时指针图。
- `visible` 和 `when` 不是同义词：`visible` 是显示级状态；`when` 影响激活、存在性和生命周期参与。
- `dynamic-renderer` 不是第二个 Resource 面，而是受控的运行时装配边界——它决定渲染什么片段，而 `data-source` 决定如何生产一个命名值。

---

## 5. 词法所有权

ScopeRef、ActionScope、Resource、Reaction 的所有权跟随词法/子树边界，而非全局注册表。Flux 刻意避免"一个巨大可变状态对象树"的反模式。

### 要点

- 数据查找（ScopeRef）、行为查找（ActionScope）、实例定位（ComponentHandleRegistry）是架构上分离的三种解析机制。
- 子作用域通过自然词法遮蔽覆盖父级发布，而非全局覆盖。
- Resource 绑定目标按词法所有权确定作用域，不按全局确定；同一绑定路径在不同词法作用域中可独立存在，同一拥有作用域内重复则无效。
- 同一拥有作用域内，同一绑定目标只应有一个活跃发布者；多个活跃发布者是架构无效的。
- 运行时边车（Resource 状态、Reaction 状态、缓存、诊断）跟随词法所有权，但不得成为挂载在 ScopeRef 上的方法或可变协议对象。

---

## 6. 领域隔离与抽象

Flux 核心维持一个小的、稳定的抽象层。领域复杂度在核心之外增长，通过窄契约与核心交互。新领域的加入不应扩展核心词汇。

### 隔离契约

领域系统（Flow Designer、Report Designer、Spreadsheet Editor、协作引擎、CRDT/OT 等）与 Flux 核心的交互被收敛为：

| 方向 | 机制 | 含义 |
|------|------|------|
| 核心 → 领域（读） | Host Projection | 只读快照投影，宿主驱动刷新 |
| 领域 → 核心（写） | Capability | 命名空间化的命令派发（如 `designer:*`） |
| 实例定位 | ComponentHandleRegistry | 显式目标组件实例方法调用 |
| 宿主私有 | DomainBridge | `getSnapshot/subscribe/dispatch`，不进入 Schema-visible Scope |

### 核心保持稳定的理由

- 图算法、布局、碰撞检测、协作协议、CRDT/OT、local-first 同步、手势循环——这些都是重要的，但它们是**领域系统**，不应成为核心原语。它们在 Flux 看来只是 Resource 背后的生产策略、Host Projection 背后的宿主快照、或 Capability 背后的命令系统。
- 新域通过声明宿主类型 + 投影字段 + 能力命名空间接入，无需引入新的全局 provider 族、环境注册表或新的 schema 权威通道。
- 可编辑宿主的跨域通用写入模式：读 Host Projection → 写 Capability（结构化 patch DTO）→ DomainBridge 宿主私有。

### 业务语义归属

业务管道（表单提交、对话框确认、页面进入）属于拥有该生命周期边界的**节点**，而非每个 UI 触发器。提交按钮只是 `component:submit` 的薄触发器，验证→提交→成功/失败分支全部由表单节点拥有。这是词法所有权和领域隔离在具体模式上的体现。

---

## 汇总

| # | 原则 | 一句话 |
|---|------|--------|
| 1 | DSL 优先 | DSL 是独立于运行时可操作的结构层，拥有编辑、合并、裁剪、变换、元编程操作族。 |
| 2 | 编写-执行分离 | 双向最优化边界；编写态追求可理解性，执行态追求性能，预编译将结构决策在运行时之前完成。 |
| 3 | 响应式数据驱动 | 运行时动态依赖收集驱动定点失效，读写分离，所有副作用收敛到 Capability 单一通道，React pull 模式实现。 |
| 4 | 渐进式演化 | 7 原语闭合，DSL 层简单形式自然生长，运行时层通过派生系统组合原语获得复杂能力，Promotion Test 为演化护栏。 |
| 5 | 词法所有权 | 作用域、能力、资源、反应跟随词法/子树边界，而非全局注册表。 |
| 6 | 领域隔离与抽象 | 核心维持小而稳定的抽象层；领域复杂度在核心之外增长，通过投影+命令窄契约交互。 |

---

## 源文档

所有规范性定义、原语合约、边界规则和硬性不变量位于：

- `docs/architecture/frontend-programming-model.md`

本文档是派生参考，不是规范性覆盖。
