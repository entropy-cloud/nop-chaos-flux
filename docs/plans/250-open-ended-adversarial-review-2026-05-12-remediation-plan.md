# 250 Open-Ended Adversarial Review 2026-05-12 Remediation Plan

> Plan Status: planned
> Last Reviewed: 2026-05-12
> Source: `docs/analysis/2026-05-12-open-ended-adversarial-review-01/{round-01.md,round-02.md,round-03.md,round-04.md}`
> Related: `docs/plans/{223-reactive-and-async-follow-up-closure-plan.md,226-accessibility-follow-up-plan.md,230-renderer-slot-and-type-contract-cleanup-plan.md}`

## Purpose

收口 2026-05-12 开放式对抗性审查确认的 data renderer state bridge、table slot authoring contract、hidden-field policy canonical shape、以及 form advanced tree interaction defects。

完成态要求：所有 in-scope live defects 都有最小正确修复、focused regression proof、必要 owner-doc sync 或明确 `No owner-doc update required`，并通过 workspace `pnpm typecheck`、`pnpm build`、`pnpm lint`、`pnpm test` 与独立 closure audit。

## Current Baseline

- `round-01` 确认 CRUD 与 Table 对同一个 `sortStatePath` 使用两套 shape：CRUD 是 `{ field, order }`，Table 是 `{ column, direction }`；该问题曾在 `docs/plans/223-reactive-and-async-follow-up-closure-plan.md` 标记完成，但 live code 仍可复现，必须作为 reopened residual 修复，而不是继续依赖旧 closure note。
- `round-01` 还确认 Table select-all 绕过 `normalizeRowKey()`，只用 `row.id` 写 selection keys，导致自定义 `rowKey` 下 header select-all 与单行选择使用不同 key 空间。
- `round-02` 确认 table `cell` / `buttons` parameterized regions 的 runtime 稳定合同是 `$slot.record` / `$slot.index`，但 compiler tests 与 architecture docs 仍保留裸 `${record.*}` 示例，且 diagnostics 不提示裸参数名会从父 scope 读取。`docs/plans/230-renderer-slot-and-type-contract-cleanup-plan.md` 已关闭 broader slot cleanup，本计划只重开 live-revalidated table cell/buttons authoring drift，不重开 `230` 中已 adjudicated 的其它 slot families。
- `round-03` 确认 `hiddenFieldPolicy` authoring surface 接受字符串 `'validate'` / `'ignore'`，compiler test 甚至固化 `'validate-and-submit'` passthrough，但 runtime `HiddenFieldPolicy` 只实现 object shape `{ validateWhenHidden, clearValueWhenHidden }`。
- `round-04` 确认 `input-tree` 把 `readOnly` 交给 field controller 后没有进入 option-list disabled gate，read-only 字段仍可修改；tree option chevron 只阻止 click 冒泡，键盘 activation 可能同时触发父 `treeitem` selection。`docs/plans/230-renderer-slot-and-type-contract-cleanup-plan.md` 已关闭 earlier readOnly propagation set，`docs/plans/226-accessibility-follow-up-plan.md` 已关闭 retained tree keyboard baseline；本计划只重开这两个 live-revalidated residuals，因为它们分别位于 `input-tree` option-list gate 和 nested chevron keydown isolation，未被旧 closure evidence 覆盖。

## Goals

- 统一 CRUD/Table scope-backed sort state 的 canonical shape，并确保 `$crud.sort`、table header UI、table data sorting、status/query publication 读取同一语义。
- 让 Table select-all 与单行 selection 复用同一 `rowKey` normalization path。
- 关闭 table parameterized slot authoring drift：作者文档、compiler tests、diagnostics、runtime `$slot` semantics 一致。
- 收敛 `hiddenFieldPolicy` 到 runtime canonical object shape，删除无 owner 的字符串 passthrough 或明确 lowering 字符串 sugar。
- 修复 tree controls read-only 与 keyboard event isolation，使 read-only 字段不可写，keyboard expand/collapse 不误触 selection。

