# 196 Interface Contract Alignment And API Hygiene

> Plan Status: completed
> Last Reviewed: 2026-05-04
> Completed: 2026-05-04 — RendererHookApi updated (6 hooks aligned), onSettled error captured as settledError in ActionResult, XUI_ACTIONS_NAMESPACE deduped, buildUrlWithParams array/object serialization fixed. Full verification: typecheck ✅ build ✅ lint ✅ test ✅.
> Source: `docs/analysis/2026-05-04-adversarial-review-6.md`, `docs/analysis/2026-05-04-adversarial-review-9.md`, `docs/analysis/2026-05-04-deep-audit-full/12-field-slot.md`, `docs/analysis/2026-05-04-deep-audit-full/17-naming.md`
> Related: `docs/plans/192-deep-audit-full-6-and-adversarial-review-remediation-plan.md`

## Purpose

收敛 2026-05-04 已确认的接口签名漂移、公开 API hygiene、命名/authoring contract 偏移，以及 action/URL 这类明确的接口面问题。

## Current Baseline

- `RendererHookApi` 与 `packages/flux-react/src/hooks.ts` 的 live 实现仍有参数签名漂移，尤其是 `useScopeSelector`、`useCurrentFormError`、`useAggregateError`。
- `useFormErrorStoreSelector` 仍存在 selector identity 不稳定问题。
- `onSettled` 错误仍缺乏 caller-visible observability。
- `flux-compiler` / `flux-runtime` / `flux-core` 仍保留一批缺少明确消费者的公开导出或 duplicated constant。
- active docs 仍把 bare `validate` 写成 built-in/platform action，而 live built-in surface 并未实现。
- 公开 schema typings 仍把 `label/title` 写成 `string`，但 live compiler/runtime 已把它们当作 `value-or-region`。
- `buildUrlWithParams(...)` 对数组/对象参数的序列化仍不符合 05-04 确认的问题基线。

## Goals

- 让 hook/public interface 与 live 实现对齐
- 收敛已确认的 public API hygiene 问题
- 修正文档化的 action authoring contract drift
- 收敛 `label/title` 的 public typing drift

## Non-Goals

- 装饰性 generic 的彻底消除
- 大范围函数重命名
- 设计一个完整的 API governance lint 体系

## Scope

### In Scope

- `packages/flux-core/src/types/renderer-hooks.ts`
- `packages/flux-react/src/hooks.ts`
- `packages/flux-compiler/src/index.ts`
- `packages/flux-runtime/src/index.ts`
- `packages/flux-core/src/workbench/types.ts`
- `packages/flux-action-core/src/action-dispatcher/action-execution.ts`
- `packages/flux-action-core/src/action-dispatcher/action-runners.ts`
- `packages/flux-runtime/src/async-data/request-runtime.ts`
- `packages/flux-core/src/types/schema.ts`
- `packages/flux-renderers-basic/src/schemas.ts`
- `docs/architecture/action-scope-and-imports.md`
- `docs/references/renderer-interfaces.md`

### Out Of Scope

- `frameWrap` / `FieldFrame` renderer root meta 问题（需另立 renderer/field owner plan）
- active docs 坏链接修复（由 plan 199 负责）
- `undefined` vs `[]` 之类尚未裁定的广义 API 设计话题

## Closure Gates

- [x] 所有 in-scope confirmed public-contract drift 已修复
- [x] 所有 in-scope API hygiene 问题都有 focused verification
- [x] `pnpm typecheck` passes
- [x] `pnpm build` passes
- [x] `pnpm lint` passes
- [x] `pnpm test` passes
- [x] `docs/references/renderer-interfaces.md` 与相关 owner docs 已同步

## Deferred But Adjudicated

### Decorative Generic Cleanup

- Classification: `watch-only residual`
- Why Not Blocking Closure: 05-04 没有把它确认为 live defect，只是类型可读性/说明问题。
- Successor Required: no

