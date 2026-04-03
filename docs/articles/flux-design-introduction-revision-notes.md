# `flux-design-introduction.md` 修订意见（最终版）

## 修订原则

1. 只修改已经明显落后于当前实现、会误导读者理解当前契约的表述。
2. 不因为“设计先行但尚未完全落地”而回删文章中的前瞻性内容。
3. 将“文章需要改什么”和“实现层面接下来应该怎么改”分开记录，避免把现状、目标和实现取舍混写。

## 建议修改的过时内容

### 1. 组件定位段落应改成“page 内 `id` 绝对定位 + 局部 `name` + 内部优化”

- 文章位置：`docs/articles/flux-design-introduction.md:154-158`
- 当前问题：文章把 `id` 写成了“全局唯一绝对坐标”，这个范围过大；同时举了 `component:myForm` 这种并不存在的调用形式。当前更准确的语义是：`id` 是 page 范围内稳定唯一的定位锚点，`name` 是局部逻辑名，可以在不同局部边界内复用，但在同一解析边界内应避免重复；schema 作者通过 `component:<method>` 配合 `componentId`/`componentName` 指定目标。`_cid` 是运行时内部优化机制，不需要在设计文档里展开。
- 当前依据：`packages/flux-runtime/src/action-runtime.ts:235-327`、`packages/flux-runtime/src/component-handle-registry.ts:27-45,114-156,177-184`、`docs/architecture/component-resolution.md:23-32`
- 修改建议：
  - 把“全局唯一”改成“page 范围内稳定唯一”。
  - 删除 `component:myForm` 的错误表述。
  - 将 `name` 改写为“局部逻辑名”，不要直接表述为“可任意重复”。
  - `_cid` 只保留一句“运行时可做内部快路径优化”，不要作为 schema 层主语义展开。
- 可直接替换为：

```markdown
**ComponentHandleRegistry** 负责组件实例的定位与访问。`id` 是 page 范围内稳定唯一的定位锚点；`name` 是局部逻辑名，适合在不同局部边界内复用，但在同一解析边界内应避免重复。schema 作者通过 `component:<method>` 配合 `componentId` 或 `componentName` 指定目标组件；运行时可对可静态解析的目标做内部索引优化，以降低常见查找成本。
```

### 2. 命名空间动作示例应统一为 `namespace:method`

- 文章位置：`docs/articles/flux-design-introduction.md:158`、`docs/articles/flux-design-introduction.md:181` 等所有 `demo.open`、`designer.addNode` 风格示例
- 当前问题：文章混用了 `designer:addNode` 和 `demo.open` 两种分隔风格。当前实现只识别 `:` 分隔的命名空间动作，`.` 不会被 `ActionScope` 解析。
- 当前依据：`packages/flux-runtime/src/action-scope.ts:3-13`、`docs/architecture/action-scope-and-imports.md:254-271`
- 修改建议：
  - 全文统一改为 `namespace:method`。
  - 将 `ActionScope.resolve('demo.open')` 改为 `ActionScope.resolve('demo:open')`。
  - 将 JSON 示例中的 `{ "action": "demo.open" }` 改为 `{ "action": "demo:open" }`。

### 3. `xui:imports` 的默认行为应从“静默忽略”改为“显式失败并给出诊断”

- 文章位置：`docs/articles/flux-design-introduction.md:193-197`
- 当前问题：文章写的是“宿主未实现 `importLoader` 时，`xui:imports` 会被静默忽略”。当前实现并不是静默忽略：缺少 loader 时，导入注册会失败，并通过 `env.notify('error', ...)` 与 `monitor.onError(...)` 暴露诊断；后续对该 namespace 的 dispatch 会返回显式失败结果。
- 当前依据：`packages/flux-runtime/src/imports.ts:73-115,180-215`、`packages/flux-react/src/node-renderer.tsx:109-135`、`docs/architecture/action-scope-and-imports.md:792-799`
- 修改建议：
  - 将“静默忽略”改成“显式失败并保留错误状态”。
  - 将“宿主通过 importLoader 返回 unload 方法”改成“namespace provider 可选实现 `dispose()`，由运行时在引用计数归零时调用”。

