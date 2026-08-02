# C2.1 form shell 族逐组件审计（form/fieldset + hidden-field 策略）

> Plan Status: active
> Mission: component-audit
> Work Item: C2.1
> Last Reviewed: 2026-08-03
> Source: `docs/backlog/component-audit-roadmap.md`（C2.x Phase Details）、`docs/audits/component-audit-checklist.md`（18 维 + 审计卡模板 + 自动修复纪律）、`docs/logs/2026/08-02.md`
> Related: 依赖 C0（`2026-08-02-2043-1`，completed）完成后开工；与 C1.3（`2026-08-03-0105-1`）/ C2.2（`2026-08-03-0105-3`）并行独立（均只依赖 C0）

## Purpose

对 `flux-renderers-form` form shell 族 2 个注册组件（form/fieldset）完成 18 维逐组件审计（每组件一张审计卡，P0/P1/P2/P3 裁决留痕），**连同 form 的 hidden-field 策略（`hiddenFieldPolicy`，非注册组件，form 的 schemaValidator 子机制）一并审查**；P0/P1 缺陷在**同一 plan 内自动修复**（test-first + 回归测试 + 受影响包验证门禁），每族完成 ≥1 个真实浏览器组合宿主场景验证（含 bug 73 模式"单测绿但真机失败"专项检查），最终 2 张审计卡全部 `closed`（P0/P1 清零）。本族是 form 域的根基（其余 form 族 C2.2-C2.5、C3.x 均以 form shell 的 field metadata/校验/提交路径为宿主），其审计结论将作为后续 form 族审计的 baseline 依据。

## Current Baseline

- **组件与文件**：form 在 `packages/flux-renderers-form/src/renderers/form.tsx`（定义 `form-definition.ts`，type `form` `:119`，defaultSchema `:123`；fields 含 hiddenFieldPolicy `:370`）；fieldset 在 `packages/flux-renderers-form/src/renderers/fieldset.tsx`（type `fieldset` `:110`，defaultSchema `:114`）；hidden-field 策略实现 `hidden-field-policy-schema.ts`（`validateHiddenFieldPolicySchema` `:25-57`）+ form.tsx 内的 hiddenFieldPolicy 运行时语义（hidden-field-policy.test.tsx 有 focused 测试）；`form-rules.ts` 为跨字段校验规则编译（equalsField/notEqualsField），同属本族审计目标。
- **设计文档**：`docs/components/form/design.md`、`docs/components/fieldset/design.md` 均存在。
- **playground**：form-lab-page.tsx、fieldset-lab-page.tsx 均存在（`apps/playground/src/component-lab/renderers/`）。
- **e2e 既有覆盖**：`tests/e2e/` 下 simple-form.spec.ts、complex-form.spec.ts、form-ajax-includescope.spec.ts、form-input-enhancements.spec.ts、`tests/e2e/component-lab/` 下 surface-form-input.spec.ts、dialog-edit-submit.spec.ts（dialog 内 form 提交）等覆盖 form shell 路径（执行时核对，缺口在 Phase 3 补宿主场景）。
- **相关机制已落地**：08-01 field-selector 契约（FieldFrame 补 data-field/data-renderer，DOM 契约测试 28/28 绿）；08-02 嵌套 schema 分类机制（fieldRules/schema-definition/actionValue，`docs/architecture/nested-schema-field-classification.md` v8，三 plan 均 completed）；`docs/architecture/form-validation.md`（校验参与/错误展示契约）；`docs/architecture/flux-runtime-module-boundaries.md`。
- **历史基础**：form shell 曾经历 `2026-06-21-1000-2-e2g-form-shell-enhancement-plan.md`（form actions/提交路径）、`2026-07-08-dict-page-loading-refactor-plan.md`、`2026-07-07-loadAction-reaction-kind-plan.md`、`2026-08-02-3-ajax-validation-migration.md`（completed）；CRUD 域语言（loadAction/query/includeScope）见 `CONTEXT.md`。
- **基线**：以 C0 回写的基线为准（unit 0 失败，含 flux-renderers-form 643 单测全绿；e2e pre-existing 9 中 8 项属 ai/scheduling/content 包、1 项（input-suggest）属 form 包且归属 C2.2，均不在本族）。

