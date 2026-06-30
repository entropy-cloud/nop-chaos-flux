# B2.1 异步请求 4xx/取消/去重契约

> Plan Status: completed
> Last Reviewed: 2026-06-26
> Source: `docs/components/amis-bug-driven-improvement-roadmap.md` (Wave B2, work item B2.1), `docs/components/amis-bug-driven-improvements/11-api-data-and-scope.md` (A1/A2/A3/A11), `docs/architecture/api-data-source.md`
> Mission: amis-bug-driven-improvements
> Work Item: B2.1 异步请求 4xx/取消/去重契约
> Related: successor B3.1（table 行身份/数据收缩钳制/排序选择）依赖本工作项先落地；B2.2（scope 传播/隔离）与本项同 wave 但独立

## Purpose

把 roadmap 工作项 B2.1 收口：收敛 Flux 请求执行层在 non-OK 响应适配、单一 error→notify 翻译、schema-fetch 缓存/并发去重上的设计与实现 gap，并把 `requestAdaptor` 改写 GET query 这一已正确行为锁成回归锚。

与 B1.1（纯 TEST-GAP 锁定）不同，**本工作项含两处确认的 live 实现缺口**：A1（`responseAdaptor` 在 non-OK 不可达）与 A11（schema-fetch 不参与缓存、无跨订阅者并发去重）。两者均为 P0，必须在本计划内修复并配聚焦测试，不得降级为 follow-up。

## Current Baseline

> 来源：2026-06-26 独立子 agent 对 `packages/flux-runtime/src/async-data/`、`packages/flux-action-core/`、`packages/flux-renderers-basic/src/dynamic-renderer.tsx` 的 live-repo 审计。

**已成立（实现层）：**

- 请求执行主收敛：`async-data/request-runtime.ts:351-414` `executeApiSchema`；`prepareApiRequestForExecution`（`:330-349`）= 物化 → requestAdaptor → 再终结 URL。
- 非 OK → 抛错：`createApiResponseError`（`request-runtime.ts:63-86`），抛出在 `executeApiSchema:395`。
- requestAdaptor 浅合并回 ApiSchema：`request-runtime-adaptor.ts:106-130`（合并 `:127-129`）；URL 终结在 adaptor 之后（`finalizeMaterializedApiRequest` → `canonicalizeUrlWithParams`，`request-runtime.ts:323-328,235`）。
- responseAdaptor：`request-runtime-adaptor.ts:132-155`，**仅从 `executeApiSchema:398` 在 `response.ok` 分支调用**。
- owner-local transport 去重：`createApiRequestExecutor`（`request-runtime.ts:418-510`），key = `createRequestKey`（owner + actionType + method + url + data + headers，`:142-157`），策略 cancel-previous/ignore-new/parallel（`:445-485`）。
- 运行时缓存：`api-cache.ts:156-243` LRU；**仅在 data-source controller 内读写**（`api-data-source-controller-runtime.ts:264-269,363-364`）。
- 单一 notify：`flux-action-core/src/action-dispatcher/action-execution.ts:182-213`（call `:212`）；onSettled 兜底 notify（`:639-643`）；默认 host fetcher **不 notify**（`flux-react/src/defaults.ts:16-31`）。
- schema 加载：Flux **无 amis 式 `schemaApi` 字段**；唯一 schema 加载器是 `DynamicRenderer`（`flux-renderers-basic/src/dynamic-renderer.tsx:67-275`，loadAction/dispatch/register 逻辑约 `:67-217`），经 `loadAction` → `props.helpers.dispatch`（`:123`）→ `executeRuntimeAjaxAction`（`runtime-action-helpers.ts:100-158`）→ `executeApiSchema`（executor = `createApiRequestExecutor`）。

**已有测试覆盖：**

