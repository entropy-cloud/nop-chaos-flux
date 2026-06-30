# B2.2 scope 传播、隔离与 reaction 触发

> Plan Status: completed
> Last Reviewed: 2026-06-26
> Source: `docs/components/amis-bug-driven-improvement-roadmap.md` (Wave B2, work item B2.2), `docs/components/amis-bug-driven-improvements/11-api-data-and-scope.md` (A5/A9/A14-A16/A19 + 吸收 B2.1 deferred A4/A7/A8), `docs/architecture/scope-ownership-and-isolation.md`, `docs/architecture/api-data-source.md`, `docs/architecture/renderer-runtime.md`
> Mission: amis-bug-driven-improvements
> Work Item: B2.2 scope 传播、隔离与 reaction 触发
> Related: predecessor B2.1（`docs/plans/2026-06-26-0234-2-b21-...-plan.md`，已收口 A1/A2/A3/A11；其 Non-Blocking Follow-ups 的 A4/A7/A8 显式归本计划）；successor B3.1（table 行身份/数据收缩钳制）依赖 B2.1 已落地，本计划同 wave 独立推进

## Purpose

把 roadmap 工作项 B2.2 收口。本计划覆盖 `11-api-data-and-scope.md` 的 scope 传播/隔离/reaction 主题（A5/A9/A14-A16/A19），并吸收 predecessor B2.1 显式 deferred 的 A4/A7/A8（request 层边界）。三类工作交织：

- **确认的 live 缺陷**：A8（数组 GET 参数序列化在 `buildUrlWithParams` 与 `canonicalizeUrlWithParams` 两处实现不一致，执行管道双重构建会同时输出 `ids[]` 与 `ids=1,2,3` 两种形式）——必须 Fix。
- **行为分叉/边界裁定**：A9（轮询是否翻 `loading`）、A7（字面量 `${` 转义）、A4（adaptor abort 契约）——经 live 审计后裁定是缺陷收敛还是文档化当前行为。
- **特征未落地**：A16（location/route 参数绑定到 page/surface scope）——依赖未实现的 app/navigation 层，裁定为 watch-only residual / successor。
- **DESIGN-GAP（owner doc 沉默）/ TEST-GAP**：A14（无限深度词法继承，实现正确但 doc 未显式）、A15（per-runtime-instance 命名空间，doc 未写两 runtime 场景）、A5（adaptor 浅合并 no-op 契约未文档）、A19（sendOn 门控已全入口但缺聚焦断言）。

A1/A2/A3/A11 已由 B2.1 完整收口，本计划不重复。

## Current Baseline

> 来源：2026-06-26 独立子 agent 对 `packages/flux-runtime/src/async-data/`、`packages/flux-runtime/src/`（scope）、`packages/flux-formula/src/template.ts`、`packages/flux-core/src/` 的 live-repo 审计。file:line 引用均已核对。Owner doc：`scope-ownership-and-isolation.md`（scope）、`api-data-source.md`（request/source）。

### 逐条现状

