# C2.2 form 文本输入族逐组件审计（input-text/input-password/input-email/input-number/textarea + input-suggest）

> Plan Status: active
> Mission: component-audit
> Work Item: C2.2
> Last Reviewed: 2026-08-03
> Source: `docs/backlog/component-audit-roadmap.md`（C2.x Phase Details）、`docs/audits/component-audit-checklist.md`（18 维 + 审计卡模板 + 自动修复纪律）、`docs/logs/2026/08-02.md`
> Related: 依赖 C0（`2026-08-02-2043-1`，completed）完成后开工；与 C1.3（`2026-08-03-0105-1`）/ C2.1（`2026-08-03-0105-2`）并行独立（均只依赖 C0）

## Purpose

对 `flux-renderers-form` 文本输入族 5 个注册组件（input-text/input-password/input-email/input-number/textarea）完成 18 维逐组件审计（每组件一张审计卡，P0/P1/P2/P3 裁决留痕），**连同 input-text 的 suggestSource 子特性 `input-suggest`（hook，非注册 type）一并审查**；P0/P1 缺陷在**同一 plan 内自动修复**（test-first + 回归测试 + 受影响包验证门禁），每族完成 ≥1 个真实浏览器组合宿主场景验证（含 bug 73 模式专项检查），最终 5 张审计卡全部 `closed`（P0/P1 清零）。本族同时承接 C0 已裁定的 **e2e pre-existing 失败 `input-suggest.spec.ts`（suggest 选择写回值，popover 稳定性，successor: C2.2）**——必须在真实浏览器宿主场景中复现、归因并修复或带回证据裁定。

## Current Baseline

- **组件与文件**：5 组件共享 `packages/flux-renderers-form/src/renderers/input.tsx` 的 `createInputRenderer`（input-text `:508`、input-email `:521`、input-password `:534`、textarea `:576`、input-number `:655`；均 `wrap: true` + `SCALAR_INPUT_CAPABILITY_CONTRACTS`，input-number 另有 clear/reset/focus handles）；textarea 渲染器 `textarea-renderer.tsx`；input-suggest hook `input-suggest.tsx`（非注册 type，input-text 的 suggestSource 子特性）。
- **设计文档**：5 组件 design.md 全部存在（`docs/components/{input-text,input-password,input-email,input-number,textarea}/design.md`）。
- **playground**：5 个 lab 页全部存在（`apps/playground/src/component-lab/renderers/{input-text,input-password,input-email,input-number,textarea}-lab-page.tsx`）。
- **e2e 既有覆盖**：`tests/e2e/` 下 form-input-enhancements.spec.ts、simple-form.spec.ts、complex-form.spec.ts；**`tests/e2e/input-suggest.spec.ts` 3 用例中 1 个 pre-existing 失败**（"typing shows suggestion popover and selecting writes back value"——suggest 选择写回值，popover 稳定性，roadmap「当前基线」C0 裁定 watch-only residual，successor: C2.2——以 roadmap 为权威归属；C0 plan Deferred 节仅归入 9 失败总表，归属细化以 roadmap 为准）。
- **历史基础**：本族曾经历 `2026-06-21-0331-e2a-text-input-enhancement-plan.md`、`2026-06-21-0527-e2a-bis-password-reveal-plan.md`、`2026-06-21-0722-e2b-textarea-auto-height-plan.md`、`2026-06-22-0901-1-e3-input-autocomplete-data-source-suggestions-plan.md`（suggestSource）、`2026-06-22-0330-2-e3-form-input-number-array-keyvalue-plan.md`、`2026-07-05-ajax-messages-config-plan.md`；input-suggest 测试见 `__tests__/input-suggest.test.tsx`、input-reset-resync.test.tsx、input-classname-contract.test.tsx。
- **相关机制已落地**：08-01 field-selector 契约（data-field/data-renderer/data-value，DOM 契约测试 28/28 绿）；08-02 嵌套 schema 分类机制（completed）；form shell（C2.1）同步执行中——若 form 审计发现影响本族基线（如 field metadata 契约），以 C2.1 结论为准回填（执行时核对）。
- **基线**：以 C0 回写的基线为准（unit 0 失败，flux-renderers-form 643 单测全绿；e2e pre-existing 9 中 1 项（input-suggest 写回）属本族、将在本 plan 内修复，其余 8 项属 ai/scheduling/content 包）。

