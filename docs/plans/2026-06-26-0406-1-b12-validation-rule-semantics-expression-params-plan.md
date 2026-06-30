# B1.2 校验规则语义、表达式参数与全管道入口

> Plan Status: completed
> Last Reviewed: 2026-06-26
> Source: `docs/components/amis-bug-driven-improvement-roadmap.md` (Wave B1, work item B1.2), `docs/components/amis-bug-driven-improvements/01-form-validation.md` (V3-V6/V8-V10/V13-V15/V17-V21/V23), `docs/architecture/form-validation.md`
> Mission: amis-bug-driven-improvements
> Work Item: B1.2 校验规则语义、表达式参数与全管道入口
> Related: predecessor B1.1（`docs/plans/2026-06-26-0234-1-b11-...-plan.md`，已锁定 V1/V2/V16/V22）；successor B3.2（array/combo 嵌套隔离）依赖本工作项先行落地（V6 行级相对寻址显式留给 B3.2）

## Purpose

把 roadmap 最大单一工作项 B1.2 收口。本计划不是新建校验能力，而是把 `01-form-validation.md` 的 V3-V6/V8-V10/V13-V15/V17-V21/V23 共 16 条 signal **逐条对照 live repo 裁定并落地**：

- 真正成立的属性补聚焦回归锚（多数为 TEST-GAP 锁定）。
- owner doc 沉默的边界补成显式设计规则（DESIGN-GAP）。
- 经 live 审计发现**根本不存在的 amis-parity 规则语义**（V3 派生字段、V10 数值范围规则、V13 表达式参数规则）——诚实地裁定为「Flux 当前不建模」，在 owner doc 记录裁定结论（NOT-ADOPTED / documented gap），并锁定**确实存在**的相邻属性，不假装测试不存在的规则。
- 经 live 审计发现的**真实行为分叉**（V18 submit 入口把 async 失败转成字段错误）——裁定是缺陷还是有意 fail-visible，必要时收敛并锁定。

## Current Baseline

> 来源：2026-06-26 独立子 agent 对 `packages/flux-runtime/src/`、`packages/flux-core/src/`、`packages/flux-react/src/form-state.ts`、`packages/flux-renderers-form/src/renderers/form.tsx` 的 live-repo 审计。下列 file:line 引用均已核对。

### 重塑多条 signal 分类的三个前提事实

1. **live `ValidationRule` 联合类型只有这些 kind**：`required`/`minLength`/`maxLength`/`minItems`/`maxItems`/`atLeastOneFilled`/`allOrNone`/`uniqueBy`/`atLeastOneOf`/`pattern`/`email`/`equalsField`/`notEqualsField`/`requiredWhen`/`requiredUnless`/`async`（`flux-core/src/types/validation.ts:9-25`）。**不存在** `min`/`max`/`isInt`/`minimum`/`maximum`/`isLength` 这类数值范围规则 kind（全仓库穷举 grep 0 命中）。
2. **live `CompiledValidationRule`**（`flux-core/src/types/validation.ts:82-91`）只携带 `{ id, rule, dependencyPaths, precompiled? }`，**无** `args: Record<string, CompiledRuntimeValue>`、**无** `when`、规则参数是**编译期静态**值（`pattern.value: string`、`minLength.value: number` 等），不在 materialize 时重算。
3. **owner doc 对表达式参数是「目标态声称」而非沉默**：`form-validation.md:55`（Design Goal 4「Support expression-based rule parameters」）与 `:683`（「Rules may use expressions for ... thresholds」）声称该能力，且 Rule Template Model 的 `CompiledRuleTemplate.args` 形状（`:660-681`）作为目标 sketch 出现但**未标注非 live**（「not a live exported type」标注在 `:570` 的 Compile-Time Collection sketch，非本块）。故 V13 = 「doc 声称的目标态、live 未落地」的 DESIGN-GAP，而非简单 NOT-ADOPTED。
4. 这三点直接决定 V10（无数值范围 kind）、V13（表达式参数 doc 声称但未 live）不是「已实现未测试」，而是**特征缺口 / 目标态-未落地 gap**。

### 逐条现状

