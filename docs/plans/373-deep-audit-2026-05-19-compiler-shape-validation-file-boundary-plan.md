# 373 Deep Audit 2026-05-19 Compiler Shape-Validation File Boundary Plan

> Plan Status: planned
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `02-01`：拆分 `shape-validation.ts`，让 compiler shape-validation surface 回到 hard-gate 内并恢复清晰 owner boundary。

## Current Baseline

- `packages/flux-compiler/src/schema-compiler/shape-validation.ts` 超过 oversized hard gate。
- 文件当前同时承担多段 shape-validation responsibility。

## Goals

- 修复 `02-01`。
- 让该 file-boundary surface 重新通过 oversized gate。

## Non-Goals

- 不顺带重构 compiler 的其它 validation modules。

## Scope

### In Scope

- `02-01`
- `packages/flux-compiler/src/schema-compiler/shape-validation.ts`
- minimal extracted modules, verification, `docs/logs/2026/05-19.md`

### Out Of Scope

- other oversized files from Plan `371`

## Execution Plan

### Phase 1 - Split Shape Validation Ownership

Status: planned
Targets: `shape-validation.ts`, any extracted compiler modules

- Item Types: `Fix | Proof`
- [ ] Split `shape-validation.ts` into thinner owner-shaped modules.
- [ ] Re-run the oversized file gate and record the result.

Exit Criteria:

- [ ] `02-01` is fixed.
- [ ] The touched file no longer violates the oversized hard gate.
- [ ] `No owner-doc update required`.
- [ ] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [ ] The in-scope retained finding is fixed.
- [ ] No in-scope defect is downgraded to follow-up.
- [ ] `No owner-doc update required`.
- [ ] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: Pending.

Closure Audit Evidence:

- Reviewer / Agent: pending independent closure audit
- Evidence: not yet run
