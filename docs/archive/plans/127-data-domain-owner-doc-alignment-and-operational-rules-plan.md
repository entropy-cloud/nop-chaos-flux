# 127 Data Domain Owner Doc Alignment And Operational Rules Plan

> Plan Status: completed
> Last Reviewed: 2026-04-22
> Source: `docs/architecture/data-domain-owner.md`, `docs/architecture/form-validation.md`, `docs/architecture/value-adaptation-and-detail-field.md`, `docs/architecture/table-row-identity-and-scope-performance.md`, `docs/architecture/scope-ownership-and-isolation.md`, `docs/experiments/v12/final-design.md`, `packages/flux-core/src/types/runtime.ts`, `packages/flux-core/src/utils/path-binding.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-renderers-form-advanced/src/detail-view/`, `packages/flux-renderers-data/src/table-renderer/`

## Purpose

收口一个小而完整的 documentation slice：把 `docs/architecture/data-domain-owner.md` 强化成可操作的 owner 判定基线，并把与之直接耦合的 validation、value adaptation、row scope、scope isolation 文档同步到同一语义口径，同时补齐 daily log 证据和独立 closure audit。

## Current Baseline

- `docs/architecture/data-domain-owner.md` 已建立 `Data Domain Owner` 术语，也已把 `form`、`detail-*`、surface、row、inline composite editor 放进同一 owner 视角，但此前缺少可直接执行的 operational rules。
- `docs/architecture/form-validation.md` 已明确 validation 由 nearest validation-capable scope runtime 拥有，并且 page/root data scope 在没有更近 form/draft owner 时可以承接 validation ownership。
- `docs/architecture/value-adaptation-and-detail-field.md` 已区分 staged detail owner 与 parent-owned inline live editor；live code 里 `detail-field` / `detail-view` 仍以 renderer-level draft `FormRuntime` 实现该语义。
- `docs/architecture/table-row-identity-and-scope-performance.md` 与 `docs/architecture/scope-ownership-and-isolation.md` 已说明 row scope 是 isolated lexical carrier，不默认等于 owner；live code 也已有 `rowKey`-based row scope cache 和 row scope isolation。
- 剩余 gap 是几份文档之间的 operational phrasing 还不够硬，仍可能让读者误解为“创建 own scope == 创建 owner”或“surface / row scope / projected editor 都是同一种 owner”。

## Goals

- 让 `docs/architecture/data-domain-owner.md` 成为 owner 判定的直接操作基线，而不只是概念总述。
- 让 `form-validation.md`、`value-adaptation-and-detail-field.md`、`table-row-identity-and-scope-performance.md`、`scope-ownership-and-isolation.md` 对 owner/scope/surface 的边界描述不再互相留白或依赖读者推断。
- 为本次 doc alignment 留下 daily log 证据，并以独立 closure audit 作为关闭条件。

## Non-Goals

- 不改动 runtime、compiler、renderer 行为或 public TypeScript contract。
- 不扩展到 owner-runtime 实现计划或更大范围的 docs routing 重写。
- 不把本计划变成历史 owner plan 清理工程。

## Scope

### In Scope

- `docs/architecture/data-domain-owner.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/value-adaptation-and-detail-field.md`
- `docs/architecture/table-row-identity-and-scope-performance.md`
- `docs/architecture/scope-ownership-and-isolation.md`
- `docs/logs/2026/04-22.md`

### Out Of Scope

- runtime/compiler/renderer source code changes
- unrelated architecture doc routing cleanup
- new architecture concepts beyond clarifying already-chosen `Data Domain Owner` semantics

## Execution Plan

### Phase 1 - Harden Owner Rules

Status: completed
Targets: `docs/architecture/data-domain-owner.md`

- [x] Re-audited `data-domain-owner.md` against the live doc/code anchors already carrying owner semantics.
- [x] Added operational rules covering scope creation vs owner creation, page/root fallback, surface own scope, canonical address, `rootPath`, lifecycle, child contract, and row retargeting.
- [x] Added a family-default table and a decision matrix for `page`, `form`, `detail-*`, `dialog`/`drawer`, row scope, `loop`, and inline composite editors.
- [x] Tightened current-vs-target implementation wording so the document does not overclaim live maturity.

Exit Criteria:

- [x] `data-domain-owner.md` now contains a clearly labeled operational rules section and decision matrix.
- [x] The doc makes “scope creation != owner creation” and “surface ownership != data ownership” explicit rules.
- [x] The doc records current implementation status instead of implying all owner families are equally mature today.

### Phase 2 - Sync Dependent Architecture Docs

