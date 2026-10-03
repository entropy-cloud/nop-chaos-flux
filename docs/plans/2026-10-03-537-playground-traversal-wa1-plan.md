# 537 Playground 全遍历 W-A1：complex-pages 40 页操作按钮逐一触发

> Plan Status: completed
> Last Reviewed: 2026-10-03
> Source: `docs/analysis/2026-10-03-playground-full-traversal-ux-roadmap.md`（R13 波次 W-A1）、`docs/analysis/2026-10-03-complex-pages-browser-confirmation-roadmap.md`（R12 展现层基线）
> Related: R13 roadmap 主文档（确认矩阵 §六 回填处）

## Purpose

R12 已对 complex-pages 40 页完成展现层确认（数据完整、布局无塌陷）；本计划补齐**操作面**：逐页将页面上每一个按钮/可点元素逐一触发，验证「点击后有且仅有其语义所指的反馈」，并修复发现的功能性问题。执行期同步回填 R13 roadmap §六 W-A 矩阵。

## Current Baseline

- R12 全量 40/40 展现层确认通过（2 项 P2 当轮已修、2 页带在册 P3），基线记录见 `2026-10-03-complex-pages-browser-confirmation-roadmap.md` §二。
- P2 残留清零（linear-board tab 对齐、dashboard 渠道占比卡溢出均已修复并实机复验）。
- P3 在册共 4 项（R12 §三口径，按项计；对应 2 个页面）：combo-editor ×/trash 双删除钮（共享 composite 组件，维持登记）、antdpro form-basic 背景接缝、antdpro detail-basic 背景接缝（两项均已改判非缺陷）、approval-tasks 查询卡右侧空区（布局偏好）。
- watch-only 对照锚点：master-detail 子表加载 >2s（性能观测，R13 §七 在册，不重复开卡）。
- playground dev server 实测可运行（vite 8，`pnpm dev`）；路由 `#/complex-pages/<id>`。
- R12 教训：SPA 内同文档 hash 导航偶发不触发重挂载——遍历统一采用「整页 reload 落地目标 hash」规避。

## Goals

- 40 页逐页完成操作面遍历：每个按钮/可点元素触发一次，记录「预期反馈是否发生、有无误报错、有无空点」。
- 遍历中发现的 P1（功能破坏/数据不一致）当波修复并带回归保障；P2（交互瑕疵）当波修复或书面改判；P3 登记 roadmap 尾册。
- 回填 R13 roadmap §六 W-A 40 行矩阵（状态 + 卡片摘要）。

## Non-Goals

- 不重复 R12 已确认的展现层截图走查（静态布局不再逐页截图确认，仅当操作暴露布局问题时处理）。
- 不做 W-A2 主子通信对齐审计（独立工作项，后续计划）。
- 不改渲染器级公共契约（发现渲染器级缺口登记 follow-up，不本计划内重构）。
- 不覆盖 W-B~W-E 页面组。

## Scope

### In Scope

- `apps/playground/src/complex-pages/` 注册的 40 页（registry：complex-pages-model.ts）。
- 遍历期发现问题的修复落点：complex-pages 内 schema/页面代码、`apps/playground/src/`（mock fetcher、主题）、渲染器包（仅当缺陷根因在渲染器且修复面小）。
- `_tmp/` 下遍历探针脚本与截图（不入库）。

### Out Of Scope

- 设计器/渲染器演示/AI/性能页（W-B~W-E）。
- e2e 套件扩充（本计划验证以实机探针 + focused 单测为准）。

## Failure Paths

| 可测场景       | 触发                           | 行为                               | 可重试 | 用户可见表现          |
| -------------- | ------------------------------ | ---------------------------------- | ------ | --------------------- |
| hash 导航竞态  | 同文档 goto 目标页偶发不重挂载 | 遍历器强制整页 reload 后再断言     | 是     | 无（遍历器内部规避）  |
| 弹窗打开后卡死 | 点击后 dialog 未渲染/遮罩残留  | 该按钮记 P1/P2，修复后复验         | 是     | 遮罩残留/无法继续操作 |
| 删除类操作误伤 | 确认弹窗自动确认导致批量误删   | 仅 mock 内存数据，整页 reload 复原 | 是     | 无持久影响            |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**。遍历本身是实机程序化验证（evaluate/locator 断言 + 反馈探针记录）；对修复的非平凡 bug（根因隐蔽、跨包、可回归）按 Bug Fix Test Coverage Rule 补 focused 测试。

## Execution Plan

### Phase 1 - 数据列表 + 主从 + 复杂表单 + 可视化组（14 页）

Status: completed
Targets: `crud-views-export, dynamic-tabs, standard-crud, tree-crud, inline-edit-table, advanced-query, master-detail, detail-subtables, business-document, combo-editor, form-wizard, complex-form, approval-tasks, dashboard`

- Item Types: `Proof | Fix | Follow-up`

- [x] 逐页按钮遍历（14/14），逐按钮记录反馈结论
- [x] 逐页顺带核对：新增交互未引入 id 耦合（R13 §四 执行期动作）
- [x] P1/P2 修复落地（如有）+ focused 验证
- [x] roadmap §六 矩阵 14 行回填

