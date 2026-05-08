# Flux 设计原则

## 定位

本文档是 Flux 架构的纲领层文档，用于说明当前架构方向、核心设计意图和稳定原则。

规范性定义、原语合约和边界规则仍在 `docs/architecture/frontend-programming-model.md` 中；若两者在 primitive identity、core boundary 或 derived-vs-core 判断上冲突，以编程模型文档为准。

本文档的职责不是重复规范条文，而是解释这些规范背后的**当前设计意图**、约束和边界，帮助读者理解为什么 Flux 保持现在这套分层，而不是扩成别的相邻模型。

---

## 1. DSL 优先

DSL 不是给运行时喂的输入格式，而是平台的**一级制品**：一个独立可操作的结构层。在进入运行时之前，它就已经拥有自己的生命周期、变换空间和组织规则。

很多系统也有 DSL，但 DSL 只是运行时的输入格式，不存在独立的结构操作。Flux 不这样看。Flux 的 DSL 在运行时之外就已经是可编辑、可组合、可裁剪、可变换的结构层：

| 操作      | 含义                                              |
| --------- | ------------------------------------------------- |
| 编辑      | 源码位置保留、别名、编辑器元数据、round-trip 保真 |
| 合并/继承 | `x:extends` 式继承、覆写展开、片段组合            |
| 裁剪      | 权限裁剪、feature flag 裁剪、profile 组装         |
| 变换      | i18n 字符串替换、静态默认展开                     |
| 元编程    | 通过结构约定（而非运行时接口增长）表达变异        |

DSL 变换是分层的：权限裁剪、i18n 替换、默认展开各自独立运作。移除编写态元数据不得改变运行时行为。

---

## 2. 编写-执行分离

即使选择了 DSL 优先，很多系统仍然只维护一种模型，让运行时直接背负编辑态结构。Flux 刻意不这样做，而是把 Authoring Model 与 Execution Model 放在预编译边界两侧。

这条原则的重点不是“有两套模型”本身，而是承认两侧有不同的优化目标：编写态服务于理解、编辑、组合与保真；执行态服务于简化概念、降低运行时负担、稳定执行语义。

### 双向优化目标

| 维度       | 编写模型                                       | 执行模型                                           |
| ---------- | ---------------------------------------------- | -------------------------------------------------- |
| 优化目标   | 可理解性、领域表达力、编辑保真                 | 性能、内部概念统一、运行时开销最小化               |
| 结构形态   | 保留源码位置、别名、编辑器元数据、领域编辑结构 | 已组装的 Final Execution Schema，无冗余            |
| 正确性标准 | round-trip 保真、作者意图不丢失                | 行为等价、执行确定性                               |
| 可替换性   | 多种编辑器/设计器/协作引擎可产出同一 DSL       | 同一 Final Execution Schema 可在不同运行时宿主执行 |

### 边界意义

预编译边界的意义，不只是“提前做一点优化”，而是把本来不该落在运行时表面的结构问题留在结构层解决：

1. **编译期结构决策** — type 解析、renderer 绑定、默认展开在 loader 阶段完成，运行时零开销。
2. **编译期策略裁剪** — 权限节点、feature flag 分支在进入运行时之前已删除，运行时根本看不到。
3. **编译期 action DAG 组装** — `then`/`onError`/`parallel` 编译时组装为无环执行图，运行时不需要图发现或环检测。
4. **统一 Value IR** — Value 的所有形式（literal/expression/template/array/object）编译为统一 IR，运行时统一求值。

> 如果一个问题能在结构变换层解决，就绝不拖进运行时表面。

---

## 3. 响应式数据驱动

Flux 的核心执行模型是响应式的，而且是声明式的。作者不需要显式搭建命令式联动过程——只要一个动态值读取了某个路径，它就自动落入依赖图，依赖变化时被重新求值。

基本节奏：**求值 → 收集依赖 → 变更传播 → 定点重求值/失效 → 重新发布**。

依赖建立是隐式的，在求值时动态收集，不是事先静态声明。`Value`、`Resource`、`Reaction` 共享同一依赖模型，但命中后果不同：Value 重计算，Resource 标脏刷新，Reaction 可能触发 Capability。

当前实现通过 React 和 `useSyncExternalStore` 完成渲染宿主衔接，但原则本身不绑定 UI 框架。

### 读写分离

- **读**：Value / Resource 发布值 / Host Projection 快照，全部通过 ScopeRef 只读访问。
- **写**：所有作者可见的副作用（scope 写入、API 调用、导航、宿主命令）只通过 Capability 派发。
- **变化 → 效果**：数据变化不直接触发 action，中间必须经过 Reaction 或 Semantic Lifecycle Entry。

