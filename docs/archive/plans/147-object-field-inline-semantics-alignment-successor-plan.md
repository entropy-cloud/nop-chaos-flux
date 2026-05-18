# 147 Object Field Inline Semantics Alignment Successor Plan

> Plan Status: completed
> Last Reviewed: 2026-04-26
> Source: `docs/architecture/object-field.md`, `docs/architecture/value-adaptation-and-detail-field.md`, `docs/plans/145-runtime-react-renderer-hotspot-boundary-convergence-plan.md`, live repo audit of `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`
> Related: `docs/plans/145-runtime-react-renderer-hotspot-boundary-convergence-plan.md`, `docs/plans/121-unified-value-adapter-for-all-field-types-plan.md`

## Purpose

这份计划单独收口 `object-field` 当前 live implementation 与 `docs/architecture/object-field.md` target baseline 之间剩余的语义差距：当前实现仍保留 renderer-local working copy + async writeback，而目标 baseline 是更直接的 parent-owned inline projected editor 语义。

## Current Baseline

- `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx` 已经复用共享 projected scope / projected form substrate。
- Plan 145 已经收敛 shared substrate 和 owner-boundary debt，但刻意没有改写 `object-field` 的 live edit semantics。
- 当前 `object-field` 仍维护 renderer-local working copy，并通过 async `transformOutAction` 写回 parent owner；这与 `docs/architecture/object-field.md` 当前 target baseline 仍有差距。

## Goals

- 明确 `object-field` 当前 live behavior 与 target inline projected-editor baseline 的最终收敛方向。
- 若需要改实现，保持 parent owner、relative child names、现有 public contract 与 user-visible authoring model 不变。
- 补齐 focused tests 和文档证据，避免这个语义 gap 长期停留在 unnamed follow-up 状态。

## Non-Goals

- 不把 `array-field`、`variant-field`、`detail-field` 一起并入本计划。
- 不重做 value-adaptation 的通用协议或 reopen Plan 145 已完成的 shared substrate work。
- 不扩大成新的 composite-field architecture rewrite。

## Execution Plan

### Phase 1 - Freeze Semantic Gap Baseline

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`, `docs/architecture/object-field.md`, focused tests

- [x] 明确当前 renderer-local working copy、writeback、validation/readback 行为的 live baseline。
- [x] 明确需要保留的 author-facing invariants 与不可改变的 parent-owner contract。

Exit Criteria:

- [x] gap 已被写成 repo-observable baseline，而不是停留在抽象描述
- [x] focused verification 入口已列清
- [x] 相关 `docs/architecture/` 已更新为最终设计状态
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - Align Object Field Semantics

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`, supporting helpers/tests

- [x] 在不改变 public contract 的前提下收敛 `object-field` 内部 edit/writeback semantics。
- [x] 保持 relative child-name authoring、parent-owned validation/writeback、现有 transform/value-adaptation contract 不变。

Exit Criteria:

- [x] `object-field` live semantics 与目标 baseline 一致，或差异被明确记录为最终 accepted baseline
- [x] focused tests 覆盖 working copy/writeback/validation 关键路径
- [x] 相关 `docs/architecture/` 已更新为最终设计状态
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: focused verification, docs, this plan

- [x] 运行相关 package verification 并记录证据。
- [x] 做独立 closure audit，确认无剩余 plan-owned gap。

Exit Criteria:

- [x] focused verification 已完成并记录
- [x] 独立 closure audit 已完成并记录证据
- [x] `docs/logs/` 对应日期条目已更新

## Closure

Status Note: Plan 147 can close because the remaining Plan 145 follow-up gap is no longer an unnamed semantic mismatch. `object-field` now follows the parent-owned projected-editor baseline for its default inline path: child scope and projected form reads track parent-owner object replacement directly, while transform-enabled cases still retain the minimal local working buffer needed for adapted draft vs committed-value divergence. The public schema contract, relative child-name authoring model, parent-owned validation/writeback path, and transform adapter semantics remain unchanged.

Closure Audit Evidence:

- Reviewer / Agent: independent general subagent
- Evidence: `task_id ses_235e0c9b0ffebQ2omE29PQjUbd` re-audited the live repo and confirmed the default inline path now projects parent-owned object replacement directly while transform-enabled paths still preserve the minimal local working buffer; the only audit finding was missing closure-evidence bookkeeping, which is now resolved by this entry.

Follow-up:

- No remaining plan-owned work.