## Goals

- 5 张审计卡（`docs/audits/per-component/{input-text,input-password,input-email,input-number,textarea}.md`）18 维逐项核对完成，P0/P1/P2/P3 裁决留痕，`文件:行` 证据；input-suggest 审查结论并入 input-text 卡（维度 5/11/12）。
- 本族 P0/P1 缺陷全部 test-first 自动修复（含 DOM 契约/选择器契约变更的 focused 契约测试）；P2 低成本（≤15 分钟）当场修复，其余登记卡内 backlog 归 CR。
- ≥1 个真实浏览器组合宿主场景（programmatic DOM 断言）通过，含 1 个 bug 73 模式专项检查（真实输入 → store 更新 → 提交值正确）。
- **input-suggest e2e pre-existing 失败在本 plan 内复现、归因并修复**（suggest 选择写回值 popover 稳定性），`tests/e2e/input-suggest.spec.ts` 3/3 全绿；修复失败则带回证据回写裁定（不得静默跳过，C0 已明确 successor 归属本族）。
- 5 张审计卡全部 `closed`（P0/P1 清零），roadmap C2.2 标 `done` 前由独立子 agent closure-audit。
- 共性缺陷（同一根因 ≥2 组件/跨包/公共层）按 roadmap 自动修复机制 §7 主动处理（CX-n 插入或当前 plan 内多阶段优先修复），不默认囤积 CR。

## Non-Goals

- 不审计 form 包其余组件（C2.1/C2.3-C2.5/C3.x 覆盖：form/fieldset/select/checkbox/date/markdown-editor/combo 等）。
- 不处理跨族公共层结构性重构（公共 API/包边界/编译期）——需人工确认；纯行为修复豁免。
- 不修复 e2e pre-existing 9 中其余 8 项（ai/scheduling/content 包，归属 C8.1/C9/CV）。

## Scope

### In Scope

- 5 组件 × 18 维审计卡（维度重点：1 Schema 契约（fields 与 schemas.ts 一致、suggestSource 声明）、2 RendererComponentProps 合规、3 值所有权三态（local/controlled/scope 完整路径、受控 echo、重置/清空、defaultValue/initValue/valueStatePath）、4 表单参与（name/required/validation 挂接、提交路径数据形状、校验错误展示与清除、data-field-\* metadata）、5 DOM 选择器契约与 marker（data-field/data-renderer/data-value/data-testid、input-suggest popover 契约）、6 嵌套 schema 分类（suggestSource 无 deepFields 残留）、7 事件与 action 契约（onChange/onFocus/onBlur payload 形状）、8 a11y（password reveal 键盘路径、suggest 组合框语义、aria-label）、9 i18n、10 四态覆盖（空/加载/错误/禁用/readOnly）、11 异步生命周期（input-suggest suggestSource 远程数据：abort/竞态/失败态/重试）、12 组合宿主场景、13 样式契约（widget 自样式）、14 React 19、15 性能边界（受控 echo 大输入）、16 测试质量、17 文档对照、18 注册/包边界/IO 安全红线（input-suggest 远程加载走 env IO 边界 INV-1））。
- input-suggest 专项：suggestSource 远程数据异步生命周期（维度 11）+ popover 稳定性（维度 5/12）+ e2e pre-existing 失败复现归因。
- P0/P1 自动修复（test-first）+ P2 低成本即时修复。
- 真实浏览器宿主场景（form 内文本输入提交（bug 73 模式）、input-suggest 选择写回、password reveal 切换）。
- 审计卡状态流转（open → fixing → fixed-pending-closure → closed）与 daily log 记录。

### Out Of Scope

- C1.3/C2.1/C2.3 及以后族组件。
- checklist v2 修订（CG）。
- 结构性重构（需人工确认后另立 CX-n）。

