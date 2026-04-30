# 67 Field Participation And Hidden-State Behavior Implementation Plan

> Plan Status: completed
> Last Reviewed: 2026-04-11
> Source: `docs/architecture/form-validation.md`, `docs/logs/2026/04-10.md`, `c:/can/nop/amis-react19/packages/amis-core/src/store/formItem.ts`, `c:/can/nop/amis-react19/packages/amis-core/src/renderers/wrapControl.tsx`, `c:/can/nop/amis-react19/packages/amis/src/renderers/CRUD.tsx`
> Related: `docs/plans/03-form-validation-completion-plan.md`, `docs/plans/04-form-validation-improvement-execution-plan.md`, `docs/plans/09-form-validation-lowcode-integrated-refactor-roadmap.md`

## Purpose

把 field participation 的相关功能作为一个完整 feature 统一落地：定义 form 默认策略与字段局部覆盖，打通 hidden-field validation、hidden-state value clearing、shared field helper、renderer family adoption、以及 focused tests/docs，使 hidden-state behavior 不再停留在文档约定或零散实现。

## Current Baseline

- `docs/architecture/form-validation.md` 已记录当前推荐默认：hidden 字段保留值、参与提交、不参与校验、不自动清值。
- 文档已收敛为最小 schema 方向：`HiddenFieldPolicy` 只包含 `validateWhenHidden?: boolean` 与 `clearValueWhenHidden?: boolean`。
- 文档已明确推荐 ownership：form 提供默认策略，字段级 `name` 控件允许局部覆盖。
- 仓库已有 `hidden` / `visible` meta 求值与节点隐藏渲染分支，但还没有把 hidden-state behavior 贯穿到表单字段参与、shared field helper、renderer family 和测试基线。
- `amis-react19` 的参考基线是：hidden 默认不清值，`clearValueOnHidden` 是显式 opt-in；这证明 hidden-state clearing 应是明确策略，而不是可见性副作用。

## Goals

- 为 field participation 建立一套完整且一致的 hidden-state feature：schema contract、compile/runtime plumbing、shared field helper、renderer adoption、tests/docs 全部到位。
- 明确 form 默认策略与字段局部覆盖的解析规则。
- 让 form runtime 在 hidden-field validation 与 hidden-state clearing 行为上和该契约一致。
- 让 field-like renderer families 共享同一套 hidden-state policy 读取和应用路径，而不是各自零散实现。
- 形成一个足够完整的 feature baseline，避免后续再拆出多个零散 follow-up 才能得到可用行为。

## Non-Goals

- 不引入独立的 `submitWhenHidden` 或更大的 submit/validate enum 矩阵。
- 不重做整个 form validation architecture。
- 不在本计划中解决所有复杂控件的 authoring UX 问题；本计划只解决 hidden-state participation feature 的一致实现。
- 不把 hidden 行为扩展到普通非字段 layout/container/display 节点。

## Scope

### In Scope

- `HiddenFieldPolicy` 的 schema-level contract
- form-level default policy 与 field-level override 解析规则
- compile-time / runtime 表达与读取路径
- hidden-field validation participation
- hidden-state value clearing behavior
- shared field helper / field owner plumbing
- 主要 field-like renderer families 的 adoption
- focused docs、tests 与 verification

### Out Of Scope

- hidden-field submit exclusion
- generalized field participation matrix
- unrelated validation trigger redesign
- 与 hidden-state feature 无关的 renderer family refactor

## Execution Plan

### Phase 1 - Contract And Metadata Plumbing

Status: completed
Targets: `packages/flux-core/src/types/*`, `packages/flux-runtime/src/schema-compiler/*`, `packages/flux-runtime/src/*form*`, `docs/architecture/form-validation.md`

- [x] 定义 `HiddenFieldPolicy` 的正式类型位置与可见范围。
- [x] 明确 `FormSchema.hiddenFieldPolicy` 与 field-like schema `hiddenFieldPolicy` 的编译期承载位置。
- [x] 定义最近 form 默认 + field override 的解析规则，并决定编译结果落在哪个 compiled validation / field metadata 结构上。
- [x] 审核当前 compiled validation / field presentation metadata，决定 hidden-state policy 的唯一 runtime 读取来源，避免 helper、runtime、renderer 各自重复推导。

Exit Criteria:

- [x] schema 层 contract 有唯一正式定义，不依赖文档口头约定。
- [x] 编译产物能表达 hidden-field policy 的最终 resolved 结果或足够表达其继承解析输入。
- [x] runtime 和 renderer helper 有明确的单一 metadata 读取面。

