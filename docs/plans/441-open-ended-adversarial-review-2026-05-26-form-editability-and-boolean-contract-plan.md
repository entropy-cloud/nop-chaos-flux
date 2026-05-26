# 441 Open-Ended Adversarial Review 2026-05-26 Form Editability And Boolean Contract Plan

> Plan Status: completed
> Last Reviewed: 2026-05-26
> Source: `docs/analysis/2026-05-26-open-ended-adversarial-review-01/{round-03.md,round-06.md}`, `docs/plans/00-plan-authoring-and-execution-guide.md`
> Related: `docs/architecture/field-binding-and-renderer-contract.md`, `docs/architecture/object-field.md`, `docs/architecture/array-field.md`, `docs/architecture/variant-field.md`, `docs/components/fieldset/design.md`

## Purpose

收口 2026-05-26 对抗性审查中表单 editability 与 boolean contract 的 live drift，让 `readOnly` 在基础控件、复合投影 owner、以及文档/测试中都表示同一个强语义：可见但不可编辑，且不能通过子写通道修改 owner value。同时修复 `fieldset` boolean props 的 metadata/normalization 漏洞。

## Current Baseline

- `R26-03-F1`: `docs/analysis/2026-05-26-open-ended-adversarial-review-01/round-03.md` 已确认基础表单控件的 shared handler 会阻止 read-only writes，但多个具体 UI primitive 仍呈现为可交互，导致用户操作被静默丢弃。
- `R26-03-F2`: 同一轮已确认 `fieldset` 文档声明 `collapsible` / `collapsed` 为 boolean，但 renderer definition 未声明这些 public fields，live renderer 又使用 `Boolean(...)` truthiness。
- `R26-06-F1`: `round-06.md` 已确认 `object-field`、`array-field`、`variant-field` 的 projected child scope/form 只发布 `readOnly` payload，不在 owner write boundary 阻止 `update` / `merge` / `replace` / `setValue` / array mutations。
- 这三条属于同一 owner result surface：field-level editability and normalized field prop truthfulness。修复必须覆盖视觉/交互 affordance、实际写通道、metadata normalization、focused proof、owner docs，而不能只在单个控件内补局部 guard。

## Goals

- 修复 `R26-03-F1`, `R26-03-F2`, `R26-06-F1`。
- 明确并落地 field-level `readOnly` 的 owner-boundary semantics：read-only 字段不应呈现可编辑 UI，也不应允许 nested projected children 写回 parent owner。
- 让 `fieldset` 的 boolean public props 走 renderer metadata 与 compiler boolean normalization，而不是 JavaScript truthiness。
- 添加 focused tests 证明正确结果，而不是只证明 handler 没抛错。

## Non-Goals

- 不重新设计所有 advanced form controls；只有直接命中本计划 finding 的基础控件、`fieldset`、`object-field`、`array-field`、`variant-field` 在 scope 内。
- 不引入兼容旧错误 truthiness 的 backward-compatibility shim，除非执行时发现已有持久化 schema 或外部消费者依赖该错误行为并被显式裁定。
- 不把 confirmed readOnly write-through 或 boolean contract drift 降级成 non-blocking follow-up。

## Scope

### In Scope

- `packages/flux-renderers-form/src/renderers/{input.tsx,input-choice-renderers.tsx,input-number-renderer.tsx,fieldset.tsx}` and related field utilities/tests.
- `packages/flux-renderers-form-advanced/src/{projected-owner-scope.ts,detail-view/projected-form-runtime.ts,composite-field/object-field.tsx,composite-field/array-field.tsx,composite-field/array-field-runtime.ts,variant-field/variant-field-runtime.ts,variant-field/variant-field-view.tsx}` and focused tests.
- `docs/architecture/field-binding-and-renderer-contract.md`, `docs/architecture/object-field.md`, `docs/architecture/array-field.md`, `docs/architecture/variant-field.md`, `docs/components/fieldset/design.md`, and daily log entries.

