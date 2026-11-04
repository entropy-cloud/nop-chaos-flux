# 858 core 包导出级测试补齐与无断言套件修复（core test debt）

> Plan Status: active（draft review 通过，见 Draft Review Record）
> Last Reviewed: 2026-11-05
> Source: `docs/analysis/2026-11-05-full-repo-deep-audit.md` §F-E（E1–E2）
> Related: `docs/architecture/flux-core.md`（protected area owner doc，满足 autonomy policy plan-first 证据）、AGENTS.md Bug Fix Test Coverage Rule

## Purpose

补齐深审定位的 9 组公开导出的零测试引用（flux-core / flux-formula——六个高 stakes 包中 src:test 比最差两个），并把 4 处"零断言/伪断言"套件改为真断言。全部为测试新增/修复，不改任何产品代码。

## Current Baseline

- 全量单测绿：16,837 passed / 0 failed（46 vitest project，2026-11-05 实测）。
- repo 全域 grep 确认以下导出在所有 `*.test.*`/`*.spec.*` 中零引用。其中 6 组在包公开导出面（`bindAst` index.ts:9；`isCompiledActionProgram`/`isCanonicalBuiltInActionName`/`normalizeHiddenFieldPolicy`/`toCompiledRendererContract`/`isSchemaArray`/`isSchemaInput`/`formatRegistry` 均经 index 链公开）；另 3 组为包内导出（非公开面），测试以包内相对导入覆盖：
  - `packages/flux-formula/src/bind-ast.ts:100` `bindAst`（依赖绑定 pass；index.ts:9 公开导出）【公开】
  - `packages/flux-formula/src/parser-node-factories.ts:4,8,22,30` `createSourceLocation`/`createLiteralNode`/`createIdentifierNode`/`createMemberExpressionNode`【包内，相对导入】
  - `packages/flux-core/src/value-adapter.ts:437` `isCompiledActionProgram`【公开】
  - `packages/flux-core/src/constants.ts:94` `isCanonicalBuiltInActionName`【公开】
  - `packages/flux-core/src/validation-model.ts:16` `normalizeHiddenFieldPolicy`【公开】
  - `packages/flux-core/src/json-merge/identity.ts:73` `identityCompositeKey`【包内，相对导入】
  - `packages/flux-core/src/json-merge/types.ts:82,92` `resolveContext`/`joinPath`【包内，相对导入】
  - `packages/flux-core/src/types/compiled-renderer-contract.ts:46` `toCompiledRendererContract`（RM-1 单源派生，经 types/index.ts 公开链；现仅类型级测试 `renderer-contract-types.test.ts`——typecheck 层 fail，运行时派生漂移无网）【公开】
  - `packages/flux-core/src/utils/schema.ts:9,13` `isSchemaArray`/`isSchemaInput`【公开】；`packages/flux-core/src/format-registry.ts:72` `formatRegistry`【公开】；`value-adapter.ts` `booleanMappingAdapter`【公开】
- 无断言/伪断言测试 4 处：
  - `packages/flux-renderers-industrial/src/editor/renderer/editor-engine.test.ts:215,324,411,431` 四套件调 engine 方法后 destroy，零 expect
  - `packages/flux-renderers-3d/src/engine/scene-manager-branches3.test.ts:51` rAF 路径 init/dispose 零断言
  - `packages/flux-renderers-industrial/src/engine/scada-engine-events-declarations.test.ts:92` "should not emit" 仅靠不崩溃，无 handler-absence spy
- flux-core src:test 比 1.50（84 src / 56 test），flux-formula 1.33（20/15）——为六个高 stakes 包最差。
- 受保护区核对：新增测试 colocate 于各包既有测试约定位置（`*.test.ts(x)` 与源文件同目录，或既有 `__tests__/` 目录——按各包现状就近，Phase 1 按 flux-formula 现状执行），不改任何 src 产品文件；autonomy policy 的 flux-core `plan-first` 证据 = 本 plan + owner doc `docs/architecture/flux-core.md` 在案。

## Goals

- 9 组导出全部获得 focused 单测：正例 + 边界 + 负例（能区分真实语义的断言，不是 smoke）。
- 4 处无断言套件补真断言（engine 状态/effects spy），使其能 fail。
- 不改任何产品源文件；全部改动为测试文件。
- 全量单测收口时保持 0 failed，且新增测试数计入当日 log。

## Non-Goals

- 不追求覆盖率数字目标（不为凑 ratio 写低质测试）。
- 不给 type-only 测试（`expectTypeOf` 族）补运行时断言——该模式刻意，fail 在 typecheck 层。
- 不补 flux-runtime/flux-compiler（比率已良好：0.59/0.82）。
- 不改 public API 语义或加导出。

## Scope

### In Scope

- `packages/flux-formula/src/**` 新增测试文件（bind-ast、parser-node-factories）
- `packages/flux-core/src/**` 新增测试文件（value-adapter、constants、validation-model、json-merge、compiled-renderer-contract、schema guards、format-registry）
- `packages/flux-renderers-industrial/src/**` 两处既有测试文件修复
- `packages/flux-renderers-3d/src/engine/scene-manager-branches3.test.ts` 修复

### Out Of Scope

- 任何 `src/` 产品代码文件（测试写不出合理断言而需改产品代码时，停下来裁决，不得顺手改码）
- 其余包的测试补齐
- mutation testing / 覆盖率门禁

## Failure Paths

