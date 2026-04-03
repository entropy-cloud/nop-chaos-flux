# `flux-design-introduction.md` 修订意见

## 目的

本文只处理两类事项：

1. `docs/articles/flux-design-introduction.md` 中已经明显落后于当前仓库实现的表述，并说明应如何修改文章。
2. 当前实现层面已经暴露出来的问题，并给出代码改进方案。

本文**不建议**因为“设计先行但尚未完全落地”而回删文章中的前瞻性内容。文章本身是架构理念文，不必被降格为纯粹的实现清单；需要修改的是会直接误导读者理解当前契约的过时描述。

## 建议修改的过时内容

### 1. 组件定位段落应改成“作者侧 `componentId`/`componentName` + 运行时内部 `_cid` 快路径”

- 文章位置：`docs/articles/flux-design-introduction.md:154-158`
- 当前问题：文章将 `id` 描述为“全局唯一标识，相当于绝对坐标”，并举了 `component:myForm` 这种并不存在的调用形式。当前运行时的公开动作语法是 `component:<method>`，并通过 `componentId` 或 `componentName` 指定目标；编译期会在可静态解析时写入内部 `_targetCid` 快路径，但 `_cid` 是内部实现细节，不是文章应该暴露给 schema 作者的主语义。
- 当前依据：`packages/flux-runtime/src/action-runtime.ts:235-327`、`packages/flux-runtime/src/component-handle-registry.ts:114-156`、`docs/architecture/component-resolution.md:23-32`
- 修改建议：
  - 删除“`id` 是全局唯一绝对坐标”和“`component:myForm`”的描述。
  - 改成“schema 作者通过 `component:submit` 这类动作配合 `componentId`/`componentName` 定位组件；运行时内部可将静态目标预解析为 `_cid` 以获得 O(1) 查找快路径”。
  - 不要把 `id` 和 `name` 解释为“绝对坐标 / 相对坐标”的严格机制；当前实现更接近“registry 链中的作者侧标识”，查找边界由 registry/page 边界决定。
- 可直接替换为：

```markdown
**ComponentHandleRegistry** 负责组件实例的定位与访问。对 schema 作者公开的定位方式，是 `component:submit`、`component:validate` 这类动作配合 `componentId` 或 `componentName` 指定目标实例；它们的解析边界应理解为当前组件注册表链或 page 边界内可达，而不是整个应用的全局绝对坐标。运行时在编译阶段会为可静态解析的目标分配内部 `_cid`，把常见静态查找降为 O(1) 快路径；`_cid` 属于内部实现细节，不需要作为 schema 层主语义向作者强调。
```

### 2. 命名空间动作示例应统一为 `namespace:method`

- 文章位置：`docs/articles/flux-design-introduction.md:158`、`docs/articles/flux-design-introduction.md:181` 等所有 `demo.open`、`designer.addNode` 风格示例
- 当前问题：文章同时混用了 `designer:addNode` 和 `demo.open` 两种分隔符。当前实现只解析 `:` 分隔的命名空间动作，`.` 不会被 `ActionScope` 识别。
- 当前依据：`packages/flux-runtime/src/action-scope.ts:3-13`、`docs/architecture/action-scope-and-imports.md:254-271`
- 修改建议：
  - 全文统一改为 `namespace:method`。
  - 将 `ActionScope.resolve('demo.open')` 改为 `ActionScope.resolve('demo:open')`。
  - 将 JSON 示例中的 `{ "action": "demo.open" }` 改为 `{ "action": "demo:open" }`。
- 典型替换：

```markdown
动作通过命名空间组织，例如 `designer:addNode`、`spreadsheet:setCellValue`、`demo:open`。
```

```json
{
  "action": "demo:open",
  "args": { "id": "${id}" }
}
```

### 3. `xui:imports` 的默认行为应从“静默忽略”改为“显式失败并给出诊断”

- 文章位置：`docs/articles/flux-design-introduction.md:193-197`
- 当前问题：文章写的是“宿主未实现 `importLoader` 时，`xui:imports` 会被静默忽略”。当前实现并不是静默忽略：缺少 loader 时，导入注册会失败，并通过 `env.notify('error', ...)` 与 `monitor.onError(...)` 暴露诊断；后续对该 namespace 的 dispatch 会返回显式失败结果。
- 当前依据：`packages/flux-runtime/src/imports.ts:73-115,180-215`、`packages/flux-react/src/node-renderer.tsx:109-135`、`docs/architecture/action-scope-and-imports.md:792-799`
- 修改建议：
  - 将“静默忽略”改成“显式失败并保留错误状态”。
  - 将“宿主通过 importLoader 返回 unload 方法”改成“namespace provider 可选实现 `dispose()`，由运行时在引用计数归零时调用”。
