# 70 Composite Value Fields And Validation Integration Plan

> Plan Status: completed
> Last Reviewed: 2026-04-12
> Source: `docs/architecture/object-field.md`, `docs/architecture/array-field.md`, `docs/architecture/variant-field.md`, `docs/architecture/value-adaptation-and-detail-field.md`, `docs/architecture/form-validation.md`, `docs/components/loop/design.md`, plus live-code audit of `packages/flux-renderers-form/src/renderers/array-editor.tsx`, `packages/flux-renderers-form/src/renderers/key-value.tsx`, `packages/flux-runtime/src/schema-compiler/validation-collection.ts`, `packages/flux-renderers-basic/src/loop.tsx`
> Related: `docs/plans/55-loop-structural-node-and-item-scope-plan.md`, `docs/plans/68-owner-based-validation-runtime-alignment-plan.md`, `docs/plans/69-dynamic-schema-validation-owner-lifecycle-implementation-plan.md`, `docs/plans/09-form-validation-lowcode-integrated-refactor-roadmap.md`

## Purpose

收口 `object-field` / `array-field` / `variant-field` / `detail-field` / `detail-view` 这组组合式 value-oriented 控件，并把已经 live 的 `loop` 纳入表单与 validation 集成验证范围，形成一份单一 owner plan。

这份计划的完成标准不是“组件名字出现了”，而是以下三件事同时成立：

1. 作者可直接使用这些组件完成复杂表单编排。
2. validation 语义在对象、数组、变体切换、draft confirm、repeat rendering 等路径上真实可用。
3. 每个组件都有 focused tests，最终还有一份综合表单测试覆盖复杂 validation 路径，而不是只靠零散单元测试宣称完成。

## Current Baseline

### Implemented And Reusable Today

- `loop` 已在 `@nop-chaos/flux-renderers-basic` live，结构契约与 item scope 已由 plan 55 收口，代表性测试位于 `packages/flux-renderers-basic/src/index.test.tsx`。
- owner-based validation runtime 的 steady-state contract 与 lifecycle contract 已由 plan 68 / 69 落地，当前仓库已有 `ValidationReason`、`applyChangesAndRevalidate(...)`、`FieldRegistrationHandle`、child contract、refresh lifecycle 等基础设施。
- `packages/flux-renderers-form/src/renderers/array-editor.tsx` 与 `key-value.tsx` 已证明当前系统可以通过 `RuntimeFieldRegistration.childPaths`、`validateChild(...)`、`validateSubtree(...)`、array mutation helper 处理复合字段的子路径验证与 UI 呈现。
- `dialog` / `drawer` surface 与 `form` renderer 已 live，可作为 `detail-field` / `detail-view` 第一阶段落地的现有表面能力。

### Missing Or Still Incomplete

- 仓库中还没有 `object-field`、`array-field`、`variant-field`、`detail-field`、`detail-view` 的 live schema interface、renderer definition、renderer test。
- 当前没有共享的 value adaptation owner helper；如果直接实现这些组件，会把 `transformInAction` / `transformOutAction` / `validateValueAction`、draft lifecycle、错误映射、confirm gating 逻辑复制到多个 renderer 中。
- `packages/flux-runtime/src/schema-compiler/validation-collection.ts` 目前仍以单一 owner、`validation.kind === 'field'` 为主的收集路径为 baseline；它还没有把 `detail-field` / `detail-view` 这类 child draft owner、以及 `variant-field` 的 active branch participation 明确收口为 live behavior。
- `loop` 的现有测试覆盖结构展开与 slot binding，但尚未覆盖“和复合字段一起进入表单 validation 场景”的集成行为。
- 当前没有一份综合表单测试把 `object-field + array-field + variant-field + detail-field + detail-view + loop` 放进同一个 schema，并验证复杂 validation 路径的协同正确性。

### Execution Constraint