- **V3（派生/计算字段参与校验，派生写入是一等变更事件）— 未实现 + DESIGN-GAP。** 无派生字段机制：`formula` 只存在于 `FormulaDataSourceSchema`（`flux-core/src/types/schema.ts:207-208`）做异步数据加载，不写校验值。revalidation 图只由 `compiledRule.dependencyPaths` 喂入（`flux-core/src/validation-model.ts:189-198`、`validation/rules.ts:3-17`）。`form-validation.md` Dependency Model（`:709-738`）对派生字段沉默。`value-adaptation-and-detail-field.md` 存在（754 行）但不建模派生字段写入校验图。
- **V4（动态 requiredness 同时重算指示器与 submit-gating）— 实现且两侧共享逻辑，TEST-GAP。** 指示器 `isValidationFieldEffectivelyRequired`（`flux-react/src/form-state.ts:127-152`，`Object.is(getIn(values, rule.path), rule.equals)`）；submit-gating `requiredWhen`/`requiredUnless`（`validation/validators.ts:216-235`，同一 `Object.is` 谓词）；依赖订阅 `getDynamicRequiredDependencyPaths`（`form-state.ts:109-125`）。`form-validation.md:719-723` 已记基线。**无测试断言两侧一起翻转（V4 核心非分歧主张）**。
- **V5（数组某列默认值不抑制兄弟列规则物化）— 成立（无抑制机制），TEST-GAP。** 规则按 node-path 静态存于 `model.nodes`（`flux-core/src/validation-model.ts:89-111`），无 defaultValue 抑制路径；`validateCompiledField` 跑 `for (const compiledRule of field.rules)`（`form-runtime-validation.ts:326-385`）。无回归锚。
- **V6（数组行内行本地相对跨字段引用）— 未实现；显式 deferred 到 B3.2。** 跨字段规则用**绝对** `scope.get(rule.path)`（`validators.ts:191,204,217,227`）+ 绝对 `dependencyPaths`（`rules.ts:9-17`）。`path-binding.ts:9-90` 的 `toAbsolute`/`toRelative` 只服务 projected owner 子树（detail/object/variant，见 `value-adaptation-and-detail-field.md:31-33`），不服务数组行实例。predecessor B1.1 plan（`:52-53,69-70`）已把 array/combo 行级相对依赖显式留给 B3.2。
- **V8（外部错误按嵌套路径寻址 + 越界路径拒绝）— 实现且充分测试，TEST-GAP 标签 stale。** `applyExternalErrors`→`storeOwnedExternalErrors`（`form-runtime-owner-external-errors.ts:105-122`）按 `isPathOwned` 过滤（`form-runtime.ts:347-350`）；`rebuildStoreErrorsFromExternal`（`external-errors.ts:10-35`）/`getExternalErrorsForPath`（`:37-54`）。测试 `plan-68-69-remaining-behaviors.test.ts:205-243` 用真实 runtime 断言嵌套寻址 + 越界拒绝（`:231-243` `foreign.path` 被拒）。
- **V9（一次 submit 恰好一次聚合校验失败通知）— 实现，TEST-GAP。** `executeFormSubmit`（`form-runtime-submit-flow.ts:164-403`）调 `validateForm('submit')` 一次（`:250`），失败建一个 `validationFailure`（`:254-259`）调 `onValidateError` 一次（`:265`）；renderer 接一次（`form.tsx:281-294`）。**无测试计数 `onValidateError === 1`（多字段 + 嵌套 combo 同时失败）**。
- **V10（数值 min/max/isInt 规则在比较前强转/类型检查）— 规则 kind 不存在，特征缺口。** 见前提事实 1。唯一数值味规则是 `minLength`/`maxLength`（串长度，`validators.ts:126-145`），已用 `typeof input.value === 'string'` 守卫（`:127,132`）对非串安全短路，不会产生矛盾结果——但这属长度规则，非数值范围语义。
- **V13（规则参数接受表达式引用且进入 dependencyPaths）— 未实现，目标态-未落地 DESIGN-GAP。** 见前提事实 2/3。`validateRule`（`validation-runtime.ts:19-45`）直传静态 `compiledRule.rule`；`dependencyPaths` 只来自显式跨字段规则路径（`rules.ts:9-17`）。`validation-rules.test.ts:36-53` 确认非跨字段 kind（含 `pattern`/`minLength`）产生空 dependencyPaths。owner doc 已把表达式参数列为设计目标（`:55/:683`）并 sketch `CompiledRuleTemplate.args`（`:660-681`），但 live `CompiledValidationRule` 无 `args`——doc 与 live 不一致（目标 sketch 未标非 live）。
- **V14（pattern 规则匹配任意合法正则、非法正则 fail-closed）— 实现且测试，LOCKED。** `pattern` validator（`validators.ts:174-183`）用 `precompiled.regex` 或 `new RegExp`，`precompiled.error`→`createPatternConfigurationError`（`:115-120,176-178`，`sourceKind:'runtime-registration'`）；`form-validation.md:24` 记基线。测试 `validators.test.ts:301-383`（含非法正则→配置错误 `:343-362`、回溯陷阱 `:364-382`）。
- **V15（pattern 失败且有 author message 时渲染 author message，绝非正则源）— 实现，TEST-GAP(minor)。** `createBuiltInErr`（`validators.ts:103-113`）→`buildValidationMessage` 有 message 时原样返回（`validation-message.test.ts:162-169` 证 pattern 自定义 message 原样）。但这是 message-builder 单测，**无端到端**（`validateCompiledField`→存储字段错误→rendered chrome 文本==author message 且不含正则源）锚。
- **V17（async 校验在运行开始时快照最新 owner 值）— 实现，TEST-GAP。** `validateCompiledField`（`form-runtime-validation.ts:260-488`）：runId bump（`:271-272`）后 `const value = syncedRuntimeValue ?? sharedState.scope.get(path)`（`:275`）在运行开始读最新值；async 规则 `executeValidationRule` 持 `sharedState.scope` 引用（`:346-352`）在实际执行时求值；过期 run 被 `validationRuns===runId`+`modelGeneration` 丢弃（`:314,411-422,477-478`）。**无测试做 A→B→C 后断言解析的 run 用了值 C**。
- **V18（async 规则本身失败经 diagnostics seam 而非字段错误）— 部分实现 + submit 入口行为分叉（真实分歧）。** 依赖重校验路径：`createDependentRevalidationFailureHandler`（`form-runtime-values.ts:25-47`）走 `onError`+`notify('error')`，与 V18 一致；直接 change/blur 路径：`executeRuntimeValidationRule` 重抛非 abort 失败（`runtime-action-helpers.ts:62-69,93-99`），`validateCompiledField` finally 只提交 sync 错误→**不发 async 字段错误**（与 V18 一致）。**但 submit/`validateForm` 路径**：重抛在 `form-runtime-owner.ts:399-415` 被捕获并**转成字段错误** `{message:'Validation failed due to an internal error', rule:'async', sourceKind:'form', cause}`（`:413` 推入 `fieldErrors[path]`），与 V18「不发字段错误」**相反**。该行为被 `form-validation-resilience.test.ts:77-109` 断言（throwing sync validator→字段错误）。`form-validation.md` Async Validation Semantics（`:1003-1031`）**未文档化** transport-失败 vs rule-失败 路由区分，也未记录 submit 入口字段错误行为。
- **V19（hidden 字段排除出校验 + clearValueWhenHidden 清值 + 单字段隐藏生效）— 实现且充分测试，TEST-GAP 标签 stale。** `notifyFieldHidden`（`form-runtime-field-ops.ts:416-442`）；`invalidateHiddenSubtreeValidation`（`:338-381`）、`clearHiddenSubtreeFieldStates`（`:298-336`）、`collectClearValueWhenHiddenPaths`（`:383-414` 级联后代）；校验门 `validatePath` 查 `isPathHidden` 短路除非 `validateWhenHidden`（`form-runtime-validation.ts:30-39,516-530`）。测试 `hidden-field-policy.test.ts:136-574` 真实断言默认跳过/`validateWhenHidden`/reveal→system 重校验/clearValueWhenHidden 级联/非 form owner。
- **V20（init/远程水合不触发用户可见校验错误）— 实现（机制略异于 signal 措辞），TEST-GAP。** form 创建直接 seed `initialValues`（`form-runtime.ts:91-94,112-115`）不触发校验；`reset`（`:501-518`）替换值不校验；`setValues`→`executeSetValues`（`form-runtime-values.ts:63-153`）不标 `touched`、不自校验写路径。配合 `showErrorOn:['touched','submit']` 默认（`form-validation.md:248-249`），init 写入不产生可见错误。**无聚焦回归锚**。
- **V21（程序式写入经 `applyChangesAndRevalidate` 清除 stale required 错误且一次可提交）— 实现，TEST-GAP。** `applyChangesAndRevalidate`（`form-runtime-owner.ts:229-338`）：写值（`:260-267`）、清 owner-local external 错误（`:277-293`）、`reason:'change'` 时逐 changed path `validateField(path,'change')`（`:297-305`，满足 `form-validation.md:896` rule 5）、再 `revalidateDependents`（`:307-309`）。（注：裸 `setValue`/`setValues` 只重校验 dependents 且 skip-self，`form-runtime.ts:555-559`、`form-runtime-values.ts:147-153`——V21 需 `applyChangesAndRevalidate` 入口。）部分代理测试 `plan-68-69-remaining-behaviors.test.ts:245-277` 证清错但**未断言 `canSubmit` 真/端到端可一次提交**。
- **V23（程序式 `validate()` 返回结构化真实结果含失败路径）— 实现，minor DESIGN-GAP。** `validateForm`/`validateAll` 返回 `FormValidationResult = {ok, errors, fieldErrors: Record<path, ValidationError[]>}`（`flux-core/src/types/validation.ts:53-55`，组装于 `form-runtime-owner.ts:548-552`）；component-handle `validate`（`form-component-handle.ts:45-52`）暴露完整结果；lifecycle-blocked/null-model 返回显式非 clean-success（`form-runtime-owner.ts:45-65,356-362`）。`form-validation.md:144-146` 仅列类型名，**未文档化** `fieldErrors` 作为「失败路径」下游分支契约。