### 渲染宿主衔接

Store 层自洽运行响应式逻辑，React 只是订阅 Store 快照的渲染宿主。

- `Settled Update Turn` 是 runtime-store 概念，不是 React `useEffect` 排序概念。
- React concurrent mode 可以中断、重播、丢弃渲染；Flux 不约束这种调度行为，只定义 store 何时结算一轮更新、何时发布稳定快照。
- 渲染宿主消费的是发布后的结果，不直接持有响应式协议对象。

---

## 4. 渐进式演化

Flux 的复杂能力不应靠不断发明新 primitive 获得，而应沿着既有简单形式自然生长。这条原则同时约束两件事：

- 作者可见的 DSL 从简单形式自然扩展到复杂形式，不频繁切换心智模型。
- 运行时内部的复杂能力优先从既有原语组合出来（派生系统），而非一遇到压力就扩原语集。

### DSL 层演化：简单形式自然生长

| 概念     | 简单形式                                | →   | 复杂形式                                                                      |
| -------- | --------------------------------------- | --- | ----------------------------------------------------------------------------- |
| 值       | literal → expression → anonymous source | →   | named `data-source`（Resource）                                               |
| 动作     | 单步派发                                | →   | `when` 守卫 → `then`/`onError` 分支 → `parallel` 扇出 → 可编译为 DAG 级执行图 |
| 结构     | `visible`（显示级）                     | →   | `when`（生命周期激活） → `loop`（集合展开） → `dynamic-renderer`（远程装配）  |
| 宿主写入 | 语义命令                                | →   | 通用 patch 式 `applyPatch`                                                    |

#### 值演化

同一个属性按需求复杂度选择对应形式。消费者端读值方式不变：`${countries}` 从 literal 到 data-source 始终统一。

```jsonc
// literal
{ "options": ["draft", "published", "archived"] }

// expression
{ "options": "${role === 'admin' ? adminOptions : userOptions}" }

// source：字段级匿名请求，不发布到 scope
{ "options": {
  "type": "source",
  "action": "ajax",
  "args": { "url": "/api/countries", "params": { "region": "${form.region}" } }
}}

// data-source：命名 Resource，带生产者生命周期和调度策略
{ "type": "data-source", "name": "countries",
  "action": "ajax",
  "args": { "url": "/api/countries" },
  "interval": 3000,
  "stopWhen": "${countries.complete}" }
```

#### 动作演化

编译器将嵌套 schema 递归组装为 `CompiledActionNode` DAG（`flux-compiler/action-compiler.ts`），运行时直接遍历边执行，无需图发现或环检测。

```jsonc
// 单步派发
{ "action": "setValue", "args": { "path": "name", "value": "test" } }

// when 守卫：条件不满足时跳过，结果标记 skipped
{ "action": "setValue", "when": "${isEnabled}",
  "args": { "path": "name", "value": "test" } }

// then/onError 分支：按 ActionResult 三分类走不同路径
{ "action": "ajax", "args": { "url": "/api/users" },
  "then":     { "action": "showToast", "args": { "message": "保存成功" } },
  "onError":  { "action": "showToast", "args": { "message": "${error.message}" } } }

// parallel 扇出 + onSettled 聚合
{ "action": "parallel",
  "parallel": [
    { "action": "ajax", "args": { "url": "/api/notify/email" } },
    { "action": "ajax", "args": { "url": "/api/notify/sms" } }
  ],
  "onSettled": { "action": "showToast", "args": { "message": "通知完成" } } }

// 表单提交：submitAction 由表单节点拥有，按钮只是 component:submit 的薄触发器
{ "type": "form", "id": "profile-form",
  "submitAction": {
    "action": "ajax", "args": { "url": "/api/profile", "method": "post" } },
  "onSubmitSuccess": { "action": "closeSurface" },
  "onSubmitError":   { "action": "showToast", "args": { "message": "${error.message}" } } }
```

分支上下文（`result`/`error`/`prevResult`）在调度时自动注入求值环境（`flux-action-core/action-core.ts` `createBranchEvaluationBindings`）。

#### 结构演化

`visible` 和 `when` 不是同义词：`visible` 隐藏的字段仍参与验证；`when=false` 的子树整体不激活、不参与生命周期。