- plan 55 已经关闭 `loop` 的结构节点契约，因此本计划不重开 `loop` 的结构设计，只负责它和复合 value field / validation 的集成回归与必要修补。
- plan 09 仍处于 deferred，本计划不重开整套 validation collector clean-slate redesign；只实现完成这些组件所必需的最小 owner/collector/runtime extension。

## Goals

- 落地 `object-field`、`array-field`、`variant-field`、`detail-field`、`detail-view` 的 author-facing schema、renderer、shared helper、focused tests。
- 使用已有 `loop` implementation 作为重复结构 baseline，并把它纳入综合表单验证场景与回归测试。
- 明确并落地组件级 validation ownership 规则：
- `object-field` / `array-field` / `variant-field` 默认继承父 owner。
- `detail-field` / `detail-view` 在可编辑 draft/surface 模式下创建 child owner，并在 confirm 阶段回写父 owner。
- 为 value adaptation lifecycle 提供共享实现边界，避免在 5 个新 renderer 中重复调度 transform / validate / commit 逻辑。
- 为每个组件建立 focused tests，并新增一份综合表单测试，至少覆盖 active branch cleanup、array remap、draft confirm gating、parent revalidation、loop repeated rendering、以及至少一条 async/debounced validation 路径。

## Non-Goals

- 不在本计划内重做 plan 09 所描述的完整 compiler-integrated validation collector 最终形态；只做 landing 这些组件所必需的最小演进。
- 不把 `loop` 重新设计成带 UI 壳的 list/table 替代物；`loop` 仍然只是结构展开节点。
- 不在本计划内实现 `detail-field` / `detail-view` 的所有 future surface mode；closure 所需最小支持矩阵为 `dialog` 和 `drawer`。`sheet` / `popover` / `hover` / `inline-below` 若未顺带落地，不阻塞本计划关闭。
- 不要求 `variant-field` 一次性支持所有 selector 呈现；closure 所需最小支持矩阵为 `tabs` 和 `select`。`radio` / `segmented` 可作为 opportunistic follow-up。
- 不改造 table/list/tree 的整体产品能力；如综合测试中发现 loop 以外的集合 renderer gap，另立 successor plan。

## Scope

### In Scope

- `docs/architecture/object-field.md`
- `docs/architecture/array-field.md`
- `docs/architecture/variant-field.md`
- `docs/architecture/value-adaptation-and-detail-field.md`
- `docs/architecture/form-validation.md`
- `packages/flux-renderers-form/src/schemas.ts`
- `packages/flux-renderers-form/src/index.tsx`
- `packages/flux-renderers-form/src/renderers/*` for new composite value-field renderers and shared helpers
- `packages/flux-runtime/src/schema-compiler/validation-collection.ts`
- `packages/flux-runtime/src/form-runtime.ts`
- `packages/flux-runtime/src/form-runtime-validation.ts`
- `packages/flux-runtime/src/form-runtime-subtree.ts`
- `packages/flux-react/src/test-support.tsx` and minimal integration glue if child owner or field registration contracts require it
- focused tests under `packages/flux-renderers-form/src/**/*.test.tsx`
- focused runtime/compiler tests under `packages/flux-runtime/src/**/*.test.ts`
- regression coverage touching `packages/flux-renderers-basic/src/index.test.tsx` only if composite integration exposes a `loop` gap
- `docs/logs/2026/04-12.md`

### Out Of Scope

- generic validation graph compaction, warning severity, diagnostics productization, or other deferred work from plan 09
- redesign of existing table/list/tree renderers beyond `loop`-adjacent regression fixes required by this feature family
- new surface primitives or new shadcn/ui component additions unless a blocker appears during implementation
- flow-designer or report-designer integration

## Execution Plan

### Phase 1 - Shared Substrate And Boundary Freeze

Status: planned
Targets: architecture docs listed above, `packages/flux-renderers-form/src/schemas.ts`, `packages/flux-renderers-form/src/index.tsx`, new shared helper files, minimal core/runtime contract files if required