### 相关测试文件（主要）

`__tests__/validators.test.ts`、`validation-rules.test.ts`、`validation-message.test.ts`、`runtime-validation.test.ts`、`validation-async-cancel-and-full-pipeline.test.ts`、`validation-dependency-closure.test.ts`、`hidden-field-policy.test.ts`、`form-validation-resilience.test.ts`、`owner-validation-lifecycle-contracts.test.ts`、`form-runtime-submit-flow.test.ts`、`plan-68-69-remaining-behaviors.test.ts`、`bug-validate-overwrite.test.ts`。

## Goals

- **V4/V5/V9/V17/V20/V21**：各落一条聚焦、可证伪的回归测试钉住当前正确行为；若 Proof 在 live code 失败即升级为 Fix。
- **V8/V14/V19**：再核既有的充分测试确认仍成立，把 stale 的 TEST-GAP 分类显式裁定为「已覆盖、无需新增」。
- **V15**：补一条端到端锚（rendered 字段错误 == author message，不含正则源）。
- **V3/V10/V13**：诚实裁定为「Flux 当前不建模」的特征缺口——在 owner doc 记录裁定结论（NOT-ADOPTED / documented gap），并锁定确实存在的相邻属性（现有 length/items 规则对非串/非数组输入的**非矛盾**行为，即 V10 底层关切映射到现有规则）。
- **V6**：确认显式 deferred 到 B3.2，在本计划登记裁定。
- **V18**：裁定 submit 入口「async 失败→字段错误」是缺陷还是有意 fail-visible；若裁定为缺陷则收敛（submit 路径改走 diagnostics seam，与直接路径一致），并锁定裁定后的行为。
- **V23**：在 owner doc 文档化 `FormValidationResult.fieldErrors` 为「失败路径」下游分支契约。
- owner doc `form-validation.md` 同步全部裁定结论，且与 live code 一致，无「Proposed vs Current」叙事。