## Failure Paths

| 可测场景编号           | 触发                                            | 行为（含错误码）                           | 可重试 | 用户可见表现                 |
| ---------------------- | ----------------------------------------------- | ------------------------------------------ | ------ | ---------------------------- |
| host-input-submit      | form 内文本输入提交（真实浏览器）               | 输入值进入 store 并提交正确（bug 73 模式） | 是     | 提交结果正确回显             |
| host-suggest-writeback | suggestSource 选择写回（e2e pre-existing 复现） | popover 稳定、选择值写回 input 且进 store  | 是     | 选择值正确回显（e2e 3/3 绿） |
| host-suggest-async     | suggestSource 远程数据失败/竞态                 | abort/失败态正确、无 stale 数据、页面不崩  | 是     | 错误提示或降级列表           |
| host-password-reveal   | password reveal 切换                            | 明文切换正确、键盘路径完整                 | 是     | 密码可读可隐藏               |
| host-controlled-echo   | 受控值外部更新                                  | echo 正确、无 stale 值、无循环             | 是     | 值随外部 scope 同步          |

## Test Strategy

本档选择：**必须自动化** —— 文本输入是表单核心回归路径（AGENTS.md 测试分层第一档），且本族承接 1 个 e2e pre-existing 失败（input-suggest 写回）必须 test-first 修复（先写失败复现测试再实现）；契约/公共层修复必须 test-first。验证门禁：受影响包 `pnpm --filter @nop-chaos/flux-renderers-form typecheck/build/lint/test` + `tests/e2e/input-suggest.spec.ts` 3/3 + 宿主场景 Playwright（programmatic DOM 断言）。

## Execution Plan

### Phase 1 - 逐组件 18 维审计与审计卡产出

Status: planned
Targets: `packages/flux-renderers-form/src/renderers/{input.tsx,textarea-renderer.tsx,input-suggest.tsx}`、`definitions.ts`、`schemas.ts`、`docs/audits/per-component/`

- Item Types: `Proof`

- [ ] 审计前核对注册定义：5 组件注册项（type/fields/componentCapabilityContracts）与 `schemas.ts` 类型一致性（维度 1/18）；input-suggest 与 input-text 的关系（suggestSource 子特性，非注册 type）。
- [ ] 逐组件产出审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），P0/P1/P2/P3 裁决留痕（checklist §3）。
- [ ] 维度重点核查：值所有权三态全路径（维度 3：input.tsx 的 valueState 读取/受控 echo/reset 语义）；表单参与（维度 4：name/required/validation、校验错误展示与清除、data-field-\*）；DOM 契约（维度 5 + `check:audit-missing-renderer-markers`：data-field/data-renderer/data-value/data-testid 与 08-01 契约对齐）。
- [ ] input-suggest 专项（维度 5/11/12）：suggestSource 远程数据异步生命周期（abort/竞态/失败态/重试、env IO 边界 INV-1）；popover 稳定性与 e2e pre-existing 失败根因初查（`tests/e2e/input-suggest.spec.ts` "selecting writes back value" 用例）。
- [ ] 嵌套 schema 分类复验（维度 6）：suggestSource/suggestTemplate 分类与 08-02 机制一致；无 deepFields 残留。
- [ ] 事件与 action 契约（维度 7）：onChange/onFocus/onBlur payload 形状、normalizeActionEvent 语义。
- [ ] 四态覆盖（维度 10）与测试质量（维度 16）：既有单测（input-suggest.test.tsx/input-reset-resync.test.tsx/input-classname-contract.test.tsx）断言正确行为；React 19 规范（维度 14）、性能边界（维度 15：受控 echo 大输入、selector 精度）。
- [ ] 文档对照（维度 17）：5 组件 design.md ↔ 实现 props/行为逐项核对，quick-reference.md 词条准确性。

Exit Criteria:

> 本 Phase 交付 5 张审计卡（含裁决），是后续修复的唯一事实来源。