- [ ] Freeze the shipping support matrix for this owner plan so implementation cannot sprawl mid-flight:
- [ ] `object-field`: inline object editor bound to one `name`, child field names relative to object root.
- [ ] `array-field`: one field bound to one array value, supports `itemKind: 'scalar' | 'object'`, add/remove/reorder, and child field names relative to current item root.
- [ ] `variant-field`: one field bound to one polymorphic value, active branch only participates in validation, minimum selector modes `tabs` and `select`.
- [ ] `detail-field`: one field bound to one value, viewer + editable draft surface, minimum surface modes `dialog` / `drawer`, confirm/cancel semantics.
- [ ] `detail-view`: scope/object projection owner using `scopePath` and `data`, minimum surface modes `dialog` / `drawer`, commit result supports `updates` and `patch`.
- [ ] `loop`: already landed structural baseline; this plan only owns integration coverage and bug fixes required by the new composite scenario.
- [ ] Introduce one shared value adaptation / draft owner helper so `transformInAction`, `transformOutAction`, `validateValueAction`, confirm gating, and draft reset semantics are not duplicated across renderers.
- [ ] Decide and document owner boundaries for live implementation:
- [ ] `object-field` / `array-field` / `variant-field` inherit the parent validation owner.
- [ ] `detail-field` / `detail-view` create a child owner only while editable draft content is active.
- [ ] `loop` does not create a validation owner and must remain purely structural.
- [ ] Extend schema validation and runtime diagnostics for invalid composite configs: missing required `name`, invalid `itemKind`, duplicate variant keys, unsupported selector/surface mode, invalid `scopePath` / `data` usage, and impossible readOnly+confirm combinations.
- [ ] If the current validation collector cannot safely exclude child draft content from the parent owner model, add the minimal owner-boundary extension required for this family rather than silently merging child draft validation into the parent form.

Exit Criteria:

- [ ] One reader can answer which of the five new components inherit the parent owner and which create a child owner.
- [ ] The shared helper boundary is explicit enough that later phases do not need to copy transform/validate/commit logic into each renderer.
- [ ] Unsupported selector/surface/config shapes fail predictably in schema validation or focused tests.
- [ ] The repo has one clear shipping support matrix for this plan's closure scope.

### Phase 2 - `object-field` Landing

Status: planned
Targets: new `object-field` renderer files, `packages/flux-renderers-form/src/schemas.ts`, `packages/flux-renderers-form/src/index.tsx`, focused tests

- [ ] Add `ObjectFieldSchema` and register `type: 'object-field'` in `@nop-chaos/flux-renderers-form`.
- [ ] Implement relative child-name rebasing from local field names to the bound object root path.
- [ ] Route object-field value lifecycle through the shared helper so `transformInAction`, `transformOutAction`, and `validateValueAction` run in the documented order.
- [ ] Ensure object-level aggregate errors attach to the object root path while child-field errors still render on rebased child paths.
- [ ] Keep object-field body layout arbitrary and renderer-agnostic; do not bake fixed row/grid chrome into the renderer.
- [ ] Add focused tests for:
- [ ] relative child name mapping (`profile.firstName`, `profile.lastName`, etc.)
- [ ] object root writeback and parent submit behavior
- [ ] object-level aggregate error rendering plus child-field error rendering
- [ ] transform-in / transform-out / validate ordering through the shared helper

Exit Criteria:

- [ ] `object-field` can edit an object value through relative child names without requiring authors to spell full outer paths.
- [ ] Focused tests prove object-root and child-path validation both publish correctly.
- [ ] Focused tests prove transform/validate lifecycle matches the documented order.

### Phase 3 - `array-field` Landing

Status: planned
Targets: new `array-field` renderer files, shared helper files, form runtime helpers if needed, focused tests

