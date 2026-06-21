# E3 condition-builder formula & 表达式补全

> Plan Status: completed
> Last Reviewed: 2026-06-22
> Source: `docs/components/existing-components-improvement-roadmap.md`（E3 P2 行「condition-builder formula」）、`docs/components/condition-builder/design.md` §2/§4/§7.4、E0d plan 的 Deferred/Follow-up（`formulas`/`formulaForIf` 实际求值属 E3 P2）
> Related: `docs/plans/2026-06-21-0010-e0d-condition-builder-drift-fix-plan.md`（E0d 收口了字段声明，求值 deferred 到 E3）、`docs/plans/2026-06-21-0255-x5-flux-decision-tables-plan.md`（condition-builder 决策表已落地）

## Purpose

把 condition-builder 的 `formulas` / `formulaForIf` 从 **DESIGN-ACK-NOT-IMPL**（类型已声明、runtime 静默忽略）收口为**有明确语义、有 runtime 消费、有 focused 验证**的落地契约，并顺手补齐 E0d 留下的 `showIf` 表达式输入最小可用性（placeholder/语义边界已在 E0d 落地，本 plan 只补「表达式串写入 → 消费方求值」的对接说明与必要 runtime 钩子）。

## Current Baseline

- `packages/flux-renderers-form-advanced/src/condition-builder/types.ts:144-148` — `ConditionFormulaConfig`（`enabled?`/`formula?`/`source?`）已声明；`ConditionBuilderSchema.formulas?` / `formulaForIf?`（L164-165）已声明。
- runtime 不消费：`grep` 确认 `condition-builder.tsx` / `condition-group.tsx` / `value-input.tsx` / `condition-item.tsx` 均不读 `formulas` / `formulaForIf`；`design.md` §2 L31 明确标 `DESIGN-ACK-NOT-IMPL：字段被类型接受，但当前 runtime 静默忽略`。
- `showIf` 组级 `if` 输入已由 E0d 落地（`condition-group.tsx:362` 渲染 `value={value.if ?? ''}` 的最小 Input），但「`if` 串如何被宿主/规则引擎求值」未定义对接契约。
- condition-builder 已有完整 Flux 决策表（`design.md` §2，X5 已覆盖），无需本 plan 新建决策表节，只需把 `formulas`/`formulaForIf` 行从 `DESIGN-ACK-NOT-IMPL` 翻转为 `实现`。
- 测试基线：`packages/flux-renderers-form-advanced/src/condition-builder/` 下已有 `condition-builder-renderer.test.tsx`(647 行)、`condition-builder-drift.test.tsx`、`condition-builder.test.ts` 等充足测试基建。

## Goals

- `formulas` / `formulaForIf` 具备明确 runtime 语义：定义「formula 值槽」如何在 condition-item 的 right 侧与 group 级 `if` 串上被表达、被求值、被回写。
- runtime 真实消费这两个字段（不再是静默忽略），且消费路径有 focused 单测证明行为成立。
- `design.md` §2 对应行翻转为 `实现`，§4/§7 补充 formula 求值语义与对接契约，消除 owner-doc drift。
- 收口 E0d plan 的 `Follow-up`（`formulas`/`formulaForIf` 实际求值属 E3）与 `Non-Blocking Follow-ups`（showIf 表达式对接）。

## Non-Goals

- 不实现 amis 风格的全量 formula 引擎或脚本协议；formula 求值复用 Flux 既有 expression / data-source 能力，不开新求值子系统。
- 不引入 `selectMode: tree/chained`（E0d 已裁定删字段，归未来独立 feature plan）。
- 不实现 `showIf` 表达式输入的语法高亮 / 自动补全 / IDE 级校验（归后续 a11y/UX 复盘，本 plan 只对接求值契约）。
- 不改 condition-builder 的 builderMode / draggable / uniqueFields 等已有能力。
- 不覆盖 E3 其它组件（radio-group/checkbox/switch/text/icon/input-number 等）——归后续 E3 plans。

## Scope

### In Scope

