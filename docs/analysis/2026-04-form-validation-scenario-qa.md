# Form Validation 场景问答与缺口判断

## Purpose

本文专门回答当前 validation 设计在复杂场景下的取舍问题。

目标不是重复 `docs/architecture/form-validation.md`，而是针对容易产生误判的具体场景，给出更明确的工程结论：

1. 哪些问题是当前正式设计已经覆盖的
2. 哪些问题是草案里提到但现行两份文档还没有写清楚的
3. 哪些能力应该进入 architecture baseline
4. 哪些细节更适合进入 reference / plan / implementation notes

注：本文中的部分“缺口”在后续文档收敛中已经被吸收进正式文档或 reference 文档。保留这些段落是为了记录判断过程与设计取舍，而不表示它们在当前状态下仍然全部缺失。

---

## 1. 先回答“草案里有、现行两份文档里没有”的内容

### 1.1 执行流程缺少步骤细节

结论：这个缺口最初是真实存在的，但后来已经补到了 reference 文档中。

当前状态：

1. `docs/architecture/form-validation.md` 保留 7 步主骨架
2. `docs/references/form-validation-execution-details.md` 已补每一步的展开解释

因此这部分现在主要是落点判断记录，而不是当前 blocker。

我仍然认为最合适的落点是：

1. `docs/architecture/form-validation.md` 保留 7 步主骨架
2. `docs/references/form-validation-execution-details.md` 承接每一步的展开细节
3. 如果某一步实现顺序仍会变化，则再放到 plan 文档，而不是写死进 architecture

当前已补入 details 的内容：

1. Step 1: prepare participation
2. Step 2: impacted closure 的来源类别
3. Step 3: 各 reason 的 target expansion 深度
4. Step 4-7: materialization / sync / async / publish 的实际职责边界

### 1.2 结构变化的副作用清理没有列出

结论：这个缺口最初也是真实存在的，后来已经补到了 details/reference 文档。

当前状态：

1. details 文档已有 variant switch / repeated row structural cleanup 的典型模式
2. architecture 仍然只保留原则层面的两层 cleanup 规则

这说明落点选择是对的：

1. 原则留在 architecture
2. 典型序列留在 reference

当前已补到 details 的内容：

1. variant switch 的清理序列
2. inactive branch 的 error / cache / async run 清理
3. array row 增删重排后的状态迁移原则
4. remap 后为何需要 `applyChangesAndRevalidate(..., reason: 'system')`

适合保留在 architecture 的只需要是原则：

1. structural cleanup 有“突变时立即清理”和“每次 run 幂等刷新”两层
2. inactive path 不能继续参与 validation state

### 1.3 `CompiledRuleTemplate.args` 类型回退

结论：这是一个真正的文档问题，而且现在已经修回正式 architecture 文档。

原先有问题的写法：

```ts
args: Record<string, CompiledRuntimeValue<unknown> | unknown>
```

这个类型在 TypeScript 语义上退化得太厉害，无法清楚表达“这是已经编译过的 runtime value”。

修正后的写法是：

```ts
args: Record<string, CompiledRuntimeValue<unknown>>
```

静态值本来就可以通过 `CompiledRuntimeValue` 的 static 分支表达，不需要再加 `| unknown`。

所以这一点不只是“草案细节”，而且已经回补到正式基线。

### 1.4 Phase 1 的 `effectiveRequired` 懒惰行为未记录

结论：这是 Phase 1 实施约束，不应写成长期 architecture baseline，但应写到 implementation plan 或 phase notes。

更准确地说：

1. “最终设计”不应承诺 `effectiveRequired` 必须懒惰
2. 但“第一阶段实现”如果确实采用懒惰刷新，就必须在计划文档或阶段说明中写清楚

最合适的落点：

1. 若保留 `Implementation Phases` 在 architecture 文档中，可在 Phase 1 下加一句实现约束说明
2. 更好的方式是单独有 plan 文档记录 Phase 1 的临时行为与退出条件