## Non-Goals

- 不新增校验规则 kind（`min`/`max`/`isInt`/数值范围）或表达式参数化规则 args 作为**新功能**——只裁定其缺席并记录（V10/V13）。若裁定为「值得有的 Flux 特征」，仅产 successor 记录，不在本计划实现。
- 不实现派生字段 revalidation 机制（V3）——只裁定缺席。
- 不覆盖 B3.2 的 array/combo 行本地相对寻址（V6 deferred）。
- 不改 `showErrorOn` 显示策略本身。
- 不重开 B1.1 已锁定的 V1/V2/V16/V22。
- 不改 `ValidationResult` 不暴露 `cancelled` 的既定契约（B1.1 已锁）。

## Scope

### In Scope

- V3/V10/V13 特征缺口裁定 + 相邻属性锁定 + owner doc 记录。
- V4/V5/V9/V17/V20/V21 回归锚。
- V8/V14/V19 stale 再核裁定。
- V15 端到端锚。
- V18 失败路由裁定 + 必要收敛 + 锁定。
- V23 doc 文档化。
- `form-validation.md` 同步。

### Out Of Scope

- V6 行本地相对寻址（→ B3.2）。
- 新规则 kind / 表达式参数 args 的实现（→ 仅裁定 + 可选 successor 记录）。
- 派生字段机制实现（V3）。
- B1.1 范围（V1/V2/V16/V22）。

## Failure Paths

> 校验运行时不涉及 HTTP/鉴权；本节为内部契约可观测场景，聚焦 V18 裁定结果。

| 场景编号           | 触发                                                                                         | 行为（依 Phase 3 裁定）                                                                                                                                                                                                          | 可重试 | 用户可见表现                                    |
| ------------------ | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------- |
| V18-transport-fail | async 规则 fetch reject（transport/HTTP 失败）经 `validateForm` 入口（submit/manual/commit） | 裁定 A（缺陷收敛，已落地）：走 diagnostics seam（`reportDependentRevalidationFailure` → `env.monitor.onError` + 单次 `env.notify`），**不发**字段错误；form result 仍 `ok:false`（form-level error 在 `errors[]`）；abort 仍重抛 | 否     | 单条 toast（后端 msg），无字段红字，submit 阻塞 |
| V18-rule-throw     | async/sync validator 自身 throw（编程错误）经 `validateForm` 入口（submit/manual/commit）    | 裁定 A（一并收敛，已落地）：与 transport-fail 同走 diagnostics seam、不发字段错误（live catch 不可靠区分 transport vs throw，故不分流）                                                                                          | n/a    | 单条 toast，无字段红字，submit 阻塞             |
| V21-stale-required | required 字段有错误 → `applyChangesAndRevalidate` 写合法值                                   | 字段错误清除、`canSubmit` true，无需第二次 action                                                                                                                                                                                | n/a    | 错误消失，提交按钮可用                          |
| V10-length-coerce  | `minLength`/`minItems` 字段输入非串/非数组值                                                 | 安全短路（`typeof` 守卫），单一非矛盾结果，不产生矛盾错误                                                                                                                                                                        | n/a    | 不误报                                          |

## Test Strategy

本档选择：**必须自动化**

理由：B1.2 含 P0/P1 校验正确性属性，且 V18 涉及确认的行为分叉（可能需 Fix）。依 guide「必须自动化」档：凡涉及 Fix（V18 如裁定为缺陷）的 Proof 项须先红；纯 TEST-GAP 锁定项多数应直接 green（实现已建模），但 V21（applyChangesAndRevalidate 端到端）、V18（路由）存在微妙点，若 Proof 失败即升级为 Fix。审计阶段不预判结论。

