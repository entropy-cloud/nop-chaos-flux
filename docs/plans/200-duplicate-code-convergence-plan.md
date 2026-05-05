# 200 Duplicate Code Convergence Plan

> Plan Status: completed
> Last Reviewed: 2026-05-04
> Completed: 2026-05-04 — Phase 1: resolveGap/GAP_TOKENS removed from flux-renderers-basic/utils.ts, consumers updated to import from flux-react. Phase 2: isAbortError canonical in flux-core/runtime-inspection.ts (consumers: flux-runtime, flux-action-core, report-designer-core), buildScopeChain canonical in same file (consumers: component-handle-registry, nop-debugger), NopScopeChainEntry → deprecated alias for ScopeSnapshot. Full verification: typecheck ✅ build ✅ lint ✅ test ✅.
> Source: live repo audit from `pnpm check:duplicates:detail`, direct code re-read across affected packages, and repeated independent subagent review on 2026-05-04
> Related: `docs/plans/158-code-quality-redundancy-and-duplication-remediation-plan.md`, `docs/plans/159-code-refactor-discovery-remediation-plan.md`, `docs/plans/163-core-boundary-and-validation-owner-convergence-plan.md`

## Purpose

基于 2026-05-04 的 live duplicate audit，只收敛那些已经跨包复制、且已经能明确判定 owner 的基础设施级重复实现；同时显式排除“看起来像重复、但其实承载不同领域语义”或已经被 owner doc 明确定位在 package boundary 的代码，避免为了去重而破坏第一版代码库正在形成的长期规范参考面。

## Current Baseline

- `pnpm check:duplicates:detail` 当前在 `packages/` 下报告 185 组 clone、总重复率 2.19%，其中大量命中属于同文件内部模式重复、配置样板、测试配置、或领域内刻意分支，不适合直接抽象。
- 直接复核后，jscpd 命中的跨文件重复里，只有一部分属于 owner-level convergence 候选；其余不少命中只是 package-local adapter、family-specific contract wrapper、或领域内有意分支。
- `docs/plans/159-code-refactor-discovery-remediation-plan.md` 已把 `resolveGap` 提取到 `flux-react`，但 live repo 仍保留 `packages/flux-renderers-basic/src/utils.ts` 中的旧副本，说明此前只完成了“新 owner 出现”，没有完成“旧副本删除并统一消费”。
- `docs/architecture/flux-runtime-module-boundaries.md:450-456` 已明确当前 baseline：workbench host families 的 provider adapter 应在 package boundary 负责 host-command normalization，`spreadsheet-renderers` 与 `report-designer-renderers` 的 package-local provider 是当前支持设计，而不是尚未完成的 core 提取。
- `packages/flux-runtime/src/component-handle-registry.ts` 与 `packages/nop-debugger/src/controller-helpers.ts` 都在本地构造 scope chain snapshot，且两处都基于 `ScopeRef` / `ScopeSnapshot` 语义，这一能力本质上属于 core contract 层。
- `packages/nop-debugger/src/types.ts` 仍本地声明 `NopScopeChainEntry`，而 `packages/flux-core/src/types/node-identity.ts` 已有同构的 `ScopeSnapshot`。如果只抽函数体、不统一类型 owner，scope-chain 语义仍会分裂。
- `packages/flux-action-core/src/action-core.ts`、`packages/flux-runtime/src/error-utils.ts`、`packages/report-designer-core/src/core-dispatch.ts` 现在各自维护 abort error 判定逻辑；其中 `flux-action-core` 版本测试最完整，但它不能成为唯一 owner，因为 `report-designer-core` 和 `nop-debugger` 都不应反向依赖 `flux-action-core`。`report-designer-core` 当前分支还存在“abort 与非 abort 返回值相同”的局部冗余，说明这组重复里既有 owner drift，也有 dead-cleanup 成分。
- `packages/report-designer-renderers/src/report-designer-manifest.ts`、`packages/spreadsheet-renderers/src/spreadsheet-manifest.ts`、`packages/flow-designer-renderers/src/designer-manifest.ts`、`packages/word-editor-renderers/src/word-editor-manifest.ts` 的 family-specific schema/capability 声明应保持独立，但文件尾部的 version map / resolve / publication / host contract wrapper 已出现稳定样板，值得单独裁定是否收敛。
- 以下命中经复核后不应纳入本计划的抽象执行面：`array-editor` / `key-value`、`detail-field` / `detail-view`、host action provider boundary、以及多数同文件内部重复。这些实现虽然文本相似，但 owner、校验语义、commit 语义或架构文档归属不同，强行抽象会降低代码作为未来规范参考源的清晰度。