### 1.5 复杂场景最好用短配置示例解释，而不是发明新的 validation 专属 DSL

结论：应该补短配置示例，但不应该要求作者额外声明 `validationScope.id`、`validationScope.kind` 这类啰嗦配置。

更合理的方向是：

1. validation 默认挂接在已有 data/value owner 上
2. `form`、draft editor、detail editor 等已有 owner 构造自然决定 validation owner
3. `filter`、linked lookup、wizard 等复杂场景用短配置示例解释即可

这类示例会大幅降低误解，但不需要演化成第二套 validation 专属 authoring DSL。

---

## 2. 场景一：跨作用域实时联动校验

### 场景

主表单有 `totalAmount`，旁边独立 filter panel 有 `discountRate` 滑块。

需求是：滑块变化时，主表单里的 `totalAmount` 实时出现或消失错误。

### 我的结论

最合适的方案不是建立跨 owner 的响应式 validation dependency。

最合适的方案是二选一：

1. 如果它们本质上属于同一业务事务，就放进同一个 owner
2. 如果它们必须是两个 owner，就做显式投影同步，而不是跨 owner validation graph

### 为什么

这个需求真正需要的是“跨 owner 的数据同步”，不是“跨 owner 的 validation graph”。

如果强行允许：

1. filter owner 的字段直接成为 form owner 的依赖
2. parent validator 隐式读取 child owner

那么 owner 隔离基本就被破坏了。

### 我推荐的做法

#### 方案 A：本来就该同 owner

如果 filter panel 其实是主表单的一部分，只是视觉上放在旁边，那就不要把它做成独立 owner。

让 `discountRate` 和 `totalAmount` 处于同一个 owner，问题自然消失。

#### 方案 B：保留双 owner，但做显式投影

如果 filter panel 必须独立：

1. child owner 变化后，通过明确的应用层同步动作，把 `discountRate` 投影到 parent owner 的某个输入路径
2. parent owner 把该投影值当作本地输入值使用
3. parent 内部再进行本 owner 的 closure expansion 和 revalidation

关键点：

1. 这是显式状态同步
2. 不是 validation graph 跨 owner 依赖

### 不推荐的做法

1. 不要让 `RuntimeOpaqueValidationDescriptor` 去偷偷读另一个 owner 的 live state
2. 不要给 validation runtime 本身增加一个模糊的“全局外部依赖读取”后门

### 需要新增 API 吗

我不建议先在 validation runtime 里发明 `setExternalDependency`。

更合适的是：

1. 在更上层的数据/动作编排层做投影同步
2. validation runtime 只消费已经属于当前 owner 的输入值

### 补充：同一 owner 内的外部数据回填

还有一种常见场景不属于跨 owner 联动，而属于 owner 内的异步数据投影：

1. 用户输入 `companyId`
2. 失焦或 change 后发起数据源请求
3. 返回 `companyName`、`taxCode`、`creditRating` 等值
4. 通过 `applyChangesAndRevalidate(...)` 写入同一个 owner

这类场景是完全正常、而且应该被一等支持的。

一旦这些值被写入当前 owner，它们就应按 owner-local value 参与后续 closure expansion、materialization 与 validation。

它不是跨 owner 依赖问题。

### AMIS 的对应做法与启发

AMIS 在这一类需求上，通常不是通过“跨 form validation graph”解决，而是通过“动作驱动的数据推送 + 目标组件刷新”解决。

可参考的代码线索：

1. 大量表单项支持 `submitOnChange`，字段变化时会沿用表单提交流程，见 `packages/amis/src/renderers/Form/*`
2. `Wizard` 支持 `target` / `submitToTarget` / `reloadTarget`，把数据推送到指定目标组件，见 `packages/amis/src/renderers/Wizard.tsx:452-456, 790, 909-980`
3. `Dialog` 在没有显式 target 时，也会自动寻找最近的 `crud` / `form` / `wizard` 作为动作接收方，见 `packages/amis/src/renderers/Dialog.tsx:840-935`
4. `Wizard` 测试里也有 `target: 'theForm'` 的场景，说明它本来就支持把一个 owner 的结果推到另一个组件，见 `packages/amis/__tests__/renderers/Wizard.test.tsx:1349-1419`