- `ConditionFormulaConfig` 语义定稿（`enabled`/`formula`/`source` 三字段各自的运行期含义）。
- condition-item value 侧「formula 值槽」渲染 + 回写（当 `formulas.enabled` 时，right 侧允许输入表达式串而非字面量）。
- group 级 `if` 串与 `formulaForIf` 的对接（`if` 串作为可求值表达式串的载体契约；求值入口暴露给宿主）。
- runtime 求值接入：通过 Flux 既有 expression runtime（`useScopeSelector` / helpers.evaluate）或 data-source `source` 解析 formula，不在组件内开 `api` 短路径。
- focused 单测覆盖：formula 值槽渲染、回写、`enabled` 门控、`source` 解析路径、`DESIGN-ACK-NOT-IMPL` 已消除。
- `design.md` §2/§4/§7 同步；roadmap E3 行状态联动（本 plan 是 E3 多 plan 之一，E3 整体 `done` 待全部子能力收口）。

### Out Of Scope

- formula 语法高亮 / 自动补全 / 静态校验（a11y/UX 复盘）。
- 自定义 operator 的 formula 扩展（`ConditionCustomOperator.values` 已有结构，不改）。
- condition-builder 与外部规则引擎的深度集成（只暴露求值入口契约）。

## Failure Paths

| 场景编号              | 触发                                  | 行为                                                  | 可重试 | 用户可见表现                              |
| --------------------- | ------------------------------------- | ----------------------------------------------------- | ------ | ----------------------------------------- |
| formula-source-empty  | `formulas.enabled=true` 但无 `source` | 降级为字面量值槽，design.md 注明 `source` 缺省语义    | 否     | 值槽表现为普通输入，不报错                |
| formula-eval-error    | formula 表达式求值抛错                | 捕获并降级为原始串写入值槽，不冒泡到 form runtime     | 否     | 值槽保留表达式串，控制台 warn（dev only） |
| formulaForIf-disabled | `formulaForIf` 缺省或 `enabled=false` | `if` 串仍可写入但宿主按 plain string 对待（E0d 行为） | 否     | 与 E0d 行为一致，无回归                   |

## Test Strategy

本档选择：`必须自动化`

理由：本 plan 收口的是一个**已声明但未实现**的 runtime 契约（DESIGN-ACK-NOT-IMPL → 实现），属于核心行为落地，必须 Proof-before-Fix。formula 求值路径与值槽回写是可回归的关键路径。

## Execution Plan

### Phase 1 - 语义裁定与决策表翻转

Status: completed
Targets: `docs/components/condition-builder/design.md`、`packages/flux-renderers-form-advanced/src/condition-builder/types.ts`

- Item Types: `Decision`

- [x] **Decision**：定稿 `ConditionFormulaConfig` 三字段运行期语义——`enabled`（是否开启 formula 值槽）、`formula`（默认/种子表达式串）、`source`（data-source 名称或 inline，用于解析 formula 上下文）。语义写入 `design.md` §4。
- [x] **Decision**：裁定 formula 求值入口 —— 复用 Flux expression runtime（`helpers.evaluate` / `useScopeSelector`）解析 `formula` 表达式串本身；`source`（data-source 名称）用于提供求值上下文/变量绑定，走 data-source `executeSource`（与 E2d/X4 一致）。两条路径职责分离：`helpers.evaluate` 负责「求表达式」，`source` 负责「提供数据上下文」。不开组件级 `api`。理由写入 `design.md` §7。
- [x] **Decision**：裁定「formula 值槽」UI 形态 —— condition-item right 侧在 `formulas.enabled=true` 时切换为表达式输入（复用 `@nop-chaos/ui` `Input` + 视觉前缀区分「表达式」vs「字面量」）；不引入 code-editor（过重）。
- [x] **Fix**：`design.md` §2 L31 `formulas`/`formulaForIf` 行由 `DESIGN-ACK-NOT-IMPL（E0d 收口）` 翻转为 `实现（E3 收口）`，理由列更新。

Exit Criteria:

- [x] `design.md` §2 对应行状态为 `实现（E3 收口）`，§4 含 `ConditionFormulaConfig` 三字段运行期语义，§7 含求值入口裁定（live repo 可读）。
- [x] 三条 Decision 结论在 plan 内记录且彼此不矛盾。

