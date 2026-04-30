# Scheduling Model / Settled Update Turn 澄清讨论

## 第 1 轮

### 用户原始表述

用户引用了两条外部评审意见，并要求判断这些意见是否成立、当前代码中是如何实现的、以及结论应如何沉淀到架构文档中。

第一条意见认为：

- 文档此前对 `React concurrent mode` 的约束不现实。
- `Flux` 作为上层 store 无法规定宿主调度器如何中断、丢弃、重播或重复读取渲染。
- 正确边界应是：`Flux` 只保证自己 store 中的数据一致性与发布边界，至于宿主何时读取、读几次、是否重播，那是宿主框架自己的行为。

第二条意见进一步主张：

- 放弃 `Settled Update Turn` 概念。
- 改用“同一个宏任务中的所有 scope 写入只触发一次重新计算和 `Reaction` 调度”的模型。
- 提供 `$flush` 特殊 action，让作者在极少数情况下强制立即执行待处理的 `Reaction`。
- 明确对宿主框架只承诺最终一致性，而不承诺渲染帧边界。

用户要求把本轮讨论记录到 `docs/discussions/` 下，并据此修改 `docs/architecture/frontend-programming-model.md`。

### AI 复述

本轮讨论的核心不是“要不要有调度语义”，而是：

1. `Flux` 是否应该继续保留 `Settled Update Turn` 这一概念。
2. 如果保留，它到底是一个**runtime-store 语义边界**，还是一个与宏任务 / 微任务 / 渲染帧绑定的实现模型。
3. 当前运行时代码是否已经实现了“全局批量更新 + 单一可观察队列”，还是更接近“各运行时子系统各自订阅 + 局部 coalescing”。
4. `$flush` 这样的 author-visible 调度控制是否应该进入 schema surface。

### AI 分析

#### 一、对第一条意见的判断：成立

这条批评是成立的。

`Flux` 不能规定宿主调度器怎样运行。尤其在 `React concurrent mode` 下，渲染可能被中断、重播、丢弃或重复读取。作为外部 store，`Flux` 能定义的是：

- 何时一个 store mutation path 结束
- 何时一个 store snapshot 被视为“已发布”
- consequence work（如 `Reaction`）与同步写入之间的边界

它不能规定：

- 宿主必须只读一次
- 宿主必须在某个固定顺序读
- 宿主不得重播渲染

因此，文档里关于 `React concurrent mode` 的表述应当被收回到“宿主调度不受 `Flux` 约束，`Flux` 只定义自身 store 的结算与发布边界”。

#### 二、对第二条意见的判断：部分成立，但结论不能直接采纳

这条意见指出的问题有一部分是对的：如果把 `Settled Update Turn` 写成一种过于精确、仿佛能规定底层事件循环的机制，那么实现复杂度和文档越界风险都会上升。

但它给出的替代方案并不完全合适，主要有三点。

##### 1. 不能把语义边界偷换成宏任务边界

`Settled Update Turn` 想表达的是：

- 一条同步 mutation path 何时算“结算完毕”
- consequence work 何时开始异步跟进
- 同一轮 store 发布与后续 consequence 之间的语义边界是什么

这些是 runtime/store 语义，不应直接绑定到“同一宏任务”这样的宿主实现细节。

##### 2. 不能把整个运行时简化成“一个队列 + Promise.resolve().then()”

当前 `Flux` 的执行并不是单一全局队列模型。

不同执行面有不同机制：

- `ScopeRef` / scope store：同步发布 snapshot 与 `ScopeChange.paths`
- `Reaction`：按 registration 独立订阅、局部 coalescing、微任务调度
- formula-backed source：首发可用微任务延后，依赖命中后按 source controller 刷新
- api-backed source：由 request/controller 生命周期驱动
- `FormRuntime`：存在 form-local `batchUpdate(...)`，但不是全局 transaction scheduler

所以把整个调度模型概括成“一个队列 + 一个微任务 flush”会误导后续架构收敛。

##### 3. `$flush` 不适合成为 author-visible action

`$flush` 这类表面上看像“偶尔需要的逃生口”，但它本质上会把运行时调度器内部控制暴露给 schema 作者。

这和当前模型的方向冲突：

- `Flux` 倾向于声明式、隐式依赖驱动
- 调度器实现细节不应成为日常 authoring surface
- 如果测试、debugger、inspection 工具确实需要 drain hook，更合理的落点是 runtime/debug API，而不是 schema action

因此，这里不应把 `$flush` 当成当前架构的推荐改进方向。