这套思路本质上就是：

1. filter/form 自己先完成本 owner 的校验
2. 然后通过 submit / reload / target 机制把数据推送到指定目标 scope
3. 目标 scope 再以自己的规则重新渲染或重新计算

这和本文前面的建议是一致的：

1. 不建立跨 owner 的响应式 validation graph
2. 用显式投影或动作同步把外部值推到目标 owner

我认为这正是我们应该吸收的部分。

我不建议照搬的部分是：

1. 让 dialog / page / service 自动猜测“最近的接收目标”
2. 依赖字符串 target 名称和隐式 scoped component 查找作为核心数据流机制

AMIS 这么做是为了低代码即时联动的易用性，但在 Flux 里更稳妥的方式仍然应该是：

1. 显式 owner 边界
2. 显式投影写入
3. 目标 owner 本地重验

---

## 3. 场景二：Wizard 多步骤表单的局部提交与回滚

### 场景

Step 1、Step 2、Step 3 组成一个 Wizard。用户点“下一步”时，只校验当前步骤。

### 我的结论

大多数 Wizard 不应该拆成多个 validation owner。

最合适的默认方案是：

1. 整个 Wizard 是一个 `FormRuntime`
2. 每个步骤只是同一 owner 下的不同 subtree
3. “下一步”调用 `validateSubtree(stepPath)`

### 为什么

如果 Wizard 只是一个最终统一提交的表单：

1. 数据生命周期还是同一份
2. 最终 submit 还是一个整体
3. 把每一步都拆成不同 owner，会让 touched/dirty/ready/canSubmit 更复杂

这时 owner 分裂通常是过度设计。

### 那“返回上一步不应瞬间全红”怎么办

这不是 owner 问题，主要是 interaction policy 问题。

更合适的做法是增加“步骤级显示策略”或“subtree 级交互状态控制”，例如：

1. 当前步骤通过 `validateSubtree(stepPath)`
2. 通过后，将该步骤标记为 reviewed / completed / visited-subtree
3. 返回该步骤时，显示逻辑由 subtree 级策略控制，而不是重新依赖一次全局 `allTouched`

### 我不推荐的做法

不建议为了 Wizard 返回时的 UX 问题，先把 Step 1 / Step 2 强行建成两个 owner。

owner 是否拆分应该由值生命周期决定，不应该由 stepper UI 决定。

### 什么时候可以拆 owner

只有在步骤之间真的存在独立确认边界时，例如：

1. Step 1 提交后落库
2. Step 2 是后续独立编辑事务
3. Step 1 和 Step 2 的数据可以各自保存或回滚

这时才适合多 owner。

### AMIS 的对应做法与启发

AMIS 的 `wizard` 不是把每一步都当成独立 validation owner，而是由 `Wizard` 容器统一接管里面 form 的提交流程。

关键实现线索：

1. `Wizard.handleSubmit()` 注释明确写着“接管里面 form 的提交，不能直接让 form 提交，因为 wizard 自己需要知道进度”，见 `packages/amis/src/renderers/Wizard.tsx:909-983`
2. 每一步提交成功后，`Wizard` 自己决定 `gotoStep(...)`
3. 同时它也支持 step-level api、asyncApi、reload/target 之类的编排

这说明 AMIS 的默认心智更接近：

1. 一个 wizard 容器管理步骤进度
2. 每一步是局部校验 / 局部提交
3. 进度流转由上层 wizard 编排，而不是每一步天然成为独立 owner

我认为 Flux 也应保持类似结论：

1. Wizard 默认是一个 owner 内的多 subtree 交互
2. 不要为了 step UI 把每步都拆成独立 owner
3. 真正要拆 owner，仍然看值生命周期和提交边界，而不是看“第几步”

---

## 4. 场景三：异步校验高频竞态下的 UI 闪烁

### 场景

