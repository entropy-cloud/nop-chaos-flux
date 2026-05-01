# 38 Action / Api / Source 收敛迁移计划

> Plan Status: completed
> Last Reviewed: 2026-04-07
> Source: `docs/discussions/2026-04-06-action-api-design-evolution.md`

## Purpose

本计划用于把最新讨论中已经确认的 action / api / source 设计结论，逐步迁移到文档、核心类型、运行时实现、示例与测试中。

本计划不重复讨论概念取舍，而是把已经确认的结论拆解为可执行迁移任务。

## 已确认结论

- `ActionSchema` 是所有执行动作的基础描述。
- `SourceSchema` 是 `ActionSchema` 的值消费扩展，采用内联 `type: 'source'` 形式。
- `DataSourceSchema` 是 `SourceSchema` 的命名/调度扩展，用于命名发布、刷新、调度和复用。
- 字段值保留三种一级约定：静态值、`${expr}`、`type: 'source'`。
- 请求 authoring contract 与 fetcher-facing executable request 需要命名区分：`ApiSchema` / `ExecutableApiRequest` / `PreparedApiRequest`。
- request coordination 不属于 transport contract，应从请求声明中上移到 `Operation Control`。
- 事件入口在 authoring 层只接受一个根 `ActionSchema` 对象。
- 内置 action 采用 camelCase 动宾式命名，例如 `openDialog`、`closeDialog`、`openDrawer`、`showToast`。
- `component:<method>` 与 `namespace:method` 保留其现有语义，不与 built-in 混用。
- `xui:imports` 是统一导入机制，同时投影到：
  - action dispatch: `namespace:method`
  - expression binding: `$alias`

## Goals

- 统一 action/source/data-source 的 authoring contract 与核心类型命名。
- 把请求 transport contract 与执行控制 contract 解耦。
- 让字段级匿名动态值、命名资源节点、普通 action 共享尽可能多的执行结构。
- 收敛内置 action 命名与示例风格，消除旧的 `dialog` / `toast` / `dialog:close` 混用形式。
- 补齐 source/data-source 的状态、调度、值消费和调试可观测性边界。
- 形成一条从文档到类型到运行时再到测试的闭环迁移路径。

## Non-Goals

- 不在本计划中重新设计整个表达式引擎。
- 不在本计划中引入完整工作流/流程编排语言。
- 不在本计划中处理所有 renderer 的字段 metadata 重构，只覆盖被本迁移直接影响的字段解释规则。
- 不在本计划中处理 loader、权限裁剪、结构装配、设计器平台层协议等更上层议题。

## Target Documents And Modules

### Docs

- `docs/architecture/api-data-source.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/action-algebra-formal-spec.md`
- `docs/references/flux-json-conventions.md`
- `docs/examples/` 下受影响示例
- `docs/logs/`

### Types And Runtime

- `packages/flux-core/src/types/schema.ts`
- `packages/flux-core/src/types/actions.ts`
- `packages/flux-core/src/types/renderer-core.ts`
- `packages/flux-runtime/src/request-runtime.ts`
- `packages/flux-runtime/src/action-runtime.ts`
- `packages/flux-runtime/src/data-source-runtime.ts`
- `packages/flux-runtime/src/index.ts`
- 需要时新增 focused module，例如 `source-runtime.ts` 或 `operation-control.ts`

## Migration Strategy

### Phase 0: Decision Freeze And Terminology Lock

Objective:
冻结术语和最新讨论结论，避免后续实现过程中反复回退到旧命名。

Tasks:

- 确认 `ApiSchema` / `ExecutableApiRequest` / `PreparedApiRequest` 命名。
- 确认 `ActionSchema -> SourceSchema -> DataSourceSchema` 的关系表达。
- 确认 built-in action 命名规则。
- 确认事件入口的单根 `ActionSchema` authoring 规则。

Deliverables:

- 文档术语一致性检查表。
- 需要废弃的旧术语清单：`ApiObject` 作为 authoring contract、`dialog` 旧 payload 形式、`toast` 旧命名、事件根 list 等。

Validation:

- 所有目标架构文档使用同一组术语。
- 不再新增与已确认术语冲突的新文案。

