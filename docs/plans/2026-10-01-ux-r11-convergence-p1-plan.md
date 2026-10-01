# UX-R11 收敛复审计 P1 修复（Word 工作台爆宽 + linear-issues 首屏稳定性）

> Plan Status: completed（closure audit 链收口：round 1 issues-found 2 Minor → 修复；round 2 issues-found 1 Minor（Baseline 枚举笔误）→ 按 auditor 给定原文修复 → auditor 明示"may proceed to closure"）
> Last Reviewed: 2026-10-01
> Source: `docs/analysis/2026-10-01-playground-designer-ux-roadmap.md` 收敛复审计（fresh-eyes 19 路由重走，CONVERGENCE: not-reached）；原始审计 `docs/analysis/2026-10-01-playground-designer-ux-audit.md`
> Evidence: 复审计探针与截图存 `_tmp/convergence-reaudit/`（易失目录，证据结论以 daily log 摘录为准）；reviewer 复核探针（已按 A4 清理，内容要点见 Draft Review Record）

## Purpose

修复收敛复审计发现的 P1（N-1 Word 工作台爆宽），把 N-2（linear-issues 首屏偶发空面板）按 R1 复核结论重新定界为非确定性竞态问题（回归钉 + 竞态调查登记），使 R1-R10 后的收敛判定达成。

## Current Baseline

> R1 修订：独立 review 对 N-2 做了 live 复核——基线症状在当前 HEAD 不可复现（3 次 fresh load 均 10 行出数）、原根因主张被运行时源码证伪。以下为修订版。

- **N-1（P1，review 全项确认）**：`#/word-editor` 在 1440×900 下右侧 ~40% 工作台为死灰区——大纲面板 boundingBox x=2652（视口外）。根因（reviewer live probe 复测一致）：`.nop-workbench`（`packages/flux-react/src/workbench/workbench-shell.tsx:330`）只定义 `grid-rows-[auto_minmax(0,1fr)]`、**无 grid-template-columns**——单一隐式列轨道按 max-content 取尺寸（computed `grid-template-columns: 2964.5px`），被 ribbon 工具条（`packages/word-editor-renderers/src/toolbar/ribbon-toolbar.tsx:44`，11 组子项固有宽 2965px）撑爆，`overflow-x-auto` 因轨道未被钳制而永不生效。审计基线以来 ribbon 零改动（git log 5aec4f790..HEAD 无 toolbar 记录）——**长世纪潜伏缺陷**而非 R10 回归（原始审计大纲面板"可见"疑为 fullPage 截图伪象；R10 wd1 e2e 通过因 Playwright toBeVisible 不检查视口横向交叠）。WorkbenchShell 渲染消费方 7 处（5 直接 JSX：word-editor-page、designer-page-body（flow-designer-renderers）、dashboard-editor-renderer、report-designer-renderers/page-renderer、report-designer-demo；2 传递：dashboard-demo 经 dashboard-editor-renderer、flow-designer-page 经 designer-page-body）+ 1 处路由描述提及（domain-route-entries.ts:526），review 逐点核实：无消费方传入 `grid-cols-*`、组件测试未钉根 className 字符串、轨道钳制对内容不溢出的消费方行为中性。
- **N-2（复审计报 P1，R1 重新定界）**：`#/complex-pages/linear-issues` 首屏偶发"主面板空数据"——复审计两次探针与 drafter 复现探针均见 `.ln-empty` 空态 + 黑域；但 review 对当前 HEAD 的 3 次 fresh load（6s settle、1440×900、无输入）**全部 10 行出数**（ENG-101…），磁盘与 vite 服务内容均为原始 schema（perPage 模板版）。**症状非确定性**，模式符合加载期竞态（机器高负载下 mount/dispose 或 props 解析时序；页面存在 `null-member access during props resolution: node=linear-issues-table` 容忍路径告警）。~~原"dependsOn 根未初始化 → 初始取数永不触发"主张被运行时源码证伪~~：`source-registry.ts:398` 注册即无条件 `controller.start()`；`api-data-source-controller.ts:124-139` 初始取数仅看 `resolveInitFetch`（默认 true，schema 无 initFetch）与 `evaluateSendOnGate`（无 sendOn → true），**无任何 dependsOn 存在性门**；未发布标识符经 `evaluator.ts:334-346` 容忍路径返回 undefined（`${filterKeyword ?? ""}` → `""`）。URL 模板剥离实验亦证明非 URL 因素。
- **P2 残留triage**（复审计确认，全部登记 follow-up 不入本 plan）：PR-1 样式区输入空无占位（float 未复现）；GR-2 邻接边小环（归边路由 follow-up 家族）；OP-1 渠道占比卡右缘溢出（loading 未复现）；DF-1 新增行行号列空白；P3 nits（dashboard-demo KPI 轻微裁边、code-editor SQL 上方灰条、kanban 无日期、page-designer 叶子字段容器徽标、debugger launcher 压 palette 底部）。Word 四角角标（marginIndicator）维持上游标准裁定。

## Goals

