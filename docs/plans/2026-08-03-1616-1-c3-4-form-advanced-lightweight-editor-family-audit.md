# C3.4 form-advanced 轻量编辑族逐组件审计

> Plan Status: completed
> Mission: component-audit
> Work Item: C3.4
> Last Reviewed: 2026-08-03
> Source: `docs/backlog/component-audit-roadmap.md`（C3.x Phase Details）、`docs/audits/component-audit-checklist.md`（18 维 + 审计卡模板 + 自动修复纪律；§3「与 deep-audit-prompts 23 维的关系」复杂交互渲染器必选 21-23）、`docs/skills/deep-audit-prompts.md`、`CONTEXT.md`（CRUD 域设计语言——本族为复合表单值编辑器，值所有权语义与 CRUD scope 同源）、`docs/logs/2026/08-03.md`
> Related: 依赖 C0（`2026-08-02-2043-1`，completed）完成后开工；与 C3.5（`2026-08-03-1616-2`）/ C4.1（`2026-08-03-1616-3`）并行独立（均只依赖 C0）。历史计划：`2026-06-22-0330-2-e3-form-input-number-array-keyvalue-plan.md`（completed——array-editor/key-value minItems/maxItems+reorder）、`2026-06-21-2146-1-x1-doaction-command-family-unification-plan.md`（completed——array-editor/key-value `component:addItem`/`removeItem`/`moveItem` handles，由 successor `2026-06-22-1137-1-x1-successor-composite-editor-handles-plan.md` 收口）、`2026-07-13-icon-system-antd-mapping-and-icon-picker-plan.md`（completed——icon-picker 落地，含 Deferred：iconTemplate region / component:open handle）

## Purpose

对 `flux-renderers-form-advanced` 轻量编辑族 4 组件（tag-list/key-value/array-editor/icon-picker）完成 18 维逐组件审计（4 张审计卡，P0/P1/P2/P3 裁决留痕），P0/P1 缺陷在**同一 plan 内自动修复**（test-first + 回归测试 + 受影响包验证门禁），完成 ≥1 个真实浏览器组合宿主场景验证（含 bug 73 模式专项检查），最终全部审计卡 `closed`（P0/P1 清零）。重点维度：3 值所有权三态（array-editor/key-value 行内编辑写回与重置、tag-list 受控 echo）、4 表单参与（minItems/maxItems/required 校验挂接）、8 a11y（行增删/重排键盘路径）、10 四态覆盖（readOnly/disabled 传播——CX-8 同型缺口复验）、15 性能边界（行增删 O(n²)、icon-picker 图标列表渲染）。

## Current Baseline

- **组件与文件**（均属 `flux-renderers-form-advanced`）：
  - `tag-list.tsx`（type `:146`，`registerRendererDefinitions` 经 `index.tsx` 注册；`tag-list.test.tsx` 存在）
  - `key-value.tsx`（schema type `:422` + renderer def `:636`；`key-value.test.tsx` + `key-value-normalizer.ts` 共享规范化模块）
  - `array-editor.tsx`（schema type `:410` + renderer def `:605`；**无专属单测文件**——维度 16 需审计覆盖来源）
  - `icon-picker.tsx`（schema type `:26` + renderer def `:279`；`__tests__/icon-picker.test.tsx` 存在；2026-07-13 图标系统计划已落地，含 iconTemplate/component:open 两项 Deferred）
