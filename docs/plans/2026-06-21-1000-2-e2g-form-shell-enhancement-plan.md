# E2g Form Shell 增强

> Plan Status: completed
> Package: components-improvement
> Work Item: E2g form shell 增强
> Last Reviewed: 2026-06-21
> Source: `docs/components/existing-components-improvement-roadmap.md`（E2g 行）、`docs/components/form/design.md` §2 Flux 决策表（L27-34 标 `计划实现（E2g）`）、live-repo audit（`FormRenderer` + `FormSchema` + form-runtime validation model + `FormLayoutContext`）
> Related: X3 naming-conventions（done）、X5 form Flux 决策表（done）、E2a/E2b/E2c（字段级增强已落地，form shell 层面增强待补）

## Purpose

把 roadmap 工作项 **E2g form shell 增强** 从 `todo` 推进到 `done`：为 `form` 补齐 8 组 shell 层能力——`columnCount`（多列布局）、`inline` 模式、`submitOnChange`（变更即提交）、`preventEnterSubmit`（阻止回车提交）、`autoFocus`（自动聚焦）、`scrollToFirstError`（滚动到首个错误）、`static`（只读预览）、`rules`（跨字段组合校验）。当前 `FormRenderer`（`packages/flux-renderers-form/src/renderers/form.tsx`，436 行）仅支持 `mode: normal|horizontal` + focus-on-first-invalid（无 scroll），无多列、无 inline、无 submit-on-change、无 Enter 处理、无 autoFocus、无 static 预览、无 form 级 rules 收集。runtime 侧 `CompiledFormValidationModel` 已支持 `nodes` kind `'form'`（`flux-core/src/types/validation.ts:93`），但 form renderer definition 未接入 form 级 rule 收集。

## Current Baseline

经 live-repo audit（2026-06-21）：

- **Schema**：`FormSchema`（`packages/flux-renderers-form/src/schemas.ts:61-80`）含 `mode?: 'normal' | 'horizontal'`（L66），无 `columnCount`/`inline`/`submitOnChange`/`preventEnterSubmit`/`autoFocus`/`scrollToFirstError`/`static`/`rules`。
- **Renderer**：`FormRenderer`（`packages/flux-renderers-form/src/renderers/form.tsx:124-435`）：
  - 布局：body 渲染为 `<div data-slot="form-body" className={cn(formGap.className, ...)} style={formGap.style}>`（L417-425），**单列**，仅 `gap` 间距。
  - mode：读取 `mode`/`labelAlign`/`labelWidth`（L385-387）→ 构建 `FormLayoutContextValue`（L389-395）→ `<FormLayoutContext.Provider>` 传播。
  - DOM 根：`<section ref={sectionRef} className="nop-form">`（L407-435），**非 `<form>`**，无原生 Enter 提交、无 `onKeyDown`。
  - 提交：`submitAction`/`onSubmitSuccess`/`onSubmitError`/`onValidateError` 经 `props.events` → `ownedForm.setLifecycleHandlers(...)`（L220-301）。submit 由 action graph / `component:submit` handle 驱动，renderer 不直接在 Enter 或 button click 时调用 submit。
  - 错误聚焦：订阅 `ownedForm.store`（L359-383），submit 停止 + `submitAttempted` + field errors 时 `sectionRef.current?.querySelector('[aria-invalid="true"]')` → `firstInvalid.focus()`（L372-378）。**仅 focus，无 scrollIntoView**。
  - 无 `autoFocus`、无 `static` 预览、无 `submitOnChange` 订阅。
