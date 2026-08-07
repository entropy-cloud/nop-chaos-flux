# 1 CRUD/data 域 P2 修复（polling/refreshing/加载路径/pagination + crud 死导出与文档漂移）

> Plan Status: completed
> Mission: component-audit
> Work Item: P2-backlog:crud-data
> Last Reviewed: 2026-08-07
> Source: `docs/audits/2026-08-07-1747-open-audit-component-audit.md`（2-1/2-2/2-4 部分/2-8/2-9/2-10/2-11）、`docs/audits/2026-08-07-1747-multi-audit-component-audit.md`（16-2/16-3）
> Related: `docs/plans/2026-08-07-1747-2-form-data-p1-remediation.md`（completed，本批 P2 与 1-1/1-2/1-3 同源同域）、`docs/plans/2026-08-07-0421-3-file-structure-and-ownership-doc-governance.md`（completed，crud-renderer-load.ts 拆分出处）

## Purpose

把 `docs/backlog/component-audit-roadmap.md` Follow-up Backlog「2026-08-07-1747 两轮审计 P2」中 **data 域（crud + pagination）** 的 9 条 P2 收口：CRUD scope 契约真实性（`polling.stopWhen` 零消费者、`$crud.refreshing` 硬编码 false）、CRUD 加载路径健壮性（自定义 state path 双 fetch、infinite 失败重试跳页、polling 挂载序竞态）、pagination 渲染期 clamp、crud 侧死导出清理，以及 2 条 crud 文档漂移。全部为已确认 live 缺陷或契约面 > 实现面问题（无 P0/P1）。

## Current Baseline

- **crud.polling.stopWhen 声明但零消费者**（2-1，确定）：`crud-schema.ts:36` `CrudPollingConfig.stopWhen?: string` + `data-renderer-definitions.ts:333` 注册 prop；全仓生产代码零读取（data-source 侧 `stopWhen` 是另一类型——`packages/flux-runtime/src/async-data/source-registry.ts:155` 透传编译态 `CompiledRuntimeValue<boolean>`，CRUD 侧为 string）。`crud/design.md:352` 称「interval/stopWhen 由上游 data-source 配置」——schema 作者配置后静默无效。
- **`$crud.refreshing` 硬编码 false**（2-2，确定）：`crud-renderer.tsx:209`（summary 对象）`refreshing: false` 恒值；`crud-schema.ts:238` 声明该字段；footer/statistics 消费 `$crud.refreshing` 永为 false，刷新中态无法表达。
- **CRUD 自定义 state path 双 fetch**（2-8，很可能）：`crud-renderer-load.ts` `__setIgnoreWritesTo` ignore 列表（live 在 :208-215）只覆盖 ownerStatePath 等；`paginationStatePath` 自定义路径（`crud-lifecycle.test.tsx:467` 同款）每次变更同时触发 reactive force() dispatch + imperative load effect dispatch（:346-350，server-correction 注释 :358-364 自认「at most 1 extra fetch」）——自定义路径是**每次**。修复方向：ignore 列表补 `paginationStatePath` 后 reactive force() 通道被抑制，存活的是 imperative 通道——最终收敛为单请求。
- **CRUD infinite 失败重试跳页**（2-9，很可能）：`crud-renderer.tsx:604` `onRetry={handleLoadMore}` → `crud-infinite-scroll-area.tsx:53-56` 重试按钮直接调 onRetry——page N 失败后重试 bump 到 N+1 而非重试 N（client 模式 source 切片跳过）。
- **CRUD polling 挂载序竞态**（2-10，很可能）：`use-crud-polling.ts:106-134` effect 内 `resolveDataSourceHandle` 一次失败仅 console.warn 并 return；deps（`[effectiveEnabled, sourceId, componentRegistry, scope]`）稳定 → schema 顺序 `[crud, data-source]`（data-source 后注册）时轮询永久静默禁用；现有测试全部 data-source 在前。
- **pagination currentPage 无渲染期 clamp**（2-11，确定）：`pagination-renderer.tsx:128-133` 仅 useState 初始化 clamp；total 收缩后（服务端刷新）渲染期 currentPage > totalPages 显示越界页（:139 total 跟随 prop 而 currentPage 不重 clamp）。
- **crud 死导出**（2-4 部分，确定）：`crud-renderer-state.ts:19` `InternalTableHandle`、`crud-schema.ts:273` `createDefaultCrudStatusSummary` 无外部消费者（grep 仅命中定义与测试）。
- **crud 文档漂移**：`crud-comparative-analysis.md:296` 引 `form.tsx:556`（live 为 :316，1053-1 拆分后行号越界，16-2）；`crud/design.md:487`（表格行）称 `resolveToolbarBlocks` 在 `crud-renderer.tsx`（live 在 `crud-renderer-toolbar.tsx:195`，16-3）。
- **验证基线**：2026-08-07 全量 typecheck/build/lint 32/32、test 59/59（data 包 758 tests）、`pnpm check` exit 0（oversized 2 豁免 + audit-suspects 9 pre-existing 与 clean HEAD 一致）。