- **设计文档**：`docs/components/{tag-list,key-value,array-editor,icon-picker}/design.md` 均存在（维度 17 可核对）。
- **playground**：`apps/playground/src/component-lab/renderers/{tag-list,key-value,array-editor,icon-picker}-lab-page.tsx` 均存在。
- **e2e**：`tests/e2e/composite-editor-handles.spec.ts` 覆盖 array-editor/key-value 的 `component:addItem/removeItem/moveItem` handles（X1-successor 已收口）；本族无 `tests/e2e/component-lab/c3-4-host-surfaces.spec.ts`（需新增）。
- **历史基础**：E3 计划已完成 array-editor/key-value `minItems`/`maxItems`（validation 读 schema 而非硬编码）与重排（上下移动调 `moveValue`）；其 Non-Goals 中「array-editor copyable/deleteConfirmDialog/addable/removable toggle」「key-value 重复 key inline 高亮」为**登记归后续**项——本 plan 按 P2 backlog 口径重新裁定（审计卡登记，归 CR 或当场低本修复）。icon-picker 计划 Deferred 两项（iconTemplate region = out-of-scope improvement、component:open = optimization candidate，successor no）——审计卡内复验裁定。
- **相关机制已落地**：08-02 nested-schema-field-classification（completed）——本族无 action 型嵌套属性公开记录（icon-picker 无 action；tag-list/key-value/array-editor 为纯值编辑器），维度 6 仍须逐组件核对无 deepFields 残留。
- **CX-8 同型复验点**：C3.1/C3.2 已修复 combo/input-table/array-field/object-field/detail-field 的 `staticReadOnly` 传播（FormLayoutContext）；array-editor/key-value/tag-list 的行/项内嵌字段 readOnly/disabled 传播为本 plan 维度 3/10 专项复验（若缺口为共享根因 → §7 CX-n 处理或 `shared:` 归 CR）。
- **基线**：以 C0 回写基线为准（unit 全绿 58/58；e2e pre-existing 8 项中本族无归属项——C0 原 9 项中 input-suggest 已由 C2.2 修复出列，余项属 ai/scheduling/content，successor C8.1/C9/CV）。

## Goals

- 4 张审计卡（`docs/audits/per-component/{tag-list,key-value,array-editor,icon-picker}.md`）18 维逐项核对，P0/P1/P2/P3 裁决留痕，`文件:行` 证据，全部 `closed`（P0/P1 清零）。
- 本族 P0/P1 缺陷 test-first 自动修复（契约/公共层修复 Must automate），P2 低成本当场修复、其余登记卡内 backlog 归 CR。
- ≥1 个真实浏览器组合宿主场景（含 bug 73 模式专项）：候选——form 内 array-editor/key-value 行编辑 + 提交（提交值形状）、readOnly 传播复验（CX-8 同型）、icon-picker 选择回显、tag-list 受控 echo。
- roadmap C3.4 行标 `done`（独立子 agent closure-audit pass 后）。

## Non-Goals

- C3.5/C4.x 及以后族组件；CRUD 本体（C4.2）。
- checklist v2 修订（CG）、审计工具脚本升级（CG）。
- 结构性重构（公共 API/包边界/编译期机制，需人工确认后另立 CX-n；纯行为修复不视为结构性）。
- 各审计卡 P2 backlog（>15 分钟项）归 CR 处理，不在本 plan 内实现。

## Scope

### In Scope

- 4 组件 × 18 维审计卡（维度重点：1 Schema 契约（fields 与 types.ts 一致、minItems/maxItems schema 声明）、2 RendererComponentProps 合规、3 值所有权三态（行内编辑写回、defaultValue/initValue/valueStatePath、重置/清空）、4 表单参与（name/required/minItems/maxItems 校验挂接、提交数据形状、data-field-_）、5 DOM 与选择器契约（data-field/data-renderer/data-value/data-testid、行/项 marker 契约）、6 嵌套 schema 分类（无 deepFields 残留）、7 事件与 action 契约（onChange payload 形状、component:_ handles 与 normalizeActionEvent 语义）、8 a11y（行增删/重排完整键鼠路径、焦点管理、aria 语义）、9 i18n（addLabel/removeLabel 等文案 key）、10 四态覆盖（空/加载/错误/禁用/readOnly——**CX-8 同型 readOnly/disabled 传播复验**）、11 异步生命周期（icon-picker 图标源若远程加载则核对 env IO 边界）、12 组合宿主场景（form 内编辑提交、CRUD 行内使用）、13 样式契约（widget 自样式）、14 React 19、15 性能边界（行增删 O(n²)、key 稳定性、icon-picker 图标列表渲染量）、16 测试质量（断言正确行为而非 not-throw、DOM 契约断言、错误路径、**array-editor 无专属单测的覆盖缺口审计**）、17 文档对照（design.md ↔ 实现 props/行为，含 E3 后 minItems/maxItems/reorder 文档同步状态）、18 注册/包边界/IO 安全红线（surface 双注册、icon-picker 图标源加载走 env IO 边界 INV-1））。
- P0/P1 自动修复（test-first）+ P2 低成本即时修复。
- 真实浏览器宿主场景（form 内 array-editor/key-value 行编辑并提交（bug 73 模式）、readOnly 传播复验、icon-picker 选择回显、tag-list echo）。
- 审计卡状态流转（open → fixing → fixed-pending-closure → closed）与 daily log 记录。