### Phase 2 - Runtime And Shared Helper Alignment

Status: completed
Targets: `packages/flux-runtime/src/form-runtime-validation.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-renderers-form/src/*`, `packages/flux-react/src/*field*`

- [x] 让 form runtime 在字段 hidden 时按 policy 决定是否参与 validation。
- [x] 明确 hidden-field clear 触发时机，并按 `clearValueWhenHidden` 对齐实现。
- [x] 把 hidden-state policy 读取与应用收口到 shared field helper / owner plumbing，避免每个 renderer 单独判断。
- [x] 检查字段 renderer / shared field helpers 是否已有隐含行为与新 policy 冲突，并做最小对齐。

Exit Criteria:

- [x] hidden 字段默认跳过 validation。
- [x] `validateWhenHidden=true` 的字段会继续参与 validation。
- [x] `clearValueWhenHidden=true` 的字段在 hidden-state disposal / deactivation path 上有一致行为。
- [x] field-like controls 不需要各自发明 hidden-state policy 逻辑分支。

### Phase 3 - Renderer Family Adoption

Status: completed
Targets: `packages/flux-renderers-form/src/*`, `packages/*field*`, `packages/*input*`

- [x] 盘点当前 field-like renderer families，确认哪些 renderer 通过 shared field helper 自动获得新行为，哪些需要显式适配。
- [x] 对至少一组基础 field family 完成 end-to-end adoption，避免 feature 只存在于 runtime API 但没有落进真实控件。
- [x] 检查复杂组合字段控件的 owner path 是否与 hidden-state clearing / validation 语义冲突。

Exit Criteria:

- [x] 基础输入控件族在 live renderer path 上已采用统一 hidden-state policy。
- [x] 至少一个复杂/组合 field owner 已验证不会绕开该 policy。

### Phase 4 - Tests And Documentation Closure

Status: completed
Targets: `packages/flux-runtime/src/*.test.ts`, `packages/flux-renderers-form/src/*.test.tsx`, `docs/architecture/form-validation.md`, `docs/logs/2026/04-11.md`

- [x] 增加 focused tests，覆盖默认策略、field override、hidden validation、hidden clear、shared helper、renderer adoption。
- [x] 复核文档中关于 hidden-field policy 的 wording 是否和 live code 一致。
- [x] 记录实现 slice 与验证结果到 daily log。

Exit Criteria:

- [x] 有针对默认行为和两个 override 开关的 automated coverage。
- [x] 有至少一条 renderer-level integration coverage，证明 feature 不是 runtime-only 契约。
- [x] architecture doc 与测试结果对齐，不存在旧的更大策略矩阵残留。

## Validation Checklist

- [x] hidden 字段默认：保留值、参与提交、不参与校验、不自动清值
- [x] form 默认策略与 field override 行为一致
- [x] `validateWhenHidden` 行为有 focused test
- [x] `clearValueWhenHidden` 行为有 focused test
- [x] shared field helper / owner path 已采用统一 hidden-state policy 读取逻辑
- [x] 至少一组基础 field renderers 与一组复杂 field owner 已验证 adoption
- [x] docs updated
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: completed 2026-04-11. All phases landed and verified. `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test` all pass (flux-runtime: 279 tests, flux-renderers-form: 156 tests).

Key implementation notes:

- `HiddenFieldPolicy` lives in `packages/flux-core/src/types/validation.ts`; `resolveHiddenFieldPolicy()` in `packages/flux-core/src/validation-model.ts`
- `NodeRenderer` calls `notifyFieldHidden` via `useEffect` (covers all field renderers automatically)
- `useHiddenFieldPolicy()` in `packages/flux-renderers-form/src/field-utils.tsx` available for composite renderers
- Validation skip is in `validatePath()` at `packages/flux-runtime/src/form-runtime-validation.ts:273`
- `clearValueWhenHidden` triggers in `notifyFieldHidden` at `packages/flux-runtime/src/form-runtime.ts:225`

Follow-up:

- 如果后续出现真实用例需要 hidden-but-not-submitted，再单独新增 successor plan 评估 `submitWhenHidden` 是否值得引入。
- 如果后续需要把同一 participation 模型扩展到 disabled/static/readonly 等状态，再单独新建 successor plan，而不是把本计划继续扩成更大的状态矩阵。
- 否则 no remaining plan-owned work.