- 可直接替换为：

```markdown
- **幂等性与自动去重**：同一个库在多个层级导入时，模块加载会按规范化后的 import key 去重；scope 侧注册仍按容器生命周期维护引用计数，引用计数归零后释放对应 namespace provider，并在 provider 实现了 `dispose()` 时执行清理。
- **安全性**：`from` 的值必须经过宿主提供的 `env.importLoader` 解析，框架本身不做任意 URL 解析或脚本加载。当前实现下，如果宿主未提供 `importLoader`，导入不会被静默忽略，而是进入显式失败状态，并通过 `env.notify('error', ...)` 与 monitor 诊断暴露接线错误；后续对该 namespace 的调用会返回失败结果。这一行为比静默降级更利于发现宿主接线问题，同时仍然把加载权限控制留给宿主。
```

### 4. `data-source` 小节需要按当前契约重写，删除 `body` 区域叙述

- 文章位置：`docs/articles/flux-design-introduction.md:212-229`
- 当前问题：文章把 `data-source` 描述成“取数并渲染 `body` 区域”的组件。但当前 `DataSourceSchema` 没有 `body` 字段，`data-source` 渲染器本身返回 `null`，只负责请求、写入当前 scope、轮询与错误通知。
- 当前依据：`packages/flux-core/src/types/schema.ts:55-63`、`packages/flux-renderers-data/src/data-source-renderer.tsx:24-136`、`docs/architecture/api-data-source.md:162-224`
- 修改建议：
  - 删除 `body` 区域的 schema 示例。
  - 明确写成“`data-source` 是不直接渲染 UI 的副作用组件”。
  - 将加载态与错误 UI 的职责改写为“由同 scope 的兄弟节点或宿主通知机制承担”。
- 可直接替换为：

```markdown
`data-source` 专门负责声明式数据获取。它是一个不直接渲染 UI 的副作用组件：负责根据 `api` 发起请求、按 `dataPath` 将结果写入当前 scope，并可选地通过 `interval` + `stopWhen` 轮询。它自身返回 `null`，因此 loading skeleton、空态或错误展示通常由同一 scope 下的兄弟节点或宿主通知机制承担。
```

```json
{
  "type": "container",
  "body": [
    {
      "type": "data-source",
      "api": {
        "url": "/api/user/${userId}",
        "includeScope": ["userId"]
      },
      "dataPath": "user",
      "interval": 3000,
      "stopWhen": "${user.loaded}"
    },
    {
      "type": "text",
      "text": "Hello, ${user.name}"
    }
  ]
}
```

### 5. 调试器小节应从“完整内部结构可视化”收敛到“timeline + node inspect 已落地”

- 文章位置：`docs/articles/flux-design-introduction.md:593-598`
- 当前问题：文章把 `nop-debugger` 描述成已经能直接展示 `ActionScope` namespace 列表和 `ComponentHandleRegistry` 内部索引，还暗示支持表达式调试。当前实现已落地的是 compile/render/action/api/notify/error 事件时间线、network 视图、基于 `data-cid` 的节点检查和部分 form state 快照；`ActionScope` 链并未作为稳定 UI 契约暴露，表达式求值面板也是禁用状态。
- 当前依据：`packages/nop-debugger/src/types.ts:3-20`、`packages/nop-debugger/src/controller.ts:54-67,140-157,334-338`、`packages/nop-debugger/src/panel.tsx:1304-1307`
- 修改建议：
  - 把“已直接可视”改成“当前已支持基础 timeline、network 和 node inspect”。
  - 将 `ActionScope` namespace / registry 全量索引检查改写为“后续增强方向”。
  - 明确说明表达式求值在当前调试器里是禁用的。
- 可直接替换为：

```markdown
**开发工具**：`nop-debugger` 当前提供 compile、render、action、api、notify、error 等事件时间线，以及 network 视图和基于 `data-cid` 的节点检查能力。结合组件句柄与表单 store，它已经能够展示部分组件状态与 form state 快照。`ActionScope` namespace 链和 `ComponentHandleRegistry` 的完整内部索引尚未作为稳定的调试 UI 暴露；表达式求值面板当前也保持禁用状态，因此这一部分更适合表述为“已具备基础运行时诊断能力，并保留进一步增强空间”。
```

