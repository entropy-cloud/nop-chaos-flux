# 648 最终成熟度审计 FM-1b：交互实操走查批二（设计器/调度/移动/AI/3D 域）

> Plan Status: active
> Last Reviewed: 2026-10-18
> Source: `docs/backlog/final-maturity-audit-roadmap.md` FM-1b；`missions/final-maturity-audit.json` T1.2；口径 = `docs/skills/interaction-state-audit-prompt.md`（七类 A–G + V1–V7）+ `docs/skills/complex-component-display-operability-audit-prompt.md`（复杂控件可操作性）
> Related: `docs/plans/647-...md`（FM-1a 先例：串行分域 + 真实 DOM 事件触发 + IS 坐标去重）；`docs/audits/interaction-state/`（IS-1 flow-designer / IS-2 gantt / IS-3 calendar / IS-4 designers / IS-5 data-viz 均已 audited——本批 = 增量剖面 + gantt 拖拽既有红收口）

## Purpose

对设计器/调度/移动/AI/3D 域做真实驱动交互过程态走查增量批：IS-1–IS-5 已 audited 的域走**增量剖面**（R2/FM-0 之后新增或未覆盖的交互面），**gantt bar drag resize 既有红 5/5 在本批收口或归因**（roadmap 点名）。发现三态归族；P0/P1 当批修。

## Current Baseline（2026-10-18 live 核对）

- **IS 台账覆盖（去重宇宙）**：IS-1（flow-designer，plan 544）、IS-2（gantt/gantt-states，plan 545）、IS-3（calendar，plan 546）、IS-4（九设计器，plan 547，22 findings + watch 5）、IS-5（data-viz/tables，plan 548）、**IS-6（plan 549——kanban/barcode-input/ai-conversations/mobile 族等 dynamic 页已 audited；ai-conversations 已有 IS-ai-conversations-001 P1 fixed 在案）**——本批增量 = 这些域内 R2-收官（09-24）后变更面 + 各域 walk 未覆盖序列。
- **gantt 既有红（draft review R1 精确化）**：`gantt-bars-and-links.spec.ts` 单测 `bar drag resize-right changes width` 确定性红（--retries=0 复跑仍红；"5/5"系 10-17 日志 attempts 口径）；同 spec `link-delete flicker` 为 flaky 邻居（重试绿）；serial 模式失败掩蔽后续 8 测。gantt/kanban perf 阈值项已 623 `@watch-only` 隔离。
- **已有 FM 批绿证据**：FM-5（plan 646）edge-router defensive 3 测 + bisheng-build 修复后渲染正常（P0 边路由崩溃已修——flow-designer 域相关面已有一手证据）。
- **scada-editor-perf ×3 未裁决**（628 Phase 1 认领）——不属本批。

## Goals

- 设计器族（flow/report/word/page/taskflow/scada/dashboard）+ 调度族（gantt/calendar/kanban/barcode-input）+ AI 会话 + 3D 域：每域 ≥2 页真实驱动走查增量剖面（重点 = 09-24 后变更面 + 拖拽/缩放/连线/面板类序列），V1–V7 取证。
- **gantt bar drag resize 既有红收口或归因**：复现 → 定位（DV 50Hz 阈值 vs 真缺陷）→ 修复或 watch-only 裁决（引用 plan 623 机制），roadmap FM-1b 收口记录。
- 发现三态归族台账 FM-1b 批；P0/P1 当批修。

## Non-Goals

- IS 已 audited 序列的重复走查（增量剖面为主）；scada perf 阈值裁决（628）；静态视觉（FM-5）；FM-2 已立案件。

## Scope

### In Scope

- 走查域页（≥10 序列组）：gantt（bar drag resize 收口优先）、scheduling-calendar、kanban、flow-designer、report-designer、word-editor、page-designer、taskflow-designer、scada-editor-demo、ai-conversations（含 ai-hitl HITL 序列）、three-canvas-demo（3D 交互轮）；dashboard-host 随 scada-editor 组（路由核验执行期记录）。**移动族与 spreadsheet 显式裁决归 FM-1b-b 字母批**（roadmap Rule 3 预授权；mobile-infrastructure/mobile-components/m2-touch IS-6 已 audited + spreadsheet 无独立域页——拆分记录落台账，Phase 2 回写 roadmap 行内就地注记部分收敛口径）。
- P0/P1 当批修 + 台账/报告/回写。

### Out Of Scope

- IS 全量重跑；scada perf 裁决（628）；FM-6/FM-7 消化（本批发现归族后由其承接）。

## Failure Paths