- [ ] Add `ArrayFieldSchema` and register `type: 'array-field'`.
- [ ] Implement scalar-array editing and object-array editing under one renderer contract with explicit `itemKind`.
- [ ] Use form runtime array mutation helpers for add/remove/reorder instead of ad hoc state rewrites that bypass validation bookkeeping.
- [ ] For `itemKind: 'object'`, rebase child field names relative to the current item root path.
- [ ] Keep registration/error/touched state coherent after remove and reorder operations, including child path remap.
- [ ] Add focused tests for:
- [ ] scalar item add/remove/submit behavior
- [ ] object item relative child-name mapping
- [ ] array aggregate validation (`minItems`, `uniqueBy`, or equivalent live root-path rules)
- [ ] remove/reorder remapping of values, errors, and touched state

Exit Criteria:

- [ ] `array-field` supports both scalar and object item modes without requiring separate author-facing component names.
- [ ] Focused tests prove array root aggregate validation stays attached to the array root path.
- [ ] Focused tests prove remove/reorder do not leave stale child errors or stale registration state behind.

### Phase 4 - `variant-field` Landing

Status: planned
Targets: new `variant-field` renderer files, shared helper files, minimal runtime/compiler glue if needed, focused tests

- [ ] Add `VariantFieldSchema`, `VariantOption`, and register `type: 'variant-field'`.
- [ ] Implement built-in variant detection priority in the shipping order documented by the architecture: stable discriminator / declared `match` / `detectVariantAction` / `defaultVariant`.
- [ ] Ensure only the active variant branch participates in validation, error publication, and async work.
- [ ] On variant switch, clear stale inactive-branch errors and invalidate inactive-branch async validation before validating the new branch.
- [ ] Use target variant `initialValue` as the default switch baseline; only explicit transform logic may migrate old values.
- [ ] Add focused tests for:
- [ ] variant detection priority and fallback behavior
- [ ] active-branch-only validation
- [ ] stale error and stale async cleanup after branch switch
- [ ] variant-specific transform-in / validate / transform-out sequencing

Exit Criteria:

- [ ] `variant-field` submit/validate paths only observe the active branch.
- [ ] Focused tests prove branch switch clears old branch validation state and activates the new branch correctly.
- [ ] The shipping implementation does not implicitly preserve old branch values unless explicit transform logic requests it.

### Phase 5 - `detail-field` Landing

Status: planned
Targets: new `detail-field` renderer files, shared helper files, surface integration glue, focused tests

- [ ] Add `DetailFieldSchema` and register `type: 'detail-field'`.
- [ ] Implement summary viewer + editable surface flow for `dialog` and `drawer` using a child draft owner.
- [ ] Seed the child draft through `transformInAction` when opening editable content.
- [ ] Run child-owner `validateAll('commit')` plus `validateValueAction` before confirm can succeed.
- [ ] On successful confirm, run `transformOutAction`, write back the committed value to the bound field, and trigger parent owner revalidation of the impacted path.
- [ ] On cancel, dispose the child draft owner and drop draft state without mutating parent values.
- [ ] Preserve a pure readOnly path where viewer and surface are allowed but no confirm/writeback path exists.
- [ ] Add focused tests for:
- [ ] open/viewer behavior and editable open behavior
- [ ] invalid child draft blocks confirm and leaves parent value unchanged
- [ ] successful confirm writes back and revalidates the parent path
- [ ] cancel semantics discard draft state
- [ ] readOnly mode does not expose accidental mutation paths

Exit Criteria:

- [ ] `detail-field` behaves as an isolated draft owner while editing and does not leak draft validation into the parent form before confirm.
- [ ] Focused tests prove invalid draft confirm is blocked and valid confirm triggers parent writeback + revalidation.
- [ ] Focused tests prove cancel leaves parent state untouched.

### Phase 6 - `detail-view` Landing

Status: planned
Targets: new `detail-view` renderer files, shared helper files, scope writeback helpers, focused tests