特征缺口裁定项（V3/V10/V13/V6）属 Decision，其相邻属性锁定用 Proof。

## Execution Plan

### Phase 1 - 规则语义特征缺口裁定与相邻属性锁定（V3 / V10 / V13 / V6）

Status: completed
Targets: `docs/architecture/form-validation.md`（裁定记录），`packages/flux-runtime/src/__tests__/`（相邻属性锚）

- Item Types: `Decision`、`Proof`

- [x] (Decision, V3) 裁定：Flux 当前不建模「派生/计算字段写入进入校验依赖图」；记录为 documented gap（NOT-ADOPTED amis-parity 派生字段钩子 vs Flux-idiomatic 路径）。裁定是否产 successor 记录。结论写入 `form-validation.md` Dependency Model。
- [x] (Decision, V10) 裁定：Flux 当前无数值范围规则 kind（`min`/`max`/`isInt`），amis-parity 数值规则不采纳为「已声称属性」；V10 底层关切（非数值输入不产生矛盾结果）映射到**现有** length/items 规则。结论写入 `form-validation.md` Rule Template Model。
- [x] (Decision, V13) 裁定：Flux live 规则参数为编译期静态值，无表达式参数化 args 机制；但 owner doc 已把表达式参数列为设计目标（`:55/:683`）并 sketch `CompiledRuleTemplate.args`（`:660-681`，未标非 live）。裁定为「doc 声称的目标态、live 未落地」的 DESIGN-GAP——Phase 4 须把该目标 sketch 显式标注为非 live（或显式记录为未落地 gap），消除 doc/live 不一致；amis-parity 表达式阈值不作为「已声称且已 live」属性。结论写入 `form-validation.md` Rule Template Model。
- [x] (Proof, V10-相邻) 新增聚焦测试：现有 `minLength`/`maxLength`/`minItems`/`maxItems` 规则对非串/非数组输入安全短路、产生单一非矛盾结果（钉住 `validators.ts:127,132` 守卫行为，即 V10 底层关切在现有规则上成立）。
- [x] (Decision, V6) 确认 array/combo 行本地相对寻址显式 deferred 到 B3.2（沿用 predecessor B1.1 裁定），登记到本计划 `Deferred But Adjudicated`。

Exit Criteria:

> 本 Phase 产出裁定 + 相邻属性锚；不新增规则 kind、不实现派生机制。

- [x] V3/V10/V13/V6 四条 Decision 已记录到 `form-validation.md`（裁定结论，非叙事）。
- [x] V10 相邻属性（length/items 非矛盾）聚焦测试存在并通过。

### Phase 2 - 生命周期与程序式 API 回归锁 + stale 再核（V4 / V5 / V8 / V9 / V14 / V15 / V17 / V19 / V20 / V21）

Status: completed
Targets: `packages/flux-runtime/src/__tests__/`（新增 `validation-rule-semantics-and-lifecycle.test.ts` 等），`packages/flux-react/src/__tests__/`（V4 指示器侧，如适用）

- Item Types: `Proof`（如失败则升级为 `Fix`）、`Decision`（stale 再核裁定）

- [x] (Proof, V4) 新增测试：字段 B `requiredWhen:'${A}'`；toggle A → 断言 `effectiveRequired`(B) 指示器翻转 **且** submit-gating 同步翻转（两侧不可分歧）；写 A 使 B 不再 required → submit 允许 B 空。_注：指示器（`flux-react/src/form-state.ts`）与 submit-gating（`flux-runtime` validator）跨包，测试可在 `flux-runtime` 用真实 validator 断 gating 侧、用同一 `Object.is(rule.path, rule.equals)` 谓词锁指示器侧逻辑一致性；若跨包端到端不便，至少钉住两侧共享同一谓词不可分歧。_
- [x] (Proof, V5) 新增测试：input-table 列 A(required) + 列 B(required, `value:'sss'`)；空 A 提交 → A required 错误浮现（B 默认值不抑制 A 规则物化）。
- [x] (Decision, V8) 再核 `plan-68-69-remaining-behaviors.test.ts:205-243` 仍 green 且真实断言嵌套寻址 + 越界拒绝；裁定 V8 stale TEST-GAP = 已覆盖、无需新增。
- [x] (Proof, V9) 新增测试：多 required 字段 + 嵌套 combo required 字段；空提交 → 断言 `onValidateError` 恰好被调用 1 次（聚合单通知）。
- [x] (Decision, V14) 再核 `validators.test.ts:301-383`（pattern fail-closed）仍 green；裁定 V14 LOCKED = 已覆盖、无需新增。
- [x] (Proof, V15) 新增端到端测试：pattern 规则带 author message + 不匹配输入 → 经 `validateCompiledField` 存储的字段错误文本 == author message，且不含正则源。
- [x] (Proof, V17) 新增测试：async 规则 + 快速 A→B→C 变更；让最新 run 完成 → 断言解析的 run 使用值 C（执行时快照，非调度时）。
- [x] (Decision, V19) 再核 `hidden-field-policy.test.ts:136-574` 仍 green；裁定 V19 stale TEST-GAP = 已覆盖、无需新增。
- [x] (Proof, V20) 新增测试：required 字段 + 远程 init 返回空值 + `validateOnChange`；init 后 → 无可见字段错误（即便 summary validity 为假）。
- [x] (Proof, V21) 新增测试：required 字段 A 提交报错 → `applyChangesAndRevalidate` 写合法值 → A 错误清除、`canSubmit` true、无需第二次 action（端到端）。
- [x] (Decision) 若任一 Proof 在 live code 失败：定位根因，升级为 Fix 并修复至 green。_裁定：所有 Proof 在 live code 一次通过（V4 requiredUnless 谓词方向与 V17 abort-aware mock 在编写期校正，非 live defect），无需升级 Fix。_