| 编号            | 触发                                   | 行为                                       | 可重试 | 用户可见表现 |
| --------------- | -------------------------------------- | ------------------------------------------ | ------ | ------------ |
| flaky-env       | 交互探针环境 flake                     | 环境观察不入 findings                      | 是     | 无           |
| external-red    | console 外部诊断（FM-005 型）          | 分桶注记归属                               | 是     | 无           |
| defect-p0p1     | 证实 P0/P1                             | 当批修（判别测试先红后绿）；触保护区仅立案 | 是     | 视缺陷       |
| is-dup          | 撞 IS 已登记项                         | 注记坐标，不重复立案                       | —      | 无           |
| ruling-conflict | 撞既有裁决（623 watch-only/FM-2 立案） | 不当批修；Deferred + 就地注记              | —      | 无           |

## Test Strategy

档位选择（三选一）：`建议有测`

本档选择：**建议有测**——P0/P1 修复携带判别测试（gantt drag 收口若为修复则 e2e/单测先红后绿；若裁决 watch-only 则引用 623 机制注记）。

## 口径执行模型声明

- **执行载体**：browser-use 串行分域（调度族 → 设计器族 → AI/3D）；真实 DOM 事件触发 + §5 读数模板（FM-1a 先例：IAB 受信指针不可达已披露）。
- **bounded 单轮**：≥10 页/域组 × 3–6 序列；增量剖面优先；超上界 → roadmap Rule 3 字母后缀滚动（FM-1b-b）。
- **零交互面/回补**：如实记录 n/a；lab 页回补。
- **gantt 收口边界**：bar drag resize 红的裁决三选一——真缺陷修复 / DV 阈值环境性（引 623 `@watch-only` 机制归 watch-pool）/ 上游依赖（归因披露）。区分读数（closure R1 m4 预应）：pointer 事件链是否命中 resize handle vs 断言是否依赖帧间隔——live 特征已偏真缺陷（同文件 drag-move 通过、resize width 零变化），裁决必须带 handle 命中与宽度追踪读数。

## Execution Plan

### Phase 1 - 走查执行（含 gantt 收口）

Status: done（2026-10-18；fresh session 走查员后台长任务 98min/223 tool-uses 执行，主会话整合 + 独立复验）
Targets: `docs/audits/final-maturity-audit/fm1b-interaction-walkthrough-report.md`

- Item Types: `Proof | Fix`

- [x] Proof：增量剖面清单程序化裁定（route 全集 = `route-model.ts` + `domain-route-entries.ts` DOMAIN_RENDERER_ROUTES；`git log --since=2026-09-24` 包变更面 × IS-1..IS-8 台账 178 finding ID 去重——清单 `_tmp/fm1b-walk/00-inventory.md` 落报告开篇可对账）。串行分域走查：11 域页 + 1 路由核验 × 35+ 序列（clean 5 / limited-clean 4 / finding 2 页）；IS 坐标去重（在案注记 6 项，见报告）。
- [x] Proof + Fix：gantt bar drag resize 既有红 → 裁决①真缺陷修复（trusted 探针逐环根因链：悬停删除 X 覆盖 resize 区 6×20px 吞掉按压 + press-release 误删连线 9→8；DV 阈值/上游排除）；事件层修复判别红→绿（`:131` 400 恒定 → 400→440；新增 `:160` 回归钉；全文件 17/17 --retries=0 主会话独立复验 + 邻域 17/17 + RTL 1/1）。裁决全文 `_tmp/fm1b-gantt-adjudication.md`。
- [x] Fix：其余 P0/P1 = 零（P0×0；P1 仅 gantt 一条已修；P2×2 入账 FM-039/040 归 FM-6）。

Exit Criteria:

- [x] 域页全走完有读数；gantt 既有红有裁决与证据；P0/P1 修复判别绿。（dashboard-host 路由不存在程序化核验注记；dashboard-demo/mobile/spreadsheet/xlang-debug/three-gallery/scada-gallery 去向见 Deferred 节）

### Phase 2 - 归族收口

Status: done（2026-10-18）
Targets: 报告、ledger、roadmap、mission

- [x] 台账 FM-1b 批登记（FM-038 fixed→verified / FM-039、FM-040 local→FM-6 / FM-041 watch-only ×3）；IS ledger 注记（12 页行覆盖注记 + IS-flow-designer-008 / IS-taskflow-designer-008 新坐标 found）。
- [x] 回写：roadmap FM-1b `done`（行内注记部分收敛口径）、mission T1.2 `done`（M1 翻 `done`）、daily log（随收口提交落盘）。

Exit Criteria:

- [x] 台账 uncovered=0；多面回写一致。

## Draft Review Record

- Reviewer / Agent: agent_e157b672（fresh session 独立子 agent，单轮）
- Verdict: `revised`（R1 0B/4M/5m → 全量修订后升 active）
- Rounds: 1
- Findings addressed: R1-M1 roadmap 点名的移动/spreadsheet 域被静默排除 → 显式裁决归 FM-1b-b 字母批（Rule 3 预授权，拆分记录落台账 + 回写注记部分收敛）；R1-M2 增量剖面缺程序化裁定 → 引用 646 机制（route-set diff + git 映射 + 载体映射）入 Phase 1 Proof；R1-M3 edge-router defensive 归属 FM-2 失实（实为 FM-5/plan 646）→ Baseline 正名；R1-M4 IS-6 遗漏 + IS-4 计数 → 去重宇宙补 IS-6 + 九设计器勘误；m1 红清单精确化（单测名/attempts 口径/flaky 邻居/serial 掩蔽）；m2 上界滚动条款；m3 dashboard/calendar 正名；m4 gantt 区分读数预应；m5 路由前缀列示。

