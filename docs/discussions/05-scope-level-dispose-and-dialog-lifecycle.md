# Scope-level Dispose And Dialog Lifecycle

## 第 1 轮

### 用户原始表述

用户追问三个相关问题：

1. 是否必须引入统一的 scope-level dispose。
2. 现有各个 renderer 在卸载时各自 cleanup，是否已经足够。
3. 对话框显示/关闭的当前处理是否满足要求，尤其是对话框不显示时，至少动态 timer 之类的运行时资源必须停止。

用户同时要求将本轮讨论记录到 `docs/discussions/` 目录。

### AI 复述

本轮需要澄清的不是抽象偏好，而是当前代码中的实际资源生命周期边界：

- `Resource` / `Reaction` 是否已经由统一的 scope disposer 接管。
- 如果没有，React subtree unmount cleanup 是否足以满足当前 host 的正确性要求。
- `dialog` 关闭时，到底是“隐藏但保留”，还是“真正移除并卸载子树”。
- 若 dialog 关闭后子树卸载，轮询 timer、请求、reaction 订阅是否会随之停止。

### AI 分析

#### 一、当前 runtime 已有 scope-local registry，但没有统一接线的 scope-level dispose

当前代码已经实现了 runtime-owned sidecar registry，并按 `ScopeRef.id` 分桶：

- `packages/flux-runtime/src/source-registry.ts`
- `packages/flux-runtime/src/reaction-runtime.ts`

两者都已经有：

- `scopeEntries: Map<scopeId, Map<entryId, Entry>>`
- `disposeScope(scopeId)`

这说明“显式注册表 + 词法所有权分桶”已经落地。

但当前还没有看到统一的 runtime / React 接线在 scope 卸载时自动调用 `disposeScope(scopeId)`：

- `packages/flux-runtime/src/index.ts` 没有公开 `disposeScope(...)` 一类的 runtime surface
- `packages/flux-react/src/` 也没有在 subtree unmount 时统一调用 source/reaction registry 的 `disposeScope(scopeId)`
- `packages/flux-runtime/src/scope.ts` 目前只有 `parent` 链，没有运行时维护的 child-scope tree 或 subtree disposer

因此，**统一 scope-level dispose 作为公共运行时机制，目前并未完全接线**。

#### 二、当前正确性主要依赖 renderer 自身的卸载 cleanup

目前真正发生清理的主路径，是各个 runtime activator renderer 在 `useEffect` cleanup 中释放注册：

- `packages/flux-renderers-data/src/data-source-renderer.tsx`
- `packages/flux-renderers-basic/src/reaction.tsx`

两者模式一致：

1. 挂载时调用 `runtime.registerDataSource(...)` 或 `runtime.registerReaction(...)`
2. 卸载时调用返回 registration 的 `dispose()`

这意味着在当前 React host 下，**只要资源是由一个真实挂载的 renderer 激活的，renderer 卸载就已经足以清理它拥有的 runtime entry**。

所以答案不是“必须立刻补统一 scope-level dispose，否则当前实现就不正确”，而是：

- 对当前 React host 和当前资源形态，renderer cleanup 已经足以保证功能正确性
- 统一 scope-level dispose 仍然有价值，但更像 future-proof runtime backstop，而不是当前唯一路径

#### 三、dialog 当前不是“隐藏保留”，而是“从 store 删除后真实卸载”

dialog 的当前链路是：

1. `dialog` / `openDialog` action 在 `packages/flux-runtime/src/action-runtime.ts` 中创建 dialog scope。
2. `packages/flux-runtime/src/page-runtime.ts` 的 `openDialog(...)` 将 dialog state 写入 `page.store.getState().dialogs`。
3. `packages/flux-react/src/dialog-host.tsx` 订阅 `page.store.dialogs`，并为每个 dialog 渲染一个 `DialogView`。
4. 关闭时：
   - UI 侧 `Dialog` 的 `onOpenChange(false)` 调用 `page.closeDialog(dialog.id)`
   - 或 built-in `closeDialog` action 直接调用 `page.closeDialog(...)`
5. `packages/flux-runtime/src/form-store.ts` 中的 `closeDialog(...)` 会把该条目从 `dialogs[]` 里移除。
6. `DialogHost` 不再渲染该 dialog，对应 subtree 真实卸载。

所以当前 dialog 关闭语义不是 retained hidden subtree，而是 **remove-from-store then unmount**。

#### 四、dialog 关闭后，timer / request / reaction 在当前实现里会停止

由于 dialog body 使用 `dialog.scope`、`dialog.actionScope`、`dialog.componentRegistry` 作为上下文渲染，dialog 内部的 `data-source` / `reaction` 注册也归属于该 dialog subtree。

当 dialog 关闭后：

- `DialogView` 卸载
- dialog body 中的 `data-source` renderer cleanup 调用 `registration.dispose()`
- dialog body 中的 `reaction` renderer cleanup 调用 `registration.dispose()`

对于动态 timer，关键链路在：