### Out Of Scope

- C3.5/C4.x 及以后族组件；CRUD 本体（C4.2）。
- checklist v2 修订（CG）。
- 结构性重构（需人工确认后另立 CX-n）。
- e2e pre-existing 剩余项（ai/scheduling/content 包，successor C8.1/C9/CV）。

## Failure Paths

| 可测场景编号     | 触发                                                 | 行为（含错误码）                                | 可重试 | 用户可见表现      |
| ---------------- | ---------------------------------------------------- | ----------------------------------------------- | ------ | ----------------- |
| host-le-submit   | form 内 array-editor/key-value 行编辑并提交（真机）  | 行值进入 store、提交数据形状正确（bug 73 模式） | 是     | 提交结果正确回显  |
| host-le-readonly | readOnly/disabled 态 array-editor/key-value/tag-list | 全链禁用、不崩溃（CX-8 同型复验）               | 是     | 只读表现正确      |
| host-le-icon     | icon-picker 选择图标                                 | 选择回显正确、值写入表单                        | 是     | 图标回显 + 值正确 |
| host-le-tag      | tag-list 增删标签（受控 echo）                       | 值增减正确回显、不产生重复/丢失                 | 是     | 标签列表正确      |

## Test Strategy

本档选择：**必须自动化** —— 轻量编辑族是表单值编辑器（核心回归路径 + 值形状契约），承接 E3 minItems/maxItems 与 X1 handles 契约复验 + CX-8 同型 readOnly 传播复验；契约/公共层修复必须 test-first（先写失败测试再实现）。验证门禁：受影响包 `pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck/build/lint/test` + `tests/e2e/composite-editor-handles.spec.ts` 回归 + 本族新增宿主场景 Playwright（programmatic DOM 断言）。

## Execution Plan

