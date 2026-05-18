# 279 Resolved Boolean Props Contract Plan

> Plan Status: completed
> Last Reviewed: 2026-05-14
> Source: `docs/architecture/renderer-runtime.md`, `docs/architecture/field-binding-and-renderer-contract.md`, `docs/architecture/flux-core.md`
> Related: `docs/plans/183-renderer-props-and-host-neutral-typing-convergence-plan.md`, `docs/plans/209-renderer-definition-fields-only-convergence-plan.md`, `docs/plans/272-compile-prop-value-validation-and-variant-convergence-plan.md`

## Purpose

收口 boolean-like schema 字段的 authoring/runtime 边界，使 renderer-facing `props.props` 成为可直接消费的最终结构。

## Current Baseline

- `BaseSchema` authoring 仍保留 boolean-like 字段的 `boolean | string` 表达式能力；`BoundFieldSchemaBase.readOnly` / `required` 现在也允许 expression string authoring，但 renderer-facing resolved props 已收口到 `boolean | undefined`。
- `RendererResolvedProps<S>` 已移除 `BaseSchema` 字符串索引签名污染，并显式保留 renderer-facing projected fields；runtime bag 仍允许额外注入值。
- `packages/flux-runtime/src/node-runtime.ts` 现在在 owner/runtime 层完成 boolean-like normalization 与 meta projection：`visible` / `hidden` / `when` 继续由 `NodeRenderer` 持有，`disabled` / `className` / `frameClassName` / `testid` / `cid` / `readOnly` / `required` 投影进 `props.props`。
- Concrete renderer consumers across `flux-renderers-form`, `flux-renderers-form-advanced`, `flux-renderers-data`, `flux-code-editor`, `report-designer-renderers`, and `flow-designer-renderers` now consume resolved boolean/meta props directly instead of renderer-side compatibility coercion.
- Focused regressions found during rollout are fixed: `useFieldHandlers()` no longer requires `RendererRuntime` outside `SchemaRenderer`, form-owned `onSubmitError` / `onValidateError` no longer trigger duplicate fallback notifications, and the earlier `silent: true` data-source notify regression no longer reproduces in `flux-renderers-data` focused reruns.
- The final closure pass also fixed two late verification blockers outside the original boolean contract mechanics but required for a clean green baseline: `packages/flux-renderers-form-advanced/tsconfig.build.json` now excludes `*.test-support.ts(x)` from declaration build input, and `packages/flux-react/src/node-renderer-resolved.tsx` now compares `resolvedProps.value` identity instead of the wrapper object identity so imported custom renderers that consume `props.props` refresh correctly after multi-field form writes.

## Goals

- Renderer-facing `props.props` 对 boolean-like 字段只暴露 `boolean | undefined`。
- Concrete renderer 对 boolean-like runtime props 直接传值，不写 `Boolean(...)`、`=== true`、`typeof string` 等兼容判断。
- Node-control meta 中需要 renderer 消费的字段投影进 `props.props`，例如 `disabled`、`className`、`testid`、`cid`。
- `visible`、`hidden`、`when` 仍由 `NodeRenderer` 使用，不作为普通 renderer prop 投影。
- validation 模式拒绝 `"true"`、`"false"`、`"!canUndo"` 等普通字符串 boolean 值，只接受 boolean literal 或 `${expr}`。
- `${expr}` 运行时结果如果不是 boolean，boolean-like 字段解析为 `undefined` 并可通过 host diagnostics 报告，不做 truthiness coercion。
- nested boolean-like fields 通过 renderer metadata 或 renderer-owned compile hook 明确声明并纳入 validation 与 runtime normalization。

## Non-Goals

- 不移除 schema authoring 层的表达式字符串能力。
- 不引入 `disabledExpr`、`visibleOn`、`readOnlyExpr` 等平行字段。
- 不在 renderer 中保留兼容旧数据的 boolean coercion 分支。
- 不重构全部 renderer prop typing；本计划只收口 boolean-like 字段和必要的 resolved prop typing。
- 不改变 `visible`、`hidden`、`when` 的挂载、生命周期、hidden-field participation 职责归属。

## Scope

### In Scope