- `packages/flux-runtime/src/source-registry.ts` 的 entry `dispose()` 会调用 `controller.stop()`
- `packages/flux-runtime/src/data-source-runtime.ts` 的 `stop()` 会：
  - `clearInterval(pollTimer)`
  - `abortController.abort()`

因此，就当前 React host 的 dialog 实现而言，**“对话框不显示时至少动态 timer 要停止”这一要求是满足的**。

#### 五、仍然建议保留统一 scope-level dispose 作为运行时兜底

虽然当前 dialog 路径已经满足要求，但统一 scope-level dispose 仍然值得保留，原因不是修当前 bug，而是补齐 runtime 边界：

1. 如果未来出现不是由单个 renderer `useEffect` 直接拥有的 scope-side resource，统一 scope disposer 会更稳。
2. 如果未来需要支持非 React host，不能假设永远存在 React cleanup。
3. 如果未来引入 retained / suspended / virtualized subtree，activation/disposal 语义会比“是否卸载”更复杂。
4. 即使当前实现继续以 renderer cleanup 为主，runtime 仍然适合保留 `disposeScope(scopeId)` 作为兜底和调试手段。

更准确的结论是：

- **当前 React host：renderer-level cleanup 已足够满足 dialog 关闭后的资源停止要求**
- **长期 runtime 设计：仍建议保留统一 scope-level dispose，作为更低层的 backstop，而不是取代 React cleanup 的唯一机制**

### 待澄清问题

1. 是否需要把 `disposeScope(scopeId)` 升级为公开 runtime API，供 future host / debugger / retained-subtree runtime 使用？
2. 是否需要把“dialog 关闭后 polling source 停止”的行为固定为回归测试，以免未来在 retained dialog 或 host abstraction 改造时退化？

---

## 总结

### 最终需求

澄清当前实现中资源生命周期的真实边界，重点判断：

- 是否必须依赖统一 scope-level dispose 才能正确清理资源
- 现有 renderer 卸载 cleanup 是否足够
- dialog 关闭后是否满足“至少动态 timer 要停止”的要求

### 关键决策

- 当前 runtime 已实现 scope-local source / reaction registry，但没有统一接线的 public scope-level disposer。
- 对当前 React host，renderer `useEffect` cleanup 已足以承担资源释放职责。
- 当前 dialog 关闭语义是从 `page.store.dialogs` 删除后真实卸载，不是隐藏保留。
- 因此 dialog 内部的 polling source / reaction 在关闭后会停止；timer 会通过 `controller.stop()` 清掉。
- 统一 scope-level dispose 仍然值得保留，但定位应是 runtime backstop，而不是当前 React host correctness 的唯一前提。

### 待定事项

- 是否把 `disposeScope(scopeId)` 暴露为更正式的 runtime API。
- 是否为 retained / suspended subtree 单独定义 activation / disposal 语义。

### 后续行动

- 增加 dialog-scoped polling resource 的回归测试，固定“关闭 dialog 后停止轮询”的最低要求。
- 如果未来出现非 renderer-owned scope 资源，再补统一 scope-level disposal wiring 或公开 API。

---

## 第 2 轮

### 用户追问

用户继续追问两个问题：

1. 是否有必要把 `disposeScope(scopeId)` 暴露为更正式的 runtime API，以及什么业务场景需要主动调用这一机制。
2. retained / suspended subtree 的 activation / disposal 语义是否应当由 DSL 的自然语义决定，以及底层是否应提供一个统一机制来简化实现。

### AI 整理

#### 一、`disposeScope(scopeId)` 不应该成为 DSL 作者可见的业务 API，但值得视为 host/runtime 集成 API 预留点

对当前 React host 基线而言，**没有必要为了普通 schema authoring 把 `disposeScope(scopeId)` 升格成一个业务层显式调用的正式 API**。

原因是：

1. 当前正确性已经由 subtree unmount cleanup 保证，普通作者不需要也不应该手动释放 scope 资源。
2. 一旦把它变成 author-visible action，就会把声明式生命周期拉回到“手动调用清理函数”的命令式模型。
3. `scopeId` 本身就是 runtime 内部标识，不是 DSL 作者应该感知的业务概念。

但从 runtime 演进角度看，**把它保留为 host/runtime integrator 可用的正式窄 API 是有意义的**。它的定位应该是：

- 供 host、调试器、设计器、测试 harness、非 React renderer host 使用
- 不供普通 schema 作者直接使用
- 不设计成 built-in action，也不进入日常 DSL surface

更准确的建议是：

- **短期**：不必急着把 `disposeScope(scopeId)` 暴露成通用 public API
- **中期**：如果出现第二类宿主或 retained subtree 控制器，再把它升级为 host-facing runtime API
- **长期**：若 lifecycle 语义扩展到 `suspend` / `resume`，则不应只公开 `disposeScope`，而应公开更完整的 lifecycle 控制面

#### 二、真正需要“主动调用 scope disposal”的场景，不是普通业务场景，而是宿主/基础设施场景

普通页面表单、普通 dialog、普通 region 切换，在当前 React host 下都不需要业务代码显式调用 `disposeScope(scopeId)`。