用户快速输入 `username`，多个 async unique-check 依次触发。

### 我的结论

核心解法不应该是新增 `validatingDebounced` 作为 validation core contract。

更合适的核心规则是：

1. `validating` 代表“当前字段是否仍有属于最新代次的有效 pending work”
2. superseded run 被取消时，如果新的 run 已经排队或已启动，`validating` 不应先抖到 `false` 再回 `true`

### 也就是说

正确的 runtime 行为应该是：

1. run1 pending -> `validating = true`
2. run1 superseded, run2 已建立 -> 仍然 `validating = true`
3. 只有当该字段没有任何当前有效 pending run 时，才变为 `false`

### 为什么我不主张先把 `validatingDebounced` 写进架构

因为这更像 UI 表现优化，而不是 validation contract 的核心语义。

真正应该稳定的是：

1. stale run 不得发布结果
2. latest-effective run 的 pending state 连续可见

如果具体产品仍觉得 spinner 闪烁，可以在 UI 层再加展示节流，但那是视觉策略，不一定要进入 validation core。

### AMIS 的对应做法与启发

从 AMIS 代码可以看到，它大量使用 debounce 来降低高频交互带来的抖动，但 debounce 更多用在：

1. 搜索输入
2. 远程选项加载
3. 部分表格和输入类组件的 change emit

而不是在 validation core 层定义一个单独的“validatingDebounced”抽象。

这说明一个合理方向是：

1. validation core 保持 run ownership 和 stale result 抑制
2. 高频交互的 debounce / visual smoothing 放在输入组件或 UI 表现层

我认为 Flux 应吸收这个分层思路，但要比 AMIS 更明确一点：

1. runtime contract 保证 latest-effective pending 状态连续
2. UI 是否额外做 debounce，是表现层选择

---

## 5. 场景四：Overlay 注册与 Variant 分支切换同一时序发生

### 场景

组件挂载时注册 overlay，同时 variant 分支切换，让 overlay target path 失活。

### 我的结论

最合适的规则是：

1. overlay 注册本身可以先进入 owner
2. 但 overlay 是否生效，由下一次 `prepare participation` 后的 active instance graph 决定

换句话说：

1. registration 可以发生在当前事件回合
2. effectiveness 不能绕过参与状态准备流程

### 这样做的好处

1. 不需要赌 React effect 顺序或微任务顺序
2. overlay 不会因为注册更早一点就“偷跑”到已经失活的路径上
3. owner 仍然只在 participation reconciliation 之后决定哪些规则真正参与 materialization

### 推荐规范

如果后续要补 details 文档，我建议明确一句：

> runtime overlay registration does not bypass participation reconciliation; overlay effectiveness is evaluated against the active instance graph during validation preparation.

### AMIS 的对应做法与启发

AMIS 更常见的做法是：

1. 通过组件挂载/卸载
2. 以及 action 驱动的 reload / submit / dialog confirm
3. 重新让目标组件进入一次新的数据和渲染周期

它没有我们这种显式的 active instance graph 概念，但实际行为上也是“结构变化后，由下一轮组件状态决定什么还生效”。

因此，对 Flux 来说更好的结论依然是：

1. overlay 注册事件可以先进入 owner
2. 但只有参与状态准备完成后，才决定 overlay 是否真正进入本轮 materialization

换句话说，我们可以借鉴 AMIS 的“不要在同一同步时刻里赌时序”的经验，但 Flux 需要用更明确的 runtime 规则表达出来。

---

## 6. 场景五：表格拖拽排序后的状态迁移性能

### 场景

大量行、每行多个字段，拖拽排序导致路径索引整体变化。

### 我的结论

如果系统已经接受“稳定逻辑 identity 比纯索引更重要”，那么 materialization/cache 设计也应该顺着这个原则走，不能只靠 indexed path 做一层缓存。

### 最合适的方向

分层缓存，而不是只有路径缓存。

例如：

1. 模板级缓存：按 rule template / compiled template 复用静态部分
2. 行 identity 级缓存：按 logical row identity 复用与行实例绑定的 materialization 中间结果
3. 路径级缓存：作为最终 field state 和局部索引定位层

