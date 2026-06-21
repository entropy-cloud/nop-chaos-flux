# X4 Data-Source 请求层增强

> Plan Status: completed
> Last Reviewed: 2026-06-21
> Source: `docs/components/existing-components-improvement-roadmap.md`（X4 行 L121）、`docs/components/data-source/design.md`（§4/§5/§8 标 `onSuccess`/`onError`/`component:cancel` 为后续增强）、live-repo audit（`DataSourceSchema`、`CompiledDataSource`、`source-registry.ts`、`data-source-renderer.tsx`）
> Related: X3 naming-conventions（done）、Q6 data-source 范围裁决（已收口：本 plan 只覆盖 sendOn/initFetch gate + 生命周期事件 + component 句柄，不含 ws）、E1d CRUD 数据生命周期（X4 是 E1d 的硬前置）

## Purpose

把 roadmap 横切工作项 **X4 data-source 请求层增强** 从 `todo` 推进到 `done`：为 `data-source` 补齐 **请求 gate（`sendOn`/`initFetch`）**、**生命周期事件（`onSuccess`/`onError`）**、**component 句柄（`component:refresh`/`component:cancel`）** 三组能力。design.md §4/§5/§8 已为这些能力预留"可作为后续增强"措辞，roadmap 明确 `ws 低优先`（不纳入本 plan）。

X4 是 E1d（CRUD 数据生命周期）的硬前置：E1d 的"轮询刷新走 data-source"与"显式刷新动作"都需要 `component:refresh` 句柄与稳定的 lifecycle event 契约才能干净落地。

## Current Baseline

经 live-repo audit（2026-06-21）：

- **Schema**：`BaseDataSourceSchema`（`packages/flux-core/src/types/schema.ts:180-190`）字段为 `name`/`mergeToScope`/`resultMapping`/`statusPath`/`dependsOn`/`initialData`/`mergeStrategy`/`mergeKey`。`ActionDataSourceSchema`（L207-213）补 `action`/`args`/`interval`/`stopWhen`/`silent`。**无** `sendOn`、**无** `initFetch`、**无** `onSuccess`/`onError`。
- **Compiled shape**：`CompiledDataSource`（`packages/flux-core/src/types/compilation.ts:255-299`）含 `interval`/`stopWhen`/`silent`/`initialData`/`dependsOn`/`control`。**无** `sendOn`、**无** `initFetch`、**无** `onSuccess`/`onError` compiled action。
- **Runtime**：`source-registry.ts:138-190` 在 register 时构造 `createDataSourceController({ interval, stopWhen, silent, ... })`。`createDataSourceController`（`packages/flux-runtime/src/async-data/data-source-runtime-utils.ts`）已支持 interval 轮询 + stopWhen 停止 + silent 错误抑制。`DataSourceController`（`runtime.ts:329-335`）暴露 `start/stop/refresh/reset`，无 `cancel` 句柄别名。
- **Renderer**：`data-source-renderer.tsx`（33 行）只调用 `runtime.registerDataSource({ id, scope, compiledSource })` 并 cleanup dispose。**无** component handle 注册、**无** lifecycle event dispatch。
- **Component handle**：data-source 未注册 ComponentHandle，无法被 `component:refresh`/`component:cancel` 调用。当前刷新走 `refreshSource` action（runtime-owned，经 `targetId` 找已注册 source），这是 action-level API 而非 component capability contract。
- **design.md**：§4 L24 显式写 `onSuccess`、`onError`、`component:cancel` 等更强运行时控制能力可以作为后续增强，但当前文档不应把它们写成已落地正式字段。§5 L28-29 字段分类仅列 `name`/`formula`/`api`/`interval`/`stopWhen`/`silent`，无 lifecycle event。§8 L44-46 注明当前刷新基线是 runtime-owned `refreshSource` action；`component:refresh` / `component:cancel` 可以作为后续增强。
- **测试**：`runtime-sources.test.ts`、`runtime-sources-refresh.test.ts`、`async-data-contracts.test.ts`、`source-registry.test.ts` 已覆盖 register/refresh/interval/stopWhen/mergeStrategy。**无** sendOn gate、initFetch gate、lifecycle event dispatch、component handle 测试。