## Non-Goals

- 不重开 broader CRUD implementation、server pagination、data source、or table virtualization work。
- 不把所有 renderer slot 或 all bare identifier diagnostics 纳入本计划；本计划只处理 table cell/buttons parameterized slots 与直接文档/test drift。
- 不重新设计 hidden-field submit semantics；`submitWhenHidden` 不在本计划内，已由历史审查单独记录。
- 不把 tree controls 升级为完整 APG tree rewrite；只修复本次确认的 read-only write leak 与 keyboard bubbling defect。
- 不接管 designer snapshot/host projection、surface/import lifecycle、action targeting 等近期已由其它计划或审查 owning 的问题。

## Scope

### In Scope

- `packages/flux-renderers-data/src/{crud-renderer.tsx,crud-renderer-state.ts,table-renderer.tsx,table-renderer/*}`
- `packages/flux-renderers-data/src/__tests__/*` focused CRUD/Table sort and selection tests
- `packages/flux-compiler/src/schema-compiler/{tables.ts,node-compiler.ts}` and directly related symbol diagnostics tests if needed
- `packages/flux-formula/src/compile/symbol-diagnostics.ts` only for table-parameter warning support if chosen
- `packages/flux-compiler/src/{schema-compiler-table.test.ts,schema-compiler-registry-features.test.ts}`
- `packages/flux-renderers-form/src/renderers/form-definition.ts`, `packages/flux-renderers-form/src/schemas.ts`, `packages/flux-core/src/{types/validation.ts,validation-model.ts}`
- `packages/flux-compiler/src/{schema-compiler/node-compiler.ts,schema-compiler/validation-collection.ts,validation-collection.test.ts}`
- `packages/flux-runtime/src/__tests__/hidden-field-policy.test.ts` and form renderer hidden-field tests as needed
- `packages/flux-renderers-form-advanced/src/{tree-controls.tsx,tree-control-controllers.ts}` and focused tests
- Owner docs likely affected: `docs/architecture/{table-row-identity-and-scope-performance.md,form-validation.md,field-binding-and-renderer-contract.md,renderer-runtime.md}` and relevant component docs if they contain impacted examples
- `docs/logs/2026/05-12.md`; `docs/logs/index.md` is read-only guidance unless the daily-log index itself needs a maintenance update

### Out Of Scope

- Existing unrelated worktree changes outside this plan.
- Historical bugs already fixed by `docs/plans/223`, except the live-revalidated CRUD/Table sort shape reopened residual.
- `expandedRow` parameter metadata issue already recorded in `docs/analysis/2026-05-08-deep-audit-full/09-renderer-contract.md`, unless a touched test proves direct coupling to this plan's table slot diagnostics.
- Global formula language strict mode for all unknown bare identifiers.
- General accessibility cleanup beyond the two tree-control defects.

## Execution Plan

### Phase 1 - Repair Data Renderer State Bridges

Status: planned
Targets: `packages/flux-renderers-data/src/{crud-renderer.tsx,crud-renderer-state.ts,table-renderer.tsx,table-renderer/*}`, data renderer tests

- Item Types: `Fix | Proof | Decision`

- [ ] [Decision] Audit current docs, tests, and example usages of `$crud.sort`, `sortStatePath`, `sort.field`, `sort.order`, `sort.column`, and `sort.direction` before choosing the canonical scope-backed sort shape for CRUD-owned Table integration.
- [ ] [Decision] Choose and document the canonical scope-backed sort shape. Preferred direction: normalize the shared `sortStatePath` to the Table shape `{ column, direction }`, while either preserving `{ field, order }` as a derived public `$crud.sort` compatibility projection or recording an explicit public contract change with owner-doc updates and focused tests.
- [ ] [Fix] Make CRUD initialization, table scope sort read/write, `$crud.sort` status/query publication, and `onSortChange` payload consume one canonical sort model without lossy conversion.
- [ ] [Fix] Route Table select-all through the same normalized row entries or `normalizeRowKey()` path as row rendering and single-row selection, including custom `rowKey`, nested rowKey, `__rowKey`, `id`, and legacy index fallback.
- [ ] [Proof] Add focused tests covering CRUD initial sort, header sort click, `$crud.sort` publication, and custom `rowKey` select-all behavior.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] CRUD/Table sort no longer reads and writes incompatible shapes at the same `sortStatePath`.
- [ ] Table select-all and single-row selection produce the same key space for custom `rowKey` and fallback row identity.
- [ ] Focused tests fail on the pre-fix behavior and pass on the final behavior.
- [ ] Affected owner docs are updated if the public sort/selection shape baseline changes; otherwise `No owner-doc update required` is explicitly recorded.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Close Table Slot Authoring Contract Drift