- A1：无测试组合 `responseAdaptor` + non-OK。既有 non-OK 测试（`request-runtime.executor.test.ts:18-67`）无 adaptor，且**断言抛错绕过 adaptor**（`.rejects.toThrow('Request failed with status 500')`）。responseAdaptor 测试全用 `ok:true`（`runtime-ajax.test.ts:8-66`）。
- A2：无测试验证 4xx 经 `runtime.dispatch` 恰好一次 `env.notify`，也无「抛错携带 backend msg」断言。`notify` 的 `toHaveBeenCalledTimes(1)` 断言只出现在无关的 report/page 测试。
- A3：**已锁**。`request-runtime.test.ts:308-333`「rebuilds final url after requestAdaptor mutates params and data」直接断言 `finalUrl === '/api/users?page=1&token=secure-token'`；辅证 `request-runtime.executor.test.ts:431`。
- A11：无 schema-fetch 缓存测试，无跨订阅者并发同请求去重测试。既有去重测试（`request-runtime.executor.test.ts:237,266,297,354,431`）均为 owner-local/单订阅者。

**真正剩余 gap（确认 live 缺口）：**

- **A1（P0，live defect + doc/code drift）**：live `executeApiSchema:388-396` 在 `!response.ok` 时**先抛错**，responseAdaptor（`:398-405`）**只在 ok 分支可达** —— 与 A1 要求（responseAdaptor 在 non-OK 也执行，可映射错误/msg，onError 随后）**相反**。owner doc「Required Request Execution Flow」（`api-data-source.md:246-254`）把「Apply responseAdaptor」(step 6) 列在「non-OK throw」(step 7) **之前**，即 doc 意图 = A1，但 code 反向。Fetcher Boundary 段（`:113,120`）只说「转成抛错」未提 adaptor 在 non-OK 可达。
- **A2（P1，TEST-GAP + 后端 key 分歧）**：`createApiResponseError` 读 `responseData.message`（`request-runtime.ts:73-79`）；amis 后端典型返回 `msg`。今日 backend 返回 `{ok:false,status:400,data:{msg:'...'}}` 会得到通用 `"Request failed with status 400"`，而非 backend 信息。单一 notify 契约也无回归锚。
- **A3（P1，LOCK）**：行为正确且有测试，仅需确认锁定（无额外实现）。
- **A11（P0，DESIGN-GAP + 未实现）**：schema-fetch（DynamicRenderer loadAction）**不查缓存**（cache 仅 data-source controller 内）；dedup key 是 owner-scoped，两个 co-mounted DynamicRenderer 同 loadAction 因不同 owner → **无跨订阅者去重**，各自发请求。默认 dedup 为 cancel-previous（per-owner 超越），非「第二订阅者复用 in-flight」。

## Goals

- A1：让 `responseAdaptor` 在 non-OK 响应也执行（payload + status 可用，可映射错误/msg），随后才抛错；消除 doc/code drift；配聚焦 failing-test-first。
- A2：保证 4xx 经 runtime 恰好一次 `env.notify`，且抛错携带 backend 信息（裁定 message/msg 读取策略）；配回归锚。
- A11：让 schema-fetch 参与按 executable identity 的并发同请求去重（第二订阅者复用 in-flight），并让 schema-fetch 路径参与运行时缓存；配跨订阅者去重 + 缓存命中测试。
- A3：确认 LOCK 行为有回归锚（已存在，复核即可）。
- owner doc `api-data-source.md` 同步：A1 non-OK 可达、A2 单一 notify 契约、A11 schema-fetch 缓存/去重定义。

## Non-Goals

- 不引入 amis 式 `schemaApi` 字段（Flux 已拒绝；schema 加载统一走 DynamicRenderer loadAction）。
- 不改 `data-source` 控制器的 source-level refresh dedup（cancel-previous/ignore-new/parallel 已落地，归既有 owner 行为）。
- 不覆盖 B2.2 的 scope 传播/隔离/词法继承深度/location-param 隔离（A14-A16/A19 等）。
- 不实现 A4/A7/A8/A9/A10/A12/A13 等非 B2.1 AMIS-REF 条目（属 B2.2 或更低优先级）。
- 不重构 `executeApiSchema` 为新架构；仅修正 non-OK 适配可达性与 schema-fetch 缓存/去重接入。

## Scope

### In Scope