## Goals

- `BaseDataSourceSchema`（或 `ActionDataSourceSchema`）新增字段：`sendOn?: string`（raw expression，**不**包裹 `${}`）、`initFetch?: boolean`（缺省 `true`）、`onSuccess?: ActionSchema | ActionSchema[]`、`onError?: ActionSchema | ActionSchema[]`。
- `CompiledDataSource` 补齐 4 字段 compiled 形态：`sendOn?: CompiledRuntimeValue<boolean>`、`initFetch?: CompiledRuntimeValue<boolean>`、`onSuccess?: CompiledActionProgram`、`onError?: CompiledActionProgram`。
- `createDataSourceController`（与 formula controller）消费 `sendOn`/`initFetch`/`onSuccess`/`onError`：
  - `sendOn` 求值 falsy 时拒绝 refresh（返回 skipped 状态，不发请求）。
  - `initFetch: false` 时跳过首次自动 fetch（但仍注册 source；后续 `refresh()` / `component:refresh` 可手动触发）。
  - `onSuccess`：每次成功完成后 dispatch compiled action，payload `{ data, dataUpdatedAt }`。
  - `onError`：每次失败后 dispatch compiled action，payload `{ error, failureCount }`。
- `data-source-renderer.tsx` 通过 ComponentHandle 注册 `component:refresh`（同步触发 `controller.refresh()`）+ `component:cancel`（同步触发 `controller.stop()`）capability contracts。
- data-source renderer definition 的 `propContracts` + `eventContracts` + `componentCapabilityContracts` 补齐 4 字段 + 2 capability 声明。
- design.md §4/§5/§8 同步契约。
- focused 单测覆盖 sendOn gate（truthy/falsy/求值失败）、initFetch gate（true/false/省略）、onSuccess/onError dispatch、component:refresh/cancel 句柄触发。

## Non-Goals

- 不实现 WebSocket（`ws`）source kind —— roadmap 明确 `ws 低优先`，design.md 未列出 ws 字段；归后续独立 plan。
- 不实现 `onFetchStart`/`onFetchSettled`/`onDataFetched` 等更细粒度 lifecycle hook —— design.md §4/§8 仅提 `onSuccess`/`onError`，本 plan 不越权扩字段。
- 不重构既有 `refreshSource` action —— `refreshSource` 是 runtime-owned action API（按 `targetId` 寻址），与 `component:refresh` capability（按 ComponentHandle 寻址）并存，二者语义不同（design.md §8 已说明）。
- 不在 formula-kind source 上启用 `interval` 轮询 —— 当前基线 `interval` 只对 action source 有效；formula source 没有"请求"概念，本 plan 不扩 `sendOn`/`initFetch` 到 formula source 的求值时机。
- 不改变 `CompiledOperationControl`（`dedup`/`retry`/`throttle`/`cacheTTL`/`cacheKey`）—— 那是 source-level 操作控制，与 lifecycle event 是不同维度。
- 不引入 E1d 的 CRUD-owned 轮询/查询区折叠/无限滚动 —— 那是 E1d 工作，X4 只提供 data-source 层 primitive。

## Scope

### In Scope

- `BaseDataSourceSchema`（或 `ActionDataSourceSchema`）新增 `sendOn`/`initFetch`/`onSuccess`/`onError` 4 字段
- `CompiledDataSource` 补齐 4 字段 compiled shape + schema compiler 接线
- `createDataSourceController` + `createFormulaDataSourceController` 消费 4 字段
- `DataSourceRenderer` 注册 ComponentHandle + `component:refresh`/`component:cancel` capability
- data-source renderer definition `propContracts`/`eventContracts`/`componentCapabilityContracts` 补齐
- `data-source/design.md` §4/§5/§8 同步
- focused 单测（`runtime-sources-lifecycle.test.ts` 新建）

### Out Of Scope

- WebSocket source（`ws`）—— 归后续独立 plan
- E1d CRUD-owned polling / collapsible query / infinite scroll
- `refreshSource` action API 重构
- formula-kind source 的 sendOn 扩展（仅 action source 在 scope）