- **A5（requestAdaptor 浅合并保全部字段 + partial 合并 + undefined/null 定义行为）— 实现，minor TEST-GAP + minor DESIGN-GAP。** `applyRequestAdaptor`（`request-runtime-adaptor.ts:106-130`）：`return isPlainObject(adapted) ? { ...api, ...adapted } : api`（`:127-128`，从 `...api` 起铺故 partial 保留 url/data/params/adaptors）；非对象（含 undefined/null）走 `return api`（`:129`）= 定义 no-op。`isPlainObject`（`flux-core/src/utils/object.ts:1-3`）对 undefined/null/原始值/数组均 false。调用点 `prepareApiRequestForExecution`（`request-runtime.ts:342-361`）。测试 `action-scope-and-adaptor.test.ts:202-233`（`applies request adaptors only when they return plain objects`）断言：adaptor `return api`（plain object）被应用、adaptor 返回字符串 `'primitive'`（非对象）→ no-op 原样返回（覆盖 `:129` no-op 分支）；`request-runtime.test.ts:308-333` 断言合并影响 finalUrl。**缺**：partial（只返回 `{headers}`）合并保全部字段的显式断言、以及 undefined/null 的显式 no-op 断言（partial-merge 仅由代码 `:127-128` spread 成立，无聚焦 partial-return 测试）。`api-data-source.md:202-203` 记浅合并但**未记** undefined/null no-op 契约。
- **A9（轮询翻 isRefreshing 不翻 loading，除非 silent:false）— 期望属性未实现 + DESIGN-GAP。** 轮询 `schedulePoll`→`runRequest`（`api-data-source-controller.ts:43-58`，调 `:50`）；`runRequest` 无条件 `inFlightCount+1` + `fetchStatus:'fetching'`（`api-data-source-controller-runtime.ts:227-234`），与 init/refresh 同；`loading = fetchStatus==='fetching'`（`data-source-state.ts:10`）；`isRefreshing = loading && hasData`（`data-source-state.ts:63-78`）。`silent` 仅 4 处全部门控 `reportRuntimeHostIssue`（`api-data-source-controller.ts:34`、`-runtime.ts:174,442`、`-state.ts:154`），**对 loading/isRefreshing/inFlightCount 零影响**。测试 `request-runtime-polling.test.ts`（6 条，覆盖 stopWhen/abort/restart/cache）**从不断言 loading/isRefreshing 区分、从不设 silent**。`api-data-source.md:605` 列 `silent?` 字段、`:888-913` 描述 isRefreshing/inFlightCount/loading，但**从不**把 silent 与 loading 区分挂钩，也未声明轮询默认 silent 行为。
- **A14（词法继承无限深度）— 实现正确，DESIGN-GAP + TEST-GAP。** 读查找递归：`resolveScopePath`（`scope.ts:340-363`，`:362` `return resolveScopePath(scope.isolate ? undefined : scope.parent, path)` 走全父链）、`hasScopePath`（`:365-388`）、`readVisible`/`materializeVisible`（`:177-235`，`:184,208` 递归 parent）；祖先写→后代通知：`createCompositeScopeStore`（`:240-314`，`:278-287` 订阅 parent.store，链式传递故祖父写传播祖父→父→子）。测试：3 级读 `scope-ownership-lexical-and-nested.test.ts:33-40,60-65`、`scope-read-visible-stability.test.ts:129-152`；2 级写→通知 `:171-187`。**缺** 3 级写→后代失效/通知测试；无 #3562 回归锚名。`scope-ownership-and-isolation.md` Default Inheritance（`:30-47`）说「沿父链查找」但**从不显式说「无限深度/多层」**，读者可误读为单层。
- **A15（component-handle/refreshSource 按 runtime-instance 命名空间隔离）— 实现正确，DESIGN-GAP + TEST-GAP。** 每个 `createRendererRuntime` 生成唯一 `runtimeId`（`runtime-factory.ts:99`）+ 闭包局部 source registry（`:641`）、reaction registry（`:646`）、component-handle registry（`:181-189`）；`refreshDataSource`（`:464-470`）只委托本 runtime 的 `sourceRegistryRef.current`；`refreshSource` action（`action-adapter.ts:325-332`）调 `runtime.refreshDataSource`；source registry 键局部（`source-registry.ts:101-102,341-370`）。测试 `source-registry.test.ts:220-299` 造**两个** `createRuntimeSourceRegistry` 实例各含同名 `result` 源，断言互不串。**缺** 两个完整 `createRendererRuntime` 实例的跨 runtime refreshSource/component-handle 不撞场景。`api-data-source.md:315-316` 记「refresh scope-scoped first」但**未**显式写两 co-mounted flux runtime 场景或 instance 命名空间。
- **A16（location/route 参数绑当前 page/surface scope）— 特征未落地。** 唯一导航面是 `navigate` action（`action-adapter.ts:293-312`）调 host `env.navigate(url,opts)`/`env.navigate(-1)`，**不做 scope 注入**。全仓 grep（`routeParams|useParams|useSearchParams|useLocation|locationSearch|pageQuery|urlParam`、`react-router|createBrowserRouter|<Routes|<Route`）跨 packages/apps **零命中**。无 router 集成、无 `$route`/`$query`/`$params` scope 绑定、无 page/surface 从 URL seed。`scope-ownership-and-isolation.md:329-337`、`api-data-source.md` 无 route-param 绑定契约。隔离属性不可评估，因前置 app/navigation 层不存在。
- **A19（sendOn 门控全部入口路径）— 实现正确（全入口），TEST-GAP。** `evaluateSendOnGate`（`api-data-source-controller-runtime.ts:57-79`）在三处公开入口调用：init（`api-data-source-controller.ts:104`）、interval（`:49`）、refresh（`:128`，覆盖 manual `controller.refresh()`/`refreshSource` action/`component:refresh` capability/依赖失效触发 `source-registry.ts:258`）；生产体 `runRequest` 只能经此三入口达，无绕过；cross-owner 读经 `runtime.evaluateCompiled(input.sendOn, input.scope)`（`:67`）走正常词法解析。测试 `runtime-sources-lifecycle.test.ts:22-124`（init truthy/falsy/throw）、`:278-325`（interval + sendOn 协作）。**缺**：refresh 路径 falsy 返回 `{skipped:true}` 断言、依赖失效路径、sendOn 读**不同 owner**（祖先）写入值的场景。
- **A4（requestAdaptor abort 契约显式）— 无 abort 能力，DESIGN-GAP。** `applyRequestAdaptor`（`request-runtime-adaptor.ts:106-130`）只返回合并 api 或原 api，**无 sentinel/throw-to-abort**；`executeApiSchema`（`request-runtime.ts:363-428`）不检 adaptor 结果的 abort 信号。`api-data-source.md:174-204` 定义 adaptor 上下文与浅合并契约但**从不**声明 abort 边界（既未说「adaptor 不能跳过，用 sendOn」也未说「sentinel 返回取消」）。隐式当前行为=「adaptor 不能 abort，用 sendOn 门控」，但未文档化。
- **A7（字面量 `${` 转义 + url/params 组合）— 无转义机制，DESIGN-GAP（转义特征缺失）。** 模板解析 `parseTemplateSegments`（`flux-formula/src/template.ts:50-80`，`:55` `source.indexOf('${', i)` 每个 `${` 当插值起点，计大括号深度）**无转义**（无 `\${`/`$$ {`/反引号模板级转义），未闭合的 `${` 当字面文本（`:74`，行为有定义）；唯一转义在表达式内字符串字面量（`parser.ts:24-64`、lexer），非模板级。url/params 组合：`buildUrlWithParams`（`request-runtime.ts:200-245`）把 params 追加查询串到（已表达式求值的）url，故模板路径段 + params 都达后端。**管道不一致**（见 A8）：`prepareApiRequestForExecution`（`:342-361`）先 materialize→`buildUrlWithParams`，后 `applyRequestAdaptor`，再 `finalizeMaterializedApiRequest`→`canonicalizeUrlWithParams`，双重构建。`api-data-source.md` 未文档化转义也未承认限制。signal doc A7 标 DESIGN-GAP P2（缺失转义特征，非「行为错误」）。
- **A8（数组 GET 参数序列化形式一致 + per-request override）— 两实现不一致，BOTH(DESIGN-GAP + LIVE-DEFECT) + TEST-GAP。** `buildUrlWithParams`（`request-runtime.ts:200-245`）：数组→`ids[]=1&ids[]=2&ids[]=3`（`:214-219` `searchParams.append(\`${key}[]\`, String(item))`）。`canonicalizeUrlWithParams`（`:247-268`）：**无数组处理**，`:259` `searchParams.delete(key)`不删`key[]`，`:262` `append(key, String(value))`对数组得`"1,2,3"`→`ids=1,2,3`。净效：经 `prepareApiRequestForExecution`，materialized url 带 `ids[]=`，再 `canonicalizeUrlWithParams`不删`ids[]`又追加`ids=1,2,3`，**最终 url 同时含两种形式**。无 per-request override（ApiSchema/OperationControlConfig 无序列化配置）。测试 `request-runtime.test.ts:134-137`只断言`buildUrlWithParams`的 bracket 形式；无`canonicalizeUrlWithParams` 数组测试、无全管道数组测试。`api-data-source.md:151-172,282-308`**未文档化**数组序列化形式。两者均非`ids=1&ids=2`。

