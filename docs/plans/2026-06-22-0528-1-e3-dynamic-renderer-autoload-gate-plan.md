# E3 dynamic-renderer 加载门控（autoLoad gate + component:refresh）

> Plan Status: completed
> Mission: components-improvement
> Work Item: E3 dynamic-renderer initFetch gate 子项
> Last Reviewed: 2026-06-22
> Source: `docs/components/existing-components-improvement-roadmap.md`（E3 P2 行「dynamic-renderer initFetch gate」）、`docs/components/existing-components-improvement-analysis.md` §2.1（data-source 作为统一请求层：`initFetch` gate 可做）、`docs/components/dynamic-renderer/design.md` §4/§7/§8
> Related: `docs/plans/2026-06-21-2146-1-x1-doaction-command-family-unification-plan.md`（X1 `component:refresh` 词汇；data-source 已落地 `component:refresh`）、`docs/references/component-handle-vocabulary.md`（`refresh` 语义）

## Purpose

把 `dynamic-renderer`（`flux-renderers-basic`）从「mount 即自动触发 `loadAction`、无句柄」补齐为「作者可控加载时机」：新增 `autoLoad?: boolean`（缺省 `true`，向后兼容）门控 mount 自动加载，并落地 `component:refresh` 句柄（design.md §8 已承诺「可以提供 `component:refresh` 之类的重新解析能力」，当前**未实现**），让作者能按需触发 schema 重新加载。

**范围裁定**（基于 design.md §4/§7/§8 + 分析报告 §5）：

- **这是 Flux 原生门控，不是 amis 组件级 api。** 分析报告 §5 明确拒绝 amis 式组件级 `api`/`initFetch`/`sendOn`/`interval`（请求下沉 data-source + action）。本 plan 的 `loadAction` 仍是 action（走 action graph），`autoLoad` 只是门控「该 action 何时触发」，`component:refresh` 只是重新触发同一 action——二者都不是组件级请求短路径。这与 X4 给 data-source 落地的 `initFetch: false` + `component:refresh` 是同一模式在不同 owner 上的投影。
- **不含 `sendOn`/`interval`/轮询。** dynamic-renderer 是 schema 装配组件，不是数据轮询组件；按需刷新由 `component:refresh` 显式触发即可。`sendOn` 前置 gate 归 data-source（X4 已落地），不在本组件重复。

## Current Baseline

- `packages/flux-renderers-basic/src/dynamic-renderer.tsx`（180 行）：
  - `DynamicRenderer` L52-180；`useEffect` L71-122 在 mount 及 `loadActionKey` 变化时**无条件**调用 `loadSchema()`（L117），无任何 gate。
  - `createDynamicRendererState` L43-50：`loading: Boolean(loadAction)`——只要有 `loadAction` 就进入 loading 态并自动拉取。
  - **无 `ComponentHandle` 注册**：组件未调用 `useCurrentComponentRegistry` / `componentRegistry.register`，design.md §8 承诺的 `component:refresh` **完全未落地**。
  - 三态已收口（design.md §7）：loading（spinner + optional body）、schema-ready（动态 schema render）、error（diagnostic text）。本 plan 不改三态机，只改「何时进入 loading」。
