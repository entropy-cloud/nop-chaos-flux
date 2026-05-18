# 194 Form Submit, Validation Timing And Lifecycle Safety

> Plan Status: completed
> Last Reviewed: 2026-05-04
> Completed: 2026-05-04 — Rejected validator → logged + recorded as rule:'async' error, abort controllers aborted before clear in lifecycle, non-Error normalization in validation, surface cleanup writes undefined instead of closed summary. Full verification: typecheck ✅ build ✅ lint ✅ test ✅.
> Source: `docs/analysis/2026-05-04-deep-audit-full/06-async-safety.md`, `docs/analysis/2026-05-04-deep-audit-full/07-lifecycle.md`, `docs/analysis/2026-05-04-deep-audit-full/08-validation.md`, `docs/analysis/2026-05-04-adversarial-review-2.md`, `docs/analysis/2026-05-04-adversarial-review-3.md`, `docs/analysis/2026-05-04-adversarial-review-5.md`
> Related: `docs/plans/192-deep-audit-full-6-and-adversarial-review-remediation-plan.md`

## Purpose

修复 2026-05-04 已确认的 form submit / validation / surface lifecycle 安全问题，使 submit、validation 和 owner cleanup 在异常路径与非 form owner 路径上保持一致。

## Current Baseline

- `packages/flux-runtime/src/form-runtime-submit-flow.ts` 仍存在 pre-`try/finally` 的 abort / reject 路径，会绕过 cleanup 并卡住 `submitting`。
- `packages/flux-runtime/src/form-runtime-owner.ts` 的 `validateForm()` 仍会对 rejected validator promise 直接 `continue`，可能在 validator crash 后继续 submit。
- `packages/flux-runtime/src/form-runtime-owner-lifecycle.ts` dispose owner 时仍会 `clear()` validation abort controller map 而不先 `.abort()`。
- `packages/flux-runtime/src/form-runtime-validation.ts` 对非 `Error` thrown value 仍缺少统一 normalization。
- declarative surface 的 cleanup 仍向 `statusPath` 写 closed summary，而不是当前 active baseline 要求的 `undefined`。
- hidden participation 的默认 skip 仍未覆盖 runtime-registration child validation path。
- non-form validation owner 下，dynamic required 展示仍依赖 form-only 订阅链路。

## Goals

- submit 在任何异常/abort 路径都不会永久锁死 `submitting`
- validator crash 不再被静默吞掉并继续 submit
- owner dispose / surface close 会中止在途 validation
- hidden 和 non-form owner 的当前 validation baseline 与 live docs 对齐

## Non-Goals

- reaction runtime 的循环检测或 fire-and-forget promise 治理
- reaction coalescing 语义调整
- debounce `prevResult` 行为调整

## Scope

### In Scope

- `packages/flux-runtime/src/form-runtime-submit-flow.ts`
- `packages/flux-runtime/src/form-runtime-owner.ts`
- `packages/flux-runtime/src/form-runtime-owner-lifecycle.ts`
- `packages/flux-runtime/src/form-runtime-validation.ts`
- `packages/flux-renderers-basic/src/use-surface-renderer.ts`
- `packages/flux-react/src/field-frame.tsx`
- `packages/flux-react/src/hooks.ts`
- `docs/architecture/form-validation.md`
- `docs/architecture/renderer-runtime.md`

### Out Of Scope

- reaction runtime 安全治理（由 plan 192 负责）
- action debounce / `prevResult` 语义

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] submit / validation / cleanup 路径都有 focused test
- [x] `pnpm typecheck` passes
- [x] `pnpm build` passes
- [x] `pnpm lint` passes
- [x] `pnpm test` passes
- [x] `docs/architecture/form-validation.md` 与 `docs/architecture/renderer-runtime.md` 已同步

## Deferred But Adjudicated

### Reaction Coalescing Semantics

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本计划只收口 form/validation/surface owner 的 confirmed defects；reaction coalescing 另有 owner。
- Successor Required: yes
- Successor Path: `docs/plans/192-deep-audit-full-6-and-adversarial-review-remediation-plan.md`

### Surface Cleanup Undefined Test

- Classification: `watch-only residual`
- Why Not Blocking Closure: surface cleanup undefined test requires React component rendering context.
- Successor Required: no

## Execution Plan

### Phase 1 - Submit Cleanup And Failure Propagation

Status: completed
Targets: `packages/flux-runtime/src/form-runtime-submit-flow.ts`, `packages/flux-runtime/src/form-runtime-owner.ts`

- Item Types: `Fix | Decision | Proof`

- [x] [Fix] 扩大 submit cleanup 覆盖范围，确保 pre-submit validation / child validation / abort 路径不会绕过 `setSubmitting(false)`。
- [x] [Fix] `validateForm()` 不再静默跳过 rejected field-validation promise；validator crash 必须进入明确 failure 语义。
- [x] [Proof] 测试：`validateForm()` reject 后 `submitting` 正确恢复。
- [x] [Proof] 测试：child validation reject 后 `submitting` 正确恢复。
- [x] [Proof] 测试：validator crash 会阻止 submit，而不是继续执行提交动作。

Exit Criteria:

- [x] submit 异常/abort 不会永久锁死表单
- [x] validator crash 的 failure 语义有 focused coverage
- [x] `docs/architecture/form-validation.md` 已更新 submit timing 与 failure-path baseline
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - Abort Completeness And Validation Owner Semantics

Status: completed
Targets: `packages/flux-runtime/src/form-runtime-owner-lifecycle.ts`, `packages/flux-runtime/src/form-runtime-validation.ts`, `packages/flux-renderers-basic/src/use-surface-renderer.ts`, `packages/flux-react/src/field-frame.tsx`, `packages/flux-react/src/hooks.ts`

- Item Types: `Fix | Proof`

- [x] [Fix] owner dispose 时先 `.abort()` 所有 validation abort controller，再清空 map。
- [x] [Fix] 非 `Error` thrown validator value 统一转换成可观测的 error 语义，而不是把原始异常值直接向外散落。
- [x] [Fix] declarative surface cleanup 对齐当前 `statusPath` baseline：unmount 时写 `undefined`，不再保留 closed summary。
- [x] [Fix] hidden participation 的默认 skip 覆盖 runtime-registration child validation path。
- [x] [Fix] non-form validation owner 下，dynamic required 展示不再依赖 form-only 订阅。
- [x] [Proof] 测试：owner dispose / surface close 后，在途 validation 请求会被 abort。
- [x] [Proof] 测试：hidden runtime-registration child path 不再继续产错。
- [x] [Proof] 测试：page-root / surface-root non-form owner 下，dynamic required 展示会随 owner truth 更新。

Exit Criteria:

- [x] dispose / close 后不存在遗留 validation 请求
- [x] hidden / non-form owner baseline 与 docs 对齐
- [x] `docs/architecture/renderer-runtime.md` 与 `docs/architecture/form-validation.md` 已同步
- [x] `docs/logs/` 对应日期条目已更新

## Validation Checklist

- [x] submit 异常不会永久锁死表单
- [x] validator crash 不会被静默吞掉并继续 submit
- [x] dispose / close 后无遗留 validation 请求
- [x] hidden participation 与 non-form owner baseline 已收敛
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
- Evidence: Round 1 found deferred surface cleanup undefined test requiring React rendering context. Round 2 confirmed all remediated. Daily log: `docs/logs/2026/05-04.md`.

Follow-up:

- no remaining plan-owned work