Status: completed
Targets: `docs/architecture/form-validation.md`, `docs/architecture/value-adaptation-and-detail-field.md`, `docs/architecture/table-row-identity-and-scope-performance.md`, `docs/architecture/scope-ownership-and-isolation.md`

- [x] Updated `form-validation.md` to tie `ValidationScopeRuntime` back to `Data Domain Owner` as the validation facet while preserving local precedence.
- [x] Updated `value-adaptation-and-detail-field.md` so `detail-field` / `detail-view` are described as staged child-domain baselines and inline composite editors remain parent-owned.
- [x] Updated `table-row-identity-and-scope-performance.md` so row scope and `rowKey` wording explicitly stays non-owner by default while preserving row-local staged-editor future direction.
- [x] Updated `scope-ownership-and-isolation.md` so own-scope creation, `data`, and `isolate` are explicitly framed as read/projection mechanics unless another rule upgrades the boundary into a `Data Domain Owner`.

Exit Criteria:

- [x] No conflicting statements remain across the five docs about whether scope creation, isolation, row materialization, or surface creation automatically imply owner creation.
- [x] `form-validation.md` and `value-adaptation-and-detail-field.md` use compatible language for staged child owners and parent-owned inline editors.
- [x] `table-row-identity-and-scope-performance.md` and `scope-ownership-and-isolation.md` agree that row scope is a performance/read carrier first, not a default data owner.

### Phase 3 - Evidence And Closure Handoff

Status: completed
Targets: `docs/logs/2026/04-22.md`, this plan file

- [x] Appended a top-of-file daily log entry describing the doc alignment work, key owner-rule decisions, and the live repo anchors used for verification.
- [x] Recorded closure-audit evidence from an independent reviewer / fresh sub-agent pass.
- [x] Closed the plan only after that independent audit confirmed no remaining plan-owned drift.

Exit Criteria:

- [x] `docs/logs/2026/04-22.md` contains a dated entry linking the updated docs and the live code/doc anchors used for re-audit.
- [x] The plan closure section contains independent closure-audit evidence.
- [x] Any leftover drift outside this narrow doc slice is explicitly marked out of scope or assigned to follow-up.

## Validation Checklist

- [x] `docs/architecture/data-domain-owner.md` has an explicit operational owner-rules section for owner creation, nearest-owner fallback, canonical address, publish boundary, lifecycle, and child-owner writeback.
- [x] `docs/architecture/form-validation.md` remains locally authoritative for validation behavior while aligning validation ownership with the nearest `Data Domain Owner`.
- [x] `docs/architecture/value-adaptation-and-detail-field.md` clearly distinguishes staged child owners from parent-owned inline composite editors.
- [x] `docs/architecture/table-row-identity-and-scope-performance.md` explicitly states that `rowKey`, row scope reuse, and isolated row carriers do not by themselves create a row data owner.
- [x] `docs/architecture/scope-ownership-and-isolation.md` explicitly states that own scope creation, `data`, and `isolate` do not by themselves create a `Data Domain Owner`.
- [x] Cross-references among the updated docs point to a single owner-precedence baseline instead of duplicating competing definitions.
- [x] `docs/logs/2026/04-22.md` records the landing, key decisions, and code/doc evidence used for the re-audit.
- [x] Focused live-repo verification re-checks `packages/flux-core/src/types/runtime.ts`, `packages/flux-core/src/utils/path-binding.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-renderers-form-advanced/src/detail-view/`, and `packages/flux-renderers-data/src/table-renderer/`.
- [x] An independent closure audit is completed and recorded before `Plan Status` moves to `completed`.
- [x] No plan-owned code changes were required; workspace build/typecheck/lint/test commands are intentionally not closure gates for this docs-only plan.

## Closure

Status Note: Completed as a docs-only alignment slice. `data-domain-owner.md` now defines operational owner rules, the four directly dependent architecture docs use consistent owner/scope/surface language, the live repo anchors were re-audited, and no remaining plan-owned semantic drift was found.

Closure Audit Evidence:

- Reviewer / Agent: fresh independent sub-agents
- Evidence: `ses_24a13b2b5ffeJnuHJUM67M0XCn` reported no blocking findings after the overclaim fixes; `ses_24a13af37ffeR7NHyl9LQbyaLm` recommended closure after daily-log evidence, confirming the edited docs match live anchors in `packages/flux-core/src/types/runtime.ts`, `packages/flux-core/src/utils/path-binding.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-renderers-form-advanced/src/detail-view/`, and `packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts`.

Follow-up:

- Broader owner-doc routing cleanup, compiler-aware owner partitioning, and row-local staged-editor runtime convergence remain out of scope for this plan and should land in successor plans if needed.
- No remaining plan-owned work.