## 本次不建议修改的前瞻性内容

以下内容更适合继续保留为“设计方向”而不是回写删除：

- `docs/articles/flux-design-introduction.md:44-45` 关于表达式常量折叠的描述。当前 `packages/flux-formula/src/compile.ts:76-157` 尚未实现常量折叠 pass，但这属于编译器优化方向，不必因为尚未落地而回删整段设计动机。

## 实现层面的改进方案

### 1. 修正 `useScopeSelector` 的语义，使其真正反映词法作用域链

- 问题：当前 `useScopeSelector()` 直接对 `scope.readOwn()` 建立订阅，见 `packages/flux-react/src/hooks.ts:49-61`。这与架构文档强调的词法链读取和 selector 订阅不完全一致：子 scope 组件如果依赖父 scope 数据，可能拿到的是非响应式父值，或者被迫在 render 阶段回退到 `scope.get()` 这种非订阅读取。
- 影响：
  - `docs/architecture/renderer-runtime.md:63-67` 的“reactive render path must subscribe”原则被削弱。
  - 报表/设计器等直接 `useScopeSelector((data) => data)` 的组件拿到的是 own snapshot，不是合并后的 lexical view。
  - 词法作用域的“查找语义”和 React 的“响应式语义”出现分叉。
- 改进方案：
  1. 将 `useScopeSelector()` 的快照来源改为 `scope.store?.getSnapshot() ?? scope.read()`，而不是 `scope.readOwn()`。
  2. 保留当前 own-scope 行为，但通过新增 `useOwnScopeSelector()` 显式表达；只有确实要观察当前层 patch 的场景才使用它。
  3. 在 `packages/flux-core/src/types/renderer-hooks.ts` 中同时声明两个 hook，并在 `docs/architecture/renderer-runtime.md` 更新语义说明：
     - `useScopeSelector()` = 订阅词法链可见数据
     - `useOwnScopeSelector()` = 订阅当前层 own snapshot
  4. 审核现有调用点：
     - `packages/report-designer-renderers/src/field-panel-renderer.tsx`
     - `packages/report-designer-renderers/src/inspector-shell-renderer.tsx`
     - `packages/spreadsheet-renderers/*`
     - `packages/flux-renderers-form/src/field-utils.tsx`
     其中真正依赖 lexical 继承的调用保留在 `useScopeSelector()`，只关心当前层 patch 的调用迁移到 `useOwnScopeSelector()`。
  5. 增加回归测试：
     - 子 scope 中的组件可对父 scope 更新做出响应。
     - own-scope selector 不会因父 scope 噪声产生额外重渲染。

### 2. 停止在编译阶段修改原始 schema，对 `_cid` 做纯编译产物化

- 问题：当前 `schema-compiler` 会把 `_cid` 直接写回 `node.schema`，见 `packages/flux-runtime/src/schema-compiler.ts:87-114`。随后 `NodeRenderer` 和表单句柄注册再从 `schema._cid` 读回这个内部字段，见 `packages/flux-react/src/node-renderer.tsx:99-105,198-200`。
- 影响：
  - 破坏“compile 是纯规范化”的边界。
  - 如果同一个 schema 对象被缓存、共享、序列化或用于外部比较，编译副作用会泄漏到调用方。
  - 让调试字段和作者原始输入耦合在一起，不利于后续把 compiled node 与 raw schema 分层。
- 改进方案：
  1. 在 `CompiledSchemaNode` 上新增内部字段，例如 `cid?: number`、`templateId?: string`，由编译器负责填充。
  2. 保持 `node.schema` 为只读原始输入，不再写入 `_cid`。
  3. `rewriteActionTargets()` 继续输出编译后的 action payload，但目标 `_targetCid` 应来自 compiled node map，而不是回写原始 schema。
  4. `NodeRenderer`、`FieldFrame`、`createFormComponentHandle`、debugger DOM 标记统一改为使用 `node.cid`。
  5. 为 compile purity 增加测试：编译前后的原始 schema 对象应保持自有属性不变。
  6. 如果后续需要保留调试可见性，可在 monitor payload 中输出 `cid`，而不是把 `_cid` 混入 schema。