- [ ] `docs/audits/per-component/{input-text,input-password,input-email,input-number,textarea}.md` 5 张卡存在，18 维表完整、`文件:行` 证据可验证；input-suggest 审查结论已并入 input-text 卡。
- [ ] 每卡发现清单带 P0/P1/P2/P3 裁决；无 P0/P1 的卡标记 `closed`，其余 `open`；input-suggest e2e 失败根因初查结论已记录。

### Phase 2 - P0/P1 自动修复（test-first）

Status: planned
Targets: 发现涉及的 renderer 文件、定义文件、schemas.ts、契约测试文件、e2e spec

- Item Types: `Fix | Proof | Decision`

- [ ] 按审计卡逐个处理 P0/P1：先写复现/回归测试（断言正确行为，非仅 not-throw），再实现修复；DOM/选择器契约变更追加 focused 契约测试与 e2e（test-first 证据：复现测试先于实现 commit）。
- [ ] **input-suggest e2e pre-existing 失败修复**：先写/固化复现测试（`tests/e2e/input-suggest.spec.ts` 写回用例），归因（popover 稳定性/时序/数据竞争），实现修复使 3/3 全绿；若根因在包外公共层，按 §7 插入 CX-n；若无法在本 plan 内修复，带回证据回写裁定到 daily log + roadmap（不得静默跳过）。
- [ ] P2 低成本（约 15 分钟内）当场修复；其余登记卡内 backlog 归 CR。
- [ ] 共性缺陷裁决（Decision）：同一根因影响 ≥2 组件/跨包/公共层的发现 → 按 roadmap 自动修复机制 §7 处理（当前 plan 内多阶段优先修复并事后回写 CX-n，或插入 CX-n work item）；根因单点的 `shared:` 标记归 CR。
- [ ] 修复后卡内发现标 `fixed` + commit/plan 引用；卡状态流转 `open → fixing → fixed-pending-closure`。
- [ ] 复杂/跨包 bug 修复按 AGENTS.md Bug Fix Test Coverage Rule 记录到 `docs/bugs/`（参考 `docs/bugs/73-*.md` 格式）。

Exit Criteria:

> 本 Phase 交付"发现清零或已裁定"，卡状态与代码行为一致。

- [ ] 全部 P0/P1 已修复（卡内标 `fixed` + 证据）或已显式裁定延期（仅允许依赖未落地跨 plan 机制者，标「机制落地后复验」并登记）；无静默跳过。
- [ ] 受影响包 `pnpm --filter @nop-chaos/flux-renderers-form typecheck && build && lint && test` 绿（含新增回归测试）。
- [ ] `tests/e2e/input-suggest.spec.ts` 3/3 全绿（或带回证据的裁定已记录）。

### Phase 3 - 组合宿主真实浏览器场景

Status: planned
Targets: `tests/e2e/component-lab/` 新增/修改 spec、playground lab 页

- Item Types: `Proof | Fix`

- [ ] 设计并实现 ≥1 个本族真实浏览器组合宿主场景（programmatic DOM 断言，禁截图诊断）：候选——form 内文本输入提交（bug 73 模式）、input-suggest 选择写回进 store、password reveal 切换（按审计卡发现与宿主价值选择）。
- [ ] bug 73 模式专项检查：针对"单测绿但真机失败"类风险，在宿主场景中显式验证（输入 → store 更新 → 提交值正确）。
- [ ] 宿主场景发现的新缺陷按 Phase 2 流程修复（test-first）。
- [ ] 既有相关 e2e（form-input-enhancements/simple-form/complex-form）在本族改动后回归。

Exit Criteria:

> 本 Phase 交付"真实浏览器行为成立"。

- [ ] 宿主场景 spec 通过（Playwright，programmatic DOM 断言）；本族组件改动的回归 spec 绿。
- [ ] bug 73 模式专项检查结论记录于 daily log（pass 或带证据 fail→已修复）。

### Phase 4 - 族内回归与审计卡 closure

Status: planned
Targets: 5 张审计卡、`docs/logs/2026/08-03.md`、`docs/backlog/component-audit-roadmap.md`（C2.2 行）

- Item Types: `Proof`

