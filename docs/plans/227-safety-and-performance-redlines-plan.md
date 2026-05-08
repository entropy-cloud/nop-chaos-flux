# 227 Safety And Performance Redlines Plan

> Plan Status: in progress
> Last Reviewed: 2026-05-07
> Source: `docs/analysis/2026-05-07-deep-audit-full-8/{summary.md,15-security-performance.md}`
> Related: `docs/plans/{193-expression-evaluator-security-hardening-plan.md,214-report-designer-performance-hot-path-closure-plan.md,221-deep-audit-2026-05-07-confirmed-defect-remediation-plan.md}`

## Purpose

收口 `full-8` 中 7 个 retained P1 safety/performance redlines。完成态要求：value adapter、chart style、spreadsheet batch ops/search、flow tree layout、API cache stringify、以及 validation regex 的 supported baseline 达成 fail-closed 或 bounded-cost 语义，并有 focused proof。

## Current Baseline

- `docs/analysis/2026-05-07-deep-audit-full-8/15-security-performance.md` 保留了 7 个 P1 items：value-adapter transform failure fail-open、ChartStyle CSS injection、spreadsheet batch setCell clone O(k\*cells)、flow tree layout complexity、api-cache `stableStringify` deep/cycle DoS、spreadsheet find regex/empty query、validation pattern ReDoS/fail-open。
- `193` 已关闭 earlier evaluator security hardening；本计划只拥有 `full-8` 仍保留的 distinct redlines。
- `214` 已关闭 report-designer deep-copy performance baseline；本计划不重开该已关闭性能族。

## Goals

- 为 retained safety defects 建立 fail-closed / validated-input baseline。
- 为 retained performance defects 建立 bounded-cost algorithms or guards。
- 用 focused tests 把 redline 修复锁定成 supported contract。

## Non-Goals

- 不把本计划扩大成 generic performance optimization backlog。
- 不重开 debugger-only downgraded scans/regex items。
- 不重开 `214` 已关闭的 report-designer deep-copy performance work。

## Scope

### In Scope

- `packages/flux-core/src/value-adapter.ts`
- `packages/ui/src/components/ui/chart.tsx`
- `packages/spreadsheet-core/src/core/{document-access.ts,cell-operations.ts,search-operations.ts}` and directly affected helpers/tests
- `packages/flow-designer-core/src/tree-layout.ts`
- `packages/flux-runtime/src/async-data/api-cache.ts`
- validation regex lowering/runtime files directly responsible for the retained ReDoS/fail-open path
- directly affected focused tests and owner docs for these redlines

### Out Of Scope

- styling/package CSS cleanup owned by `228`
- report-designer deep-copy perf already closed by `214`
- generic low-priority optimization candidates or debugger-only downgraded paths

## Execution Plan

### Workstream 1 - Fail Closed On Retained Safety Redlines

Status: completed
Targets: value adapter, chart style, validation regex, api-cache guards, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Replace value-adapter transform failure fail-open behavior with an honest error or fail-closed contract.
- [x] [Fix] Validate chart style identifiers/color values so the retained CSS injection path is closed.
- [x] [Fix] Add cycle/depth/size guards to `stableStringify`.
- [x] [Fix] Close validation regex fail-open / ReDoS exposure with safe regex handling or explicit diagnostics.
- [x] [Proof] Add focused proof for the retained safety redlines.

Exit Criteria:

- [x] The retained safety redlines no longer reproduce on the supported paths.
- [x] Focused tests prove the final fail-closed/guarded baseline.
- [x] Affected owner docs are updated if the stable safety contract changed; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 2 - Bound Retained Performance Hot Paths

Status: completed
Targets: spreadsheet batch/search operations, flow tree layout, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Replace the retained repeated-clone spreadsheet batch path with a bounded-cost batch update strategy.
- [x] [Fix] Add safe handling for spreadsheet find regex and empty query behavior.
- [x] [Fix] Remove the retained avoidable high-cost paths in flow tree layout.
- [x] [Proof] Add focused performance-oriented proof or benchmark-style regression checks for the repaired hot paths.

Exit Criteria:

- [x] The retained spreadsheet and flow hot-path defects are closed.
- [x] Focused proof demonstrates the repaired bounded-cost behavior.
- [x] Affected owner docs are updated if the stable performance contract changed; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 3 - Verification And Closure Audit

Status: planned
Targets: in-scope packages/tests/docs, this plan

- Item Types: `Proof | Decision`

- [ ] Run focused verification for safety and performance redline fixes.
- [ ] Run workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all changes land.
- [ ] Perform an independent closure audit and fix any remaining in-scope redline ambiguity before closing the plan.

Exit Criteria:

- [ ] Focused verification is recorded for both retained redline families.
- [ ] Workspace verification passes.
- [ ] Independent closure audit confirms no remaining plan-owned blocker.
- [ ] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [ ] All in-scope retained safety redlines are fixed.
- [ ] All in-scope retained performance redlines are fixed.
- [ ] Focused verification exists for each landed family.
- [ ] No in-scope retained defect is silently deferred or downgraded.
- [ ] Affected owner docs are synced to the live baseline, or each workstream explicitly records `No owner-doc update required`.
- [ ] Independent closure audit confirms no remaining in-scope blocker.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Validation Checklist

- [ ] `193` and `214` carve-outs remain explicit.
- [ ] Safety fixes fail closed or surface errors honestly; they are not merely hidden.
- [ ] Performance fixes are backed by focused proof, not by optimistic comments alone.
- [ ] No retained `full-8` item from dimension 15 is left without an owner decision.

## Closure

Status Note: pending execution.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- Pending execution.