真正会需要主动触发的场景，主要是以下几类：

1. **非 React host 或命令式挂载路径**
  - 如果未来有 canvas host、designer host、headless preview host 或别的非 React runtime，就不能依赖 React effect cleanup。

2. **retained / keep-alive / cached subtree 管理**
  - 例如 workbench tab、缓存 dialog、预加载 panel、可恢复 inspector；宿主可能想保留 subtree 状态，但在某一时刻明确终结它。

3. **virtualized / recycled subtree**
  - 例如大型设计器或虚拟列表把一批 row / node subtree 移出活跃区；此时宿主需要决定它们是 suspend 还是 dispose，而不是等 React 普通卸载语义隐式决定。

4. **调试器、测试 harness、预览沙箱的显式 teardown**
  - 例如一个测试场景结束后，需要在不销毁整个 runtime 的情况下手动清掉某个 scope 及其 sidecar resources。

5. **未来出现 non-renderer-owned scope resources**
  - 如果某些资源不是由一个 activator renderer 的 `useEffect` 直接拥有，而是由更底层运行时或 tooling 创建，那么就需要统一的 owner-scope teardown。

所以，如果将来公开这个能力，它的语义应该被理解为：

- **不是“业务动作”**
- **而是“宿主边界 teardown 控制”**

#### 三、retained / suspended subtree 的 activation / disposal 语义，应该首先服从 DSL 的自然语义，而不是底层框架技巧

这点应该坚持 DSL-first。

当前 `docs/architecture/frontend-programming-model.md` 已经有比较正确的约束：

- 核心模型下，`Resource` activation 由 lexical ownership + currently active rendered subtree 决定
- 如果 host 引入 retained、preloaded、virtualized、hidden、suspended subtree，就必须显式定义它们是 active、suspended 还是 disposed

因此更稳妥的原则是：

1. **普通 DSL 自然语义保持简单**
  - 渲染中 / 挂载中 = active
  - 被替换 / 被关闭 / 不再渲染 = disposed

2. **retained / suspended 不是默认语义**
  - 它不应因为某个 UI 框架底层“刚好还缓存了 DOM/组件实例”就自动成立
  - 它必须来自明确的 narrower contract，或者未来明确引入的 DSL/host 特性

3. **dialog 关闭的自然语义仍应是 dispose，而不是 suspend**
  - 当前 dialog close 已经符合这一点：从 store 删除后真实卸载

4. **只有显式 keepAlive / cache / preload / retained-panel 一类语义，才应该进入 suspended 语义空间**

换句话说，**语义应该从 DSL 往下约束实现，而不是从 host 优化策略反推 DSL 语义**。

#### 四、底层确实应该有一个统一机制来简化实现，但这个机制最好不是“只有 disposeScope”

如果未来真的要支持 retained / suspended subtree，仅有 `disposeScope(scopeId)` 是不够的，因为：

- `dispose` 表示彻底终结并释放资源
- `suspend` 表示停止活跃副作用，但保留可恢复状态
- `resume` 表示重新进入 active

所以更合理的底层收敛方向不是单个 API，而是一个 **scope/subtree lifecycle state machine**。最低限度可以收敛成三态：

- `active`
- `suspended`
- `disposed`

对应的 runtime 行为可以是：

1. `active`
  - reaction 订阅生效
  - polling / timer 生效
  - request refresh / retry 正常运行

2. `suspended`
  - 暂停 polling、debounce timer、后台 refresh、reaction dispatch
  - 保留已解析状态、已加载值、scope 数据、必要的 host cache

3. `disposed`
  - 清理 timer
  - abort in-flight request
  - 释放 reaction/source registrations
  - 从 scope-owned registry bucket 中删除

在这种设计下：

- `disposeScope(scopeId)` 只是终态转换的一种便捷入口
- retained subtree 需要的是 `suspendScope` / `resumeScope`，或更一般的 `setScopeLifecycle(scopeId, state)`

这会比在每个子系统里单独发明“暂停但不销毁”的局部约定更稳。

### 待澄清问题

1. 如果未来真的公开宿主级 lifecycle API，是否应直接跳过“只公开 `disposeScope`”这一步，而改为设计统一的 `active / suspended / disposed` scope lifecycle surface？

---

## 总结（更新）

### 关键补充

- `disposeScope(scopeId)` 对普通 DSL 作者没有必要，也不应成为业务 action。
- 如果未来公开，它应定位为 host/runtime integrator API，而不是 schema authoring surface。
- 真正需要主动调用这一机制的场景主要是 retained subtree、非 React host、virtualized subtree、调试器/测试显式 teardown，以及 non-renderer-owned resources。
- retained / suspended subtree 的 activation / disposal 语义应首先服从 DSL 的自然语义；普通“关闭/替换/不再渲染”仍应默认理解为 dispose。
- 底层确实应有统一机制来简化实现，但更合理的方向是 scope lifecycle state machine，而不是只暴露一个 `disposeScope(scopeId)`。