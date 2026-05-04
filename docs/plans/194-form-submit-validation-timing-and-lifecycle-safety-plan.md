# 194 Form Submit, Validation Timing & Lifecycle Safety

> Plan Status: planned
> Last Reviewed: 2026-05-04
> Source: `docs/analysis/2026-05-04-adversarial-review-2.md` (R2-F1), `docs/analysis/2026-05-04-adversarial-review-3.md` (R3-F1,F2,F3,F4,F5,F7), `docs/analysis/2026-05-04-adversarial-review-5.md` (R5-F5,F6), `docs/analysis/2026-05-04-deep-audit-full-6/summary.md` (P3-3)
> Related: plan-192 (Phase 1.3 covers submitForm bare catch; this plan covers broader submit/validation timing)

## Purpose

修复 form submit 流程的原子性缺陷、validation 生命周期的 abort 缺失、reaction 系统的循环检测缺失，以及 surface close 时的资源泄漏，使表单在并发操作和异常路径下保持状态一致性。

## Current Baseline

- Submit 流程中 `isSubmittingInternal` 不阻塞 `setValue`，验证和提交之间存在数据竞态（R3-F1, R3-F2）
- `supersedeLowerPriorityWork` 与并发 setValue 的 runId 竞争导致验证绕过（R3-F2）
- 跨 Reaction 循环依赖绕过 `MAX_CASCADE_DEPTH` 可冻结浏览器（R3-F3）
- Surface close 不 abort 在途异步验证（R3-F4）
- 表单 dispose 时 `validationAbortControllers.clear()` 未调用 `.abort()`（R2-F1）
- Submit try/finally 不覆盖 validation 阶段——异常导致 form 永久卡死 submitting（R5-F5）
- 自定义 validator 抛非 Error 值导致 unhandled rejection（R5-F6）
- Child form 独立 submit + parent recurse-submit 竞争（R3-F5）
- `validateForm` 并行验证 + revalidateDependents runId 冲突（R3-F7）
- Reaction runtime `void Promise.resolve().then()` 无 `.catch()`（deep-audit P3-3）

## Goals

- Submit 流程在并发 setValue 下保证数据一致性
- 所有 validation abort controller 在 dispose 时正确 abort
- Reaction 系统有全局循环检测机制
- Submit 异常路径不会永久锁死表单

## Non-Goals

- Reaction coalescing 语义变更（R3-F8 是 by-design，仅补文档）
- Debounced action prevResult 过期（R3-F6, LOW, by-design）
- 完整的 optimistic locking 机制

## Scope

### In Scope

- `packages/flux-runtime/src/form/form-runtime-submit-flow.ts` — try/finally 扩大 + value snapshot
- `packages/flux-runtime/src/form/form-runtime-owner-lifecycle.ts` — abort controllers on dispose
- `packages/flux-runtime/src/form/form-runtime-validation.ts` — non-Error thrown value normalization
- `packages/flux-runtime/src/async-data/reaction-runtime.ts` — global cycle detection + `.catch()` 补全
- `packages/flux-runtime/src/surface-runtime.ts` — abort validation on surface close

### Out Of Scope

- Reaction coalescing 中间状态丢失（by-design，补文档即可）
- Debounced action stale prevResult（LOW，by-design）

## Closure Gates

- [ ] 所有 in-scope HIGH defects 已修复
- [ ] 每项修复有 focused test
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [ ] `docs/architecture/form-validation.md` 已更新（submit timing 语义）
- [ ] `docs/logs/` 已更新

## Deferred But Adjudicated

### Reaction coalescing 中间状态文档

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: by-design trade-off，非 defect；仅需补充文档说明
- Successor Required: no

### Debounced action stale prevResult

- Classification: `watch-only residual`
- Why Not Blocking Closure: LOW severity，debounce 语义本身的固有特性
- Successor Required: no

## Execution Plan

### Phase 1 - Submit Flow 原子性与异常安全

Status: planned
Targets: `packages/flux-runtime/src/form/form-runtime-submit-flow.ts`

- Item Types: Fix

- [ ] [Fix] 将 `setIsSubmitting(true)` 到函数 return 之间的整个函数体包在 try/finally 中，确保 `setIsSubmitting(false)` + `store.setSubmitting(false)` 在任何异常路径都执行（R5-F5）
- [ ] [Fix] Submit 时在 `validateForm` 之前 snapshot `store.getState().values`，后续 `executeSubmit` 使用 snapshot 而非 live store（R3-F1）。或者在 `isSubmitting` 期间让 `setValue` 排队延迟执行
- [ ] [Decision] 选择 snapshot vs freeze-setValue 方案，记录决策理由
- [ ] [Proof] 测试：validateForm 抛异常后 `isSubmitting` 恢复为 false
- [ ] [Proof] 测试：childContracts.triggerValidation reject 后 `isSubmitting` 恢复为 false
- [ ] [Proof] 测试：submit 期间并发 setValue 不会导致提交未验证数据

