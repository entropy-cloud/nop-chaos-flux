# 2026-08-02 ajax 校验迁移进 action definition（Ajax Validation Migration）

> Plan Status: active
> Last Reviewed: 2026-08-02
> Source: `docs/architecture/nested-schema-field-classification.md`（v8 §3.7：definition 锚定 registry ∪ switch 双重锚、字段约束载体 SchemaFieldRule 扩展）、`docs/plans/2026-08-02-1-nested-schema-field-classification.md`（Plan 1）
> Related: `docs/plans/2026-08-02-2-nested-schema-mechanism-unification.md`（Plan 2）

## Purpose

把 `validateActionShape` 中 ajax 参数的**硬编码校验分支**迁移进内建 action definition（fieldRules 校验接管），消除"definition + registry + switch + 硬编码"三处重复中的硬编码副本；同时把 `validateApiSchemaShape` 的职责收窄为 source 场景（url 对象校验），action 场景由 definition 校验接管。

## Current Baseline

> 已逐条核对 live repo。

- **前置依赖**：Plan 1（active）P6 落地内建 action definition 表（含 `ajax: { fieldRules: { url: 'prop', method: 'prop', data: 'prop', params: 'prop' } }`）后，本计划开始。
- **现状**：`validateActionShape`（`shape-validation-rules.ts:139+`）对 `value.action === 'ajax'` 走硬编码分支（:212-232）：args 缺失报错 + `validateApiSchemaShape`（只查 `url` 是非空字符串，:106-137）。
- **`validateApiSchemaShape` 三个调用点**：
  - `shape-validation-rules.ts:224` — **action 场景**（ajax 硬编码分支内）→ 本计划迁移；
  - `shape-validation-rules.ts:395` — **source 场景**（source 字段的 url 对象，`invalid-source-shape`）→ 保留；
  - `shape-validation-node-fields.ts:340` — **data-source 场景**（dataSourceSchema.args 的 url 对象）→ 保留。
- **重复现状**：action 参数信息三处并存——`BUILT_IN_ACTION_REGISTRY`（constants.ts:18-34）、`runBuiltInAction` switch（built-in-actions.ts）、`validateActionShape` 的 ajax 硬编码分支。definition 表落地后硬编码分支即冗余。

## Goals

- `validateActionShape` 的 ajax 硬编码分支（:212-232）删除，由 action definition 的 fieldRules 校验接管。
- `validateApiSchemaShape` 的 action 场景调用（:224）移除；source/data-source 场景（:395、shape-validation-node-fields.ts:340）保留不变。
- ajax 校验行为与迁移前一致（url 非空字符串），并按 fieldRules 增强（method 字符串、data/params 对象形状）——增强项有契约测试锁定。
- 全量 `typecheck/build/lint/test` 通过。

## Non-Goals

- **不**改 source/data-source 场景的 `validateApiSchemaShape` 用法（设计内语义）。
- **不**重构 `classifyActionSelector`（选择器解析职责不变）。
- **不**动 `runBuiltInAction` switch（运行时 dispatch 不变）。

## Scope

### In Scope

- `packages/flux-compiler/src/schema-compiler/shape-validation-rules.ts`：ajax 硬编码分支删除、action 场景调用移除。
- action definition 的 ajax 校验消费（flux-compiler 侧接入——若 Plan 1 的 definition 校验管道已就绪则直接消费）。
- 契约测试：ajax 校验行为对照（迁移前后一致）+ 增强项（method/data/params 形状）。

### Out Of Scope

- action definition 表本身（Plan 1 P6）。
- source/data-source 校验（保留）。
- host（nop-chaos-next）侧改动。

## Failure Paths

| 场景              | 触发                     | 行为                | 可重试 | 表现         |
| ----------------- | ------------------------ | ------------------- | ------ | ------------ |
| ajax 校验行为回退 | 迁移遗漏 url 非空校验    | 非法 url 静默通过   | 否     | 对照单测锁定 |
| 误删 source 场景  | 迁移时误移除 :395/:340   | source url 校验失效 | 否     | 对照单测锁定 |
| 增强项误伤        | data/params 形状校验过严 | 合法 schema 报错    | 否     | 全量测试覆盖 |

## Test Strategy

本档选择：`必须自动化`

校验行为迁移是编译核心路径——对照单测（迁移前后 ajax/source/data-source 三场景行为一致）+ 增强项断言锁定。

## Execution Plan

### Phase 1 - ajax 硬编码分支迁移

Status: planned
Targets: `packages/flux-compiler/src/schema-compiler/shape-validation-rules.ts`（+ `packages/flux-core/src/types/schema.ts`——SchemaFieldRule 约束扩展落点，若 Plan 1 未落地）

- Item Types: `Fix | Decision | Proof`