- `packages/flux-core/src/types/schema.ts`
- `packages/flux-core/src/types/renderer-core.ts`
- `packages/flux-core/src/types/renderer-compiler.ts`
- `packages/flux-compiler/src/schema-compiler/`
- `packages/flux-runtime/src/node-runtime.ts`
- `packages/flux-react/src/node-renderer-resolved.tsx`
- Boolean-like consumer renderers in `packages/flux-renderers-basic/`, `packages/flux-renderers-form/`, `packages/flux-renderers-form-advanced/`, `packages/flux-code-editor/`, `packages/report-designer-renderers/`, `packages/flow-designer-renderers/`
- Focused tests covering validation rejection, runtime expression evaluation, meta projection, and renderer pass-through behavior

### Out Of Scope

- Full migration of every renderer to custom resolved props interfaces unrelated to boolean-like fields.
- Persisted schema migration for old invalid literal strings.
- UI redesign or styling changes.
- Reworking action `when` semantics beyond keeping boolean expression execution valid.

## Design Decisions

- Authoring schema type and runtime prop type are separate contracts.
- `RendererResolvedProps` should not blindly inherit `Partial<S>` for boolean-like fields that are expression-capable at authoring time.
- Runtime prop assembly should project renderer-facing meta first, then overlay compiled prop values, so explicit renderer props own same-name fields.
- Validation rejection of ordinary boolean strings is not backward compatibility optional; it is the supported contract.
- Renderer code is a consumer of the resolved contract, not a compatibility boundary.
- Field-like authoring types for `readOnly` and `required` should accept `boolean | string` expression inputs, while renderer runtime types remain `boolean | undefined`.
- Nested item booleans such as toolbar item `visible` are renderer-owned item props. They do not change the NodeRenderer-only ownership of node-level `visible` / `hidden` / `when`.

## Execution Plan

### Phase 1 - Contract Types And Runtime Assembly

Status: completed
Targets: `packages/flux-core/src/types/`, `packages/flux-runtime/src/node-runtime.ts`, `packages/flux-react/src/node-renderer-resolved.tsx`

- Item Types: `Fix | Decision | Proof`

- [x] Fix `RendererResolvedProps` or adjacent resolved-prop typing so boolean-like runtime fields are `boolean | undefined`, not inherited `string | boolean` from authoring schema.
- [x] Update authoring schema types for field-like `readOnly` and `required` to accept expression strings without leaking those strings into renderer runtime types.
- [x] Fix runtime prop assembly so renderer-facing `props.props` includes meta projection for `disabled`, `className`, `testid`, and `cid`.
- [x] Preserve `ResolvedNodeMeta` for `NodeRenderer` lifecycle/control responsibilities.
- [x] Ensure explicit compiled prop values override projected meta fields for same-name renderer-declared props.
- [x] Add type-level or focused runtime proof that `disabled: "${false}"` resolves to `props.props.disabled === false`, not a string.
- [x] Add focused runtime proof that a non-boolean expression result for a boolean-like field resolves to `undefined`, not a truthy/falsy coercion.

Exit Criteria:

- [x] Renderer-facing prop type no longer forces renderers to guard boolean-like expression fields as `string | boolean`.
- [x] Authoring types for `readOnly` and `required` allow expression strings where supported by renderer metadata.
- [x] `props.props.disabled` is available to ordinary renderers as the directly renderable value.
- [x] `visible` / `hidden` / `when` remain NodeRenderer-owned and are not ordinary renderer pass-through props.
- [x] Relevant architecture docs already reflect this final contract.
- [x] `docs/logs/2026/05-14.md` includes this contract update.

### Phase 2 - Field Metadata, Validation, And Compile Normalization

Status: completed
Targets: `packages/flux-core/src/types/schema.ts`, `packages/flux-compiler/src/schema-compiler/`, renderer definition files

- Item Types: `Fix | Proof`