### 为什么

如果所有缓存都只按 `items.0.name` 这种路径记：

1. reorder 后几乎全失效
2. 大表格会明显卡顿

而如果至少保留：

1. template-level 复用
2. row-identity-level 复用

就能把 reorder 成本从“全部重新计算”压低很多。

### 我认为应该写进哪里的内容

这条先不一定要进 architecture baseline，但至少应进 performance-oriented reference 或 implementation plan。

不过有一条原则应当留在 validation docs：

1. repeated state migration 优先按 logical identity
2. path-only remap 是退化方案，不是理想方案

---

## 7. 场景六：跨字段异步校验导致 closure explosion

### 场景

某个开关使一整片配置 subtree 进入或退出参与状态，其中还包含 async validator。

### 我的结论

最合适的取消模型不应该是“按依赖树递归找所有子任务”，而应当是：

1. 运行时把 async run 注册为 owner-local、target-addressed records
2. 每次 closure / participation 重新计算后，按“目标 path 是否仍 active、该 rule 是否仍是最新代次”来失效旧 run

### 也就是说

不必维护一个“异步任务子树”概念。

更稳定的模型是：

1. run key = owner + target path + rule id + generation
2. branch / dependency 变化后重新计算 active closure
3. 不再属于最新有效集合的 run 直接作废或 abort

### 补充：closure 自身也可能爆炸

除了 async run 的取消，closure expansion 本身也可能成为同步性能热点。

例如：

1. 一个 toggle 控制 50 个字段的 required 状态
2. 一次 `validateAt('toggleField', 'change')` 立刻扩展出几十个 target
3. 每个 target 都要经历 materialization，甚至继续引发 async validator

这说明真正的风险有两层：

1. async run 的数量
2. sync closure expansion + target expansion + materialization 的同步成本

因此我认为当前设计还应继续收敛的，不只是取消模型，还有 closure fan-out 的性能上界与批处理策略。

### 为什么这更好

1. 不需要从 cause 反推整棵异步子树
2. cancellation 逻辑更接近现有 active instance + latest-run 模型
3. 对 branch 失活和 dependency invalidation 是统一处理

---

## 8. 场景七：`applyChangesAndRevalidate` 的跨 Owner 原子性

### 场景

一次 commit 要同时写多个字段，而这些字段分属不同 owner。

### 我的结论

`ValidationScopeRuntime.applyChangesAndRevalidate(...)` 不应该承担跨 owner 事务协调。

最合适的边界是：

1. 它只对单 owner 原子
2. 跨 owner commit 由更高层的 action / orchestration / transaction coordinator 负责

### 为什么

validation runtime 的职责是：

1. owner 内部状态一致性
2. owner 内部 write + revalidate

而跨 owner 事务已经超出了 validation core。

如果强行塞进 validation runtime：

1. owner 模型会被重新耦合
2. rollback / partial failure / ordering 会污染 validation 抽象

### 最合适的调用顺序

更像这样：

1. child owner 先本地 validate / submit
2. orchestration layer 汇总所有写入
3. 数据层或动作层完成跨 owner 原子提交
4. 各受影响 owner 再分别执行 owner-local revalidation

如果未来确实需要跨 owner 事务 API，它也应当属于更高层 orchestration，而不是 `ValidationScopeRuntime`。

### AMIS 的对应做法与启发

AMIS 的跨组件协作普遍是通过：

1. action
2. target / reloadTarget
3. dialog confirm / wizard step submit
4. 组件间数据 merge 或 reload

来完成的。

例如：

1. `Dialog` 默认会把 submit/confirm 之类动作委托给最近的 `crud` / `form` / `wizard`，见 `packages/amis/src/renderers/Dialog.tsx:840-935`
2. `Wizard` 也会在完成步骤提交后决定是否 `reloadTarget(...)` 或 `submitToTarget(...)`，见 `packages/amis/src/renderers/Wizard.tsx:900-980`