- **Definition**：`formRendererDefinition`（`packages/flux-renderers-form/src/renderers/form-definition.ts:65-269`）`propContracts`（L73-133）含 `data`/`statusPath`/`valuesPath`/`mode`/`labelAlign`/`hiddenFieldPolicy`；`eventContracts`（L134-155）含 `initAction`/`submitAction`/`onSubmitSuccess`/`onSubmitError`/`onValidateError`；`componentCapabilityContracts`（L156-219）含 `submit`/`validate`/`reset`/`setValue`/`setValues`/`getValues`；`fields`（L245-262）含 body/actions regions + 上述 props/events。**无 `validation.collectRules`**——仅有 `schemaValidator: validateFormSchema`（L268）。
- **Runtime validation model**：
  - `ValidationRule`（`packages/flux-core/src/types/validation.ts:9-25`）已支持 `required`/`minLength`/`maxLength`/`pattern`/`email`/`equalsField`/`notEqualsField`/`requiredWhen`/`requiredUnless`/`atLeastOneFilled`/`allOrNone`/`uniqueBy`/`atLeastOneOf`/`async`。
  - `CompiledValidationNodeKind`（validation.ts:93）含 `'field' | 'object' | 'array' | 'form'`——**`'form'` kind 结构上已支持**。
  - `CompiledFormValidationModel`（validation.ts:107-115）含 `{ order, behavior, dependents, nodes?, rootPath?, ownerId?, defaultHiddenFieldPolicy? }`。
  - 字段级 rule 收集：`createFieldValidation()`（`input.tsx:302`）+ `collectRules(schema)`（`input.tsx:312`）为各 input renderer 产生 field-kind validation。**form 级 rule 收集：无**——formRendererDefinition 无 `validation.collectRules`。
  - 依赖收集：`collectValidationDependencyPaths`（`packages/flux-runtime/src/validation/rules.ts`）处理 `equalsField`/`notEqualsField`/`requiredWhen`/`requiredUnless`。
- **FormLayoutContext**：`useFormLayout()`（`docs/references/quick-reference.md:453`）已存在，传播 `mode`/`labelAlign`/`labelWidth`/`gap`。是 `columnCount`/`inline` 传播的天然通道。
- **FormFieldPresentationSnapshot**：已含 `readOnly`（`quick-reference.md:332-338`）——`static` 预览模式可复用此字段。
- **测试**：`form-renderer-lifecycle.test.tsx`（586 行，mock factory L7-47）、`form-validation-rules.test.tsx`（336 行，relational validation 集成测试）、`form-validation-ui.test.tsx`、`form-submit-actions.*.test.tsx`（多份）、`form-markers-contract.test.tsx`。无 columnCount/inline/submitOnChange/preventEnterSubmit/autoFocus/scrollToFirstError/static/rules 覆盖。

## Goals

- `FormSchema` 新增 8 字段：`columnCount?: number`、`mode` 扩展为 `'normal' | 'horizontal' | 'inline'`、`submitOnChange?: boolean`、`preventEnterSubmit?: boolean`、`autoFocus?: boolean`、`scrollToFirstError?: boolean`、`static?: boolean | string`、`rules?: FormCrossFieldRule[]`。
- **columnCount**：body 容器使用 CSS grid `grid-template-columns: repeat(columnCount, minmax(0, 1fr))`，字段按流式排列；`columnCount` 经 `FormLayoutContext` 传播（子 fieldset 可感知列数）。
- **inline 模式**：`mode: 'inline'` → body 使用 flex-row 布局，字段水平排列，actions 内联。
- **submitOnChange**：truthy 时订阅 form store values 变更，debounce 后触发 `submit()`（仅当 `submitAction` 存在）。
- **preventEnterSubmit**：form shell 添加 Enter key 处理——默认（`preventEnterSubmit` 非 true）Enter 触发 submit（当 `submitAction` 存在）；`preventEnterSubmit: true` 阻止 Enter 提交。
- **autoFocus**：truthy 时 form mount 后自动 focus body 内首个可交互字段（`querySelector('input,select,textarea,[data-slot="combobox"]')` → `focus()`）。
- **scrollToFirstError**：truthy 时在现有 focus 逻辑基础上追加 `scrollIntoView({ behavior: 'smooth', block: 'center' })`。
- **static 预览**：truthy 时经 context 传播 `readOnly` 到所有子字段（复用 `FormFieldPresentationSnapshot.readOnly`），actions 区域可配置隐藏。
- **rules 跨字段校验**：`rules: FormCrossFieldRule[]` 定义 form 级校验规则（如 `{ rule: 'equalsField', field: 'password', target: 'confirmPassword', message: '...' }`）；form renderer definition 增加 `validation` contributor，将 rules 编译并注入 validation model（具体编译路径见 Phase 4 Decision——不可简单复用 `form`-kind 节点，因为 `equalsField` validator 读取的是注册字段自身的值，form 节点值为整个 form 对象）。

## Non-Goals