- [x] Add `SchemaFieldRule.valueType: 'boolean'` or an equivalent explicit metadata contract for boolean-like prop normalization.
- [x] Define how nested boolean-like paths are represented: renderer-owned item booleans may be handled by renderer-owned field compile hooks plus matching schema validators when generic metadata cannot address nested item arrays.
- [x] Validate meta boolean-like authoring fields: boolean literal and `${expr}` accepted, ordinary string rejected.
- [x] Validate renderer prop boolean-like fields such as `readOnly`, `required`, nested `tabs.items.disabled`, Report Toolbar `visible/disabled/active`, and Flow Designer toolbar `disabled/active`.
- [x] Compile expression-bearing boolean-like props so runtime resolved values are boolean.
- [x] Normalize non-boolean expression results for boolean-like fields to `undefined` and, where the runtime has an env/host boundary, surface diagnostics without changing renderer behavior.
- [x] Reject invalid literal strings in validation without relying on renderer-side runtime fallbacks.

Exit Criteria:

- [x] `validateSchema` reports `invalid-property-value` for `disabled: "false"` and equivalent nested boolean-like literal strings.
- [x] `validateSchema` accepts `disabled: false`, `disabled: true`, and `disabled: "${expr}"`.
- [x] Nested toolbar/tabs boolean-like fields have focused validation coverage.
- [x] Compile/runtime normalization does not alter non-boolean ordinary string props.
- [x] Tests cover `${"false"}` or equivalent non-boolean expression result resolving to `undefined` for a boolean-like field.
- [x] `docs/logs/2026/05-14.md` includes validation and compiler contract notes.

### Phase 3 - Renderer Consumer Cleanup

Status: completed
Targets: affected renderer packages

- Item Types: `Fix | Proof`

- [x] Replace renderer-side `Boolean(props.props.xxx)` for boolean-like runtime props with direct prop pass-through.
- [x] Replace renderer-side `props.meta.disabled` for ordinary UI disabled attributes with `props.props.disabled`, except in NodeRenderer/frame/runtime plumbing.
- [x] Remove renderer-side ad hoc boolean expression evaluators in Report Toolbar and Flow Designer toolbar.
- [x] Keep renderer logic free of string checks for boolean-like props.
- [x] Audit existing draft code edits from this conversation and rewrite them to match the direct-pass-through contract.

Exit Criteria:

- [x] Grep finds no `Boolean(props.props.disabled/readOnly/required/active/visible/hidden/when)` style renderer consumers for boolean-like props.
- [x] Grep finds no `props.props.xxx === true` or `typeof props.props.xxx === 'string'` compatibility guards for boolean-like props in concrete renderers.
- [x] Grep finds no ordinary renderer UI-disabled consumers still using `props.meta.disabled` instead of `props.props.disabled`.
- [x] Grep finds no renderer-side `evalBooleanExpr` or equivalent ad hoc boolean expression evaluation.
- [x] Renderer code directly passes resolved boolean props into UI primitives where applicable.
- [x] Existing tests expecting valid `${expr}` boolean authoring still pass after direct-pass-through cleanup.
- [x] `docs/logs/2026/05-14.md` includes renderer cleanup notes.

### Phase 4 - Regression Coverage And Verification

Status: completed
Targets: compiler/runtime/react/renderer tests

- Item Types: `Proof | Fix`

- [x] Add compiler validation tests for top-level meta boolean fields and renderer prop boolean fields.
- [x] Add runtime/react tests proving `props.props.disabled`, `props.props.readOnly`, and nested boolean-like fields are booleans after expression evaluation.
- [x] Add toolbar/tabs focused tests for nested expression booleans and invalid literal string rejection.
- [x] Run package-focused tests first, then workspace verification.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and relevant tests per `AGENTS.md`.

Exit Criteria:

- [x] Focused compiler/runtime/renderer tests pass.
- [x] `pnpm typecheck` passes.
- [x] `pnpm build` passes.
- [x] `pnpm lint` passes.
- [x] Relevant tests pass, with any skipped full-suite item explicitly explained.