### 相关测试文件（主要）

scope：`scope-ownership-lexical-and-nested.test.ts`、`scope-ownership-edge-cases.test.ts`、`scope-read-visible-stability.test.ts`、`scope-change.test.ts`、`scope-merge.test.ts`、`host-projection-scope.test.ts`、`runtime-scope-actions*.test.ts`。request/source：`request-runtime.test.ts`、`request-runtime.executor.test.ts`、`request-runtime-polling.test.ts`、`runtime-sources-lifecycle.test.ts`、`runtime-sources-refresh.test.ts`、`source-registry.test.ts`、`action-scope-and-adaptor.test.ts`、`component-handle-registry.test.ts`。

## Goals

- **A8**：Fix 数组参数序列化不一致——选定一种文档化形式（推荐 `ids=1&ids=2`，与 amis `bar[0]` 默认故意分歧），消除双重构建的双形式输出，配 failing-test-first + 负向（不误合并不同 identity）；doc 记录形式。
- **A9**：裁定轮询翻 loading 的语义——收敛为「轮询默认翻 isRefreshing 不翻 loading，silent 控制」(Fix) 或文档化「每请求都翻 loading，用 isRefreshing 区分」(Decision)；配聚焦测试。
- **A7**：裁定字面量 `${` 转义——实现转义语法(Fix) 或文档化为已知限制(Decision)；锁定 url/params 组合（两者都达后端）。
- **A4**：文档化 adaptor abort 边界（「adaptor 不能 abort，用 sendOn」），owner doc 补一条。
- **A14**：owner doc 显式「无限深度词法继承」+ 补 3 级写→后代失效/通知回归锚。
- **A15**：owner doc 显式「per-runtime-instance 命名空间，两 co-mounted runtime 不撞」+ 补两完整 runtime 场景锚。
- **A5**：补 undefined/null adaptor 返回的显式断言 + owner doc 记 no-op 契约。
- **A19**：补 refresh 路径 `{skipped}` + cross-owner sendOn 读断言。
- **A16**：裁定为 watch-only residual（依赖未实现的 app/navigation），owner doc 记「route-param 绑定暂不适用」，产 successor 记录。
- owner doc（`api-data-source.md`、`scope-ownership-and-isolation.md`）同步全部裁定，与 live code 一致，无「Proposed vs Current」。

