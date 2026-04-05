# 37 Flux 核心运行时架构收敛计划

> Plan Status: planned
> Last Reviewed: 2026-04-05; audited against codebase on 2026-04-05
> Source: `docs/analysis/2026-04-04-flux-architecture-evaluation.md` and `docs/analysis/2026-04-04-lowcode-platform-comparison.md` reviewed against current code anchors on 2026-04-05

## 复审结论

- 两份分析文档里最值得进入 Flux 核心运行时主线的问题，已经可以收敛为 7 条：依赖追踪与选择性失效、action/request/source 热路径编译化、请求合同闭环、first-class source runtime、first-class reaction runtime、最小 action 控制流、公开合同与注册表硬化。
- 当前仓库已经落地了一部分先前被视为缺口的能力，不应在本计划里重复立项：`ActionScope` / `ComponentHandleRegistry` / `xui:import` 已进入主链，`data-source` 生命周期已 runtime-owned，`NodeRenderer` 已完成第一阶段 selector 化，request dedup 粗粒度问题已修正。
- 若干候选项不适合放进 Flux runtime 核心改造主线，应明确排除：视觉编辑器/物料协议/schema migration 属于 loader 或更上层平台；切换到 JavaScript 表达式语法不解决当前主瓶颈；完整 JSON Schema 合规属于 tooling/loader 课题，不是当前 runtime 执行内核的前置项。
- `NodeRenderer` provider 层数收敛、`workbench/` 抽象边界、复杂设计器壳层协议仍然重要，但相对本计划的运行时主线属于次级 follow-up；若它们在执行过程中被证实会直接阻塞本计划目标，也应在本计划内继续承接，而不是回流到任何已完成计划。

## 与现有计划的关系

- `docs/plans/21-node-renderer-selective-subscription-plan.md` 已完成第一阶段 selector 化；本计划继续向下补足 changed-path invalidation，而不是重新讨论是否使用 `useSyncExternalStoreWithSelector`。
- `docs/plans/26-performance-and-completeness-remediation-plan.md` 解决了仓库级 correctness/perf 缺陷；本计划只处理当时保留下来的核心运行时闭环问题。
- `docs/plans/35-form-runtime-performance-and-linkage-implementation-plan.md` 聚焦表单子域；本计划提供它所依赖的共享底座，例如依赖追踪、reaction/source substrate、action 控制流收敛。
- `docs/plans/33-complex-control-platform-convergence-refactor-plan.md` 已标记完成；它在这里仅作为历史背景参考。若后续发现其范围内仍有残留问题会直接阻塞本计划实施，则这些事项应在本计划中补充记录并继续处理，不再回流到 `Plan 33`。

## Problem

- `packages/flux-formula/src/scope.ts` 的 `createFormulaScope()` 只代理读取，不记录访问路径；`packages/flux-formula/src/evaluate.ts` 的 `evaluateLeaf()` 只缓存 `lastValue`，没有依赖集。这使动态值只能在 scope 任何变化后重新执行求值。
- `packages/flux-core/src/types/scope.ts` 中 `ScopeStore.subscribe(listener: () => void)` 没有 change payload；`packages/flux-runtime/src/scope.ts` 中 composite store 只是把 parent/own 通知原样转发，React 层无法判断“这次变化是否与当前节点有关”。
- `packages/flux-react/src/node-renderer.tsx` 和 `packages/flux-react/src/hooks.ts` 虽然已经使用 selector API，但底层订阅仍然是 broad invalidation；`NodeRenderer` 每次 scope 通知仍会重新跑 `resolveNodeMeta()` 和 `resolveNodeProps()`。
- `packages/flux-runtime/src/index.ts` 中 `runtime.evaluate()` 仍然走 ad hoc `compileValue()`；`packages/flux-runtime/src/action-runtime.ts` 的 `args` 求值和 `packages/flux-runtime/src/request-runtime.ts` 的 adaptor 执行也都还在热路径即时 compile。
- `packages/flux-runtime/src/request-runtime.ts` 中 `executeApiObject()` 没有统一调用 `prepareApiData()` 与 `buildUrlWithParams()`；请求 dedup/cache 的 key 仍围绕“原始声明式 `ApiObject`”构建，而不是“最终可执行请求”。
- `packages/flux-renderers-data/src/data-source-renderer.tsx` 现在只从 `props.props` 读取 `api`，但 `dataPath` / `interval` / `stopWhen` / `silent` / `initialData` 仍直接读 `props.schema`，形成半动态模型。
- `packages/flux-core/src/types/actions.ts` 目前只有 `then`、`continueOnError`、`debounce`；`packages/flux-runtime/src/action-runtime.ts` 中 `dispatch()` 是纯串行循环，缺少 `when`、并行、重试、超时等最小 declarative 控制流能力。
- `packages/flux-core/src/types/renderer-core.ts` 暴露了未接线字段：`resolveProps`、`memo`；`packages/flux-core/src/types/renderer-plugin.ts` 的 `priority` 未生效；`ScopePolicy` 的声明面明显大于真实实现；`packages/flux-runtime/src/registry.ts` 会无提示覆盖同名 renderer。
- `packages/flux-renderers-data/src/table-renderer.tsx` 中排序、过滤、分页、选择、展开都用本地 `useState`，当前 runtime 无法清楚地区分哪些状态应该保留本地，哪些状态应该可观察、可控制或可通过 action/handle 驱动。

