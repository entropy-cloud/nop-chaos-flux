# {2} responseAdaptor Error-Path Contract

> Plan Status: completed
> Mission: amis-bug-driven-improvements
> Source Audits: audits/2026-06-26-1859-open-audit-amis-bug-driven-improvements.md
> Last Reviewed: 2026-06-27
> Source: open-ended adversarial audit — F3 (responseAdaptor now runs on error responses but a non-status-defensive adaptor throws and masks the backend message; throw-case has no regression test)

## Purpose

收口本 mission 把 `responseAdaptor` 拓宽到"对错误响应也运行"之后留下的契约缺口：当 adaptor 对 error-shaped payload 抛异常时，mission 专门引入的 backend message 提取（`readResponseErrorMessage`）反而变得不可达，错误降级为通用 infra 异常。本计划裁定契约方向、落地实现、补齐缺失的 throw-case 回归测试，并把最终契约写进 owner doc。

## Current Baseline

起草前已对照 live repo 抽查核实：

- **F3（mission-introduced，likely）**：
  - `packages/flux-runtime/src/async-data/request-runtime.ts:402-419`：`applyResponseAdaptor(...)`（传入 `response.status`）在 `!response.ok` 检查（`:412`）**之前**运行，且调用点**无 try/catch** 包裹。
  - `:419` `throw createApiResponseError({ ...response, data: adaptedData }, retryMetadata)` 依赖 adaptor 成功返回 clean 对象。
  - `:63` `readResponseErrorMessage(responseData)`、`:91` 用其提取 backend `message`/`msg`。
  - adaptor 实现：`request-runtime-adaptor.ts:132` `export function applyResponseAdaptor(...)`。
  - 下游收口：`runtime-action-helpers.ts:191-218`，非 `isHttpResponseFailure`（无数字 `.status`）的错误在 `:217` `throw error`，经 `onActionError`/plugin `onError` 报为 infra 错误。
- **既有测试覆盖缺口**：`packages/flux-runtime/src/__tests__/request-runtime-response-adaptor-non-ok.test.ts` 只覆盖 adaptor **返回 clean 对象**（`return { message: "…" }`）的情形，**未覆盖** adaptor 对 error-shaped payload **抛异常** 的情形——而这是 mission 之前所有 success-only adaptor（如 `return { ...payload, data: payload.data.items }` 面对 `{ message: "…" }`）的常见形态。
- **机制确认**：若 adaptor 在 error payload 上抛异常，throw 在 `createApiResponseError`/`readResponseErrorMessage` 运行前就逸出 `executeApiSchema`，backend message 被吞。这是 mission 同一变更既新增 `msg` 提取又使其在 adaptor 非状态防御时不可达的讽刺性交叉。

## Goals

- 裁定并实现 `responseAdaptor` 的 error-path 契约（三选一：运行时回退 / 要求状态防御 / 仅 success 运行）。
- 补齐 throw-case 回归测试，断言 backend `message`/`msg` 在 adaptor 抛异常时仍能浮现。
- 将最终契约（仅描述当前设计状态，见 Rule 14）写入 owner doc。

## Non-Goals

- 不重写 adaptor 表达式引擎或 DSL。
- 不改 success-path 行为（`response.ok === true` 分支保持不变）。
- 不改重试策略 / `executeRequestWithControl`。
- 不处理 carousel（Plan {1}）或 lifecycle race（Plan {3}）。

## Scope

### In Scope

- `packages/flux-runtime/src/async-data/request-runtime.ts:402-419`（adaptor 调用点 + `!response.ok` 分支）。
- `packages/flux-runtime/src/__tests__/request-runtime-response-adaptor-non-ok.test.ts`（扩展 throw-case）或新增 focused 测试。
- `docs/architecture/flux-runtime-module-boundaries.md`（或当前实际承载 async/adaptor 契约的 owner doc）——仅记录最终契约。

### Out Of Scope

- `applyRequestAdaptor`（请求侧）。
- adaptor 表达式编译器内部。
- `runtime-action-helpers.ts` 的 `onError` 分类语义（仅在契约裁定要求时做最小调整）。

## Failure Paths

| 可测场景编号                    | 触发                                                                          | 行为                                                                                                                         | 可重试             | 用户可见表现                                        |
| ------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------- |
| adaptor-throws-on-error-payload | `responseAdaptor` 在 `response.ok === false` 的 error-shaped payload 上抛异常 | backend `message`/`msg` 仍经 `createApiResponseError` + `readResponseErrorMessage` 浮现，**不**被降级为通用 infra/适配器异常 | 沿用既有重试元数据 | 用户看到后端错误消息，而非"适配器异常/基础设施错误" |

## Test Strategy

档位选择：**必须自动化**

本计划裁定对外可见的运行时数据契约（`responseAdaptor` 的 error-path 语义），属 public API contract / 核心回归路径。按 guide，"必须自动化"时 Proof 项须先于 Fix。throw-case 回归测试必须先以失败态写就，再实现修复使其转绿。

