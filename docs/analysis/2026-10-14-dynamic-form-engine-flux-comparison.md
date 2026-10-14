# 动态表单引擎四层能力模型 vs nop-chaos-flux 对比分析

> 日期：2026-10-14
> 对比输入：公众号文章《动态表单引擎从设计到落地：B 端产品经理的实战框架》（以下称"文章模型"），其核心主张是把动态表单引擎拆为四层能力：动态表单 / 校验 / 联动 / 版本管理，并以 ERP 采购申请表单为落地案例。
> 对照基线：本仓库 live 代码与架构文档（非规划态）。所有结论附证据路径。

---

## 1. 对比对象与方法

文章模型是一个**垂直切片式的表单引擎产品方案**：面向 B 端产品经理，强调配置化交付（5 天 → 1 天）、业务人员可配、版本可回滚。其规则系统采用**专用算子路线**——每种联动配一个专用 DSL 节点（`when/then` 赋值+显隐、校验规则列表、选项联动各一套）。

nop-chaos-flux 是一个**通用低代码渲染运行时**（AMIS 的现代重写）：表单只是 120+ 渲染器中的一组，联动/校验/动作由统一的表达式引擎与 action 系统承载。其规则系统采用**通用算子路线**。

方法：按文章自己的四层框架打分（这是它自己提出的评估标准），再补一章讨论模型一致性——因为"哪个模型更简单"取决于度量口径（schema 种类数 vs 表达力深度 vs 作者上手门槛）。

---

## 2. 四层能力对照总表

| 文章能力层                  | nop-chaos-flux                                                                                                         | 判定                   |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 动态表单（Schema 描述一切） | `BaseSchema`/`SchemaInput` → `TemplateNode` → `CompiledTemplate` 编译管线；字段类渲染器 ~60 个，横跨 10 个 renderer 包 | ✅ flux 更强           |
| 校验                        | 编译期校验图 + 依赖图 + 触发/显示分离 + 异步规则 + 外部错误注入；两个已记录 gap（§3.1）                                | ✅ flux 更强（含例外） |
| 联动                        | 全表达式 meta/prop + reaction + data-source + 多层防死循环                                                             | ✅ flux 更强           |
| 版本管理                    | **无**（无 schema 版本、无发布/回滚、无按版本渲染存量数据）                                                            | ❌ 文章更强            |

---

## 3. 逐层分析

### 3.1 校验引擎

文章列出六类规则（必填/格式/范围/正则/远程/自定义函数）与三种触发时机（失焦/变化/提交前）。

**flux 覆盖情况**（`packages/flux-core/src/types/validation.ts`、`packages/flux-runtime/src/validation/validators.ts`、`docs/architecture/form-validation.md`）：

- **规则类型**：`required`、`requiredRange`、`atLeastOneFilled`、`minLength`/`maxLength`、`minItems`/`maxItems`、`pattern`（编译期预编译 + ReDoS 检查，`packages/flux-compiler/src/validation-lowering.ts`）、`email`/`url`/`integer`/`format`、跨字段 `equalsField`/`notEqualsField`/`requiredWhen`/`requiredUnless`（支持 `../` 相对路径）、数组 `uniqueBy`、异步 `kind: 'async'`（内嵌 `ActionSchema`，带 debounce + AbortSignal + 竞态取消）。
- **触发时机**：`validateOn: 'change' | 'blur' | 'submit'` 字段级可配（`packages/flux-core/src/types/schema.ts:117`），且 `showErrorOn: 'touched'|'dirty'|'visited'|'submit'` 把"何时跑校验"与"何时显示错误"**分离**——比文章的三分法更细一档。
- **跨字段联动重校验**：编译期构建 `dependents` 依赖图（`packages/flux-core/src/validation-model.ts`），值变更后 `revalidateDependents()` 做环安全 BFS 闭包重校验（`packages/flux-runtime/src/form-runtime-owner.ts:64-128`）。文章的手写 `when/then` 无法系统化这一点。
- **后端校验**：`applyExternalErrors({ sourceId, errors, replace? })` 是 `ValidationScopeRuntime` 一等 API，服务端错误可按 source 注入/替换/局部清除。

