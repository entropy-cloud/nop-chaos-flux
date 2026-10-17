# 632 跨 roadmap Wave A 状态面收口（UR-1 R2-1e 走查收口 + UR-2 E11 补登 + UR-3 R7 包络人工确认）

> Plan Status: completed（2026-10-17 closure audit approved（独立子 agent agent_e4ef8a37，0 Blocker / 0 Major / 2 Minor 随同批修正）；编号注记：起草号 628 因并发会话撞号让位改 632）
> Last Reviewed: 2026-10-17
> Source: `docs/backlog/cross-roadmap-remediation-roadmap.md` UR-1 / UR-2 / UR-3（Wave A 状态面未闭环）
> 编号注记：本 plan 起草号为 628，与并发会话四轨深度审查修正计划（`628-deep-audit-remediation-plan.md`，其预告 successor 块 629-631）撞号——本 plan 改号 632 让位（2026-10-17），两 plan 领地互斥（该 plan 显式排除 UR-1~UR-20 队列）
> Related: `docs/plans/558-audit-prompt-feedback-hygiene-plan.md`（R2-1e 候选来源）、`docs/backlog/visual-quality-r2-roadmap.md`（R2-1e 行）、`docs/components/roadmap-industrial-hmi-editor.md`（E11 / R7）、`docs/audits/per-component/scada-editor-canvas.md`（审计卡）

## Purpose

把 cross-roadmap 路线图 Wave A 的三个状态面未闭环项收口：①R2-1e 增量走查行收口（R2-1b 残留程序化复检 + P3×7 design-debt candidates 人工裁决 + 落地）；②E11 组补登 industrial-hmi-editor roadmap Phase Status；③R7 编辑态包络数字人工最终确认并回写全部相关处。三项完成后按回写映射更新源 roadmap，UR-1/UR-2/UR-3 置 `done`。

## Current Baseline

- **UR-1 复检结论（本会话 2026-10-17 程序化复检，代码面逐项定位）**：
  - **R2-1b 残留 5 项**：A3-01 ×2（report-designer / report-designer-host 行列头按钮高度受 22px header 单元格约束，`packages/spreadsheet-renderers/src/canvas-styles.css` `[data-slot=spreadsheet-column-header]{height:22px}` + `.ss-header-button{height:100%}`）——**现役**；E4-01（`packages/report-designer-renderers/src/page-renderer.tsx:554-562` 状态摘要两 `<span>` JSX 剥空白直接粘连、`[data-slot=report-designer-status]` 无任何 CSS 规则）——**现役**；B1-01（`apps/playground/src/pages/debugger-lab-page.tsx:161/313/325` `text-white/40` 11px 辅助标签 ×3）——**现役**；C5-01（`apps/playground/src/pages/print-designer-demo.tsx:93` 页根无视口约束 + `packages/flux-print-renderers/src/print-designer.tsx:229` 画布容器 `flex-1 overflow-auto` 但整页滚动替代）——**现役**；B5-02 族（report-designer-host "N 个字段"徽章）——**已消项**（现役实现为语义化 `Badge` 组件 token 变体，`report-designer-toolbar.tsx:113-121`，无 literal 配色）。
  - **P3×7 candidates 复核**：②spreadsheet 操作条 EN-CN 混排——**不复现**（工具栏全 icon + i18n key，`packages/spreadsheet-renderers/src/spreadsheet-toolbar/toolbar-groups.tsx:44-275`；页面内唯一 EN 文本属 demo 自有独立行 `apps/playground/src/pages/spreadsheet-demo.tsx:149/152`，非同一操作条混排）；③scada 页头 7 同权重 primary——**不复现**（现役 4 个 scada 页页头均为 `variant={screen===X?'default':'outline'}` 分段切换，任一时刻 ≤1 个 primary）；①report-designer 检查器裸文本——**仍存在**（`report-designer-inspector.tsx:61-73` 有选中时 body 无卡片容器直接输出；对照空态有 dashed border 卡片 `inspector-shell-renderer.tsx:56`）；④scada 按钮 EN-CN 混排——**仍存在**（`scada-edge-demo.tsx:127-130` 等 4 页 eyebrow EN + 标题 CN + 按钮 CN+技术词混写）；⑤dashboard Back 钮——**仍存在**（`dashboard-demo.tsx:150-155` schema 级 primary 实心 "← Back to Home" 位于 body 左上 + 页底 ：234-236 重复 outline 钮；家族惯例 = 页头 outline/ghost 胶囊，见 `apps/playground/src/pages/report-designer-page.tsx:13-19` / `apps/playground/src/pages/scada-edge-demo.tsx:123-125`）；⑥print-designer 双面板无折叠 affordance——**仍存在**（`print-designer.tsx:226-236` 固定宽双面板无 collapse 控件；对照 report-designer 侧已有 collapse 按钮）；⑦report-designer B2 光标残影——**代码面无残影机理**（页面无自定义 cursor 伪影逻辑；grab/cell/crosshair/resize 多光标并存均属正常语义），判定疑似探针伪影。
