# 下一代低代码框架吸引子发现分析

> **日期**: 2026-04-28
> **方法**: 使用 `next-gen-lowcode-attractor-discovery-prompt.md` 方法论
> **定位**: 不是让 AI 发明新架构，而是暴露旧吸引子前提、枚举替代切分、比较主流盆地、输出可验证的新吸引子候选

---

## 1. 当前吸引子识别

当前低代码框架领域（含 AMIS、Formily、React Hook Form、JSON Schema Form、Appsmith、Retool、NocoBase 以及当前 Flux）真正依赖的 **5 个核心结构假设**：

### 假设 1：Schema = 页面/表单树 = 状态拥有者

主流框架默认"谁渲染谁拥有"。组件树节点既是视图结构又是数据边界。Formily 的 `Field`/`ArrayField`、AMIS 的 `form`/`crud`、甚至当前 Flux 的 `FormRuntime` 都在不同程度上继承了"渲染器即数据宿主"的假设。

**来源**：React/Vue 组件模型 → 组件树 = 生命周期单元 → 自然延伸为状态单元。这是主流盆地中最深的假设。

### 假设 2：Action = 可执行步骤图

从 AMIS 的 `onEvent` + action 链，到 Formily 的 `x-reactions`，到 BPMN/action graph，到 Retool 的 query chain——所有框架都将"动作"建模为作者手写的执行步骤序列。区别仅在于声明式程度。

**来源**：命令式编程模型的直觉映射 + BPMN 工作流范式。

### 假设 3：宿主能力 = 注入的上下文/服务/句柄

所有框架都将宿主提供的能力（HTTP、路由、通知、权限）作为某种可注入对象暴露给 schema：AMIS 用 `env`，Formily 用 `createForm` 参数，Appsmith 用全局 `appsmith` 对象，Flux 用 `RendererEnv` + `Capability`。

**来源**：依赖注入 / Service Locator 模式。

### 假设 4：数据域 = 作用域对象（合并读）

当前 Flux 用 `ScopeRef` 词法链，AMIS 用合并的 data scope，Formily 用 Mobx Observable — 都假设"读取数据"等于"访问一个合并后的作用域对象"。

**来源**：JavaScript 作用域链 / 词法环境模型。

### ~~假设 5~~：已移除

原假设 5（"编译层不做语义提升"）经分析后撤销。Flux 的编译层已实现完整的 schema → IR 编译流水线（表达式编译、值树编译、action 控制流 IR、reaction 编译、validation field graph），在当前框架领域属于最强水平。GoalContract/语义提升提案已被否决（见第 5 节 intent 层分析），因此"编译层不够"不再构成结构性缺口。

---

## 2. 混合概念清单

### 混合组 1：视图结构 × 数据所有权

- **现象**：`form` 既是 UI 容器又是数据域 owner；`table` 既是展示组件又是行级 scope 的创建者
- **代价**：组件复用时必须携带数据语义；dialog 里的 form 和 page 里的 form 拥有不同但隐含的所有权规则；surface-owner 和 data-domain-owner 需要专门文档才能区分
- **在 Flux 中的体现**：`FormRuntime`、`SurfaceRuntime`、`DataDomainOwner` 已经做了区分，但渲染器实现中仍然纠缠

### 混合组 2：动作触发 × 执行编排

- **现象**：用户点击按钮（语义意图）与执行什么步骤图（技术编排）绑定在同一个 `action` 声明里
- **代价**：局部修改影响全局（修改步骤顺序可能改变语义）；AI 难以理解和生成（不知道意图是什么，只能模仿步骤模式）；无法解释"为什么产生了这个结果"
- **在 Flux 中的体现**：`event → action + args` 模型比 AMIS 好得多，但 action 仍然是作者写的执行序列

### 混合组 3：数据读取 × 能力调用

- **现象**：scope 里混有纯数据和可执行能力（HTTP client、router、notification）；同一个 scope lookup 既能读到用户名也能发请求
- **代价**：语义污染、测试困难、安全性边界模糊、AI 生成 schema 时无法区分哪些是安全的
- **在 Flux 中的体现**：已通过 `ScopeRef`（只读数据）vs `Capability`（唯二副作用出口）vs `Host Projection`（只读投影）三分解决，这是 Flux 相对主流盆地最大的结构性优势

### 混合组 4：本地编辑 × 运行时状态变更