- `packages/flux-core/src/types/schema.ts:250-254`：`DynamicRendererSchema` 仅 `loadAction` + `body?`，**无 `autoLoad`**。
- `packages/flux-renderers-basic/src/basic-renderer-definitions.ts:309-354`：`dynamic-renderer` definition，`schemaValidator` 校验 `loadAction` 形状；**无 `autoLoad` 字段声明**、**无 `componentCapabilityContracts`**。
- `packages/flux-renderers-basic/src/__tests__/basic-dynamic-renderer.test.tsx`（265 行，7 用例）：覆盖 loading body / 成功替换 / 失败错误 / 非法 schema / stale 清除 / scope 变化重载。**全部基于「mount 即自动加载」假设**，无 gate 用例、无 refresh 用例。
- `docs/components/dynamic-renderer/design.md`（69 行，12 节）：§2 是叙述节（无 Flux 决策表，X5 未覆盖 dynamic-renderer）；§4 列 `fallback`/`empty`/`errorMode`/`onError` 为「后续增强，不应写成当前正式契约」；§7 三态已收口；§8 明确「可以提供 `component:refresh` 之类的重新解析能力」+「`onError`/notify 仍可作为后续增强」。
- **X5 决策表覆盖情况**：`docs/plans/2026-06-21-0255-x5-flux-decision-tables-plan.md` 的 P0/P1 硬前置未覆盖 dynamic-renderer（P2）。本 plan 需扩展 X5 到该组件。
- **对照范本**（data-source 已落地的同模式）：`packages/flux-renderers-data/src/data-source-renderer.tsx` L39-83 注册 `component:refresh`/`cancel`/`start` 句柄；`packages/flux-runtime/src/async-data/api-data-source-controller.ts:15-27`（`resolveInitFetch`）实现 `initFetch` gate（`initFetch: false` → 不自动 fetch）。本 plan 的 `autoLoad`/`component:refresh` 是该模式在 dynamic-renderer 上的对偶。
- playground：`apps/playground/src/component-lab/renderers/dynamic-renderer-lab-page.tsx` 已有 demo（mock fetcher 返回静态 schema / by-type schema），覆盖自动加载场景；**无 autoLoad:false + 手动 refresh 的 demo**。
- `docs/components/examples.manifest.json` L12 已登记 `dynamic-renderer`（runtime 列表）。

## Goals

- `DynamicRendererSchema` 新增 `autoLoad?: boolean`（缺省 `true`）。`autoLoad: false` 时，mount 不自动触发 `loadAction`，组件停留在 body region（或空）态，直到 `component:refresh` 被调用。
- `dynamic-renderer` 注册 `component:refresh` 句柄（按 X1 vocabulary `refresh` 语义），调用时重新求值 `loadAction` 并触发 `loadSchema()`；返回 `{ok:true}` 或失败时 `{ok:false, error}`。
- `dynamic-renderer/design.md` 新建 §2 Flux 决策表（X5 扩展），记录 `autoLoad`/`component:refresh` 采纳与 amis 组件级 api 不采纳的裁定。
- focused 单测覆盖：`autoLoad:true`（缺省）自动加载无回归、`autoLoad:false` mount 不加载、`component:refresh` 触发加载、refresh 期间 abort 旧请求、refresh 错误返回 `{ok:false}`。
- playground demo 新增「autoLoad:false + 按钮触发 component:refresh」场景。
- e2e 覆盖 autoLoad:false 不加载 + refresh 后加载的关键路径。

## Non-Goals

- 不引入 amis 式组件级 `api`/`initFetch`/`sendOn`/`interval`/`silentPolling`（分析报告 §5 已拒绝；请求下沉 data-source + action）。
- 不实现 `fallback`/`empty`/`errorMode`/`onError` region/notify（design.md §4/§8 明确列为后续增强，非当前契约）。
- 不实现 `component:cancel`（dynamic-renderer 已用 `AbortController` 在 cleanup/unload 时 abort，无显式 cancel 句柄需求；非数据轮询组件）。
- 不改三态机（loading/schema-ready/error）——design.md §7 已收口。
- 不实现 schema 编译缓存或 compiler 私有对象导出（design.md §11/§12 风险项）。
- 不改 `loadAction` 的 action-shape validation（既有 `schemaValidator` 保持）。

## Scope

### In Scope

- `DynamicRendererSchema` 新增 `autoLoad?: boolean`。
- `dynamic-renderer.tsx`：mount gate（`autoLoad:false` → 跳过自动 `loadSchema`）+ `component:refresh` 句柄注册（`useCurrentComponentRegistry`）。
- `basic-renderer-definitions.ts`：`dynamic-renderer` definition 声明 `autoLoad` 字段 + `componentCapabilityContracts`（`refresh`）。
- `dynamic-renderer/design.md`：§2 Flux 决策表 + §4/§7/§8 同步 `autoLoad`/`component:refresh` 契约。
- focused 单测（`basic-dynamic-renderer.test.tsx` 扩展或新文件）。
- playground demo + e2e。