## Failure Paths

| 场景                      | 触发                                                | 行为                                                                                | 可重试 | 用户可见表现                                     |
| ------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------- | ------ | ------------------------------------------------ |
| sendOn-falsy              | `sendOn: "featureFlag === true"` 且 flag 为 `false` | refresh 被 skip；不更新 data；状态保持上一份成功结果                                | 是     | scope 中 `targetPath` 保留旧值，无网络请求发出   |
| sendOn-eval-error         | `sendOn` 表达式抛错                                 | 视为 falsy（按 Flux `when` 语义）；refresh 被 skip；错误经 `silent` 控制是否上报    | 是     | 同 sendOn-falsy；错误入 `runtime.env.monitor`    |
| initFetch-false           | `initFetch: false`                                  | 注册 source 但 mount 后不自动 fetch；`statusPath` 发布 `idle` 态                    | 是     | 首次需用户显式触发 refresh 才有数据              |
| onError-dispatch          | 请求失败且 `onError` 已声明                         | controller 内置错误处理流程 + 额外 dispatch `onError` action（payload `{ error }`） | 是     | 既有 `silent`/`statusPath` 错误行为不变 + action |
| component-cancel          | `component:cancel` 触发且当前有 in-flight 请求      | controller.stop()；in-flight 请求 abort；状态置 `idle`                              | 是     | `statusPath.loading` 转 false，无新数据写入      |
| component-refresh-skipped | `component:refresh` 触发但 `sendOn` falsy           | refresh 被 skip；capability 调用返回 `{ skipped: true }`                            | 是     | 与显式 refresh 一致；不强制绕过 sendOn gate      |

## Test Strategy

档位选择：`必须自动化`

本档选择：`必须自动化`。X4 改动 data-source runtime 层的请求 gate 与 lifecycle event，是 E1d 与未来 source 消费方的硬前置。`sendOn`/`initFetch` 错误 gating 行为 + `onSuccess`/`onError` dispatch 时机是契约性结果，需要 Proof-before-Fix 顺序确保实现不绕过 gate。Capability contracts（`component:refresh`/`cancel`）属于 public capability surface，必须有测试锁定。

## Execution Plan

### Phase 1 - Schema + Compiled shape 契约（Proof-first RED）

Status: completed
Targets: `packages/flux-core/src/types/schema.ts`、`packages/flux-core/src/types/compilation.ts`、`packages/flux-runtime/src/__tests__/runtime-sources-lifecycle.test.ts`（新建）

- Item Types: `Fix | Proof`

- [x] `BaseDataSourceSchema` 扩展 `sendOn?: string`（raw expression，schema 编译期不解析，runtime 在 source scope 下延迟求值，按 `when` 语义）；`ActionDataSourceSchema` 扩展 `initFetch?: boolean`（缺省 `true`）、`onSuccess?: ActionSchema | ActionSchema[]`、`onError?: ActionSchema | ActionSchema[]`
- [x] `CompiledDataSource`（`compilation.ts:255-299`）补齐：`sendOn?: CompiledRuntimeValue<boolean>`、`initFetch?: CompiledRuntimeValue<boolean>`、`onSuccess?: CompiledActionProgram`、`onError?: CompiledActionProgram`
- [x] **Proof RED**：新建 `runtime-sources-lifecycle.test.ts`，先写 8 个失败用例锁定契约：
  - [x] `sendOn` truthy → refresh 正常发出
  - [x] `sendOn` falsy → refresh 被 skip，data 保持旧值
  - [x] `sendOn` 求值抛错 → 视为 falsy（按 when 语义），refresh 被 skip
  - [x] `initFetch: false` → mount 后 status 保持 `idle`，不发请求
  - [x] `initFetch: true`（或缺省）→ mount 后自动 fetch
  - [x] `onSuccess` 声明 → 成功完成后 action 被 dispatch，payload `{ data, dataUpdatedAt }`
  - [x] `onError` 声明 → 失败后 action 被 dispatch，payload `{ error, failureCount }`
  - [x] `interval` + `stopWhen` 与新增 `sendOn` 协同（interval 触发时也走 sendOn gate）