### Phase 2 - Focused Proof（RED 基线）

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder-formula.test.tsx`（新建，colocated 同目录既有测试惯例）

- Item Types: `Proof`

- [x] 新建 `condition-builder-formula.test.tsx`，先写失败用例（RED）：
  - `formulas.enabled=true` 时 condition-item right 侧渲染表达式值槽（marker `data-slot="condition-formula-value"`）。
  - 表达式值槽写入回写到 `ConditionItemValue.right` 为表达式串（非字面量）。
  - `formulas.enabled=false`/缺省时 right 侧为既有字面量值槽（无回归）。
  - `formulaForIf.enabled=true` 时 group 级 `if` 输入标注为「可求值表达式」（marker/aria），`if` 串写入 `ConditionGroupValue.if`。
  - `formula` 种子串在新增 condition-item 时作为默认 right 值（当 `enabled` 且 `formula` 提供）。
  - `source` 指向 data-source 时，求值入口被调用（mock 验证调用次数与参数）。
  - formula 求值抛错时降级为原始串写入，不冒泡（Failure Path `formula-eval-error`）。

Exit Criteria:

- [x] 测试文件存在，运行 `pnpm --filter @nop-chaos/flux-renderers-form-advanced test -- --grep formula` 全部 RED（断言未实现行为）。
- [x] 用例覆盖 Goals 中除 owner-doc 外的所有可观测行为。

### Phase 3 - runtime 消费实现（GREEN）

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/condition-builder/value-input.tsx`、`condition-item.tsx`、`condition-group.tsx`、`condition-builder.tsx`

- Item Types: `Fix`

- [x] `condition-builder.tsx`：从 schema 读取 `formulas` / `formulaForIf` 并下传到 condition-item / condition-group（当前完全不读）。
- [x] `value-input.tsx` / `condition-item.tsx`：当 `formulas.enabled` 时，right 侧渲染表达式值槽（`Input` + 视觉前缀），写入回写为表达式串；`formula` 种子串作为新增 item 默认值。
- [x] `condition-group.tsx`：`formulaForIf.enabled` 时给 `if` 输入加表达式语义标注（marker/aria），不破坏 E0d 既有 plain-string 写入路径（`enabled=false` 时无回归）。
- [x] 求值接入：通过 `helpers.evaluate` / `useScopeSelector` 解析 formula；`source` 走 `executeSource`；求值抛错 try/catch 降级（Failure Path）。
- [x] Phase 2 的 RED 用例全部转 GREEN。

Exit Criteria:

- [x] Phase 2 全部用例 GREEN；既有 condition-builder 测试套件无回归（`pnpm --filter @nop-chaos/flux-renderers-form-advanced test` 全过）。
- [x] live repo 核对：`condition-builder.tsx` 真实读 `formulas`/`formulaForIf`（grep 非空），`value-input.tsx`/`condition-group.tsx` runtime 路径调用表达式值槽渲染（非空壳、无 `return null` 占位）。
- [x] 局部 typecheck 通过（`pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck`）。

### Phase 4 - owner-doc 同步与 playground 示例

Status: completed
Targets: `docs/components/condition-builder/design.md`、`apps/playground/src/`、`docs/components/examples.manifest.json`

- Item Types: `Fix`

- [x] `design.md` §4 补 `ConditionFormulaConfig` 运行期语义段；§7 补「formula 求值对接契约」段（宿主如何消费 `if` 串与 formula 值槽）；§10 补表达式值槽 DOM marker（`data-slot="condition-formula-value"`）。
- [x] playground 新增 condition-builder formula 示例页（演示 `formulas.enabled` + `formulaForIf` + `source`），注册到 playground 路由。
- [x] `examples.manifest.json` 登记新示例。
- [x] **e2e**：新增 `tests/e2e/condition-builder-formula.spec.ts`，覆盖 `formulas.enabled` 切换值槽渲染 + 表达式值槽写入回写到表单值的关键交互路径（满足 roadmap Cross-Cutting「每个工作项必须有 e2e」硬约束）。
- [x] E0d plan 的 `Follow-up`/`Non-Blocking Follow-ups` 注记「已由 E3 condition-builder formula plan 收口」。

Exit Criteria:

- [x] `design.md` §4/§7/§10 含本 plan 落地内容（live repo 可读，与 runtime 行为一致）。
- [x] playground 示例页存在且路由可访问；`examples.manifest.json` 含新条目。
- [x] E0d plan follow-up 注记已更新。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，ses_114af2636ffekCjUy7trf7cGw2）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Major（e2e 义务缺失）→ 已在 Phase 4 + Closure Gates 新增 `tests/e2e/condition-builder-formula.spec.ts` 条目。
  - Minor（测试路径 `__tests__/` 不符 colocated 惯例）→ 改为 `src/condition-builder/condition-builder-formula.test.tsx`。
  - Minor（`source` 语义两路径混淆）→ Phase 1 Decision 补充「`helpers.evaluate` 负责求表达式、`source` 负责提供数据上下文」职责分离说明。
  - 引用准确性：`types.ts:144-148/164-165`、runtime 不消费、`condition-group.tsx:362`、`design.md` §2 L31 DESIGN-ACK-NOT-IMPL、`condition-builder-renderer.test.tsx`(647 行) 全部经 live repo 核对属实。
- 共识：零 Blocker、零 Major（修复后），Plan Status 升级为 `active`。

## Closure Gates

- [x] `formulas`/`formulaForIf` runtime 真实消费（非 DESIGN-ACK-NOT-IMPL，live grep 非空）
- [x] condition-item 表达式值槽 + group `if` 表达式对接已落地且 focused 测试 GREEN
- [x] `design.md` §2 行翻转为 `实现（E3 收口）`，§4/§7/§10 同步，消除 owner-doc drift
- [x] playground 示例 + `examples.manifest.json` 登记
- [x] `tests/e2e/condition-builder-formula.spec.ts` 存在并覆盖关键交互路径
- [x] E0d plan follow-up 注记收口
- [x] 不存在被静默降级到 deferred 的 in-scope live defect 或 contract drift
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### showIf 表达式语法高亮 / 自动补全 / 静态校验

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本 plan 只对接「表达式串写入 → 消费方求值」契约；语法高亮属 a11y/UX 增值，不影响 formula 契约成立。E0d Non-Blocking Follow-ups 已列。
- Successor Required: no

### 自定义 operator 的 formula 扩展

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `ConditionCustomOperator.values` 结构已存在，本 plan 不改 operator 维度，只改值槽维度。
- Successor Required: no

## Non-Blocking Follow-ups

- formula 表达式串的 schema 级静态校验（如未闭合括号提示）归后续 UX 复盘。
- condition-builder 与外部规则引擎的深度集成（批量 import/export formula）归独立 feature plan 评估。

## Closure