- N-1：WorkbenchShell 单列轨道钳制（`grid-cols-1`），word-editor 1440 下大纲面板进入视口、ribbon 工具条横向滚动生效；7 个渲染消费方（5 直接 + 2 传递）+ 1 处路由描述提及——回归无破坏；组件级 className 钉防止回退。
- N-2：linear-issues 首屏稳定性回归钉——**连续 3 次 fresh load 均出数**的多轮断言（born-green 回归钉，非红先修复——症状当前不可确定性复现）；PAGE_DATA 注入 filter 三默认值作为**作者契约加固**（dependsOn 引用的根有声明默认值，防止同类脆弱编写），如实记录非缺陷修复。
- P2 残留登记入 roadmap follow-ups（含 N-2 竞态调查登记，不预设语义结论）。

## Non-Goals

- P2 残留修复（PR-1/GR-2/OP-1/DF-1/P3 nits——登记即可）
- async-data 加载期竞态的运行时重构（登记 follow-up：复现时按 mount/dispose 时序取证）
- marginIndicator 角标移除（上游标准，已裁定）

## Scope

### In Scope

- `packages/flux-react/src/workbench/workbench-shell.tsx`（N-1 轨道钳制）+ `packages/flux-react/src/workbench/workbench-shell.test.tsx`（组件钉）
- `apps/playground/src/complex-pages/page-data.ts`（N-2 filter 默认值，作者契约加固）
- `tests/e2e/convergence-n1-n2.spec.ts`（新增：n1 红先 + n2 稳定性钉）
- `docs/analysis/2026-10-01-playground-designer-ux-roadmap.md`（follow-up 登记）

### Out Of Scope

- 上列 P2 残留与竞态运行时重构

## Failure Paths

| 可测场景编号     | 触发                                         | 行为                                                                                                                          | 可重试 | 用户可见表现       |
| ---------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------ |
| n1-word-inview   | 1440×900 打开 word-editor                    | 大纲面板条目 boundingBox 右缘 ≤ 1440（视口内可见）；ribbon 工具条 clientWidth ≤ 1440 且 scrollWidth ≥ clientWidth（滚动生效） | 否     | 大纲可达，无死灰区 |
| n2-linear-stable | 连续 3 次 fresh load linear-issues（无输入） | 每次 load 均 `[data-testid="linear-issues-row-key"]` ≥ 1（回归钉；born-green——症状当前不可确定性复现，见 Baseline N-2）       | 是     | 首屏出数稳定       |

## Test Strategy

档位选择：`必须自动化`（n1 红先修复）；n2 为 born-green 稳定性回归钉（症状不可确定性复现，red-first 不可构造——如实记录，不冒充先红后绿）。

n1/n2 均可 Playwright 程序化断言（boundingBox/DOM 文本）。WorkbenchShell 消费方回归以现有 e2e + flux-react 包套件覆盖；组件钉断言根 className 含 `grid-cols-1`。

## Execution Plan

### Phase 1 - N-1 WorkbenchShell 轨道钳制

Status: completed
Targets: `packages/flux-react/src/workbench/workbench-shell.tsx`、`packages/flux-react/src/workbench/workbench-shell.test.tsx`

- Item Types: `Proof`, `Fix`

- [x] n1 用例先红 → `.nop-workbench` 加 `grid-cols-1`（单列轨道 `minmax(0,1fr)` 钳制；先红实测：outline 右缘超 1440 断言红，修复后绿）
- [x] 组件钉：workbench-shell.test.tsx 断言根 className 含 `grid-cols-1`（flux-react 58 files/533 tests 全绿）
- [x] WorkbenchShell 消费方回归：flow-designer-ux-r7 + report-designer-ux-r9 + dashboard-demo + page-designer-mvp e2e 17 passed
- [x] word-editor 1440 探针结论摘录入 daily log

Exit Criteria:

- [x] n1 用例先红后绿
- [x] 消费方回归全绿
- [x] flux-react 套件全绿

### Phase 2 - N-2 稳定性钉 + 登记收尾

Status: completed
Targets: `apps/playground/src/complex-pages/page-data.ts`、`tests/e2e/convergence-n1-n2.spec.ts`、`docs/analysis/2026-10-01-playground-designer-ux-roadmap.md`

- Item Types: `Proof`, `Decision`

- [x] n2 稳定性钉（3 次 fresh load 出数断言，born-green 如实标注 + spec 注明竞态探测器语义——reviewer 顾问 A）
- [x] PAGE_DATA 注入 linear-issues filter 三默认值（作者契约加固，非缺陷修复——框架与理由记 daily log）
- [x] P2 残留 + N-2 竞态调查（复现时取证，不预设语义结论）登记 roadmap follow-ups（"收敛复审计登记"节 + R11 行）
- [x] playground typecheck + 两 spec 全绿（focused check）

Exit Criteria:

- [x] n2 稳定性钉绿
- [x] 登记完成
- [x] focused check 绿

## Draft Review Record