Exit Criteria:

> 本 Phase 交付 V4/V5/V9/V15/V17/V20/V21 回归锚 + V8/V14/V19 stale 裁定。

- [x] V4/V5/V9/V15/V17/V20/V21 七条 Proof 测试存在并通过（或失败已升级为 Fix 并 green）。
- [x] V8/V14/V19 stale 再核裁定已记录（引用既有测试 file:line）。
- [x] 受影响包 `pnpm --filter @nop-chaos/flux-runtime test`（及 V4 涉及的 `@nop-chaos/flux-react`）通过。

### Phase 3 - V18 失败路由裁定与收敛

Status: completed
Targets: `packages/flux-runtime/src/form-runtime-owner.ts:399-415`（submit 路径）、`form-runtime-values.ts:25-47`（diagnostics seam）、`packages/flux-runtime/src/__tests__/`

- Item Types: `Decision`、`Proof`（裁定为缺陷则含 `Fix`）

- [x] (Decision, V18) 裁定 `validateForm` 入口（submit/manual/commit/system，即 `validateFormPath` 聚合路径，`form-runtime-owner.ts:399-415` catch 对所有 reason 生效）对 async 规则失败（transport/HTTP 失败 vs validator 自身 throw）的路由语义。**裁定结论 = A（统一收敛）**：(A) 所有 async/validator 失败（transport 失败 + validator throw）经 live catch 不可靠区分（`validateCompiledField` 已把非 Error 归一化为 `Error(...,{cause})`，到 catch 处只剩泛型 Error + `isAbortError` 分类），故退回统一裁定 A：所有非 abort 失败走与直接 change/blur 路径及依赖重校验路径一致的 diagnostics seam（`reportDependentRevalidationFailure` → `env.monitor.onError` + `env.notify`），**不发**字段错误；abort 仍重抛。form result 仍标 `ok:false`（form-level error 进 `errors[]` 而非 `fieldErrors[path]`）以阻止 submit 在未知校验态上静默继续。该裁定与 Failure Paths 表 V18-transport-fail「单条 toast、无字段红字」一致，并对 V18-rule-throw 取「一并裁定 A」。
- [x] (Proof, V18) failing-first（裁定 A）：`validation-rule-semantics-and-lifecycle.test.ts` 新增 V18 用例，先红（live 写字段错误）→ 修复后 green：submit 入口 async fetch reject → 断言**不发**字段错误（`fieldErrors[path]` undefined、字段状态无错误）、走 `reportDependentRevalidationFailure` 诊断 seam。
- [x] (Fix, V18) 改 `form-runtime-owner.ts` `validateFormPath` catch（原 399-415）：删除 `fieldErrors[path] = [validationError]`，改为调 `reportDependentRevalidationFailure ?? defaultReportDependentRevalidationFailure`，仅 push form-level error 到 `errors[]`（携带 `cause`），abort 仍重抛。统一收敛（transport + validator throw 同走诊断），不尝试不可靠的 A/B 分流。
- [x] (Proof) Phase 3 的 failing test（裁定 A）转 green；补负向（sync validator throw 也走诊断、无字段错误、诊断 seam 被调）。另更新既有 `form-validation-resilience.test.ts`（原 77-109/111-132）与 `form-runtime-owner-lifecycle.test.ts`「error fidelity」（原 276）至新契约并 green。

Exit Criteria:

> 本 Phase 收敛 V18 分叉并锁定裁定后行为；doc 留 Phase 4 同步。

- [x] V18 裁定已落地：裁定 A 则 `validateForm` 路径走 diagnostics 且不发字段错误、Proof green；裁定 B 则当前字段错误行为被显式锁定并有 Proof。_(采用裁定 A，已落地)_
- [x] `form-validation-resilience.test.ts` 既有断言与裁定一致（裁定 A 则相应更新该测试至新契约并 green）。_(已更新至新契约：throwing 字段走诊断 seam、无字段错误；form-runtime-owner-lifecycle.test.ts error fidelity 同步更新)_

### Phase 4 - owner doc 同步收口

Status: completed
Targets: `docs/architecture/form-validation.md`