- A1：`responseAdaptor` 在 non-OK 响应执行（含 payload + status），可映射错误/msg，随后抛错；doc/code 对齐。
- A2：4xx 单一 `env.notify`（runtime 拥有唯一 error→notify 翻译，host fetcher 不重复 notify）；抛错携带 backend 信息（裁定 message/msg）。
- A3：LOCK 复核（`requestAdaptor` 改写 params 影响 GET `finalUrl`）。
- A11：schema-fetch（DynamicRenderer loadAction）按 executable identity 并发同请求去重（跨订阅者复用 in-flight）+ 参与运行时缓存。
- owner doc 同步：`api-data-source.md` 三处 DESIGN-GAP（A1/A2/A11）。

### Out Of Scope

- B2.2 条目（A5/A9/A14-A16/A19 等 scope 传播/隔离/reaction）。说明：roadmap AMIS-REF 列把 A2 也列在 B2.2，但 A2 的「单一 error→notify」与「抛错携带 backend msg/key」共享同一条 error→notify→message 管道、不可分割，故**完整 A2** 在本计划收口；B2.2 仅保留 A5/A9/A14-A16/A19。
- 组件级 `api`/`initApi`/`interval`（Flux 已拒绝，NOT-ADOPTED）。
- 全局 request/audit 拦截层（owner doc 列为「candidate future host-boundary convergence」，非本计划）。
- ami `dataProvider`/`adaptor` 任意 JS（已拒绝）。

## Failure Paths

> 涉及 HTTP 错误契约，强烈建议参考本节。

| 场景编号             | 触发                                             | 行为                                                                                     | 可重试           | 用户可见表现                                          |
| -------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------- |
| A1-adaptor-on-4xx    | GET 返回 400 + body；schema 声明 responseAdaptor | responseAdaptor 在 400 上执行（payload+status 可用），可映射 msg；随后抛错；onError 触发 | 依 control.retry | 错误提示含 backend 映射信息，非通用「Request failed」 |
| A2-single-notify     | fetcher 在 4xx 抛错 → runtime.dispatch           | 恰好一次 `env.notify('error', ...)`；抛错 message = backend msg/message                  | 否               | 单条 toast，信息为后端原文                            |
| A2-backend-key       | backend 返回 `{data:{msg:'...'}}`                | 抛错携带 `msg`（裁定后），不退化为通用文案                                               | 否               | toast 显示后端 msg                                    |
| A11-concurrent-fetch | 两个 DynamicRenderer 同 loadAction 同时 mount    | 按 executable identity 去重为一次 in-flight；两订阅者均收结果                            | n/a              | 单次网络请求；两处均渲染                              |
| A11-cache-hit        | 同一 schema-fetch 短时重复触发                   | 命中运行时缓存，不重复发请求                                                             | n/a              | 无重复请求                                            |

## Test Strategy

本档选择：**必须自动化**

理由：B2.1 是 P0 锚点工作项；A1/A11 是确认的 live 缺口（非纯文档）。依 guide「必须自动化」档：Proof（failing test）必须先于 Fix。

- A1：先写 failing test（responseAdaptor 在 400 上被调用 + 可映射 msg），再改 `executeApiSchema` 顺序。
- A11：先写 failing test（两个 co-mounted DynamicRenderer 同 loadAction → 期望一次 in-flight、两订阅者收结果 + 缓存命中），再接入去重/缓存。
- A2：failing test（4xx → `notify` 恰好一次 + 抛错携带 backend msg），再裁定/修正 key 读取。

## Execution Plan

### Phase 1 - 语义裁定与 failing-test 先行（A1/A2/A11）

Status: completed
Targets: `packages/flux-runtime/src/__tests__/`（新增 `request-runtime-response-adaptor-non-ok.test.ts` 等），`docs/architecture/api-data-source.md`（裁定记录）

- Item Types: `Decision`、`Proof`