Exit Criteria:

- [x] 14 页矩阵行全部回填且无 ❌（P1 未清不得回填 ✅）
- [x] 修复项（如有）有实机复验记录或 focused 测试

### Phase 2 - Sundial + AntD Pro 组（14 页）

Status: completed
Targets: `sundial-workbench, sundial-analytics, sundial-detail, sundial-settings, sundial-todo-dialog, antdpro-list, antdpro-form-basic, antdpro-form-grouped, antdpro-form-dialog, antdpro-form-step, antdpro-detail-basic, antdpro-detail-advanced, antdpro-dashboard, antdpro-result`

- Item Types: `Proof | Fix | Follow-up`

- [x] 逐页按钮遍历（14/14）
- [x] 逐页顺带核对：新增交互未引入 id 耦合（R13 §四 执行期动作）
- [x] P1/P2 修复落地（如有）+ focused 验证
- [x] roadmap §六 矩阵 14 行回填

Exit Criteria:

- [x] 14 页矩阵行全部回填且无 ❌
- [x] 修复项（如有）有实机复验记录或 focused 测试

### Phase 3 - Cal + Linear + 数据库/表格复刻组（12 页）

Status: completed
Targets: `cal-booking, cal-confirm, cal-success, linear-issues, linear-board, linear-inbox, linear-detail, linear-projects, linear-settings, notion-database, airtable-grid, stripe-payments`

- Item Types: `Proof | Fix | Follow-up`

- [x] 逐页按钮遍历（12/12）
- [x] 逐页顺带核对：新增交互未引入 id 耦合（R13 §四 执行期动作）
- [x] P1/P2 修复落地（如有）+ focused 验证
- [x] roadmap §六 矩阵 12 行回填

Exit Criteria:

- [x] 12 页矩阵行全部回填且无 ❌
- [x] 修复项（如有）有实机复验记录或 focused 测试

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `pass-with-minors`（零 Blocker / 零 Major）
- Rounds: 1
- Findings addressed:
  - Minor-1 基线 P3 计数口径 → 已统一为「按项计 4 项 / 对应 2 页」并标注口径来源。
  - Minor-2 master-detail 子表加载 >2s watch-only 锚点 → 已补入 Current Baseline。
  - Minor-3 R13 §四 id 耦合顺带核对 → 已加入三个 Phase 的执行项。
  - Minor-4 Closure Gates 缺 owner-doc 同步条目 → 已补。
  - Minor-5 Phase 1 组名未含 visualization → 已改名为「…+ 可视化组」。

## Closure Gates

- [x] 40 页全部完成操作面遍历，roadmap §六 W-A 矩阵 40 行回填，无 ❌
- [x] 所有 P1 已修复并复验；P2 已修复或书面改判；P3 已登记尾册（R13 roadmap §七「W-A1 执行期新增登记」）
- [x] 非平凡 bug 修复有 focused 测试或实机探针记录（daily log 归档：P1 校验 toast 修复回归测试 ×2；P2 双 toast 修复回归测试 ×2）
- [x] 不存在被静默降级的 in-scope live defect
- [x] No owner-doc update required（本轮修复为 flux-action-core/flux-runtime 内聚缺陷修复 + playground mock 观测钩子，未改任何 owner doc 所描述的契约语义；toast/failureHandled 属既有 notify/ActionResult 契约的缺陷收敛）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（42/42）/ `pnpm build`（42/42）/ `pnpm lint`（42/42）/ `pnpm test`（78 任务全绿）/ `pnpm check`（exit 0）

## Deferred But Adjudicated

（执行期回填）

## Non-Blocking Follow-ups

- 渲染器级缺口（如发现）登记至 R13 roadmap §七 / 渲染器级 follow-up 清单。

## Closure

Status Note: W-A1 全部完成——40/40 页操作面遍历（三个 Phase 全 completed），P1×1 + P2×1 当波修复（各带回归测试 ×2），P3×6 登记至 R13 roadmap §七，全量门禁 full-green，独立子 agent closure audit approved（零 issues）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose）
- Evidence: 审计 verdict `approved`（2026-10-03）。核对：describeActionFailure 两处通知落地+回归 ×2（flux-action-core 212/212 实跑复证）；failureHandled 抑制双 toast+回归 ×2（flux-runtime 1486 passed/1 skipped 实跑复证）；lastBulkUpdate 钩子落地；roadmap §六 W-A 40 行全 ✅ 零 ❌ + §七 尾册 6 P3 + 2 已修记录；daily log 收口段完整；工作区无越界产物；P3 分类诚实（无 live defect 静默降级）。

Follow-up:

- P3 尾册 6 项（R13 roadmap §七「W-A1 执行期新增登记」）——后续波次或专项打磨轮处理。
- W-A2 主子通信对齐审计承接：standard-crud `component:refresh + closeSurface` 形态与 §三 refreshNearest 标准的关系裁决。