```jsonc
// visible：显示级切换，节点仍存在
{ "type": "input-text", "name": "adminCode", "visible": "${role === 'admin'}" }

// when：生命周期激活，影响存在性和子树验证
{ "type": "fragment", "when": "${showSummary}",
  "body": [{ "type": "text", "text": "摘要内容" }] }

// loop：集合展开，每次迭代获得独立的 repeated-item scope
{ "type": "loop", "items": "${users}", "itemName": "user", "indexName": "idx",
  "body": [{ "type": "text", "text": "${idx + 1}. ${user.name}" }],
  "empty": [{ "type": "text", "text": "暂无数据" }] }

// dynamic-renderer：运行时远程装配，决定渲染什么片段
// 注意：它不是第二个 Resource 面——data-source 生产命名值，dynamic-renderer 装配片段
{ "type": "dynamic-renderer",
  "loadAction": { "action": "ajax", "args": { "url": "/api/schema/${componentType}" } },
  "body": { "type": "text", "text": "Loading..." } }
```

### 运行时层演化

Promotion Test 是演化的护栏：新概念必须在跨域、不可归约、语义稳定、作者可见、非实现便利、非宿主逃逸这六条全部满足时才能升格为原语。不满足的系统仍然重要，只是不占用原语位。

#### Action Algebra

Capability（命令派发）和 Value（求值 + 依赖追踪）交替运作，组合出完整的 DAG 调度。调度循环（`flux-action-core/action-dispatcher/action-execution.ts`）：

```
dispatch(nodes) → for each node:
  1. 求 when 守卫（Value 求值）→ 跳过则标记 neutral
  2. 派发 Capability（ajax/setValue/component:*等）
  3. 三分类结果（success/failure/neutral）
  4. 注入 result/error/prevResult 绑定
  5. 按 then/onError/onSettled 分支递归 dispatch
  6. 并行扇出通过 Promise.all + 单独分支递归
```

编译器将嵌套的 schema 结构递归编译为 `CompiledActionNode` 树，运行时直接遍历边执行，无需图发现或环检测。

#### Operation Control

异步执行控制的共享基础设施——超时、重试、防抖、去重、取消。不属于 ApiSchema，不被 action 或 data-source 独占：

```
dispatch → debounce → retry → timeout → 单步执行
```

```jsonc
// action
{ "action": "ajax", "args": { "url": "/api/save" },
  "timeout": 5000, "retry": { "times": 2, "delay": 1000 } }

// data-source，同一套策略
{ "type": "data-source", "name": "users",
  "action": "ajax", "args": { "url": "/api/users" },
  "retry": { "times": 2, "delay": 0 } }
```

**FormRuntime** 组合了 Action Algebra（分支调度）、Value（验证求值）、Capability（提交动作），以及自身特有的验证模型、子树契约、字段注册等逻辑。

表单提交管道（`flux-runtime/form-runtime-submit-flow.ts`）：

```
executeFormSubmit:
  1. 防重复：正在提交或已销毁则直接返回
  2. touch 所有字段，展开验证模型
  3. 全表单验证，失败走 onValidateError
  4. 子树契约：递归提交或汇总门控协调子表单
  5. 执行 submitAction（ajax 等）
  6. 按成功/失败执行 onSubmitSuccess / onSubmitError
  7. 清理 submitting 状态
```

```jsonc
{
  "type": "form",
  "id": "order-form",
  "submitAction": { "action": "ajax", "args": { "url": "/api/orders", "method": "post" } },
  "onSubmitSuccess": { "action": "closeSurface" },
  "onSubmitError": { "action": "showToast", "args": { "message": "${error.message}" } },
  "onValidateError": { "action": "showToast", "args": { "message": "请修正表单错误" } },
}
```

按钮是 `component:submit` 的薄触发器，验证→提交→分支全部由表单节点拥有。

### 演化护栏

1. 不是所有重要的运行时系统都是原语。
2. Schema-visible Scope 承载数据，不承载命令对象。
3. Schema 产生副作用只通过 Capability。

---

## 5. 词法所有权

这条原则是原则 3 的组织约束。数据、能力、资源、反应以及运行时边车跟随词法作用域或子树边界归属，不靠全局运行时大对象。

### 三种解析机制

数据查找（ScopeRef）、行为查找（ActionScope）、实例定位（ComponentHandleRegistry）是架构上分离的三种解析机制，各有独立的作用域规则。

### 词法遮蔽

子作用域通过自然词法遮蔽覆盖父级发布，而非全局覆盖。同名绑定在不同词法作用域中可独立存在：

```jsonc
// 页面 scope 有 items
{
  "type": "page",
  "data": { "items": ["a", "b"] },
  "body": [
    // dialog 子 scope 也有 items，遮蔽父级
    {
      "type": "dialog",
      "data": { "items": ["x", "y"] },
      "body": [{ "type": "text", "text": "${items}" }],
    }, // → ["x", "y"]
  ],
}
```

### Resource 发布权

同一拥有作用域内，同一 binding target 不应被两个同时活跃的发布型生产者长期共同占有。这里约束的是 authoritative publication（Resource 的持续发布），不是普通写入：