## Non-Goals

- 不实现 app/navigation 或 router 集成（A16 的前置层）——仅裁定为未落地 + successor。
- 不改 data-source source-level refresh dedup（cancel-previous/ignore-new/parallel 已落地，归既有 owner 行为）。
- 不重新覆盖 B2.1 的 A1/A2/A3/A11。
- 不引入 amis 式 `schemaApi`/组件级 `api`/`initFetch`/`interval`/`dataProvider`（Flux 已拒绝，NOT-ADOPTED）。
- 不重构 `executeApiSchema` 为新架构（A8/A9 仅做序列化一致性与 loading 区分收敛）。

## Scope

### In Scope

- A8 数组序列化 Fix + doc。
- A9 轮询 loading 裁定 + 必要 Fix + 测试。
- A7 `${` 转义裁定 + 必要 Fix/锁定 + doc。
- A4 adaptor abort 边界 doc。
- A14 无限深度 doc + 3 级写锚。
- A15 instance 命名空间 doc + 两 runtime 锚。
- A5 undefined/null 锚 + no-op doc。
- A19 refresh 路径 skipped + cross-owner 锚。
- A16 裁定 watch-only + successor 记录。

### Out Of Scope

- app/navigation / router 实现（A16 前置）。
- B2.1 范围（A1/A2/A3/A11）。
- 组件级 `api`/`initApi`/`interval`（NOT-ADOPTED）。
- 全局 request/audit 拦截层（owner doc「candidate future host-boundary convergence」）。

## Failure Paths

> 涉及 HTTP 请求参数序列化与轮询状态契约，参考本节。

| 场景编号           | 触发                                     | 行为（依 Phase 1 裁定）                                                                       | 可重试           | 用户可见表现                           |
| ------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------- |
| A8-array-param     | GET `params:{ids:[1,2,3]}`               | 序列化为单一文档化形式（推荐 `ids=1&ids=2`），无双形式输出；不同数组值不误合并                | n/a              | 后端收到一致、可解析的数组参数         |
| A9-poll-loading    | data-source `interval` 触发轮询          | 裁定 A：翻 isRefreshing 不翻 loading（silent 控制）；裁定 B：翻 loading，用 isRefreshing 区分 | 依 control.retry | 全屏 loading 闪烁（裁定 A 时无）       |
| A7-literal-delim   | url 含字面量 `${` 非插值                 | 裁定 A：转义语法保留字面量；裁定 B：文档化为已知限制（`${` 必为插值）                         | n/a              | 依裁定：字面量保留 或 报「未闭合插值」 |
| A19-sendOn-refresh | refreshSource action 触发但 sendOn falsy | 返回 `{skipped:true}`，不发请求                                                               | 否               | 无请求、无 loading                     |

## Test Strategy

本档选择：**必须自动化**

理由：A8 是确认的 live 缺陷（序列化不一致），A9/A7 是确认的行为分叉/缺陷候选。依 guide「必须自动化」档：A8（及裁定为 Fix 的 A9/A7）Proof（failing test）必须先于 Fix。A4/A14/A15/A5/A19/A16 多为 doc + TEST-GAP 锁定，多数应直接 green（实现已正确），但 A8 必现红。A16 不适用自动化（特征未落地，仅裁定 + doc）。