- Reviewer / Agent: 独立子 agent review R1/R2（fresh session，live probe 复核两 N 项；R2 复审对本修订稿 APPROVED）
- Verdict: pass-with-minors（R2 复审；0 Blocker / 0 Major；2 残留 Minor 已在晋 active 编辑中修复）
- Rounds: 2
- Round 1（CHANGES_REQUESTED，1 Blocker + 1 Major + 2 Minor 全文吸收）：
  - Blocker：N-2 基线症状在 HEAD 不可复现（review 3 次 fresh load 全绿）→ 重新定界为非确定性竞态，Phase 2 改 born-green 稳定性钉 + 竞态调查登记
  - Major：dependsOn 根未初始化机制主张被运行时源码证伪（source-registry.ts:398 无条件 start；初始取数无 dependsOn 门）→ 撤销主张与"运行时陷阱"登记；\_tmp 证据易失已注明（结论以 daily log 摘录为准）
  - Minor：Phase 2 重复 Closure Gates → 收敛为 focused check
  - Minor：Evidence 指向 \_tmp 易失目录 → 注明易失性、结论入 daily log
  - 顾问吸收：A1 组件钉（入 Phase 1）；A2 多轮 fresh load 断言（3 次）；A3 PAGE_DATA 以作者契约加固名义保留（非缺陷修复）；A4 reviewer 探针用后即清理
- Round 2（pass-with-minors，verdict 送达后回填）：R1 四项+四顾问全部确认吸收、执行面 intact（HEAD 66e1a12d5 未漂移、grid-cols-1 未预落、page-data 无 linear-issues 引用）；2 残留 Minor = ①消费方计数 8→"7 渲染 + 1 描述提及"（已改）②Draft Review Record 曾预填 R2 结论（已按 verdict 原文回填）；顾问 A（n2 钉兼作负载竞态探测器，spec 注明）、B（PAGE_DATA 项 Item Types 改 Decision）、C（n2 可重试改"是"）均已吸收

## Closure Gates

- [x] Phase 1/2 全部 completed 且 Exit Criteria 全勾
- [x] 新增失败路径测试存在且通过（n1 先红后绿 + n2 born-green 稳定性钉，记录在 daily log）
- [x] 浏览器/e2e 实测证据存档（截图结论摘录入 daily log；\_tmp 仅作过程探针，reviewer/drafter 探针已清理）
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`（42/42）
- [x] `pnpm lint`（42/42）
- [x] `pnpm test`（78/78 tasks）
- [x] `pnpm check`（exit 0，零新增红项）
- [x] owner doc 同步裁定：quick-reference.md 零 workbench-grid 引用、renderer-runtime.md:596 仅在 host-pattern 清单提名 WorkbenchShell 无根容器栅格行为——**No owner-doc update required**（closure auditor read-only 复核结论）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（round 1 issues-found 2 Minor + round 2 1 Minor 全部修复，auditor 指令授权收口）

## Non-Blocking Follow-ups

- PR-1 print 样式区占位与单位提示
- GR-2 邻接边小环（随边路由引擎 follow-up）
- OP-1 渠道占比卡右缘溢出
- DF-1 diff 新增行行号列空白
- P3 nits：dashboard-demo KPI 裁边 / code-editor SQL 灰条 / kanban 卡日期 / page-designer 叶子字段容器徽标语义 / debugger launcher 压 palette
- N-2 linear-issues 首屏空面板竞态调查（负载下 mount/dispose 时序取证；复现优先）

## Closure

Status Note: N-1 修复落地（grid-cols-1 轨道钳制 + 组件钉 + n1 e2e 红先绿后 + 消费方回归 17 e2e / flux-react 533 绿）；N-2 born-green 稳定性钉 + 作者契约加固 + 登记收尾。full-green verification（typecheck/build/lint 42、pnpm test 78 tasks、check exit 0）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent closure audit（fresh session；round 1 → 修复确认轮共 2 次 read-only 复查 + spec 复跑）
- Verdict: **approved（经 auditor 明示收口指令）**——round 1 issues-found（0B/0M/2 Minor：owner-doc 门未勾、Goals 消费方计数）+ round 2 issues-found（0B/0M/1 Minor：Baseline 5 直接 JSX 枚举笔误，auditor 给定精确原文）→ 三处均按 auditor 结论修复；round 2 复查确认 Minor 1/2 与全部顾问已吸收、spec 复跑 2 passed，并明示"text-only 修复后 may proceed to closure: back-fill Closure Audit Evidence … tick gate 120 … mark Plan Status completed"
- 审计复跑证据：convergence-n1-n2 e2e 2 passed（含新增 scrollWidth 断言）；flux-react 58 files / 533 tests passed——与 plan/log 记录逐位一致
- 顾问（非阻塞，已记录）：scrollWidth >= clientWidth 断言按 DOM 规范恒真（与 failure-path 措辞一致，承重回归由 outline-edge + ribbon-width 断言承载）；"7 渲染消费方"混合 5 直接 + 2 传递（Baseline 已显式拆分）
- 诚实性核对（auditor）：diff 恰为 7 个声明文件、HEAD 66e1a12d5 无漂移、born-green 全处如实披露、daily log 与实况相符