## Goals

- 2 张审计卡（`docs/audits/per-component/{form,fieldset}.md`）18 维逐项核对完成，P0/P1/P2/P3 裁决留痕，`文件:行` 证据；hidden-field 策略审查结论并入 form 卡（维度 1/4/6/17）。
- 本族 P0/P1 缺陷全部 test-first 自动修复（含 DOM 契约/选择器契约变更的 focused 契约测试）；P2 低成本（≤15 分钟）当场修复，其余登记卡内 backlog 归 CR。
- ≥1 个真实浏览器组合宿主场景（programmatic DOM 断言）通过，含 1 个 bug 73 模式专项检查（form 真实输入 → store 更新 → 提交值正确）。
- 2 张审计卡全部 `closed`（P0/P1 清零），roadmap C2.1 标 `done` 前由独立子 agent closure-audit。
- 共性缺陷（同一根因 ≥2 组件/跨包/公共层）按 roadmap 自动修复机制 §7 主动处理（CX-n 插入或当前 plan 内多阶段优先修复），不默认囤积 CR。

## Non-Goals

- 不审计 form 包其余组件（C2.2-C2.5/C3.x 覆盖：input-\*/textarea/select/date/markdown-editor/combo/table/transfer/picker 等）。
- 不处理跨族公共层结构性重构（公共 API/包边界/编译期）——需人工确认；纯行为修复豁免。
- 不修复 e2e pre-existing 9 失败（不属于本族组件；input-suggest 失败归属 C2.2）。

## Scope

### In Scope

- 2 组件 × 18 维审计卡（维度重点：1 Schema 契约（form fields/actions/loadAction/hiddenFieldPolicy 与 schemas.ts 一致）、2 RendererComponentProps 合规、4 表单参与（form 为字段宿主：name/required/validation 挂接、提交路径数据形状、校验错误展示与清除、field metadata data-field-\*）、5 DOM 选择器契约与 marker、6 嵌套 schema 分类（form body/actions/loadAction、fieldset body 与 08-02 机制一致，无 deepFields 残留）、7 事件与 action 契约（onSubmit/onValidate 等 payload 形状、内建动作）、9 i18n、10 四态覆盖（空/加载/错误/禁用）、11 异步生命周期（loadAction/校验异步）、12 组合宿主场景、13 样式契约（form/fieldset 为布局型：仅 marker 类）、14 React 19、17 文档对照、18 注册/包边界/IO 安全红线）。
- hidden-field 策略审查（form 卡内：`hiddenFieldPolicy` 的 validateWhenHidden/clearValueWhenHidden 语义、隐藏字段校验参与、与 form-validation.md 契约一致）。
- P0/P1 自动修复（test-first）+ P2 低成本即时修复。
- 真实浏览器宿主场景（form 提交 → 数据进入 scope、dialog 内 form 提交（bug 73 模式）、fieldset 内字段隔离）。
- 审计卡状态流转（open → fixing → fixed-pending-closure → closed）与 daily log 记录。

### Out Of Scope

- C1.3/C2.2 及以后族组件。
- checklist v2 修订（CG）。
- 结构性重构（需人工确认后另立 CX-n）。

## Failure Paths

| 可测场景编号        | 触发                                | 行为（含错误码）                                     | 可重试 | 用户可见表现         |
| ------------------- | ----------------------------------- | ---------------------------------------------------- | ------ | -------------------- |
| host-form-submit    | form 内真实输入并提交（真实浏览器） | 提交值进入目标 scope，无行 scope 污染（bug 73 模式） | 是     | 提交结果正确回显     |
| host-hidden-field   | hiddenFieldPolicy 隐藏字段参与校验  | 隐藏字段按策略校验/清除，无校验残留                  | 是     | 提交行为与策略一致   |
| host-fieldset-isol  | fieldset 内字段隔离/嵌套 body 渲染  | 字段值正确、布局仅 marker 类                         | 是     | 分组渲染正确         |
| host-validation-err | 校验失败路径                        | 错误展示与清除正确、无 stale 错误                    | 是     | 错误信息可读、可清除 |

## Test Strategy

