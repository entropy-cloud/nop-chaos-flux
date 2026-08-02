# C1.3 basic 原子显示族逐组件审计（text/button/badge/icon）

> Plan Status: completed
> Mission: component-audit
> Work Item: C1.3
> Last Reviewed: 2026-08-03
> Source: `docs/backlog/component-audit-roadmap.md`（C1.x Phase Details）、`docs/audits/component-audit-checklist.md`（18 维 + 审计卡模板 + 自动修复纪律）、`docs/logs/2026/08-02.md`
> Related: 依赖 C0（`2026-08-02-2043-1`，completed）完成后开工；与 C2.1（`2026-08-03-0105-2`）/ C2.2（`2026-08-03-0105-3`）并行独立（均只依赖 C0）

## Purpose

对 `flux-renderers-basic` 原子显示族 4 个注册组件（text/button/badge/icon）完成 18 维逐组件审计（每组件一张审计卡，P0/P1/P2/P3 裁决留痕），P0/P1 缺陷在**同一 plan 内自动修复**（test-first + 回归测试 + 受影响包验证门禁，审计与修复之间无人工握手），每族完成 ≥1 个真实浏览器组合宿主场景验证（含 bug 73 模式"单测绿但真机失败"专项检查），最终 4 张审计卡全部 `closed`（P0/P1 清零）。本族为 basic 包审计的收尾族（C1.1/C1.2 已 done），完成后 basic 包 16 组件全部完成组件级审计。

## Current Baseline

- **组件与文件**：4 组件均在 `packages/flux-renderers-basic/src/` 平铺目录（text.tsx:154 行、button.tsx:266 行、icon.tsx:53 行、badge.tsx:26 行）；注册定义 `basic-renderer-definitions.ts`（text `:151`/defaultSchema `:155`、button `:169`/defaultSchema `:173`、icon `:310`、badge `:323`）；schema 类型 `schemas.ts`。
- **设计文档**：4 组件 design.md 全部存在（`docs/components/{text,button,badge,icon}/design.md`，各含 example.json）。
- **playground**：4 个 lab 页全部存在（`apps/playground/src/component-lab/renderers/{text,button,badge,icon}-lab-page.tsx`）。
- **e2e 既有覆盖**：`tests/e2e/component-lab/` 下 action-logic.spec.ts（button 事件/动作路径）、smoke.spec.ts、data-renderers.spec.ts 等可能覆盖本族（执行时核对，缺口在 Phase 3 补宿主场景）。
- **历史增强基础**：text/icon 曾经历 `2026-06-22-0149-3-e3-basic-display-visual-fields-plan.md`（text maxline/icon size token）、button 经 `2026-06-21-1000-1-e2e-button-capability-enhancement-plan.md`、icon 经 `2026-07-13-icon-system-antd-mapping-and-icon-picker-plan.md`；本族审计在其上做 18 维补查，重点为 roadmap 指定的 **name binding**（text/button/badge/icon 与 scope 变量绑定路径）与 DOM 契约。
- **相关机制已落地**：08-01 field-selector 契约；08-02 嵌套 schema 分类机制（completed）；CX-1/CX-2/CX-3 已在 C1.1/C1.2 处理并回写（planned，等 mission-driver 标 done）。
- **基线**：以 C0 回写的基线为准（unit 0 失败；e2e pre-existing 9 中 8 项属 ai/scheduling/content 包、1 项（input-suggest）属 form 包且归属 C2.2，均不在本族；basic 包 455 单测全绿——C1.2 closure 实测）。

## Goals

- 4 张审计卡（`docs/audits/per-component/{text,button,badge,icon}.md`）18 维逐项核对完成，P0/P1/P2/P3 裁决留痕，`文件:行` 证据。
- 本族 P0/P1 缺陷全部 test-first 自动修复（含 DOM 契约/选择器契约变更的 focused 契约测试）；P2 低成本（≤15 分钟）当场修复，其余登记卡内 backlog 归 CR。
- ≥1 个真实浏览器组合宿主场景（programmatic DOM 断言）通过，含 1 个 bug 73 模式专项检查（如 button 事件驱动 store 变更→DOM 回显、text name binding 写回路径）。
- 4 张审计卡全部 `closed`（P0/P1 清零），roadmap C1.3 标 `done` 前由独立子 agent closure-audit。
- 共性缺陷（同一根因 ≥2 组件/跨包/公共层）按 roadmap 自动修复机制 §7 主动处理（CX-n 插入或当前 plan 内多阶段优先修复），不默认囤积 CR。