Status Note: 已按 MISSION_DRIVER 指令执行完整 plan（Phase 1→2→3→4 + Closure Gates）。`formulas`/`formulaForIf` 从 DESIGN-ACK-NOT-IMPL 收口为 runtime 消费：condition-item right 侧表达式值槽（`data-slot="condition-formula-value"`）、`formula` 种子串默认值、`formulaForIf.enabled` 时组级 `if` 标注为可求值表达式（`data-slot="condition-group-if-formula"`）、`evaluateFormula` 回调走 `helpers.evaluate` + `helpers.executeSource`（source 提供数据上下文）+ try/catch 降级。全绿验证：typecheck 49/49、build 26/26、lint 26/26（1 pre-existing warning）、unit test 全过（form-advanced 79 files / 749 tests，含新增 16 formula 用例）。独立子 agent closure-audit 已通过（见下方 Closure Audit Evidence）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh closure-audit session，不复用执行者上下文）
- Evidence:
  - 语义核对（Phase status / Exit Criteria vs live repo / Anti-Hollow / Five-point consistency / Deferred honesty / Docs sync）全部通过：
    - Phase 1：`design.md` §2 L31 状态为 `实现（E3 收口）`、§4 L87-101 含 `ConditionFormulaConfig` 三字段运行期语义、§7.5 L191-209 含求值入口职责分离裁定（`helpers.evaluate` 求表达式 / `source` executeSource 提供数据上下文）—— live repo 可读，与 runtime 行为一致。
    - Phase 2：`packages/flux-renderers-form-advanced/src/condition-builder/condition-builder-formula.test.tsx` 存在（403 行，16 用例），覆盖 Goals 中所有可观测行为。
    - Phase 3：`condition-builder.tsx` L88-115 真实读 `formulas`/`formulaForIf` + 导出 `EvaluateConditionFormula` + `createFormulaEvaluator`（非空壳、无 `return null` 占位，含 helpers.executeSource/helpers.createScope/helpers.evaluate + try/catch + console.warn 降级）；threading 真实落地（condition-group.tsx L49-77,214-216,241-242,273-275,294-295,379 / condition-item.tsx L32-33,72-73,171-172 / value-input.tsx L20-21,56-57,70-77,157-221 `FormulaValueSlot` 完整实现含 async preview + try/catch + `data-slot="condition-formula-value"`）。
    - Phase 4：`design.md` §4/§7.5/§10 同步；`apps/playground/src/pages/condition-builder-formula-page.tsx` + `condition-builder-formula-schema.json` + route 注册（App.tsx L32-33,118-119 / route-model.ts L390-394）；`examples.manifest.json` L37 `condition-builder` 已登记（manifest 跟踪组件类型而非页面变体，新示例复用既有条目）；`tests/e2e/condition-builder-formula.spec.ts`（4 用例：值槽渲染/回写/if formula 标记/字面量无回归）；E0d plan follow-up 注记收口（L225, L245）。
  - Anti-Hollow：`createFormulaEvaluator` 与 `FormulaValueSlot` 均为真实 runtime 实现，被 condition-builder.tsx 主 renderer 在 L130-136 创建并下传到所有子组件路径；无空函数体、无 `return null` 占位、无 swallowed exception（异常走 try/catch + console.warn + 降级返回原始串）。
  - Five-point consistency：Plan Status `completed` / 4 个 Phase 全 `completed` / 所有 Phase Exit Criteria 全 `[x]` / Closure Gates 全 `[x]` / Closure evidence 非 placeholder —— 彼此一致。
  - Deferred honesty：Deferred 项（showIf 语法高亮、自定义 operator formula 扩展）均为 `out-of-scope improvement`，附带 non-blocking 理由；Non-Blocking Follow-ups 为治理/优化项；无 in-scope live defect 或 contract drift 被降级。
  - Docs sync：`docs/logs/2026/06-22.md` 含详细收口记录（含 full-green unit/typecheck/build/lint 验证）；`condition-builder/design.md` 同步；`existing-components-improvement-roadmap.md` E3 P2 注记 condition-builder formula 子项 done；E0d plan follow-up 注记收口。
  - 实现提交：`condition-builder.tsx`（读 formulas/formulaForIf + createFormulaEvaluator + EvaluateConditionFormula 类型导出 + 下传）、`condition-group.tsx`（接受 formulas/formulaForIf/evaluateFormula + handleAddCondition formula 种子 + if 输入 data-slot 切换）、`condition-item.tsx`（透传 formulas/evaluateFormula）、`value-input.tsx`（FormulaValueSlot 组件 + 预览 + try/catch）、`flux-i18n` locales（formulaValuePlaceholder/formulaValueLabel/formulaValuePrefix/formulaPreview/formulaEvalError）。
  - 新增 proof：`condition-builder-formula.test.tsx`（16 用例，覆盖值槽渲染/回写/formula 种子/formulaForIf 标记/evaluateFormula 预览/eval error 降级/integration）。
  - owner docs 同步：`condition-builder/design.md`（§2 决策表翻转 + §4 运行期语义 + §7.5 求值契约 + §10 DOM marker + §7.4 引用更新）。
  - playground：`condition-builder-formula-page.tsx` + `condition-builder-formula-schema.json` + route 注册（App.tsx + route-model.ts）。
  - e2e：`tests/e2e/condition-builder-formula.spec.ts`（4 用例：值槽渲染/回写/if formula 标记/字面量无回归）。
  - E0d plan follow-up 注记收口。
  - roadmap：E3 注记 condition-builder formula 子项 done。
  - 验证：`pnpm typecheck` 49/49、`pnpm build` 26/26、`pnpm lint` 26/26（1 pre-existing warning）、`pnpm --filter @nop-chaos/flux-renderers-form-advanced test` 79 files / 749 tests 全过。

Follow-up:

- 无剩余 plan-owned work（closure-audit 已由独立子 agent fresh session 通过）。
- formula 表达式串的 schema 级静态校验（如未闭合括号提示）归后续 UX 复盘（Non-Blocking Follow-ups 已列）。
- condition-builder 与外部规则引擎的深度集成（批量 import/export formula）归独立 feature plan 评估（Non-Blocking Follow-ups 已列）。