### Out Of Scope

- amis 组件级 api 族（§5 已拒绝）。
- `fallback`/`empty`/`errorMode`/`onError`（design.md §4/§8 后续）。
- `component:cancel` 句柄。
- schema 编译缓存 / compiler 私有对象导出。
- `sendOn`/轮询（归 data-source / X4）。

## Failure Paths

| 场景编号                 | 触发                                     | 行为                                                      | 可重试                       | 用户可见表现                                                |
| ------------------------ | ---------------------------------------- | --------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------- |
| `autoload-false-no-fire` | `autoLoad:false` + mount                 | 不调用 `loadAction`，不进入 loading 态                    | 是（经 `component:refresh`） | 仅渲染 `body` region（或空壳），无 spinner                  |
| `refresh-triggers-load`  | `component:refresh` 调用                 | 重新求值 `loadAction` 并 `loadSchema()`，abort 在途旧请求 | 是                           | 进入 loading 态 → schema-ready/error                        |
| `refresh-no-loadaction`  | 无 `loadAction` 时调 `component:refresh` | 返回 `{ok:false, error}`，不抛                            | 否                           | 句柄调用方收到 error，组件态不变                            |
| `refresh-while-loading`  | loading 中再次 `refresh`                 | abort 旧请求，发起新请求                                  | 是                           | loading 态持续，stale schema 清除（既有 L143-194 行为保留） |
| `refresh-eval-error`     | `loadAction` 求值抛错                    | 返回 `{ok:false, error}`，组件态不变                      | 否                           | 句柄调用方收到 error                                        |

## Test Strategy

档位选择：建议有测

本档选择：建议有测。理由：`autoLoad`/`component:refresh` 是行为契约（非纯视觉），需 focused 单测验证 gate 与句柄语义；但非鉴权/对外 API/核心回归路径，不强制「必须自动化」先行 RED。e2e 覆盖一条关键交互路径即可。

## Execution Plan

### Phase 1 - design.md Flux 决策表 + 范围裁定

Status: completed
Targets: `docs/components/dynamic-renderer/design.md`

- Item Types: `Decision`、`Follow-up`

- [x] 在 `design.md` §2 新建 Flux 决策表（列：能力 / 采纳 / 不采纳 / 理由），覆盖：`autoLoad` gate（采纳，缺省 true）、`component:refresh`（采纳，X1 vocabulary）、amis 组件级 `api`/`initFetch`/`sendOn`/`interval`（不采纳，请求下沉 data-source + action）、`fallback`/`empty`/`errorMode`/`onError`（不采纳，design.md §4/§8 后续）、`component:cancel`（不采纳，AbortController 已覆盖）。
- [x] 同步 §4（`autoLoad` 加入正式字段清单）、§7（`autoLoad:false` 时的初始态裁定：停留 body/空态，不进 loading）、§8（`component:refresh` 升级为正式契约 + 失败路径）。

Exit Criteria:

- [x] `design.md` §2 Flux 决策表存在且每行含采纳/不采纳 + 理由（live repo 可读）。
- [x] §4/§7/§8 与 `autoLoad`/`component:refresh` 契约一致（无「后续增强」与「正式契约」并存矛盾）。

### Phase 2 - schema + definition 字段声明

Status: completed
Targets: `packages/flux-core/src/types/schema.ts`、`packages/flux-renderers-basic/src/basic-renderer-definitions.ts`

- Item Types: `Fix`

- [x] `DynamicRendererSchema` 新增 `autoLoad?: boolean`。
- [x] `basic-renderer-definitions.ts` 的 `dynamic-renderer` definition：`fields` 加 `{ key: 'autoLoad', kind: 'prop', valueType: 'boolean' }`（与 data-source `initFetch` 字段声明范式一致，见 `data-renderer-definitions.ts` `initFetch`）；新增 `componentCapabilityContracts: [{ handle: 'refresh', displayName: 'Refresh', description: 'Re-evaluate loadAction and reload the dynamic schema.' }]`。

Exit Criteria:

- [x] `schema.ts` 中 `DynamicRendererSchema.autoLoad` 类型可读。
- [x] definition `fields` 含 `autoLoad`、`componentCapabilityContracts` 含 `refresh`（live repo 可读）。
- [x] 局部 typecheck 通过（`pnpm --filter @nop-chaos/flux-core typecheck` + `pnpm --filter @nop-chaos/flux-renderers-basic typecheck`）。

### Phase 3 - autoLoad gate + component:refresh 实现

Status: completed
Targets: `packages/flux-renderers-basic/src/dynamic-renderer.tsx`

- Item Types: `Fix`、`Proof`

- [x] **gate 初始 loading 态**：当前 `createDynamicRendererState`（L43-50）无条件 `loading: Boolean(loadAction)`。改为 `loading: Boolean(loadAction) && autoLoad !== false`（即 `autoLoad:false` 时初始 `loading:false`），否则 `autoLoad:false` + 有 `loadAction` 会因 useEffect 跳过 `loadSchema` 而永远停留在 loading 态（perpetual spinner）。`createDynamicRendererState` 需接收 `autoLoad` 参数；`visibleState`（L69）派生随之正确。
- [x] **gate mount 自动加载**：读 `props.props.autoLoad`（缺省 `true`）；`autoLoad:false` 时，mount `useEffect` 跳过自动 `loadSchema()`，组件渲染 body region（或空壳），不进 loading 态。
- [x] **边角：`autoLoad:false` + 无 `loadAction`**：当前 `createDynamicRendererState` 在无 loadAction 时设 `error: 'loadAction is required'`（L47）。`autoLoad:false` 表达「作者显式不自动加载」，此时即便无 loadAction 也不应在 mount 报错（loadAction 可能后续由 scope/refresh 提供）。初始态裁定：`autoLoad:false` 时初始 `error: undefined`（不报 required 错误），等待 `component:refresh`；`autoLoad:true`/缺省 + 无 loadAction 时维持既有 required 错误（既有用例 `renders body content while loading` 不设 autoLoad，不受影响——但需确认既有「无 loadAction」路径行为）。
- [x] **提取 loadSchema 为可复用回调**：当前 `loadSchema`（L82-115）是 mount `useEffect` 内的闭包，无法被句柄调用。提取为稳定 ref/callback（如 `loadSchemaRef`），供 mount effect 与 `component:refresh` 句柄共用，复用既有 abort/状态机/stale-clear 行为。
- [x] 注册 `component:refresh` 句柄：用 `useCurrentComponentRegistry()` + `componentRegistry.register(handle, {cid})`；`handle.capabilities.invoke('refresh')` 重新求值 `loadAction`（无 `loadAction` → `{ok:false, error}`），经 `loadSchemaRef` 触发加载（abort 在途旧请求），返回 `{ok:true}` 或 `{ok:false, error}`；`hasMethod`/`listMethods` 对齐。
- [x] 保持既有 stale-clear 与 abort 行为（L143-194 用例不回归）。
- [x] 缺省 `autoLoad:true` 行为与现状完全一致（无回归）。

Exit Criteria:

- [x] `autoLoad:false` 时 mount 不调用 fetcher（可观测：mock fetcher call count 为 0）。
- [x] `autoLoad:false` 时组件**不显示 spinner**（渲染 body region 或空壳，可观测：DOM 中无 `data-loading` 属性 / 无 `[data-slot="dynamic-renderer-loading"]`）。
- [x] `component:refresh` 调用后 fetcher 被调用、schema 加载（可观测）。
- [x] 无 `loadAction` 时 `refresh` 返回 `{ok:false, error}`。
- [x] 既有 7 用例（basic-dynamic-renderer.test.tsx）全过（无回归）。

### Phase 4 - focused 单测 + playground demo + e2e

Status: completed
Targets: `packages/flux-renderers-basic/src/__tests__/basic-dynamic-renderer.test.tsx`、`apps/playground/src/component-lab/renderers/dynamic-renderer-lab-page.tsx`、`tests/e2e/`

- Item Types: `Proof`、`Follow-up`