### Phase 1: Core Type Contract Rewrite

Objective:
先改 `flux-core` 类型合同，使运行时和文档有统一目标。

Tasks:

- 将 `ApiObject` 的 authoring 含义迁移为 `ApiSchema`。
- 新增 `ExecutableApiRequest` 类型。
- 明确 `PreparedApiRequest` 的内部职责。
- 为 `ActionSchema` 补齐 `control` 合同。
- 定义 `SourceSchema`：`type: 'source'` + `ActionSchema` 扩展。
- 让 `DataSourceSchema` 在类型层表达为 `SourceSchema` 的命名/调度扩展。
- 将 `ReactionSchema.actions` 的 authoring contract 收敛到单根 `ActionSchema`。

Deliverables:

- 更新后的 `schema.ts` / `actions.ts` 类型定义。
- 对外导出整理后的命名集合。

Validation:

- 类型层不存在“一个名字同时指 authoring contract 和 executable request”的歧义。
- 类型层能够表达内联 `type: 'source'`。

### Phase 2: Request Runtime Split

Objective:
让 request-runtime 真正兑现新命名和 contract split。

Tasks:

- 将 `executeApiObject(...)` 迁移或别名到 `executeApiSchema(...)` 语义。
- 让请求准备过程显式返回 `PreparedApiRequest`，其 `request` 为 `ExecutableApiRequest`。
- 移除 transport contract 对 cache/dedup 的耦合依赖。
- 把 retry/timeout/dedup/cache 迁移到更明确的 `Operation Control` 载体。
- 梳理 fetcher 接口是否继续接收 `ApiObject` 命名，或切换为 `ExecutableApiRequest`。

Deliverables:

- request runtime 命名与 contract 分层闭环。
- request monitor 和 debugger 看到的对象与最终 executable request 一致。

Validation:

- `params` canonicalization、`requestAdaptor`、`responseAdaptor` 相关测试全部通过。
- dedup/cache key 基于 executable request，而不是 declarative schema。

### Phase 3: Action Runtime Convergence

Objective:
让 action/source 在运行时执行路径上共享更多结构，而不是只在文档层统一。

Tasks:

- 保持 `action: string` 为统一 selector。
- built-in action 命名切换到 camelCase 动宾式。
- 规范 built-in / component / namespace 三类分派路径。
- 为 source 执行增加“值消费”语义层，而不是仅返回 effect-oriented `ActionResult`。
- 评估 source 是否直接复用完整 action graph：`then` / `onError` / `parallel`，并定义值消费时的具体解释。
- 明确 source 的局部状态面：`loading` / `error` / `stale` / `value`。

Deliverables:

- action runtime selector 分类规则。
- source 执行闭环。
- built-in action 兼容或迁移映射清单。

Validation:

- source 可以执行 `ajax` 或 `namespace:method` 并产出字段值。
- 匿名 source 的状态可被消费者使用。

### Phase 4: DataSource Runtime Upgrade

Objective:
让 `data-source` 真正成为 named + scheduled source，而不是旧式平行设计。

Tasks:

- 在 runtime 中表达 `DataSourceSchema` 继承 `SourceSchema` 的执行能力。
- 保留并明确 `name` / `dataPath` / `statusPath` / `interval` / `stopWhen` / `mergeStrategy` 等额外能力。
- 定义 source 与 data-source 的状态差异：
  - source 为局部消费状态
  - data-source 为命名资源状态与调度状态
- 统一 `refreshSource`、显式 targeting、缓存策略和状态 DTO 设计。

Deliverables:

- 运行时 data-source/source 的共享主链。
- 调度与发布边界的清晰实现说明。

Validation:

- 命名 data-source 可显式刷新。
- 匿名 source 不需要命名绑定也能正确重算和显示状态。

### Phase 5: Import And Expression Projection Alignment

Objective:
让统一的 `xui:imports` 同时服务 action dispatch 和 expression binding。

Tasks:

- 文档和实现明确 `$alias` 表达式绑定规则。
- 统一 `namespace:method` 与 `$alias.func(...)` 的来源。
- 校验 import loader、scope visibility、shadowing、错误诊断在这两类投影上的一致性。

