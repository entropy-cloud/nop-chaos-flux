# 752 NRP-4 交互 adapter：expression editor + reference picker（nop-report）

> Plan Status: completed
> Last Reviewed: 2026-10-26
> Source: `docs/backlog/report-designer-nop-report-roadmap.md`（NRP-4 work item）、`docs/plans/640-nop-report-profile-plan.md` Phase 5（设计种子，superseded）、`docs/architecture/report-designer/inspector-design.md` §8/§13、`docs/architecture/report-designer/contracts.md` §5.6/§5.7
> Related: `docs/plans/749/750/751-...`（NRP-1/2/3，completed）

## Purpose

实现 `nop-report` 的 expression editor adapter 与 reference picker adapter（`rowParent`/`colParent` 地址选择），并修复两者的**消费路径**（当前 `registry.expressions`/`references` 两个 map 构造后从未被读取）；`referencePickerId?` 向后兼容加法与 resolver。消费路径采用 inspector-design.md §8 允许的 "schema adapter" 变体：字段 kind 标记 → schema 改写 → nop-report 自带 renderer definition 渲染 adapter 产出。

## Current Baseline

- `ExpressionEditorAdapter{id, render(props): unknown}`（`adapters.ts:88-91`）、`ReferencePickerAdapter{id, pick(context): Promise<string|undefined>}`（`adapters.ts:98-101`）已定义，全仓无实现。
- `ReportDesignerAdapterRegistry.expressions`/`references` 仅在 `runtime/registry.ts:16-17` 构造，**无任何读取点**（消费缺失）。
- `ReportDesignerProfile`（`adapters.ts:169-178`）有 `expressionEditorId?`，**无 `referencePickerId?**；`runtime/registry.ts` 有 `getCodecId`/`getPreviewProviderId` resolver，无 expression/reference resolver。
- NRP-3 已落地 `x-expression-kind` 标记（`inspector-schema.ts`，5 个 `*Expr` 字段）；`rowParent`/`colParent` 当前为普通 input（无 reference 标记）。
- Flux renderer definition 契约：`packages/flux-core/src/types/renderer-core.ts:228-233`（`RegisteredRendererDefinition{component, ...}`）；renderer 按 schema `type` 解析。
- `packages/report-designer-nop-report` 无 React 依赖（纯逻辑包）。

## Goals

- core：`ReportDesignerProfile` 新增 `referencePickerId?: string`（向后兼容加法）；`runtime/registry.ts` 新增 `getExpressionEditorId`/`getReferencePickerId` 与 `resolveExpressionEditor`/`resolveReferencePicker`（expressions/references map 的首个读取点）。
- nop-report：`createNopReportExpressionEditorAdapter()`（render 产出带 `data-slot` 的编辑节点，`onChange` 回传）、`createNopReportReferencePickerAdapter(options)`（`pick` 返回地址；支持宿主注入 `selectAddress` 回调，缺省回退 undefined）。
- nop-report：`createNopReportRendererDefinitions(args)`（types `nop-report-expression-editor`/`nop-report-reference-picker`，组件内调用 adapter.render/展示 picker 状态）与 `withNopReportFieldKinds(schemas, args)`（marked 字段改写为 custom type；**未注册 adapter 时保持普通 input 回退**）；inspector schema 为 `rowParent`/`colParent` 补 `x-reference-kind` 标记。
- 判别性测试：未注册 → 节点保持 `input-text`（既有行为不回退）；注册 → 节点改写为 custom type 且组件渲染 adapter 产出节点。

## Non-Goals

- 不固化表达式语言/补全协议（design.md 边界）；picker 首版不做 canvas 依赖连线。
- 不做 profile 总装配/e2e/demo（NRP-5）。
- 不改 inspector shell 既有渲染行为。

## Scope

### In Scope

- `packages/report-designer-core/src/adapters.ts`（`referencePickerId?`）、`runtime/registry.ts`（resolvers）+ core focused 测试。
- `packages/report-designer-nop-report/src/expression-editor-adapter.ts`、`reference-picker-adapter.ts`、`renderers.tsx`、`field-kinds.ts` + `index.ts` 导出 + focused 测试（含 React 组件测试，包内新增 react/react-dom/@testing-library/react devDependencies 与 vitest 环境——**经 `createSharedVitestConfig({ environment: 'happy-dom' })` 新建包内首个 `vitest.config.ts`**（shared config 的 environment 联合类型为 `'node' | 'happy-dom'`，全仓 DOM 测试惯例为 happy-dom，不引 jsdom）。**live 运行时注册（把 definitions 注册进 flux registry）归 NRP-5 装配**；本 plan 的消费路径 = schema 改写 + definition 组件直渲染测试，e2e 腿归 NRP-5。**strict 诊断注意**：shared config `__FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__='true'`，注册臂测试须在测试 registry 中注册 definitions，避免未注册 custom type 触发 schema 诊断 fail-fast。
- `inspector-schema.ts`：`rowParent`/`colParent` 加 `x-reference-kind` 标记（`x-expression-kind` 标记保持不变）。
- owner-doc：`inspector-design.md` §8（schema-adapter 消费变体落点）+ `contracts.md` §5.6/§5.7/§9（`referencePickerId?` 登记于 §9 Profile 落位处）；roadmap §5 回写；daily log。

### Out Of Scope

- core inspector shell / page-renderer 行为变更；demo/e2e。

## Failure Paths

| 可测场景编号            | 触发                                          | 行为（含错误码）                          | 可重试 | 用户可见表现     |
| ----------------------- | --------------------------------------------- | ----------------------------------------- | ------ | ---------------- |
| expression-unregistered | profile 无 `expressionEditorId` 或 map 未命中 | 字段保持普通 `input-text`（回退，不报错） | 是     | 普通输入框       |
| reference-unregistered  | profile 无 `referencePickerId`                | 同上                                      | 是     | 普通输入框       |
| picker-no-host-callback | picker 未注入 `selectAddress` 且调用 `pick`   | 返回 `undefined`，不抛错                  | 是     | 选择器提示不可用 |

## Test Strategy

本档选择：`必须自动化`。

- Proof 先于 Fix；判别机制：注册前 schema 改写断言（保持 input-text）vs 注册后断言（custom type + 组件渲染 adapter 节点）——旧实现（map 无读取点/无改写）必挂。
- 组件测试用 @testing-library/react 直接渲染 definition component，断言 adapter 产出节点（如 textarea 的 `data-slot`）与 onChange 回传。

## Execution Plan

### Phase 1 - core：referencePickerId 加法与 resolver

Status: completed
Targets: `packages/report-designer-core/src/adapters.ts`、`runtime/registry.ts`、`__tests__`

- Item Types: `Proof | Fix`

- [x] Proof（先红）：resolver 测试——`resolveExpressionEditor`/`resolveReferencePicker` 命中与未命中（回退 undefined）、`getReferencePickerId(profile)`。
- [x] Fix（`referencePickerId?: string` 加法（记录为允许的向后兼容加法）+ 两个 resolver。

Exit Criteria:

- [x] core focused 测试通过；`expressions`/`references` map 具备读取点。

### Phase 2 - nop-report：两个 adapter + 渲染定义 + schema 改写

Status: completed
Targets: `packages/report-designer-nop-report/src/**`、`__tests__`

- Item Types: `Proof | Fix`

- [x] Proof（先红）：field-kinds 改写测试——`x-expression-kind`/`x-reference-kind` 节点注册前后行为（回退 vs custom type）；inspector schema 的 `rowParent`/`colParent` 带 `x-reference-kind`。注册臂在测试 registry 注册 definitions（规避 strict schema 诊断 fail-fast）。
- [x] Proof（先红）：adapter/组件测试——expression editor render 产出节点含 `data-slot="nop-report-expression-editor"` 且 onChange 回传；reference picker 无宿主回调时 `pick` 返回 undefined、注入回调时返回地址。
- [x] Fix（实现两个 adapter、`createNopReportRendererDefinitions`、`withNopReportFieldKinds`；包内新增 React devDependencies + 新建 `vitest.config.ts`（happy-dom，经 createSharedVitestConfig）；`inspector-schema.ts` 补 reference 标记；index.ts 导出。

Exit Criteria:

- [x] nop-report 测试全绿（含组件测试）；未注册回退路径断言可指认。

### Phase 3 - owner-doc 回写与收口

Status: completed
Targets: `docs/architecture/report-designer/inspector-design.md`、`contracts.md`、roadmap、daily log

- Item Types: `Fix`

- [x] Fix（`inspector-design.md` §8 注明 schema-adapter 消费变体落点（`withNopReportFieldKinds` + 自带 renderer definitions）；`contracts.md` §9 Profile 落位处登记 `referencePickerId?` 与 resolver（审计勘误：登记实际位于 §9 而非 §5.6/5.7 旁）；daily log；roadmap §5 随 closure 回写 `done`。

Exit Criteria:

- [x] owner doc 与 live 一致；plan 全部 Phase completed。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-10-26；首轮 `fail` 1 Major，修订后复审）
- Verdict: `pass-with-minors`（复审 0 Blocker / 0 Major / 2 非阻塞 Minor）
- Rounds: 2（上限内）
- Findings addressed: Major-1（jsdom → happy-dom 经 createSharedVitestConfig + 新建包内 vitest.config.ts，已改）；Minor-1（live 注册归 NRP-5 已显式注明）、Minor-2（strict 诊断与注册臂测试注意已注明）。

## Closure Gates

- [x] 所有 in-scope confirmed live defect 已修复（adapter 无实现、map 无消费点 → 落地）。
- [x] 所有 in-scope confirmed contract drift 已收敛（inspector-design.md §8、contracts.md §5.6-5.8）。
- [x] 行为/契约结果已达成：两 adapter 实现 + 消费路径 + 判别性测试。
- [x] 必要 focused verification 已完成。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [x] 受影响的 owner docs 已同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（零新增 red）

## Deferred But Adjudicated

### reference picker canvas 依赖连线/hover 提示

- Classification: `watch-only residual`
- Why Not Blocking Closure: `nop-report-profile.md` §9.2 已裁定为后续增强；首版地址输入 + 选择回调已覆盖 `rowParent`/`colParent` 可填性。
- Successor Required: `no`
- Successor Path: —

## Non-Blocking Follow-ups

- 无。

## Closure

Status Note: 2026-10-26 收口。两个交互 adapter + 消费路径（resolver 读取点 + schema 改写 + renderer definitions）落地；独立子 agent closure audit `approved`（0 Blocker / 0 Major / 2 Minor 引用勘误，已随回写修复）。roadmap §5 NRP-4 随本回写翻 `done`。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-10-26）
- Evidence: verdict `approved`——repo-wide grep 实证新 resolver 是 expressions/references map 唯一读取点；core 215 tests / nop-report 51 tests 全绿；判别性测试实证（回退臂断言 custom type 缺席、组件臂断言 adapter 产出节点 + onChange 回传）；i18n key 双语就位；happy-dom vitest 环境符合 shared config。

Follow-up:

- NRP-5 归 roadmap 队列（live flux registry 注册在装配时落地），无剩余 plan-owned work。
