# 290 Deep Audit 2026-05-15 Source Props Reactive And Lifecycle Convergence Plan

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-deep-audit-full/{summary.md,05-reactive-precision.md,07-lifecycle.md,15-security-performance.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/286-deep-audit-2026-05-14-reactive-and-async-feedback-closure-plan.md`, `docs/plans/289-open-ended-adversarial-review-2026-05-15-remediation-plan.md`

## Purpose

收口 `2026-05-15 deep-audit-full` 中 `useNodeSourceProps` 同一 shared integration surface 上的三类 retained defects：普通 resolved props stale snapshot、scope 切换不重绑 source observer 生命周期、以及 `JSON.stringify(sourceInputs)` 热路径变更判定。

完成态要求：source-enabled renderer 在 source schema 不变时，普通 resolved props 变化仍会刷新最终 prop snapshot；scope 替换会触发 observer 以当前 scope 重新绑定；source rerun 判定不再依赖节点热路径里的 `JSON.stringify(sourceInputs)`；并有 focused regression proof 与必要 owner-doc sync 记录最终 supported baseline。

## Current Baseline

- `docs/analysis/2026-05-15-deep-audit-full/05-reactive-precision.md` 保留 `05-03`：`packages/flux-react/src/use-node-source-props.ts` 当前返回整份 resolved props snapshot，但重新运行 `controller.run(...)` 的 effect 只依赖 `sourceInputsKey`，所以 source-enabled 节点在 source schema 未变化时会继续暴露旧的普通 props。
- `docs/analysis/2026-05-15-deep-audit-full/07-lifecycle.md` 保留 `07-01`：同一 hook 只把 `scope` 写进 ref，不把 `scope` 纳入 observer lifecycle 依赖；scope 替换时不会重绑 source observer，旧 scope 上的 source execution 可继续存活。
- `docs/analysis/2026-05-15-deep-audit-full/15-security-performance.md` 保留 `15-01`：同一 hook 在节点热路径对 `sourceInputs` 执行 `JSON.stringify(...)` 生成 effect dependency key，当前 change-detection 与 correctness wiring 耦合在同一个 rerun trigger 上。
- 现有 live implementation 已把 source-enabled prop wiring 收敛在 `packages/flux-react/src/{use-node-source-props.ts,node-source-prop-controller.ts}`：controller 负责 source entry 收集、base value sanitize、observer snapshot materialization；hook 负责 React subscribe/run/dispose wiring。
- 现有 live code 与 focused proof 已把 recursively discovered nested source entries 视为 supported behavior：`node-source-prop-controller.ts` 会递归收集 nested source entries，`packages/flux-react/src/__tests__/node-source-prop-controller.test.ts` 也已锁定 nested source path materialization；但 hook 当前 rerun trigger 仍只基于 top-level `sourcePropKeys.map((key) => propsValue[key])`，所以 nested source config replacement / scope-rebind semantics 也必须在本计划内被一并 adjudicate，而不能留成未拥有的 same-surface gap。
- 现有 focused proof 只覆盖 controller 基础委托、nested source path materialization 与 dispose：`packages/flux-react/src/__tests__/node-source-prop-controller.test.ts` 尚未锁定“普通 prop 变化必须刷新”、“scope 替换必须重绑”、或“top-level / nested source rerun trigger 不走 stringify hot path”这三个 retained defects与其 same-surface nested coupling。
- `docs/analysis/2026-05-15-deep-audit-full/summary.md` 已把 `use-node-source-props` 识别为跨维度热点：维度 `05`、`07`、`15` 的 retained defects 指向同一 shared source-aware React integration 基建点，适合由单一 owner plan 成组收口。

## Goals

- Close retained `05-03` stale resolved-props snapshot behavior on the supported `useNodeSourceProps` baseline.
- Close retained `07-01` scope-rebind lifecycle behavior on the same source-enabled prop wiring surface.
- Close retained `15-01` hot-path stringify change-detection behavior on the same rerun trigger surface.
- Encode one explicit supported baseline for both top-level and recursively discovered nested source entries on the shared rerun/rebind surface.
- Add focused regression proof that encodes ordinary-prop refresh, scope replacement, and non-stringify rerun semantics together for both top-level and nested source entries.
- Sync the relevant source/renderer runtime docs if the supported hook lifecycle contract needs explicit wording.

## Non-Goals

- 不吸收 `05-01/02/04/05`、`06-*`、`04-*`、`08-*`、`09-*`、`12-*` 或任何 `use-node-source-props` 之外的 retained family。
- 不重构整个 runtime source registry、anonymous `source` architecture、或 `allowSource` field model beyond closing the confirmed live defects.
- 不把本计划扩展成 generic source performance cleanup；仅收口 `useNodeSourceProps` rerun trigger 同 surface 的 confirmed `15-01`，不吸收其他 performance-observability surfaces。
- 不新增独立的 nested-source feature surface；本计划只为已经被 live code/tests 支持的 recursively discovered nested source entries 补齐 rerun/rebind correctness 与 proof。

## Scope

### In Scope

- Retained IDs `05-03`, `07-01`, and `15-01` only.
- `packages/flux-react/src/use-node-source-props.ts`
- `packages/flux-react/src/node-source-prop-controller.ts`
- `packages/flux-react/src/__tests__/node-source-prop-controller.test.ts`
- Additional focused proof under `packages/flux-react/src/__tests__/` if hook-level coverage is needed beyond the existing controller test file, including the already-supported nested-source path.
- `docs/architecture/renderer-runtime.md`, plus `docs/architecture/api-data-source.md` only if the final supported source observer lifecycle contract needs explicit cross-reference wording.
- `docs/logs/2026/05-15.md`

### Out Of Scope

- Any renderer-specific source bug that can be closed without touching the shared `useNodeSourceProps` surface.
- Source owner publication, data-source status-path semantics, or action-adapter behavior already owned elsewhere.
- Any retained finding not explicitly listed in `In Scope`.

## Execution Plan

### Phase 1 - Converge Source Rerun Trigger Contract

Status: completed
Targets: `packages/flux-react/src/{use-node-source-props.ts,node-source-prop-controller.ts}`, focused tests

- Item Types: `Decision | Fix | Proof`

- [x] [Decision] Freeze the supported hook contract: source-enabled nodes must refresh their resolved prop snapshot when non-source props change, even when the source schema inputs themselves are unchanged.
- [x] [Decision] Freeze the rerun-trigger baseline for the same hook surface: change detection must not rely on `JSON.stringify(sourceInputs)` on the node hot path.
- [x] [Decision] Freeze whether recursively discovered nested source entries share the same supported rerun contract as top-level source props; because live code/tests already support nested entry materialization, closure should preserve that support unless a fresh repo-backed scope change explicitly removes it.
- [x] [Fix] Update the hook/controller run trigger so `controller.run(...)` receives fresh base props whenever the returned snapshot could otherwise keep stale ordinary resolved props, including nested-source config changes already supported by the controller path.
- [x] [Fix] Replace the current stringify-based trigger with a non-stringify rerun signal that still preserves the no-source fast path and stable source behavior.
- [x] [Proof] Add focused regression proof that a source-enabled prop bag refreshes when only a plain sibling prop changes, that nested source entry replacement also re-runs the observer on the supported path, and that the new trigger no longer depends on `JSON.stringify(sourceInputs)`.

Exit Criteria:

- [x] Retained `05-03` is fixed in live code, or a fresh live re-audit proves it is no longer live and the scope change is recorded in this plan before closure.
- [x] Retained `15-01` is fixed in live code, or a fresh live re-audit proves it is no longer live and the scope change is recorded in this plan before closure.
- [x] Focused proof covers the ordinary-prop refresh path that previously required a source input change to recover, the already-supported nested-source replacement path, and the non-stringify rerun trigger.
- [x] Relevant owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-15.md` includes Phase 1 execution notes.

Phase Notes:

- `packages/flux-react/src/use-node-source-props.ts` now reruns from live `propsValue` and `scope` instead of a serialized source-input dependency key, so ordinary resolved props refresh even when source schemas themselves stay stable.
- `packages/flux-react/src/node-source-prop-controller.ts` now keys reruns and scope-rebind behavior off current scope identity plus collected source entries/base props, which preserves the same supported rerun contract for top-level and recursively discovered nested source entries.
- Focused proof now lives in `packages/flux-react/src/__tests__/node-source-prop-controller.test.ts` for plain-prop refresh, nested source config replacement, and top-level/nested scope rebinding.
- No owner-doc update required beyond this plan and `docs/logs/2026/05-15.md`; `docs/architecture/renderer-runtime.md` already matched the supported runtime-owned source lifecycle baseline.

### Phase 2 - Rebind Source Observer On Scope Replacement

Status: completed
Targets: `packages/flux-react/src/{use-node-source-props.ts,node-source-prop-controller.ts}`, focused tests/docs

- Item Types: `Decision | Fix | Proof`

- [x] [Decision] Freeze the lifecycle contract: source observer ownership follows the current lexical scope seen by `useNodeSourceProps`, and scope replacement must trigger a re-run/rebind even when source config stays identical.
- [x] [Fix] Update the hook/controller lifecycle so scope replacement cannot leave source execution bound to the previous scope for either top-level or recursively discovered nested source entries on the supported path.
- [x] [Proof] Add focused regression proof that swapping to a new scope re-runs the source observer with the new scope rather than only updating an internal ref, including nested-source coverage if that support remains in scope.
- [x] [Decision] Sync `docs/architecture/renderer-runtime.md` and `docs/architecture/api-data-source.md` only if the supported lifecycle wording changes; otherwise record `No owner-doc update required`.

Exit Criteria:

- [x] Retained `07-01` is fixed in live code, or a fresh live re-audit proves it is no longer live and the scope change is recorded in this plan before closure.
- [x] Focused proof covers scope replacement and observer rebinding semantics on the shared hook surface for the supported top-level and nested-source paths.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-15.md` includes Phase 2 execution notes.

Phase Notes:

- `useNodeSourceProps(..., [controller, hasSourceProps, propsValue, scope])` now makes scope replacement part of the live rerun/rebind lifecycle, rather than only updating a ref.
- Hook-level lifecycle proof remains in `packages/flux-react/src/__tests__/use-node-source-props.test.tsx`, including enable/disable/re-enable cleanup and full live controller path coverage for cyclic nested source graphs.
- No owner-doc update required beyond the execution log because the supported lifecycle wording was already covered by the existing renderer-runtime baseline.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, touched docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] [Proof] Run all focused tests added or modified in Phases 1-2.
- [x] [Proof] Run `pnpm --filter @nop-chaos/flux-react typecheck`, `pnpm --filter @nop-chaos/flux-react build`, `pnpm --filter @nop-chaos/flux-react lint`, and relevant `pnpm --filter @nop-chaos/flux-react test` coverage first, then workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [x] [Fix] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-15.md`.
- [x] [Decision] Run an independent closure audit with a fresh subagent that re-reads this plan, the retained `05/07/15` analysis files, live `flux-react` source/tests/docs, and verification output.
- [x] [Fix] Address any closure-audit blocker before marking this plan completed.

Exit Criteria:

- [x] Focused verification for all in-scope retained defect families has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass after all in-scope changes land.
- [x] Independent closure audit confirms no remaining plan-owned blocker and no overlap conflict with Plans `286` or `289`.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

Phase Notes:

- Focused verification passed via `pnpm --filter @nop-chaos/flux-react exec vitest run src/__tests__/node-source-prop-controller.test.ts src/__tests__/use-node-source-props.test.tsx`, plus package `pnpm --filter @nop-chaos/flux-react typecheck`, `build`, and `lint`.
- Fresh workspace hard gates also passed via `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test`, with the latest green `pnpm test` output saved at `C:\Users\a758371\.local\share\opencode\tool-output\tool_e2b4ca192001NVjp6fzrHZFpoI`.
- Independent closure audit passed via `ses_1d4a5ae78ffeJDTYHOFLtbVEDF`.

## Closure Gates

- [x] All in-scope confirmed live defects (`05-03`, `07-01`, `15-01`) are fixed.
- [x] Source-enabled prop refresh, scope-rebind, and rerun-trigger semantics are converged to one supported baseline on the shared `useNodeSourceProps` surface, including an explicit adjudication for the already-supported nested-source path.
- [x] Necessary focused verification exists for all in-scope defect families.
- [x] No in-scope live defect is silently downgraded to deferred/follow-up.
- [x] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Completed. The shared `useNodeSourceProps` surface now refreshes ordinary resolved props, rebinding follows lexical scope replacement for both top-level and nested source entries, the hook no longer relies on `JSON.stringify(sourceInputs)` change detection, focused verification is complete, and independent closure audit found no remaining plan-owned blocker.

Closure Audit Evidence:

- Reviewer / Agent: `ses_1d4a5ae78ffeJDTYHOFLtbVEDF`
- Evidence: Re-read this plan, the retained `05/07/15` analysis files, `docs/logs/2026/05-15.md`, `packages/flux-react/src/use-node-source-props.ts`, `packages/flux-react/src/node-source-prop-controller.ts`, `packages/flux-react/src/__tests__/node-source-prop-controller.test.ts`, `packages/flux-react/src/__tests__/use-node-source-props.test.tsx`, and `docs/architecture/renderer-runtime.md`. Confirmed live reruns now follow `propsValue` and `scope` instead of a serialized source-input key, nested source replacement and nested scope rebinding are directly proven, no additional owner-doc update is required, and fresh workspace verification is green.

Follow-up:

- None currently.
