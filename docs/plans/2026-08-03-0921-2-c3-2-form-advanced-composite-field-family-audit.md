# C3.2 form-advanced 组合字段族逐组件审计（object-field/array-field/detail-field/detail-view/variant-field）

> Plan Status: active
> Mission: component-audit
> Work Item: C3.2
> Last Reviewed: 2026-08-03
> Source: `docs/backlog/component-audit-roadmap.md`（C3.x Phase Details）、`docs/audits/component-audit-checklist.md`（18 维 + 审计卡模板 + 自动修复纪律）、`docs/logs/2026/08-03.md`、`docs/architecture/nested-schema-field-classification.md`（v8，08-02 机制）
> Related: 依赖 C0（`2026-08-02-2043-1`，completed）完成后开工；与 C3.1（`2026-08-03-0921-1`）/ C3.3（`2026-08-03-0921-3`）并行独立（均只依赖 C0）。与 C3.1 共享 `composite-field/composite-schemas.ts` 与 detail-view/variant-field 的 projected-owner-scope 机制——跨族共性问题按 roadmap「自动修复机制」§7 插入 CX-n 处理

## Purpose

对 `flux-renderers-form-advanced` 组合字段族 5 个注册组件（object-field/array-field/detail-field/detail-view/variant-field）完成 18 维逐组件审计（每组件一张审计卡，P0/P1/P2/P3 裁决留痕），P0/P1 缺陷在**同一 plan 内自动修复**（test-first + 回归测试 + 受影响包验证门禁），完成 ≥1 个真实浏览器组合宿主场景验证（含 bug 73 模式专项检查），最终 5 张审计卡全部 `closed`（P0/P1 清零）。本族是 form-advanced 组合字段核心：object-field/array-field 是结构化字段容器（嵌套 item scope、projected owner scope、remove-when gating），detail-field/detail-view 是投影表单运行时（projected-form-runtime、detail-draft-controller、value-adaptation），variant-field 是按值匹配切换的变体字段（variant-field-owner/runtime/matching）。维度 3（值所有权三态）、维度 6（嵌套 schema 分类）、维度 11（投影/提交异步生命周期）与维度 12（组合宿主）是本族重点。

## Current Baseline

- **组件与文件**：5 组件均在 `packages/flux-renderers-form-advanced/src/`——`composite-field/object-field.tsx`（type `:479`）、`composite-field/array-field.tsx`（type `:539`）、`detail-view/detail-field.tsx`（type `:400`）、`detail-view/detail-view.tsx`（type `:600`）、`variant-field/variant-field.tsx`（type `:99`）；共享机制文件：`composite-field/composite-schemas.ts`（ObjectFieldSchema/ArrayFieldSchema/VariantFieldSchema/DetailFieldSchema/DetailViewSchema，`composite-schemas.ts:13/:21/:60/:79/:192`）、`composite-field/composite-item-id.ts`、`composite-field/projected-inline-form.ts`、`composite-field/remove-when-gating.ts`、`detail-view/projected-form-runtime.ts`、`detail-view/projected-scope.ts`、`detail-view/detail-surface.tsx`、`variant-field/variant-field-owner.ts`、`variant-field/variant-field-runtime.ts`、`variant-field/variant-field-matching.ts`、`projected-owner-scope.ts`；注册经 `index.tsx` `registerRendererDefinitions(formAdvancedRendererDefinitions)`（含 TS 结构 cast 说明）。
- **设计文档**：**5 组件均无 `docs/components/{object-field,array-field,detail-field,detail-view,variant-field}/design.md`**（维度 17 缺口——需在审计中裁定：补写 design.md（低/中成本）或登记 P2 backlog 归 CR）。
- **playground**：`apps/playground/src/component-lab/renderers/` 下 5 页均存在（object-field/array-field/detail-field/detail-view/variant-field-lab-page.tsx）。
- **既有单测**：`composite-field/`（object-field-render/scope/transform/runtime、array-field-runtime/schema-coverage/object-items、composite-item-id；scalar-validation 覆盖在 `array-field.test.tsx`/`array-field-runtime.test.ts`、remove-when 覆盖在 `__tests__/b32-combo-remove-when.test.tsx`）、`detail-view/`（detail-field-basic/commit/unmount、detail-view-basic/owner-updates/transform-concurrency、projected-form-runtime、value-adaptation-helper、detail-draft-controller）、`variant-field/`（variant-field-detection/field-frame/matching/owner-contract/runtime/selector/transform/unmount）、`__tests__/composite-form-*`、`b32-array-combo-nested-isolation`（维度 16 基础厚）。
- **e2e**：`tests/e2e/w4c-composite-form-family.spec.ts` 存在（wave 4 复合表单族，与 C3.1 共享）；本族无 `tests/e2e/component-lab/c3-2-host-surfaces.spec.ts`（需新增）。
- **历史基础**：`2026-06-27-1030-3-composite-field-data-lifecycle-form-control-correctness-plan.md`、`2026-07-27-1200-1-ma41-core-runtime-test-coverage-audit.md`、`2026-07-29-row-scope-record-expansion-and-undefined-monitoring-plan.md`、b32 系列均 completed；08-02 机制（`nested-schema-field-classification` / `mechanism-unification`）为维度 6 审查依据。
- **基线**：以 C0 回写基线为准（unit 全绿 58/58；e2e pre-existing 9 项中本族无归属项，余项属 ai/scheduling/content，successor C8.1/C9/CV）。