## Root Cause

- Flux 的 compile-first 主链只对 node `meta/props` 成立，尚未把 action/request/source/watch 这些动态对象纳入同一条编译与失效主线。
- 运行时缺少一套贯穿 `flux-formula`、`ScopeStore`、`NodeRenderer`、`data-source`、未来 `reaction` 的统一 invalidation substrate，因此每一层只能各自做局部缓存，而无法共享“谁依赖了什么、这次到底变了什么”。
- 一些公开合同是在架构方向先行时暴露出来的，但后续实现没有真正接线，导致当前 API 面大于真正稳定的能力面。
- 复杂 renderer 的交互状态是先按普通 React 组件完成可用性，再逐步接入 runtime 的；因此 ownership 规则没有在一开始就被明确固定下来。

## Goals

- 为 Flux 建立“记录依赖 -> 传播 changed paths -> 只让命中依赖的节点/源/观察者失效”的统一运行时基础设施。
- 让 action/request/source/watch 热路径尽可能走 compile once, execute many times，而不是在交互热路径临时 compile。
- 把 `ApiObject`、`data-source`、未来 `reaction` 收敛到同一 runtime-owned 模型，补齐刷新、状态、失效和副作用边界。
- 让 `data-source` / `reaction` 的注册、销毁和依赖失效边界与当前 data scope 对齐：它们语义上属于当前 lexical data scope，但实现上应挂在 runtime-owned、scope-scoped sidecar registry 上，而不是直接扩展 `ScopeRef` 合同。
- 为 action 补齐最小可用的 declarative 控制流能力，但不把 Flux 变成流程引擎。
- 收敛或移除死合同，并让 renderer 注册冲突、plugin 顺序、工具链元数据有明确规则。
- 为复杂 renderer 状态引入显式 ownership 规则，先从 table 这类高价值组件开始，而不是一刀切平台化所有本地状态。

## Non-Goals

- 不把 Flux 改造成 Proxy 自动追踪或 MobX/Formily 式字段对象图系统。
- 不在本计划中切换表达式语法，也不把 `amis-formula` 替换成新的执行引擎。
- 不要求 Flux runtime 立即兼容完整 JSON Schema 生态。
- 不把 action 扩展成完整 DAG/workflow engine，不引入通用脚本编排层。
- 不把所有 renderer 本地状态都上升为 runtime 全局状态。
- 不在本计划中处理视觉设计器协议、物料协议、schema migration、workbench 平台层等上层问题。
- 不为了减少 provider 层数而重新引入 mega context 或把热值重新揉成一个大对象。

## 关键决策