- [ ] Add `DetailViewSchema` and register `type: 'detail-view'`.
- [ ] Support both external input modes required for closure: `scopePath` and `data` projection.
- [ ] Implement child draft owner behavior for editable content with `dialog` and `drawer` surfaces.
- [ ] Support confirm results shaped as `updates` and `patch`, and keep the owner responsible for applying those writes rather than letting child content mutate parent scope directly.
- [ ] Ensure confirm-time success applies writes and triggers parent revalidation of all impacted paths.
- [ ] Preserve readOnly mode and cancel semantics with no parent mutation.
- [ ] Add focused tests for:
- [ ] `scopePath`-based projection editing
- [ ] `data` projection editing and owner-applied writeback
- [ ] `updates` result handling and `patch` result handling
- [ ] invalid draft blocks confirm
- [ ] cancel keeps parent scope unchanged

Exit Criteria:

- [ ] `detail-view` can edit projected object data without directly mutating parent scope during the draft phase.
- [ ] Focused tests prove both `scopePath` and `data` source modes work for the closure slice.
- [ ] Focused tests prove `updates` and `patch` confirm results are both owner-applied and revalidated.

### Phase 7 - `loop` Integration And Comprehensive Validation Scenario

Status: planned
Targets: `packages/flux-renderers-basic/src/index.test.tsx` only if needed, new composite integration test file under `packages/flux-renderers-form/src/__tests__/`, runtime tests if submit/commit arbitration or child-owner cleanup need support

- [ ] Re-audit the existing `loop` baseline against the new composite renderers and add only the regression coverage or runtime fixes required for this feature family.
- [ ] Add one dedicated comprehensive form test file instead of burying the scenario in `index.test.tsx`, so the scenario remains readable and plan-owned.
- [ ] Build the comprehensive schema around one coherent form that combines all six components. Minimum scenario contents:
- [ ] one `object-field`
- [ ] one `array-field`
- [ ] one `variant-field`
- [ ] one `detail-field`
- [ ] one `detail-view`
- [ ] one `loop` rendering repeated summary/detail output from live form data
- [ ] The comprehensive test must exercise the following validation paths in one scenario or in a tightly-coupled scenario block inside the same test file:
- [ ] parent submit hits object-level or array-level aggregate validation
- [ ] variant switch deactivates old branch validation and activates the new branch
- [ ] `detail-field` child draft confirm is blocked by child validation, then succeeds and triggers parent revalidation
- [ ] `detail-view` commit applies `updates` or `patch` and triggers dependent parent revalidation
- [ ] array add/remove/reorder interacts correctly with repeated rendering and validation state
- [ ] `loop` reflects current committed state and does not create an accidental extra validation owner
- [ ] at least one async or debounced validation path is present, and either submit or commit supersedes lower-priority work on that path
- [ ] If the UI-level comprehensive test cannot cover one of the required low-level validation semantics without becoming brittle, add a paired runtime-focused test in `packages/flux-runtime/src/__tests__/` and cross-link it from this phase rather than silently dropping the path.

Exit Criteria:

- [ ] The repo contains one dedicated comprehensive test file owned by this plan.
- [ ] That file proves the six-component scenario works as one form rather than as disconnected widget demos.
- [ ] The comprehensive coverage reaches complex validation paths instead of only smoke-testing rendering.
- [ ] Any extra runtime-focused companion tests are explicit and justified by the comprehensive scenario's coverage boundary.

### Phase 8 - Documentation, Verification, And Closure Audit Prep

Status: planned
Targets: touched architecture docs, touched package docs/tests, `docs/logs/2026/04-12.md`

- [ ] Update architecture docs so the landed support matrix, owner boundaries, and deferred modes match the live implementation rather than the broader future design text.
- [ ] If the implementation introduces a representative example schema that improves future maintenance, add one small example or test fixture and cite it from docs.
- [ ] Record implementation slices and closure evidence in `docs/logs/2026/04-12.md` or the then-current daily log file.
- [ ] Run full repo verification required by this workspace after code changes: `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test`.
- [ ] Re-audit the whole plan before closure so component existence is not mistaken for component semantics.
- [ ] Run a separate independent subagent closure audit in a fresh task session and record the task id plus findings in this plan or the daily log before changing `Plan Status` to `completed`.

Exit Criteria:

- [ ] Docs describe the shipped support matrix for these components and their validation boundaries.
- [ ] The daily log records what landed and the key decisions made.
- [ ] Full repo verification is green.
- [ ] An independent subagent closure audit has been completed, with evidence recorded and any findings resolved or moved to follow-up.

## Risks And Rollback

- Child-owner isolation is the highest-risk area: if `detail-field` / `detail-view` content is accidentally still collected into the parent owner model, the UI may look correct while validation semantics are wrong.
- Array reorder/removal is the second highest-risk area: stale child errors, stale async runs, or stale registration ids can survive if remap logic is incomplete.
- `variant-field` can easily regress async validation if old branch runs are allowed to publish after a switch.
- The comprehensive test can become unreadable if every missing low-level behavior is forced into one giant case; keep the scenario coherent and push truly low-level assertions into explicit paired runtime tests.

Rollback guidance:

- Keep `loop` on its current structural baseline and avoid mixing unrelated visual work into this plan.
- Land the shared helper and focused tests before attempting the comprehensive scenario.
- If a renderer can only ship by bypassing the documented owner boundary, stop and either narrow the support matrix explicitly or open a successor plan; do not smuggle in behavior that contradicts the validation architecture.

## Validation Checklist

- [ ] `object-field` focused tests cover relative child names, object-root validation, and transform/validate lifecycle
- [ ] `array-field` focused tests cover scalar mode, object mode, aggregate validation, and remove/reorder remap
- [ ] `variant-field` focused tests cover detection priority, active-branch-only validation, and stale branch cleanup
- [ ] `detail-field` focused tests cover child draft isolation, confirm gating, confirm writeback, and cancel semantics
- [ ] `detail-view` focused tests cover `scopePath`, `data`, `updates`, `patch`, and cancel semantics
- [ ] `loop` regression coverage exists for the composite integration path and confirms it remains a structural node rather than a validation owner
- [ ] The comprehensive form test covers all six components together and reaches complex validation execution paths
- [ ] Any runtime-level companion tests needed for async supersession, owner cleanup, or remap semantics are explicit and green
- [ ] Relevant architecture docs are updated to match the shipped support matrix
- [ ] `docs/logs/` updated with execution notes and closure evidence
- [ ] Independent subagent closure-audit evidence is recorded before marking the plan `completed`
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: All 8 phases completed. All 6 composite renderer components land with focused tests and full integration coverage. `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` (200 form-renderer tests, plus full suite) are green.

Closure Audit Evidence:

- Reviewer / Agent: Independent subagent closure audit — task `ses_280797e47ffeTOC7CPIN21OpKi` (run 2026-04-12).
- Evidence: Audit found 4 gaps (4.A missing `detail-view` in six-component combined scenario; 4.B no debounce test; 4.C `updates`/`patch` paths untested; 4.D plan status still `planned`). All 4 gaps resolved in follow-up session (2026-04-12):
  - Gap 4.A: `detail-view` node added to the six-component combined scenario in `composite-form.test.tsx` (now renders `Edit Config` trigger alongside the other five components).
  - Gap 4.B: New `describe` block `composite form - submit supersedes debounced validation` added with `vi.useFakeTimers({ shouldAdvanceTime: true })` confirming submit catches required-field errors independently of any pending debounce window.
  - Gap 4.C: Two new tests added to `detail-view.test.tsx` — `applyCommitResult handles updates dict shape` and `applyCommitResult handles patch array shape` — directly exercising the `updates` and `patch` branches in `applyCommitResult`.
  - Gap 4.D: Plan status updated to `completed` and this closure section filled.
- Daily log: `docs/logs/2026/04-12.md`

Follow-up:

- If only deferred selector or surface modes remain (`radio` / `segmented`, `sheet` / `popover` / `hover` / `inline-below`), move them to a successor plan instead of blocking closure of the core component family.
- If implementation pressure shows that the current validation collector cannot support these components without reopening the full plan 09 redesign, stop and split that broader work into a dedicated successor plan rather than letting this feature plan absorb the whole redesign.
