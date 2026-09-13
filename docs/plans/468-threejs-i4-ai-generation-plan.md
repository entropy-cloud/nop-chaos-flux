# 468 Three.js 集成 I4.1 AI 场景生成计划

> Plan Status: active
> Last Reviewed: 2026-09-13
> Source: `docs/backlog/threejs-integration-roadmap.md`（I4.1）、`docs/components/threejs-integration/design-ai-generation.md`（v5）
> Related: 前置 plan 463–467（closed）；消费 I2.1/I2.2 的 schemas（ModelConfig 判别联合、TransformConfig/AnimationConfig）

## Purpose

收口 I4.1：AI 场景生成的接口面与验证门禁——JSON Schema 资产、SchemaValidator（结构 + 语义双层）、AISchemaGenerator（确定性模板 + LLM 注入 + 修正回路）。LLM 输出一律经验证门禁才可进入渲染管线。

## Current Baseline

- 设计契约（v5，design-ai-generation.md）：生成管线（LLM → validate → 修正回路 ≤ N 轮 → schema 节点）；SchemaValidator 契约（`validate(config): ValidationResult`，错误聚合一次返回、JSON Pointer 风格 path、确定性语义错误码：modelId 悬挂、id 重复、camera.position 三元）；`LlmProvider { complete(prompt): Promise<string> }` 注入；确定性模板 `generateSchema(SceneGenerationInput)`（slug 派生 id + 空串/非字母开头回退 `model-<序号>` + dataPoints 归属 models[0]，布尔点→visible、数值点→material.color+range）；§5 测试档位必须自动化（validator 表驱动、generateSchema 过自身 validator、generateFromPrompt mock provider）。
- live schemas（I2.2 后）：`ModelConfig` url 可选 + `primitive` 双可选字段（运行时 XOR 解析）、`LightConfig.groundColor`、`DataBinding.transform/condition`——JSON Schema 资产须覆盖当前形状（v5 §2 措辞「以 TS 类型为单一事实源」）。
- `flux-renderers-3d` 现状：无 `src/ai/` 模块；`tsconfig.base.json` `resolveJsonModule: true`。
- 无真实 Gemini API 依赖（v5 明确 provider 注入 + mock 测试；Gemini 具体集成属 plan 464 Deferred 正式裁定归后继——本计划仅交付 provider 注入面）。

## Goals

- `src/ai/threejs-schema.json`（draft-07）：覆盖 v5 `ThreeCanvasSchema` 当前形状（含 primitive 判别、groundColor、transform/condition）。
- `SchemaValidator`：结构校验（type const、scene 必填、三元数组、枚举、ID pattern）+ 语义校验（modelId 悬挂 `binding-target-missing`、id 重复 `model-id-duplicate`、camera.position 非三元 `camera-position-invalid`）——错误一次聚合返回，JSON Pointer path。**ModelConfig 判别口径与 live renderer 一致：仅拒双空（既无 url 也无 primitive）；双源沿用 renderer 语义（primitive 优先）不作门禁违规。**（ModelConfig 为单 interface 双可选字段 + 运行时 XOR 解析，非 TS 判别联合。）
- `AISchemaGenerator`：确定性 `generateSchema`（slug 派生 + 回退 + 归属 models[0]）输出过自身 validator；`generateFromPrompt`（provider 注入 + 围栏剥离 + 修正回路 ≤ maxRepairRounds 默认 2）。
- 全部 Proof 先行（先红后绿），覆盖率四维 ≥90 维持。

## Non-Goals

- 真实 Gemini API HTTP 集成与提示词工程调优（plan 464 Deferred：Gemini 适配在有真实消费时按 provider 注入面实现，不阻塞本计划）。
- three-canvas 渲染管线改动。
- per-primitive 事件（plan 466 Deferred）。

## Scope

### In Scope

- `packages/flux-renderers-3d/src/ai/threejs-schema.json`、`schema-validator.ts`、`schema-generator.ts`、`llm-provider.ts` 及测试。
- `src/index.ts` 导出更新。

### Out Of Scope

- 渲染管线、其他包改动。

## Failure Paths