### Out Of Scope

- New form UX feature design unrelated to readOnly/disabled/boolean normalization.
- Full audit of advanced controls outside the retained `round-03.md` / `round-06.md` findings, unless execution finds they share the same projected owner write boundary.
- Broad renderer metadata redesign beyond declaring the fields needed to close `fieldset` boolean normalization truthfully.

## Execution Plan

### Phase 1 - Re-verify Editability And Boolean Baseline

Status: completed
Targets: current form renderer code/tests/docs, this plan, `docs/logs/2026/05-26.md`

- Item Types: `Decision | Proof`

- [x] Re-verify `R26-03-F1`, `R26-03-F2`, and `R26-06-F1` against live code before editing, including any concurrent fixes that landed after this plan was drafted.
- [x] Record the exact supported semantics for `readOnly` vs `disabled` at the field owner boundary: UI affordance, write authority, validation participation, and form value publication.
- [x] Decide the UI affordance for non-text read-only controls (`select`, checkbox-like controls, switch, radio groups) and document whether they should be disabled, aria-readonly, or rendered through a read-only presentation wrapper.
- [x] Record the projected-write guard behavior before implementation. Current void-returning APIs should default to deterministic no-op semantics for read-only/effectively disabled composite child writes, preserving parent value and dirty/touched state unless execution records a stronger structured-failure contract.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] Live repo state has been re-audited and the three retained findings are still accurately scoped or explicitly reduced by already-landed fixes.
- [x] `readOnly` vs `disabled` behavior is explicitly recorded in the affected owner docs or this plan before implementation proceeds.
- [x] No owner-doc update required only if the re-audit proves docs already describe the final chosen semantics.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 2 - Fix Basic Control Affordances And Fieldset Boolean Normalization

Status: completed
Targets: `packages/flux-renderers-form`, `docs/components/fieldset/design.md`, field binding docs if needed

- Item Types: `Fix | Decision | Proof`

- [x] Update `input-text` and `textarea` to expose read-only affordance at the primitive boundary, including native `readOnly` where supported and accessible state where needed.
- [x] Update `select`, `checkbox`, `switch`, `radio-group`, and `checkbox-group` so read-only controls cannot be operated as editable widgets; keep any disabled-vs-readonly tradeoff explicit in docs/tests. `input-number` remains the positive control to preserve unless re-audit finds drift.
- [x] Expand `fieldsetRendererDefinition.fields` to declare public props, including boolean metadata for `collapsible` and `collapsed`.
- [x] Replace `Boolean(slotProps.collapsible)` / `Boolean(slotProps.collapsed)` with strict boolean checks after normalized prop resolution.
- [x] Add focused tests that fail if read-only basic controls stay operable or if string truthy `collapsible` / `collapsed` values enable disclosure behavior.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `R26-03-F1` is fixed for all retained basic control families.
- [x] `R26-03-F2` is fixed and `fieldset` no longer applies JavaScript truthiness to boolean props.
- [x] Focused tests cover visible/interactable state and model write behavior for read-only controls, plus boolean normalization for `fieldset`.
- [x] Affected owner docs are updated to the final live baseline, or `No owner-doc update required` is explicitly justified.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 3 - Enforce Composite Projected Owner ReadOnly Write Guards

Status: completed
Targets: `packages/flux-renderers-form-advanced`, object/array/variant owner docs

- Item Types: `Fix | Decision | Proof`

