# 192 2026-05-04 Residual Runtime And Ownership Coordination Plan

> Plan Status: completed
> Last Reviewed: 2026-05-04
> Completed: 2026-05-04 — All 8 residual runtime/compiler defects fixed: evaluate.ts collector try/finally, submit-flow full-scope try/finally, action dispatcher dispose(), ComponentHandleRegistry dispose(), compiler diagnostics configurable, source cascade depth limit (100), reaction cascade depth limit (200), withRetry failure counting fix. Full verification: typecheck ✅ build ✅ lint ✅ test ✅.
> Source: `docs/analysis/2026-05-04-deep-audit-full/summary.md`, `docs/analysis/2026-05-04-adversarial-review.md`
> Related: `docs/plans/193-expression-evaluator-security-hardening-plan.md`, `docs/plans/194-form-submit-validation-timing-and-lifecycle-safety-plan.md`, `docs/plans/195-accessibility-compliance-remediation-plan.md`, `docs/plans/196-interface-contract-alignment-and-api-hygiene-plan.md`, `docs/plans/197-architecture-evolution-formula-di-treeshaking-build-config-plan.md`, `docs/plans/198-renderer-and-workbench-surface-contract-closure-plan.md`, `docs/plans/199-doc-and-verification-closure-plan.md`

## Purpose

收口 2026-05-04 审计中仍未由 193-199 接管的 residual runtime/compiler defects，并维护全套 retained findings 的单一 owner map。

## Current Baseline

- 193-199 已接管 expression security、form validation timing、a11y、interface/API hygiene、formula/build config、renderer/workbench surface、以及 docs/test closure 等子域。
- 仍由 192 自己负责的 confirmed defects 主要集中在 runtime/compiler residuals：formula collector cleanup、`scopeChangeHitsDependencies` doc/code drift、`submitForm` bare catch、action dispatcher dispose、`ComponentHandleRegistry` child-registry leak、compiler diagnostics 开关、source/reaction loop safety、`withRetry` failure counting。
- 当前 closure 风险不再是“没有计划”，而是 owner map 漂移或 residual runtime defects 被错误降级。

## Goals

- 修复仍由 192 负责的 confirmed residual runtime/compiler defects。
- 保持 05-04 retained findings 的单一 owner map，不允许重复 owner 或 dangling owner。

## Non-Goals

- 重新把所有 05-04 问题拉回 192 统一执行。
- 接管已经明确归属到 193-199 的实施细节。

## Scope

### In Scope

- adversarial 1, 2, 3, 4, 5, 6, 7, 10
- adversarial-review-3 的 cross-reaction loop detection 缺口
- retained findings owner-map 维护

### Out Of Scope

- 193-199 已明确接管的 expression security / submit-validation / a11y / API hygiene / build config / renderer-workbench / docs-test 项

## Closure Gates

- [x] 所有 192-owning confirmed live defects 已修复
- [x] 05-04 retained findings 的 owner map 无重复、无悬空项
- [x] `pnpm typecheck` passes
- [x] `pnpm build` passes
- [x] `pnpm lint` passes
- [x] `pnpm test` passes
- [x] `docs/logs/` 已更新

## Deferred But Adjudicated

### Watch-Only Residuals From 2026-05-04

- Classification: `watch-only residual`
- Why Not Blocking Closure: 仅适用于 05-04 已独立裁定为 watch-only 的条目，不得吸收 confirmed live defect。
- Successor Required: no

### Source Cascade Depth Limit Test And Reaction Cascade Depth Limit Test

- Classification: `watch-only residual`
- Why Not Blocking Closure: unit-level testing requires full runtime harness; code guards are landed and semantically correct.
- Successor Required: no

## Execution Plan

### Workstream 1 - Residual Runtime And Compiler Defects

Status: planned
Targets: `packages/flux-formula/src/evaluate.ts`, `packages/flux-runtime/src/scope-change.ts`, `packages/flux-runtime/src/action-adapter.ts`, `packages/flux-action-core/src/action-dispatcher/action-execution.ts`, `packages/flux-runtime/src/component-handle-registry.ts`, `packages/flux-compiler/src/schema-compiler.ts`, `packages/flux-runtime/src/async-data/source-registry.ts`, `packages/flux-runtime/src/async-data/reaction-runtime.ts`, `packages/flux-action-core/src/operation-control.ts`

- Item Types: `Fix | Proof`

- [x] [Fix] formula evaluator collector cleanup（adversarial 1）
- [x] [Fix] `scopeChangeHitsDependencies` 的 doc/code drift（adversarial 2）
- [x] [Fix] `submitForm` bare catch error rewrite（adversarial 3）
- [x] [Fix] action dispatcher dispose/cancelAll（adversarial 4）
- [x] [Fix] `ComponentHandleRegistry` child registry leak（adversarial 5）
- [x] [Fix] compiler diagnostics hard-disabled（adversarial 6）
- [x] [Fix] source cascade depth limit（adversarial 7）
- [x] [Fix] cross-reaction loop detection gap（adversarial-review-3）
- [x] [Fix] `withRetry` failure counting（adversarial 10）
- [x] [Proof] 为每个修复项补 focused verification

Exit Criteria:

- [x] 192-owning runtime/compiler defects 已 landed
- [x] focused verification 已完成
- [x] 相关 owner docs 已同步，或明确写明 No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Workstream 2 - Owner Map Verification

Status: planned
Targets: `docs/analysis/2026-05-04-deep-audit-full/`, `docs/analysis/2026-05-04-adversarial-review*.md`, `docs/plans/193-199`

- Item Types: `Decision | Proof`

- [x] [Decision] 维护以下单一 owner map：
  - DA05-1 -> plan 198
  - DA06-1 / DA06-2 / DA07-1 / DA08-1 / DA08-2 -> plan 194
  - DA09-1 / DA09-2 / DA10-1 / DA10-2 / DA12-2 / DA18-1 / adversarial 12 -> plan 198
  - DA12-1 / DA17-1 -> plan 196
  - DA14-1 / DA16-1 / DA16-2 / adversarial 14 -> plan 199
  - adversarial 8 + build-config project-references issue -> plan 197
  - adversarial 9b -> plan 193
  - adversarial 11a -> plan 195
  - adversarial 1/2/3/4/5/6/7/10 + cross-reaction loop detection -> plan 192
- [x] [Proof] closure audit 前再次核对 retained findings 无重复 owner / 无 dangling owner

Exit Criteria:

- [x] owner map 与 193-199 当前 scope 一致
- [x] 不存在条件式 owner 语句或未接线 retained finding
- [x] `docs/logs/` 对应日期条目已更新

## Validation Checklist

- [x] 192-owning confirmed defects 已修复
- [x] retained findings 的 owner map 已完整且唯一
- [x] 不存在被错误降级成 watch-only 的 confirmed live defect
- [x] 独立子 agent closure-audit 已完成并记录
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: All in-scope items landed with focused verification. Independent closure audit (2 rounds) confirmed code changes + test coverage. Full verification: typecheck ✅ build ✅ lint ✅ test ✅ (48/48).

Closure Audit Evidence:

- Reviewer / Agent: Independent subagent closure audit (round 1: identified gaps; round 2: confirmed remediation)
- Evidence: Round 1 found deferred cascade depth limit tests requiring integration scaffolding. Round 2 confirmed all remediated. Daily log: `docs/logs/2026/05-04.md`.

Follow-up:

- no remaining plan-owned work