- [x] (Decision, A1) 裁定 responseAdaptor 在 non-OK 的精确语义：执行时 payload + status + api + lexical scope 可用；可「映射错误/normalize msg」但**不把 non-OK 恢复成成功**（仍随后抛错，onError 触发）。记录到 `api-data-source.md`。
- [x] (Decision, A2) 裁定 backend 错误 key 策略：是否同时读 `message` 与 amis 风格 `msg`（以及 `statusPath`/`errors`）；裁定后明确「抛错 message 来源优先级」。记录到 `api-data-source.md`。
- [x] (Decision, A11) 裁定 schema-fetch 去重/缓存机制：去重 key = executable identity（method+url+data+headers，**跨 owner**）；去重共享层落点（runtime-level in-flight registry vs request-runtime 层）；缓存策略（复用 `apiCache` + TTL/key 来源）。记录到 `api-data-source.md`。
- [x] (Proof, A1) failing test：GET 400 + body + responseAdaptor → 断言 adaptor 被调用、可映射 msg、随后抛错且抛错 message 含映射结果。（先红）
- [x] (Proof, A2) failing test：4xx 经 `runtime.dispatch` → 断言 `env.notify` 恰好一次、抛错携带 backend msg/message。（先红）
- [x] (Proof, A11) failing test：两个 co-mounted DynamicRenderer 同 loadAction → 期望一次 in-flight、两订阅者均收结果；同一 schema-fetch 短时重复命中缓存。（先红）

Exit Criteria:

> 本 Phase 只产出裁定 + 先红测试，不改实现；保证 Phase 2/3 有明确语义与可验证锚。

- [x] A1/A2/A11 三条 Decision 已记录到 `api-data-source.md`（裁定结论，非叙事）。
- [x] A1/A2/A11 三条 failing test 已落地且当前为红（证明确为缺口）。

### Phase 2 - Fix A1（non-OK responseAdaptor 可达性）+ A2（单一 notify / backend msg）

Status: completed
Targets: `packages/flux-runtime/src/async-data/request-runtime.ts`（`executeApiSchema:378-405` 顺序）、`request-runtime.ts:63-86`（错误信息提取）、`packages/flux-action-core/src/action-dispatcher/action-execution.ts`（notify 路径复核）

- Item Types: `Fix`、`Proof`

- [x] (Fix, A1) 调整 `executeApiSchema`：在 `!response.ok` 抛错**之前**先对 response（payload+status+api+scope）应用 `responseAdaptor`，使 adaptor 可映射错误/normalize msg；adaptor 结果参与随后 `createApiResponseError` 的 message 提取。保持「non-OK 不恢复成成功」。
- [x] (Fix, A2) 按 Phase 1 裁定修正 backend 错误 key 读取（如 `message` ?? `msg`），保证抛错携带 backend 信息而非通用文案；复核 action 层 notify 路径确保「runtime 拥有唯一 error→notify 翻译、host fetcher 不重复 notify」成立（若 host fetcher 有重复 notify 则收敛）。
- [x] (Proof) Phase 1 的 A1/A2 failing test 转 green；补充 owner doc 对应规则与 live code 一致性抽查。

Exit Criteria:

- [x] A1 responseAdaptor 在 non-OK 可达且不恢复成功；A1 failing test green。
- [x] A2 单一 notify + backend msg 携带；A2 failing test green。
- [x] `api-data-source.md` Fetcher Boundary / responseAdaptor 段落已对齐 live code（消除 doc/code drift）。

### Phase 3 - Fix A11（schema-fetch 并发去重 + 缓存接入）

Status: completed
Targets: `packages/flux-runtime/src/async-data/`（去重共享层 + 缓存接入）、`packages/flux-renderers-basic/src/dynamic-renderer.tsx`（loadAction 路径接入）、`packages/flux-runtime/src/runtime-action-helpers.ts:100-158`

- Item Types: `Fix`、`Proof`

- [x] (Fix, A11) 按 Phase 1 裁定实现按 executable identity 的跨 owner 并发同请求去重（第二订阅者复用 in-flight；settled 后两订阅者均收结果），落点遵循「runtime 拥有、不污染 ScopeRef」边界（对齐 `api-data-source.md` Runtime Ownership 段）。
- [x] (Fix, A11) 让 schema-fetch（DynamicRenderer loadAction → `executeApiSchema`）路径参与运行时缓存（复用 `apiCache`，TTL/key 来源按裁定），命中即不重复发请求。
- [x] (Proof) Phase 1 的 A11 failing test（跨订阅者去重 + 缓存命中）转 green；补充「不同 executable identity 不误去重」负向测试。