- [ ] 全卡复查：18 维表结论与最终代码一致；P0/P1 清零；卡状态全部 `closed`（含 fixed-pending-closure → closed 流转）。
- [ ] 本族范围回归：`pnpm --filter @nop-chaos/flux-renderers-form test` + 相关 e2e spec 全绿（含 input-suggest.spec.ts）；如本 plan 触及公共层（flux-react/field-frame/编译器），追加受影响包验证并记录。
- [ ] daily log 记录：5 卡 closure 汇总、修复清单（commit/plan 引用）、宿主场景结果、input-suggest e2e 失败处置记录、CX-n 插入（如有）与决策。
- [ ] 若插入了 CX-n：同步更新 roadmap Work Item Status 表（新行 + 依赖边/注释）并按 §7c 走生命周期（父 plan closure 后标 done）；结构性 CX-n 执行前标注待人工确认。
- [ ] roadmap C2.2 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审）。

Exit Criteria:

> 本 Phase 交付"可进入 closure-audit 的完成态"。

- [ ] 5 张审计卡全部 `closed`；`docs/audits/per-component/` 汇总可读。
- [ ] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置、input-suggest e2e 处置结论）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session（task `ses_03c8d28d7ffe9dDlcFEZFY0Rdw`）
- Verdict: `pass`（零 Blocker/Major；2 条 Minor 全部修正：C0 归属表述改以 roadmap 为权威并注明 C0 plan Deferred 节归属粒度、form-input-enhancements.spec.ts 位置改 tests/e2e/ 根目录）
- Rounds: 1
- Findings addressed: 全部文件/行引用经 live repo 核对通过（input.tsx:508/:521/:534/:576/:655、input-suggest.tsx、input-suggest.spec.ts 3 用例、roadmap:96 successor 归属）；Minor 已处理。

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。

- [ ] 5 张审计卡存在、18 维表完整、P0/P1 清零、全部 `closed`（input-suggest 审查已并入 input-text 卡）
- [ ] 全部 in-scope P0/P1 已 test-first 修复并有回归测试；无被静默降级到 deferred 的 live defect/contract drift
- [ ] ≥1 个真实浏览器组合宿主场景通过（含 bug 73 模式专项检查）
- [ ] input-suggest e2e pre-existing 失败已修复（3/3 绿）或带回证据裁定（不得静默跳过）
- [ ] 共性缺陷已按 §7 处理（CX-n 插入/合并或当前 plan 内修复，决策记录在卡与 daily log）
- [ ] 受影响的 owner docs 已同步到 live baseline（design.md/quick-reference/roadmap 表按发现实际影响为准）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 各审计卡 P2 backlog（成本 >15 分钟的非阻断体验/文档/测试加固项）

- Classification: `optimization candidate`
- Why Not Blocking Closure: checklist §3 明确 P2 可入审计卡 backlog 由 CR 自动处理；不阻塞本族 supported baseline 成立。
- Successor Required: `yes`
- Successor Path: CR work item（跨族集中修复）

### 依赖未落地跨 plan 机制的发现（若有，「机制落地后复验」）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 依赖的机制（如 08-02 之外的新公共机制）未落地时无法在卡内闭合；按 checklist §5.4 显式登记、由 CR 集中复验，卡内不悬挂。
- Successor Required: `yes`
- Successor Path: CR work item

### e2e pre-existing 其余 8 项（ai/scheduling/content 包）

- Classification: `watch-only residual`
- Why Not Blocking Closure: C0 已逐项裁定为 mission 未触及包失败，successor 归属 C8.1/C9/CV；不在本族 scope。
- Successor Required: `yes`
- Successor Path: C8.1/C9/CV work item

## Non-Blocking Follow-ups

- 审计中发现但裁定为 P3（风格 nit/注释）的项仅卡内记录，不处理。
- 工具脚本新增模式（若有）记入卡内，CG 统一升级。

## Closure

Status Note: 未完成 —— plan 处于 draft 状态，尚未执行。

Closure Audit Evidence:

- Auditor / Agent: 待执行后由独立子 agent 填写
- Evidence: 待执行后填写

Follow-up:

- 待执行后填写。