| 可测场景编号          | 触发                      | 行为                                                                       | 可重试           | 用户可见表现               |
| --------------------- | ------------------------- | -------------------------------------------------------------------------- | ---------------- | -------------------------- |
| llm-invalid-json      | provider 返回非 JSON 文本 | 剥离代码围栏后仍解析失败 → 计一次失败轮                                    | 是（修正回路内） | 轮次耗尽后 reject 聚合错误 |
| llm-validation-failed | 生成物未过 validator      | errors 以 path/message 回喂 provider 修正 ≤ N 轮                           | 是（回路内）     | 轮次耗尽后抛出聚合错误     |
| schema-empty-models   | models 数组为空           | 结构合法（渲染空态）但 generateSchema 确定性模板对空 models 输入返回空场景 | —                | 由调用方决定               |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`（design-ai-generation.md §5 明确 validator 表驱动 + mock provider 三类文本；AI 输出门禁是安全契约）。全部 Proof 先行。

## Execution Plan

### Phase 1 - JSON Schema 资产与 SchemaValidator（Proof 先行）

Status: completed
Targets: `src/ai/threejs-schema.json`, `src/ai/schema-validator.ts`

- Item Types: `Proof | Fix`

- [x] 先写失败测试（红，表驱动）：合法最小配置通过；缺 scene/type 错 → 聚合 path；camera.position 非三元 → `camera-position-invalid`；models id 重复 → `model-id-duplicate`；binding target.modelId 悬挂 → `binding-target-missing`；id pattern 违例；rotation 二元数组；双空（无 url 无 primitive）→ 结构违规；双源（url+primitive）→ 合法（沿用 renderer primitive 优先语义）；**models 空数组为结构合法**（渲染空态，design §5 用例语义显式化）。
- [x] 撰写 `threejs-schema.json`（draft-07，覆盖 v5 形状：primitive 判别、groundColor、transform/condition、events 自由对象）。
- [x] 实现 SchemaValidator（validate 聚合 + getSchema）。**校验机制声明**：validate() 为手写结构检查（确定性错误码与 JSON Pointer 精确度所需）；threejs-schema.json 经 getSchema() 供编辑器/AI 提示消费；两者一致性由常驻测试守卫（generateSchema 类型化输出过 validator + getSchema 与 TS 抽查）。

Exit Criteria:

- [x] schema-validator 单测全绿（先红后绿；表驱动含全部语义错误码）。
- [x] getSchema 返回的 JSON Schema 与 TS 类型抽查一致（≥5 处字段）。

### Phase 2 - 确定性生成与 LLM 修正回路（Proof 先行）

Status: completed
Targets: `src/ai/schema-generator.ts`, `src/ai/llm-provider.ts`

- Item Types: `Proof | Fix`

- [x] 先写失败测试（红）：generateSchema——slug 派生（含纯中文名回退 `model-<序号>`）、dataPoints 绑定归属 models[0]（布尔→visible、数值→material.color+range）、空 models 输入 → 空场景（无 bindings）过自身 validator；输出过自身 validator 即绿；generateFromPrompt——mock provider 返回合法 JSON / 围栏包裹合法 JSON / 持续非法（修正轮耗尽 reject 聚合错误）/ 首轮非法次轮合法（修正回路生效，**捕获第二轮 prompt 断言含首轮错误 path/message——errors 确实回喂**）。
- [x] 实现 `LlmProvider` 接口、`AISchemaGenerator.generateSchema/generateFromPrompt`（围栏剥离 + validate + errors 回喂修正）。

Exit Criteria:

- [x] schema-generator 单测全绿（先红后绿；含纯中文 slug 回退用例）。
- [x] generateSchema 输出过 SchemaValidator（不变式断言）。

### Phase 3 - 全量验证与收尾

Status: completed
Targets: 仓库级

- Item Types: `Proof`

- [x] 根 `pnpm typecheck`/`build`/`lint`/`test`/`check` 全绿（断言归 Closure Gates，此处为执行动作）。
- [x] design-ai-generation.md 漂移回写核对 + `docs/logs/` 记录 + roadmap I4.1 状态随 plan 生命周期同步。

Exit Criteria:

- [x] 漂移回写（或无漂移声明）与 `docs/logs/` 记录在案；roadmap 状态同步。

## Draft Review Record

> 由独立子 agent（fresh session）填写。

- Reviewer / Agent: independent sub-agent（general-purpose fresh session）
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed: R1 fail（3 Major / 4 Minor）→ M-1 validator 仅拒双空、双源沿用 renderer primitive 优先语义（Goals + Phase 1 红测双向用例）；M-2 Phase 1 补「models 空数组结构合法」+ Phase 2 补「空 models → 空场景过自身 validator」（Failure Path ↔ Proof 一一对应）；M-3 Baseline 禁用措辞删除；m1 Deferred 承认对 464 successor 义务的再裁定 + closure 文档同步义务两条；m2 校验机制声明（手写校验为来源、schema 文档供消费、常驻测试守卫）；m3 修正回路红测增 errors 回喂断言；m4 失败表现统一。R2 定向复核 pass-with-minors（0B/0M），残留 3 条文字/实现期 polish 已顺手落盘（判别措辞统一、术语等价保留、schema 资产不硬编码 oneOf 口径）。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope confirmed contract drifts 已收敛（校验机制声明 + generateSchema primitive 回写已入分册）
- [x] 行为/契约结果已达成（validator 门禁 + 确定性生成过自身门禁 + LLM 修正回路可用）
- [x] 必要 focused verification 已完成（Phase 1–2 focused tests，先红后绿）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] 受影响的 owner docs 已同步（design-ai-generation.md 漂移回写；`docs/logs/`）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck` 40/40
- [x] `pnpm build` 40/40
- [x] `pnpm lint` 40/40
- [x] `pnpm test` 73/73 任务 12,329 passed / 0 failed（3d 包 177 测试）
- [x] `pnpm check` exit 0

## Deferred But Adjudicated

### Gemini 适配与提示词工程

- Classification: `out-of-scope improvement`（对 plan 464 移交的 successor 义务**再裁定**：464 Deferred 曾写「Successor Required: yes → I4.1 计划」；本计划交付 provider 注入面后，剩余的提示词工程与 HTTP 适配再裁定为 out-of-scope improvement）
- Why Not Blocking Closure: v5 冻结的是接口面与验证门禁；提示词调优与 HTTP 适配不改变任何已冻结契约。
- Successor Required: `no`
- Successor Path: 无（出现真实消费时按 `LlmProvider` 面实现 Gemini 适配）
- Closure 文档同步义务：closure 时须 (a) 同步 design-ai-generation.md §4「I4.1 提供 Gemini 适配与提示模板」措辞为实际交付面；(b) roadmap I4.1 行内容含「Gemini API 集成」——状态置 done 与行内容不符的部分**标记人工评审**（roadmap 结构调整归人工），本计划不做行内容改写。

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 待关闭时填写

Closure Audit Evidence:

- Auditor / Agent: 待 closure audit
- Evidence: 待定

Follow-up:

- 无（Gemini 适配为 Deferred 预声明）