- **UR-2**：审计卡 `docs/audits/per-component/scada-editor-canvas.md` 实为 **closed**（2026-08-08 独立 fresh-session closure audit PASS，`ses_0202ae215ffeqrZBtX2DOumfch`，6 finding 全 LANDED、98 files/1319 tests 全绿）——cross-roadmap 表"fixed-pending-closure"记载已过时（盘点误载）；剩余工作仅 E11 组补登 `docs/components/roadmap-industrial-hmi-editor.md` Phase Status（现只列 E0–E10）。
- **UR-3**：E9.2 复测报告 `docs/analysis/industrial-hmi-editor/editing-envelope-retest-2026-08-07.md` 即确认材料——primary 包络 ①≥30fps@≤1k（实测 best 50.2fps，余量 1.67×）②<100ms per-call（实测 max 13.1ms，余量 ~7.6×）④≤320MB（实测 50.2MB，余量 ~6.4×）全部达标；③选区规模 ≤1k primary 达标、≤10k extended 维持留观察；⑤runtime 最终验证（E6+E9.2）完成；已知 watch-only：1k 选区首次拖拽初始化 7.5fps（稳态 50fps，非阻断）。R7 在 roadmap 头部、§总览、E1.2/E9/E10 条目、Cross-Cutting 等多处标注"待人工最终确认"。

## Goals

- R2-1e 行收口：残留复检结论 + P3×7 裁决结论落账，R2-1e 置 `done` 并注明裁决结论（回写动作）。
- P3×7 中经人工裁决"修复"的候选项落地（先红后绿或程序化断言），"书面维持"的候选项在台账/源登记处留档，零静默。
- E11 组补登 Phase Status `done`（基于审计卡既有 closure audit PASS 证据，只做状态同步不重复审计）。
- R7 包络数字获人工最终确认，确认提交物落盘，roadmap 全部相关处回写确认结论。
- cross-roadmap UR-1/UR-2/UR-3 置 `done`（同批回写完成后）。

## Non-Goals

- 仍现役残留（A3-01×2 / E4-01 / B1-01 / C5-01）的修复实施——其归属为 R2-3/R2-4 字母批 successor 队列（预授权、随需立项，非本表工作项）；本计划只落复检结论与归属标注。
- E11 重跑审计或重开审计卡（卡已 closed，含独立 closure audit PASS）。
- 包络数字本身的调整或 extended（≤10k）档升级（材料显示维持留观察）。
- Wave B–E 的任何工作项。

## Scope

### In Scope

- `docs/backlog/visual-quality-r2-roadmap.md` R2-1e 行收口回写 + `docs/audits/visual-quality-r2/watch-pool.md`（如需书面维持留档）。
- P3×7 裁决落地涉及的代码面：`packages/report-designer-renderers/src/report-designer-inspector.tsx`、`apps/playground/src/pages/{scada-*,dashboard-demo}.tsx`、`packages/flux-print-renderers/src/print-designer.tsx`（以裁决结果为准）。
- `docs/components/roadmap-industrial-hmi-editor.md`：E11 补登 Phase Status + R7 确认结论回写全部相关处。
- R7 人工确认提交物：`docs/analysis/industrial-hmi-editor/r7-envelope-confirmation-2026-10-17.md`（新建）。
- `docs/backlog/cross-roadmap-remediation-roadmap.md` UR-1/UR-2/UR-3 状态 + 前提勘误；`docs/logs/2026/10-17.md` 收口记录。

### Out Of Scope

- R2-3c/R2-4b 字母批立项与实施（demand-gated）。
- industrial-hmi-editor roadmap 其它条目、scada-editor-perf 3 个阈值测试裁决（plan 623 领地）。
- 任何 Wave B–E 工作项。