## Goals

- 5 张审计卡（`docs/audits/per-component/{object-field,array-field,detail-field,detail-view,variant-field}.md`）18 维逐项核对完成，P0/P1/P2/P3 裁决留痕，`文件:行` 证据，全部 `closed`（P0/P1 清零）。
- 本族 P0/P1 缺陷 test-first 自动修复（契约/公共层修复 Must automate），P2 低成本当场修复、其余登记卡内 backlog 归 CR。
- ≥1 个真实浏览器组合宿主场景（含 bug 73 模式专项）：候选——form 内 object-field/array-field 嵌套提交（行 scope 不污染）、detail-view 投影编辑提交（投影 scope 与宿主 form 解耦）、variant-field 按值切换（值所有权三态）。
- roadmap C3.2 行标 `done`（独立子 agent closure-audit pass 后）；form-advanced 组合字段族审计收官留痕。

## Non-Goals

- C3.1/C3.3/C3.4/C3.5 及以后族组件；CRUD 本体（C4.2）。
- combo/input-table（C3.1）的 detail 部分（本族仅涉 object-field/array-field 的嵌套提交契约，detail 由 detail-field/detail-view 卡负责）。
- checklist v2 修订（CG）、审计工具脚本升级（CG）。
- 结构性重构（公共 API/包边界/编译期机制，需人工确认后另立 CX-n；纯行为修复不视为结构性）。
- 各审计卡 P2 backlog（>15 分钟项）归 CR 处理，不在本 plan 内实现。

## Scope

### In Scope

- 5 组件 × 18 维审计卡（维度重点：1 Schema 契约（fields 与 composite-schemas.ts 一致、variant-field 匹配器、detail-view 投影配置）、2 RendererComponentProps 合规、3 值所有权三态（object-field/array-field 嵌套值 staged owner、detail-view 投影值归属、variant-field 值切换回写、defaultValue/initValue/valueStatePath、重置/清空）、4 表单参与（name/required/validation 挂接、提交数据形状、校验错误展示与清除、data-field-\*）、5 DOM 与选择器契约（data-field/data-renderer/data-value/data-testid、detail-view 投影 marker、variant-field 分支 marker）、6 嵌套 schema 分类（无 deepFields 残留、嵌套 item schema 按 08-02 机制分类、行 scope 不污染嵌套 action args——bug 样板专项）、7 事件与 action 契约（onChange payload 形状、normalizeActionEvent 语义、detail-view 提交/重置事件）、8 a11y（嵌套表单键盘路径、variant 切换可达性、detail 只读视图语义）、9 i18n（placeholder/操作文案 key 存在性）、10 四态覆盖（空值/加载/错误/禁用/readOnly）、11 异步生命周期（detail-view 投影表单异步校验、object-field/array-field 异步 validation、abort/竞态/失败态/重试、env IO 边界 INV-1——本族无远程数据则 n-a 注明）、12 组合宿主场景（form 内嵌套提交、CRUD 行内 detail-view 投影、无 scope 上下文）、13 样式契约（widget 自样式、嵌套布局仅 marker）、14 React 19、15 性能边界（大数组项、投影 scope 订阅清理、selector 精度）、16 测试质量（断言正确行为而非 not-throw、DOM 契约断言、错误路径、投影运行时测试有效性）、17 文档对照（**5 组件均无 design.md——裁定补写或登记 P2 backlog 归 CR**；quick-reference.md 词条存在性）、18 注册/包边界/IO 安全红线（surface 双注册、detail-view 投影 form 的 IO 边界、projected-owner-scope 不进 schema-visible scope——INV-3/INV-4 复用边界））。
- P0/P1 自动修复（test-first）+ P2 低成本即时修复。
- 真实浏览器宿主场景（form 内 object-field/array-field 嵌套提交（bug 73 模式）、detail-view 投影编辑提交、variant-field 按值切换）。
- 审计卡状态流转（open → fixing → fixed-pending-closure → closed）与 daily log 记录。