### 4. `data-source` 小节需要按当前契约重写，删除 `body` 区域叙述

- 文章位置：`docs/articles/flux-design-introduction.md:212-229`
- 当前问题：文章把 `data-source` 描述成“取数并渲染 `body` 区域”的组件。但当前 `DataSourceSchema` 没有 `body` 字段，`data-source` 渲染器本身返回 `null`，只负责请求、写入当前 scope、轮询与错误通知。
- 当前依据：`packages/flux-core/src/types/schema.ts:55-63`、`packages/flux-renderers-data/src/data-source-renderer.tsx:24-136`、`docs/architecture/api-data-source.md:162-224`
- 修改建议：
  - 删除 `body` 区域的 schema 示例。
  - 明确写成“`data-source` 是不直接渲染 UI 的副作用组件”。
  - 将 loading/empty/error 的展示职责改写为“由同 scope 的兄弟节点或宿主通知机制承担”。

### 5. 调试器小节应从“完整内部结构可视化”收敛到“timeline + node inspect 已落地”

- 文章位置：`docs/articles/flux-design-introduction.md:593-598`
- 当前问题：文章把 `nop-debugger` 描述成已经能直接展示 `ActionScope` namespace 列表和 `ComponentHandleRegistry` 内部索引，还暗示支持表达式调试。当前实现已落地的是 compile/render/action/api/notify/error 事件时间线、network 视图、基于 `data-cid` 的节点检查和部分 form state 快照；`ActionScope` 链并未作为稳定 UI 契约暴露，表达式求值面板也是禁用状态。
- 当前依据：`packages/nop-debugger/src/types.ts:3-20`、`packages/nop-debugger/src/controller.ts:54-67,140-157,334-338`、`packages/nop-debugger/src/panel.tsx:1304-1307`
- 修改建议：
  - 把“已直接可视”改成“当前已支持基础 timeline、network 和 node inspect”。
  - 将 `ActionScope` namespace / registry 全量索引检查改写为“后续增强方向”。
  - 明确说明表达式求值在当前调试器里是禁用的。

## 本次不建议修改的前瞻性内容

- `docs/articles/flux-design-introduction.md:44-45` 关于表达式常量折叠的描述。当前 `packages/flux-formula/src/compile.ts:76-157` 尚未实现常量折叠 pass，但这属于编译器优化方向，不必因为尚未落地而回删整段设计动机。
- `_cid` 究竟放在原始 schema 还是 `CompiledSchemaNode` 上，不属于文章主叙事应展开的内容。这是实现细节，可以在实现演进时调整，但不需要在设计哲学文章里前置讨论。

## 实现层面的改进方案

### 1. 调整 `useScopeSelector`，但不要污染 `readOwn()` 的语义

- 问题：当前 `useScopeSelector()` 直接对 `scope.readOwn()` 建立订阅，见 `packages/flux-react/src/hooks.ts:49-61`。这与架构文档强调的词法链读取和 selector 订阅不完全一致：子 scope 组件如果依赖父 scope 数据，可能拿到的是非响应式父值，或者被迫在 render 阶段回退到 `scope.get()` 这种非订阅读取。
- 性能判断：把 `useScopeSelector()` 调整为基于词法链可见快照后，父 scope 变化时会让更多下游 selector 重新计算，但 `equalityFn` 仍能挡住大部分无意义的重新渲染。对 `input-text` 这类只按路径读取单值的场景，成本通常表现为“多做一次 selector 计算”，而不是“整棵子树都重新渲染”。
- 不建议的方案：不要通过在 `readOwn()` 结果里塞入 `_parentVars` 之类隐藏链路来实现词法继承。这会破坏 `readOwn()` 作为“只读当前层”的接口语义，也会把显式词法接口重新变回依赖特殊对象结构的隐式约定。
- 改进方案：
  1. 将 `useScopeSelector()` 的快照来源改为 `scope.store?.getSnapshot() ?? scope.read()`，让默认 hook 对应词法链可见数据。
  2. 新增 `useOwnScopeSelector()`，显式保留当前 own-scope 订阅语义，仅供真正只关心当前层 patch 的热点路径使用。
  3. 在 `packages/flux-core/src/types/renderer-hooks.ts` 中同时声明两个 hook，并在 `docs/architecture/renderer-runtime.md` 更新语义说明：
     - `useScopeSelector()` = 订阅词法链可见数据
     - `useOwnScopeSelector()` = 订阅当前层 own snapshot
  4. 审核现有调用点：`packages/report-designer-renderers/src/field-panel-renderer.tsx`、`packages/report-designer-renderers/src/inspector-shell-renderer.tsx`、`packages/spreadsheet-renderers/*`、`packages/flux-renderers-form/src/field-utils.tsx`。依赖词法继承的调用保留在 `useScopeSelector()`，只关心当前层 patch 的调用迁移到 `useOwnScopeSelector()`。
  5. 如后续仍需更细颗粒度优化，可补一个路径型快 hook，例如 `useScopeValue(path)`，而不是继续模糊通用 hook 的语义。
  6. 增加回归测试：
     - 子 scope 中的组件可对父 scope 更新做出响应。
     - own-scope selector 不会因父 scope 噪声产生额外重渲染。