- [x] 扩展 `basic-dynamic-renderer.test.tsx`：新增用例覆盖 Failure Paths 全部 5 条（autoload-false-no-fire / refresh-triggers-load / refresh-no-loadaction / refresh-while-loading / refresh-eval-error）+ 缺省 autoLoad:true 无回归。
- [x] playground demo 新增场景：「autoLoad:false + button 触发 component:refresh」，演示按需加载。
- [x] e2e 新增/扩展：覆盖 autoLoad:false 不加载 → 触发 refresh → schema 出现的关键路径。

Exit Criteria:

- [x] 新增 focused 单测全 GREEN，覆盖 5 条 Failure Path + 缺省无回归。
- [x] playground demo 场景可交互（手动 refresh 后 schema 出现）。
- [x] e2e 关键路径通过。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅子 agent 填写。

- Reviewer / Agent: 独立 plan-review 子 agent × 2 轮（fresh sessions，不复用起草者上下文；ses_113e7eda7ffel2W7jyAaTK1Z0U round 1，ses_113e23d48ffe2upLdfkEhYLmAp round 2）
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed:
  - [Round 1, Major M1] 初始 loading 态门控缺口：`createDynamicRendererState` 无条件 `loading: Boolean(loadAction)`，`autoLoad:false` 会 perpetual spinner。→ 已在 Phase 3 新增「gate 初始 loading 态」显式步骤（`loading: Boolean(loadAction) && autoLoad !== false`，`createDynamicRendererState` 接收 autoLoad 参数，`visibleState` 派生同步）+ Phase 3 Exit Criteria 新增「无 spinner」repo-observable 检查（无 `data-loading` / 无 `[data-slot="dynamic-renderer-loading"]`）。Round 2 确认 resolved。
  - [Round 1, Minor m4] `loadSchema` 是 useEffect 内闭包，句柄无法调用 → Phase 3 新增「提取 loadSchema 为可复用 ref/callback」步骤。
  - [Round 1, Minor m3] `autoLoad` 字段缺 `valueType: 'boolean'` → Phase 2 已补，与 data-source `initFetch` 范式一致。
  - [Round 1, Minor m1/m2] 行号范围（L309-348→L309-354，L16-24→L15-27）→ Current Baseline 已修正。
  - [Round 2, Minor 2] 边角 `autoLoad:false` + 无 loadAction 的 required 错误 → Phase 3 新增显式裁定步骤。

## Closure Gates

- [x] `autoLoad` gate + `component:refresh` 句柄在 live repo 真实落地（非空壳：fetcher call count 可观测变化）。
- [x] 缺省 `autoLoad:true` 行为无回归（既有 7 用例全过）。
- [x] 必要 focused verification（Phase 4 单测）已完成。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [x] `dynamic-renderer/design.md` 已同步到 live baseline（§2 决策表 + §4/§7/§8）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### `fallback` / `empty` / `errorMode` / `onError` region 与 notify

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: design.md §4/§8 明确列为「后续增强，非当前正式契约」；本 plan 的 gate/refresh 不依赖这些 region。三态机（§7）已收口错误显示。
- Successor Required: no

### `component:cancel` 句柄

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: dynamic-renderer 已用 `AbortController` 在 cleanup/unload/loadActionKey 变化时 abort 旧请求（L80/119-121）；非数据轮询组件，无显式 cancel 句柄需求。data-source 的 `cancel` 是为轮询/订阅设计，dynamic-renderer 无对偶需求。
- Successor Required: no

### amis 组件级 api 族（`api`/`initFetch`/`sendOn`/`interval`/`silentPolling`）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 分析报告 §5 已明确拒绝（请求下沉 data-source + action，不在组件开短路径）；本 plan 的 `autoLoad`/`component:refresh` 是 Flux 原生门控（loadAction 仍是 action），不是 amis 组件级 api。
- Successor Required: no

## Non-Blocking Follow-ups

- `loadWhen?: boolean` 表达式 gate（类比 data-source `sendOn`，但作用于 schema 加载）归后续评估——当前 `autoLoad:false` + `component:refresh` 已覆盖「按需加载」场景；表达式 gate 需求出现后再加。
- playground demo 可后续补「scope 变化 + autoLoad:false + 条件 refresh」组合场景。