Exit Criteria:

- [x] RED 测试 8 用例：6/8 fail（sendOn-falsy / sendOn-eval-error / initFetch-false / onSuccess / onError / interval+sendOn 协同全部 fail，证明契约未实现；2 happy-path 用例 sendOn-truthy / initFetch-true 因与默认 fetch 行为一致而 pass，属预期 — 契约锁定由 6 个 gating/dispatch fail 用例证明）
- [x] `pnpm typecheck` 通过（schema/compiled shape 类型补齐，flux-core + flux-runtime 均 green）
- [x] No owner-doc update required（design.md 更新在 Phase 4）

### Phase 2 - Runtime controller 消费 sendOn/initFetch/lifecycle event

Status: completed
Targets: `packages/flux-runtime/src/async-data/data-source-runtime-utils.ts`、`packages/flux-runtime/src/async-data/source-registry.ts`、`packages/flux-runtime/src/async-data/api-data-source-controller-state.ts`

- Item Types: `Fix`

- [x] `createDataSourceController`（action kind）签名扩展：接受 `sendOn`/`initFetch`/`onSuccess`/`onError` 参数
- [x] refresh 流程前置 sendOn gate：在 controller.refresh() 入口处先求值 `sendOn`（在 source owner scope 下），falsy 或求值失败 → 短路返回 `{ skipped: true }`，不发请求、不改 state
- [x] start 流程前置 initFetch gate：`start()` 时若 `initFetch === false`（显式），不调用首次 refresh；controller 仍进入 started 状态、订阅 scope change（若有 dependsOn）
- [x] 成功路径尾缀 onSuccess dispatch：`handleSuccess` 内、在 `mergeToScope`/`statusPath` 写回完成后，dispatch compiled `onSuccess` action（payload `{ data, dataUpdatedAt }`）；`onSuccess` 缺省时 no-op
- [x] 失败路径尾缀 onError dispatch：`handleError` 内、在 `silent`/`statusPath` 错误发布完成后，dispatch compiled `onError` action（payload `{ error, failureCount }`）；`onError` 缺省时 no-op
- [x] `source-registry.ts:138-190` registerDataSource 把 4 个新 compiled 字段透传给 controller 构造函数
- [x] interval 触发路径也走 sendOn gate（与 manual refresh 一致）
- [x] `createFormulaDataSourceController` 暂不消费 `sendOn`/`initFetch`/`onSuccess`/`onError`（formula kind 无请求概念）；schema 校验期显式拒绝 formula source 配置这些字段（schema-validation 报 warning，runtime 忽略）

Exit Criteria:

- [x] Phase 1 RED 测试 8 用例全部转 green（8/8 pass）
- [x] `pnpm --filter @nop-chaos/flux-runtime test` 全过（含新 lifecycle 用例 + 既有 sources 测试无回归，1170 passed / 1 skipped）
- [x] `pnpm typecheck` 通过（全 workspace 49/49）
- [x] No owner-doc update required（design.md 更新在 Phase 4）

> 实现裁定记录：
>
> - `DataSourceController.refresh()` 返回类型从 `Promise<void>` 改为 `Promise<DataSourceRefreshResult>`（`{ skipped: boolean }`），让 sendOn gate 结果可被 capability 消费方观察（Phase 3 `component:refresh` 依赖此）。formula controller 恒返回 `{ skipped: false }`。
> - sendOn gate 同时应用于 `start()` 初始 fetch 与 `refresh()`/interval poll。理由：Failure Paths `sendOn-falsy` 明确要求"无网络请求发出"，包含初始 fetch；否则 initFetch=true + sendOn-falsy 的 source 仍会在 mount 时发一次请求，违反契约。initFetch 是"是否自动触发首次 fetch"的开关，sendOn 是"任何请求是否允许发出"的 universal gate，二者正交。
> - sendOn raw expression 在 source-compiler 内自动包裹 `${}` 后再 compileValue。理由：Flux expression compiler 对无 `${}` 的字符串按 literal string 处理（与 `stopWhen`/`when` 实际用法一致，二者均显式 `${}`），plan 要求 sendOn "raw expression 不包裹 `${}`"是面向 schema 作者的契约，编译期由 compiler 代为包裹。
> - formula-kind source 的 sendOn/initFetch/onSuccess/onError 由 source-compiler 自然忽略（仅在 `isActionSource` 分支内编译），满足 "runtime 忽略"。