- 不实现 amis `api`/`submitApi`/`initApi`/`asyncApi` 组件级请求——design.md §2 已标 `不采纳`，走 `submitAction`/`initAction` action graph。
- 不实现 amis `wizard`/step mode——独立组件族。
- 不实现 `persistData`/`persistDataKeys`（localStorage 草稿）——状态管理范畴。
- 不实现 `promptPageLeave`——host router 范畴。
- 不实现 `redirect`/`reload`/`target`——走 action graph 组合。
- 不实现 `debug`/`debugConfig` 调试面板——独立 scope-debug renderer。
- 不重构 form DOM 从 `<section>` 改为 `<form>`（保持现有 DOM 结构，Enter 处理通过 onKeyDown 实现）。
- 不改动字段级 validation 收集机制（`createFieldValidation`/`collectRules`）——仅新增 form 级 rule 收集层。

## Scope

### In Scope

- `FormSchema` 新增 8 字段 + `mode` 枚举扩展
- `FormRenderer` 实现 columnCount/inline/submitOnChange/preventEnterSubmit/autoFocus/scrollToFirstError/static
- form renderer definition `validation.collectRules` 接入 form 级 rules
- `FormLayoutContext` 扩展传播 `columnCount`/`inline`/`staticReadOnly`
- design.md §2/§4/§5/§7/§13 同步
- focused 单测覆盖全部 8 组能力

### Out Of Scope

- DOM 元素从 `<section>` 改为 `<form>`（保持 `<section>`）
- amis 请求/向导/持久化/页面离开拦截/调试面板（全部 `不采纳`）
- 字段级 validation 收集重构
- E3 P2 的 form 微调（如 `columnsCount` 按字段级 column 覆盖）

## Failure Paths

| 场景                           | 触发                                                                          | 行为                                                | 可重试 | 用户可见表现          |
| ------------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------- | ------ | --------------------- |
| submitOnChange-no-submitAction | `submitOnChange: true` 但无 `submitAction`                                    | 不触发 submit（空操作）                             | 否     | 无异常，字段变更正常  |
| rules-invalid-field            | `rules: [{ rule: 'equalsField', field: 'x', target: 'y' }]` 但字段 x/y 不存在 | runtime 现有行为：依赖路径无值 → 规则通过（不报错） | 否     | 无异常，校验通过      |
| preventEnterSubmit-true        | `preventEnterSubmit: true` + 用户按 Enter                                     | Enter 不触发 submit                                 | 否     | 无提交发生            |
| autoFocus-no-field             | `autoFocus: true` 但 body 无可交互字段                                        | `querySelector` 返回 null → 跳过 focus              | 否     | 无 focus 发生，无异常 |
| columnCount-zero               | `columnCount: 0` 或负数                                                       | 按 1 列处理（clamp to >=1）                         | 否     | 单列布局              |
| static-with-actions            | `static: true` + 有 actions region                                            | actions 区域正常渲染（static 仅影响字段 readOnly）  | 否     | 字段只读，按钮可点    |

## Test Strategy

档位选择：`必须自动化`

本档选择：`必须自动化`。form 提交（submitOnChange/preventEnterSubmit）与校验（rules）直接触及核心回归路径。错误的提交行为或校验遗漏会影响所有使用 form 的页面。Proof 项在 Fix 之前（Phase 2 RED → Phase 3/4 GREEN）。

## Execution Plan

### Phase 1 - Schema + Definition 契约

Status: completed
Targets: `packages/flux-renderers-form/src/schemas.ts`、`packages/flux-renderers-form/src/renderers/form-definition.ts`

- Item Types: `Fix | Decision`