### Out Of Scope

- C3.1/C3.3/C3.4/C3.5 及以后族组件；CRUD 本体（C4.2）。
- checklist v2 修订（CG）。
- 结构性重构（需人工确认后另立 CX-n）。
- e2e pre-existing 剩余项（ai/scheduling/content 包，successor C8.1/C9/CV）。

## Failure Paths

| 可测场景编号        | 触发                                          | 行为（含错误码）                                  | 可重试 | 用户可见表现       |
| ------------------- | --------------------------------------------- | ------------------------------------------------- | ------ | ------------------ |
| host-objarr-submit  | form 内 object-field/array-field 嵌套编辑提交 | 嵌套值进入 store、提交数据形状正确（bug 73 模式） | 是     | 提交结果正确回显   |
| host-detail-proj    | detail-view 投影编辑提交                      | 投影 scope 与宿主 form 解耦、提交值正确           | 是     | 投影值正确写回宿主 |
| host-variant-switch | variant-field 值变化触发分支切换              | 分支值按匹配器切换、无 stale、无循环              | 是     | 可见字段随值变化   |
| host-obj-disabled   | disabled/readOnly 态嵌套编辑                  | 不可编辑、不崩溃、提交不变化                      | 是     | 只读表现正确       |

## Test Strategy

本档选择：**必须自动化** —— 组合字段族是表单核心回归路径（嵌套提交数据形状、值所有权三态、投影 scope 解耦），且维度 6 承接 bug 样板（行 scope 污染）与 08-02 机制；契约/公共层修复必须 test-first（先写失败测试再实现）。验证门禁：受影响包 `pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck/build/lint/test` + 相关 e2e 回归（w4c-composite-form-family.spec.ts）+ 本族新增宿主场景 Playwright（programmatic DOM 断言）。

## Execution Plan

### Phase 1 - 逐组件 18 维审计与审计卡产出

Status: planned
Targets: `packages/flux-renderers-form-advanced/src/composite-field/{object-field.tsx,array-field.tsx,composite-schemas.ts}`、`detail-view/{detail-field.tsx,detail-view.tsx,projected-form-runtime.ts,detail-surface.tsx}`、`variant-field/{variant-field.tsx,variant-field-owner.ts,variant-field-runtime.ts}`、`docs/audits/per-component/`

- Item Types: `Proof`

- [ ] 审计前核对注册定义：5 组件注册项（type/fields/componentCapabilityContracts）与 `composite-schemas.ts` 类型一致（维度 1/18）；projected-owner-scope/detail-view projected-form-runtime 机制边界定位。
- [ ] 产出 5 张审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），P0/P1/P2/P3 裁决留痕（checklist §3）。
- [ ] 维度重点核查：值所有权三态（维度 3：object-field/array-field 嵌套 staged owner、detail-view 投影值归属、variant-field 值切换回写）；嵌套 schema 分类（维度 6：无 deepFields 残留、嵌套 item schema 按 08-02 机制分类、行 scope 不污染——bug 样板专项核对）。
- [ ] 异步生命周期专项（维度 11）：detail-view 投影表单异步校验、object-field/array-field 异步 validation——abort/竞态/失败态/重试；本族无远程数据组件标 n-a 注明。
- [ ] a11y/i18n 专项（维度 8/9）：嵌套表单键盘路径、variant 切换可达性、detail 只读视图语义；文案 key 存在性（含 aria-label/title）。
- [ ] 四态覆盖（维度 10）与测试质量（维度 16）：既有单测（composite-field/detail-view/variant-field 各 _.test._）断言正确行为而非 not-throw、DOM 契约断言、错误路径；React 19 规范（维度 14）、性能边界（维度 15：投影 scope 订阅清理、selector 精度）。
- [ ] 文档对照（维度 17）：**5 组件无 design.md——裁定（Decision）：补写 design.md（若成本 ≤15 分钟/份）或登记 P2 backlog 归 CR**；quick-reference.md 词条存在性与准确性。

