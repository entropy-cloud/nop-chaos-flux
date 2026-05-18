# 214 Report Designer Performance Hot-Path Closure Plan

> Plan Status: completed
> Last Reviewed: 2026-05-05
> Source: `docs/analysis/2026-05-05-deep-audit-full-7/15-security-performance.md`, `docs/analysis/2026-05-05-deep-audit-full-7/summary.md`, `docs/architecture/performance-design-requirements.md`, `docs/architecture/report-designer/design.md`
> Related: `docs/plans/210-deep-audit-full-7-confirmed-defect-remediation-program-plan.md`

## Supersession Note

- 2026-05-06 live re-audit confirmed that this plan's performance closure stayed valid, but shared call paths in `report-designer-core` still had separate undo/dirty/document-integrity correctness gaps.
- Successor ownership for those reopened correctness semantics now lives in `docs/plans/216-open-ended-adversarial-review-residual-integrity-plan.md`.
- Plan `214` remains the accepted owner and closure record for the deep-copy performance baseline only; it does not own the later reopened undo/history correctness defects on the same paths.

## Purpose

收口 `full-7` 中 report-designer retained performance hot-path defects：spreadsheet 同步、metadata undo、字段源刷新上下文构造这三条路径上的整份文档深拷贝。这不是一般性的“未来可以优化”建议，而是已被独立复核确认为当前热路径上的真实性能 defect，且违反 `performance-design-requirements.md` 中避免热路径深拷贝/无谓分配的要求。

## Current Baseline

- `full-7` 维度 15 复核后保留 4 项，其中 3 项是 report-designer deep-copy hot paths，1 项是字段源刷新失败吞错；后者更接近 observability/runtime defect，已由 plan `211` 承接，本计划只拥有 retained deep-copy 性能项。
- spreadsheet 同步路径当前会为获取 `document.spreadsheet` 子树而先 `cloneDocument(...)` 整份 report document。
- metadata 编辑每次进入 undo 栈仍会深拷贝整份 report document，而不是只记录受影响 patch/subtree。
- 字段源刷新前的 adapter context 构造会双拷贝来自同一份 report document 的上下文对象。
- `docs/architecture/performance-design-requirements.md` 明确要求 hot path 避免不必要分配、避免 interaction loop 上的重成本对象操作；因此这三条 retained 问题不能降级为“有空再优化”。

## Goals

- 消除 retained report-designer deep-copy hot paths。
- 为这些性能修复建立 focused proof，而不是只凭代码阅读假设“应该更快”。
- 保持 plan scope 只聚焦 report-designer retained performance defects，不把其它 workbench cleanup 混进来。

## Non-Goals

- 不做泛化的全仓性能专项。
- 不处理 report-designer async observability/runtime correctness defects，这些由 plan `211` 承接。
- 不重构 report/spreadsheet 架构分层，只做与 retained hot-path defects 直接相关的最小修复。

## Scope

### In Scope

- `packages/report-designer-core/src/core.ts`
- `packages/report-designer-core/src/core-dispatch.ts`
- `packages/report-designer-core/src/runtime/{field-sources.ts,adapter-context.ts,metadata.ts}`
- directly affected focused tests, benchmarks, or instrumentation helpers needed to prove the fixes
- any directly affected owner docs if the documented performance baseline changes

### Out Of Scope

- unrelated flow-designer or spreadsheet performance work
- generic report-designer cleanup not tied to retained deep-copy paths
- observability/error-handling defects from dimension `15` that belong to plan `211`

## Execution Plan

### Phase 1 - Freeze The Retained Hot Paths And Measurement Baseline

Status: completed
Targets: in-scope core/runtime files, performance proof harness/tests

- Item Types: `Decision | Proof`

- [x] [Decision] Re-audit and freeze the exact retained hot paths, including where whole-document clone cost is paid and what minimum behavior must be preserved after refactor.
- [x] [Proof] Establish a focused measurement/proof baseline for each retained path so closure can show real reduction in unnecessary deep-copy work.
- [x] [Decision] Record whether any owner-doc update is required for the current performance baseline, or explicitly state `No owner-doc update required`.

Exit Criteria:

- [x] Each retained deep-copy hot path is explicitly identified with a proof method.
- [x] The plan has a frozen pre-fix measurement/proof baseline.
- [x] Owner-doc update responsibility is adjudicated.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Remove Whole-Document Clone Costs From Spreadsheet Sync And Undo

Status: completed
Targets: `core.ts`, `core-dispatch.ts`, `metadata.ts`, related focused proof

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Refactor spreadsheet sync to avoid cloning the full report document when only the spreadsheet subtree must change or be inspected.
- [x] [Fix] Refactor metadata undo recording so it no longer snapshots the full report document on every edit when a narrower patch/subtree record can preserve semantics.
- [x] [Proof] Add focused proof showing the retained deep-copy hot paths are removed while behavior stays correct.

Exit Criteria:

- [x] The retained spreadsheet-sync and metadata-undo deep-copy defects are closed.
- [x] Focused proof demonstrates reduced whole-document clone work without semantic regression.
- [x] Affected owner docs are updated if baseline changed; otherwise explicitly record `No owner-doc update required`.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Remove Redundant Deep Copies From Field-Source Context Construction

Status: completed
Targets: `field-sources.ts`, `adapter-context.ts`, related focused proof

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Remove the retained double-copy behavior from field-source adapter context creation, preferring shared immutable snapshots or narrower projections.
- [x] [Proof] Add focused proof showing field-source refresh no longer performs redundant full-document cloning.
- [x] [Decision] Record any residual watch-only performance work that remains out of scope after the retained defect is closed.

Exit Criteria:

- [x] The retained field-source context deep-copy defect is closed.
- [x] Focused proof demonstrates the removal of redundant full-document clone work.
- [x] Residual non-blocking performance ideas are explicitly adjudicated rather than silently left behind.
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [x] All in-scope retained performance defects from dimension `15` are fixed, or moved to explicit successor ownership with recorded reasoning.
- [x] No in-scope retained deep-copy hot path is downgraded to generic future optimization.
- [x] The in-scope retained set remains explicit and unchanged at closure time: spreadsheet sync whole-document clone, metadata undo whole-document clone, and field-source context redundant deep-copy.
- [x] Focused proof exists for spreadsheet sync, metadata undo, and field-source context construction.
- [x] Affected owner docs are synced to the live baseline, or the plan explicitly records `No owner-doc update required`.
- [x] Independent closure audit confirms no remaining in-scope retained performance blocker.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Broader Workbench Performance Program

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: this plan only owns the retained report-designer deep-copy hot paths confirmed by `full-7`, not a general performance program for all workbench packages.
- Successor Required: no

## Closure

Status Note: Completed. Live code no longer pays whole-document clone cost on the three in-scope retained report-designer hot paths: spreadsheet sync now swaps only the spreadsheet subtree, metadata undo/redo now reuses immutable document snapshots instead of cloning on every edit, and field-source refresh now builds one shared adapter-context document snapshot instead of double-copying the same report document.

Closure Audit Evidence:

- Reviewer / Agent: independent explore agent
- Evidence: `ses_207fba247ffeNMMLw8JwYGQM0j` confirmed all three retained dim-15 hot paths are closed in live code, focused proof exists in `packages/report-designer-core/src/__tests__/designer-core.test.ts` and `packages/report-designer-core/src/__tests__/metadata-immutability.test.ts`, and no owner-doc update is required.

Follow-up:

- No remaining plan-owned work.