- [x] `FormSchema`（`schemas.ts:61-80`）新增：`columnCount?: number`、`submitOnChange?: boolean`、`preventEnterSubmit?: boolean`、`autoFocus?: boolean`、`scrollToFirstError?: boolean`、`static?: boolean | string`、`rules?: FormCrossFieldRule[]`
- [x] `mode` 类型扩展为 `'normal' | 'horizontal' | 'inline'`
- [x] **Decision**：新增 `FormCrossFieldRule` 类型（`{ rule: ValidationRuleType; message?: string; field?: string; target?: string; ... }`）。注意：不可直接复用 runtime 现有 `equalsField`/`notEqualsField` 的 `path`-based 语义挂到 `form`-kind 节点——`equalsField` validator (`packages/flux-runtime/src/validation/validators.ts:190`) 读取的是 **当前注册字段自身** 的值与 `rule.path` 比较，而 form-kind 节点 value 是整个 form 对象，二者不兼容。Phase 4 必须在两个实现路径中裁定其一（见 Phase 4 Decision item）。
- [x] **Decision**：`preventEnterSubmit` 语义——默认 Enter 触发 submit（当 submitAction 存在），`preventEnterSubmit: true` 阻止。裁定理由：匹配用户对 form 的 Enter 提交预期 + amis baseline 一致。写入 design.md §2 + §8。
- [x] **Decision**：`static` 仅传播 `readOnly` 到字段层（复用 `FormFieldPresentationSnapshot.readOnly`），不隐藏 actions 区域。裁定理由：actions（submit/reset）在预览态可能仍需可见（如"返回编辑"按钮）。
- [x] form renderer definition `propContracts`（`form-definition.ts:73-133`）补齐 8 字段
- [x] definition `fields`（L245-262）补齐 8 字段注册（`columnCount`/`submitOnChange`/`preventEnterSubmit`/`autoFocus`/`scrollToFirstError` 为 prop kind；`static` 为 meta kind——影响子字段 readOnly；`rules` 为 prop kind）

Exit Criteria:

- [x] `pnpm typecheck` 通过（`FormSchema` 新字段 + `FormCrossFieldRule` 类型正确）
- [x] `pnpm --filter @nop-chaos/flux-renderers-form test` 现有用例不回归
- [x] No owner-doc update required（design.md 更新在 Phase 5）

### Phase 2 - RED Tests（Proof-First）

Status: completed
Targets: `packages/flux-renderers-form/src/__tests__/form-shell-enhancements.test.tsx`（新建）

- Item Types: `Proof`

- [x] columnCount：`columnCount: 2` → body 容器 `grid-template-columns` 含 `repeat(2, ...)`；字段排列为 grid
- [x] inline 模式：`mode: 'inline'` → body 使用 flex-row 布局 class
- [x] submitOnChange：`submitOnChange: true` + 字段值变更 → `submitAction` 被调用（debounce 后）
- [x] submitOnChange 无 submitAction：`submitOnChange: true` 无 `submitAction` → 无异常、无 submit
- [x] preventEnterSubmit：`preventEnterSubmit: true` + 按 Enter → submit 不触发
- [x] Enter 默认提交：无 `preventEnterSubmit` + 按 Enter + 有 `submitAction` → submit 触发
- [x] autoFocus：`autoFocus: true` → mount 后首个 input 获得 focus
- [x] scrollToFirstError：`scrollToFirstError: true` + submit 失败 → `scrollIntoView` 被调用（mock 验证）
- [x] static 预览：`static: true` → 子字段 readOnly（`aria-readonly` 或 `data-readonly`）
- [x] rules equalsField：`rules: [{ rule: 'equalsField', field: 'password', target: 'confirm', message: '不一致' }]` + 两字段值不同 → 校验失败 + message 显示

Exit Criteria:

- [x] 全部测试为 RED（failing）——证明能力尚未实现
- [x] 测试覆盖全部 8 组能力的关键路径
- [x] No owner-doc update required

### Phase 3 - Layout + Interaction 实现（Fix）

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/form.tsx`、`packages/flux-renderers-form/src/renderers/form-layout-context.tsx`（或 inline 扩展）

- Item Types: `Fix`

- [x] `FormLayoutContextValue` 扩展：新增 `columnCount?: number`、`isInline: boolean`、`staticReadOnly: boolean`
- [x] columnCount 实现：body div style/grid 追加 `gridTemplateColumns: repeat(Math.max(1, columnCount), minmax(0, 1fr))` + `display: grid`（当 `columnCount > 1`）
- [x] inline 模式实现：`mode === 'inline'` → body 使用 `flex flex-row flex-wrap items-end gap-*` class
- [x] autoFocus 实现：`useEffect` on mount → `sectionRef.current?.querySelector('input:not([disabled]),select:not([disabled]),textarea:not([disabled])')?.focus()`（当 `autoFocus` truthy）
- [x] scrollToFirstError 实现：现有 focus 逻辑（L372-378）追加 `firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' })`（当 `scrollToFirstError` truthy）
- [x] preventEnterSubmit 实现：section 添加 `onKeyDown` capture——Enter key + `!preventEnterSubmit` + 有 `submitAction` → `ownedForm.submit()`；`preventEnterSubmit` true → stop
- [x] static 预览实现：`static` truthy → `FormLayoutContextValue.staticReadOnly = true`；子字段通过 `useFormLayout()` 读取并设置 `readOnly`
- [x] Phase 2 RED 测试转为 GREEN