| 可测场景编号             | 触发                     | 行为                                                                                                                                                    | 可重试 | 用户可见表现               |
| ------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------- |
| test-exposes-live-defect | 新增测试在当前实现上失败 | 停止：该断言揭示 live defect——按 AGENTS.md Bug Fix Test Coverage Rule 升级为独立 finding 登记（docs/bugs/ 或新 plan），不得为本 plan 收口弱化断言或改码 | 是     | 当日 log + 新 finding 记录 |

## Test Strategy

档位选择：`必须自动化`——本 plan 交付物即自动化测试。每个导出的测试先写、实跑、确认在当前实现上绿（若红走 Failure Paths 表）；无断言套件修复后必须演示"能 fail"（临时注入变异确认断言咬合，随后还原）。

## Execution Plan

### Phase 1 - flux-formula 测试补齐

Status: planned
Targets: `packages/flux-formula/src/`

- Item Types: `Proof`

- [ ] `bind-ast` 测试：literal/identifier/member-expression 的依赖绑定结果、嵌套表达式、非法输入形态
- [ ] `parser-node-factories` 测试：四种工厂产出的 AST 形状字段（type/位置字段/子节点引用）
- [ ] 测试文件按该包既有 colocate 约定放置与命名

Exit Criteria:

- [ ] 新测试在当前实现上全绿（`pnpm --filter @nop-chaos/flux-formula test`）
- [ ] 每个导出至少含一个负例断言（能区分语义正确/错误的输入）

### Phase 2 - flux-core 测试补齐

Status: planned
Targets: `packages/flux-core/src/`

- Item Types: `Proof`

- [ ] `isCompiledActionProgram`：合法 compiled program / 普通 ActionSchema / null/undefined / 形状残缺对象
- [ ] `isCanonicalBuiltInActionName`：allowlist 内/外/大小写边界
- [ ] `normalizeHiddenFieldPolicy`：合法值 / 非法值 fallback / undefined 默认
- [ ] `identityCompositeKey` + `resolveContext`/`joinPath`：复合键组成顺序、数值 token、嵌套路径、转义边界
- [ ] `toCompiledRendererContract` 运行时派生：以一个真实 renderer definition 输入，断言派生面与声明类型契约一致（字段集合/可选性）
- [ ] `isSchemaArray`/`isSchemaInput`/`formatRegistry`/`booleanMappingAdapter`：guard 正负例 + registry 注册/查询 + boolean 映射边界

Exit Criteria:

- [ ] 新测试全绿（`pnpm --filter @nop-chaos/flux-core test`）
- [ ] `toCompiledRendererContract` 测试断言的是运行时派生结果（非 type-of 断言）

### Phase 3 - 无断言套件修复

Status: planned
Targets: `flux-renderers-industrial`（2 文件）、`flux-renderers-3d`（1 文件）

- Item Types: `Proof | Fix`

- [ ] Proof（判别性前置）：对四处各做一次临时变异（删掉实现关键行/换掉返回值），确认其现有"测试"确实 fail——即证明当前无断言是"无网"而非"有网不用"；随后还原变异
- [ ] `editor-engine.test.ts` 四套件（:215/:324/:411/:431）：对 `setEditorTargets`/`setMode` 后的 engine 状态/effects 补真断言
- [ ] `scene-manager-branches3.test.ts:51`：rAF init/dispose 路径补状态断言（场景创建/资源释放可观测面）
- [ ] `scada-engine-events-declarations.test.ts:92`："should not emit" 改为 handler spy 断言（区分"未 emit"与"handler 未接线"）
- [ ] Proof（判别性收尾）：对每处新断言做一次反向变异演示（旧无断言形态必挂），过程记录当日 log，不留变异

Exit Criteria:

- [ ] 三个包测试全绿；四个套件均含 ≥1 个能 fail 的断言（变异演示记录在案）
- [ ] git diff 仅测试文件

## Draft Review Record

- Reviewer / Agent: 独立子代理 agent_3c43e191（fresh session）
- Verdict: `pass-with-minors`（零 Blocker/Major；9 组零引用声称全部独立复核成立〔非抽查〕、行号引用逐字正确、断言缺失位点逐个打开确认）
- Rounds: 1
- Findings addressed: Minor 4 条中 3 条已吸收进正文（公开面声称收窄为"6 组公开 + 3 组包内相对导入"；colocate 措辞统一为按包现状就近；Phase 3 mutation-demo Proof 前置）；1 条不阻塞——16,837/46 project 与 flux-runtime/flux-compiler 比率未独立复跑（执行不依赖，以审计日志佐证）

## Closure Gates

- [ ] 9 组导出测试全部落地且全绿
- [ ] 4 处无断言套件全部具备判别性断言（变异演示在案）
- [ ] 零产品源文件改动（git diff 核验）
- [ ] 新增测试过程中暴露的 live defect（若有）已按 Failure Paths 登记归属，未被静默
- [ ] owner docs 无需更新（纯测试，无行为/契约变更）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`（全量 0 failed，新增数计入当日 log）
- [ ] `pnpm check` exit 0

## Deferred But Adjudicated

（无——执行中若有改判当场落节）

## Non-Blocking Follow-ups

- flow-designer-core src:test 1.88 属非 flux core 面，是否补齐挂 improvement-analysis 治理轮。
- 其余 core-facing 包（spreadsheet-core 1.38 / flux-code-editor 1.37）同上。

## Closure

Status Note: <<收口时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<收口时填写>>
