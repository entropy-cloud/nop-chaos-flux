# 247 Flow Designer Host Visibility And Instance Isolation Plan

> Plan Status: completed
> Last Reviewed: 2026-05-11
> Source: `docs/analysis/2026-05-11-deep-audit-full/{summary.md,15-security-performance.md}`
> Related: `docs/plans/{220-cross-boundary-state-and-host-contract-closure-plan.md,242-deep-audit-2026-05-11-residual-owner-assignment-plan.md}`

## Purpose

收口 retained `15-07` 与 `15-09`：flow-designer host 必须能看到 initial auto-layout failure，同时 tree-mode plus-button routing 必须恢复实例级隔离。

## Current Baseline

- `15-07` 是 active failure-visibility defect：initial auto-layout 失败后只 `console.warn`，host 看不到结构化 failure state。
- `15-09` 是 active multi-instance safety defect：`plusButtonHandlerHolder` 是模块级共享 bridge，多个 designer 会互相覆盖或 cleanup 彼此的 handler。
- 两条 retained items 共享一个 closure standard：designer renderer runtime 不能把 instance-owned failure/routing 状态藏在 module-level side channel 或 console-only path 里。
- `220` 已关闭 earlier flow-designer owner/boundary defects，但不拥有这两条 retained runtime-safety residuals。

## Goals

- 让 initial auto-layout failure 进入 host-visible reporting/status surface。
- 去掉 plus-button 的 module-level singleton bridge，改成实例级 routing ownership。
- 用 focused proof 锁定 host visibility 和 multi-instance isolation baseline。

## Non-Goals

- 不处理 retained graph fallback bounded-cost work；那由 `245` owning。
- 不扩展成整个 flow-designer observability platform redesign。
- 不重开只读 projection / tree-document architecture debates。

## Scope

### In Scope

- `packages/flow-designer-renderers/src/use-designer-auto-layout.ts`
- `packages/flow-designer-renderers/src/designer-canvas.tsx`
- directly affected renderer bridge/helpers/tests/docs

### Out Of Scope

- retained graph fallback complexity owned by `245`
- runtime async-data residuals owned by `244`
- surface validation-plan compile failure semantics owned by `246`

## Execution Plan

### Phase 1 - Restore Host-Visible Failure State And Instance-Local Routing

Status: completed
Targets: `15-07`, `15-09`, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] Route initial auto-layout failure through a supported host-visible reporting or status seam rather than console-only warning.
- [x] Replace `plusButtonHandlerHolder` with instance-local bridge ownership so mount/unmount of one designer cannot affect another.
- [x] Add focused proof for both initial auto-layout failure visibility and multi-instance plus-button isolation.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `15-07` and `15-09` are closed.
- [x] Auto-layout failure is visible to the owning host/debug surface.
- [x] Multi-instance tests prove plus-button routing no longer cross-talks between designers.
- [x] Any affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] All plan-owned retained defects (`15-07`, `15-09`) are fixed.
- [x] No plan-owned failure path remains console-only where the host should see a structured failure state.
- [x] No plan-owned interaction routing path remains module-global across designer instances.
- [x] Needed focused verification is complete.
- [x] Affected docs/logs are synced, or `No owner-doc update required` is explicitly recorded.
- [x] Independent closure audit confirms no plan-owned blocker remains.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None.

## Non-Blocking Follow-ups

- Broader flow-designer diagnostics or bridge ergonomics work outside retained `15-07` and `15-09` should open a separate successor.

## Closure

Status Note: Completed. Initial auto-layout failure is now host-visible, plus-button routing is instance-local, focused proof is present, and workspace verification is green.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent independent closure audit (`ses_1e9d55336ffeCpAIoAhaJaR1oL`)
- Evidence:
  - Host-visible failure and instance-local routing landed in `packages/flow-designer-renderers/src/{use-designer-auto-layout.ts,designer-canvas.tsx,designer-page-body.tsx}` and `packages/flow-designer-core/src/types.ts`.
  - Focused proof exists in `packages/flow-designer-renderers/src/auto-layout-guards.test.tsx`.
  - Owner-doc baseline was updated in `docs/architecture/flow-designer/{canvas-adapters.md,runtime-snapshot.md}`, and workspace-green verification was recorded in `docs/logs/2026/05-11.md`.

Follow-up:

- None yet; broader flow-designer diagnostics work outside retained `15-07` and `15-09` must not be folded into this plan implicitly.