## Goals

- 为跨包重复但已具备清晰 owner 的基础设施建立单一实现。
- 清除已经确认的“新 owner 已出现但旧副本仍残留”的 contract drift。
- 把“不应该抽象”的相似实现或 boundary adapter 显式定案，避免后续重复审计再次把它们误报成必须统一的 debt。

## Non-Goals

- 不做 repo-wide clone 数字清零，jscpd 命中本身不是执行目标。
- 不为 `array-editor` / `key-value` / `detail-field` / `detail-view` 引入通用 composite editor 或 staged-detail framework。
- 不把 workbench host action provider boundary 提升为 `flux-core` 公共原语，除非 owner doc 先被重新裁定。
- 不为 report / spreadsheet / flow / word host family 引入会隐藏 vocabulary 的通用 manifest builder。
- 不处理同文件内部模板重复、Vitest 配置样板、CSS token 对称块、或测试辅助样板，除非它们在后续独立计划中被证明是 owner-level defect。

## Scope

### In Scope

- `packages/flux-react/src/resolve-gap.ts`
- `packages/flux-renderers-basic/src/utils.ts`
- `packages/flux-renderers-basic/src/{container.tsx,flex.tsx}` and related tests if import rewiring is needed
- `packages/flux-runtime/src/component-handle-registry.ts`
- `packages/nop-debugger/src/controller-helpers.ts`
- `packages/nop-debugger/src/types.ts`
- `packages/nop-debugger/src/adapters.ts`
- `packages/flux-action-core/src/action-core.ts`
- `packages/flux-runtime/src/error-utils.ts`
- `packages/report-designer-core/src/core-dispatch.ts`
- `packages/flux-core/src/runtime-inspection.ts` (new focused neutral helper module for scope snapshot and abort classification)
- `packages/flux-core/src/index.ts`
- focused tests for the above behavior
- `docs/architecture/flux-core.md` if a new shared owner utility surface is introduced
- `docs/architecture/flux-runtime-module-boundaries.md` if utility ownership wording needs sync
- execution-date entry under `docs/logs/{year}/{month}-{day}.md`

### Out Of Scope

- `packages/flux-renderers-form-advanced/src/array-editor.tsx`
- `packages/flux-renderers-form-advanced/src/key-value.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/*`
- `packages/report-designer-renderers/src/host-action-provider.ts`
- `packages/spreadsheet-renderers/src/host-action-provider.ts`
- `packages/report-designer-renderers/src/page-renderer.tsx`
- `packages/spreadsheet-renderers/src/page-renderer.tsx`
- `packages/report-designer-renderers/src/index.ts`
- `packages/spreadsheet-renderers/src/index.ts`
- `packages/flow-designer-renderers/src/designer-canvas.tsx`
- `packages/flow-designer-renderers/src/dingflow/ding-flow-canvas-overlay.tsx`
- same-file local clone cleanup that does not cross an owner boundary

## Closure Gates

