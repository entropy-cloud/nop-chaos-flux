# 373 Deep Audit 2026-05-19 Compiler Shape-Validation File Boundary Plan

> Plan Status: completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `02-01`：拆分 `shape-validation.ts`，让 compiler shape-validation surface 保持在 hard-gate 内并恢复清晰 owner boundary。

## Current Baseline

- live repo 中的 `packages/flux-compiler/src/schema-compiler/shape-validation.ts` 已因更早的抽离降到 `498` 行，不再触发 `>700` hard gate，但 plan 文本仍停留在旧基线。
- 该文件仍同时承担 node-field inspection 与 recursive schema traversal 两段 responsibility，owner boundary 仍不清晰。
- `pnpm check:oversized-code-files` 当前仍失败，但 live error list 已是其它 3 个 out-of-scope 文件。

## Goals

- 修复 `02-01`。
- 让该 file-boundary surface 以真实 split 方式保持通过 oversized gate。

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

Status: completed
Targets: `shape-validation.ts`, any extracted compiler modules

- Item Types: `Fix | Proof`
- [x] Split `shape-validation.ts` into thinner owner-shaped modules.
- [x] Re-run the oversized file gate and record the result.

Exit Criteria:

- [x] `02-01` is fixed.
- [x] The touched file no longer violates the oversized hard gate.
- [x] `No owner-doc update required`.
- [x] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [x] The in-scope retained finding is fixed.
- [x] No in-scope defect is downgraded to follow-up.
- [x] `No owner-doc update required`.
- [x] Fresh closure audit evidence is recorded in this plan and `docs/logs/2026/05-19.md`.
- [x] `pnpm --filter @nop-chaos/flux-compiler typecheck`
- [x] `pnpm --filter @nop-chaos/flux-compiler build`
- [x] `pnpm --filter @nop-chaos/flux-compiler lint`
- [x] `pnpm --filter @nop-chaos/flux-compiler test`
- [x] `pnpm check:oversized-code-files`

## Closure

Status Note: Completed after splitting the mixed owner surface into dedicated analyze/node-field modules, preserving the public `shape-validation.ts` import surface as a thin facade.

Closure Audit Evidence:

- Reviewer / Agent: current execution fresh closure pass (`gpt-5.4`); no separate subagent tool was available in this environment.
- Evidence: `shape-validation.ts` reduced to a 3-line facade, logic moved to `shape-validation-analyze.ts` and `shape-validation-node-fields.ts`, package-scoped `typecheck` / `build` / `lint` / `test` all passed, and `pnpm check:oversized-code-files` no longer lists the touched compiler file. Remaining hard-gate failures are limited to out-of-scope files: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`, `packages/flux-react/src/__tests__/schema-renderer.test.tsx`, and `packages/flux-action-core/src/__tests__/contract-control-flow-edge-cases.test.ts`.