**两个诚实记录的 gap**（`docs/architecture/form-validation.md`）：

1. **无数值区间规则**（`min`/`max` 数字区间、日期区间）——文章的"范围校验"在 flux 里需要 pattern 或表达式绕行（line 705-719 裁决在案）。
2. **校验规则参数是编译期静态的**——`required: "${...}"` 可以（它是 prop，走表达式），但 `maxLength: "${x}"` 不行（`CompiledValidationRule.rule` 不求值表达式参数，line 670-729；expression-arg dependencies 未落地）。
3. 文章的"自定义函数"规则：flux 无独立的 custom-function kind，复杂逻辑走表达式 + 异步规则内嵌 action 组合覆盖。

**判定**：flux 在编译期保证、依赖图、触发/显示分离、外部错误注入上全面占优；数值区间与规则参数表达式化是真实缺口，但不改变整体判断。

### 3.2 字段联动

文章定义五类联动（显隐/只读/赋值/选项变化/校验变化），配一个 `when/then` JSON 示例，防循环机制为"联动层级上限 5 层"。

**flux 覆盖情况**：

- **显隐**：`when`/`visible`/`hidden` 编译进 `NodeMetaProgram`，随 scope 依赖追踪响应式重求值（`packages/flux-runtime/src/node-runtime.ts:180-243`）。`when=false` 停用整棵子树，`visible=false` 隐藏但仍参与校验——语义有意区分（`flux-guide/design-patterns/conditional.md:54`）。
- **只读/必填**：`readOnly`/`required` 是普通 schema prop，任何 prop 值都可写 `"${expr}"`，同一表达式引擎求值。
- **赋值**：`<reaction>` 节点 `watch: "${price*quantity}"` + `setValue` action（`flux-guide/18-reactions.md` 模式 3）；或 `kind: 'reaction'` 渲染器字段（`CompiledReactionPlan`，响应式+指令式混合，`packages/flux-runtime/src/renderer-reaction-handle.ts`）。
- **选项刷新（级联）**：`data-source` 节点 + `dependsOn`/`sendOn` + `options: "${cities}"`（`flux-guide/design-patterns/cascading-select.md` 同型模式）；或 `refreshSource` 指令式刷新。
- **校验变化**：动态 `required: "${method==='email'}"` + 独立校验依赖图自动重校验。

**防循环是多层的**，远超文章的单一层级上限：

| 机制                                                                  | 位置                                                                  |
| --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 单 reaction 级联深度上限 100                                          | `packages/flux-runtime/src/async-data/reaction-runtime-helpers.ts:19` |
| 全局级联深度上限 200                                                  | `reaction-runtime.ts:18,53` + `cascade-guard.ts`                      |
| 自写过滤 `ignoreWritesTo` / 源自滤自身根                              | `renderer-reaction-handle.ts:174-183`、`scope-change.ts`              |
| 空 `dependsOn` fail-closed（真实 fetch→write→fetch 死循环事故的修复） | `renderer-reaction-handle.ts:88-96`                                   |
| microtask 批处理 + 去重                                               | `reaction-runtime.ts` `scheduleReaction`                              |

**判定**：五类联动全覆盖且同源（同一表达式引擎 + 同一依赖追踪），防循环机制工程成熟度显著高于文章描述。

### 3.3 动态表单（Schema 模型）

- flux：`BaseSchema`（`packages/flux-core/src/types/schema.ts:102`）+ 编译管线 `SchemaInput → TemplateNode → CompiledTemplate`（`docs/architecture/flux-core.md`）。字段类渲染器：form 包 ~22 个（input-text/select/date 系列/signature/cron-editor 等）+ form-advanced 包 ~19 个（input-table/combo/picker/transfer/condition-builder/array-field 等），另有 data/layout/content/mobile 等包的结构性组件。
- 文章：字段配置 JSON（key/label/type/required/validations/events/defaultValue），类型列举约 6 类。
- 附带：flux 有**编译期 schema 校验**（`validateSchema` → `unknown-renderer-type`、`propContracts` 形状校验 `invalid-property-value`、渲染器自定义 schemaValidator，`docs/architecture/schema-file-validator.md`）——文章的"配置错误快速回滚"在 flux 侧对应的预防性机制是**发布前静态诊断**，方向不同但更上游。