Exit Criteria:

- [ ] Submit 异常不会永久锁死表单
- [ ] Submit 数据一致性有 focused test 覆盖
- [ ] `docs/architecture/form-validation.md` 更新 submit timing 语义
- [ ] `docs/logs/` 已更新

### Phase 2 - Validation Abort 完整性

Status: planned
Targets: `packages/flux-runtime/src/form/form-runtime-owner-lifecycle.ts`, `packages/flux-runtime/src/form/form-runtime-validation.ts`, `packages/flux-runtime/src/surface-runtime.ts`

- Item Types: Fix

- [ ] [Fix] `disposeOwnerState` 中在 `validationAbortControllers.clear()` 之前遍历所有 values 调用 `.abort()`（R2-F1）
- [ ] [Fix] Surface close 路径确保调用 form 的 validation abort（R3-F4）
- [ ] [Fix] `validatePath` catch block 对非 Error thrown values 做 normalization（`new Error(String(thrown))`），避免 unhandled rejection（R5-F6）
- [ ] [Proof] 测试：form dispose 后在途异步验证 HTTP 请求被 abort
- [ ] [Proof] 测试：surface close 后在途验证被 abort
- [ ] [Proof] 测试：自定义 validator throw 字符串时不产生 unhandled rejection

Exit Criteria:

- [ ] Dispose/close 后无泄漏的 HTTP 请求
- [ ] 非 Error thrown values 被正确 normalize
- [ ] No owner-doc update required
- [ ] `docs/logs/` 已更新

### Phase 3 - Reaction 循环检测

Status: planned
Targets: `packages/flux-runtime/src/async-data/reaction-runtime.ts`

- Item Types: Fix

- [ ] [Fix] 引入 per-tick 全局 reaction 执行计数器或 visited-set：同一 microtask tick 内如果同一组 reaction 被触发超过阈值（如 MAX_GLOBAL_CASCADE = 100），停止并 console.error（R3-F3）
- [ ] [Fix] `void Promise.resolve().then()` 链添加 `.catch(reportError)` 或 `try/catch` 包裹（deep-audit P3-3）
- [ ] [Proof] 测试：两个互相写对方依赖的 reaction 在阈值后停止而非无限循环
- [ ] [Proof] 测试：reaction 内部 throw 不产生 unhandled rejection

Exit Criteria:

- [ ] 循环 reaction 在阈值后停止并报错，不冻结浏览器
- [ ] `docs/architecture/` 中记录 reaction cascade limit 语义（或在 flux-core.md 补充）
- [ ] `docs/logs/` 已更新

### Phase 4 - 子表单竞争与并行验证优化

Status: planned
Targets: `packages/flux-runtime/src/form/form-runtime-submit-flow.ts`, `packages/flux-runtime/src/form/form-runtime-owner.ts`

- Item Types: Fix

- [ ] [Fix] Parent recurse-submit 持有的 child triggerValidation promise 在 child dispose 时正确 reject 或返回 error result，而非静默 resolve 空结果（R3-F5）
- [ ] [Fix] `validateForm` 并行验证后的 `revalidateDependents` 使用去重策略——已在并行验证中验证过的 path 不重复触发（R3-F7）
- [ ] [Proof] 测试：child form dispose 时 parent 收到明确的 validation failure
- [ ] [Proof] 测试：双向依赖字段在 full-form validation 时不产生重复验证

Exit Criteria:

- [ ] Cross-form submit 竞争有明确的 failure 语义
- [ ] 双向依赖字段验证无冗余
- [ ] No owner-doc update required
- [ ] `docs/logs/` 已更新

## Non-Blocking Follow-ups

- Reaction coalescing 中间状态：在 `docs/architecture/flux-core.md` 中补充说明 coalescing 语义为 by-design
- Debounced action stale prevResult：记录为已知行为

## Validation Checklist

- [ ] Submit 异常不会永久锁死表单
- [ ] Dispose 后无泄漏的在途请求
- [ ] 循环 reaction 不会冻结浏览器
- [ ] 不存在被降级的 in-scope live defect
- [ ] 独立子 agent closure-audit 已完成并记录
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Reviewer / Agent: <<独立审阅者>>
- Evidence: <<task id / findings>>

Follow-up:

- <<完成时填写>>