Exit Criteria:

> 本 Phase 交付 5 张审计卡（含裁决），是后续修复的唯一事实来源。

- [ ] `docs/audits/per-component/{object-field,array-field,detail-field,detail-view,variant-field}.md` 5 卡存在，18 维表完整、`文件:行` 证据可验证。
- [ ] 每卡发现清单带 P0/P1/P2/P3 裁决；无 P0/P1 的卡标记 `closed`，其余 `open`；design.md 缺口裁定已记录（补写或 backlog）。

### Phase 2 - P0/P1 自动修复（test-first）

Status: planned
Targets: 发现涉及的 renderer/机制文件、composite-schemas.ts、契约测试文件、e2e spec

- Item Types: `Fix | Proof | Decision`

- [ ] 按审计卡处理 P0/P1：先写复现/回归测试（断言正确行为，非仅 not-throw），再实现修复；DOM/选择器契约变更追加 focused 契约测试与 e2e（test-first 证据：复现测试先于实现）。
- [ ] P2 低成本（约 15 分钟内）当场修复；其余登记卡内 backlog 归 CR。
- [ ] 共性缺陷裁决（Decision）：projected-owner-scope/detail-view projected-form-runtime/composite-schemas 等公共机制发现影响 ≥2 组件/跨包 → 按 roadmap 自动修复机制 §7 处理（当前 plan 内优先修复并事后回写 CX-n，或插入 CX-n work item）；根因单点 `shared:` 标记归 CR。
- [ ] 修复后卡内发现标 `fixed` + commit/plan 引用；卡状态流转 `open → fixing → fixed-pending-closure`。
- [ ] 复杂/跨包 bug 修复按 AGENTS.md Bug Fix Test Coverage Rule 记录到 `docs/bugs/`（参考 `docs/bugs/73-*.md` 格式）。

Exit Criteria:

> 本 Phase 交付"发现清零或已裁定"，卡状态与代码行为一致。

- [ ] 全部 P0/P1 已修复（卡内标 `fixed` + 证据）或已显式裁定延期（仅允许依赖未落地跨 plan 机制者，标「机制落地后复验」并登记）；无静默跳过。
- [ ] 受影响包 `pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck && build && lint && test` 绿（含新增回归测试）。

### Phase 3 - 组合宿主真实浏览器场景

Status: planned
Targets: `tests/e2e/component-lab/c3-2-host-surfaces.spec.ts`（新增）、playground lab 页

- Item Types: `Proof | Fix`

- [ ] 设计并实现 ≥1 个本族真实浏览器组合宿主场景（programmatic DOM 断言，禁截图诊断）：候选——form 内 object-field/array-field 嵌套编辑+提交（bug 73 模式：嵌套值 → store 更新 → 提交值正确）、detail-view 投影编辑提交（投影 scope 与宿主 form 解耦）、variant-field 按值切换（值所有权三态）。
- [ ] bug 73 模式专项检查：在宿主场景中显式验证单测绿但真机失败类风险（嵌套提交行 scope 污染、detail-view 投影真机写回宿主）。
- [ ] 宿主场景发现的新缺陷按 Phase 2 流程修复（test-first）。
- [ ] 既有相关 e2e（`tests/e2e/w4c-composite-form-family.spec.ts`）在本族改动后回归。

Exit Criteria:

> 本 Phase 交付"真实浏览器行为成立"。

- [ ] 宿主场景 spec 通过（Playwright，programmatic DOM 断言）；w4c-composite-form-family.spec.ts 回归绿。
- [ ] bug 73 模式专项检查结论记录于 daily log（pass 或带证据 fail→已修复）。

### Phase 4 - 族内回归与审计卡 closure

Status: planned
Targets: 审计卡、`docs/logs/2026/08-03.md`、`docs/backlog/component-audit-roadmap.md`（C3.2 行）

- Item Types: `Proof`