- Item Types: `Decision`、`Proof`

- [x] (Decision) 收口同步 `form-validation.md`：V3（派生字段 documented gap）、V10（无数值范围 kind + length/items 非矛盾）、V13（表达式参数=doc 声称的目标态、live 未落地；须把 `:660-681` `CompiledRuleTemplate.args` 目标 sketch 显式标非 live 或记为未落地 gap，消除 doc/live 不一致）、V6（行本地相对→B3.2）、V18（`validateForm` 失败路由裁定结论）、V23（`FormValidationResult.fieldErrors` 失败路径契约）六处与 live code 一致，无「Proposed vs Current」叙事。_(V3/V10/V13/V6 落于 Phase 1 的 Dependency Model / Rule Template Model / 数组行本地小节；V18 落于 Async Validation Semantics 的「Async / Validator Failure Routing」小节；V23 落于 Key Types Summary 的「FormValidationResult.fieldErrors Failure-Path Contract」小节；CompiledRuleTemplate/EffectiveValidationRule/EffectiveRuleMaterialization sketch 全部标注 target-state only。)_
- [x] (Proof) 抽查修改后的 `form-validation.md` 与 live code（`validators.ts` length 守卫、`form-runtime-owner.ts` validateFormPath 路由、`FormValidationResult` 形状）一致。_(length 守卫 `validators.ts:127/132/137/142` 与 V10 文档一致；validateFormPath catch 走 `reportDependentRevalidationFailure ?? defaultReportDependentRevalidationFailure`、不写 fieldErrors、push form-level error，与 V18 文档一致；`FormValidationResult = {ok,errors,fieldErrors}` 与 V23 文档一致)_

Exit Criteria:

- [x] `form-validation.md` 六处裁定/契约已收口且与 live baseline 一致。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_0ff974853ffeVJqYig2302ZZWH`）
- Verdict: `pass-with-minors`
- Rounds: 1（零 Blocker / 零 Major，一轮达成共识）
- Findings addressed:
  - Minor M1（V18 catch 实属 `validateFormPath`，对所有 reason 生效，非仅 submit）→ Failure Paths 表与 Phase 3 文本已收紧为「`validateForm` 入口（submit/manual/commit）」。
  - Minor M2（V13 owner-doc tension：`:55/:683` 已把表达式参数列为设计目标、`:660-681` args sketch 未标非 live；「not a live exported type」标注实为 `:570`）→ 前提事实 2/3、V13 baseline、V13 Decision、Phase 4 均已改为「doc 声称的目标态、live 未落地」，Phase 4 须把目标 sketch 显式标非 live；已修正错误行号引用。
  - Minor M3（V6 源 doc-01、successor B3.2 跟 `04` C1-C13）→ Deferred 记录已注明 V6 并入 B3.2 `04` 跟踪集。
  - Minor M4（V4 指示器/gating 跨包）→ V4 Proof 已加跨包测试形状说明。
  - Minor M5（V18 A/B 分流需错误可区分性）→ Phase 3 Decision 已加「先确认可区分性，否则退回统一裁定」。
  - 审阅者确认：所有 file:line 引用经 live repo 核对准确（含 V10/V13 规则 kind 缺失、V18 `form-runtime-owner.ts:399-415` 分叉、V4/V8/V14/V19/V21 既证）；V3/V10/V13 重分类为特征缺口并锁定相邻属性的处理诚实、不假装测试不存在的规则；V18 不被静默延期（Phase 3 显式 Decision + Proof-before-Fix + Closure Gate 把关）；V6 deferral 诚实；Non-Blocking Follow-ups 无 in-scope live defect 被降级。

## Closure Gates

> 关闭条件：本 section 所有条目及每个 Phase Exit Criteria 全 `[x]` 后，方可将 `Plan Status` 改为 `completed`。

- [x] V3/V10/V13/V6 裁定已记录到 `form-validation.md`；V10 相邻属性锚通过。
- [x] V4/V5/V9/V15/V17/V20/V21 回归锚通过（或失败已升级为 Fix 并 green）。
- [x] V8/V14/V19 stale 再核裁定已记录。
- [x] V18 裁定已收敛并锁定（含对应 Proof）。
- [x] V23 `fieldErrors` 失败路径契约已文档化。
- [x] owner doc `form-validation.md` 与 live baseline 一致。
- [x] 不存在被静默降级到 deferred/follow-up 的 in-scope live defect 或 contract drift（V18 裁定为缺陷并已 landed：submit 路径 catch 改走 diagnostics seam、不发字段错误）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### V6 array/combo 行本地相对跨字段寻址

- Classification: `out-of-scope improvement`（显式 successor 所有权）
- Why Not Blocking Closure: live 无行本地相对寻址机制；predecessor B1.1 已裁定该能力属 B3.2（array/combo 嵌套隔离与校验寻址 C1-C13）的整体范围，B3.2 依赖 B1.1（已 done）而非 B1.2。本计划仅锁定非数组的 projected-owner 路径重定基线（已由 `value-adaptation-and-detail-field.md` 覆盖），不阻塞 B1.2 收口。V6 源自 signal doc `01`，显式并入 B3.2 的 `04` C1-C13 跟踪集，不因 doc-01/doc-04 边界脱落。
- Successor Required: `yes`
- Successor Path: `docs/components/amis-bug-driven-improvement-roadmap.md` B3.2（吸收 V6 入 `04` C1-C13 跟踪集）

## Non-Blocking Follow-ups

- 若 V3/V10/V13 裁定结论认为「Flux 值得有数值范围规则 / 表达式参数 args / 派生字段 revalidation」，仅在本计划产 successor 记录，不在本计划实现（属新功能，非已声称属性的测试/文档债）。
- V11/V12（format 规则真值表、required vs 内容规则词汇）属 P2，归 B7 backlog 评估，不阻塞本计划契约收口。

## Closure

Status Note: B1.2 收口完成。V3/V10/V13 诚实裁定为特征缺口并在 owner doc 记录；V6 显式 deferred 到 B3.2；V4/V5/V9/V15/V17/V20/V21 回归锚已落地（18 tests green）；V8/V14/V19 stale 裁定为已覆盖；V18 裁定为缺陷（adjudication A 统一收敛）并已落地生产修复（submit 路径走 diagnostics seam、不发字段错误、abort 重抛）+ failing-first Proof + 既有测试同步至新契约；V23 `fieldErrors` 失败路径契约已文档化。owner doc `form-validation.md` 六处裁定与 live baseline 一致，CompiledRuleTemplate 等目标 sketch 全标注 target-state only。独立子 agent fresh-session closure-audit PASS。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session (opencode task)
- Evidence: closure-audit（fresh session，未参与执行）。重读全部 4 Phase + Closure Gates；对照 LIVE repo 复核：
  - V18 生产修复核对通过：`form-runtime-owner.ts:400-429` `validateFormPath` catch — abort 重抛（401-403）、路由 `reportDependentRevalidationFailure ?? defaultReportDependentRevalidationFailure`（417-420）、仅 push form-level error 到 `errors[]`（421-428）、**不**写 `fieldErrors[path]`；import `defaultReportDependentRevalidationFailure` 于 `:34` 确认。
  - 新测试文件核对通过：`validation-rule-semantics-and-lifecycle.test.ts`（606 行，18 tests）含 V10（7）/V4（2）/V5/V9/V15/V17/V20（2）/V21/V18（2）proofs，断言非平凡（V18 断 `fieldErrors['code']` undefined + `reportFailure` 被调；V17 abort-aware mock 验证执行时快照用值 C）。
  - 既有测试更新核对通过（非削弱）：`form-validation-resilience.test.ts:77-148`（throwing + non-Error 均断新契约：无字段错误 + 诊断 seam 被调）；`form-runtime-owner-lifecycle.test.ts:232-295`（error fidelity 断 `fieldErrors:{}` + cause 保留 + `reportFailure` 被调）。
  - owner doc 核对通过：`form-validation.md` 含 V3（:762）/V10（:704，length 守卫与 `validators.ts:127/132/137/142` 一致）/V13（:718）/V6（:784）/V18（:1091，与 catch 一致）/V23（:148）六节；CompiledRuleTemplate/EffectiveValidationRule/EffectiveRuleMaterialization 于 :582/:669/:674/:684/:692 全标 target-state only。
  - stale 再核通过：V14 `validators.test.ts:343`（pattern fail-closed）、V8 `plan-68-69-remaining-behaviors.test.ts:238/242`（foreign.path 被拒）、V19 `hidden-field-policy.test.ts:136`（hidden participation）均存在且断言成立。
  - deferred 诚实性核对：V6（行本地相对）真属 B3.2（successor B1.1 done）；V18 裁定为缺陷且已 landed（未被静默降级）；无 in-scope live defect 被移至 follow-up。
  - 复核命令（全部 green）：
    - `pnpm --filter @nop-chaos/flux-runtime exec vitest run src/__tests__/validation-rule-semantics-and-lifecycle.test.ts src/__tests__/form-validation-resilience.test.ts src/__tests__/form-runtime-owner-lifecycle.test.ts` → 3 files / 26 tests passed
    - `pnpm --filter @nop-chaos/flux-runtime typecheck` → pass
    - `pnpm --filter @nop-chaos/flux-runtime test` → 99 files / 1219 passed | 1 skipped（全绿，与执行者声明一致）
  - 注：e2e（playwright）按计划 scope/gates 不在本工作项范围内，未运行。

Follow-up:

- V6 行本地相对跨字段寻址 → successor B3.2（array/combo 嵌套隔离，吸收 V6 入 `04` C1-C13 跟踪集）。
- 可选 successor（仅当裁定为「Flux 值得有」时）：数值范围规则 kind / 表达式参数 args / 派生字段 revalidation——属新功能非测试债，本计划仅裁定缺席，不在本计划实现。
- 无 remaining plan-owned work；B1.2 收口。