## Goals

- CRUD 的 `polling.stopWhen` / `$crud.refreshing` 契约面与实现面收敛（二选一：落地语义或显式 @reserved + design.md 同步），schema 作者按文档配置不再静默无效。
- CRUD 加载路径三处健壮性缺陷修复：自定义 path 双 fetch 收敛为单请求、infinite 失败重试当前页、polling 挂载序竞态下 data-source 晚注册可恢复。
- pagination 渲染期 out-of-range currentPage 钳制到有效范围。
- crud 侧 2 个死导出清理或登记；2 条 crud 文档漂移修正。
- 每条行为修复 test-first（先红后绿），data 包全绿。

## Non-Goals

- 不处理 data 包其余 open backlog 项（23-1/23-2/23-4 属 scheduling 域，入 plan 2228-2；03-01/03-03 等工程治理项入后续轮次）。
- 不重审 `data-source` 自己的 `stopWhen`（另一类型，非本批 scope）。
- 不做 loadAction×infinite 之外的 CRUD 结构重构（1-2 已由 1747-2 收口，本批不重复）。
- 不修改 `@nop-chaos/ui` 公共导出。

## Scope

### In Scope

- `packages/flux-renderers-data/src/`：`crud-schema.ts`、`crud-renderer.tsx`、`crud-renderer-load.ts`、`crud-infinite-scroll-area.tsx`、`use-crud-polling.ts`、`pagination-renderer.tsx`、`crud-renderer-state.ts`、`data-renderer-definitions.ts`、相关测试。
- `docs/components/crud/design.md`、`docs/components/crud/crud-comparative-analysis.md`。
- `docs/backlog/component-audit-roadmap.md` Follow-up Backlog 对应条目勾选（2-1/2-2/2-4/2-8/2-9/2-10/2-11/16-2/16-3）。

### Out Of Scope

- data-source 域（`source-registry.ts` 等）与 form/ai/content/scheduling 包改动。
- 工具链扫描器改造（01-02/03-03 等）。

## Failure Paths

| 场景                       | 触发                                                           | 预期行为                                                        | 可重试 | 用户可见表现             |
| -------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- | ------ | ------------------------ |
| polling data-source 晚注册 | schema `[crud, data-source]`，data-source 在 crud mount 后注册 | polling 在 data-source 可用后自动生效（监听注册时序或重试解析） | 是     | 轮询正常启动，无静默禁用 |
| infinite 失败重试          | page N 加载失败点击重试                                        | 重试 page N 而非 N+1                                            | 是     | 同页数据重新加载         |
| 自定义 pagination path     | `paginationStatePath` 自定义路径变更                           | 单请求（reactive 或 imperative 之一）                           | 是     | 无重复请求/重复变更      |
| total 收缩                 | 服务端刷新后 total 小于当前页起始                              | currentPage 渲染期 clamp 到末页                                 | 是     | 无越界空页显示           |

## Test Strategy

本档选择：**建议有测**（2-8/2-9/2-10 为组合路径缺陷、2-11/2-2 为已确认行为缺陷，全部 test-first 先红后绿；2-1 为契约裁决项，裁决后按裁决形态补最小契约测试；文档/死导出项不需要行为测试）。

## Execution Plan

### Phase 1 - CRUD scope 契约真实性（stopWhen 裁决 + refreshing 落地）

Status: completed
Targets: `packages/flux-renderers-data/src/crud-schema.ts`、`crud-renderer.tsx`、`crud-renderer-load.ts`、`data-renderer-definitions.ts`、`docs/components/crud/design.md`

- Item Types: `Decision | Fix | Proof`

- [x] 2-1 裁决 `crud.polling.stopWhen`：核对 `CrudPollingConfig.stopWhen` 与 data-source `stopWhen` 语义（`packages/flux-runtime/src/async-data/source-registry.ts:155` 透传编译态；data-source 控制器 `api-data-source-controller-state.ts:132-149` 消费编译态 stopWhen）；二选一——(a) 将 CRUD 侧 `stopWhen` 表达式编译求值后透传给上游 data-source 的 stop 判定（对齐控制器消费面），或 (b) 从 schema/definition 移除字段并标注 @reserved（对齐 calendar 字段 @reserved 先例）；裁决记录于 daily log。
- [x] 2-2 `$crud.refreshing` 修复：`crud-renderer.tsx:206` 以真实刷新中态表达（loadAction 模式下 `loadResult` 刷新周期状态；source 模式下 dispatch in-flight 状态），不再恒 false；确认 `crud-schema.ts:238` 字段语义与 design.md:352 表述一致后同步 design.md。
- [x] 裁决/修复后同步 `crud/design.md`（stopWhen 去向 + refreshing 语义）。