### 3. 将 `data-source` 的请求/轮询/缓存编排下沉到 runtime，避免 React 渲染器承载过多运行时逻辑

- 问题：当前 `data-source` 的核心行为都写在 `packages/flux-renderers-data/src/data-source-renderer.tsx:24-136` 的 effect 中，包括轮询、abort、缓存读取、停止条件判断和 scope 写入；缓存还是模块级 `globalApiCache`。
- 影响：
  - 与项目“runtime-first、React 只是绑定层”的主架构不一致。
  - 模块级缓存天然跨 root/runtime 共享，隔离边界不清晰。
  - `data-source` 无法复用 `request-runtime` 里的去重与请求协调能力，容易形成第二套请求语义。
- 改进方案：
  1. 在 `packages/flux-runtime/src/` 新增独立模块，例如 `data-source-runtime.ts`，负责：
     - 初始写入 `initialData`
     - 请求执行
     - 轮询与停止条件
     - abort 生命周期
     - 缓存命中/写回
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
     - 最小方案：`createRendererRuntime()` 内部持有一个 api cache store。
     - 更完整方案：允许宿主通过 `RendererEnv` 注入 cache policy。
  5. `DataSourceRenderer` 保留当前 `null` 渲染契约，但职责收缩为：创建 controller、在 effect 中 `start/stop`、不再承担请求编排细节。
  6. 增加测试：
     - unmount 会中止轮询
     - `stopWhen` 能终止后续调度
     - 多个 renderer root 之间缓存互不污染
     - 与 `dedupStrategy` 的并发语义一致

### 4. 为 debugger 增加正式的调试快照契约，移除对注册表私有结构的强制类型转换

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
  // ...existing methods
  getDebugSnapshot?(): ComponentHandleRegistryDebugSnapshot;
  getHandleByCid?(cid: number): ComponentHandle | undefined;
}
```

  2. `createComponentHandleRegistry()` 在运行时实现这些方法，debugger 只消费公开调试接口。
  3. 对 `ActionScope` 也提供平行的调试快照，例如 namespace 列表、provider kind、父链信息；不要让 debugger 自己穿透 runtime 内部结构。
  4. 在 `SchemaRendererProps` 中增加 `onActionScopeChange` 或统一的 `onRuntimeDebugRootsChange`，与现有 `onComponentRegistryChange` 对齐。
  5. 等调试契约稳定后，再实现文章里提到的 namespace / registry inspect UI；在那之前不要把它写成既成事实。

### 5. 让 runtime/page 生命周期摆脱 `env` 对象 identity 抖动

- 问题：`SchemaRenderer` 当前按 `props.env` 的引用变化重建 runtime，见 `packages/flux-react/src/schema-renderer.tsx:24-40`。宿主如果每次 render 都创建新 `env` 对象，即使 `fetcher`/`notify` 行为没变，也会导致 page/runtime 重建。
- 影响：
  - 表单与 page 状态可能被非语义性的宿主重渲染打断。
  - 宿主集成方必须额外记住“必须 memoize env”，否则行为脆弱。
  - 这与“root boundary explicit, runtime services stable”的架构目标不完全一致。
- 改进方案：
  1. 在 `SchemaRenderer` 中将 `env` 改为 ref 驱动：runtime 创建一次，最新 `env` 写入 `envRef.current`。
  2. `createRendererRuntime()` 与 `request-runtime` / `action-runtime` / `node-runtime` 改为读取 `getEnv()` 或 `envRef.current`，而不是闭包捕获初始对象。
  3. 将 runtime/page/actionScope/componentRegistry 的创建条件从 `env` identity 中剥离，只在真正的结构性依赖变化时重建。
  4. 增加回归测试：
     - 仅 `env` 外层对象变化时，page/form state 不丢失。
     - `notify`、`monitor`、`importLoader` 更新后，runtime 能看到新实现。
  5. 在完成代码修复前，文档仍应提醒宿主对 `env` 做稳定 memo，但这应被视为临时约束，而不是长期架构要求。

## 建议执行顺序

1. 先改文章中的过时内容，避免继续误导读者理解当前契约。
2. 优先修 `useScopeSelector` 语义与编译期 schema 变异，这两项直接影响核心架构一致性。
3. 再处理 `data-source` 下沉和 debugger 正式调试契约，它们会改善 runtime 边界与可维护性。
4. 最后处理 `env` identity 与 runtime 生命周期的稳定化，这项改动面较大，适合单独回归验证。