Status: planned
Targets: `packages/flux-compiler/src/**`, `packages/flux-formula/src/compile/symbol-diagnostics.ts`, table docs/examples/tests

- Item Types: `Fix | Proof | Decision`

- [ ] [Decision] Freeze table cell/buttons parameterized region authoring baseline as `$slot.record` / `$slot.index`; naked `record` / `index` inside those regions is not a supported parameter access path unless an explicit legacy mode is introduced.
- [ ] [Fix] Update compiler tests and examples that currently use `${record.*}` in table cell/buttons to `$slot.record.*`, including `packages/flux-compiler/src/schema-compiler-table.test.ts` and `schema-compiler-registry-features.test.ts`.
- [ ] [Fix] Add a focused diagnostic or migration warning for naked table slot param names in parameterized regions, scoped narrowly enough not to reject ordinary parent-scope variables outside table cell/buttons.
- [ ] [Fix] Sync architecture/component docs that still present naked row-local examples for the table cell/buttons authoring path.
- [ ] [Proof] Add compiler diagnostics tests proving naked `record` in table cell/buttons is warned/rejected according to the chosen severity, while `$slot.record` is accepted.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] Table cell/buttons docs and tests no longer teach naked `${record.*}` for parameterized slots.
- [ ] Diagnostics provide an actionable signal when a schema uses naked table slot parameter names in the affected parameterized regions.
- [ ] `$slot.record` / `$slot.index` remains the stable runtime and authoring baseline.
- [ ] `docs/architecture/table-row-identity-and-scope-performance.md` and any relevant renderer/slot docs are synced to the final baseline.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Canonicalize Hidden Field Policy Shape

Status: planned
Targets: form renderer definitions, compiler validation collection, core validation model, hidden-field tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] [Decision] Choose the supported authoring surface for `hiddenFieldPolicy`. Preferred direction: keep object shape as canonical and either remove string literals from renderer contracts or lower only explicitly supported strings (`'validate'`, `'ignore'`) into object policies at compile time.
- [ ] [Fix] Delete the unowned `'validate-and-submit'` passthrough test expectation and replace it with tests for the chosen canonical behavior.
- [ ] [Fix] Ensure form-level and field-level hidden policies entering `CompiledFormValidationModel` are runtime-compatible `HiddenFieldPolicy` objects, not arbitrary strings.
- [ ] [Fix] Update renderer definition/schema typing/docs so author-facing contract matches runtime semantics.
- [ ] [Proof] Add focused runtime/compiler tests proving accepted string sugar, if retained, actually changes `validateWhenHidden` / `clearValueWhenHidden` behavior; unsupported strings must produce diagnostics or validation failure, not silent default behavior.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] No accepted `hiddenFieldPolicy` authoring shape silently degrades to default object behavior.
- [ ] `CompiledFormValidationModel.defaultHiddenFieldPolicy` and field `hiddenFieldPolicy` values are runtime-compatible canonical objects.
- [ ] Focused tests cover form-level and field-level hidden policy behavior, including at least one hidden required field case.
- [ ] `docs/architecture/form-validation.md` and references are updated if the public hidden policy contract changes; otherwise `No owner-doc update required` is explicitly recorded.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 4 - Repair Tree Control ReadOnly And Keyboard Isolation