## Closure

Status Note: 实现完成；autoLoad gate + component:refresh 句柄已落地，design.md 同步更新，单测/e2e/全量 typecheck/build/lint/test 全绿。closure-audit 已由独立 fresh-session 子 agent 完成并记录证据。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit 子 agent（fresh session，不复用执行者上下文）
- Audit Verdict: `approved`
- Audit Findings:
  - Phase status / items consistency：4 个 Phase 均 `Status: completed`，Phase 体内无残留 `- [ ]`，与 Plan Status 一致。
  - Exit Criteria vs live repo：逐条核对 `packages/flux-core/src/types/schema.ts:260`（`autoLoad?: boolean`）、`packages/flux-renderers-basic/src/basic-renderer-definitions.ts:352,360`（`refresh` capability + `autoLoad` field）、`packages/flux-renderers-basic/src/dynamic-renderer.tsx`（L49/51/72/86/91 初始态门控、L173 mount `autoLoad` gate、L93/102/166/199 `loadSchemaRef` 共用管线、L182-219 `component:refresh` 句柄 `componentRegistry.register`），全部 live 可读且语义匹配。
  - Anti-Hollow：`handle.capabilities.invoke('refresh')` 调用 `entry.run()`（真实 fetcher 管线，非空壳/非 `return null`）；`useEffect` cleanup 真实 abort；无静默吞异常。
  - Deferred honesty：`fallback/empty/errorMode/onError`、`component:cancel`、amis api 族均分类为 `out-of-scope improvement` 并附 non-blocking 理由；无 in-scope live defect 偷偷降级。
  - Focused verification 复跑：`pnpm --filter @nop-chaos/flux-renderers-basic test -- --run basic-dynamic-renderer` → 26 files / 331 tests 全 GREEN（覆盖 5 条 Failure Path + 缺省回归 + 契约发布）。
- Executor Evidence:
  - `packages/flux-core/src/types/schema.ts:250-260` – `DynamicRendererSchema.autoLoad?: boolean` 类型可读。
  - `packages/flux-renderers-basic/src/basic-renderer-definitions.ts` – `dynamic-renderer` definition 含 `autoLoad` field（`valueType:'boolean'`）+ `componentCapabilityContracts: [{handle:'refresh'}]`。
  - `packages/flux-renderers-basic/src/dynamic-renderer.tsx` – `createDynamicRendererState(loadAction, autoLoad)` 门控初始 loading/error；mount useEffect `autoLoad && loadActionKey` gate；`loadSchemaRef` 共用 load pipeline（含 abort/stale-clear）；`component:refresh` 句柄注册 `useCurrentComponentRegistry()`。
  - `docs/components/dynamic-renderer/design.md` – §2 Flux 决策表（6 行）+ §4 `autoLoad` 正式字段 + §7 `autoLoad:false` 初始态裁定 + §8 `component:refresh` 正式契约 + 4 failure paths。
  - `packages/flux-renderers-basic/src/__tests__/basic-dynamic-renderer.test.tsx` – 14 用例（7 既有 + 7 新增），覆盖 5 条 Failure Path + 缺省无回归 + 契约发布。
  - `apps/playground/src/component-lab/renderers/dynamic-renderer-lab-page.tsx` – 新增「On-demand load via autoLoad:false + component:refresh」场景。
  - `tests/e2e/component-lab/action-logic.spec.ts` – 新增 e2e「autoLoad:false defers load until component:refresh is triggered」。
  - Verification: `pnpm typecheck` ✅ 49/49; `pnpm build` ✅ 26/26; `pnpm lint` ✅ 26/26; `pnpm test` ✅ 49/49; `npx playwright test action-logic.spec.ts --grep dynamic-renderer` ✅ 3/3.

Follow-up:

- `loadWhen?` 表达式 gate 归后续评估（当前 `autoLoad:false` + `component:refresh` 已覆盖按需加载场景）。
- playground demo 可后续补「scope 变化 + autoLoad:false + 条件 refresh」组合场景。