## Execution Plan

### Phase 1 - 缺口裁定与 failing-test 先行（A8 / A9 / A7 / A16 / A4）

Status: completed
Targets: `docs/architecture/api-data-source.md`（裁定记录）、`packages/flux-runtime/src/__tests__/`（failing test）

- Item Types: `Decision`、`Proof`

- [x] (Decision, A8) 裁定数组序列化目标形式：推荐 `ids=1&ids=2`（repeated-key，与 amis `bar[0]` 默认故意分歧，更 RESTful）；裁定 `buildUrlWithParams` 与 `canonicalizeUrlWithParams` 统一到同一形式、消除双重构建双形式输出；是否提供 per-request override。记录到 `api-data-source.md`。
- [x] (Proof, A8) failing test：GET `params:{ids:[1,2,3]}` 经 `prepareApiRequestForExecution` → 断言 finalUrl 只含**单一**文档化形式（无 `ids[]` 与 `ids=` 并存）；负向（不同数组值不误合并）。先红。
- [x] (Decision, A9) 裁定轮询 loading 语义：(A) 收敛——轮询默认翻 isRefreshing 不翻 loading（除非 silent:false），需 Fix；或 (B) 文档化——每请求翻 loading、用 isRefreshing 区分，无 Fix。signal doc/roadmap 的 A9 属性指向裁定 A（isRefreshing-not-loading）；选裁定 B = 接受与既声明属性的分歧，须给明确理由。记录到 `api-data-source.md`。
- [x] (Proof, A9) failing test（若裁定 A）：data-source `interval` + 默认 silent → 断言轮询时 `loading` 不翻、`isRefreshing` 翻。先红。_裁定 B，故无 failing test（N/A）。_
- [x] (Decision, A7) 裁定字面量 `${` 转义：(A) 实现转义语法（如 `\${`）保留字面量，需 Fix；或 (B) 文档化为已知限制（`${` 必为插值起点，未闭合当文本）。选裁定 B = 接受转义特征缺失的已知限制，须给明确理由。记录到 `api-data-source.md`。
- [x] (Proof, A7) 若裁定 A：在 Phase 1 即写 failing test（含字面量 `${` 的 url 经转义后保留字面量），再于 Phase 2 实现；若裁定 B 则无 failing test、仅在 Phase 2 锁定「`${` 必为插值」+ url/params 组合行为。_裁定 B，故无 failing test（N/A）。_
- [x] (Decision, A16) 裁定：route/location 参数绑定未落地（前置 app/navigation 不存在）；记录为 watch-only residual，owner doc 记「暂不适用」，产 successor 记录。
- [x] (Decision, A4) 裁定 adaptor abort 边界：「adaptor 不能 abort；用 `sendOn` 门控请求」为 Flux 契约。记录到 `api-data-source.md`。

Exit Criteria:

> 本 Phase 产出裁定 + 先红测试（A8，及裁定为 Fix 的 A9），不改实现。

- [x] A8/A9/A7/A16/A4 五条 Decision 已记录到 `api-data-source.md`（裁定结论，非叙事）。
- [x] A8 failing test 已落地且当前为红；A9 failing test（若裁定 A）已落地且为红。_A9/A7 裁定 B，无 failing test。_

### Phase 2 - Fix A8（数组序列化一致性）+ A9/A7（如裁定为 Fix）

Status: completed
Targets: `packages/flux-runtime/src/async-data/request-runtime.ts`（`buildUrlWithParams:200-245`、`canonicalizeUrlWithParams:247-268`、`prepareApiRequestForExecution:342-361`）、`api-data-source-controller-runtime.ts`（A9 若 Fix）、`packages/flux-formula/src/template.ts`（A7 若 Fix）

- Item Types: `Fix`、`Proof`