Status: planned
Targets: `packages/flux-renderers-form-advanced/src/{tree-controls.tsx,tree-control-controllers.ts}`, focused tests

- Item Types: `Fix | Proof | Decision`

- [ ] [Fix] Include `presentation.readOnly` in `input-tree` option interaction gating so read-only tree items cannot change field value by mouse or keyboard.
- [ ] [Fix] Prevent chevron keyboard activation from bubbling into parent `treeitem` selection while preserving expand/collapse behavior and accessible names.
- [ ] [Proof] Add focused tests proving `input-tree readOnly` blocks value changes and chevron keyboard activation expands/collapses without selecting/toggling the option.
- [ ] [Decision] Record whether owner-doc updates are required; expected default is `No owner-doc update required` because this restores existing read-only/keyboard equivalence contracts.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] `input-tree` read-only behavior matches the field interaction contract and no longer mutates form state.
- [ ] Tree chevron mouse and keyboard paths are equivalent: expand/collapse does not also select/toggle the option.
- [ ] Focused DOM tests cover both defects.
- [ ] Affected owner docs are updated if the stable component contract changes; otherwise `No owner-doc update required` is explicitly recorded.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 5 - Verification And Independent Closure Audit

Status: planned
Targets: affected packages, this plan, daily log, closure evidence

- Item Types: `Fix | Proof | Decision`

- [ ] [Proof] Run all focused tests added or modified by Phases 1-4.
- [ ] [Proof] Run workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all code/doc updates land.
- [ ] [Decision] Perform an independent closure audit with a fresh subagent, requiring it to re-read this plan, live code, focused tests, affected docs, and the original four analysis rounds.
- [ ] [Fix] Address any closure-audit blocker before marking this plan completed; if the audit identifies a truly out-of-scope residual, move it to `Deferred But Adjudicated` with a concrete non-blocking reason or successor plan.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] Focused verification for all four defect families has passed.
- [ ] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass after all in-scope remediation lands. If a pre-existing unrelated failure is discovered, this plan cannot be marked `completed` until the failure is fixed or this plan is explicitly revised with non-conflicting closure gates and concrete successor ownership.
- [ ] Independent closure audit confirms there is no remaining plan-owned blocker, no interface-vs-semantics mismatch, and no in-scope defect silently downgraded to follow-up.
- [ ] `docs/logs/` 对应日期条目已 updated with execution and closure evidence.

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [ ] CRUD/Table sort shape drift is fixed and test-covered.
- [ ] Table select-all rowKey drift is fixed and test-covered.
- [ ] Table cell/buttons slot authoring docs/tests/diagnostics align with `$slot.record` / `$slot.index` runtime semantics.
- [ ] `hiddenFieldPolicy` authoring contract and runtime canonical shape are aligned and test-covered.
- [ ] `input-tree` read-only and tree chevron keyboard interaction defects are fixed and test-covered.
- [ ] No in-scope confirmed live defect or public-contract drift is silently deferred or downgraded.
- [ ] Affected owner docs are synced to the live baseline, or each phase explicitly records `No owner-doc update required`.
- [ ] Independent closure audit confirms no remaining in-scope blocker.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

None currently. Any retained residual must be recorded here before closure; no in-scope confirmed defect may be moved to follow-up without explicit adjudication.

## Non-Blocking Follow-ups

- Broader unknown bare identifier diagnostics across the whole formula language remain out of scope unless Phase 2 proves they are necessary for table slot closure. Why Not Blocking Closure: the confirmed live defect is limited to table cell/buttons parameterized slot params being taught and accepted without `$slot`; global formula strictness is a separate language-policy decision.
- Full APG-level tree keyboard navigation remains out of scope unless Phase 4 uncovers that the minimal bubbling/read-only repairs cannot be made safely without it. Why Not Blocking Closure: the confirmed live defects are read-only write leakage and chevron keydown bubbling, not a full tree navigation contract rewrite.

## Closure

Status Note: Not started. This plan is newly drafted and must not be marked completed until all phases, closure gates, workspace verification, and independent closure audit are complete.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- pending execution