- 第一优先级不是表达式语法，而是依赖追踪与 changed-path invalidation。只要这一层没补齐，其他性能优化都只能做局部止血。
- `reaction` 和 formula-backed `data-source` 是更合适的“字段联动/计算字段”落地方向；不直接引入 Formily 风格 `x-reactions` 运行时。
- `data-source` 和 `reaction` 语义上都属于当前 data scope：它们读取当前 lexical scope，可在当前 scope 发布值或基于当前 scope 触发副作用；但它们不应变成 `ScopeRef` 上的新行为方法，而应落在 runtime-owned、scope-scoped 的 sidecar registry 中，以 `ScopeRef.id` 作为归属键。
- 对于 `materialize()`、`ownKeys()`、动态 key 拼装这类无法安全静态化的访问，依赖收集必须允许退化到 wildcard/full-scope 依赖，而不是为了追求细粒度而牺牲正确性。
- 依赖集不能只在首次执行时收集。每次成功重算后都必须刷新依赖集，否则 `${flag ? a : b}` 这类条件表达式会把旧依赖永久缓存下来，导致正确性回归。
- 已暴露但没有 owner 的公开合同，优先删除或缩窄，而不是继续“先留着以后再实现”。本计划当前判断是：`resolveProps`、`memo` 应删除或降级为内部能力；`RendererPlugin.priority` 应真正接线；`ScopePolicy` 应缩窄到实现中真正存在的语义。
- renderer 注册冲突的第一步应该是“可观测且可控制”，而不是一开始就发明完整包级命名空间体系。最终 schema 的 `type` 仍应保持 loader 决定的最终模型语义。
- action 控制流增强不能只改 `ActionSchema` 和 `action-runtime`；`ActionResult`、monitor payload、debugger/automation 侧的结果格式也必须同步扩展，不允许运行时先长出 `skipped`/`timeout`/`parallel results`，而观察与调试面仍停留在旧模型。
- `data-source` 的 refresh 主语义应先建立在 runtime-owned source registry 上，而不是先把它重新包装成 component handle 问题；必要时可以补 `refreshSource` built-in 或显式 source capability，但不把 source 重新退回“组件实例方法”。
- source/reaction registry 的拥有者应是“当前 data scope 的 runtime sidecar”，不是 page-global bag，也不是 `ScopeRef` 上的新行为接口。推荐模型是 runtime 按 `ScopeRef.id` 分桶管理 source/reaction，注册、调度、失效和销毁都跟随当前 scope 生命周期。
- 第一版 registry 形态优先保持最小化：直接放在 `RendererRuntime` 内部，用 `scopeEntries: Map<scopeId, Map<entryId, Entry>>` 表示 scope-local entries；不要在还没有明确查找瓶颈前就预先引入全局 secondary indexes。
- table ownership 首版必须刻意收窄：先落 `pagination`、`selection` 两类高价值状态，再视效果决定是否扩到 sort/filter/expand，避免把一项规则建设变成整组件重写。

## Scope

- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/api-data-source.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/performance-design-requirements.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
- `docs/logs/`
- `packages/flux-core/src/types/compilation.ts`
- `packages/flux-core/src/types/scope.ts`
- `packages/flux-core/src/types/actions.ts`
- `packages/flux-core/src/types/schema.ts`
- `packages/flux-core/src/types/renderer-core.ts`
- `packages/flux-core/src/types/renderer-plugin.ts`
- `packages/flux-core/src/types/renderer-compiler.ts`
- `packages/flux-formula/src/scope.ts`
- `packages/flux-formula/src/evaluate.ts`
- `packages/flux-formula/src/compile.ts`
- `packages/flux-runtime/src/index.ts`
- `packages/flux-runtime/src/scope.ts`
- `packages/flux-runtime/src/node-runtime.ts`
- `packages/flux-runtime/src/schema-compiler.ts`
- `packages/flux-runtime/src/action-runtime.ts`
- `packages/flux-runtime/src/request-runtime.ts`
- `packages/flux-runtime/src/data-source-runtime.ts`
- `packages/flux-runtime/src/registry.ts`
- 视实现需要新增的 focused runtime modules，例如 `action-compiler`、`request-compiler`、`source-runtime`、`reaction-runtime`
- `packages/flux-react/src/node-renderer.tsx`
- `packages/flux-react/src/hooks.ts`
- 必要时新增 `flux-react` 内部 scope subscription helper
- `packages/flux-renderers-data/src/data-source-renderer.tsx`
- `packages/flux-renderers-data/src/table-renderer.tsx`
- 相关测试文件

## 不在 Scope 内的事项

- 视觉编辑器、物料元数据平台、designer lifecycle 协议。
- loader 层 schema migration、结构继承/覆盖/裁剪。
- 表达式语法迁移到 JavaScript 子集。
- 完整 JSON Schema 标准兼容。
- `workbench/` 平台抽象的继续扩张或复杂控件壳层统一。
- Flow/Report/Word 等复杂设计器的宿主协议收敛。