- [x] 所有 in-scope duplicate groups 都已完成 owner 裁定，并且 live code 不再保留平行 owner。
- [x] `resolveGap` 的 residual duplicate 已从 `flux-renderers-basic` 删除，不再存在双 owner。
- [x] scope chain helper 与其类型 owner 已同时收敛，而不是只抽走一段循环代码。
- [x] abort error 判定完成正确 owner 下沉，不引入依赖方向倒挂。
- [x] manifest tail wrapper 如进入 shared helper，必须保持 family-specific vocabulary 和 schema declaration 仍在各自 package 内清晰可读。
- [x] 所有 in-scope focused verification 已完成。
- [x] 相关 owner docs 与执行当日 `docs/logs/{year}/{month}-{day}.md` 已同步到最终 baseline。

## Deferred But Adjudicated

### Composite List Editors (`array-editor` / `key-value`)

- Classification: `watch-only residual`
- Why Not Blocking Closure: 两者当前重复主要是“外观相似但语义不同”的 renderer-local lifecycle；当前证据不足以证明通用抽象会比现有显式实现更清晰。
- Successor Required: no

### Detail Draft Renderers (`detail-field` / `detail-view`)

- Classification: `watch-only residual`
- Why Not Blocking Closure: 共享基底已经下沉到 `detail-draft-controller` / `value-adaptation-helper`，剩余差异正是 field-bound commit 与 scope-bound commit 的 owner 语义，不应仅因文本相似继续强行统一。
- Successor Required: no

### Workbench Host Action Providers (`report-designer` / `spreadsheet`)

- Classification: `watch-only residual`
- Why Not Blocking Closure: owner doc 已明确这类 provider adapter 应在 package boundary 承担 host-command normalization；当前重复是被文档允许的 boundary-local boilerplate，而不是待抽到 `flux-core` 的 defect。
- Successor Required: no

### Family-Specific Manifest Bodies

- Classification: `watch-only residual`
- Why Not Blocking Closure: manifest 中的大段重复来自 family-specific projection/capability vocabulary，抽象风险高；本计划只考虑尾部 wrapper 样板，不处理主体声明。
- Successor Required: no

### Manifest Tail Wrapper Boilerplate

- Classification: `watch-only residual`
- Why Not Blocking Closure: 虽然 `manifestVersions` / `resolveManifest` / publication / host contract 尾部有稳定样板，但当前 live repo 还没有 owner-doc 证据证明这是 defect。对第一版高可读性基线而言，publisher-local explicit tails 仍是可接受的重复。
- Successor Required: no

### DingFlow Add-Menu Wiring (`designer-canvas` / `ding-flow-canvas-overlay`)

- Classification: `optimization candidate`
- Why Not Blocking Closure: 同包局部 helper 的确可能成立，但当前收益只在 future touch 时顺手收敛；它不是跨 owner 的基础设施重复。
- Successor Required: no

## Non-Blocking Follow-ups

- 如果后续还有重复审计，应先按“跨 owner / 同 owner / 同文件”分层，而不是直接按 jscpd 命中数量排优先级。
- 如果未来 owner doc 改写了 host provider boundary，再单独评估 package-local adapter 是否值得进入 shared helper 计划。

## Execution Plan

### Phase 1 - Shared UI/Layout Utility Ownership Cleanup

Status: planned
Targets: `packages/flux-react/src/resolve-gap.ts`, `packages/flux-renderers-basic/src/utils.ts`, `packages/flux-renderers-basic/src/{container.tsx,flex.tsx}`, tests, and any other direct local consumers

- Item Types: `Fix | Proof`

- [x] [Fix] 删除 `flux-renderers-basic/src/utils.ts` 中残留的 `GAP_TOKENS` / `resolveGap` 副本。
- [x] [Fix] `flux-renderers-basic` 相关调用方全部改为使用 `@nop-chaos/flux-react` 的单一 owner 实现。
- [x] [Proof] focused tests 覆盖 token gap、numeric gap、raw CSS gap 三类行为仍与现有 baseline 一致。
- [x] [Proof] 明确保留 `utils.ts` 中 renderer-local helper（如 `resolveDirection`），不把它们错误上升为 shared primitive。

