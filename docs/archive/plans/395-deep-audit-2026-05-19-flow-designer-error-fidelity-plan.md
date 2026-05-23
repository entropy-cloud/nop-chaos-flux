# 395 Deep Audit 2026-05-19 Flow-Designer Error Fidelity Plan

> Plan Status: completed
> Last Reviewed: 2026-05-20
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `19-02`、`19-03`、`19-06`：让 flow-designer error propagation 保留原始 fidelity，而不是字符串化或重建 Error。

## Current Baseline

- node hooks stringify thrown errors。
- edge hooks stringify thrown errors。
- host action errors are rebuilt as new `Error` instances。

## Goals

- 修复 `19-02`、`19-03`、`19-06`。
- 补 focused error-fidelity proof。

## Non-Goals

- 不处理 flow-designer type boundary or a11y findings。

## Scope

### In Scope

- `19-02`, `19-03`, `19-06`
- relevant flow-designer command/context files/tests
- `docs/logs/2026/05-20.md`

### Out Of Scope

- type-boundary and accessibility surfaces

## Execution Plan

### Phase 1 - Preserve Flow-Designer Error Fidelity

Status: completed
Targets: flow-designer error paths and focused tests

- Item Types: `Fix | Proof`
- [x] Preserve original errors/cause instead of stringifying or rebuilding them.
- [x] Add focused proof for the final propagation contract.

Implemented:

- `packages/flow-designer-core/src/types.ts` now allows `DesignerEvent` `lifecycleHookError.error` to preserve the original thrown value as `unknown` instead of forcing a string-only surface.
- `packages/flow-designer-core/src/core-node-commands.ts` and `src/core-edge-commands.ts` now emit the original thrown hook error for node-create, edge-connect, and delete hook failures instead of collapsing them through `String(err)`.
- `packages/flow-designer-renderers/src/designer-command-types.ts`, `src/designer-command-adapter-helpers.ts`, `src/designer-command-adapter-graph.ts`, `src/designer-context.ts`, and `src/designer-page-inner.tsx` now keep host-facing action results and monitor reporting on the original thrown value instead of flattening it to a string or rebuilding a fresh `Error`.
- Focused proof now lives in `packages/flow-designer-core/src/__tests__/core-error-fidelity.test.ts` and reuses the public `createDesignerCore(...)` owner surface instead of a lower-level harness.
- Renderer-side focused proof now lives in `packages/flow-designer-renderers/src/designer-command-adapter.test.ts`, `src/designer-provider-and-manifest.test.tsx`, and `src/designer-page-shell.test.tsx`.

Exit Criteria:

- [x] `19-02`, `19-03`, and `19-06` are fixed.
- [x] Focused proof covers original-error preservation.
- [x] `No owner-doc update required`.
- [x] `docs/logs/2026/05-20.md` is updated.

## Closure Gates

- [x] The in-scope retained findings are fixed.
- [x] `No owner-doc update required`.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Completed. Node/edge lifecycle hooks, host-facing designer action results, and monitor reporting now preserve original error fidelity end-to-end; no owner-doc update was required, and the current workspace verification baseline is green.

Focused Verification Evidence:

- `pnpm --filter @nop-chaos/flow-designer-core exec vitest run src/__tests__/core-error-fidelity.test.ts src/core.test.ts src/__tests__/core-graph.test.ts`
- `pnpm --filter @nop-chaos/flow-designer-core typecheck`
- `pnpm --filter @nop-chaos/flow-designer-renderers exec vitest run src/designer-command-adapter.test.ts src/designer-provider-and-manifest.test.tsx src/designer-page-shell.test.tsx`
- `pnpm --filter @nop-chaos/flow-designer-renderers typecheck`

Closure Audit Evidence:

- Reviewer / Agent: gpt-5.4 independent closure audit (`ses_1bcc0fe73ffejud0lGbX4ZinB4`)
- Evidence: confirmed raw thrown values now flow through `core-node-commands.ts`, `core-edge-commands.ts`, `designer-command-adapter-graph.ts`, `designer-context.ts`, and `designer-page-inner.tsx` without stringification or `new Error(...)` rebuilding; repo-wide `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` all pass on the current tree.