**判定**：表达力与工程配套（静态诊断、propContracts）flux 占优。

### 3.4 版本管理 — 文章唯一赢面

flux 明确**没有**表单/页面 schema 的版本管理：

- `BaseSchema`/`SchemaInput` 无 `version` 字段；无发布、无回滚、无 `schema_version` 按版本渲染存量数据、无字段迁移。
- 相关但**非等价**的既有物：
  - `xui:version`：宿主能力清单（capability manifest）的版本选择器（`packages/flux-compiler/src/schema-compiler/shape-validation-traversal.ts:104-145`），解决"片段按哪个宿主契约版本编写"，不是文档版本管理。
  - print/taskflow 的常量 `schemaVersion` 字面量：无迁移代码。
  - `flow-designer-core` 的 `config-migration.ts`：仅 designer 配置（1.0.0 → 1.1.0），不涉表单 schema。
  - editor undo/redo：会话级，非版本历史。

**定性**：flux 是渲染器/运行时，不管模板存储、发布流与存量数据——版本管理是**宿主应用层职责**。但按文章自己的四层框架打分，这项为 0。若把文章方案落到 flux 上，`schema_version` 存数据 + 按版本加载对应 schema JSON + 字段停用不物理删除，均可在宿主侧实现（flux 渲染器无状态，天然支持多版本共存渲染），只是框架不内置。

---

## 4. 模型一致性：专用算子 vs 通用算子

这是"哪个模型更简单"的真正分歧点。

### 4.1 表达式统一 → schema 形状种类更少

文章模型每种联动配一个**专用 DSL 节点**：显隐一套 `when/then`、赋值一套、选项刷新一套、校验变化一套，校验又是独立的 `validations[]`。加一种新联动 = 加一种新规则类型 + 新解释器。

flux 是**通用算子路线**：`when`/`visible`/`disabled`/`readOnly`/`required` 以及**任意 prop** 都是同一个 `${expr}` 求值机制，走同一个 `NodeMetaProgram`/`propsProgram` 编译 + 同一套 scope 依赖追踪。联动类型不增加 schema 种类，只是表达式写法不同。

> 度量方式决定结论：文章的 schema **种类多但每种浅**；flux 的**种类少但表达力深**。前者"每个都简单"，后者"整体更简单"。

### 4.2 Action 统一 → 一个原语覆盖所有副作用

文章里校验触发、联动赋值、远程查重、">5000 触发审批"是四套互不相干的机制。flux 全部落到 `ActionSchema` + `dispatch()` 一个入口：

- 赋值联动 = reaction + `setValue`/`setValues`
- 远程校验 = `kind:'async'` 规则内嵌 `ajax` action（同一机制复用）
- 级联选项 = `data-source` 内嵌 action + `dependsOn`/`sendOn`
- 审批分支 = 任意 action 挂 `when` 守卫
- 还可组合：action 数组、`component:*`、`ns:method` 宿主扩展（`docs/architecture/action-scope-and-imports.md`）

同一个 action 既能出现在 `onClick`，也能出现在 reaction、data-source、异步校验里——文章的规则 JSON 只能自己解释自己。

### 4.3 一致性的两处裂缝（诚实记录）

1. **校验规则参数不可表达式化**（§3.1 gap 2）：`required: "${...}"` 与 `maxLength: "${x}"` 行为不一致——前者是 prop 通道，后者是编译期静态规则参数。这是"全表达式"主张的字面例外。
2. **meta 通道与 prop 通道的分界**：`readOnly`/`required` 不在 `NodeMetaProgram` 里而在 props；`when` vs `visible` 语义不同（子树停visual vs 仍参与校验）。对作者是需要记忆的规则，算一致性的裂缝——但两处都是有意设计（校验静态化换编译期依赖图；`when`/`visible` 分离换校验边界控制），不是疏漏。