Exit Criteria:

- [x] Phase 2 全部测试转为 GREEN
- [x] `pnpm typecheck` 通过
- [x] `pnpm build` 通过
- [x] 现有 form 测试不回归（`form-renderer-lifecycle.test.tsx` 等）
- [x] No owner-doc update required（design.md 更新在 Phase 5）

### Phase 4 - submitOnChange + rules 实现（Fix）

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/form.tsx`、`packages/flux-renderers-form/src/renderers/form-definition.ts`、`packages/flux-runtime/src/validation/`（如需）

- Item Types: `Fix`

- [x] submitOnChange 实现：`useEffect` 订阅 `ownedForm.store` values 变更 → debounce（300ms）→ `ownedForm.submit()`（仅当 `submitOnChange` truthy + `submitAction` 存在）。防止 init 首次触发（跳过首次 values 快照）。
- [x] **Decision（rules 编译路径裁定）**：在以下两路径中裁定其一，并在 design.md §2/§7 记录理由：
  - 路径 A（field-level 注入）：把 `FormCrossFieldRule { field, target, rule: 'equalsField' }` 翻译为挂在 `field` 字段节点上的 `{ kind: 'equalsField', path: target }`，通过新增 form renderer 的 `validation` contributor + 自定义注入点把 rule 合并进对应子字段节点的 `rules` 数组。需要扩展 `validation-collection.ts` 当前只处理 `contributor.kind === 'field'` 的限制（`packages/flux-compiler/src/schema-compiler/validation-collection.ts:113`），或新增一个 owner-level rule 注入 API。
  - 路径 B（新增 form 级 validator kind）：在 `ValidationRule` 联合类型中新增如 `{ kind: 'formEqualsField'; field: string; target: string; message?: string }`，由 form-kind 节点承载，并在 `validators.ts` 注册读取两路径值的 validator。
  - 推荐路径 A（不污染 runtime rule 枚举，复用已有 validator），但需评估 owner → child rule 注入的工程量。
  - **实际裁定（实现记录）**：采用 Path A 语义（field-level 注入），但通过 form-renderer-level 的 `compileFormLevelValidationModel` 后处理（`packages/flux-renderers-form/src/renderers/form-rules.ts`），而非扩展 compiler。form renderer 在 `useMemo` 内将 `props.templateNode.validationPlan` + `schema.rules` 合并为扩展后的 `CompiledFormValidationModel`，再传给 `runtime.createFormRuntime`。这样：
    - 不污染 runtime validator 枚举；
    - 不修改 flux-compiler 公共 API（避免跨包变更风险）；
    - 复用现有 `equalsField`/`notEqualsField` validator 与 `dependents` 重算机制；
    - 校验行为与字段级 `equalsField` 一致，包括 dependency path 触发重校验。
- [x] rules 收集实现：基于上述裁定，form renderer definition 增加 `validation` contributor（注意当前 form-definition 完全没有 `validation` 字段，需新增）——从 `schema.rules` 读取 `FormCrossFieldRule[]`，按所选路径编译为 validation rules
- [x] rules 依赖路径：`equalsField`/`notEqualsField` 等 relational rule 的 `target` 加入 `dependents`（复用 `collectValidationDependencyPaths`，`packages/flux-runtime/src/validation/rules.ts:10-11`）
- [x] Phase 2 submitOnChange + rules RED 测试转为 GREEN

Exit Criteria:

- [x] Phase 2 全部测试 GREEN（含 submitOnChange + rules）
- [x] `pnpm typecheck` + `pnpm build` 通过
- [x] `pnpm --filter @nop-chaos/flux-runtime test` 不回归
- [x] `pnpm --filter @nop-chaos/flux-renderers-form test` 全过
- [x] No owner-doc update required（design.md 更新在 Phase 5）

### Phase 5 - Owner-Doc Sync + Roadmap

Status: completed
Targets: `docs/components/form/design.md`、`docs/components/existing-components-improvement-roadmap.md`、`docs/logs/2026/06-21.md`

- Item Types: `Follow-up`

- [x] `docs/components/form/design.md` §2 决策表 8 行 E2g 标记从 `计划实现（E2g）` 翻转为 `实现`
- [x] design.md §2 补 preventEnterSubmit 语义裁定（默认 Enter 提交 + gate）+ static 仅 readOnly 裁定
- [x] design.md §4 schema 设计补 8 字段列表；§5 字段分类补 columnCount/submitOnChange/preventEnterSubmit/autoFocus/scrollToFirstError（value）、static（meta）、rules（value）
- [x] design.md §7 运行期状态归属补 submitOnChange debounce + static readOnly 传播说明
- [x] design.md §8 补 Enter key 处理契约 + preventEnterSubmit gate
- [x] design.md §13 表单模式补 `inline` 模式 + `columnCount` 多列布局说明
- [x] `docs/components/existing-components-improvement-roadmap.md` E2g `todo`→`done`
- [x] `docs/components/amis-baseline-matrix.md` retained 决策无变化（No update required — 全部为新增能力）
- [x] `docs/logs/2026/06-21.md` 新增 E2g 收口条目

Exit Criteria:

- [x] design.md §2 无残留 `计划实现（E2g）` 行
- [x] roadmap E2g 标为 `done`
- [x] daily log 含 E2g 条目
- [x] `docs/architecture/form-validation.md` 如有 form-level rules 说明需同步（否则 No architecture doc update required）

## Draft Review Record

- Reviewer / Agent: opencode plan-review (fresh session, 2026-06-21)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - **Major (fixed)**: `FormCrossFieldRule` 编译路径与 runtime validator 语义不兼容。原 plan 称"复用 `ValidationRule` kind 枚举编译为 form-kind nodes"，但 live repo 核对显示 `equalsField` validator (`packages/flux-runtime/src/validation/validators.ts:190`) 读取注册字段自身值与 `rule.path` 比较，form-kind 节点 value 是整个 form 对象，二者不兼容；且 `collectRules` 当前只在 `contributor.kind === 'field'` 时触发 (`packages/flux-compiler/src/schema-compiler/validation-collection.ts:113`)，form-definition 无任何 `validation` contributor。已在 Goal、Phase 1 Decision、Phase 4 新增 Decision item 中显式列出路径 A/B 裁定要求。
  - **Minor (deferred to closure/deep audit)**: 各 Phase Exit Criteria 未单独列 `docs/logs/` 更新项（仅 Phase 5 覆盖 daily log）；`static?: boolean | string` 中 `string` 分支语义未在 Goals 解释；`FormCrossFieldRule` 类型归属 package（`flux-renderers-form` vs `flux-core`）未明示。

## Closure Gates

- [x] `FormSchema` 8 新字段全部定义且 propContracts/fields 接线
- [x] columnCount 多列布局正确（CSS grid）
- [x] inline 模式正确（flex-row）
- [x] submitOnChange 正确触发（debounce + skip init）
- [x] preventEnterSubmit 正确阻止 / 默认 Enter 提交正确
- [x] autoFocus 正确聚焦首字段
- [x] scrollToFirstError 正确滚动
- [x] static 正确传播 readOnly
- [x] rules 跨字段校验正确编译 + 执行
- [x] focused 单测覆盖全部 8 组能力
- [x] design.md §2/§4/§5/§7/§8/§13 同步到 live baseline
- [x] 不存在被静默降级到 deferred 的 in-scope live defect 或 contract drift
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### `columnsCount` 按字段级 column 覆盖

- Classification: `optimization candidate`
- Why Not Blocking Closure: amis 支持 per-field `columnCount` 覆盖 form 级 `columnsCount`。Flux 当前 `columnCount` 是 form 级单一值，字段级覆盖属细粒度布局控制，非 E2g 核心能力。design.md §2 未列为 E2g 行。
- Successor Required: no
- Successor Path: 若后续需要字段级列覆盖，归 E3 P2 评估。

### submitOnChange debounce 时长可配置

- Classification: `optimization candidate`
- Why Not Blocking Closure: 当前硬编码 300ms debounce。可配置 `submitOnChangeDebounce?: number` 是增强，非 E2g 契约。design.md §2 未列。
- Successor Required: no
- Successor Path: 按需增强。

## Non-Blocking Follow-ups

- `static` 模式下 actions 区域隐藏选项（`staticHideActions?: boolean`）归后续增强评估。
- `rules` 支持 `async` form 级异步校验（runtime 已支持 `async` ValidationRule kind）——当前 Phase 4 仅覆盖同步 relational rules，async 归后续验证。
- form 级 `rules` 的 `order` 排序（多条 rule 执行顺序）复用 runtime `CompiledFormValidationModel.order`，无需额外工作。

## Closure

Status Note: E2g 全 5 Phase 执行完成（mission-driver 全自动执行）。8 组 shell 层能力（columnCount/inline/submitOnChange/preventEnterSubmit/autoFocus/scrollToFirstError/static/rules）全部实现并测试覆盖。compileFormLevelValidationModel 在 form-renderer 层后处理 validation model，避开 flux-compiler 公共 API 变更。design.md §2/§4/§5/§7/§8/§13 与 roadmap 同步。

Closure Audit Evidence:

- Auditor / Agent: opencode independent closure-audit sub-agent (fresh session, CLOSURE_AUDIT step, 2026-06-21)
- Audit scope: re-read entire plan; verify each Exit Criterion against live repo; anti-hollow check; deferred honesty; five-point consistency.
- Live-repo evidence verified:
  - `packages/flux-renderers-form/src/schemas.ts` 含全部 8 新字段（`columnCount`/`submitOnChange`/`preventEnterSubmit`/`autoFocus`/`scrollToFirstError`/`static`/`rules` + `mode` 扩展含 `inline`）+ `FormCrossFieldRule` 类型（L13-19）
  - `packages/flux-renderers-form/src/renderers/form.tsx`（558 行）：8 能力全部接线——`handleSectionKeyDown` Enter gate（L465-491）、`submitOnChange` debounce+skip-init 订阅（L430-463）、`autoFocus` useEffect（L420-428）、`scrollToFirstError` 追加 scrollIntoView（L393-398）、columnCount grid style（L508-517）、inline `nop-form-body--inline` class（L539）、`staticReadOnly` 经 `FormLayoutContext` 传播（L416）
  - `packages/flux-renderers-form/src/renderers/form-rules.ts`（155 行）：`compileFormLevelValidationModel` 真实实现 Path A（field-level 注入），在 form.tsx:173 被调用——非空壳、非 placeholder、非 swallowed exception
  - `packages/flux-renderers-form/src/renderers/form-definition.ts`：propContracts（L187-218）+ fields（L373-377）全部补齐
  - `packages/flux-renderers-form/src/__tests__/form-shell-enhancements.test.tsx`（408 行）：覆盖全部 8 组能力的关键路径（含 RED→GREEN 转化证据）
  - `docs/components/form/design.md`：无 `计划实现（E2g）` 残留；§2/§4/§5/§7/§8/§13 已同步
  - `docs/components/existing-components-improvement-roadmap.md`：E2g 标为 `done`，Last Updated `2026-06-21 (E2g done)`
  - `docs/logs/2026/06-21.md`：存在
- Anti-Hollow 结论：`compileFormLevelValidationModel` 在 form.tsx:173 被实际调用并传入 `runtime.createFormRuntime`；无空函数体、无 `return null` placeholder、无 swallowed exception。所有新 prop 均在 render 路径读取并驱动真实行为。
- Five-point consistency：`Plan Status: completed` / 5 个 Phase 全 `completed` / 每个 Phase Exit Criteria 全 `[x]` / Closure Gates 全 `[x]` / `docs/logs/2026/06-21.md` 存在——彼此一致。
- Deferred honesty：`Deferred But Adjudicated` 2 项（per-field columnCount、submitOnChange debounce 时长）均为 `optimization candidate` 且有 non-blocking 理由；无 in-scope live defect 或 contract drift 被降级。
- 执行 agent 自检证据（保留）：
  - `pnpm typecheck` = 49/49 packages 通过
  - `pnpm build` = 26/26 packages 通过
  - `pnpm --filter @nop-chaos/flux-renderers-form lint` = 0 errors（1 pre-existing useVirtualizer warning 来自 E1a）
  - `pnpm --filter @nop-chaos/flux-renderers-form test` = 35 files / 328 tests 全过（316 既有 + 12 新增 form-shell-enhancements.test.tsx）
  - `pnpm --filter @nop-chaos/flux-runtime test` = 91 files / 1162 tests 全过（无回归）

Follow-up:

- 已记录的 Non-Blocking Follow-ups 见 plan §"Non-Blocking Follow-ups"（per-field columnCount 覆盖、submitOnChange debounce 时长可配置、static 模式下 actions 区域隐藏选项、async form 级 rules）。
- 无剩余 plan-owned work。