注：这里的“不在 Scope 内”表示这些方向不是本计划主动推进的主线工作，不表示一旦它们成为阻塞项就永远不处理。若执行过程中确认存在来自已完成计划的残留问题，并且它们直接阻塞本计划目标，则应在本计划内补充记录和承接。

## Execution Plan

**Phase 0 — 基线冻结、测量补齐与合同决策锁定**

Targets: `docs/architecture/*.md`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/hooks.ts`, `packages/flux-runtime/src/request-runtime.ts`, `packages/flux-runtime/src/action-runtime.ts`, related tests

- 先补一轮实现前基线测试与计数器，覆盖 3 个热点：无关 scope 变更下的 `NodeRenderer` 重算次数、request 执行链的 prepare/adaptor 语义、action 热路径 compile 次数。
- 建立最小 benchmark 基线：50+ 节点页面或等价测试夹具下，更新单个 scope key，记录 selector 执行次数、`resolveNodeMeta/resolveNodeProps` 调用次数、最终重渲染节点数。
- 把本计划里的合同决策固定下来，并写入文档与测试名词中：
- `changed-path invalidation`
- `compiled action/request/source path`
- `source/reaction runtime`
- `renderer registration collision policy`
- 明确删除/实现决策：
- `RendererDefinition.resolveProps`：默认删除，不再继续暴露未接线能力。
- `RendererDefinition.memo`：默认删除，不新增“看起来支持、实际无效”的 surface。
- `RendererPlugin.priority`：实现排序，不继续悬空。
- `ScopePolicy`：缩窄到实现存在的语义，不为未实现枚举补假能力。
- `ActionResult` / action monitor / debugger summaries：在 action 控制流阶段同步扩展，不允许只在运行时内部偷长字段。
- 明确模块放置规则：新增逻辑优先进入 focused runtime module，不把 `packages/flux-runtime/src/index.ts`、`action-runtime.ts`、`request-runtime.ts` 继续膨胀成总控文件。

Exit criteria: 有稳定的前置基线和合同决策，不再边实现边重新争论哪些字段应保留、哪些字段应删除。

**Phase 1 — 依赖收集与 `ScopeChange` 基础设施**

Targets: `packages/flux-core/src/types/compilation.ts`, `packages/flux-core/src/types/scope.ts`, `packages/flux-formula/src/scope.ts`, `packages/flux-formula/src/evaluate.ts`, `packages/flux-runtime/src/scope.ts`, related tests

- 在 `LeafValueState` 中加入依赖记录能力，至少支持：
- 精确 path 列表
- wildcard/full-scope 依赖标记
- 上次执行是否使用了 broad access
- 扩展 `createFormulaScope()`，在 `get`、`has`、必要时 `ownKeys`/`materialize` 路径上记录访问。
- 对无法安全细化的访问模式退化为 wildcard，而不是伪造错误的窄依赖。
- 依赖集的刷新规则必须明确：不是只在首次执行时记录。每次成功执行动态值后，都要用本次 collector 结果覆盖旧依赖集；只有这样才能正确支持条件分支、短路表达式和依赖随数据变化的场景。
- 为 `ScopeStore` 引入 change payload，例如：

```ts
interface ScopeChange {
  paths: readonly string[];
  sourceScopeId?: string;
  kind?: 'update' | 'merge' | 'replace';
}
```

- `ScopeRef.update(path, value)` 上报精确 path。
- `merge(data)` 至少上报顶层 keys；如果某次更新无法可靠枚举，则显式退化为 `['*']`。
- `createCompositeScopeStore()` 需要保留 parent/own 来源信息，而不是把父子变化都折叠成匿名通知。
- 增加 path 命中规则测试：
- 依赖 `user` 时，`user.name` 变化必须命中。
- 依赖 `user.name` 时，整段 `user` 替换必须命中。
- wildcard 依赖在任意变化下都必须失效。
- 依赖切换测试必须覆盖：`${flag ? a : b}` 在 `flag` 切换后，依赖集从 `['flag', 'a']` 正确切到 `['flag', 'b']`。

Exit criteria: runtime 已经能回答两个问题：“上次这个动态值读了哪些 path？”、“这次 store 变化到底改了哪些 path？”。

**Phase 2 — `NodeRenderer` 选择性失效与 React 边界收敛**

Targets: `packages/flux-core/src/types/renderer-compiler.ts`, `packages/flux-runtime/src/node-runtime.ts`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/hooks.ts`, related tests