Exit Criteria:

- [x] `resolveGap` / `GAP_TOKENS` 在 live repo 中只剩单一 owner
- [x] `flux-renderers-basic` 不再维护 gap 解析副本
- [x] `No owner-doc update required` 或相应 doc 更新已明确记录
- [x] 执行当日 `docs/logs/{year}/{month}-{day}.md` 已更新

### Phase 2 - Core Contract Utility Convergence

Status: planned
Targets: `packages/flux-runtime/src/component-handle-registry.ts`, `packages/nop-debugger/src/controller-helpers.ts`, `packages/nop-debugger/src/types.ts`, `packages/nop-debugger/src/adapters.ts`, `packages/flux-action-core/src/action-core.ts`, `packages/flux-runtime/src/error-utils.ts`, `packages/report-designer-core/src/core-dispatch.ts`, and `packages/flux-core/src/runtime-inspection.ts`

- Item Types: `Fix | Decision | Proof`

- [x] [Decision] 把 `buildScopeChain`、`ScopeSnapshot` 相关导出、以及 `isAbortError` 的最终 owner 固定到 `packages/flux-core/src/runtime-inspection.ts`，不在执行过程中临时发明第二个 neutral helper 位置。
- [x] [Fix] 让 runtime/debugger 共用一套 scope chain snapshot 构建逻辑，同时消除 `NopScopeChainEntry` 与 `ScopeSnapshot` 的平行类型 owner。
- [x] [Fix] 把 abort error 判定统一到 `packages/flux-core/src/runtime-inspection.ts`，替换 `flux-action-core`、`flux-runtime`、`nop-debugger` 中的重复实现，并删除 `report-designer-core` 中不再需要的局部重复分支。
- [x] [Proof] focused tests 覆盖 DOMException / `{ name: 'AbortError' }` / `{ code: 'ABORT_ERR' }` / 非 abort error 的判定结果。
- [x] [Proof] focused tests 或 targeted assertions 覆盖 scope chain snapshot 的 `id` / `path` / `label` / `readOwn()` 语义保持一致。

Exit Criteria:

- [x] scope chain builder 与 scope chain snapshot type 只剩一个公共 owner
- [x] abort error predicate 只剩一个公共 owner，且无依赖反转
- [x] `docs/architecture/flux-core.md` 或相关 owner docs 已同步最终归属
- [x] 执行当日 `docs/logs/{year}/{month}-{day}.md` 已更新

## Validation Checklist

- [x] in-scope duplicate groups 都完成了“是否该统一”的最终裁定，而不是只完成局部重写
- [x] live repo 中不再同时存在 `resolveGap`、`buildScopeChain`、`ScopeSnapshot` duplicate type owner、`isAbortError` 的平行 owner
- [x] `array-editor` / `key-value`、`detail-field` / `detail-view`、host action provider boundary、manifest body/tail 的“不抽象”决定已在 plan 中明确记录
- [x] focused verification 已覆盖共享 helper 收敛后的核心语义
- [x] 不存在被静默降级到 follow-up 的 in-scope live duplicate owner drift
- [x] 独立子 agent closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: All in-scope items landed with focused verification. Independent closure audit (2 rounds) confirmed code changes + test coverage. Full verification: typecheck ✅ build ✅ lint ✅ test ✅ (48/48).

Closure Audit Evidence:

- Reviewer / Agent: Independent subagent closure audit (round 1: identified gaps; round 2: confirmed remediation)
- Evidence: Round 1 found resolveGap cleanup, isAbortError/buildScopeChain convergence, and NopScopeChainEntry deprecation all properly landed. Round 2 confirmed all remediated. Daily log: `docs/logs/2026/05-04.md`.

Follow-up:

- no remaining plan-owned work