Exit Criteria:

- [x] `rg "stopWhen" packages/flux-renderers-data/src/` 显示 CRUD 侧字段要么被生产代码消费、要么从 schema/definition 移除（仅剩 @reserved 注释语境）。
- [x] 刷新中态测试用例先红后绿（消费 `$crud.refreshing` 为 true 的窗口存在，如 refresh 按钮触发后置 loading）；data 包测试绿。
- [x] design.md 对应段落与 live 行为一致。

### Phase 2 - CRUD 加载路径健壮性（双 fetch / 重试跳页 / polling 竞态）

Status: completed
Targets: `packages/flux-renderers-data/src/crud-renderer-load.ts`、`crud-renderer.tsx`、`crud-infinite-scroll-area.tsx`、`use-crud-polling.ts`

- Item Types: `Fix | Proof`

- [x] 2-8 双 fetch 收敛：`__setIgnoreWritesTo` ignore 列表（:208-215）补 `paginationStatePath`（及同批自定义路径）——自定义 path 变更被 ignore 抑制 reactive force() 通道后，存活的是 imperative load effect 通道，最终收敛为单请求；新增组合用例（自定义 paginationStatePath + loadAction）断言单次请求/变更。
- [x] 2-9 infinite 重试跳页修复：重试语义改为「重试当前失败页」（client 模式源切片不跳过；loadAction 模式以失败时 page 为准），`onRetry` 与 `handleLoadMore` 解耦或加参数；用例：page N 失败 → 重试 → 请求 page N 且数据落位正确。
- [x] 2-10 polling 挂载序竞态修复：`use-crud-polling.ts` 对 `resolveDataSourceHandle` 失败增加重试/订阅机制（如 componentRegistry 订阅或有限重试定时器），data-source 晚注册后轮询自动生效；用例：data-source 后注册 → polling 启动（现有测试补「data-source 在后」变体）。

Exit Criteria:

- [x] 三条修复各带先红后绿的 focused 测试（data 包新增用例绿）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test` 全绿，既有 crud-lifecycle/crud-loadaction-infinite 零回归。

### Phase 3 - pagination 渲染期 clamp + crud 死导出清理

Status: completed
Targets: `packages/flux-renderers-data/src/pagination-renderer.tsx`、`crud-renderer-state.ts`、`crud-schema.ts`

- Item Types: `Fix | Decision | Proof`

- [x] 2-11 渲染期 clamp：`currentPage` 渲染期（或 render 期派生）当 `total` 收缩后越界时钳制到 `totalPages`（对齐 table 分页先例与设计 §7 承诺）；用例：total 收缩后 currentPage > totalPages → 显示末页、canGoNext false。
- [x] 2-4 死导出清理（crud 部分）：`InternalTableHandle`（crud-renderer-state.ts:19）、`createDefaultCrudStatusSummary`（crud-schema.ts:273）——grep 确认零生产消费者后移除（含孤立的关联导出），或显式登记用途；测试如引用则同步。

Exit Criteria:

- [x] pagination 越界用例先红后绿；data 包测试绿。
- [x] `rg "InternalTableHandle|createDefaultCrudStatusSummary" packages/ --glob '!**/*.test.*' --glob '!**/dist/**'` 零命中（或登记说明）。

### Phase 4 - crud 文档漂移修正

Status: completed
Targets: `docs/components/crud/crud-comparative-analysis.md`、`docs/components/crud/design.md`

- Item Types: `Fix`

- [x] 16-2 `crud-comparative-analysis.md:296` 行号 `form.tsx:556` → live `form.tsx:316`（或去行号，改为组件名/章节引用）。
- [x] 16-3 `crud/design.md:487` `resolveToolbarBlocks` 位置改引 `crud-renderer-toolbar.tsx:195`（live 实现文件）。

Exit Criteria:

- [x] 两处文档锚点与 live 代码一致（`check:active-doc-code-anchors` 无新增失效）。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session）`ses_0235c68dcffeJ9ukcLOgfH3Pi9`
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker 零 Major；Minor 全部处理——① Purpose「8 条」改「9 条」；② `crud-renderer.tsx:206` 行号更正为 :209；③ 2-8 通道方向表述更正（ignore 列表抑制 reactive force() 通道，存活 imperative 通道，收敛单请求）+ :294 更正为 :346-350/:358-364；④ `crud-lifecycle.test.tsx:475` 更正为 :467；⑤ `source-registry.ts:155` 补全路径（`packages/flux-runtime/src/async-data/`）；⑥ `crud/design.md:485` 更正为 :487（表格行）。

## Closure Gates

- [x] 所有 in-scope 已确认 P2 缺陷（2-2/2-8/2-9/2-10/2-11）已修复并带 focused 测试
- [x] 2-1 契约裁决落地（透传或 @reserved），design.md 同步
- [x] 2-4 crud 死导出清理完成（移除或登记）
- [x] 16-2/16-3 文档漂移修正
- [x] 不存在被静默降级到 deferred 的 in-scope 缺陷
- [x] roadmap Follow-up Backlog 对应条目勾选（2-1/2-2/2-4/2-8/2-9/2-10/2-11/16-2/16-3）并注明 plan 引用
- [x] 受影响的 owner docs 已同步（crud/design.md、crud-comparative-analysis.md）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check` 零新增命中