## Failure Paths

| 编号           | 触发                     | 行为                                                                                   | 可重试 | 用户可见表现 |
| -------------- | ------------------------ | -------------------------------------------------------------------------------------- | ------ | ------------ |
| adj-no-answer  | 人工裁决问题未获回答     | P3×7 未决项与 R7 保持"材料已备待人工裁决"登记，本计划相应 phase 置 blocked，不强行落地 | 是     | 无           |
| fix-regression | P3 修复破坏既有 e2e/单测 | 先红后绿纪律修复；无法即修的回退裁决为书面维持并留档                                   | 是     | 无           |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**（状态面收口为主；P3 修复为 demo/schema 级视觉债，按 designer-family-visual-fixes 先例以程序化断言守护可修项——组件级行为变更（如 print 面板折叠）加 focused 单测，纯文案统一不强制测试）。

## Execution Plan

### Phase 1 - UR-1① 复检结论落盘

Status: completed
Targets: 本 plan Current Baseline

- Item Types: `Proof`

- [x] Proof：R2-1b 残留 5 项程序化复检逐项落结论（现役 4：A3-01×2 / E4-01 / B1-01 / C5-01，均带 file:line 证据；销项 1：B5-02 族——语义化 Badge 收敛），见 Current Baseline。
- [x] Proof：P3×7 candidates 复核逐项落结论（不复现 2：spreadsheet EN-CN / scada 7-primary；仍存在 4：report 检查器裸文本 / scada EN-CN / dashboard Back / print 双面板；疑似探针伪影 1：B2 光标残影——代码面无残影机理）。

Exit Criteria:

- [x] 每项结论带 file:line 证据可在仓库直接核对（Current Baseline 节）。

### Phase 2 - UR-1② + UR-3 人工裁决（human gate）

Status: completed
Targets: 本 plan、AskUserQuestion 记录、`docs/analysis/industrial-hmi-editor/r7-envelope-confirmation-2026-10-17.md`

- Item Types: `Decision`

- [x] P3×7 待裁决 4 项（①检查器裸文本 / ④scada EN-CN / ⑤dashboard Back / ⑥print 双面板）整理裁决材料 → 人工裁决（修复或书面维持）；不复现 2 项 + 探针伪影 1 项按复核结论登记（不占裁决席位）。**裁决记录（2026-10-17，AskUserQuestion）：用户选「全部修复 (Recommended)」——4 项全部修复；spreadsheet EN-CN 与 scada 7-primary 按复检结论登记不复现；B2 光标残影登记探针伪影。**
- [x] R7 包络数字人工最终确认（材料 = E9.2 复测报告 §2/§5），确认结论落提交物 memo。**确认记录（2026-10-17，AskUserQuestion）：用户选「确认通过 (Recommended)」——primary 包络 ①②③④ 确立为 mission 级阈值；extended 留观察；[E1.1-sg] 维持 watch-only。提交物：`docs/analysis/industrial-hmi-editor/r7-envelope-confirmation-2026-10-17.md`。**
- [x] 裁决/确认结论记录进本 plan（本节两条裁决记录 + Phase 3/5 落地）。

Exit Criteria:

- [x] 两项人工裁决均有明确结论并记录在案；或按 Failure Path adj-no-answer 显式 blocked。

### Phase 3 - UR-1③ 裁决结果落地

Status: completed
Targets: 以裁决结果为准（候选代码面见 Scope）

- Item Types: `Fix | Follow-up`

- [x] 裁决"修复"项逐项落地（4/4）：report 检查器裸文本 → `report-designer-inspector.tsx` dynamicBody 包 `report-designer-inspector-body` 卡片容器（判别测试先红后绿，`report-designer-inspector.test.tsx`）；scada EN-CN 混排 → `scada-edge-demo.tsx` 按钮 CN 统一（最小合法配置/悬停验证/适配验证）+ notify 前缀「通知：」+ 路由目录描述同步；dashboard Back 钮 → `dashboard-demo.tsx` 头部 outline 胶囊（保留 `dashboard-back` testid，兼容既有 e2e `db4-editor-clean`）+ 页底重复钮删除 + 死 `dashboardDemo:back` 方法清理；print 双面板 → `print-designer.tsx` 折叠 affordance（`toggle-print-palette`/`toggle-print-inspector` 轨道钮 + aria-expanded + i18n 双 locale 键，判别测试先红后绿）。
- [x] 裁决"书面维持"项 + 不复现 2 项 + 探针伪影 1 项：用户裁决为全部修复，无维持项；不复现 2 项 + 伪影 1 项结论登记进 R2-1e 行回写文本（见 Phase 5）。