- **现象**：表单编辑（draft）、API 提交（publish）、异步刷新（stale/refresh）共享同一套状态通道
- **代价**：离线/草稿/冲突合并/审计回放全部需要特殊处理；无法区分"用户正在编辑"和"系统正在同步"
- **在 Flux 中的体现**：`DataDomainOwner` 的 publish policy (seed-on-open / sync-when-clean / live-write-through) 已经开始区分，但草稿/提交/回滚的原子事务语义尚未硬化

### 混合组 5：权限校验 × 能力访问

- **现象**：能否执行一个操作 = 能否访问一个 action 对象；权限分散在 `xui:roles`（AMIS）、`Capability` 可见性、后端校验等多个层面
- **代价**：前端权限控制是"藏按钮"而非"证明授权"；审计时无法回答"这个操作为什么被允许"
- **在 Flux 中的体现**：权限通过角色过滤和 capability 可见性控制，但没有可验证的授权证明链

---

## 3. 替代切分矩阵

### 方案 A：强化 Schema Tree（当前 Flux 路线）

- **概念中心**：7 原语（Template, ScopeRef, Value, Resource, Reaction, Capability, Host Projection）+ Owner 组织基底 + 编译一次执行多次
- **保留**：所有当前 Flux 设计——词法作用域、Capability 唯一出口、编译期值树、Action 代数派生系统
- **放弃**：不需要新的核心原语；owner 继续作为组织基底而非第 8 原语
- **复杂度迁移**：所有新能力必须通过派生运行时系统（FormRuntime, Action Algebra, Validation Owner 等）吸收，而不是修改核心原语集
- **判断**：这是当前最稳健的路线，但它的天花板受限于"作者仍写 action 步骤"这一假设

### 方案 B：Execution Package + 确定性事务内核

- **概念中心**：运行时只接受 Execution Package（编译产物）；所有写操作进入确定性事务流水线；Owner 作为事务的组织单位
- **保留**：7 原语闭合性、编译一次、Capability 单出口、宿主投影
- **放弃**：运行时动态 schema 组装；Action 作为独立用户可见概念（action 降级为 commit generator）
- **复杂度迁移**：编译器承担更多责任（生成 Execution Package 而非 CompiledValueNode）；事务内核成为新的性能瓶颈点；宿主协议变窄变严格
- **判断**：这是 experiments/next-gen-low-code-framework-final 的路线，技术上合理但工程量巨大

### 方案 C：Commit-Oriented Kernel（COLK）

- **概念中心**：最小执行对象是 Commit Unit；任何交互/AI/自动化/外部事件只能提出 commit unit；action 降级为 commit generator，页面降级为 commit 入口
- **保留**：写操作的原子性、可审计性、可回放性
- **放弃**：直接 action 执行模型；传统的"用户交互 → 步骤执行"心智模型
- **复杂度迁移**：每一个现在简单的 `onClick → api call` 都要被包装为 commit unit；学习曲线急剧上升；简单场景过度工程化
- **判断**：commit 语义适合复杂企业场景，但对表单提交这类 80% 用例是过度抽象

### 方案 D：Goal-Proved Effect Fabric（nop-next 路线）

- **概念中心**：6 概念（Cell, Projection, Intent, Goal, Proof, Effect Request）；作者写 Goal（后置条件合约），不写步骤图；宿主能力通过 Proof 约束的 Effect Request 访问
- **保留**：数据/视图分离、意图与执行分离、可验证授权
- **放弃**：action 步骤图作为作者概念；传统 service locator 模式；scope 作为合并读对象
- **复杂度迁移**：需要 Goal Binder、Proof 基础设施、Effect Request/Receipt 协议；整个编程范式改变
- **判断**：v12 self-audit 已经指出——大部分概念在 Flux 中已有对应物（Intent ≈ event，Goal ≈ compiled action plan，Proof ≈ capability + host gate），新术语的价值需要逐个验证

---

## 4. 主流盆地回流检测

| 方案 | 是否回流 | 回流到哪个盆地 | 为什么 |
|------|---------|--------------|--------|
| **A: 强化 Schema Tree** | **是，但有限** | Flux 当前路线 + Formily 编译层 | 本质是 Formily/AMIS 的编译强化版；没有改变"作者写 action 步骤"的核心假设 |
| **B: Execution Package** | **部分** | React Server Components 的"编译产物不可变"路径 + Formily 的 compiled form | 将编译提前到运行时之前是对的，但 Execution Package 本身不改变 schema 的语义表达力 |
| **C: COLK** | **有风险** | Event Sourcing / CQRS 盆地 | Commit Unit + Journal + Projection 是经典事件溯源模式的前端移植；如果执行不当，会回流到 Redux action → reducer 的老路 |
| **D: Goal-Proved Effect Fabric** | **最远离** | 如果成功：新盆地；如果失败：回落到 B+权限框架 | 6 个概念中 Goal 和 Proof 是真正新的；但如果 Goal Binder 退化为 hardcoded step map，就回流到 B；如果 Proof 退化为角色检查，就回流到 AMIS 的 `xui:roles` |