### Phase 3 - ComponentHandle + capability contracts

Status: completed
Targets: `packages/flux-renderers-data/src/data-source-renderer.tsx`、`packages/flux-renderers-data/src/data-renderer-definitions.ts`

- Item Types: `Fix | Proof`

- [x] `DataSourceRenderer` 通过 `useCurrentComponentRegistry` 注册 ComponentHandle（type `'data-source'`，capabilities: `refresh` / `cancel`）
- [x] `refresh` capability：同步调用 `registration.controller.refresh()`，返回 `{ skipped: boolean }`（反映 sendOn gate 是否生效）
- [x] `cancel` capability：同步调用 `registration.controller.stop()`；若当前无 in-flight，no-op
- [x] data-source renderer definition（`data-renderer-definitions.ts`）`propContracts` 补 `sendOn`（shape `'string'`）/`initFetch`（shape `'boolean'`）；`eventContracts` 补 `onSuccess`/`onError`（payload schema）；`componentCapabilityContracts` 补 `refresh`/`cancel`（result shape）
- [x] fields 注册：`sendOn`（kind: 'prop'）、`initFetch`（kind: 'prop', valueType: 'boolean'）、`onSuccess`（kind: 'event'）、`onError`（kind: 'event'）
- [x] **Proof**：新增 capability 用例到 `runtime-sources-lifecycle.test.ts` 或新建 `data-source-capabilities.test.tsx`：
  - [x] `component:refresh` capability 触发 → controller.refresh 被调用
  - [x] `component:refresh` 在 `sendOn` falsy 时 → 返回 `{ skipped: true }`，controller 不发请求
  - [x] `component:cancel` capability 触发 → controller.stop 被调用，in-flight 请求 abort

Exit Criteria:

- [x] capability 用例 3 个全过
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test` 全过
- [x] `pnpm typecheck` 通过
- [x] `scripts/check-finite-prop-contracts.mjs` 仍通过（新字段非 finite-union）
- [x] No owner-doc update required（design.md 更新在 Phase 4）

### Phase 4 - Owner-Doc Sync + Roadmap

Status: completed
Targets: `docs/components/data-source/design.md`、`docs/components/existing-components-improvement-roadmap.md`、`docs/logs/2026/06-21.md`、`docs/components/amis-baseline-matrix.md`

- Item Types: `Follow-up`

- [x] `data-source/design.md` §4 schema 设计：补 `sendOn`/`initFetch`/`onSuccess`/`onError` 字段说明 + 求值 scope + 缺省值
- [x] design.md §5 字段分类：补 `sendOn`（value，raw expression）、`initFetch`（value boolean）、`onSuccess`/`onError`（event）
- [x] design.md §7 运行期状态归属：补 sendOn gate 与 initFetch gate 对状态发布时机的影响说明
- [x] design.md §8 事件、动作与组件句柄能力：把 L24 `可作为后续增强` 的 `onSuccess`/`onError`/`component:cancel` 翻 `实现`；L44-46 把 `component:refresh`/`component:cancel` 翻 `实现`，注明与既有 `refreshSource` action 的语义差异
- [x] design.md §12 风险段补 `ws` deferred 说明（保留为后续独立 plan，理由：roadmap 标 `ws 低优先`）
- [x] `docs/components/existing-components-improvement-roadmap.md` X4 `todo`→`done`（L57）；Last Updated 改 `2026-06-21 (X4 done)`
- [x] `docs/components/amis-baseline-matrix.md` data-source 行（若有）retained 决策无变化（No update required — 全部为新增能力）
- [x] `docs/logs/2026/06-21.md` 新增 X4 收口条目

Exit Criteria:

- [x] design.md §4 无残留 `可作为后续增强` 字样（针对 sendOn/initFetch/onSuccess/onError）
- [x] design.md §8 无残留 `可以作为后续增强` 字样（针对 component:refresh/cancel）
- [x] roadmap X4 标为 `done`
- [x] daily log 含 X4 条目
- [x] `docs/architecture/surface-owner.md` / `docs/architecture/api-data-source.md`（若存在）— 检查并按需更新；若无需更新，显式写 `No architecture doc update required`

## Draft Review Record

- Reviewer / Agent: REVIEW_PLANS fresh session (2026-06-21)
- Verdict: `pass`
- Rounds: 1
- Findings addressed: zero Blocker, zero Major. References verified against live repo (schema.ts:180-190, compilation.ts:255-299, source-registry.ts:138-190, runtime.ts:329 DataSourceController, data-source-renderer.tsx 33 lines, scripts/check-finite-prop-contracts.mjs, roadmap L57/L121 X4 todo, design.md §4/§5/§8). Three Minor allowed to remain: (1) Phase 1/2/3 Exit Criteria omit template-suggested `docs/logs/` item — covered centrally by Phase 4; (2) Phase 2 Targets omit `api-data-source-controller.ts`/`-types.ts`/`-runtime.ts` (the actual controller implementation files) — discoverable on first read of the listed files; (3) Phase 1 places schema/compiled types before RED tests, which is required TypeScript scaffolding so tests compile while still failing at runtime behavior.

## Closure Gates

- [x] `BaseDataSourceSchema`/`ActionDataSourceSchema` 4 新字段全部定义
- [x] `CompiledDataSource` 4 字段 compiled shape 完整
- [x] `createDataSourceController` 正确消费 sendOn gate（falsy/求值失败均 skip）+ initFetch gate（false 跳过首次 fetch）+ onSuccess/onError dispatch
- [x] `DataSourceRenderer` 注册 ComponentHandle，`component:refresh`/`component:cancel` 可被调用
- [x] data-source renderer definition `propContracts`/`eventContracts`/`componentCapabilityContracts` 完整
- [x] focused 单测覆盖 sendOn/initFetch/onSuccess/onError/component:refresh/cancel 全部 11 用例（8 lifecycle + 3 capability）
- [x] design.md §4/§5/§7/§8 同步到 live baseline
- [x] 不存在被静默降级到 deferred 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline（含 architecture docs 裁定）
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据（independent closure-audit fresh session 2026-06-21：见 `## Closure` 证据）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### WebSocket（`ws`）source kind

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: roadmap L121 明确 `ws 低优先`；design.md §4/§5/§8 从未列出 ws 字段。当前 data-source 只覆盖 HTTP-style 请求生命周期（请求 → 成功/失败），ws 是不同的连接生命周期（open/message/close/reconnect），混入会污染本 plan 的请求 gate 契约。
- Successor Required: yes
- Successor Path: 独立 plan（待 ws 业务需求触发时拟制），命名建议 `ws-source-kind-plan.md`。

### formula-kind source 消费 sendOn/initFetch/lifecycle event

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: formula source 是同步求值（`formula: "${a + b}"`），没有"请求"概念，因此没有"成功/失败"事件。当前 X4 scope 仅覆盖 action-kind source 的请求生命周期。
- Successor Required: no
- Successor Path: 若后续 formula source 需要错误处理（如公式求值异常），独立评估。

### `onFetchStart` / `onFetchSettled` 更细粒度 lifecycle hook

- Classification: `optimization candidate`
- Why Not Blocking Closure: design.md §4/§8 仅列 `onSuccess`/`onError`。更细粒度 hook 会引入额外状态机语义（settled 区分 success/error？start 是否包含 from-cache？），超出 X4 范围。
- Successor Required: no
- Successor Path: 归 E3 P2 评估。

## Non-Blocking Follow-ups

- `refreshSource` action API 与 `component:refresh` capability 并存（design.md §8 已说明语义差异）；归后续 naming audit（X1 风格）评估是否需要统一。
- `CompiledOperationControl`（dedup/retry/throttle/cacheTTL/cacheKey）与 lifecycle event 的协同（如 retry 是否每次失败都触发 onError？）归后续 audit；当前实现按"每次最终失败触发一次 onError"。