## Execution Plan

### Phase 1 - Contract Decision (F3)

Status: completed
Targets: 本计划 `## Closure` 前的决策记录；owner doc

- Item Types: `Decision`

- [x] 在三个候选中裁定并记录最终选择 + 拒绝方案及理由：(a) 在 `!response.ok` 分支用 try/catch 包裹 `applyResponseAdaptor`，adaptor 抛异常时回退到 raw `response.data`，使 `readResponseErrorMessage` 仍能提取 backend message（向后兼容 success-only adaptor）；(b) 声明 adaptor 必须状态防御 + 契约/lint 约束 + 测试；(c) adaptor 仅在 success 运行（回退到 mission 前语义）。(`Decision`)
- [x] 推荐采用 (a)：兼顾 mission 的"提取 backend message"目标与对既有 success-only adaptor 的向后兼容；在 plan 内写明拒绝 (b)/(c) 的理由。(`Decision` 理由记录)

Exit Criteria:

- [x] 决策（含选中方案 + 拒绝方案理由）已写入本 plan 的可观测文本，且与 Phase 2 实现方向一致。

### Phase 2 - Implement Throw-Case Contract + Regression Test (F3)

Status: completed
Targets: `packages/flux-runtime/src/async-data/request-runtime.ts:402-419`；测试（Proof 先行）

- Item Types: `Proof`, `Fix`

- [x] 先写失败态回归测试：构造一个在 error-shaped 4xx payload 上**抛异常**的 `responseAdaptor`，断言 `executeApiSchema` 抛出的错误仍携带 backend `message`/`msg`（经 `readResponseErrorMessage` 提取），而非裸 adaptor 异常。(`Proof`，先于 Fix)
- [x] 实现裁定契约（按 Phase 1 推荐 = (a)）：注意 `applyResponseAdaptor(...)` 当前在 `request-runtime.ts:402` **无条件**运行（早于 `:412` 的 `!response.ok` 检查），因此须将该调用重构——要么按 ok/!ok 拆成两处调用、要么条件包裹——使**仅 `!response.ok` 分支**对 adaptor 做 try/catch，捕获后回退到 raw `response.data`，再走既有 `createApiResponseError`。success 分支保持不变。(`Fix`)
- [x] 回归测试转绿；既有 `request-runtime-response-adaptor-non-ok.test.ts`（clean-return 场景）与 success-path 测试仍通过。(`Proof`)

Exit Criteria:

- [x] throw-case 回归测试存在并断言 backend message 浮现（repo-observable 测试 + 断言）。
- [x] `applyResponseAdaptor` 在 error 分支抛异常不再吞掉 backend message。
- [x] 既有 adaptor non-ok（clean-return）与 success 测试无回归。

### Phase 3 - Owner Doc Sync

Status: completed
Targets: `docs/architecture/flux-runtime-module-boundaries.md`（或当前实际承载 adaptor 契约的 owner doc）

- Item Types: `Follow-up`

- [x] 在 owner doc 记录最终契约（仅当前设计状态，见 Rule 14）：`responseAdaptor` 对 success 与 error 响应均运行；error 分支下若 adaptor 抛异常，运行时回退到 raw payload 以保留 backend message；adaptor 不强制状态防御，但可读取 `status`。(`Follow-up`)

Exit Criteria:

- [x] owner doc 陈述最终契约；不含 "Proposed vs Current" 或演进叙事。

## Contract Decision (Phase 1)

**Selected: (a) — Runtime fallback on the error branch.**

On a non-OK response, `applyResponseAdaptor(...)` is wrapped in try/catch **only inside the `!response.ok` branch**. If the adaptor throws on an error-shaped payload, the runtime falls back to the raw `response.data` so that `createApiResponseError(...)` / `readResponseErrorMessage(...)` can still extract the backend `message`/`msg`. The success branch keeps the existing unconditional adaptor call (unchanged behavior).

**Why (a) wins:**

- Preserves the mission's explicit goal: surface the backend message extracted by `readResponseErrorMessage` (`message` → `msg` → `Request failed with status <n>`).
- Backward-compatible with the dominant real-world adaptor form — the success-only adaptor written assuming a success shape (e.g. `return { ...payload, data: payload.data.items }`) — which throws when it meets an error body such as `{ message: "…" }`. Without (a), every such adaptor silently degrades an HTTP business error into a generic infra/adaptor exception and the backend message is lost.
- Smallest, lowest-risk surface: only the error branch is touched; success path, retry strategy, and `createApiResponseError` are untouched. The downstream classifier `isHttpResponseFailure` (`runtime-action-helpers.ts:267`) keeps seeing a numeric `.status` (because we still build the error via `createApiResponseError`), so the single error→notify translation (A2) keeps reporting the backend message exactly once.