这本质上也是“更高层 orchestrator 协调多个组件”，而不是把跨组件事务塞进单个表单 runtime。

所以这一点上，Flux 不仅不该照搬 AMIS 的字符串 target 机制，反而应该把边界划得更清楚：

1. validation owner 只负责 owner 内一致性
2. 跨 owner 协调属于 action/orchestration 层

---

## 9. 场景八：`system` 错误是否应立即显示

### 我的结论

这里需要更精确地区分“state 写入”与“错误消息可见性”。

更合适的规则是：

> `system` reason 正常更新 validation state、effectiveRequired、validating 与 owner summary state；但用户可见的错误消息仍由目标字段自己的显示策略决定。

也就是说：

1. `system` 不更新 touched / visited
2. `system` 正常更新 effective rules 和 `effectiveRequired`
3. `system` 可以更新 owner 的真实 valid / invalid 状态
4. 字段是否立刻“变红”，仍应由该字段自己的 `showErrorOn` 策略决定

### 为什么

程序驱动的结构切换、数组重排、系统写回，不等于用户已经与目标字段完成了语义上的交互。

如果把这两层混在一起，就会同时产生两种错误：

1. 要么用户会看到“我没碰过这个字段，但它突然红了”
2. 要么 `effectiveRequired` 和 validating 状态也被错误地延后

正确分层应是：

| 状态 | `system` 后是否应立即更新 | 是否受 `showErrorOn` 控制 |
| --- | --- | --- |
| `effectiveRequired` | 是 | 否 |
| `validating` | 是 | 否 |
| owner `valid` / `ready` | 是 | 否 |
| 用户可见错误消息 | 视策略 | 是 |

### 例外

即使字段视觉错误不立即显示，以下状态仍然可以立刻更新：

1. owner summary validity
2. submit gate / ready state
3. diagnostics 或开发调试视图

### 我的推荐规则

如果后续要把它升格为规范，我更赞成这句：

> `system` reason must not mutate touch policy, must recompute validation state and effective-required state normally, and must not bypass the target field's own display policy for user-visible error-message surfacing.

这也是当前正式文档应采用的分层。

---

## 10. 补充场景：运行时 schema 热更新

### 场景

低代码编辑器或 dynamic schema renderer 在运行时替换 schema，而 owner runtime 仍然存活。

### 我的结论

这是一个仍未完全落地的 follow-up 设计点。

如果 schema 被替换：

1. `compiledModel` 不能假装还是原来的
2. 原有 cache / active instance / async run / registration 也不能继续沿用

最合适的方向是明确 owner 级 lifecycle：

1. recompile new model
2. dispose old model state
3. clear invalid caches and runs
4. rebuild registrations against the new model

这说明 dynamic schema renderer 需要额外的 owner lifecycle 设计，而不仅是“把 schema prop 换掉”。

---

## 11. 补充场景：大规模 `validateAll()` 的同步阻塞

### 场景

大型 inline table 或复杂表单在 submit 时拥有上千 active path。

### 我的结论

真正的热点不仅是 rule execution，还包括：

1. closure / target expansion
2. materialization
3. repeated-path mapping

这说明：

1. `validateAll()` 的性能问题是真实风险
2. 需要 plan 层面的批处理 / yield / incremental strategy 讨论

但这还不构成推翻主架构的理由，而是实现层必须正视的性能约束。

---

## 12. 补充场景：嵌套 array 的模板映射

### 场景

例如 `contacts[].tags[]` 这种二维 repeated 结构，运行时路径可能是 `contacts.0.tags.2`。

### 我的结论

这个问题是真实存在的，但它更适合放在 repeated-instance mapping 的实现说明里，而不是架构总纲。

应明确的原则是：

1. nested repeated structure 必须有稳定的 template-to-instance 映射
2. 不能假设简单的单层 `[]` 替换就足够
3. 多层 repeated 的 active instance / materialization / cache key 需要递归处理

这属于实现细节，但不是可以忽略的细节。

---

