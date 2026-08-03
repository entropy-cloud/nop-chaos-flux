# C3.1 form-advanced 复合输入族逐组件审计（combo/input-table/transfer/picker）

> Plan Status: completed
> Mission: component-audit
> Work Item: C3.1
> Last Reviewed: 2026-08-03
> Source: `docs/backlog/component-audit-roadmap.md`（C3.x Phase Details）、`docs/audits/component-audit-checklist.md`（18 维 + 审计卡模板 + 自动修复纪律）、`docs/logs/2026/08-03.md`、`CONTEXT.md`（CRUD 域：picker + loadAction 设计语言）
> Related: 依赖 C0（`2026-08-02-2043-1`，completed）完成后开工；与 C3.2（`2026-08-03-0921-2`）/ C3.3（`2026-08-03-0921-3`）并行独立（均只依赖 C0）。form-advanced 复合输入族的 shared 文件（`composite-field/composite-schemas.ts`、`picker-helpers.ts`、`picker-dropdown.tsx`）与 C3.2 组合字段族、C3.4 轻量编辑族共享——跨族共性问题按 roadmap「自动修复机制」§7 插入 CX-n 处理，不默认推给 CR

## Purpose

对 `flux-renderers-form-advanced` 复合输入族 4 个注册组件（combo/input-table/transfer/picker）完成 18 维逐组件审计（每组件一张审计卡，P0/P1/P2/P3 裁决留痕），P0/P1 缺陷在**同一 plan 内自动修复**（test-first + 回归测试 + 受影响包验证门禁），完成 ≥1 个真实浏览器组合宿主场景验证（含 bug 73 模式"单测绿但真机失败"专项检查），最终 4 张审计卡全部 `closed`（P0/P1 清零）。本族是 form-advanced 复合字段核心：combo 是重复/对象字段容器、input-table 是表格形数组字段、transfer 是穿梭选择字段、picker 是弹层选择字段（CRUD 域设计语言组成部分，`CONTEXT.md`），staged owner 语义、嵌套 item scope、行 scope 污染（bug 样板）是维度 3/6/12 重点。

## Current Baseline

- **组件与文件**：4 组件均在 `packages/flux-renderers-form-advanced/src/`——`combo-renderer.tsx`（definition `:553`）、`input-table-renderer.tsx`（definition `:617`）、`transfer-renderer.tsx`（definition `:443`）、`picker-renderer.tsx`（definition `:482`）；共享文件：`composite-field/composite-schemas.ts`（ComboSchema `:99`/InputTableSchema `:125`/TransferSchema `:146`/PickerSchema `:177`）、`picker-dropdown.tsx`、`picker-helpers.ts`、`picker-option-list.tsx`、`upload-field.tsx`；注册经 `index.tsx` `registerRendererDefinitions(formAdvancedRendererDefinitions)`。
- **设计文档**：`docs/components/combo/design.md`、`docs/components/input-table/design.md`、`docs/components/transfer/design.md`、`docs/components/picker/design.md` 均存在（维度 17 可核对）；picker design.md 含 W4c 收敛裁定（picker 是字段值选择壳，复用 dialog/drawer surface owner）。
- **playground**：`apps/playground/src/component-lab/renderers/` 下 4 页均存在（combo/input-table/transfer/picker-lab-page.tsx）。
- **既有单测**：`__tests__/combo-renderer.test.tsx`、`input-table-renderer.test.tsx`、`transfer-renderer.test.tsx`、`picker-renderer.test.tsx`、`g1-g11-picker-upload.test.tsx`、`b32-combo-remove-when.test.tsx`、`b32-array-combo-nested-isolation.test.tsx` 等（维度 16）。
- **e2e**：`tests/e2e/w4c-composite-form-family.spec.ts` 存在（wave 4 复合表单族）；本族无 `tests/e2e/component-lab/c3-1-host-surfaces.spec.ts`（需新增）。
- **历史基础**：`2026-06-24-0718-1-w3d-advanced-input-family-plan.md`、`2026-06-27-1030-3-composite-field-data-lifecycle-form-control-correctness-plan.md`、`2026-07-29-row-scope-record-expansion-and-undefined-monitoring-plan.md`（combo 行 scope）、b32 系列（array/combo 嵌套隔离与提交校验）均 completed；复合字段嵌套 schema 分类依赖 08-02 机制（`nested-schema-field-classification` / `mechanism-unification` / `ajax-validation-migration` 三个 active/completed plan，维度 6 审查依据）。
- **基线**：以 C0 回写基线为准（unit 全绿 58/58；e2e pre-existing 9 中本族无归属项，其余 9 项属 ai/scheduling/content/form input-suggest——input-suggest 已在 C2.2 修复，当前 e2e 失败余项为 ai-chat timestamp、ai-rich-text-sender ×5、calendar-demo nav、diff-perf 200ms，successor C8.1/C9/CV）。