- 在 node runtime state 中分别缓存 meta 与 props 的依赖集合，而不是只缓存 resolved result。
- `NodeRenderer` 订阅层基于 `ScopeChange.paths` 与节点依赖集做交集判断；只有命中依赖时才继续跑 `resolveNodeMeta()` / `resolveNodeProps()`。
- 保持当前 identity reuse 行为：命中依赖但计算结果不变时，仍应复用原引用。
- 当前 `useScopeSelector()` 保持兼容语义，不在本阶段强行自动追踪任意 selector 函数。
- 如果 profile 证明 child hook 本身成为新热点，再补充显式 path-based hook（如 `useScopePath` / `useScopePaths`）而不是改变 `useScopeSelector` 的心智模型。
- 扩展已有回归测试：
- 无关 path 变化不会触发无关节点的 meta/props 重算。
- 父 scope 变化仍能正确命中子节点真正依赖的 path。
- wildcard 依赖节点仍保持保守正确性。

Exit criteria: `NodeRenderer` 不再因为 scope 任意变化而全体重跑解析逻辑，P1 性能收益能够通过测试或计数器验证。

**Phase 3 — 动态执行主干编译化与请求合同闭环**

Targets: `packages/flux-core/src/types/actions.ts`, `packages/flux-core/src/types/schema.ts`, `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-runtime/src/action-runtime.ts`, `packages/flux-runtime/src/request-runtime.ts`, `packages/flux-runtime/src/index.ts`, related tests

- 把 action payload、`api`、`when`、adaptor 等热路径动态对象纳入编译主线，而不是在 dispatch/request 时临时 `compileValue()`。
- `executeApiObject()` 收敛为唯一执行主路径，顺序固定为：
- 评估编译后的请求配置
- 合并 `includeScope`
- 生成最终 `params` URL
- 执行编译后的 `requestAdaptor`
- 进入 fetch/dedup/cache
- 执行编译后的 `responseAdaptor`
- 返回最终结果
- dedup/cache key 改为基于“最终可执行请求语义”构造，而不是仅基于原始声明式 `ApiObject`。
- `runtime.evaluate()` 继续保留为 ad hoc escape hatch，但 action/request/source 热路径不再依赖它。
- 保留 action top-level payload 的兼容语义，即 `{ action: 'demo:open', id: '${id}' }` 仍可工作，但内部应走统一编译结果而不是每次临时解析。
- 这一阶段的细分交付建议固定为两个子切片：
- Phase 3A：request 主链闭环（`includeScope` / `params` / adaptor / dedup key）
- Phase 3B：action/request/source 热路径编译化

Exit criteria: action/request 热路径 compile 次数明显下降，`ApiObject` 的声明能力与真实执行链一致，`executeApiObject()` 不再绕过 `includeScope` 与 `params` 语义。

**Phase 4A — First-Class Source Runtime**

Targets: `packages/flux-core/src/types/schema.ts`, `packages/flux-runtime/src/data-source-runtime.ts`, `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-runtime/src/index.ts`, `packages/flux-renderers-data/src/data-source-renderer.tsx`, new runtime source/reaction modules, related docs/tests

- 把 `DataSourceSchema` 从“仅 API-backed”扩展为 `formula` / `api` 两类 producer，和 `docs/architecture/api-data-source.md` 保持一致。
- `dataPath`、`interval`、`stopWhen`、`silent`、`initialData` 应与 `api` 一样进入统一的动态求值路径，不再形成 `props.props + props.schema` 的半动态模型。
- 建立 runtime-owned source registry：
- registry 必须按 `ScopeRef.id` 分桶，而不是只做 page-global source map。
- source start/stop/refresh 生命周期
- loading/error/stale 等最小状态面
- source id/path 到 controller 的稳定映射
- source 注册到“当前 data scope 的 runtime sidecar”；source 读取按当前 lexical scope 解析，写回也默认落到当前 scope 的 `dataPath`。
- 子 scope 销毁时，对应 scope bucket 内的 source controller 必须一并 dispose，不能残留为悬挂异步任务。
- 为 source refresh 建立显式语义，不再依赖 `refreshTable -> page.refresh()` 这类间接行为。
- 第一版刷新语义建议固定为 runtime-owned source registry + 显式 `refreshSource` built-in；如后续确有必要，再补 source capability 暴露，但这不是首版主路径。
- 第一版内部结构草案：