- [x] (Fix, A8) 按 Phase 1 裁定统一两 builder 到单一数组形式（推荐 `ids=1&ids=2`），消除 `canonicalizeUrlWithParams` 不删 `key[]` 又追加逗号串的双形式输出；确保全管道 `prepareApiRequestForExecution` 输出唯一形式。_新增共享 `appendParamValues` helper，两 builder 复用；canonicalize 额外 delete `${key}[]` 兜底。_
- [x] (Proof, A8) Phase 1 的 A8 failing test 转 green；补既有 `request-runtime.test.ts:134-137` 断言更新到新形式；补 `finalizeApiRequest` 全管道数组测试。
- [x] (Fix, A9) 若裁定 A：使轮询默认 silent 时不翻 `loading`、只翻 `isRefreshing`/`inFlightCount`。_裁定 B，N/A。_
- [x] (Proof, A9) Phase 1 的 A9 failing test 转 green；补「silent:false 时 loading 仍翻」断言。_裁定 B，N/A。_
- [x] (Fix, A7) 若裁定 A：在 `parseTemplateSegments` 实现字面量 `${` 转义语法。_裁定 B，N/A。_
- [x] (Proof, A7) 若裁定 A：转义保留字面量测试 green；若裁定 B：锁定「`${` 必为插值」+ url/params 组合（两者都达后端）测试。_裁定 B：`template.test.ts` 锁定 `${` 必为插值/无转义/未闭合当文本；`request-runtime.test.ts` 锁定 url path+params 都进 final url。_

Exit Criteria:

> 本 Phase 交付 A8 必修 + A9/A7 条件 Fix。

- [x] A8 数组序列化输出单一文档化形式，failing test green + 全管道测试 green。
- [x] A9（若裁定 A）轮询 loading 区分落地、failing test green；裁定 B 则无此项。_裁定 B：doc 已记。_
- [x] A7（若裁定 A）转义落地、测试 green；裁定 B 则锁定测试 green。_裁定 B：锁定测试 green。_

### Phase 3 - TEST-GAP 锁与 doc 同步（A5 / A14 / A15 / A19）

Status: completed
Targets: `packages/flux-runtime/src/__tests__/`（锚）、`docs/architecture/api-data-source.md`、`docs/architecture/scope-ownership-and-isolation.md`

- Item Types: `Proof`、`Decision`

- [x] (Proof, A5) 新增测试：requestAdaptor 返回 undefined/null → 定义 no-op（原 api 不变）；partial `{headers}` 合并保留 url/data/params；锁定 `request-runtime-adaptor.ts:127-129` 行为。_落点 `action-scope-and-adaptor.test.ts`。_
- [x] (Proof, A14) 新增测试：祖父→父→子 3 级 scope 链，祖父写 → 断言后代 composite 订阅者收到失效/通知（钉住 `scope.ts:278-287` 链式传递，#3562 类回归）。_落点 `scope-ownership-lexical-and-nested.test.ts`。_
- [x] (Proof, A15) 新增测试：两个完整 `createRendererRuntime` 实例 + 相同 source ID/name → 断言 `refreshSource`/component-handle 只命中各自 instance，互不串。_落点 `runtime-sources-refresh.test.ts`。_
- [x] (Proof, A19) 新增测试：refresh 路径 sendOn falsy → 返回 `{skipped:true}` 不发请求；sendOn 读**不同 owner**（祖先）写入值求值正确。_落点 `runtime-sources-lifecycle.test.ts`。_
- [x] (Decision) 同步 owner doc：A5（undefined/null no-op 契约）、A14（scope-ownership-and-isolation.md「无限深度词法继承」显式）、A15（api-data-source.md「per-runtime-instance 命名空间 + 两 runtime 不撞」显式）、A19（sendOn 门控全入口已记，复核）。

Exit Criteria:

> 本 Phase 交付 A5/A14/A15/A19 回归锚 + owner doc 显式化。

- [x] A5/A14/A15/A19 四条 Proof 测试存在并通过。
- [x] `api-data-source.md`/`scope-ownership-and-isolation.md` 对应 DESIGN-GAP 已显式化且与 live code 一致。

### Phase 4 - owner doc 收口同步

Status: completed
Targets: `docs/architecture/api-data-source.md`、`docs/architecture/scope-ownership-and-isolation.md`

- Item Types: `Decision`、`Proof`

- [x] (Decision) 收口同步 `api-data-source.md`：A8（数组序列化形式）、A9（轮询 loading 裁定）、A7（转义裁定/限制）、A4（abort 边界）、A5（no-op 契约）、A15（instance 命名空间）、A16（route-param 暂不适用 + successor 记录）与 live code 一致，无「Proposed vs Current」。
- [x] (Decision) 收口同步 `scope-ownership-and-isolation.md`：A14（无限深度词法继承显式）。
- [x] (Proof) 抽查修改后的两 owner doc 与 live code（`request-runtime.ts` 序列化、`scope.ts` 递归、`runtime-factory.ts` instance registry）一致。_已核对：`request-runtime.ts` `appendParamValues`/两 builder 产出 `ids=1&ids=2`；`scope.ts` `resolveScopePath`/`createCompositeScopeStore` 全父链递归；`runtime-factory.ts:99,121-122,641,646` 唯一 runtimeId + 闭包局部 source/reaction/component-handle registry。_