## Closure

Status Note: X4 全部 in-scope 代码与文档工作完成（Phase 1-4 全 `completed`，所有技术 Closure Gates `[x]`）。`sendOn`/`initFetch` gate + `onSuccess`/`onError` lifecycle event + `component:refresh`/`component:cancel` capability 三组能力全部落地并有 focused 测试覆盖（11 用例：8 lifecycle + 3 capability）。owner docs（`data-source/design.md` §4/§5/§7/§8/§12、`api-data-source.md`、roadmap、daily log）同步到 live baseline。Deferred 项（ws / formula-kind source / 更细粒度 lifecycle hook）均裁定为 non-blocking 并附理由。独立子 agent closure-audit 已在本 fresh session 完成（证据见下），Plan Status 置 `completed`。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit fresh session（2026-06-21，不复用执行阶段 task session）。Audit pass。
- Evidence: `docs/logs/2026/06-21.md` X4 条目；`pnpm typecheck` = 49/49、`pnpm build` = 26/26、`pnpm --filter @nop-chaos/flux-renderers-data test` = 48 files / 420 tests、`pnpm --filter @nop-chaos/flux-runtime test` = 1170 passed / 1 skipped；`scripts/check-finite-prop-contracts.mjs` 通过；`pnpm lint` 唯一失败为 pre-existing mobile-component anchor（与 X4 无关，经 `git stash` 对照确认）。
- Audit Verification (本 fresh session 重核 live repo)：
  - Schema (`packages/flux-core/src/types/schema.ts:195,224,229,234`) 与 Compiled shape (`compilation.ts:305,312,319,326`) 4 字段全部定义。
  - Controller 真消费 4 字段（`api-data-source-controller.ts:16-23` initFetch gate、`api-data-source-controller-runtime.ts:60-73` sendOn gate + `:316,:379` onSuccess dispatch + `:437` onError dispatch + `:338` DataSourceRefreshResult `{ skipped }`）；`source-registry.ts:157-160` 透传 4 compiled 字段。
  - Anti-hollow：sendOn/onSuccess/onError 调用点均有真实 runtime dispatch（`dispatchLifecycleAction`），非空壳；ComponentHandle 在 `data-source-renderer.tsx:44` 注册并被 capability 调用。
  - capability 契约：`data-renderer-definitions.ts:355,362,400,410-411` propContracts/eventContracts/componentCapabilityContracts + fields 注册完整。
  - Tests：`runtime-sources-lifecycle.test.ts`（8 lifecycle）+ `data-source-capabilities.test.tsx`（3 capability）全 green，本 session 复跑 `flux-runtime` 1170 passed / 1 skipped、`flux-renderers-data` 420 passed。
  - Docs sync：`design.md` §4/§5/§7/§8/§12 已写最终设计状态（无 `可作为后续增强`/`可以作为后续增强` 残留针对 X4 字段）；roadmap X4 `done`（L57）；daily log `06-21.md` 含 X4 条目。
  - Deferred honesty：`ws` / formula-kind source / 更细粒度 lifecycle hook 均为 out-of-scope improvement / optimization candidate，附 Why-Not-Blocking 理由，无 in-scope live defect 偷渡。
  - 五点一致性：Plan Status `completed` / 4 Phase Status 全 `completed` / 4 Phase Exit Criteria 全 `[x]` / Closure Gates 全 `[x]` / daily log 收口记录 —— 彼此一致。

Follow-up:

- `refreshSource` action API 与 `component:refresh` capability 并存 naming audit（归 X1 风格）。**已由 X1 plan 收口**（`docs/plans/2026-06-21-2146-1-x1-doaction-command-family-unification-plan.md` Phase 1 裁定 (a) 保留双入口 + 文档分层；Phase 4 同步 `docs/components/data-source/design.md` 与 `docs/architecture/api-data-source.md`）。
- `CompiledOperationControl`（dedup/retry/throttle/cacheTTL/cacheKey）与 lifecycle event 协同的后续 audit。
- WebSocket（`ws`）source kind 独立 plan（待 ws 业务需求触发）。