```jsonc
// 合规：两个 form 在不同时间写入同一路径
{ "type": "dialog", "body": [
  { "type": "form", "id": "createForm",
    "onSubmitSuccess": { "action": "setValue", "args": { "path": "result", "value": "${result}" } } },
  { "type": "form", "id": "editForm",
    "onSubmitSuccess": { "action": "setValue", "args": { "path": "result", "value": "${result}" } } }
]}

// 违规：两个 data-source 同时宣称负责发布 "status"
{ "type": "page", "body": [
  { "type": "data-source", "name": "status", "action": "ajax", "args": { "url": "/api/a" } },
  { "type": "data-source", "name": "status", "action": "ajax", "args": { "url": "/api/b" } }
]}
```

运行时边车（Resource 状态、Reaction 状态、缓存、诊断）跟随词法所有权，但不得成为挂载在 ScopeRef 上的方法或可变协议对象。Scope 承载数据环境，不承载 bridge、controller、handle 或其他命令型对象。

---

## 6. 领域隔离与抽象

Flux 核心维持一个小的、稳定的抽象层。它的目标不是吞掉所有前端领域语义，而是提供一个足够稳的执行内核，让不同领域可以在核心之外成长。

这条原则的判断标准不是“核心能不能直接描述所有复杂系统”，而是“核心能不能为复杂系统提供稳定嵌入面，而不把领域复杂度反向灌回核心词汇”。

### 隔离契约

领域系统（Flow Designer、Report Designer、Spreadsheet Editor、协作引擎、CRDT/OT 等）与 Flux 核心的交互被收敛为：

| 方向              | 机制                    | 含义                                                          |
| ----------------- | ----------------------- | ------------------------------------------------------------- |
| 核心 → 领域（读） | Host Projection         | 只读快照投影，宿主驱动刷新                                    |
| 领域 → 核心（写） | Capability              | 命名空间化的命令派发（如 `designer:*`）                       |
| 实例定位          | ComponentHandleRegistry | 显式目标组件实例方法调用                                      |
| 宿主私有          | DomainBridge            | `getSnapshot/subscribe/dispatch`，不进入 Schema-visible Scope |

### 核心保持稳定的理由

- 图算法、布局、碰撞检测、协作协议、CRDT/OT、local-first 同步、手势循环——这些都是重要的，但它们是**领域系统**，不应成为核心原语。它们在 Flux 看来只是 Resource 背后的生产策略、Host Projection 背后的宿主快照、或 Capability 背后的命令系统。
- 新域通过声明宿主类型 + 投影字段 + 能力命名空间接入，无需引入新的全局 provider 族、环境注册表或新的 schema 权威通道。
- 可编辑宿主的跨域通用写入模式：读 Host Projection → 写 Capability（结构化 patch DTO）→ DomainBridge 宿主私有。

### 业务语义归属

业务管道（表单提交、对话框确认、页面进入）属于拥有该生命周期边界的**节点**，而非 UI 触发器。具体示例见第4节 Semantic Lifecycle Entry。这是词法所有权和领域隔离在具体模式上的体现。

---

## 汇总

| #   | 原则           | 一句话                                                                                   |
| --- | -------------- | ---------------------------------------------------------------------------------------- |
| 1   | DSL 优先       | DSL 是独立于运行时的一等结构层，先可编辑、可组合、可变换，再进入执行期。                 |
| 2   | 编写-执行分离  | 编写态与执行态服务不同优化目标，二者应由预编译边界分层，而不是由运行时混同承担。         |
| 3   | 响应式数据驱动 | 运行时以动态求值、依赖追踪和定点失效为核心，读写分离，副作用收敛到 Capability。          |
| 4   | 渐进式演化     | 复杂度应从简单 DSL 形式和既有原语自然生长，而不是通过膨胀 primitive 集合获得。           |
| 5   | 词法所有权     | 数据、能力、资源、反应及其 sidecar 跟随词法/子树边界归属，而不是泄漏到全局运行时大对象。 |
| 6   | 领域隔离与抽象 | 核心提供小而稳的执行内核，领域复杂度留在核心之外，通过窄契约嵌入。                       |

---

## 规范关系

- 本文档是 governing principles，不是普通派生参考。
- `docs/architecture/frontend-programming-model.md` 保持 top-level normative precedence。
- 其他 architecture 文档可在各自专题内拥有 local precedence，但都应与本文档的方向保持一致。

## 源文档

所有规范性定义、原语合约、边界规则和硬性不变量位于：

- `docs/architecture/frontend-programming-model.md`

本文档解释方向，不覆盖规范优先级。