## Goals

- 4 张审计卡（`docs/audits/per-component/{combo,input-table,transfer,picker}.md`）18 维逐项核对完成，P0/P1/P2/P3 裁决留痕，`文件:行` 证据，全部 `closed`（P0/P1 清零）。
- 本族 P0/P1 缺陷 test-first 自动修复（契约/公共层修复 Must automate），P2 低成本当场修复、其余登记卡内 backlog 归 CR。
- ≥1 个真实浏览器组合宿主场景（含 bug 73 模式专项）：候选——form 内 combo 嵌套提交（行 scope 不污染）、picker 在 CRUD 行内选择写回（`CONTEXT.md` CRUD 域场景）、transfer 值所有权三态 echo、input-table 表格编辑提交。
- roadmap C3.1 行标 `done`（独立子 agent closure-audit pass 后）；form-advanced 复合输入族审计收官留痕。

## Non-Goals

- C3.2/C3.3 及以后族组件（组合字段/condition-builder/轻量编辑/媒体富文本）。
- CRUD 本体（C4.2）；picker 仅以"字段值选择壳"契约审计，CRUD 行内宿主场景作为维度 12 验证点。
- checklist v2 修订（CG）、审计工具脚本升级（CG）。
- 结构性重构（公共 API/包边界/编译期机制，需人工确认后另立 CX-n；纯行为修复不视为结构性）。
- 各审计卡 P2 backlog（>15 分钟项）归 CR 处理，不在本 plan 内实现。

## Scope

### In Scope

- 4 组件 × 18 维审计卡（维度重点：1 Schema 契约（fields 与 composite-schemas.ts 一致、combo/input-table 嵌套列/项 schema 分类、picker pickerDialog 配置对象）、2 RendererComponentProps 合规、3 值所有权三态（combo 数组值 staged owner、input-table 表格值、transfer 受控 echo、picker 选中值回写、defaultValue/initValue/valueStatePath、重置/清空）、4 表单参与（name/required/validation 挂接、提交数据形状、校验错误展示与清除、data-field-\*）、5 DOM 与选择器契约（data-field/data-renderer/data-value/data-testid、transfer 穿梭面板 marker、picker 弹层 data-slot）、6 嵌套 schema 分类（无 deepFields 残留、combo 项内嵌 schema 按 08-02 机制分类、行 scope 不污染嵌套 action args——bug 样板专项）、7 事件与 action 契约（onChange payload 形状、normalizeActionEvent 语义、picker open/clear handle）、8 a11y（transfer 穿梭键鼠路径、picker 弹层焦点管理、combo 添加/删除按钮键盘可达）、9 i18n（placeholder/穿梭/弹层文案 key 存在性）、10 四态覆盖（空值/加载/错误/禁用/readOnly）、11 异步生命周期（picker 内嵌 loadAction/远程列表、transfer 远程选项：abort/竞态/失败态/重试、env IO 边界 INV-1）、12 组合宿主场景（CRUD 行内 picker 选择、form 内 combo 嵌套提交、dialog 内 input-table 编辑）、13 样式契约（widget 自样式、layout 部分仅 marker）、14 React 19、15 性能边界（combo 大数组项、input-table 大表格行、selector 精度）、16 测试质量（断言正确行为而非 not-throw、DOM 契约断言、错误路径）、17 文档对照（4 design.md ↔ 实现 props/行为）、18 注册/包边界/IO 安全红线（surface 双注册、picker 弹层 env IO、上传/附件路径——input-table 涉及 upload 子链路的 INV-1 核对））。
- P0/P1 自动修复（test-first）+ P2 低成本即时修复。
- 真实浏览器宿主场景（form 内 combo 嵌套提交（bug 73 模式）、CRUD 行内 picker 选择写回、transfer 三态 echo）。
- 审计卡状态流转（open → fixing → fixed-pending-closure → closed）与 daily log 记录。