## Deferred But Adjudicated

无（所有 in-scope 项均为已确认缺陷或契约面缺口，全部入 Fix/Decision，无延期项）。

## Non-Blocking Follow-ups

- data 包其余 open backlog 项（01-02 等工具链条目）归后续工程治理轮次，不影响本 plan 收口。
- `docs/logs/2026/08-07.md` 登记本轮裁决记录（2-1 stopWhen 去向）。→ 已登记（执行收口日志条目含 2-1 option (b) 裁决依据）。
- `docs/components/schema-gap-from-erp-integration-design.md`（:355/:359/:453/:481）仍推荐 `polling.stopWhen` 表达式——该文档为未来设计讨论（已自带「前提：SurfaceRuntime 发布 $surface.hasOpenSurface——归 Non-Blocking Follow-up」注记），非本 plan owner-doc；如未来采纳该设计，需按 data-source 配置 stopWhen 重新表达。watch-only，不阻塞 closure。

## Closure

Status Note: 2026-08-07 执行完毕。4 Phase 全 completed；9 条 P2 全部收口（5 条行为修复 test-first 先红后绿，2 条裁决/清理，2 条文档修正）；全量验证 typecheck/build/lint 32/32、test 59/59（data 109 files/765 tests）、`pnpm check` exit 0（零新增命中，oversized 2 豁免 + audit-suspects 9 pre-existing 与 clean HEAD 一致）；roadmap 九行 ❌→✅；closure-audit 由独立 fresh session 通过（代码落地逐项复核 + data 包测试实测），本 plan 可关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session）`ses_02322b06fffeYRf4NCf7oFd47W`
- Evidence: 独立复核 live repo（不改动文件）：Phase 1——2-1 @reserved 裁决落地（`crud-schema.ts:36-43` 仅 @reserved 注释、`createDefaultCrudStatusSummary` 移除、design.md §Polling 启停状态发布 :350-352 同步）、2-2 真实 refreshing（`crud-renderer.tsx:214-216` + `sourceRefreshInFlight` :74/:267-280）双模式测试（`crud-loadaction.test.tsx:338/:415`）；Phase 2——2-8 ignore 列表五条 state path（`crud-renderer-load.ts:211-225`）+ 单请求用例（`crud-loadaction-reaction-regression.test.tsx:234`）、2-9 `handleRetry` 不 bump（`crud-renderer.tsx:347-357`、onRetry :645）loadAction/source 双用例（`crud-loadaction-infinite.test.tsx:256`、`crud-infinite-scroll.test.tsx:194`）、2-10 250ms 重试定时器（`use-crud-polling.ts:88,121-142`）+ 晚注册用例（`crud-lifecycle.test.tsx:337`）；Phase 3——2-11 渲染期 clamp（`pagination-renderer.tsx:147` + `data-pagination-rendering.test.tsx:294`）、2-4 零 `rg` 命中；Phase 4——16-2/16-3 锚点 live（`form.tsx:316`、`crud-renderer-toolbar.tsx:195`）。实测 `pnpm --filter @nop-chaos/flux-renderers-data test` 109 files/765 tests 绿；typecheck/build/lint 32/32、`pnpm check` exit 0。审计首轮 verdict `issues`（3 项收口流程缺口：roadmap 勾选、daily log、commit），执行方补齐后按审计要求复验通过——roadmap 九行已勾选附 plan 引用、daily log 已登记执行与 2-1 裁决、full-green commit 已按 AGENTS.md 落库。

Follow-up:

- no remaining plan-owned work（非阻塞项见 Non-Blocking Follow-ups）。