Deliverables:

- import dual-projection 规则文档与运行时契约。
- 导入库在 action/source/expression 三条路径上的示例。

Validation:

- 导入库既可被 action 调用，也可被表达式读取。
- 子树 import shadowing 规则不冲突。

### Phase 6: Authoring And Example Cleanup

Objective:
清理文档、示例和约定中的旧写法。

Tasks:

- 将 `dialog` / `toast` / `dialog:close` 等旧示例迁移到 `openDialog` / `showToast` / `closeDialog`。
- 将顶层 payload 风格迁移到 `args`。
- 将事件根 action list 迁移为单根 `ActionSchema`。
- 增补 `type: 'source'` 示例。
- 更新 playground schema 和 docs/examples 中的代表性样例。

Deliverables:

- docs/examples 更新。
- JSON conventions 中的新规范示例。

Validation:

- `docs/` 下不再出现被判定为旧规范的 action 命名和入口形式，除非明确标注为 legacy。

### Phase 7: Validation And Regression Coverage

Objective:
为迁移后的 contract 建立最小充分测试面。

Tasks:

- 为 `ApiSchema` -> `ExecutableApiRequest` 准备链增加测试。
- 为 source/data-source/action 共用执行路径增加测试。
- 为 source 局部状态、select options loading、error 展示增加测试。
- 为 `xui:imports` 的 action/expression 双投影增加测试。
- 为 built-in action 新命名和旧命名兼容策略增加测试（若保留兼容层）。

Deliverables:

- 单测与集成测试更新。
- 回归清单。

Validation:

- 新 contract 有测试覆盖。
- 旧 contract 若保留兼容层，有明确退役路径。

## Cross-Cutting Design Questions

这些问题在实施时必须保持显式记录，不得在代码中隐式漂移：

- source 复用完整 action graph 时，`then` 的语义到底是 effect continuation 还是值变换链，还是两者并存。
- source 局部状态如何暴露给消费者：通过字段 metadata、resolved props、还是统一 status object。
- data-source 与 source 的调度边界：哪些 control 是共享的，哪些只属于命名资源。
- 是否保留旧 built-in 名称的兼容别名，以及退役时间表。
- `reaction.actions` 在 authoring 层收敛为单根对象后，运行时是否仍保留 list convenience overload。

## Validation Checklist

在计划完成前，至少满足：

- [x] `ApiSchema` / `ExecutableApiRequest` / `PreparedApiRequest` 三层命名在文档和类型中一致。
- [x] `ActionSchema` / `SourceSchema` / `DataSourceSchema` 关系在文档和类型中一致。
- [x] `type: 'source'` 可以在字段值中表达匿名执行型动态值。
- [x] built-in action 命名统一为 camelCase 动宾式。
- [x] 事件入口 authoring 只保留单根 `ActionSchema`。
- [x] action/source/data-source 共享的 `api` / `args` / `control` 结构在文档与代码中一致。
- [x] import dual projection (`namespace:method` + `$alias`) 文档与实现一致。
- [x] 示例、测试、调试面同步更新。

## Suggested Execution Order

1. 先锁术语和类型。
2. 再改 request runtime。
3. 再做 action/source/data-source runtime convergence。
4. 最后统一示例、文档、测试和调试能力。

## Risks

- 只改文档不改类型，后续实现会再次回到旧命名。
- 只改类型不改 request runtime，`ApiSchema` / executable request 仍会混淆。
- 只把 source 统一到 action 结构，但不定义值消费与状态语义，会导致 source 运行时行为继续暧昧。
- built-in action 改名后如果没有清晰兼容策略，现有示例和测试会大量漂移。
- source 全量复用 action graph 如果没有明确值语义，会把字段值生产误写成 effect workflow。

## Exit Criteria

本计划完成时，应达到：

- 作者能够清楚地区分声明式 request schema、可执行请求对象、匿名 source、命名 data-source。
- 事件动作、source 值、命名 data-source 共享一套足够统一但语义边界清楚的 authoring 结构。
- 内置 action、组件动作、命名空间动作三类 selector 规则稳定且无歧义。
- 文档、类型、运行时、示例、测试之间不再相互矛盾。