---

## 5. Intent 层分析：是否需要在 JSON 中增加间接层

### 初始假设

曾考虑在 JSON schema 中引入 `intent` 层，让按钮等交互元素引用意图而非直接引用 action：

```json
{
  "type": "button",
  "label": "提交",
  "onClick": {
    "intent": "order.submit",
    "requires": ["form.valid"],
    "onSatisfied": { "action": "closeDialog" }
  }
}
```

### 验证结果：intent 层不必要

经过分析，`action: "app:approveExpense"` **已经就是 intent**。一个带命名空间的 action 名字本身就是意图的标识符。额外的 intent 映射表只是多了一层查表：

```json
// 多余的间接层
{
  "intent": "expense.approve",
  "args": { ... }
}
// 再配一个映射
{
  "intents": {
    "expense.approve": {
      "action": "app:approveExpense",
      "args": { ... }
    }
  }
}
```

### 为什么不需要

1. **ActionScope + xui:imports 已经覆盖**：不同 scope 注册同名 action 的不同实现，这本身就是"同一意图根据上下文映射到不同执行路径"
2. **`requires: ["form.valid"]` 不是编译器的事**：验证逻辑是应用层关注点，编译器不应该自动插入验证步骤。如果需要，作者可以显式写 `action: "validate"` → `then: { action: "submit" }`，或者用一个组合 action `action: "app:validateAndSubmit"`
3. **"编译器自动编排"本质是宏展开**：不值得为此发明新语法

### 结论

不需要在 JSON 中增加 intent 间接层。当前 `action: "namespace:actionName"` + ActionScope 的词法查找 + xui:imports 动态加载已经覆盖了意图分发的需求。

但有一个**实用的作者面改进**值得考虑：**JSON 级别的 action 链复用**。当前 action 链只能内联写在每个交互元素上，如果多个按钮复用同一个 action 链，需要在 JSON 中重复。可以考虑在 schema 顶层增加 action 定义区：

```json
{
  "definitions": {
    "actions": {
      "submitOrder": {
        "action": "validate",
        "then": {
          "action": "app:submitOrder",
          "then": { "action": "closeDialog" }
        }
      }
    }
  },
  "body": {
    "type": "button",
    "label": "提交",
    "onClick": { "action": "submitOrder" }
  }
}
```

这不是新概念，而是**JSON 级别的宏/复用机制**，与编译器的 `CompiledValueNode` 无关，纯粹是 schema 层的便利性改进。

---

## 6. 真正的缺口分析

### 缺口 1：写路径碎片化

当前 Flux 的写操作分散在多个通道：

```
用户编辑字段  → scope.setValue()
表单提交      → owner.publish()
异步数据返回  → resource.settle()
副作用写入    → reaction effect → scope.setValue()
宿主回调      → capability → scope.setValue()
```

当它们并发时，谁赢取决于事件循环的微任务排序，**不确定**。没有其他框架解决这个问题——AMIS 直接覆盖，Formily 靠 Mobx 的原子更新顺序（但不可控），Appsmith 根本不做冲突处理。

### 缺口 2：操作不可解释

执行一个 action 后，无法回答"这个表单字段为什么会变成这个值？"。可能是用户编辑、resource 刷新、reaction 联动、宿主回调。没有结构化的因果记录。

这不是 log 能解决的——log 是非结构化的文本。需要的是：每个写操作携带 source tag，scope 的每个字段能追溯到最近的写入者。

### 缺口 3：大型对象的草稿/提交生命周期

用户编辑 `details.items[2].name` → 修改直接反映在 scope 上。如果用户中途放弃编辑，需要手动还原整个对象树。Formily 和 AMIS 都不做 draft fork。

---

## 7. 具体加固方案

### 加固 1：WriteOrigin 标记

给每个写操作加 source 标记：

```typescript
scope.setValue("name", "张三", { origin: "user-edit", path: "form.name" });
scope.setValue("name", "张三", { origin: "resource:users/123", path: "form.name" });

scope.getOrigin("name") // → { origin: "resource:users/123", timestamp: ..., seq: 42 }
```

不是新概念，是现有 `setValue` 的参数扩展。让调试器能回答"谁改了这个值"。

### 加固 2：Draft Scope Fork