本档选择：**必须自动化** —— form shell 是表单/校验/提交的核心回归路径（AGENTS.md 测试分层第一档）；契约/公共层修复必须 test-first（先写失败测试再实现）。验证门禁：受影响包 `pnpm --filter @nop-chaos/flux-renderers-form typecheck/build/lint/test` + 宿主场景 Playwright（programmatic DOM 断言）。

## Execution Plan

### Phase 1 - 逐组件 18 维审计与审计卡产出

Status: planned
Targets: `packages/flux-renderers-form/src/renderers/{form.tsx,form-definition.ts,fieldset.tsx,hidden-field-policy-schema.ts,form-rules.ts}`、`schemas.ts`、`docs/audits/per-component/`

- Item Types: `Proof`

- [ ] 审计前核对注册定义：form/fieldset 注册项（type/defaultSchema/fields）与 `schemas.ts` 类型一致性（维度 1/18）；hiddenFieldPolicy 的 schemaValidator 挂接位置（form-definition.ts）。
- [ ] 逐组件产出审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），P0/P1/P2/P3 裁决留痕（checklist §3）。
- [ ] 维度重点核查：form 表单参与全路径（维度 4：name/required/validation 挂接、提交数据形状、错误展示与清除、data-field-\* metadata）；hidden-field 策略（validateWhenHidden/clearValueWhenHidden 语义与 form-validation.md 契约对照）；loadAction/query/includeScope 语言（CONTEXT.md 核对）；fieldset 布局仅 marker 类（维度 13 + `check:audit-styling-suspects`）。
- [ ] 嵌套 schema 分类复验（维度 6）：form body/actions/loadAction、fieldset body 分类与 08-02 机制一致；无 deepFields 残留。
- [ ] 事件与 action 契约（维度 7）：onSubmit/onValidate/onChange 等 payload 形状、normalizeActionEvent 语义、内建动作（refreshNearest 等）注册齐全。
- [ ] 四态覆盖（维度 10）与异步生命周期（维度 11）：loadAction abort/竞态/失败态、校验异步路径；测试质量（维度 16：既有 643 单测中 form shell 相关断言正确行为）、React 19 规范（维度 14）、性能边界（维度 15）。
- [ ] 文档对照（维度 17）：form/fieldset design.md ↔ 实现 props/行为逐项核对，quick-reference.md 词条准确性，`docs/architecture/form-validation.md` 一致性。

Exit Criteria:

> 本 Phase 交付 2 张审计卡（含裁决），是后续修复的唯一事实来源。

- [ ] `docs/audits/per-component/{form,fieldset}.md` 2 张卡存在，18 维表完整、`文件:行` 证据可验证；hidden-field 策略审查结论已并入 form 卡。
- [ ] 每卡发现清单带 P0/P1/P2/P3 裁决；无 P0/P1 的卡标记 `closed`，其余 `open`。

### Phase 2 - P0/P1 自动修复（test-first）

Status: planned
Targets: 发现涉及的 renderer 文件、定义文件、schemas.ts、契约测试文件、e2e spec

- Item Types: `Fix | Proof | Decision`

- [ ] 按审计卡逐个处理 P0/P1：先写复现/回归测试（断言正确行为，非仅 not-throw），再实现修复；DOM/选择器契约变更追加 focused 契约测试与 e2e（test-first 证据：复现测试先于实现 commit）。
- [ ] P2 低成本（约 15 分钟内）当场修复；其余登记卡内 backlog 归 CR。
- [ ] 共性缺陷裁决（Decision）：同一根因影响 ≥2 组件/跨包/公共层的发现 → 按 roadmap 自动修复机制 §7 处理（当前 plan 内多阶段优先修复并事后回写 CX-n，或插入 CX-n work item）；根因单点的 `shared:` 标记归 CR。
- [ ] 修复后卡内发现标 `fixed` + commit/plan 引用；卡状态流转 `open → fixing → fixed-pending-closure`。
- [ ] 复杂/跨包 bug 修复按 AGENTS.md Bug Fix Test Coverage Rule 记录到 `docs/bugs/`（参考 `docs/bugs/73-*.md` 格式）。

Exit Criteria:

> 本 Phase 交付"发现清零或已裁定"，卡状态与代码行为一致。