### 2. 将 `data-source` 的请求/轮询/缓存编排下沉到 runtime，避免 React 渲染器承载过多运行时逻辑

- 问题：当前 `data-source` 的核心行为都写在 `packages/flux-renderers-data/src/data-source-renderer.tsx:24-136` 的 effect 中，包括轮询、abort、缓存读取、停止条件判断和 scope 写入；缓存还是模块级 `globalApiCache`。
- 影响：
  - 与项目“runtime-first、React 只是绑定层”的主架构不一致。
  - 模块级缓存天然跨 root/runtime 共享，隔离边界不清晰。
  - `data-source` 无法复用 `request-runtime` 里的去重与请求协调能力，容易形成第二套请求语义。
- 改进方案：
  1. 在 `packages/flux-runtime/src/` 新增独立模块，例如 `data-source-runtime.ts`，负责初始写入、请求执行、轮询、停止条件、abort 生命周期和缓存命中/写回。
  2. 定义最小控制器接口：

```ts
interface DataSourceController {
  start(): void;
  stop(): void;
  refresh(): Promise<void>;
}
```

  3. 让控制器复用 `request-runtime.ts` 的 `createApiRequestExecutor()` 与 `dedupStrategy`，不要再在 renderer 内部维护一套平行的 abort/cache 逻辑。
  4. 将 cache store 的所有权收回到 `RendererRuntime` 或 `PageRuntime`：
     - 最小方案：`createRendererRuntime()` 内部持有 api cache store。
     - 更完整方案：允许宿主通过 `RendererEnv` 注入 cache policy。
  5. `DataSourceRenderer` 保留当前 `null` 渲染契约，但职责收缩为：创建 controller、在 effect 中 `start/stop`，不再承担请求编排细节。
  6. 增加测试：
     - unmount 会中止轮询
     - `stopWhen` 能终止后续调度
     - 多个 renderer root 之间缓存互不污染
     - 与 `dedupStrategy` 的并发语义一致

### 3. 为 debugger 增加正式的调试快照契约，移除对注册表私有结构的强制类型转换

- 问题：`packages/nop-debugger/src/controller.ts:54-67` 通过把 `ComponentHandleRegistry` 强转成内部 `handles` map 来做 `findHandleByCid()`。但公开接口 `packages/flux-core/src/types/renderer-component.ts:29-44` 根本没有这个字段。
- 影响：
  - debugger 依赖运行时实现细节，破坏包边界。
  - 一旦注册表内部结构调整，debugger 会静默失效。
  - 文章中若要进一步宣称 debugger 能查看 registry / action scope 内部状态，就缺少稳定契约支撑。
- 改进方案：
  1. 为 `ComponentHandleRegistry` 增加显式调试接口，不直接暴露内部 `Map`，例如：

