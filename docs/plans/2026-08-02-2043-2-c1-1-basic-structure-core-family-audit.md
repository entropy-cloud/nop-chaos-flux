# C1.1 basic 结构核心族逐组件审计（page/container/flex/tabs/dialog/drawer）

> Plan Status: active
> Mission: component-audit
> Work Item: C1.1
> Last Reviewed: 2026-08-02
> Source: `docs/backlog/component-audit-roadmap.md`（C1.x Phase Details）、`docs/audits/component-audit-checklist.md`（18 维 + 审计卡模板 + 自动修复纪律）、`docs/logs/2026/08-02.md`
> Related: 依赖 C0（`2026-08-02-2043-1`）完成后开工；与 C1.2（`2026-08-02-2043-3`）并行独立

## Purpose

对 `flux-renderers-basic` 结构核心族 6 个注册组件（page/container/flex/tabs/dialog/drawer）完成 18 维逐组件审计（每组件一张审计卡，P0/P1/P2/P3 裁决留痕），P0/P1 缺陷在**同一 plan 内自动修复**（test-first + 回归测试 + 受影响包验证门禁，审计与修复之间无人工握手），每族完成 ≥1 个真实浏览器组合宿主场景验证（含 bug 73 模式"单测绿但真机失败"专项检查），最终 6 张审计卡全部 `closed`（P0/P1 清零）。

## Current Baseline

- **组件与文件**：6 组件均在 `packages/flux-renderers-basic/src/` 平铺目录（page.tsx、container.tsx、flex.tsx、tabs.tsx、dialog.tsx、drawer.tsx）；注册定义 `basic-renderer-definitions.ts` + `surface-renderer-definitions.ts`（dialog `:147`、drawer `:195`）；schema 类型 `schemas.ts`。
- **设计文档**：6 组件 design.md 全部存在（`docs/components/{page,container,flex,tabs,dialog,drawer}/design.md`）。
- **playground**：6 个 lab 页全部存在（`apps/playground/src/component-lab/renderers/{page,container,flex,tabs,dialog,drawer}-lab-page.tsx`）。
- **e2e 既有覆盖**：`tests/e2e/component-lab/` 下 dialog-edit-submit.spec.ts、dialog-real-schema.spec.ts、dialog-dropdown-row-edit.spec.ts（CRUD 行内 dropdown → openDialog → 编辑 → 提交，08-02 plan-1 新增，真实浏览器通过）、layout-content.spec.ts（tabs/dialog 场景，mission 场景改造后与 dialog-lab-page 对齐）、surface-form-input.spec.ts、smoke.spec.ts。
- **相关机制已落地**：08-01 field-selector 契约（FieldFrame 补 data-field/data-renderer，DOM 契约测试 28/28 绿）；08-02 嵌套 schema 分类机制（fieldRules/schema-definition/actionValue，`docs/architecture/nested-schema-field-classification.md` v8）；dialog 表单真机提交 bug 73 已修复（dialog-dropdown-row-edit e2e 绿）；dropdown-button 行 scope 污染修复已落地（C1.1 需在宿主场景中复验）。
- **基线**：以 C0 回写的基线为准（unit 0 失败；e2e pre-existing 9 属 ai/scheduling/content 包，不在本族）。

## Goals

- 6 张审计卡（`docs/audits/per-component/{page,container,flex,tabs,dialog,drawer}.md`）18 维逐项核对完成，P0/P1/P2/P3 裁决留痕，`文件:行` 证据。
- 本族 P0/P1 缺陷全部 test-first 自动修复（含 DOM 契约/选择器契约变更的 focused 契约测试）；P2 低成本（≤15 分钟）当场修复，其余登记卡内 backlog 归 CR。
- ≥1 个真实浏览器组合宿主场景（programmatic DOM 断言）通过，含 1 个 bug 73 模式专项检查。
- 6 张审计卡全部 `closed`（P0/P1 清零），roadmap C1.1 标 `done` 前由独立子 agent closure-audit。
- 共性缺陷（同一根因 ≥2 组件/跨包/公共层）按 roadmap 自动修复机制 §7 主动处理（CX-n 插入或当前 plan 内多阶段优先修复），不默认囤积 CR。

## Non-Goals