Exit Criteria:

- [x] 修复项全部落地且验证绿（report-designer-renderers 221/221 含新判别测试；flux-print-renderers 86/86 含新判别测试；既有 e2e 断言面兼容）。
- [x] 局部 typecheck（涉及包）通过（全量 typecheck 亦过——唯一红 = playground vite.config 既有披露红，非本 plan diff）。

### Phase 4 - UR-2 E11 内容勘误（不含状态翻转）

Status: completed
Targets: `docs/components/roadmap-industrial-hmi-editor.md`

- Item Types: `Fix`

- [x] E11 节引言 stale 注记勘误：`fixed-pending-closure` 改按审计卡实况（closed，2026-08-08 含独立 closure audit PASS `ses_0202ae215ffeqrZBtX2DOumfch`）。
- [x] 同类勘误顺带同步（执行期发现，超出 UR-2 登记面的 1 行状态同步，如实披露）：`docs/components/roadmap-industrial-hmi.md:288` scada-canvas 审计卡指针同为陈旧 `fixed-pending-closure`（卡实况 closed）——就地注记勘误；非新工作项，不改变本 plan scope。

Exit Criteria:

- [x] E11 节引言与审计卡状态一致；本时点 Phase Status 暂不含 E11 条目（翻转在 Phase 6）。

### Phase 5 - UR-3 R7 确认回写 + UR-1/UR-2/UR-3 内容回写

Status: completed
Targets: `docs/components/roadmap-industrial-hmi-editor.md`（头部/总览/E1.2/E9/E10/Cross-Cutting R7 相关处）、`docs/backlog/visual-quality-r2-roadmap.md`（R2-1e 行裁决结论注记）、`docs/backlog/cross-roadmap-remediation-roadmap.md`（来源登记勘误注记）、`docs/logs/2026/10-17.md`

- Item Types: `Fix | Proof`

- [x] R7 确认结论回写 roadmap 全部相关处（头部 Last Updated / 总览包络行 / Cross-Cutting R7 项 / E10 收尾句就地注记；历史条目不改写）。
- [x] R2-1e 行追加复检结论 + 裁决结论注记（**状态翻转在 Phase 6**）。
- [x] cross-roadmap UR-1/UR-2/UR-3 来源登记"fixed-pending-closure"等过时前提就地勘误注记（状态翻转在 Phase 6）+ Plan 列登记。
- [x] daily log 收口记录（含编号让位说明：628 → 632）。

Exit Criteria:

- [x] 三份源文档 + cross-roadmap 表 + daily log 内容回写一致；`grep -rn "fixed-pending-closure" docs/` 零未勘误残留（仅允许勘误就地附注形式的历史引用）。

### Phase 6 - closure audit 通过后的 done 翻转批（状态机时序）

Status: completed
Targets: `docs/backlog/visual-quality-r2-roadmap.md`（R2-1e → `done` + Last Updated）、`docs/components/roadmap-industrial-hmi-editor.md`（E11 → Phase Status `done`）、`docs/backlog/cross-roadmap-remediation-roadmap.md`（UR-1/UR-2/UR-3 → `done`）

- Item Types: `Fix`

> 本 phase 的全部翻转**仅在独立子 agent closure audit 通过后执行**，并与 closure 证据、Phase 3-5 回写并入**同一次提交**（cross-roadmap Rule"closure audit pass → done，禁止提前"+ 回写同 commit 纪律）。

- [x] R2-1e 行 `open` → `done` 并注明裁决结论；`Last Updated` 刷新。
- [x] E11 组补登 Phase Status `done`（引审计卡既有 closure audit 证据）。
- [x] cross-roadmap UR-1/UR-2/UR-3 置 `done`。
- [x] 审计 Minor 修正：M-2 R7 memo 内 2 处"plan 628"残留改 632；M-1 头部"最后更新"行与 E11 Phase Status 落位互证（翻转同批核verified）。

Exit Criteria:

- [x] 三处状态翻转全部落位；本 plan Closure Gates 全勾且 plan 标 `completed` 与翻转同批。