```ts
interface RuntimeSourceEntry {
  id: string;
  ownerScopeId: string;
  ownerNodeId: string;
  scope: ScopeRef;
  kind: 'formula' | 'api';
  controller: DataSourceController;
  dispose(): void;
}

interface RuntimeSourceRegistry {
  scopeEntries: Map<string, Map<string, RuntimeSourceEntry>>;
}
```

- `scopeEntries` 的第一层 key 是 `ScopeRef.id`。
- `entryId` 默认使用稳定的 `node.id`，必要时可退化到 `node.path`。
- 推荐在 `RendererRuntime` 上新增 `registerDataSource(...)`，而不是继续把最终模型固定为 `createDataSourceController(...)`：

```ts
interface DataSourceRegistration {
  id: string;
  controller: DataSourceController;
  dispose(): void;
}
```

- `DataSourceRenderer` 保持 `null` renderer，但改为 `register -> controller.start() -> dispose` 的 lifecycle，而不是自行拥有 source 语义。
- 现有 `createDataSourceController(...)` 可以在过渡期保留为兼容入口，但内部应逐步改为基于 registry entry 构建，而不是继续作为长期主接口。

Exit criteria: Flux 有统一的 source substrate，`data-source` 不再只是 API null renderer 的特例，source refresh 与 source 状态是 runtime 一等公民。

**Phase 4B — First-Class Reaction Runtime**

Targets: `packages/flux-core/src/types/schema.ts`, `packages/flux-runtime/src/schema-compiler.ts`, new `packages/flux-runtime/src/reaction-runtime.ts` or equivalent focused module, runtime assembly, related docs/tests

- 新增 `reaction` first-class runtime 节点，复用同一 dependency substrate，至少支持：`watch`、`when`、`immediate`、`debounce`、`once`、`actions`。
- reaction 注册到当前 data scope 的 runtime sidecar 中，与 source 共享同一 scope bucket 和依赖索引，但不共享“发布值”的语义。
- reaction 调度必须发生在相关 state write settle 之后，而不是与写入交错执行。
- 必须具备 loop guard、per-cycle dedupe、depth guard，避免 reaction 自触发递归。
- reaction 的执行上下文默认就是注册它时所在的当前 scope；它可以观察该 scope 可见的数据，也可以通过 action 修改该 scope 或其显式目标，但自身不向 scope 发布值。
- 对表单“计算字段/联动”问题，优先通过 formula-backed `data-source` + `reaction` 落地，而不是引入表单私有 effect DSL。
- 第一版内部结构草案：

```ts
interface RuntimeReactionEntry {
  id: string;
  ownerScopeId: string;
  ownerNodeId: string;
  scope: ScopeRef;
  stop(): void;
  dispose(): void;
}

interface RuntimeReactionRegistry {
  scopeEntries: Map<string, Map<string, RuntimeReactionEntry>>;
}
```

- 为保持与 `data-source` 一致，第一版 `reaction` 建议继续走 `null` renderer + runtime registration，而不是额外发明独立于 renderer tree 的 mount 通道。
- 推荐在 `RendererRuntime` 上新增 `registerReaction(...)`，返回最小 registration handle；registration 一经建立即进入 active watch 状态，unmount 时 `dispose()`。
- 只有在后续确认 reaction 需要脱离 renderer tree 独立存在时，才考虑更重的 runtime scheduler surface；第一版不预先扩大公开 API。

Exit criteria: Flux 有统一的 watch/effect substrate，字段联动和计算值开始有通用而克制的 runtime 承载模型。

**Phase 5 — Action 最小控制流增强**

Targets: `packages/flux-core/src/types/actions.ts`, `packages/flux-runtime/src/action-runtime.ts`, `packages/nop-debugger/src/*`, related docs/tests