## Non-Goals

- 不审计 basic 包其余组件（C1.1/C1.2 已覆盖：page/container/flex/tabs/dialog/drawer、fragment/loop/recurse/reaction/scope-debug/dynamic-renderer）。
- 不处理跨族公共层结构性重构（公共 API/包边界/编译期）——需人工确认；纯行为修复豁免。
- 不修复 e2e pre-existing 9 失败（不属于本族组件；input-suggest 失败归属 C2.2）。

## Scope

### In Scope

- 4 组件 × 18 维审计卡（维度重点：1 Schema 契约、2 RendererComponentProps 合规、3 值所有权三态（text/icon name binding、button 无值语义）、5 DOM 选择器契约与 marker（text/button 语义类注册）、6 嵌套 schema 分类（button onClick/items 内嵌 action）、7 事件与 action 契约（button click payload、icon 无事件）、8 a11y（button 键盘路径、badge 读屏语义、icon aria-label）、9 i18n（hardcode 文案）、10 四态覆盖、12 组合宿主场景、13 样式契约（4 组件为 widget 自样式）、14 React 19、17 文档对照、18 注册/包边界/IO 安全红线）。
- P0/P1 自动修复（test-first）+ P2 低成本即时修复。
- 真实浏览器宿主场景（button 在 form/dialog 内触发 action、text name binding 动态求值、badge 计数更新）。
- 审计卡状态流转（open → fixing → fixed-pending-closure → closed）与 daily log 记录。

### Out Of Scope

- C2.x 及以后族组件。
- checklist v2 修订（CG）。
- 结构性重构（需人工确认后另立 CX-n）。

## Failure Paths

| 可测场景编号     | 触发                                | 行为（含错误码）                                           | 可重试 | 用户可见表现      |
| ---------------- | ----------------------------------- | ---------------------------------------------------------- | ------ | ----------------- |
| host-button-act  | button 在 dialog/form 内触发 action | 事件 payload 形状正确、提交值进入目标 scope（bug 73 模式） | 是     | 动作结果正确回显  |
| host-text-bind   | text 文本绑定 scope 变量动态变化    | name binding 求值正确、无 stale 值                         | 是     | 文本随 scope 更新 |
| host-icon-aria   | icon 无 label / aria 缺失           | 降级渲染不崩溃、aria 语义可读                              | 是     | 读屏可识别        |
| host-badge-count | badge 计数值变化                    | 值更新渲染正确、无泄漏                                     | 是     | 计数实时更新      |

## Test Strategy

本档选择：**必须自动化** —— 审计卡发现属于契约/公共层（DOM 选择器、marker 类、事件 shape、name binding）的修复必须 test-first（先写失败测试再实现）；本族验证门禁为受影响包 `pnpm --filter @nop-chaos/flux-renderers-basic typecheck/build/lint/test` + 宿主场景 Playwright（programmatic DOM 断言）。

## Execution Plan

### Phase 1 - 逐组件 18 维审计与审计卡产出

Status: completed
Targets: `packages/flux-renderers-basic/src/{text,button,badge,icon}.tsx`、`basic-renderer-definitions.ts`、`schemas.ts`、`docs/audits/per-component/`

- Item Types: `Proof`