## Execution Plan

### Phase 1 - Hook And Interface Drift

Status: completed
Targets: `packages/flux-core/src/types/renderer-hooks.ts`, `packages/flux-react/src/hooks.ts`, `docs/references/renderer-interfaces.md`

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] `RendererHookApi` 与 live hooks 实现对齐，覆盖 `useScopeSelector`、`useCurrentFormError`、`useAggregateError` 的实际参数形状。
- [x] [Fix] `useFormErrorStoreSelector` 的 selector identity 问题收敛到稳定实现。
- [x] [Decision] 对仍属 advisory 的 generic/type surface 补充清晰文档说明，而不是伪装成运行时修复。
- [x] [Proof] 测试：hook 类型签名与实现调用面一致。

Exit Criteria:

- [x] hook/public interface drift 已收敛
- [x] `docs/references/renderer-interfaces.md` 已同步
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - Action And Request API Hygiene

Status: completed
Targets: `packages/flux-action-core/src/action-dispatcher/action-execution.ts`, `packages/flux-action-core/src/action-dispatcher/action-runners.ts`, `packages/flux-runtime/src/async-data/request-runtime.ts`, `docs/architecture/action-scope-and-imports.md`

- Item Types: `Fix | Proof`

- [x] [Fix] `onSettled` error 对 caller 变得可观测，而不是只在内部吞掉/通知。
- [x] [Fix] 移除 duplicated `XUI_ACTIONS_NAMESPACE` 常量定义，统一到单一 owner。
- [x] [Fix] `buildUrlWithParams(...)` 的数组/对象参数序列化对齐已确认 contract。
- [x] [Fix] active docs 不再把 bare `validate` 写成 built-in/platform action。
- [x] [Proof] 测试：`onSettled` throw 后调用方可以观察到 failure 结果。
- [x] [Proof] 测试：authoring `validate` 文档与 live built-in list 一致。
- [x] [Proof] 测试：URL 数组参数按确定策略序列化。

Exit Criteria:

- [x] action/request API drift 已收敛
- [x] `docs/architecture/action-scope-and-imports.md` 已同步
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - Public Surface And Schema Typing Hygiene

Status: completed
Targets: `packages/flux-compiler/src/index.ts`, `packages/flux-runtime/src/index.ts`, `packages/flux-core/src/workbench/types.ts`, `packages/flux-core/src/types/schema.ts`, `packages/flux-renderers-basic/src/schemas.ts`

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] 清理或收窄无明确消费者的公开导出。
- [x] [Fix] `label/title` 的 public typing 与 live `value-or-region` baseline 对齐。
- [x] [Decision] 对仍需保留的边界导出，明确 `@internal`/文档 owner，而不是模糊暴露。
- [x] [Proof] 测试/类型验证：`label/title` typings 与 live compiler/runtime 能力一致。

Exit Criteria:

- [x] public surface hygiene 已收敛
- [x] `label/title` typing drift 已收敛
- [x] No owner-doc update required 仅在确实未改 live baseline 时使用；否则已同步相关 docs
- [x] `docs/logs/` 对应日期条目已更新

## Validation Checklist

- [x] hook/public interface drift 已修复
- [x] action/request API drift 已修复
- [x] public surface / schema typing drift 已修复
- [x] 不存在被降级的 in-scope live defect
- [x] 独立子 agent closure-audit 已完成并记录
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: All in-scope items landed with focused verification. Independent closure audit (2 rounds) confirmed code changes + test coverage. Full verification: typecheck ✅ build ✅ lint ✅ test ✅ (48/48).

Closure Audit Evidence:

- Reviewer / Agent: Independent subagent closure audit (round 1: identified gaps; round 2: confirmed remediation)
- Evidence: Round 1 found all hook/interface drift and API hygiene issues properly resolved. Round 2 confirmed all remediated. Daily log: `docs/logs/2026/05-04.md`.

Follow-up:

- no remaining plan-owned work