Verification note: plan-owned focused suites are green, including `@nop-chaos/flux-renderers-form`, `@nop-chaos/flux-renderers-data`, `@nop-chaos/flux-react`, and `@nop-chaos/flux-renderers-form-advanced`. Workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` now all pass; the final `pnpm test` rerun completed with Turbo reporting `49 successful, 49 total`.

### Phase 5 - Closure Audit

Status: completed
Targets: this plan, docs, code diff, verification output

- Item Types: `Proof | Decision`

- [x] Run an independent subagent closure audit after implementation and verification.
- [x] Resolve all blocking findings or move non-blocking findings into `Deferred But Adjudicated` with explicit classification.
- [x] Confirm no in-scope live defect or contract drift remains silently deferred.
- [x] Confirm plan checkboxes, phase statuses, closure gates, and daily log are consistent before marking completed.

Exit Criteria:

- [x] Independent closure audit finds no blocking issues.
- [x] Every in-scope item is completed or explicitly adjudicated.
- [x] Plan status remains no stronger than actual checklist state.
- [x] `docs/logs/2026/05-14.md` records closure evidence.

Closure evidence:

- Independent closure audit `ses_1d8f7b3cbffe4WoXwQ5qjUVg96` found no remaining code-level blockers after verification; it only required plan/log text to be updated to the live green baseline.
- Final workspace verification baseline: `pnpm typecheck` passed, `pnpm build` passed, `pnpm lint` passed, and `pnpm test` passed with Turbo reporting `49 successful, 49 total`.
- Final late-slice fixes recorded during closure: `packages/flux-renderers-form-advanced/tsconfig.build.json` excludes `*.test-support.ts(x)` from build inputs, and `packages/flux-react/src/node-renderer-resolved.tsx` now keys selector equality on `resolvedProps.value` so imported custom renderers consuming `props.props` refresh correctly after batched form writes.

## Plan Review Iterations

### Iteration 1

Status: completed

- [x] Independent reviewer checks architecture docs and this plan for contract clarity, missing scope, and contradictions.
- [x] Blocking findings are applied to docs or this plan.
- [x] Reviewer confirms whether another review iteration is required.

Findings resolved:

- Clarified non-boolean expression results for boolean-like fields: resolve to `undefined`, no truthiness coercion.
- Added final authoring type requirement for field-like `readOnly` and `required` expression strings.
- Clarified nested item boolean fields as renderer-owned item props.
- Replaced vague metadata wording with `SchemaFieldRule.valueType: 'boolean'` or equivalent explicit metadata contract.

### Iteration 2

Status: completed

- [x] Independent reviewer rechecked revised docs and plan.
- [x] Blocking findings are applied to docs or this plan.
- [x] Reviewer confirmed another iteration is required.

Findings resolved:

- Replaced stale `RendererResolvedProps<S> = Record<string, any> & Partial<S>` snippet with a runtime prop bag shape that includes projected node-control fields without inheriting authoring schema boolean strings.
- Updated the input walkthrough to consume `props.props.disabled` instead of `props.meta.disabled` for renderable UI state.
- Updated `BoundFieldSchemaBase` example to `readOnly?: boolean | string` and `required?: boolean | string`.
- Strengthened renderer cleanup grep criteria for `=== true`, `typeof string`, and stale `props.meta.disabled` UI consumers.

### Iteration 3

Status: completed

- [x] Independent reviewer rechecks revised docs and plan.
- [x] Blocking findings are applied to docs or this plan.
- [x] Reviewer confirms consensus or states remaining blockers.

Consensus status:

- Independent review found no blocking findings.
- Non-blocking suggestion applied by clarifying that the stale `RendererResolvedProps<S> = Record<string, any> & Partial<S>` statement is live code baseline tracking, not the target architecture contract.

### Additional Iterations

Status: planned if needed

- [ ] Continue independent review/revision until reviewers report no blocking plan or architecture issues.

## Closure Gates

- [x] Architecture docs describe the final boolean-like resolved props contract.
- [x] This plan has passed independent review consensus before implementation continues.
- [x] All in-scope confirmed contract drifts are fixed.
- [x] Renderer consumers rely on resolved props, not compatibility coercion.
- [x] Required validation/runtime regression coverage exists and passes.
- [x] No in-scope defect is moved to deferred/follow-up without explicit adjudication.
- [x] `docs/logs/2026/05-14.md` records design, plan, implementation, verification, and closure notes.
- [x] Independent closure audit completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] Relevant tests

## Deferred But Adjudicated

No deferred items yet.