- 不审计 basic 包其余组件（C1.2/C1.3 覆盖：fragment/loop/recurse/reaction/scope-debug/dynamic-renderer、text/button/badge/icon）。
- 不处理跨族公共层结构性重构（公共 API/包边界/编译期）——需人工确认；纯行为修复豁免。
- 不修复 e2e pre-existing 9 失败（不属于本族组件）。

## Scope

### In Scope

- 6 组件 × 18 维审计卡（维度重点：1 Schema 契约、2 RendererComponentProps 合规、5 DOM 选择器契约与 marker、6 嵌套 schema 分类 08-02 复验、7 事件与 action 契约、12 组合宿主场景、13 样式契约（container/flex/page 仅 marker 类）、14 React 19、17 文档对照、18 注册/包边界/IO 安全红线）。
- P0/P1 自动修复（test-first）+ P2 低成本即时修复。
- 真实浏览器宿主场景（dialog 内 form 提交、tabs 内 dialog、CRUD 行内 dialog/drawer、无 scope 上下文降级）。
- 审计卡状态流转（open → fixing → fixed-pending-closure → closed）与 daily log 记录。

### Out Of Scope

- C1.2/C1.3 组件。
- checklist v2 修订（CG）。
- 结构性重构（需人工确认后另立 CX-n）。

## Failure Paths

| 可测场景编号       | 触发                                | 行为（含错误码）                                     | 可重试 | 用户可见表现         |
| ------------------ | ----------------------------------- | ---------------------------------------------------- | ------ | -------------------- |
| host-dialog-submit | dialog 内 form 提交（真实浏览器）   | 提交值进入目标 scope，无行 scope 污染（bug 73 模式） | 是     | 提交结果正确回显     |
| host-tabs-nesting  | tabs 内 dialog/drawer 打开与关闭    | surface 生命周期正确（open/close/销毁清理）          | 是     | 无残留 DOM、焦点恢复 |
| host-no-scope      | page/container/flex 无 scope 上下文 | 降级渲染不崩溃（维度 12）                            | 是     | 空态/默认渲染可见    |
| a11y-focus-trap    | dialog/drawer 键盘 Tab 循环         | 焦点不逃逸、Esc 关闭、焦点恢复（维度 8）             | 是     | 键盘路径完整可用     |

## Test Strategy

本档选择：**必须自动化** —— 审计卡发现属于契约/公共层（DOM 选择器、marker 类、事件 shape、嵌套 schema 分类）的修复必须 test-first（先写失败测试再实现）；本族验证门禁为受影响包 `pnpm --filter @nop-chaos/flux-renderers-basic typecheck/build/lint/test` + 宿主场景 Playwright（programmatic DOM 断言）。

## Execution Plan

### Phase 1 - 逐组件 18 维审计与审计卡产出

Status: planned
Targets: `packages/flux-renderers-basic/src/{page,container,flex,tabs,dialog,drawer}.tsx`、`basic-renderer-definitions.ts`、`surface-renderer-definitions.ts`、`schemas.ts`、`docs/audits/per-component/`

- Item Types: `Proof`

- [ ] 审计前核对注册定义：6 组件在 `basic-renderer-definitions.ts` / `surface-renderer-definitions.ts` 的注册项（type/defaultSchema/fields）与 `schemas.ts` 类型一致性（维度 1/18）。
- [ ] 逐组件产出审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），P0/P1/P2/P3 裁决留痕（checklist §3）。
- [ ] 维度重点核查：container/flex/page 仅输出 marker 类、无硬编码布局类（维度 13 + `check:audit-styling-suspects`）；dialog/drawer surface 生命周期（open/close/销毁、焦点管理、Esc、遮罩点击）；tabs 键盘完整操作路径（方向键/Home/End、tabpanel 关联，维度 8）；6 组件 `data-renderer`/`data-testid`/marker 注册与 08-01 契约对齐（维度 5 + `check:audit-missing-renderer-markers`）。
- [ ] 嵌套 schema 分类复验（维度 6）：dialog/drawer 的 onClose/onSubmitSuccess/onSubmitError、tabs items 内嵌 action/事件、container 内嵌子节点分类与 08-02 机制一致；无 deepFields 残留。
- [ ] 事件与 action 契约（维度 7）：6 组件派发事件 payload 形状核对（dialog confirm/cancel 数据、tabs tabChange 等），normalizeActionEvent 语义。
- [ ] 测试质量审查（维度 16）：既有单测是否断言正确行为（非 not-throw-only）、DOM 契约断言、四态覆盖（维度 10）、错误路径；缺口记录为发现。
- [ ] 文档对照（维度 17）：6 组件 design.md ↔ 实现 props/行为逐项核对，quick-reference.md 词条准确性。