给需要草稿语义的 owner 加 fork 机制：

```json
{
  "type": "form",
  "draft": true,
  "data": { "url": "query://users/123" }
}
```

运行时行为：
1. resource 加载数据到 base scope
2. 创建 draft scope（fork from base）
3. 用户编辑写入 draft scope
4. base scope 不变（外部刷新更新 base）
5. save → `draft.mergeTo(base)`
6. cancel → `draft.discard()`

```typescript
owner.forkDraft();       // 创建草稿
owner.commitDraft();     // 提交草稿
owner.discardDraft();    // 丢弃草稿
owner.getConflict();     // 检查 base 是否在编辑期间被外部更新
```

JSON 配置中只需要 `"draft": true`，其余是运行时内部行为。

### 加固 3：Action Trace

action 执行的结构化记录：

```json
{
  "type": "button",
  "label": "提交",
  "onClick": {
    "action": "app:submitOrder",
    "args": { "orderId": "$form.id" },
    "trace": true
  }
}
```

当 `trace: true` 时，action 执行器自动记录：

```typescript
{
  actionName: "app:submitOrder",
  args: { orderId: "ORD-001" },
  origin: "user-click",
  startTime: 1746000000000,
  endTime: 1746000000230,
  result: "success",
  writes: [
    { path: "form.status", value: "submitted", origin: "action:app:submitOrder" },
    { path: "form.submittedAt", value: "2026-04-28T...", origin: "action:app:submitOrder" }
  ],
  capabilityCalls: [
    { capability: "fetcher", args: { url: "mutation://..." }, result: {...} }
  ]
}
```

调试器和 AI 诊断工具直接消费这个结构。不需要新原语，只需要 action 执行器在 `trace: true` 时收集这些信息。

---

## 8. 收敛验证计划

### 验证切片 1：WriteOrigin 在并发写场景下的可用性

- **方法**：构造"用户编辑 + resource 刷新 + reaction 联动"三路并发写同一字段的场景
- **通过标准**：`scope.getOrigin()` 能正确返回最后写入者的信息；调试器 UI 能展示写入历史时间线

### 验证切片 2：Draft Fork 在大型对象编辑中的正确性

- **方法**：编辑一个包含嵌套数组的表单，中途触发外部 resource 刷新，然后取消编辑
- **通过标准**：取消后 base scope 恢复到外部刷新后的状态（不是编辑前的状态）；draft 期间 base 的外部刷新不会丢失

### 验证切片 3：Action Trace 在复杂 action 链中的完整性

- **方法**：执行一个包含 validate → submit → closeDialog 的 action 链，验证 trace 记录是否包含完整的写操作和 capability 调用链
- **通过标准**：trace 记录能完整重建 action 执行后的所有状态变更

### 验证切片 4：Action 定义复用的作者面体验

- **方法**：用 JSON-level action 定义写一个包含 3 个按钮（都复用同一 action 链）的页面，对比直接内联的写法
- **通过标准**：复用版本的 JSON 行数 < 内联版本的 60%；AI 能正确生成和使用 action 定义

---

## 9. 结论

### 最终立场

不做全盘推翻，不做 COLK/Goal-Proved 的激进重构。不需要 intent 间接层。在当前 Flux 7 原语 + Final Execution Schema + Owner 组织基底的架构基础上，通过三项加固突破主流盆地的天花板：

| 加固点 | 其他框架状态 | Flux 做完后 |
|--------|------------|------------|
| 写操作可追溯（WriteOrigin） | 没人做 | 每个 scope 字段能查到"谁写的" |
| 草稿/提交生命周期（Draft Fork） | 没人做 | `draft: true` 一行配置开启 fork |
| Action 执行可解释（Action Trace） | 没人做 | `trace: true` 产出结构化因果记录 |

三项都是现有机制的参数/配置扩展，不需要新原语、不需要新术语、不需要改变作者的心智模型。合在一起让 Flux 成为**唯一一个能回答"这个状态为什么变成这样"的低代码框架**。

### 可选的作者面改进

JSON 级别的 action 链定义复用（`definitions.actions`）是实用改进，但优先级低于上述三项加固。可以在加固完成后作为 schema 便利性特性加入。

### 必须废弃的旧吸引子

**"Action = 作者手写的可执行步骤图"** 不需要被废弃——它仍然是最自然的作者面模型。但通过 Action Trace，我们让每条 action 链变得可解释。通过 ActionScope 的词法查找，同名 action 可以在不同上下文有不同实现。这两者合在一起，已经覆盖了 intent 层想要解决的问题，且不需要引入新概念。
