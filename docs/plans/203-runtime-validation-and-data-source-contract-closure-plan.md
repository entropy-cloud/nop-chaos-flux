# 203 Runtime Validation And Data Source Contract Closure

> Plan Status: completed
> Last Reviewed: 2026-05-05
> Source: `docs/analysis/2026-05-05-deep-audit-full/06-async-safety.md`, `docs/analysis/2026-05-05-deep-audit-full/08-validation.md`, `docs/analysis/2026-05-05-deep-audit-full/19-error-propagation.md`, `docs/analysis/2026-05-05-deep-audit-full/summary.md`
> Related: `docs/plans/201-surface-family-runtime-convergence-plan.md`, `docs/plans/178-validation-owner-bootstrap-and-hidden-participation-plan.md`

## Purpose

收口 05-05 retained runtime-side defects：surface-root validation owner attach、non-form validation participation、report designer field-source async safety、form `initAction` fire-and-forget、安全/错误传播中的 runtime import cause 丢失与 request retry metadata 丢失，以及 data-source `retry/backoff` compile/runtime contract gap。

## Current Baseline

- `surface-root` validation owner 创建后仍缺少 compiled model attach，进入 active 生命周期时不满足 current validation baseline。
- non-form owner 的 validation 路径仍未完全闭合：`FieldFrame` / hooks 的 required/error presentation 仍偏 form-only，inherit-owner composite field 缺少 validation path rebasing，`code-editor` / `tag-list` 仍偏 FormRuntime-only。
- report designer 启动期 field source 会双加载，且 mount refresh 的 rejection 仍无统一收口。
- form `initAction` 仍是无 cancel / 无 catch 的 fire-and-forget effect。
- runtime-factory 的 preload/import prepare 错误仍会丢失原始 `cause/stack`。
- `ok:false` request failure 在重试耗尽后仍丢失 `attempts/failureCount`。
- data-source 顶层 `retry/backoff` 在 schema -> compiled -> runtime 传递链中丢失。

## Goals

- 让 surface-root validation owner 与 non-form owner validation participation 达到当前 owner baseline。
- 消除 report designer field source 启动期双加载和 fire-and-forget reject 漏洞。
- 让 data-source `retry/backoff` 在 compile/runtime 链路中完整传递，并有 focused verification。

## Non-Goals

- declarative surface family 的全量 runtime 收敛
- 全量 form renderer validation 统一重写
- 其它已降级 async observability / virtualization / naming 问题

## Scope

### In Scope

- `packages/flux-runtime/src/surface-runtime.ts`
- `packages/flux-react/src/schema-renderer.tsx`
- `packages/flux-runtime/src/form-runtime.ts`
- `packages/flux-react/src/field-frame.tsx`
- `packages/flux-react/src/hooks.ts`
- `packages/flux-renderers-form/src/field-utils/field-handlers.tsx`
- `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`
- `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`
- `packages/flux-renderers-form-advanced/src/tag-list.tsx`
- `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts`
- `packages/report-designer-core/src/core.ts`
- `packages/report-designer-core/src/runtime/field-sources.ts`
- `packages/report-designer-renderers/src/page-renderer.tsx`
- `packages/flux-renderers-form/src/renderers/form.tsx`
- `packages/flux-runtime/src/runtime-factory.ts`
- `packages/flux-runtime/src/async-data/request-runtime.ts`
- `packages/flux-action-core/src/action-dispatcher/action-execution.ts`
- `packages/flux-compiler/src/source-compiler.ts`
- `packages/flux-core/src/types/compilation.ts`
- `packages/flux-runtime/src/async-data/source-registry.ts`
- focused tests and owner docs for the above runtime behavior

### Out Of Scope

- plan 201 已承接的 declarative surface 全面收敛
- report field panel virtualization
- request failure observability 的其余降级项

## Execution Plan

### Phase 1 - Surface And Non-Form Validation Owner Closure

Status: completed
Targets: `packages/flux-runtime/src/surface-runtime.ts`, `packages/flux-react/src/schema-renderer.tsx`, composite-field files, `tag-list`, `code-editor` validation participation, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] `surface-root` validation owner 创建路径补齐 compiled model attach 与正确 lifecycle state。
- [x] [Fix] non-form owner 的 required/error presentation 不再只依赖 form-oriented field presentation 路径。
- [x] [Fix] inherit-owner composite field 在 non-form owner 下具备 validation path rebasing，而不仅是 value rebasing。
- [x] [Fix] `code-editor` / `tag-list` 在缺少 `currentForm` 时回退到 `ValidationScopeRuntime`，不再断开 blur/change/required 路径。
- [x] [Proof] focused tests：surface-root attach、non-form required/error presentation、nested non-form required、`code-editor` / `tag-list` 在 non-form owner 下的 validation lifecycle。