- [ ] 全卡复查：18 维表结论与最终代码一致；P0/P1 清零；5 卡状态 `closed`（含 fixed-pending-closure → closed 流转）。
- [ ] 本族范围回归：`pnpm --filter @nop-chaos/flux-renderers-form-advanced test` + 相关 e2e spec 全绿；如本 plan 触及公共层（flux-react/field-frame/编译器），追加受影响包验证并记录。
- [ ] daily log 记录：5 卡 closure 汇总、修复清单（commit/plan 引用）、宿主场景结果、design.md 缺口裁定结论、CX-n 插入（如有）与决策、form-advanced 组合字段族收官留痕。
- [ ] 若插入了 CX-n：同步更新 roadmap Work Item Status 表（新行 + 依赖边/注释）并按 §7b（事后回写：父 plan closure 后标 done）/§7c（正常生命周期）走；结构性 CX-n 执行前标注待人工确认。
- [ ] roadmap C3.2 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审）。

Exit Criteria:

> 本 Phase 交付"可进入 closure-audit 的完成态"。

- [ ] 5 张审计卡全部 `closed`；`docs/audits/per-component/` 汇总可读。
- [ ] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置、组合字段族收官记录）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session（task `ses_03ac7befdffeulMf2l6QZD6kCS`）
- Verdict: `pass-with-minors`（零 Blocker/Major；Minor 已处理：composite-schemas.ts 行号校准 `:13/:21/:60/:79/:192`、测试文件位置纠正（colocated 于 `composite-field/` 非 `__tests__/`）、scalar-validation/remove-when 覆盖位置注明、ma41 引用改 `2026-07-27-1200-1`）
- Rounds: 1
- Findings addressed: 全部文件/行引用经 live repo 核对通过（5 组件 type 行 `:479/:539/:400/:600/:99`、5 Schema、5 组件无 design.md、5 lab 页、测试文件、w4c e2e spec、roadmap C3.2 `todo` 仅依赖 C0、无既有审计卡）；Minor 已处理。

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。

- [ ] 5 张审计卡存在、18 维表完整、P0/P1 清零、全部 `closed`
- [ ] 全部 in-scope P0/P1 已 test-first 修复并有回归测试；无被静默降级到 deferred 的 live defect/contract drift
- [ ] ≥1 个真实浏览器组合宿主场景通过（含 bug 73 模式专项检查与嵌套提交行 scope 污染核对）
- [ ] 共性缺陷已按 §7 处理（CX-n 插入/合并或当前 plan 内修复，决策记录在卡与 daily log）
- [ ] 受影响的 owner docs 已同步到 live baseline（design.md/quick-reference/roadmap 表按发现实际影响为准）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 各审计卡 P2 backlog（成本 >15 分钟的非阻断体验/文档/测试加固项，含 5 组件 design.md 缺口若裁定不补写）

- Classification: `optimization candidate`
- Why Not Blocking Closure: checklist §3 明确 P2 可入审计卡 backlog 由 CR 自动处理；design.md 缺口不影响组件运行时契约成立，由 CR 集中补文档或按 CG 节奏处理。
- Successor Required: `yes`
- Successor Path: CR work item（跨族集中修复）

### 依赖未落地跨 plan 机制的发现（若有，「机制落地后复验」）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 依赖的机制未落地时无法在卡内闭合；按 checklist §3 自动修复纪律（「机制落地后复验」显式登记）由 CR 集中复验，卡内不悬挂。
- Successor Required: `yes`
- Successor Path: CR work item

### e2e pre-existing 其余项（ai/scheduling/content 包）

- Classification: `watch-only residual`
- Why Not Blocking Closure: C0 已逐项裁定为 mission 未触及包失败，successor 归属 C8.1/C9/CV；不在本族 scope。
- Successor Required: `yes`
- Successor Path: C8.1/C9/CV work item

## Non-Blocking Follow-ups

- 审计中发现但裁定为 P3（风格 nit/注释）的项仅卡内记录，不处理。
- 工具脚本新增模式（若有）记入卡内，CG 统一升级。

## Closure

Status Note: 待执行

Closure Audit Evidence:

- Auditor / Agent: 待独立子 agent fresh session（mission-driver CLOSURE_VERIFY 阶段）
- Evidence: 待填写

Follow-up:

- 待执行后填写