## Closure Gates

- [x] 域页真实驱动走查完成（每域读数在案——`_tmp/fm1b-walk/` 11 页 + 路由核验；报告含 verdict 表）
- [x] gantt bar drag resize 既有红收口或归因（证据在案——裁决①真缺陷修复，`_tmp/fm1b-gantt-adjudication.md` + 主会话独立复验 17/17）
- [x] P0/P1 修复判别绿（或 protected-area 立案披露）——P1×1（FM-038）判别红→绿 + 回归钉 + 邻域 17/17 + RTL 1/1；P0×0
- [x] 台账 FM-1b 批 uncovered=0（FM-038 fixed→verified / FM-039、040 local→FM-6 / FM-041 watch-only）
- [x] 受影响 owner docs 已同步或明确 No owner-doc update required——No owner-doc update required（`docs/components/gantt/design.md` 未记载 X 按钮与条缘交互粒度，行为修正不改变已记载契约；细节由裁决报告承载）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（Deferred 节逐项披露 FM-1b-b 去向 + xlang 移交并发线）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（见 Closure 节）
- [x] `pnpm typecheck`（唯一 playground vite.config 既有红，归属在案）
- [x] `pnpm build`（唯同红）
- [x] `pnpm lint`（44/44）
- [x] `pnpm test`（82/82 tasks exit 0；scheduling 包 1085/1085 含新 RTL）
- [x] `pnpm check`（exit 1 唯一 knip `tests/e2e/xlang-debug-mock-server.mjs`，并发 xlang 提交 176032924.. 归属在案）

## Deferred But Adjudicated

- **FM-1b-b 字母批（Rule 3 预授权，非静默降级）**：mobile 族 + spreadsheet（roadmap R1-M1 原裁决维持）；dashboard-demo（`#/dashboard-host` 路由不存在——程序化核验，实际 id = dashboard-demo，IS-5 已审 001..005 而 16 commits 增量未走）；three-gallery / scada-gallery（IS-6 pending，非本批指派页）候补；report-designer / word-editor / page-designer 深序列（选中上下文/DnD 插入合成不可达）补面。
- **xlang-debug（IS-6 pending）**：并发会话领地（同 FM-023/FM-032 口径），移交并发线，非本批回避欠账。
- **gantt react-compiler 工具链披露（watch-note）**：GanttLinks render 形态变更下 foreignObject onClick 派发静默失效（9 变体二分实证）——非本批可修（工具链边界），已入报告 watch-note + FM-038 证据链；重构该组件前须复验。

## Closure

Status Note: completed（2026-10-18 独立收口审计 `approved` 后置位；0 Blocking / 0 Major / 5 minor，全部随本收口提交处置）

Closure Audit Evidence:

- Auditor / Agent: agent_f5b27cdf（fresh session 独立收口审计员，只读，28 tool-uses）
- Evidence: Verdict `approved`（0B/0M/5m）。A 走查真实性抽 4 份证据文件读数具体、异常如实、无编造特征；B gantt 收口——审计员独立实测复跑 `gantt-bars-and-links.spec.ts --retries=0 --workers=1` **17 passed (53.4s)**，事件层修复正确性（转发条件/click 抑制/cleanup/render 同形/正常删除路径零回归）逐项判对，新回归钉判别性（旧实现必红）核实；C 台账/回写一一对应无越改；D 边界零越界（form.tsx/xlang/pages.json 归并发线）；E 门禁数字与勾选逐项一致（并附注：82/82 跑在含并发改动的超树上仍全绿，full-green 成立更强而非更弱）；F react-compiler 披露证据链存在且自洽。minor 处置：m1 精确 staging（收口提交仅 8+1 路径，禁 add -A）；m2 roadmap 补 FM-1b-b `todo` 行 + mission T1.2 部分收敛注记；m3 翻转以本 approved 为生效前提随提交落盘；m4 探针计数更正（9 spec，误列 identify-del 已正名）；m5 多实例重复转发观察落报告附注（非阻塞）。

Follow-up:

- FM-1b-b 字母批（roadmap `todo` 行已立）：mobile 族 + spreadsheet + dashboard-demo + three-gallery/scada-gallery 候选；report/word/page 三设计器深序列补面。
- m5 观察项：GanttLinks 多实例容器包含性判定（后续重构随批）。

## Non-Blocking Follow-ups

- 未走查域页归后续字母批；IS 既有项维持原状。