### Out Of Scope

- C3.2/C3.3 及以后族组件；CRUD 本体（C4.2）。
- checklist v2 修订（CG）。
- 结构性重构（需人工确认后另立 CX-n）。
- e2e pre-existing 剩余 9 项中属 ai/scheduling/content 的项（successor C8.1/C9/CV）。

## Failure Paths

| 可测场景编号         | 触发                                     | 行为（含错误码）                                 | 可重试 | 用户可见表现        |
| -------------------- | ---------------------------------------- | ------------------------------------------------ | ------ | ------------------- |
| host-combo-submit    | form 内 combo 嵌套多行编辑并提交（真机） | 行 scope 不污染、提交数据形状正确（bug 73 模式） | 是     | 提交结果正确回显    |
| host-picker-row      | CRUD 行内 picker 打开并选择写回          | 选中值写回正确、行 scope 无污染（`CONTEXT.md`）  | 是     | 行内值正确更新      |
| host-transfer-echo   | 受控 transfer 值外部更新                 | echo 正确、无 stale 值、无循环                   | 是     | 值随外部 scope 同步 |
| host-itable-disabled | disabled/readOnly 态 input-table 编辑    | 不可编辑、不崩溃、提交不变化                     | 是     | 只读表现正确        |

## Test Strategy

本档选择：**必须自动化** —— 复合输入族是表单核心回归路径（提交数据形状、值所有权三态、嵌套 item scope），且维度 6 承接 bug 样板（行 scope 污染）与 08-02 机制；契约/公共层修复必须 test-first（先写失败测试再实现）。验证门禁：受影响包 `pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck/build/lint/test` + 相关 e2e 回归（w4c-composite-form-family.spec.ts）+ 本族新增宿主场景 Playwright（programmatic DOM 断言）。

## Execution Plan