### 4.4 "简单"的两种含义

- **模型简单度**（原语数量、正交性、特殊情形数）：flux 更简单。概念总量 = 表达式 + action + reaction + data-source 四个，两两正交；文章概念总量少（rules + events 两个）但每个的组合能力弱，新增需求要加新节点。
- **配置表面的上手门槛**：文章更简单。`when/then` 对业务人员可读、可拖拽生成、不需要会写表达式；flux 的 `${price*quantity}` + scope/依赖追踪概念对业务人员是门槛，对开发者不是。

---

## 5. 结论

1. **校验与联动两个核心层，flux 更灵活更强大**——且是编译期保证（预编译、依赖图、静态诊断）而非运行时规则解释器。
2. **模型一致性上 flux 更胜**：全表达式 + 单 action 原语使 schema 形状更少、更正交；两处已记录裂缝不改变整体判断。
3. **"更简单"分口径**：模型本身更简单（通用算子少而深）；配置上手更复杂（要求会写表达式）。文章模型对"业务人员自助配置"这个特定目标仍是合理设计。
4. **版本管理是文章唯一明确赢面**，且定性为宿主应用层职责：flux 无内置，落地方案（数据存 `schema_version` + 按版本加载 schema + 字段停用语义）需宿主自建，但 flux 渲染器无状态天然兼容多版本共存。
5. **范围差异提醒**：文章是"采购申请表单"一个垂直切片的产品方案；flux 同一 runtime 同时覆盖表单、表格、CRUD、对话框、整页编排。直接对比时注意口径——文章赢在产品化包装（交付周期、业务人员可配、版本流），flux 赢在运行时地基（表达力、一致性、工程配套）。

### 适用边界建议

| 场景                                          | 更合适                                       |
| --------------------------------------------- | -------------------------------------------- |
| 已有 nop/flux 宿主，需要任意复杂业务页面      | flux（表单只是其一角）                       |
| 追求业务人员零代码自助配表单 + 内置版本发布流 | 文章模型（或 flux + 宿主自建设计器/版本层）  |
| 深度联动 + 远程校验 + 编译期可诊断            | flux（文章模型的规则解释器需自行补静态分析） |

---

## 附：主要证据路径索引

| 主题                   | 路径                                                                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Schema 类型            | `packages/flux-core/src/types/schema.ts`                                                                                                  |
| 校验规则类型/编译      | `packages/flux-core/src/types/validation.ts`、`packages/flux-compiler/src/validation-lowering.ts`、`docs/architecture/form-validation.md` |
| 校验依赖图/重校验      | `packages/flux-core/src/validation-model.ts`、`packages/flux-runtime/src/form-runtime-owner.ts`                                           |
| 外部错误注入           | `docs/architecture/form-validation.md` §external errors、`form-runtime-owner.ts:130-149`                                                  |
| Meta 表达式响应式      | `packages/flux-runtime/src/node-runtime.ts`                                                                                               |
| Reaction 运行时/防循环 | `packages/flux-runtime/src/async-data/reaction-runtime.ts`、`reaction-runtime-helpers.ts`、`docs/architecture/dependency-tracking.md`     |
| Reaction 指南          | `flux-guide/18-reactions.md`、`flux-guide/design-patterns/cascading-select.md`                                                            |
| Action 体系            | `packages/flux-core/src/types/actions.ts`、`packages/flux-action-core/src/action-dispatcher/built-in-actions.ts`                          |
| Schema 静态校验        | `docs/architecture/schema-file-validator.md`、`packages/flux-compiler/src/schema-compiler.ts`                                             |
| 版本管理缺失证据       | `BaseSchema` 无 version 字段；`xui:version` 见 `docs/architecture/capability-projection-manifest.md` §xui:version                         |