Exit Criteria:

- [x] 两个 co-mounted DynamicRenderer 同 loadAction 共享一次 in-flight 且均收结果；缓存命中不重复发请求；不同 identity 不误合并。
- [x] A11 failing test green + 负向测试 green。
- [x] `api-data-source.md` 已写明 schema-fetch 缓存/去重契约。

### Phase 4 - A3 LOCK 复核与 owner doc 收口同步

Status: completed
Targets: `packages/flux-runtime/src/__tests__/request-runtime.test.ts`（A3 复核）、`docs/architecture/api-data-source.md`

- Item Types: `Proof`、`Decision`

- [x] (Proof, A3) 复核 `request-runtime.test.ts:308-333` 仍 green 且断言「requestAdaptor 改写 params 影响 GET `finalUrl`」；如覆盖不足补一条显式 LOCK 锚。
- [x] (Decision) 收口同步 `api-data-source.md`：A1（non-OK responseAdaptor 可达）、A2（单一 notify 契约 + backend key 策略）、A3（已有 `:186` 显式表述，复核）、A11（schema-fetch 缓存/去重契约）四处与 live code 一致，无「Proposed vs Current」叙事。
- [x] (Proof) 抽查修改后的 owner doc 与 live code（`executeApiSchema` 顺序、去重共享层、缓存接入）一致。

Exit Criteria:

- [x] A3 LOCK 行为有显式回归锚并通过。
- [x] `api-data-source.md` 四处 DESIGN-GAP/契约已收口且与 live baseline 一致。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，首轮 `ses_0ffec3817ffeCgfGdSJVOXoXfm`、复审 `ses_0ffe5eb44ffeQfrgN7ML602Bov`）
- Verdict: `pass-with-minors`
- Rounds: 2（首轮 1 Major → 修订 → 复审零 Blocker / 零 Major，达成共识）
- Findings addressed:
  - Major M1（`Deferred But Adjudicated` 预授权 A11 cache 半可延期，违反 Anti-Slacking / Non-Degradable）→ 已删除条件性逃生口，commit dedup+cache 两半均不可延期；live 核对确认 A11 机制全在 `packages/flux-runtime`，无跨包屏障。
  - Minor m1（A2 scope note 与 Goals/Phase 2 不一致）→ Out Of Scope 已改为「完整 A2 在本计划收口，B2.2 仅留 A5/A9/A14-A16/A19」。
  - Minor m2（`dynamic-renderer.tsx:67-217` 误作全组件）→ 已标注全组件 `:67-275`、逻辑段约 `:67-217`。
  - Minor m-new1（Deferred 误写「Phase 3」含 A1）→ 已改为「A1 于 Phase 2、A11 于 Phase 3」。
  - 复审确认：A1 关键 live-defect 引用准确（`request-runtime.ts:395` 抛错先于 `:398-405` adaptor）；item type 正确（A1/A2/A11=Fix，A3=Proof/Decision）；failing-test-first 顺序完整；B2.2 边界干净。

## Closure Gates

> 关闭条件：本 section 所有条目及每个 Phase Exit Criteria 全 `[x]` 后，方可将 `Plan Status` 改为 `completed`。

- [x] A1：responseAdaptor 在 non-OK 可达（不恢复成功），doc/code drift 已消除，聚焦测试通过。
- [x] A2：4xx 单一 notify + backend msg 携带，聚焦测试通过。
- [x] A3：LOCK 行为有回归锚并通过。
- [x] A11：schema-fetch 按 executable identity 跨订阅者去重 + 缓存接入，聚焦测试（含负向）通过。
- [x] owner doc `api-data-source.md` 四处已同步且与 live baseline 一致。
- [x] 不存在被静默降级到 deferred/follow-up 的 in-scope live defect 或 contract drift（A1/A11 为确认缺口，必须 landed）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

_本计划范围内无 deferred 项。A1/A11 为确认 P0 live 缺口（dedup 与 cache 两半均在同一 `packages/flux-runtime` 内，无跨包屏障），不可 deferred，必须在各自 Phase（A1 于 Phase 2、A11 于 Phase 3）landed。执行期若发现某子项确需移出，须显式登记 `Classification` + `Why Not Blocking Closure` + `Successor Required` 并经独立裁定，但 A11 的 dedup 与 cache 均非可预延期项。_