#### 三、当前代码中的真实实现

当前运行时代码更接近“路径驱动的 store 变化流 + 各子系统各自订阅 + 局部异步合并”。关键锚点如下：

##### 1. `ScopeRef` / scope store

- `packages/flux-runtime/src/scope.ts`
- `packages/flux-core/src/types/scope.ts`

当前 scope store：

- 同步更新 snapshot
- 同步记录 `ScopeChange.paths`
- 通过 `subscribe(listener: (change: ScopeChange) => void)` 把变化传播给订阅者

这说明变化传播的基础是带路径的 store change surface，而不是一个中心化 transaction scheduler。

##### 2. `Reaction`

- `packages/flux-runtime/src/reaction-runtime.ts`

当前 `Reaction`：

- 每个 reaction registration 自己订阅 `scope.store`
- 依赖命中后调用 `scheduleReaction(...)`
- 若已有 pending trigger，则只把新的 `changedPaths` 合并进 `Set`
- 若还未排队，则通过 `Promise.resolve().then(invoke)` 在微任务中触发一次执行

这表明当前 baseline 是：

- **per-registration microtask scheduling**
- **local coalescing of changed paths**
- **no globally visible ordered reaction queue**

##### 3. `Resource`

- `packages/flux-runtime/src/source-registry.ts`
- `packages/flux-runtime/src/data-source-runtime.ts`

当前 source/runtime 并不走统一 flush 队列：

- formula-backed source 首次发布可通过微任务延后
- 依赖命中后的自动刷新直接走 `controller.refresh()`
- api-backed source 由 `runRequest()`、polling timer、abort controller 等自己的 controller 生命周期驱动

因此不能把整个 `Resource` + `Reaction` 系统都抽象为一个统一的“批量更新 + flush 队列”。

##### 4. `FormRuntime`

- `packages/flux-runtime/src/form-runtime.ts`
- `packages/flux-runtime/src/form-store.ts`

当前 form 层确实存在 `batchUpdate(...)` 和局部 write coalescing，但这是：

- hot path 局部优化
- form-local patch/commit primitive
- 不是 dispatcher-wide，也不是 runtime-global 调度模型

#### 四、应当落到文档中的结论

结合上述判断，更合适的文档方向是：

1. 保留 `Settled Update Turn`，但把它定义成 **runtime-store semantic boundary**。
2. 明确它不是宏任务、微任务、渲染帧、也不是 `React useEffect` 的同义词。
3. 明确当前实现是：
   - `Reaction` 采用 per-registration microtask scheduling with local coalescing
   - 当前没有 globally visible ordered scheduler
   - 当前模型不蕴含 author-visible `$flush` action
4. 把 `changedPaths` 的表述从“当前 settled update turn”收紧为“当前 queued reaction execution 所合并到的 change set”，以避免文档比实现更强。

### 待澄清问题

1. 是否需要把 test/debug drain hook 作为未来 runtime/debug surface 单独设计，而不是继续留在编程模型文档中？
2. 如果未来真的需要跨 reaction 的稳定全局顺序，是否应单独形成一份更窄的 scheduler/runtime doc，而不是继续堆在 top-level programming model 中？

---

## 总结

### 最终需求

将本轮关于 scheduling model 的讨论沉淀为可追溯的讨论文档，并据此收紧 `docs/architecture/frontend-programming-model.md`：

- 保留 `Settled Update Turn`
- 但把它从“疑似精确事件循环模型”改写为“runtime-store 语义结算边界”
- 明确 `Flux` 不约束宿主调度器
- 明确当前代码 baseline 是 per-registration / local-coalescing，而不是 global scheduler

### 关键决策

- 接受“不能约束 `React concurrent mode` 调度器行为”这一批评。
- 不接受“因此应放弃 `Settled Update Turn`”这一结论。
- 不将“同一宏任务”升级为新的规范边界。
- 不将 `$flush` 设计为当前 author-visible action。
- 文档应收回到 store publication / consequence boundary 的真实可实现范围。

### 待定事项

- 如果测试、debugger 或 future inspection tooling 需要显式 drain 能力，可另行评估 runtime/debug API。
- 如果未来需要真正的 cross-reaction global ordering，再单独形成更窄的 scheduler contract。

### 后续行动

- 更新 `docs/architecture/frontend-programming-model.md` 中 `Settled Update Turn`、`Reaction.changedPaths` 与 `Scheduling Model` 表述。
- 在 `docs/logs/2026/04-07.md` 中记录本次讨论结论和文档修改。