- [x] 审计前核对注册定义：4 组件注册项（type/defaultSchema/fields）与 `schemas.ts` 类型一致性（维度 1/18）；text/icon 的 name binding 声明（binding 路径与 scope 求值实现）。
- [x] 逐组件产出审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），P0/P1/P2/P3 裁决留痕（checklist §3）。
- [x] 维度重点核查：button 事件与 action 契约（onClick payload 形状、normalizeActionEvent 语义、内嵌 action args 模板保持——维度 6/7）；text/icon name binding 值所有权三态（维度 3）；4 组件 `data-renderer`/`data-testid`/marker 注册与 08-01 契约对齐（维度 5 + `check:audit-missing-renderer-markers`）；a11y（button 键盘/焦点、icon aria-label、badge role——维度 8 + `check:audit-suspects`）。
- [x] 嵌套 schema 分类复验（维度 6）：button onClick/items 内嵌 action、text 无内嵌 schema，与 08-02 机制一致；无 deepFields 残留。
- [x] 四态覆盖（维度 10）与样式契约（维度 13）：空/加载/错误/禁用态渲染；widget 自样式、无 BEM、cn() 合并（+ `check:audit-styling-suspects`）。
- [x] 测试质量审查（维度 16）：既有单测是否断言正确行为（非 not-throw-only）、DOM 契约断言、错误路径；React 19 规范（维度 14，无冗余 memo/effect 镜像）；性能边界（维度 15）。
- [x] 文档对照（维度 17）：4 组件 design.md ↔ 实现 props/行为逐项核对，quick-reference.md 词条准确性。

Exit Criteria:

> 本 Phase 交付 4 张审计卡（含裁决），是后续修复的唯一事实来源。

- [x] `docs/audits/per-component/{text,button,badge,icon}.md` 4 张卡存在，18 维表完整、`文件:行` 证据可验证。
- [x] 每卡发现清单带 P0/P1/P2/P3 裁决；无 P0/P1 的卡标记 `closed`，其余 `open`（text P1 ×1 / button P0 ×1 / badge P1 ×1 / icon 无 P0/P1，全部 open 待 Phase 2 修复）。

### Phase 2 - P0/P1 自动修复（test-first）

Status: completed
Targets: 发现涉及的 renderer 文件、定义文件、schemas.ts、契约测试文件、e2e spec

- Item Types: `Fix | Proof | Decision`

- [x] 按审计卡逐个处理 P0/P1：先写复现/回归测试（断言正确行为，非仅 not-throw），再实现修复；DOM/选择器契约变更追加 focused 契约测试与 e2e（test-first 证据：复现测试先于实现 commit）。
- [x] P2 低成本（约 15 分钟内）当场修复；其余登记卡内 backlog 归 CR。
- [x] 共性缺陷裁决（Decision）：同一根因影响 ≥2 组件/跨包/公共层的发现 → 按 roadmap 自动修复机制 §7 处理（当前 plan 内多阶段优先修复并事后回写 CX-n，或插入 CX-n work item）；根因单点的 `shared:` 标记归 CR。
- [x] 修复后卡内发现标 `fixed` + commit/plan 引用；卡状态流转 `open → fixing → fixed-pending-closure`。
- [x] 复杂/跨包 bug 修复按 AGENTS.md Bug Fix Test Coverage Rule 记录到 `docs/bugs/`（参考 `docs/bugs/73-*.md` 格式）。

Exit Criteria:

> 本 Phase 交付"发现清零或已裁定"，卡状态与代码行为一致。

- [x] 全部 P0/P1 已修复（卡内标 `fixed` + 证据）或已显式裁定延期（仅允许依赖未落地跨 plan 机制者，标「机制落地后复验」并登记）；无静默跳过。
- [x] 受影响包 `pnpm --filter @nop-chaos/flux-renderers-basic typecheck && build && lint && test` 绿（含新增回归测试）。

### Phase 3 - 组合宿主真实浏览器场景

Status: completed
Targets: `tests/e2e/component-lab/` 新增/修改 spec、playground lab 页

- Item Types: `Proof | Fix`

- [x] 设计并实现 ≥1 个本族真实浏览器组合宿主场景（programmatic DOM 断言，禁截图诊断）：候选——button 在 dialog/form 内触发 action 提交、text name binding 动态求值回显、badge 计数更新（按审计卡发现与宿主价值选择）。
- [x] bug 73 模式专项检查：针对"单测绿但真机失败"类风险，在宿主场景中显式验证（如 button 点击 → action 写 scope → 页面回显）。
- [x] 宿主场景发现的新缺陷按 Phase 2 流程修复（test-first）。
- [x] 既有相关 e2e（action-logic/smoke 等）在本族改动后回归。