**Rejected: (b) — declare adaptor must status-defend + contract/lint + tests.**

- Shifts the burden onto every adaptor author to branch on `status` and breaks every existing success-only adaptor in the wild; high migration cost with real regressive UX (lost backend messages) during the transition.
- "Adaptor must be status-defensive" is not mechanically enforceable by lint without a full semantic model of the expression surface, so the contract would be un-verifiable documentation, not a guarantee.

**Rejected: (c) — adaptor runs only on success (revert to pre-mission semantics).**

- Directly undoes the mission's intentional broadening of the adaptor to error responses, which is what owner doc section "Error response adaptor reachability (A1)" (`api-data-source.md:122`) documents and what this mission's cleanup work codified. It would throw away the genuinely useful capability of normalizing/mapping a backend error body into a standard shape before it feeds the thrown error.

This decision is consistent with Phase 2's implementation direction (error-branch try/catch fallback to raw payload; success branch unchanged).

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: independent general sub-agent (fresh session `ses_0fb4b2f81ffepqyZMBuCV8ELQm`)
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed: zero Blocker / zero Major; 1 non-blocking Minor incorporated (Phase 2 clarify that `applyResponseAdaptor` call at `request-runtime.ts:402` runs unconditionally before `:412` ok-check, so it must be restructured/conditionally wrapped). All references verified live: `:402` call, `:412` ok-check, `:419` throw, `:63` readResponseErrorMessage, `request-runtime-adaptor.ts:132`, existing non-ok test uses clean-return only.

## Closure Gates

> 关闭条件：本 section 所有条目 + 每个 Phase Exit Criteria 全部 `[x]` 后，才能将 `Plan Status` 改为 `completed`。全量 `pnpm typecheck/build/lint/test` 在此跑一次。

- [x] F3 契约缺口已收敛：throw-on-error-payload 时 backend message 不再被吞。
- [x] throw-case 回归测试已落地并转绿。
- [x] success-path 与既有 non-ok（clean-return）行为无回归。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope contract drift。
- [x] owner doc 已同步到最终契约（当前设计状态）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（本计划当前无确认的 deferred 项。）

## Non-Blocking Follow-ups

- 若未来需要让 adaptor 显式区分 success/error shape 的辅助 API，记录为 optimization candidate，不在本 plan 收口。

## Closure

Status Note: All phases complete; throw-case contract implemented (error-branch try/catch fallback to raw payload) + tested + documented in owner doc; full workspace typecheck/build/lint/test green per executor; independent audit re-ran focused + package tests with green results.

Closure Audit Evidence:

- Auditor / Agent: independent general sub-agent (fresh session)
- Evidence: Independently re-verified against the live repo. (1) `packages/flux-runtime/src/async-data/request-runtime.ts:402-430` — the `!response.ok` branch wraps `applyResponseAdaptor(...)` in try/catch (only when `resolvedApi.responseAdaptor`) and falls back to `response.data` on throw, then still builds the error via `createApiResponseError(...)` so numeric `status` + `response`/`responseData` are preserved; success branch at `:432-440` keeps the unconditional adaptor call with no try/catch (behavior unchanged). (2) `packages/flux-runtime/src/__tests__/request-runtime-response-adaptor-non-ok.test.ts:99-170` — the 2 new throw-case tests use `payload.data.items` / `payload.records[0]` on an undefined member; confirmed the flux-formula engine genuinely throws "Cannot access member of null or undefined" (`packages/flux-formula/src/evaluator.ts:244`), so the assertions on backend `msg`/`message` surfacing and `status`/`responseData` preservation are real; original 3 clean-return tests at `:15-97` unmodified. Sanity: without the fix the unwrapped adaptor throw would propagate and both new tests would fail the `toBe(...)` + `not.toMatch(/Cannot access member/i)` assertions — genuine regression coverage. (3) `docs/architecture/api-data-source.md:130` + pipeline steps 6/7 state the CURRENT design only (adaptor runs on both OK/non-OK; on non-OK throw runtime falls back to raw payload; adaptor not required to be status-defensive; success branch still propagates throws) — grep of the file returns zero matches for "Proposed"/"evolution"/"migration" narrative, satisfying Rule 14. (4) `Deferred But Adjudicated` is empty — no in-scope item silently deferred. Test counts observed by auditor: focused `request-runtime-response-adaptor-non-ok.test.ts` 5/5 passed; `pnpm --filter @nop-chaos/flux-runtime test` 1254 passed / 1 skipped (102 files passed + 1 skipped). Executor-reported full-workspace `pnpm typecheck/build/lint/test` 55+29+29+55 tasks all green.

Follow-up:

- <<no remaining plan-owned work>>（既有 non-blocking follow-up：adaptor 显式区分 success/error shape 的辅助 API 仅作 optimization candidate，不在本 plan 收口。）