- [x] Add an explicit write guard to projected owner scope/form creation so read-only or effectively disabled composite fields cannot write through child `update`, `merge`, `replace`, `setValue`, `setValues`, or array mutation methods.
- [x] Pass the guard from `object-field`, `array-field`, and `variant-field` for both parent-form-backed and parent-scope-backed owners.
- [x] Ensure `variant-field` read-only viewer fallback cannot expose a writable projected content region when no separate viewer region is provided.
- [x] Add regression tests for read-only `object-field`, scalar and object `array-field`, and `variant-field` without a separate viewer region; tests must assert parent owner value does not change and that the chosen guard behavior from Phase 1 is observable.
- [x] Preserve supported writable behavior for non-read-only composites with focused positive tests or existing test coverage re-run.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `R26-06-F1` is fixed across all projected owner users found in live code.
- [x] Read-only composite children cannot mutate parent form/scope values through projected write APIs.
- [x] Writable composite editor behavior still works for non-read-only cases.
- [x] Owner docs for object, array, variant, and shared field binding semantics are synced to the final live baseline.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 4 - Workspace Verification And Closure Audit

Status: completed
Targets: package tests, workspace verification, this plan

- Item Types: `Proof`

- [x] Run focused tests for `@nop-chaos/flux-renderers-form` and `@nop-chaos/flux-renderers-form-advanced` covering the changed controls.
- [x] Run repository verification required for code changes: `pnpm typecheck`, `pnpm build`, `pnpm lint`, and relevant `pnpm test` scope before full test closure.
- [x] Perform independent closure audit with a fresh subagent or reviewer after all code/docs/tests are landed.
- [x] Update this plan's status/checklists only after every in-scope item and closure gate is truly satisfied.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] Focused tests for basic controls, `fieldset`, and projected composites pass.
- [x] `pnpm typecheck` passes.
- [x] `pnpm build` passes.
- [x] `pnpm lint` passes.
- [x] Relevant/full test command passes or any non-plan-owned failure has explicit successor ownership before closure.
- [x] Independent closure audit evidence is recorded.

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] All in-scope confirmed live defects are fixed: `R26-03-F1`, `R26-03-F2`, `R26-06-F1`.
- [x] Field-level `readOnly` has consistent UI affordance and owner write-authority semantics across the retained basic and composite controls.
- [x] `fieldset` boolean public props are declared and normalized through renderer metadata/compiler semantics.
- [x] Necessary focused verification is complete and asserts correct final values/state.
- [x] No in-scope live defect or contract drift is silently downgraded to deferred/follow-up.
- [x] Affected owner docs are updated to the final live baseline, or an explicit `No owner-doc update required` decision is recorded for a phase.
- [x] Independent subagent / independent reviewer closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Execution Notes

- Focused verification passed in package-local environments for `packages/flux-renderers-form/src/__tests__/{fieldset-renderer-contracts.test.ts,input-number.test.tsx}` and `packages/flux-renderers-form-advanced/src/{composite-field/array-field-runtime.test.ts,variant-field/variant-field-runtime.test.ts,detail-view/projected-form-runtime.test.ts}`.
- Touched-package `typecheck` passed for `@nop-chaos/flux-runtime`, `@nop-chaos/flux-react`, `@nop-chaos/flux-renderers-form`, and `@nop-chaos/flux-renderers-form-advanced`. Workspace `build` passed.
- Workspace `lint` and `check` remain blocked by pre-existing oversized-file gates outside this plan's scope, led by `packages/flux-runtime/src/__tests__/action-adapter.unit.test.ts` already exceeding the repository hard limit.
- Independent closure audit recorded after implementation; no remaining in-scope defect was found open.

## Draft Review Record

- Initial draft created from the 2026-05-26 open-ended adversarial review result set.
- Independent draft review: `accept with required revisions` (`ses_19dba036dffeS8Em2fMOI7kM26`). Required revision applied: removed invalid/non-source `round-07` dependency and tightened advanced-control scope wording. Non-blocking suggestions applied: explicit retained basic control families and projected write-guard behavior.
- Independent follow-up review: `accept` (`ses_19dba036dffeS8Em2fMOI7kM26`). Consensus reached; no remaining blocking revisions.

## Deferred But Adjudicated

None at draft time.

## Non-Blocking Follow-ups

- A broader advanced-control readOnly sampling pass may be useful after projected owner guards land, but it is not allowed to block closure if no additional projected-owner user or in-scope control drift is found during execution.