## Non-Blocking Follow-ups

- A4（request-adaptor abort 契约显式化）、A7（字面量 `${` 转义）、A8（数组 GET 参数序列化策略）属 B2.2 或更低优先级，不阻塞本计划契约收口。
- owner doc 「candidate future host-boundary convergence」（data-source failure notify / 审计拦截层）为更广 host 边界议题，非本计划。

## Closure

Status Note: 已收口。A1/A2/A11 三处确认的 P0/P1 live 缺口均 landed 并配聚焦测试；A3 LOCK 锚复核通过；owner doc `api-data-source.md` 四处 DESIGN-GAP/契约与 live code 一致。独立 closure-audit（fresh session）全量复核源码、测试与文档，未发现 Blocker / deferred in-scope 项 / doc-code drift。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure auditor（fresh session，glm-5.2，ses 独立于执行 session）
- Live-code 复核（全部命中）：
  - A1：`request-runtime.ts:400-418` 在 `!response.ok` 抛错之前应用 `applyResponseAdaptor`（含 `status`，`request-runtime-adaptor.ts:139,153`），adapted payload 经 `createApiResponseError({ ...response, data: adaptedData })` 喂入错误 message；non-OK 仍抛错、不恢复成功。
  - A2：`request-runtime.ts:63-78` `readResponseErrorMessage` 读 `message` 后 `msg`；`runtime-action-helpers.ts:202-215` HTTP 业务失败返回 `{ok:false}`（dispatcher 单次 error→notify），`217` 基础设施错误仍 re-throw。
  - A3：`request-runtime.test.ts:308-333` LOCK 锚存在，断言 `finalUrl === '/api/users?page=1&token=secure-token'`。
  - A11：`request-in-flight-registry.ts:14-43` 按 executable identity 去重、registry 自有 `AbortController`（与订阅者 signal 解耦）；`runtime-action-helpers.ts:137-188` 仅在 `sharing && cacheTTL>0 && safe method` 时启用；`runtime-factory.ts:117-118,556` 创建并在 dispose 时回收；`action-adapter.ts:167` 透传 `sharing`。owner-local cancel-previous/ignore-new/parallel 未改动。
- Doc 一致性：`api-data-source.md` A1（`:122-129`）、A2（`:131-137`）、A11（`:258-280`）、Required Request Execution Flow（`:293-294`）均与 live code 一致，无 "Proposed vs Current" 叙事漂移。
- Deferred 复核：`Deferred But Adjudicated` 为空（如计划要求）；`Non-Blocking Follow-ups` 仅列 A4/A7/A8 与 host-boundary convergence，均属显式 Out Of Scope / Non-Goals，非静默降级的 in-scope 项。
- 验证命令实测结果：
  - `pnpm --filter @nop-chaos/flux-runtime test` → 98 files passed (1 skipped) / 1201 tests passed (1 skipped)
  - `pnpm --filter @nop-chaos/flux-renderers-basic exec vitest run src/__tests__/basic-dynamic-renderer.test.tsx` → 1 file / 15 tests passed
  - `pnpm typecheck` → 55/55 tasks successful
  - `pnpm lint` → 29/29 tasks successful（仅 2 条 pre-existing TanStack `useVirtualizer` warning，位于 flux-renderers-form / flux-renderers-form-advanced，与本工作项无关）
- 新增测试文件复核：`request-runtime-response-adaptor-non-ok.test.ts`（A1，3 cases）、`request-runtime-error-notify.test.ts`（A2，2 cases）、`request-runtime-schema-fetch-dedup-cache.test.ts`（A11，4 cases，含负向）、`basic-dynamic-renderer.test.tsx` A11 集成段（`:524-575`，co-mount 共享 in-flight）。

Follow-up:

- no remaining plan-owned work。successor：B3.1（table 行身份/数据收缩/排序选择）依赖本工作项已落地，可启动；B2.2（scope 传播/隔离）同 wave 独立推进。