Exit Criteria:

- [x] 两 owner doc 全部裁定/契约已收口且与 live baseline 一致。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_0ff97162cffeJk2J2W8QbDh6ve`）
- Verdict: `pass-with-minors`
- Rounds: 1（零 Blocker / 零 Major，一轮达成共识）
- Findings addressed:
  - Minor 1（A9/A7 裁定须重述既声明属性的 lean，选裁定 B = 接受与既声明分歧须给理由）→ A9/A7 Decision 已加「signal doc/roadmap 指向裁定 A；选 B 须给明确理由」。
  - Minor 2（A7 baseline 标 LIVE-DEFECT 不准；现行 `${` 行为有定义、signal 标 DESIGN-GAP P2）→ A7 baseline 已改为「DESIGN-GAP（转义特征缺失）」并注明未闭合当文本（`template.ts:74`）。
  - Minor 3（A7 若裁定 A 须在 Phase 1 先写 failing test）→ 已新增 A7 Proof（裁定 A 时 Phase 1 failing test 先行）。
  - Minor 4（A9 Fix 落点未指明 runRequest 如何区分 poll/init）→ Phase 2 A9 Fix 已指明「调用方传 request-kind/silent 标志，状态写入据此分流」。
  - Minor 5（`action-scope-and-adaptor.test.ts:202-233` 引用不准：用 string `'primitive'` 非 123、adapted 返回 full api 非 partial）→ A5 baseline 已修正，并显式说明 partial-merge 无聚焦 partial-return 测试（强化该 minor TEST-GAP）。
  - Minor 6（roadmap B2.2 AMIS-REF 列 A2 但 A2 已由 B2.1 收口）→ 属 roadmap 跨文档措辞，非本 plan 缺陷；本计划 Out-Of-Scope 已正确排除 A2。roadmap 工作项变更需人确认，不在本计划改动。
  - 审阅者确认：所有 file:line 引用经 live repo 核对准确；A8 双形式输出缺陷经端到端 trace 确认真实（`ids[]` 与 `ids=1,2,3` 并存）非夸大；A8 必修、Anti-Slacking 成立（从不延期、Closure Gate 把关）；A16 deferral 诚实（packages+apps grep 零路由集成）；B2.1 边界干净（A1/A2/A3/A11 排除、吸收 deferred A4/A7/A8）；Non-Blocking Follow-ups 无 in-scope live defect；Test Strategy「必须自动化」+ A8 Proof-before-Fix 成立。

## Closure Gates

> 关闭条件：本 section 所有条目及每个 Phase Exit Criteria 全 `[x]` 后，方可将 `Plan Status` 改为 `completed`。

- [x] A8 数组序列化不一致已 Fix（单一文档化形式 `ids=1&ids=2`），聚焦测试（含负向）通过。
- [x] A9 轮询 loading 裁定已落地（裁定 A 则 Fix + 测试；裁定 B 则 doc）。_裁定 B：`api-data-source.md` Polling Loading Semantics (A9) 已记，附 deriveDataSourceState 耦合理由。_
- [x] A7 `${` 转义裁定已落地（裁定 A 则 Fix + 测试；裁定 B 则锁定 + doc）。_裁定 B：`api-data-source.md` Template Interpolation Boundary (A7) 已记 + `template.test.ts`/`request-runtime.test.ts` 锁定测试 green。_
- [x] A4 adaptor abort 边界已文档化。_`api-data-source.md` Adaptor Abort Boundary (A4)。_
- [x] A14 无限深度 doc + 3 级写锚通过。_`scope-ownership-and-isolation.md` Default Inheritance 显式 + `scope-ownership-lexical-and-nested.test.ts` A14 锚。_
- [x] A15 instance 命名空间 doc + 两 runtime 锚通过。_`api-data-source.md` Per-Runtime-Instance Namespace (A15) + `runtime-sources-refresh.test.ts` A15 锚。_
- [x] A5 undefined/null 锚 + no-op doc 通过。_`api-data-source.md` Request Adaptor Shallow-Merge No-Op Contract (A5) + `action-scope-and-adaptor.test.ts` A5 锚。_
- [x] A19 refresh skipped + cross-owner 锚通过。_`runtime-sources-lifecycle.test.ts` A19 锚；sendOn 全入口门控 doc 已存（Request Orchestration Fields X4）。_
- [x] A16 裁定 watch-only + successor 记录。_`api-data-source.md` Route / Location Parameter Binding (A16) + 本计划 Deferred But Adjudicated。_
- [x] owner doc（`api-data-source.md`/`scope-ownership-and-isolation.md`）与 live baseline 一致。
- [x] 不存在被静默降级到 deferred/follow-up 的 in-scope live defect 或 contract drift（A8 为确认缺陷必须 landed；A9/A7 若裁定为缺陷必须 landed）。_A8 已 landed；A9/A7 经 live 审计裁定为非缺陷（DESIGN-GAP/期望属性），Decision B 有明确理由，未降级 live defect。_
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。_独立子 agent `ses_0ff5e885dffeldxtNvyVFSbJPc`（fresh session）VERDICT: approved，零 Blocker/Major；A8 端到端独立 trace、A9/A7 Decision B 耦合理由核对、A5/A14/A15/A19 锚测试 green 核对。_
- [x] `pnpm typecheck` _55/55 tasks_
- [x] `pnpm build` _29/29 tasks_
- [x] `pnpm lint` _29/29 tasks_
- [x] `pnpm test` _55/55 tasks_

## Deferred But Adjudicated

### A16 location/route 参数绑定到 page/surface scope

- Classification: `watch-only residual`
- Why Not Blocking Closure: live 无 app/navigation/router 集成（全仓 grep 零命中），route/location→scope 绑定点不存在；隔离属性不可评估因前置层未实现。本工作项的其余 scope 传播/隔离/reaction 契约（A14/A15/A19）独立于 route-param，均已落地或在本计划收口。route-param 绑定待 app/navigation 落地后再评估。
- Successor Required: `yes`
- Successor Path: 待 app/navigation 层落地后于 `docs/components/amis-bug-driven-improvement-roadmap.md` 评估新增工作项或归 B7。

## Non-Blocking Follow-ups

- A6（`method` 动态求值 `method:"${isEdit?'put':'post'}"`）属 P2，归 B7 backlog 评估，不阻塞本计划契约收口。
- A10（轮询 jitter `interval:{base,jitter}`）属 P3，归 B7 backlog。
- A12/A13/A17/A18（多 source loading 聚合示例、status-branching、resultMapping 重绑、sibling 数据流示例）属 P2/P3 doc 示例，归 B7 backlog。

## Closure

Status Note: B2.2 全部 in-scope 工作项已收口。A8 数组序列化 live defect 已 Fix（统一 `ids=1&ids=2`，消除双形式）。A9/A7 经 live 审计裁定为 Decision B（非缺陷，文档化当前行为），理由：`deriveDataSourceState` 耦合（A9）与 P2 特征缺失（A7）。A4/A5/A14/A15/A19 doc + 回归锚已落地。A16 裁定 watch-only residual + successor（前置 app/navigation 未存在）。全量验证 typecheck/build/lint/test 全绿。独立子 agent closure-audit approved。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session）`ses_0ff5e885dffeldxtNvyVFSbJPc`
- Evidence: VERDICT `approved`，零 Blocker / 零 Major。独立核对项：A8 fix 经隔离脚本端到端 trace 确认 final url 仅 `ids=1&ids=2&ids=3`（无 `ids[]`、无逗号串）；A9 Decision B 的 `deriveDataSourceState` 耦合声明经 `data-source-state.ts:67-75` + `api-data-source-controller-state.ts:65` 核对成立；A5/A14/A15/A19 锚测试均验证正确结果（非仅无报错），flux-runtime 1229 passed / flux-formula 187 passed；A16 deferred 诚实（watch-only + successor）；plan 文本一致性（4 Phase completed、Closure Gates 全勾、唯一未勾项为本 audit 项已补勾）；无 in-scope live defect 被静默降级。

Follow-up:

- A16 route/location → scope 绑定：watch-only residual，待 app/navigation 层落地后于 `docs/components/amis-bug-driven-improvement-roadmap.md` 评估新增工作项或归 B7（successor required = yes）。
- Non-Blocking Follow-ups（A6/A10/A12/A13/A17/A18）归 B7 backlog，不阻塞本 plan 契约收口。
- 无剩余 plan-owned work。