Exit Criteria:

> 本 Phase 交付"真实浏览器行为成立"。

- [x] 宿主场景 spec 通过（Playwright，programmatic DOM 断言）；本族组件改动的回归 spec 绿。
- [x] bug 73 模式专项检查结论记录于 daily log（pass 或带证据 fail→已修复）。

### Phase 4 - 族内回归与审计卡 closure

Status: completed
Targets: 4 张审计卡、`docs/logs/2026/08-03.md`、`docs/backlog/component-audit-roadmap.md`（C1.3 行）

- Item Types: `Proof`

- [x] 全卡复查：18 维表结论与最终代码一致；P0/P1 清零；卡状态全部 `closed`（含 fixed-pending-closure → closed 流转）。
- [x] 本族范围回归：`pnpm --filter @nop-chaos/flux-renderers-basic test` + 相关 e2e spec 全绿；如本 plan 触及公共层（flux-react/field-frame/编译器），追加受影响包验证并记录。
- [x] daily log 记录：4 卡 closure 汇总、修复清单（commit/plan 引用）、宿主场景结果、CX-n 插入（如有）与决策。
- [x] 若插入了 CX-n：同步更新 roadmap Work Item Status 表（新行 + 依赖边/注释）并按 §7c 走生命周期（父 plan closure 后标 done）；结构性 CX-n 执行前标注待人工确认。
- [x] roadmap C1.3 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审）。

Exit Criteria:

> 本 Phase 交付"可进入 closure-audit 的完成态"。

- [x] 4 张审计卡全部 `closed`；`docs/audits/per-component/` 汇总可读。
- [x] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session（task `ses_03c8d28d7ffe9dDlcFEZFY0Rdw`）
- Verdict: `pass`（零 Blocker/Major；1 条 Minor：baseline e2e 归属表述已修正为"8 项 ai/scheduling/content + 1 项 form/input-suggest（归属 C2.2）"）
- Rounds: 1
- Findings addressed: 全部文件/行引用经 live repo 核对通过（text.tsx:154/button.tsx:266/icon.tsx:53/badge.tsx:26、注册定义 :151/:169/:310/:323、design.md/lab 页存在）；Minor 已处理。

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

Status Note: 已完成 —— 四 Phase 全部执行完毕：4 张审计卡（text/button/badge/icon）closed（P0×1/P1×2 清零）、P2 ×5 当场修复、P2-3（href 协议校验）shared 归 CR 登记；宿主场景 5/5 + 回归 89/89 + basic 466 单测 + workspace 31/31/31/58 全绿；独立子 agent closure-audit pass（task `ses_03c655ea6ffeZUBM6m56E4eKJe`，verdict approved，零 Blocker/Major，2 Minor 非阻塞：P2-3 走 CR 而非 CX-n（已显式记录后继）、卡内行号为审计时点（cosmetic））。roadmap C1.3 标 `done`。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session（task `ses_03c655ea6ffeZUBM6m56E4eKJe`）
- Evidence: verdict `approved`（零 Blocker/Major）；独立重跑 basic 466 单测、typecheck/build/lint、playwright c1-3 5/5 + action-logic/data-renderers 16/16、flux-guide validate 27 pre-existing；逐项核对 4 卡 18 维表与 `文件:行`（~15 处）、代码落点（button adapter 4 处 touchpoint、text maxLine var、badge marker、定义 defaultSchema/fields）、测试断言行为正确性、deferred 诚实性；grep 确认 button.tsx 零 localStorage 调用。

Follow-up:

- P2-3（button/link href URL 协议校验，shared）→ CR work item 集中裁决（卡内已登记）。
- 工具假阴性：`check:audit-missing-renderer-markers` 对含 `@nop-chaos/*` 包名 import 的渲染器文件 0 命中（`content.includes('nop-')` 被包名满足）→ CG 阶段升级脚本。
- 卡内 `文件:行` 为审计时点位置，后续复核以卡上引用为准（Minor）。