- [ ] 全部 P0/P1 已修复（卡内标 `fixed` + 证据）或已显式裁定延期（仅允许依赖未落地跨 plan 机制者，标「机制落地后复验」并登记）；无静默跳过。
- [ ] 受影响包 `pnpm --filter @nop-chaos/flux-renderers-form typecheck && build && lint && test` 绿（含新增回归测试）。

### Phase 3 - 组合宿主真实浏览器场景

Status: planned
Targets: `tests/e2e/component-lab/` 新增/修改 spec、playground lab 页

- Item Types: `Proof | Fix`

- [ ] 设计并实现 ≥1 个本族真实浏览器组合宿主场景（programmatic DOM 断言，禁截图诊断）：候选——form 真实输入提交 → scope 回显、dialog 内 form 提交（bug 73 模式）、fieldset 嵌套渲染（按审计卡发现与宿主价值选择）。
- [ ] bug 73 模式专项检查：针对"单测绿但真机失败"类风险，在宿主场景中显式验证（form 输入 → store 更新 → 提交值正确）。
- [ ] 宿主场景发现的新缺陷按 Phase 2 流程修复（test-first）。
- [ ] 既有相关 e2e（simple-form/complex-form/form-ajax-includescope/surface-form-input）在本族改动后回归。

Exit Criteria:

> 本 Phase 交付"真实浏览器行为成立"。

- [ ] 宿主场景 spec 通过（Playwright，programmatic DOM 断言）；本族组件改动的回归 spec 绿。
- [ ] bug 73 模式专项检查结论记录于 daily log（pass 或带证据 fail→已修复）。

### Phase 4 - 族内回归与审计卡 closure

Status: planned
Targets: 2 张审计卡、`docs/logs/2026/08-03.md`、`docs/backlog/component-audit-roadmap.md`（C2.1 行）

- Item Types: `Proof`

- [ ] 全卡复查：18 维表结论与最终代码一致；P0/P1 清零；卡状态全部 `closed`（含 fixed-pending-closure → closed 流转）。
- [ ] 本族范围回归：`pnpm --filter @nop-chaos/flux-renderers-form test` + 相关 e2e spec 全绿；如本 plan 触及公共层（flux-react/field-frame/编译器），追加受影响包验证并记录。
- [ ] daily log 记录：2 卡 closure 汇总、修复清单（commit/plan 引用）、宿主场景结果、CX-n 插入（如有）与决策。
- [ ] 若插入了 CX-n：同步更新 roadmap Work Item Status 表（新行 + 依赖边/注释）并按 §7c 走生命周期（父 plan closure 后标 done）；结构性 CX-n 执行前标注待人工确认。
- [ ] roadmap C2.1 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审）。

Exit Criteria:

> 本 Phase 交付"可进入 closure-audit 的完成态"。

- [ ] 2 张审计卡全部 `closed`；`docs/audits/per-component/` 汇总可读。
- [ ] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session（task `ses_03c8d28d7ffe9dDlcFEZFY0Rdw`）
- Verdict: `pass`（零 Blocker/Major；4 条 Minor 全部修正：form-rules.ts 实为跨字段校验规则编译非 hidden-field 策略、validateHiddenFieldPolicySchema 行号改 :25-57、form-input-enhancements.spec.ts 位置改 tests/e2e/ 根目录、baseline e2e 归属表述修正）
- Rounds: 1
- Findings addressed: 全部文件/行引用经 live repo 核对通过（form-definition.ts:119/:123/:370、fieldset.tsx:110/:114、hidden-field-policy-schema.ts:25、643 单测基线）；Minor 已处理。

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。

- [ ] 2 张审计卡存在、18 维表完整、P0/P1 清零、全部 `closed`（hidden-field 策略审查已并入 form 卡）
- [ ] 全部 in-scope P0/P1 已 test-first 修复并有回归测试；无被静默降级到 deferred 的 live defect/contract drift
- [ ] ≥1 个真实浏览器组合宿主场景通过（含 bug 73 模式专项检查）
- [ ] 共性缺陷已按 §7 处理（CX-n 插入/合并或当前 plan 内修复，决策记录在卡与 daily log）
- [ ] 受影响的 owner docs 已同步到 live baseline（design.md/quick-reference/form-validation.md/roadmap 表按发现实际影响为准）
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