### Phase 1 - 逐组件 18 维审计与审计卡产出

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/{tag-list,key-value,array-editor,icon-picker}.tsx`、`docs/audits/per-component/`

- Item Types: `Proof`

- [x] 审计前核对注册定义：4 组件注册项（type/fields/componentCapabilityContracts）与 schema types 一致（维度 1/18）；E3/X1 落地状态（minItems/maxItems/reorder/handles）live 核对。
- [x] 产出 4 张审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），P0/P1/P2/P3 裁决留痕（checklist §3）。
- [x] 维度重点核查：值所有权三态（维度 3：行内编辑写回/重置、tag-list 受控 echo）；**readOnly/disabled 传播（维度 10：CX-8 同型复验——array-editor/key-value 项内嵌字段）**；a11y（维度 8：行增删/重排键盘路径）；性能边界（维度 15：行增删 O(n²)、icon-picker 图标列表）。
- [x] 测试质量专项（维度 16）：array-editor 无专属单测的覆盖来源审计（由 composite-editor-handles e2e/w4c 复合测试承接？缺口登记）；tag-list/key-value/icon-picker 既有测试断言正确行为而非 not-throw。
- [x] 文档对照（维度 17）：4 个 design.md ↔ 实现 props/行为逐项核对（含 E3 后 minItems/maxItems/reorder 同步状态）；历史 Deferred 复验（icon-picker iconTemplate/component:open、E3 non-goals 各项）裁定后登记。
- [x] 异步生命周期/IO 边界（维度 11/18）：icon-picker 图标源远程加载路径 live 核对（若存在走 env IO 边界 INV-1）。

Exit Criteria:

> 本 Phase 交付 4 张审计卡（含裁决），是后续修复的唯一事实来源。

- [x] `docs/audits/per-component/{tag-list,key-value,array-editor,icon-picker}.md` 4 卡存在，18 维表完整、`文件:行` 证据可验证。
- [x] 卡内发现清单带 P0/P1/P2/P3 裁决；无 P0/P1 则标记 `closed`，否则 `open`；历史 Deferred 复验结论已记录。

### Phase 2 - P0/P1 自动修复（test-first）

Status: completed
Targets: 发现涉及的 renderer 文件、契约测试文件、e2e spec

- Item Types: `Fix | Proof | Decision`

- [x] 按审计卡处理 P0/P1：先写复现/回归测试（断言正确行为，非仅 not-throw），再实现修复；DOM/选择器契约变更追加 focused 契约测试与 e2e（test-first 证据：复现测试先于实现）。
- [x] P2 低成本（约 15 分钟内）当场修复；其余登记卡内 backlog 归 CR。
- [x] 共性缺陷裁决（Decision）：readOnly/disabled 传播若为共享根因（CX-8 同型，影响本族 ≥2 组件）→ 按 roadmap 自动修复机制 §7 处理（当前 plan 内优先修复并事后回写 CX-n，或插入 CX-n work item）；根因单点 `shared:` 标记归 CR。
- [x] 修复后卡内发现标 `fixed` + commit/plan 引用；卡状态流转 `open → fixing → fixed-pending-closure`。
- [x] 复杂/跨包 bug 修复按 AGENTS.md Bug Fix Test Coverage Rule 记录到 `docs/bugs/`（参考 `docs/bugs/73-*.md` 格式）。

Exit Criteria:

> 本 Phase 交付"发现清零或已裁定"，卡状态与代码行为一致。

- [x] 全部 P0/P1 已修复（卡内标 `fixed` + 证据）或已显式裁定延期（仅允许依赖未落地跨 plan 机制者，标「机制落地后复验」并登记）；无静默跳过。
- [x] 受影响包 `pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck && build && lint && test` 绿（含新增回归测试）。

### Phase 3 - 组合宿主真实浏览器场景

Status: completed
Targets: `tests/e2e/component-lab/c3-4-host-surfaces.spec.ts`（新增）、playground lab 页

- Item Types: `Proof | Fix`

- [x] 设计并实现 ≥1 个本族真实浏览器组合宿主场景（programmatic DOM 断言，禁截图诊断）：候选——form 内 array-editor/key-value 行编辑 + 提交（bug 73 模式：行值 → store 更新 → 提交值正确）、readOnly/disabled 传播复验（CX-8 同型）、icon-picker 选择回显、tag-list 受控 echo。
- [x] bug 73 模式专项检查：在宿主场景中显式验证单测绿但真机失败类风险（行编辑真机提交、受控 echo 稳定性）。
- [x] 宿主场景发现的新缺陷按 Phase 2 流程修复（test-first）。
- [x] 既有相关 e2e（`tests/e2e/composite-editor-handles.spec.ts`）在本族改动后回归。

Exit Criteria:

> 本 Phase 交付"真实浏览器行为成立"。

- [x] 宿主场景 spec 通过（Playwright，programmatic DOM 断言）；composite-editor-handles.spec.ts 回归绿。
- [x] bug 73 模式专项检查结论记录于 daily log（pass 或带证据 fail→已修复）。

### Phase 4 - 组件回归与审计卡 closure

Status: completed
Targets: 审计卡、`docs/logs/2026/08-03.md`、`docs/backlog/component-audit-roadmap.md`（C3.4 行）

- Item Types: `Proof`

- [x] 全卡复查：18 维表结论与最终代码一致；P0/P1 清零；4 卡状态 `closed`（含 fixed-pending-closure → closed 流转）。
- [x] 本族范围回归：`pnpm --filter @nop-chaos/flux-renderers-form-advanced test` + 相关 e2e spec 全绿；如本 plan 触及公共层（flux-react/field-frame/编译器），追加受影响包验证并记录。
- [x] daily log 记录：卡 closure 汇总、修复清单（commit/plan 引用）、宿主场景结果、历史 Deferred 复验结论、CX-n 插入（如有）与决策。
- [x] 若插入了 CX-n：同步更新 roadmap Work Item Status 表（新行 + 依赖边/注释）并按 §7b（事后回写：父 plan closure 后标 done）/§7c（正常生命周期）走；结构性 CX-n 执行前标注待人工确认。（**无 CX-n 插入——fields 注册缺口根因单点（各定义文件遗漏）非公共层机制，honesty 契约测试为族级 guard；CX-8 同型复验本族 pass 无缺口**）
- [x] roadmap C3.4 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审；已交付全部执行证据，由 mission-driver CLOSURE_VERIFY fresh session 执行 audit 后收口）。

Exit Criteria:

> 本 Phase 交付"可进入 closure-audit 的完成态"。

- [x] 4 张审计卡 `closed`；`docs/audits/per-component/` 汇总可读。
- [x] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session（task `ses_0394a77b5ffe1ecCrm4ld4UXvv`）
- Verdict: `pass`（零 Blocker/Major；Minor ×4）
- Rounds: 1
- Findings addressed: 全部文件/行引用经 live repo 核对通过（tag-list.tsx `:146`、key-value.tsx `:422/:636`、array-editor.tsx `:410/:605`、icon-picker.tsx `:26/:279` type 字面量、4 design.md/lab 页、composite-editor-handles.spec.ts、3 测试文件 + array-editor 无专属单测确认、3 历史计划 completed 且 Deferred 内容核对一致、roadmap C3.4 `todo` 仅依赖 C0、无既有审计卡）；Minor 已处理：Related 补 X1 successor 计划名（`2026-06-22-1137-1`）、基线补 input-suggest 已由 C2.2 修复出列的 9→8 项口径说明；Failure Paths 无错误码列与宿主场景候选选择记录 2 项 Minor 保留（与 sibling 计划一致/由 Failure Paths 断言兜底）。

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。

- [x] 4 张审计卡存在、18 维表完整、P0/P1 清零、全部 `closed`
- [x] 全部 in-scope P0/P1 已 test-first 修复并有回归测试；无被静默降级到 deferred 的 live defect/contract drift
- [x] ≥1 个真实浏览器组合宿主场景通过（含 bug 73 模式专项检查）
- [x] 共性缺陷已按 §7 处理（CX-n 插入/合并或当前 plan 内修复，决策记录在卡与 daily log）
- [x] 受影响的 owner docs 已同步到 live baseline（design.md/quick-reference/roadmap 表按发现实际影响为准）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 审计卡 P2 backlog（成本 >15 分钟的非阻断体验/文档/测试加固项，含 E3 non-goals 复验项）

- Classification: `optimization candidate`
- Why Not Blocking Closure: checklist §3 明确 P2 可入审计卡 backlog 由 CR 自动处理；不阻塞本族 supported baseline 成立。E3 non-goals（copyable/deleteConfirmDialog/addable-removable toggle/重复 key inline 高亮）以审计卡复验裁定为准。
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

Status Note: 独立子 agent closure-audit pass（approved）——live repo 复核：4 卡 closed 且 18 维结论与最终代码一致（fields 注册/validation contributor/listbox ARIA/i18n 消息均 diff/测试可核验）；4 新测试文件 20 用例 + c3-4-host-surfaces 4/4 + composite-editor-handles 5/5 实测复核绿；`pnpm typecheck/build/lint` 31/31、`pnpm test` 58/58、form-advanced 991、check:i18n-keys/schema-prop-coverage 绿；plan-check --strict pass。审计中补修复 icon-picker design.md §7/§8 残留 phantom onChange 主张（与 §5 修复同型）。roadmap C3.4 行标 `done`。

Closure Audit Evidence:

- Auditor / Agent: mission-driver CLOSURE_VERIFY 独立子 agent fresh session（closure-audit，不复用执行上下文）
- Evidence: 独立审计 session 复核（2026-08-03）：4 卡 closed 且 18 维结论与最终代码一致（P1-1×3 fields 注册 + P1-1 icon-picker validation contributor + P2×9 均 live 核验）；4 新测试文件 20 用例断言正确行为（c3-4-schema-contract-honesty 6 + icon-picker-validation 2 + icon-picker-selection 6 + array-editor-row-editing 6）；实测复核 `c3-4-host-surfaces.spec.ts` 4/4 + `composite-editor-handles.spec.ts` 5/5 绿；`pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck/build/lint/test` 绿（991）+ `pnpm typecheck`/`build`/`lint` 31/31 + `pnpm test` 58/58 + `check:i18n-keys`/`check:schema-prop-coverage` 绿 + `plan-check.mjs --strict` pass；flux-guide/flux-types/schema.d.ts 重新生成核验（tags/addLabel/uniqueKeys/minItems/maxItems/itemLabel 落位）；bug 74 记录；审计补修复 icon-picker design.md §7/§8 phantom onChange 残留；deferred 分类诚实（无静默降级 live defect）；五处一致性核对通过（Plan Status/Phase Status/Exit Criteria/Closure Gates/Closure evidence）；daily log 2026/08-03 C3.4 节收口记录同步。

Follow-up:

- 无 plan-owned 剩余工作（P3 ×15 与 Deferred 复验项已登记卡内 backlog 归 CR；e2e pre-existing 8 项归 C8.1/C9/CV）。