Exit Criteria:

- [x] `surface-root` owner 不再以 `compiledModel === null` 的 active 状态参与普通验证
- [x] retained non-form owner validation gaps 已闭合（包括 presentation、rebasing、renderer participation）
- [x] focused tests 覆盖 retained validation owner defects
- [x] `docs/architecture/form-validation.md` 与相关 references 已同步到 live baseline，或明确写 `No owner-doc update required`
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - Report Designer And Form Async Safety

Status: completed
Targets: `packages/report-designer-core/src/core.ts`, `packages/report-designer-core/src/runtime/field-sources.ts`, `packages/report-designer-renderers/src/page-renderer.tsx`, `packages/flux-renderers-form/src/renderers/form.tsx`, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] 启动期 field source 加载收敛为单一入口或 single-flight 流程，不再重复请求与 stale overwrite。
- [x] [Fix] mount refresh 的 fire-and-forget 路径补稳定 rejection 收口。
- [x] [Fix] form `initAction` 补 cancel / catch，不再以无治理 fire-and-forget effect 执行。
- [x] [Proof] focused tests：single-flight、stale result suppression、reject handling、`initAction` cancel/error handling。

Exit Criteria:

- [x] report designer field source 启动期不再双加载
- [x] provider reject 不再形成未处理 Promise 拒绝
- [x] form `initAction` 不再缺少 cancel/catch
- [x] focused tests 覆盖 retained async defects
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - Runtime Error Propagation And Retry Metadata Closure

Status: completed
Targets: `packages/flux-runtime/src/runtime-factory.ts`, `packages/flux-runtime/src/async-data/request-runtime.ts`, `packages/flux-action-core/src/action-dispatcher/action-execution.ts`, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] runtime-factory preload/import prepare 路径保留原始 `cause/stack`，不再把导入错误扁平化成 bare `Error`。
- [x] [Fix] `ok:false` request failure 在重试耗尽后保留 `attempts/failureCount` 元数据。
- [x] [Proof] focused tests：preload import error cause preservation、retry metadata preservation on `ok:false` failures。

Exit Criteria:

- [x] preload/import error cause preservation 已闭合
- [x] `ok:false` retry metadata loss 已修复
- [x] focused tests 覆盖 retained error-propagation defects
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 4 - Data Source Retry Contract Closure

Status: completed
Targets: `packages/flux-compiler/src/source-compiler.ts`, `packages/flux-core/src/types/compilation.ts`, `packages/flux-runtime/src/async-data/source-registry.ts`, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] schema 顶层 `retry/backoff` 经 compiled type 进入 runtime source execution。
- [x] [Proof] contract tests：schema -> compiled -> runtime executor 全链路拿到 `retry`。
- [x] [Decision] 若 `api-data-source` owner docs 需要补 current supported baseline，完成同步。

Exit Criteria:

- [x] data-source `retry/backoff` compile/runtime contract 已闭合
- [x] focused tests 覆盖 retained chain-loss defect
- [x] `docs/architecture/api-data-source.md` 已更新，或明确写 `No owner-doc update required`
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope confirmed contract drifts 已收敛
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响 owner docs 已同步到 live baseline，或明确写明 `No owner-doc update required`
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Declarative Surface Full Runtime Convergence

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本计划只收口 05-05 已 retained 的 validation/async/runtime contract defects；declarative surface 的全量架构收敛由 plan 201 持续承接。
- Successor Required: yes
- Successor Path: `docs/plans/201-surface-family-runtime-convergence-plan.md`

## Non-Blocking Follow-ups

- source-registry / reaction observability 的其余降级项可在 runtime observability successor 中处理。

## Closure

Status Note: Plan 203 in-scope runtime validation, async safety, error propagation, and data-source retry contract defects are closed in live code, focused proofs, owner docs, and full workspace verification. A fresh independent closure audit against the live repository found no remaining in-scope defect or contract drift, so this plan is complete.

Closure Audit Evidence:

- Reviewer / Agent: independent audit task `ses_209da0340ffeP56Z9YIhZgMrvo`
- Evidence: verified `surface-runtime` owner attach and lifecycle baseline in `packages/flux-runtime/src/surface-runtime.ts`, non-form validation participation in `packages/flux-react/src/field-frame.tsx`, fallback validation owners in `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts` and `packages/flux-renderers-form-advanced/src/tag-list.tsx`, retry/error propagation closure in `packages/flux-runtime/src/runtime-factory.ts`, `packages/flux-runtime/src/async-data/request-runtime.ts`, `packages/flux-compiler/src/source-compiler.ts`, and `packages/flux-runtime/src/async-data/source-registry.ts`; no blocking findings remained and full `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` passed.

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