- 在 `ActionSchema` 中增加最小必要字段：`when`、`parallel`、`retry`、`timeout`。
- `when` 是 precondition，不满足时返回结构化 skipped/cancelled 结果，而不是静默 no-op。
- `parallel` 第一版只做 `Promise.all` 语义，不做 DAG 和图调度。
- `retry` 先支持固定次数与固定延迟；指数退避和 fallback policy 放到后续独立计划。
- `timeout` 要求与可中断 action（尤其 request）协同；对不可中断 action，不能假装已经真正取消。
- 保持现有监控语义：每个 action 仍可单独观测，`prevResult`、`continueOnError`、debounce、plugin `beforeAction` 不失效。
- 同步扩展 `ActionResult` 与 action monitor/debugger 语义，至少明确：`skipped`、`timedOut`、`results`（parallel 聚合结果）等字段的可观察表示，不让 runtime 和调试面分叉。

Exit criteria: 常见低代码工作流已经能声明条件执行、并行请求、有限重试和超时控制，而无需把这些能力回退到宿主 imperative 代码。

**Phase 6 — 合同清理、注册表硬化与 renderer 元数据协议**

Targets: `packages/flux-core/src/types/renderer-core.ts`, `packages/flux-core/src/types/renderer-plugin.ts`, `packages/flux-core/src/types/schema.ts`, `packages/flux-runtime/src/registry.ts`, runtime assembly, related docs/tests

- 删除或缩窄未接线 surface：`RendererDefinition.resolveProps`、`RendererDefinition.memo`、超出实现范围的 `ScopePolicy` 枚举值。
- plugin 列表在 runtime/schema compiler 入口统一按 `priority` 排序，并规定相同优先级时保持原始声明顺序稳定。
- 为 renderer registry 增加冲突策略：
- 默认至少 warning/fail-fast，而不是静默覆盖
- 保留显式 override 通道，避免完全堵死宿主定制能力
- 为 `RendererDefinition` 增加可选工具链元数据：`displayName`、`icon`、`category`、`defaultSchema`、`propSchema`、必要时 `sourcePackage` 或等价诊断字段。
- 这里的元数据是 runtime 事实来源的一部分，不另起平行 manifest 协议。

Exit criteria: 公开合同与真实实现重新对齐，plugin 顺序可预测，renderer 冲突可观测，tooling/loader/AI 获得稳定的 renderer 元数据来源。

**Phase 7 — 复杂 renderer 状态 ownership 规则与首个落地样板**

Targets: `packages/flux-renderers-data/src/table-renderer.tsx`, affected docs/tests

- 在文档中固定 3 种 ownership：`local`、`controlled`、`scope/runtime-observed`。
- 以 table 为首个样板重新划分：
- 纯视觉/短生命周期状态可继续 `local`
- 需要被 schema/action/host 观察和驱动的查询态应转为 `controlled` 或 scope-backed
- refresh/selection 等实例能力优先通过 component handle 或明确 action 面暴露
- 首版范围明确收窄为 `pagination` 与 `selection`；`sort` / `filter` / `expand` 继续保留 `local`，待首版 ownership 模型验证稳定后再决定是否扩展。
- 如需 schema 面声明，建议采用窄配置而不是一次性开放所有状态位，例如 `paginationOwnership`、`selectionOwnership` 或等价小字段；不要一开始就引入大而全的 table state DSL。
- 配套测试应覆盖 `local` 与 `controlled` 的切换、`pagination`/`selection` 的首版 scope-backed 行为、refresh capability、外部 action 驱动与内部交互一致性。

Exit criteria: Flux 对复杂 renderer 状态不再只有“全本地 state”一种默认处理方式，后续组件扩展有清晰规则可循。

## Effort

- 预计 15-25 个工作日。
- 建议拆成 8 个独立执行切片，每个切片单独提交或单独 PR。
- Phase 1-2 是最高优先级主线，必须先完成；Phase 3 和 Phase 4A 是 runtime 闭环主线；Phase 4B-7 可以在前述基底稳定后分块推进。

## Risks And Rollback