```ts
interface ComponentHandleRegistryDebugSnapshot {
  handles: Array<{
    cid?: number;
    id?: string;
    name?: string;
    type: string;
    mounted: boolean;
  }>;
}

interface ComponentHandleRegistry {
  getDebugSnapshot?(): ComponentHandleRegistryDebugSnapshot;
  getHandleByCid?(cid: number): ComponentHandle | undefined;
}
```

  2. `createComponentHandleRegistry()` 在运行时实现这些方法，debugger 只消费公开调试接口。
  3. 对 `ActionScope` 也提供平行的调试快照，例如 namespace 列表、provider kind、父链信息；不要让 debugger 自己穿透 runtime 内部结构。
  4. 在 `SchemaRendererProps` 中增加 `onActionScopeChange` 或统一的 `onRuntimeDebugRootsChange`，与现有 `onComponentRegistryChange` 对齐。
  5. 等调试契约稳定后，再实现文章里提到的 namespace / registry inspect UI；在那之前不要把它写成既成事实。

### 4. 增强 runtime 对 `env` identity 变化的容错，但不改变 `env` 作为宿主静态环境对象的定位

- 问题：从设计上说，`env` 应该是宿主提供的长期稳定环境对象；但当前 `SchemaRenderer` 按 `props.env` 的引用变化重建 runtime，见 `packages/flux-react/src/schema-renderer.tsx:24-40`。宿主如果每次 render 都创建新 `env` 包装对象，即使 `fetcher`/`notify` 行为没变，也会导致 page/runtime 重建。
- 影响：
  - 表单与 page 状态可能被非语义性的宿主重渲染打断。
  - 宿主集成方必须额外记住“必须 memoize env”，否则行为脆弱。
  - 这不是 `env` 设计本身的问题，而是运行时对宿主不规范用法的容错不足。
- 改进方案：
  1. 在 `SchemaRenderer` 中将 `env` 改为 ref 驱动：runtime 创建一次，最新 `env` 写入 `envRef.current`。
  2. `createRendererRuntime()` 与 `request-runtime` / `action-runtime` / `node-runtime` 改为读取 `getEnv()` 或 `envRef.current`，而不是闭包捕获初始对象。
  3. 将 runtime/page/actionScope/componentRegistry 的创建条件从 `env` identity 中剥离，只在真正的结构性依赖变化时重建。
  4. 增加回归测试：
     - 仅 `env` 外层对象变化时，page/form state 不丢失。
     - `notify`、`monitor`、`importLoader` 更新后，runtime 能看到新实现。
  5. 文档层仍可继续把 `env` 描述成稳定对象，但实现层不应把“宿主一定会 memoize env”当作必要前提。

### 5. 可选整洁性优化：逐步把 `cid` 收敛到 `CompiledSchemaNode`

- 问题：当前 `schema-compiler` 会把 `_cid` 写回 `node.schema`，见 `packages/flux-runtime/src/schema-compiler.ts:87-114`。这会让编译结果和原始 schema 之间出现内部字段耦合。
- 结论：这不是当前最紧急的问题。如果当前做法在实现复杂度、调试便利性或性能上更顺手，可以继续保留；不必把“禁止修改原始 schema”上升为原则约束。
- 更干净的方向：既然 `CompiledSchemaNode` 已经是稳定存在的运行时结构，后续如果再触碰编译链路，可考虑把 `cid` 等内部字段收敛到 `CompiledSchemaNode` 上，而不是继续挂回作者输入的 schema 对象。
- 建议做法：
  1. 下次重构 `schema-compiler` / `node-renderer` / debugger DOM 标记时，再一起评估迁移成本。
  2. 如果迁移收益不足，则保留现状，不单独为了“纯度”发起大改。
  3. 如果迁移，则优先保证外部行为不变，把它作为实现整洁性优化而不是架构修正项。

## 建议执行顺序

1. 先改文章中的过时内容，避免继续误导读者理解当前契约。
2. 优先修 `useScopeSelector` 语义，但采用“双 hook 分层”方案，不改坏 `readOwn()` 的接口语义。
3. 再处理 `data-source` 下沉和 debugger 正式调试契约，它们会改善 runtime 边界与可维护性。
4. 之后处理 `env` identity 的容错增强，让宿主集成更稳健。
5. `cid` 收敛到 `CompiledSchemaNode` 作为可选整洁性优化，放到编译链路下一次相邻重构时再做。