### Phase 1 - 逐组件 18 维审计与审计卡产出

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/{combo-renderer.tsx,input-table-renderer.tsx,transfer-renderer.tsx,picker-renderer.tsx,picker-dropdown.tsx,picker-helpers.ts,upload-field.tsx}`、`composite-field/composite-schemas.ts`、`index.tsx`、`docs/audits/per-component/`

- Item Types: `Proof`

- [x] 审计前核对注册定义：4 组件注册项（type/fields/componentCapabilityContracts）与 `composite-schemas.ts` 类型一致（维度 1/18）；shared 文件（picker-helpers/picker-dropdown）边界定位。
- [x] 产出 4 张审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），P0/P1/P2/P3 裁决留痕（checklist §3）。
- [x] 维度重点核查：值所有权三态（维度 3：combo 数组 staged owner、transfer 受控 echo、picker 选中值回写）；嵌套 schema 分类（维度 6：无 deepFields 残留、combo 项/input-table 列内嵌 schema 与 action 按 08-02 机制分类、行 scope 不污染——bug 样板专项核对）。
- [x] 异步生命周期专项（维度 11）：picker 内嵌 loadAction/远程列表、transfer 远程选项——abort/竞态/失败态/重试、env IO 边界 INV-1（upload 子链路经 RendererEnv）。
- [x] a11y/i18n 专项（维度 8/9）：transfer 穿梭键鼠路径、picker 弹层焦点管理、combo 增删按钮键盘可达；文案 key 存在性（含 aria-label/title）。
- [x] 四态覆盖（维度 10）与测试质量（维度 16）：既有单测断言正确行为而非 not-throw、DOM 契约断言、错误路径；React 19 规范（维度 14）、性能边界（维度 15：combo 大数组、input-table 大表格、selector 精度）。
- [x] 文档对照（维度 17）：4 个 design.md ↔ 实现 props/行为逐项核对；quick-reference.md 词条准确性。

Exit Criteria:

> 本 Phase 交付 4 张审计卡（含裁决），是后续修复的唯一事实来源。

- [x] `docs/audits/per-component/{combo,input-table,transfer,picker}.md` 4 卡存在，18 维表完整、`文件:行` 证据可验证。
- [x] 每卡发现清单带 P0/P1/P2/P3 裁决；无 P0/P1 的卡标记 `closed`，其余 `open`。

### Phase 2 - P0/P1 自动修复（test-first）

Status: completed
Targets: 发现涉及的 renderer/定义文件、composite-schemas.ts、契约测试文件、e2e spec

- Item Types: `Fix | Proof | Decision`

- [x] 按审计卡处理 P0/P1：先写复现/回归测试（断言正确行为，非仅 not-throw），再实现修复；DOM/选择器契约变更追加 focused 契约测试与 e2e（test-first 证据：复现测试先于实现）。
- [x] P2 低成本（约 15 分钟内）当场修复；其余登记卡内 backlog 归 CR。
- [x] 共性缺陷裁决（Decision）：shared 文件（composite-schemas/picker-helpers/upload-field）或公共层发现影响 ≥2 组件/跨包 → 按 roadmap 自动修复机制 §7 处理（当前 plan 内优先修复并事后回写 CX-n，或插入 CX-n work item）；根因单点 `shared:` 标记归 CR。
- [x] 修复后卡内发现标 `fixed` + commit/plan 引用；卡状态流转 `open → fixing → fixed-pending-closure`。
- [x] 复杂/跨包 bug 修复按 AGENTS.md Bug Fix Test Coverage Rule 记录到 `docs/bugs/`（参考 `docs/bugs/73-*.md` 格式）。

Exit Criteria:

> 本 Phase 交付"发现清零或已裁定"，卡状态与代码行为一致。

- [x] 全部 P0/P1 已修复（卡内标 `fixed` + 证据）或已显式裁定延期（仅允许依赖未落地跨 plan 机制者，标「机制落地后复验」并登记）；无静默跳过。
- [x] 受影响包 `pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck && build && lint && test` 绿（含新增回归测试）。

### Phase 3 - 组合宿主真实浏览器场景

Status: completed
Targets: `tests/e2e/component-lab/c3-1-host-surfaces.spec.ts`（新增）、playground lab 页

- Item Types: `Proof | Fix`

- [x] 设计并实现 ≥1 个本族真实浏览器组合宿主场景（programmatic DOM 断言，禁截图诊断）：候选——form 内 combo 嵌套多行编辑+提交（bug 73 模式：行 scope 不污染 → store 更新 → 提交值正确）、CRUD 行内 picker 选择写回（`CONTEXT.md` CRUD 域场景）、transfer 受控 echo、input-table 表格编辑提交。
- [x] bug 73 模式专项检查：在宿主场景中显式验证单测绿但真机失败类风险（行 scope 污染、picker 弹层真机选择写回）。
- [x] 宿主场景发现的新缺陷按 Phase 2 流程修复（test-first）。
- [x] 既有相关 e2e（`tests/e2e/w4c-composite-form-family.spec.ts`）在本族改动后回归。

Exit Criteria:

> 本 Phase 交付"真实浏览器行为成立"。

- [x] 宿主场景 spec 通过（Playwright，programmatic DOM 断言）；w4c-composite-form-family.spec.ts 回归绿。
- [x] bug 73 模式专项检查结论记录于 daily log（pass 或带证据 fail→已修复）。

### Phase 4 - 族内回归与审计卡 closure

Status: completed
Targets: 审计卡、`docs/logs/2026/08-03.md`、`docs/backlog/component-audit-roadmap.md`（C3.1 行）

- Item Types: `Proof`

- [x] 全卡复查：18 维表结论与最终代码一致；P0/P1 清零；4 卡状态 `closed`（含 fixed-pending-closure → closed 流转）。
- [x] 本族范围回归：`pnpm --filter @nop-chaos/flux-renderers-form-advanced test` + 相关 e2e spec 全绿；如本 plan 触及公共层（flux-react/field-frame/编译器），追加受影响包验证并记录。
- [x] daily log 记录：4 卡 closure 汇总、修复清单（commit/plan 引用）、宿主场景结果、CX-n 插入（如有）与决策、form-advanced 复合输入族收官留痕。
- [x] 若插入了 CX-n：同步更新 roadmap Work Item Status 表（新行 + 依赖边/注释）并按 §7b（事后回写：父 plan closure 后标 done）/§7c（正常生命周期）走；结构性 CX-n 执行前标注待人工确认。
- [x] roadmap C3.1 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审；已交付全部执行证据，由 mission-driver CLOSURE_VERIFY fresh session 执行 audit 后收口）。

Exit Criteria:

> 本 Phase 交付"可进入 closure-audit 的完成态"。

- [x] 4 张审计卡全部 `closed`；`docs/audits/per-component/` 汇总可读。
- [x] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置、复合输入族收官记录）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session（task `ses_03ac7d39cffeiJV5mJbjZQLtMb`）
- Verdict: `pass-with-minors`（零 Blocker/Major；Minor 已处理：combo/input-table/transfer/picker 定义行号校准为 definition 行 `:553/:617/:443/:482`、schema 行号补全 `composite-schemas.ts:99/:125/:146/:177`）
- Rounds: 1
- Findings addressed: 全部文件/行引用经 live repo 核对通过（4 定义文件、composite-schemas.ts 4 Schema、4 design.md、4 lab 页、7 测试文件、w4c e2e spec、C0 及 C1.x/C2.x 前置计划 completed、CONTEXT.md CRUD 域、roadmap C3.1 `todo` 仅依赖 C0、无既有审计卡）；Minor 已处理。

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。

- [x] 4 张审计卡存在、18 维表完整、P0/P1 清零、全部 `closed`
- [x] 全部 in-scope P0/P1 已 test-first 修复并有回归测试；无被静默降级到 deferred 的 live defect/contract drift
- [x] ≥1 个真实浏览器组合宿主场景通过（含 bug 73 模式专项检查与行 scope 污染核对）
- [x] 共性缺陷已按 §7 处理（CX-n 插入/合并或当前 plan 内修复，决策记录在卡与 daily log）
- [x] 受影响的 owner docs 已同步到 live baseline（design.md/quick-reference/roadmap 表按发现实际影响为准）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 各审计卡 P2 backlog（成本 >15 分钟的非阻断体验/文档/测试加固项）

- Classification: `optimization candidate`
- Why Not Blocking Closure: checklist §3 明确 P2 可入审计卡 backlog 由 CR 自动处理；不阻塞本族 supported baseline 成立。
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

Status Note: 2026-08-03 四 Phase 全部执行完成（Plan Status: completed）。4 卡 closed、P0/P1 清零（P1-1×3 + P1-2 共性 + P2-1×2 fixed）、宿主场景 6/6、w4c 回归 8/8、component-lab 187 全绿、form-advanced 939 tests 全绿。CX-8 按 §7b 事后回写（planned）。closure-audit 由独立子 agent fresh session（mission-driver CLOSURE_VERIFY 阶段）执行并勾选 Closure Gates closure-audit 项、回填 Audit Evidence 后收口；roadmap C3.1 行标 `done` 前置满足。

Closure Audit Evidence:

- Auditor / Agent: mission-driver CLOSURE_VERIFY fresh session（独立子 agent，非执行 session；2026-08-03）
- Evidence: 独立复核 live repo 通过：① 4 审计卡存在且 `closed`（`docs/audits/per-component/{combo,input-table,transfer,picker}.md`，18 维表 + `文件:行` 证据 + P0/P1 清零，P1-1×3/P1-2/P2-1×2 均标 fixed）；② 修复落地核验：combo `FormLayoutContext.Provider staticReadOnly`（combo-renderer.tsx:117-129,167-173）、input-table removeWhen fields 注册（input-table-renderer.tsx:431）+ InputTableRow 只读传播（input-table-row.tsx:137-144,191-201）、transfer onSelectAll 注册/派发（transfer-renderer.tsx:171,472）+ checkAllLabel i18n（en-US.ts:234 / zh-CN.ts:235）、picker 状态路径按 cid 隔离（picker-renderer.tsx:92）+ labelResolve 失败重试；③ 6 个新测试文件存在（先红后绿记录于 daily log）；④ `c3-1-host-surfaces.spec.ts` 6 用例（combo/input-table×2/transfer×2/picker，含 bug 73 模式专项 host-combo-submit/host-picker-row/host-itable-disabled）；⑤ `docs/logs/2026/08-03.md` 完整收口记录（四 Phase、939 tests、58/58 tasks、31/31 typecheck/build/lint）；⑥ CX-8 已回写 roadmap（planned，§7b）。本审计 session 完成收口动作：Closure Gates closure-audit 项勾选 + Audit Evidence 回填 + roadmap C3.1 行标 `done` + CX-8 按 §7b 标 done。

Follow-up:

- 无剩余 plan-owned work（P3 ×7 卡内记录归 CR；C3.2/C3.3 的 array-field/object-field/detail-field 同型 readOnly 传播缺口由 CX-8 机制覆盖）