- [ ] **Decision（约束机制）**：字段约束载体采用设计 v8 §3.7 裁定——SchemaFieldRule 扩展 required/valueType（扩展 boolean → string/number/object/array）/nonEmpty + **表达式豁免语义（只认 `${` 前缀，判据与 `FormulaCompiler.hasExpression`（flux-formula/src/compile/formula-compiler.ts:98-100，`includes('${')`）语义对齐——`$@{` 非活跃语法不识别；表达式字符串跳过类型/非空校验——运行时求值）**；fieldRules 记录值形态 `Record<string, Omit<SchemaFieldRule, "key">>`；action definition 增加 argsRequired（args 必填语义）；校验器按约束消费（declaration-driven）；约束消费范围 = schema-definition/action definition（顶层 fields 不消费）
- [ ] 确认 Plan 1 的 action definition 校验管道已就绪（可观测判据：constants.ts 存在 ajax definition 且**约束形态齐全**——fieldRules 对象形态含 required/valueType/nonEmpty、argsRequired 存在、validateActionShape 有按 definition 分支；未就绪 → 本 Phase 标记 blocked，依赖 Plan 1 P6 先落地）
- [ ] 删除 `validateActionShape` 的 ajax 硬编码分支（:212-232：args 缺失报错 + validateApiSchemaShape 调用）——语义由 definition 的 argsRequired + fieldRules 约束（url required/string/nonEmpty、method string、data/params object）接管
- [ ] 移除 `validateApiSchemaShape` 的 action 场景调用（:224）；**保留** source（:395）与 data-source（shape-validation-node-fields.ts:340）调用
- [ ] ajax 校验由 definition 消费：args 缺失诊断（argsRequired，保留语义：'ajax actions require args payload'）+ **args 存在但非对象 → 单诊断**（保留 'Action args must be an object when provided'，收敛现有双发射）+ url 非空字符串（required/string/nonEmpty）+ method 字符串 / data·params 对象形状（fieldRules 增强，表达式豁免）
- [ ] 对照单测：迁移前后 ajax 校验行为一致（按实际诊断集合：args 缺失报错、url 缺失/非字符串/空串、api 非对象——含现有双诊断发射现状与 schema-compiler-shape-validation-compile.test.ts:259 锁定的语义）；**表达式字符串用例：`data: '${formData}'` / `url: '${apiUrl}'` 通过（schema-compiler-xui-actions.test.ts:160 锁定的合法模式）**；source/data-source 场景行为不变；增强项（method 字符串、data/params 对象——非表达式时）断言

Exit Criteria:

- [ ] `shape-validation-rules.ts` 无 ajax 硬编码残留（grep `value.action === 'ajax'` 在 shape-validation-rules 零命中）；`validateApiSchemaShape` 仅 source/data-source 调用
- [ ] 对照单测 + 增强断言通过；局部 `tsc -p tsconfig.build.json`（flux-compiler）通过

### Phase 2 - 回归与文档核对

Status: planned
Targets: 全仓 + `docs/architecture/nested-schema-field-classification.md`

- Item Types: `Proof | Follow-up`

- [ ] 全仓 grep：`validateApiSchemaShape` 调用点仅定义 + source/data-source 两处
- [ ] 设计文档 v8 §3.7 与 live baseline 一致（硬编码分支已消除、字段约束载体与 definition 样例相符）；daily log 记录

Exit Criteria:

- [ ] grep 证据（validateApiSchemaShape 仅定义 + source/data-source 调用）
- [ ] 设计文档无漂移（§3.7 与 live 一致；全量验证见 Closure Gates）

## Draft Review Record

- Reviewer / Agent: 三轮独立子 agent（fresh sessions）：第一轮（revised，M-1 约束机制缺失）→ 修订 → 第二轮（revised，N-1 表达式豁免）→ 修订 → 第三轮（pass-with-minors）
- Verdict: `pass-with-minors`（零 Blocker / 零 Major）
- Rounds: 3
- Findings addressed:
  - M-1（SchemaFieldRule 约束扩展 required/valueType/nonEmpty + argsRequired + 前置判据 + blocked）
  - N-1（表达式豁免语义 `${` 判据 + 对照单测表达式用例）
  - N-2~N-6（args 非对象单诊断、可观测判据、flux-core Targets、fieldRules 记录形态 Omit<key>、约束消费范围）
  - Minor（hasExpression 判据指名、$@{ 澄清）

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部 `[x]` 后，方可 `Plan Status: completed`。

- [ ] ajax 硬编码分支已删除（grep 证据），action 场景由 definition 校验接管
- [ ] `validateApiSchemaShape` 仅 source/data-source 场景调用（grep 证据）
- [ ] ajax 校验行为对照（迁移前后一致）+ 增强项契约测试通过
- [ ] 不存在被静默降级到 deferred/follow-up 的 in-scope 项
- [ ] 设计文档 §3.7 与 live baseline 一致
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

> 无 in-scope deferred 项。

## Non-Blocking Follow-ups

- 内建 action definition 与 `classifyActionSelector` 的关系文档化（选择器解析 vs 参数校验职责划分）——治理项（与 Plan 1/2 同项，任一处落地即可）。
- host（nop-chaos-next）重打包验证——跨仓库 successor。

## Closure

Status Note: （完成或关闭时填写）

Closure Audit Evidence:

- Auditor / Agent: （待独立审计）
- Evidence: （待定）

Follow-up:

- （待定）