Exit Criteria:

> 本 Phase 交付 6 张审计卡（含裁决），是后续修复的唯一事实来源。

- [ ] `docs/audits/per-component/{page,container,flex,tabs,dialog,drawer}.md` 6 张卡存在，18 维表完整、`文件:行` 证据可验证。
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
- [ ] 受影响包 `pnpm --filter @nop-chaos/flux-renderers-basic typecheck && build && lint && test` 绿（含新增回归测试）。

### Phase 3 - 组合宿主真实浏览器场景

Status: planned
Targets: `tests/e2e/component-lab/` 新增/修改 spec、playground lab 页

- Item Types: `Proof | Fix`

- [ ] 设计并实现 ≥1 个本族真实浏览器组合宿主场景（programmatic DOM 断言，禁截图诊断）：候选——tabs 内 dialog 提交、CRUD 行内 drawer 编辑提交、无 scope 上下文降级（按审计卡发现与宿主价值选择）。
- [ ] bug 73 模式专项检查：针对"单测绿但真机失败"类风险，在宿主场景中显式验证（如 dialog 内 form 输入 → store 更新 → 提交值正确）。
- [ ] 宿主场景发现的新缺陷按 Phase 2 流程修复（test-first）。
- [ ] 既有相关 e2e（dialog-edit-submit/dialog-real-schema/layout-content）在本族改动后回归。

Exit Criteria:

> 本 Phase 交付"真实浏览器行为成立"。

- [ ] 宿主场景 spec 通过（Playwright，programmatic DOM 断言）；本族组件改动的回归 spec 绿。
- [ ] bug 73 模式专项检查结论记录于 daily log（pass 或带证据 fail→已修复）。

### Phase 4 - 族内回归与审计卡 closure

Status: planned
Targets: 6 张审计卡、`docs/logs/2026/08-02.md`、`docs/backlog/component-audit-roadmap.md`（C1.1 行）

- Item Types: `Proof`

- [ ] 全卡复查：18 维表结论与最终代码一致；P0/P1 清零；卡状态全部 `closed`（含 fixed-pending-closure → closed 流转）。
- [ ] 本族范围回归：`pnpm --filter @nop-chaos/flux-renderers-basic test` + 相关 e2e spec 全绿；如本 plan 触及公共层（flux-react/field-frame/编译器），追加受影响包验证并记录。
- [ ] daily log 记录：6 卡 closure 汇总、修复清单（commit/plan 引用）、宿主场景结果、CX-n 插入（如有）与决策。
- [ ] 若插入了 CX-n：同步更新 roadmap Work Item Status 表（新行 + 依赖边/注释）并按 §7c 走生命周期（父 plan closure 后标 done）；结构性 CX-n 执行前标注待人工确认。
- [ ] roadmap C1.1 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审）。

Exit Criteria:

> 本 Phase 交付"可进入 closure-audit 的完成态"。

- [ ] 6 张审计卡全部 `closed`；`docs/audits/per-component/` 汇总可读。
- [ ] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置）。

## Draft Review Record

- Reviewer / Agent: 独立子 agent fresh session（task `ses_03d3862e2fferRZviQ7hV4hx2n`，两轮 review）
- Verdict: `pass`
- Rounds: 2
- Findings addressed: R1 Major-1 已处理（组件路径 `src/renderers/` → 平铺 `src/`，Baseline 与 Phase 1 Targets 已修正）；R2 确认无新 Blocker/Major。

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。

- [ ] 6 张审计卡存在、18 维表完整、P0/P1 清零、全部 `closed`
- [ ] 全部 in-scope P0/P1 已 test-first 修复并有回归测试；无被静默降级到 deferred 的 live defect/contract drift
- [ ] ≥1 个真实浏览器组合宿主场景通过（含 bug 73 模式专项检查）
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

## Non-Blocking Follow-ups

- 审计中发现但裁定为 P3（风格 nit/注释）的项仅卡内记录，不处理。
- 工具脚本新增模式（若有）记入卡内，CG 统一升级。

## Closure

Status Note: 待执行

Closure Audit Evidence:

- Auditor / Agent: TBD
- Evidence: TBD

Follow-up:

- 待执行后填写（non-blocking 项仅记录于 Non-Blocking Follow-ups）。