## 13. 补充场景：条件性 `create-owner`

### 场景

例如某个组件在不同权限、不同服务端返回下，可能启用或关闭 draft mode，从而改变 owner boundary。

### 我的结论

这类条件性 owner boundary 是允许的，但前提是：

1. 当前生效 schema 已经确定
2. 编译出的 `compiledModel` 已按这个 schema 条件完成 owner resolution

不允许的是：

1. 在不重建 `compiledModel` 的前提下，纯运行时把同一个 boundary 从 `inherit-owner` 硬切成 `create-owner`

换句话说：

1. 条件性 owner boundary 可以是“按当前 schema 编译结果决定”
2. 不能是“同一 compiledModel 内部再二次重分类”

### AMIS 的对应做法与启发

AMIS 的典型用户体验也更接近“程序驱动变化不应无条件让未交互字段立刻显错”。

原因不是它有一个明确命名为 `system` 的 validation reason，而是它整体上把：

1. 用户交互后的校验反馈
2. 动作驱动的数据更新
3. 组件级 debounce / reload

分散在不同层里处理，结果上避免了“每次程序性变更都直接全红”的体验。

因此我认为，如果要从 AMIS 吸收经验，吸收的应当是这条产品规律：

1. 程序驱动变化可以立刻更新真实 validation state
2. 但用户可见错误不应默认越过字段自己的交互门槛

这与本文给出的推荐规范一致。

---

## 14. 补充：AMIS 做法带来的总体启发

对这些复杂场景，AMIS 反复体现出一个共同模式：

1. 先让当前 form / wizard / dialog 完成自己这一层的校验或提交
2. 再通过 target / reload / confirm / step-submit 等动作把结果推给另一个组件
3. 目标组件自行刷新或重算

这和 Flux 最终应坚持的方向是同构的：

1. validation graph owner-local
2. 跨 owner 联动通过显式编排完成
3. 不把跨组件协作偷塞进 validation dependency graph

Flux 不应照搬 AMIS 的地方主要有两点：

1. 不依赖字符串 target 和隐式 scoped component 搜索作为核心机制
2. 不让 validation runtime 本身承担“猜测另一个组件是谁、然后顺手刷新它”的职责

Flux 应吸收的是模式，而不是原样复制 API 形态。

---

## 15. 对当前文档体系的最终建议

### 当前已经补到 architecture baseline 的

1. `CompiledRuleTemplate.args` 回到 `Record<string, CompiledRuntimeValue<unknown>>`
2. `system` 默认不绕过字段自己的显示策略
3. `validateAll()` 只遍历当前 owner，这一点已经有了，应继续保留

### 当前已经补到 execution details 的

1. validation 7 步流程的展开解释
2. structural cleanup 的典型序列
3. overlay 生效时序
4. 非 form scope schema 示例
5. Wizard / dialog / draft / table row 等典型模式说明

### 仍然更适合补到 implementation plan 的

1. Phase 1 的 `effectiveRequired` 懒惰刷新约束
2. closure fan-out 的性能控制策略
3. 大表格 reorder 的缓存策略
4. 高频 async validating 的 UI 与 runtime 协调策略
5. dynamic schema renderer 下的 owner lifecycle
6. 若需要，跨 owner orchestration 的事务方案

---

## 16. 最终判断

当前 validation 设计的主方向仍然是对的：

1. value axis 和 owner axis 分离是必要的
2. owner-local validation runtime 是正确抽象
3. draft 隔离、non-form scope、overlay、active instance graph 都是必要能力

真正仍需要继续收敛的主要是：

1. performance-sensitive repeated-instance behavior
2. closure expansion 的性能上界与批处理策略
3. dynamic schema renderer 的 owner lifecycle
4. Phase 1 的临时实现约束
5. 高频 async UX 与 runtime 的协作策略
6. 若需要，跨 owner orchestration 的事务方案

也就是说，问题已经不主要在“总架构是否成立”，而是在“哪些实现级细节应该被提升为明确规则，哪些应该留在 plan 或 reference”。