## Draft Review Record

- Reviewer / Agent: agent_aabaf41e（fresh session 独立子 agent，2026-10-17）
- Verdict: `pass-with-minors`（R1 `revised` 0B/2M/3m → 修订全落地 → R2 delta 复核 0B/0M，余 1 Minor（N1，Phase 4"文本准备就绪"落点不可观测——已按建议删去该表述）+ 1 nit 措辞收紧，均不阻塞；共识达成）
- Rounds: 2
- Findings addressed: F1（Major）Phase 2 失实 `completed` → 改回 `planned`；F2（Major）done 翻转时序 → 新增 Phase 6（closure audit 通过后同批次翻转 + 回写同 commit），Phase 4/5 改为纯内容回写；F3（Minor）industrial-hmi roadmap E11 节引言 `fixed-pending-closure` 勘误纳入 Phase 4 + grep 清零纳入 Phase 5 Exit；F4（Minor）toolbar-groups / report-designer-page 两处补全路径；F5（Minor）Phase 1 Targets 删去 watch-pool.md；N1（Minor，R2）Phase 4 可观测化措辞收紧

## Closure Gates

- [x] UR-1①复检结论全部落盘且证据可核对（Current Baseline file:line，审计抽查全命中）
- [x] UR-1② P3×7 人工裁决完成并记录（AskUserQuestion 2026-10-17：全部修复；R7：确认通过）
- [x] UR-1③ 裁决结果全部落地（4/4 修复判别测试红→绿；不复现/伪影 3 项登记 R2-1e 行，零静默）
- [x] UR-2 E11 补登完成且与审计卡一致（Phase Status `done` 引卡上 closure audit 证据）
- [x] UR-3 R7 人工确认完成、提交物落盘、回写完成（memo + roadmap 四处）
- [x] cross-roadmap UR-1/UR-2/UR-3 置 done，五面回写一致
- [x] 不存在被静默降级的 in-scope 项（仍现役残留归字母批队列记账三面一致）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（agent_e4ef8a37 approved，见 Closure Audit Evidence）
- [x] `pnpm typecheck`（81/82；唯红 = playground vite.config 既有披露红，归并发 plan 621 领地）
- [x] `pnpm build`（43/44；同上既有红）
- [x] `pnpm lint`（全绿——执行中修一处我引入的 useMemo 冗余依赖）
- [x] `pnpm test`（除 playground 3 文件既有登记红（route-matrix xlang ×2 + app.test/app-diagnostics-route，归并发 plan 621）外全绿；focused：report-designer-renderers 221/221、flux-print-renderers 86/86）

## Deferred But Adjudicated

（起草期无；执行中改判当场落此节。）

## Non-Blocking Follow-ups

- R2-3c/R2-4b 字母批 successor 队列承接仍现役残留（A3-01×2/E4-01/B1-01/C5-01）——预授权、随需立项，非本计划义务。

## Closure

Status Note: 2026-10-17 收口。Wave A 三项全闭环：UR-1（R2-1e 复检 5 项结论 + P3×7 人工裁决"全部修复"+ 4 项落地带判别测试 + 回写）；UR-2（审计卡实况勘误 + E11 补登 Phase Status done，重审计免除——卡上已有 2026-08-08 独立 closure audit PASS）；UR-3（R7 包络人工确认通过 + 提交物 + 四处回写）。执行期发现 1 处同类陈旧指针（industrial-hmi.md:288 scada-canvas 卡）如实披露并顺带同步。closure audit approved（2 Minor 随本批修正）。

Closure Audit Evidence:

- Auditor / Agent: agent_e4ef8a37（独立 fresh-session sub-agent，2026-10-17）
- Evidence: Verdict `approved`（0 Blocker / 0 Major / 2 Minor）——六项核对全 PASS：Phase 状态对账（Phase 1 证据 file:line 抽查全命中）、四项修复真实性（测试断言实读 + focused 套件实跑 221/221 与 86/86 复现判别力）、六面回写互洽 + done 未提前时序核verified、Deferred/Follow-up 诚实性（残留记账三面一致）、Closure Gates 研判（既有红按零新增口径可接受）、人工裁决记录完整性。Minor M-1/M-2 已随 Phase 6 同批修正。审计输入 = plan + diff 摘要 + 验证输出三件套（未复用执行上下文）。

Follow-up:

- 见 Non-Blocking Follow-ups。