- 依赖追踪若错误地把 dynamic/full-scope 访问当成精确 path，会导致漏刷新。第一版必须允许 wildcard 退化，宁可保守失效也不能错过正确更新。
- 若依赖集只在首次执行时收集，会在条件分支/短路表达式下产生漏刷新；实现时必须把“依赖集随每次成功执行刷新”作为 correctness invariant 固定下来。
- 请求编译化会触碰现有 action/ajax/submit/data-source 共享路径，必须靠分阶段测试与兼容 authoring shape 控制风险。
- `reaction` 容易引入循环和隐式副作用；没有 loop guard、depth guard、post-commit scheduling 之前不得扩 scope。
- 若 source/reaction registry 不按 `ScopeRef.id` 建模而是直接 page-global 化，嵌套 scope 的销毁、shadowing 和 changed-path 解释都会变得含糊；因此实现时必须把“scope-scoped sidecar registry”作为结构前提，而不是后补优化。
- renderer 冲突从“静默覆盖”改成“可观测/失败”可能暴露现有宿主装配问题；建议先在开发与测试环境 fail-fast，再视仓库现状决定生产默认策略。
- action 结果合同扩展若不同步 debugger/automation，会出现“功能已生效但诊断错误归类”的回归；因此 Phase 5 必须包含观察面同步。
- 每个 phase 都应可独立回退，不做跨 4 个以上包的大爆炸提交。

## Verification

分阶段验证优先，最终再做全仓验证。

```bash
pnpm --filter @nop-chaos/flux-core typecheck
pnpm --filter @nop-chaos/flux-core build
pnpm --filter @nop-chaos/flux-core lint
pnpm --filter @nop-chaos/flux-core test

pnpm --filter @nop-chaos/flux-formula typecheck
pnpm --filter @nop-chaos/flux-formula build
pnpm --filter @nop-chaos/flux-formula lint
pnpm --filter @nop-chaos/flux-formula test

pnpm --filter @nop-chaos/flux-runtime typecheck
pnpm --filter @nop-chaos/flux-runtime build
pnpm --filter @nop-chaos/flux-runtime lint
pnpm --filter @nop-chaos/flux-runtime test

pnpm --filter @nop-chaos/flux-react typecheck
pnpm --filter @nop-chaos/flux-react build
pnpm --filter @nop-chaos/flux-react lint
pnpm --filter @nop-chaos/flux-react test

pnpm --filter @nop-chaos/flux-renderers-data typecheck
pnpm --filter @nop-chaos/flux-renderers-data build
pnpm --filter @nop-chaos/flux-renderers-data lint
pnpm --filter @nop-chaos/flux-renderers-data test

pnpm typecheck
pnpm build
pnpm lint
pnpm test
```

## Acceptance Criteria

- [ ] 无关 scope path 变化不再触发无关节点的 meta/props 重算。
- [ ] `ScopeStore` 变更通知能够携带 changed paths，且 parent/child scope 传播语义可验证。
- [ ] 条件表达式或短路表达式在依赖切换后会刷新依赖集，不存在“只首轮依赖生效”的错误缓存。
- [ ] action/request/source 热路径不再依赖 ad hoc `compileValue()`。
- [ ] `executeApiObject()` 统一兑现 `includeScope`、`params`、request/response adaptor 语义。
- [ ] source registry 与 `refreshSource` 语义明确，`data-source` 的动态输入不再是半动态模型。
- [ ] source/reaction 以 `ScopeRef.id` 为归属注册到当前 data scope 的 runtime sidecar，子 scope 销毁时对应注册项可正确释放。
- [ ] 第一版 source/reaction registry 以 `RendererRuntime` 内部 `scopeEntries` 形式落地，不依赖 page-global bag 或 `ScopeRef` 行为扩展。
- [ ] `reaction` 与 source 共享同一依赖与失效底座，并具备 loop guard / dedupe / post-commit scheduling。
- [ ] action 具备最小可用的 `when` / `parallel` / `retry` / `timeout`，且 `ActionResult`/monitor/debugger 语义同步更新。
- [ ] `RendererDefinition`/`RendererPlugin`/`ScopePolicy` 公开合同与真实实现重新对齐。
- [ ] renderer 注册冲突不再静默覆盖，renderer 元数据有稳定事实来源。
- [ ] 至少一个复杂 renderer 的状态 ownership 完成显式化落地，且 table 首版覆盖 `pagination` 与 `selection`。

## Deferred Follow-Ups

- JSON Schema 标准化与相关 tooling 生态接入。
- 表达式语法迁移或自有 AST/求值器替换。
- provider 深度收敛与 context shape 优化。
- workbench/designer-specific 抽象边界继续清理。
- 更完整的 query/mutation 平台与资源模型。
- 若执行过程中暴露出来自已完成计划的残留问题，但这些问题当下不阻塞本计划主线，也在这里继续登记，而不是回流到旧计划。
