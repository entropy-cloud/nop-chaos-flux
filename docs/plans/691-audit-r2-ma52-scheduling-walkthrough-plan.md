# 691 审计修复 R2·MA5.2：功能交互审计—scheduling 实操走查（gantt/kanban/calendar/barcode）

> Plan Status: completed
> Last Reviewed: 2026-10-22
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA5.2；`missions/audit-remediation-r2.json`；方法论 `docs/skills/complex-component-display-operability-audit-prompt.md` + `docs/skills/interaction-state-audit-prompt.md`（A–G × V1–V7 × 每页五步 × §6 必测序列）；owner doc `docs/architecture/renderer-runtime.md`（roadmap Owner Doc 列）
> Related: matrix MA5 节（报告名模式 `*arm2-MA5.2-scheduling-walkthrough.md`）、`docs/audits/arm2-index.md`、MA4.3 报告（**待消费线索，非预载**：P1-MA4.3-007 gantt undo push 接线零执行、P1-MA4.3-009 kanban Ctrl+Z 链 + 空壳 e2e、P1-MA4.3-006 kanban WIP 旁路、P1-MA4.3-008 calendar 换位提交零贯通）、MA4.5 报告（Round B B-01/B-02 复核；perf 数值基线：gantt/kanban idle 60fps）、MA5.1 方法与机制先例（plan 690）
> 方法先例沿用：`_tmp/arm2-ma52/` 中间件（收口清理）；零**入库**代码变更（P0 即时通道除外）；P1 注册前执行者 live 复核；显式路径提交，并发线文件不入 stage

## Purpose

对 scheduling 四组件（gantt / kanban / calendar / barcode-input）做 browser-use 实操走查：真实操作 + 程序化读数定罪（V1–V7），叠加六态核对与 F/G 专项，产出 arm2 报告并登记 arm2-index；零入库代码变更。

## Current Baseline（2026-10-22 live，HEAD `41b73e20a`）

- **走查面**（`apps/playground/src/domain-route-entries.ts`）：`gantt`（:19）、`gantt-states`（:25）、`kanban`（:32）、`scheduling-calendar`（:38）、`barcode-input`（:44）五路由；页面源 `apps/playground/src/pages/{gantt-demo,gantt-states-demo,kanban-demo,calendar-demo,barcode-demo}.tsx`。
- **既有 e2e（对照，不预载）**：gantt 子串 13 spec、kanban 4 spec（`ls tests/e2e | grep -cE`）。MA4.3 已立案的 scheduling P1 ×4（007/008/009/006）与本轮 MA4.5 Round B 复核为**待消费线索**——本轮独立取证，发现成立时引用既有 ID 并补 live 证据，不重复开案。
- **scheduling 面键盘/undo 独立接线（draft review M1 勘正——与 designer 面无拓扑关联）**：`use-designer-shortcuts` 唯一消费方为 `designer-page-body.tsx:353`（flow/taskflow 宿主），scheduling 页零命中。gantt 自有键盘链 `use-gantt-keyboard.ts` + `use-gantt-drag.ts:120/129/139` undoStack 接线；kanban 自有 window keydown Ctrl+Z（`use-kanban-board-effects.ts:60-69` + `kanban-board.tsx:79/403` handleUndo）——本轮 undo 复核为 **P1-MA4.3-007/009 的独立 live 取证**，与 P0-002 修复无关（isInsideDesigner 类焦点门控仅作对照观察记录）。
- **执行状态**：roadmap MA5.2 `todo`；arm2-index MA5.2 行 `—`；MA5.1 `done`；P0-MA5.1-001..004 全部 `closed`。

## Goals

- 产出 `docs/audits/2026-10-22-HHmm-arm2-MA5.2-scheduling-walkthrough.md`：双风格（multi 轮次 + open ≥2），每 finding A–G 分类 + V1–V7 定罪 + P0–P3 分级（P1 ID `P1-MA5.2-<nnn>`）+ 归属 + 归族。
- 覆盖面（IS 台账）：
  - ① **gantt**（含 gantt-states）：拖拽改期/连线创建与删除/缩放级别切换/滚动同步（grid↔timeline V1）/跨天任务与里程碑渲染（§1.4）/依赖线四类型路由/键盘导航（§4.9）/undo（**P1-MA4.3-007 push 接线的独立 live 取证** + 焦点门控对照观察）/六态
  - ② **kanban**（含 `kanban-perf-scale` 路由 20 列 × 300 卡大规模面与卡片过滤视图——职能视图 Milestone 关键词的具体落点）：卡片拖拽（跨列/WIP 门 V4）/Ctrl+Z 消费链（**P1-MA4.3-009 的独立 live 取证**；kanban-demo 空壳 e2e 现状）/列折叠/卡片详情/六态/toast 卫生（V7）
  - ③ **scheduling-calendar**：班次拖拽换位（确认对话框三路径；P1-MA4.3-008 的 executeSwap 贯通现状）/月周视图切换（§4.10）/跨天事件定位（§1.1 手算）/今天标记/六态
  - ④ **barcode-input**：扫描输入（合成按键）/去重对象身份/锁通道/disabled 通道（unit 已有强守护——走查核对 live 行为与 demo 接线）/错误反馈（§2.7）
  - ⑤ **F 类**：scheduling 面共享壳/共享令牌对账；**G 类**：各页 toast 全量映射 + `env.notify`/`console.(log|debug)` 静态扫描
- 登记 arm2-index（MA5.2 行 + P1 行）；BUILD_VERIFY = 全量 `pnpm test`（Closure Gates 预声明）。

## Non-Goals

- 不修改入库代码（P0 即时通道除外）；性能阈值裁决归 MA7.1（本轮仅记录 `[PERF]` 行不做归因）；不预载 MA4.3 finding 定级；不做视觉风格评审（MA6.3）。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA5.2 报告 + arm2-index 登记回填。
- 只读取证 + `_tmp/arm2-ma52/` 探针实跑。
- `docs/logs/2026/10-22.md` 追加条目；roadmap MA5.2 行流转；本 plan 流转；收口提交。

### Out Of Scope

- 任何入库代码/测试/配置变更（P0 除外）；MA5.3+ / MR / MV / MG；并发线未提交变更。

## Failure Paths

| 可测场景编号    | 触发                 | 行为                                                                  | 可重试 |
| --------------- | -------------------- | --------------------------------------------------------------------- | ------ |
| e2e-env-failure | dev server/端口问题  | 归因、修复环境后重跑                                                  | 是     |
| probe-flaky     | 读数单次漂移         | 重跑 ≥2 取稳态；仍不稳 → watch-only                                   | 是     |
| audit-p0-found  | Rule 2 六类之一      | 即时通道：就地修复或注入 fix plan                                     | 否     |
| subagent-quota  | 子代理限流/模型失败  | fresh 重启一次；再失败执行者亲跑精简序列                              | 是     |
| round-overflow  | 单轮走查量超收口上限 | Cross-Cutting 5 字母批拆分（MA5.2-a/-b）或显式移交 Phase 2 并台账留痕 | 否     |

## Test Strategy

本档选择：**不适用**——纯审计取证 plan（零入库变更）；`pnpm test` 为 Proof 交付物。触发 P0 自动升档。

## Execution Plan

### Phase 1 - multi：四组件实操走查

Status: completed
Targets: `_tmp/arm2-ma52/round-{A,B}.md`、`_tmp/arm2-ma52/probes/`

- Item Types: `Proof | Decision`

- [x] **Round A · gantt + calendar**（子代理，6 探针 19 用例全绿）：**P1-MA4.3-007 live 否定**（拖/连线/删 undo 全链回退读数）、**P1-MA4.3-008 确认已修**（三路径）；§1.1 手算全对；新案 IS-gantt-02（P2）/IS-gantt-01（P3）
- [x] **Round B · kanban + barcode-input**（子代理，7 探针全 pass）：新案 IS-kanban-01（P1，执行者源码定罪 `kanban-column.tsx` 注册覆盖）/IS-kanban-02（P1，P1-MA4.3-009 独立 live 证据）/IS-barcode-input-01（P2）/IS-kanban-03/04（P3）；P1-MA4.3-006 影响面注记
- [x] **执行者对账**：静态 G 零命中；交叉去重（B-01 命中引用；B-02 随 007 否定收敛）；P1-MA5.2-001/002 逐条复核（源码定罪/独立取证）

Exit Criteria:

- [x] 两轮台账 + 六态表 + toast 映射落字
- [x] 全部 finding 分类/分级/归属/归族；既有 ID 命中与新增 P1 复核实录

### Phase 2 - open：live 信号驱动开放式追问

Status: completed

- Item Types: `Proof | Decision`

- [x] ≥2 轮追问（R1：MA4.3-007 静态证据与 live 相反的教训——测试接线≠生产接线；R2：kanban 注册覆盖为何漏检——既有 e2e 落点全在卡片中心 + registry warning 无消费），末轮显式停止
- [x] MR3 / MG / MA6.3 交叉线索分栏（拖拽落点多样性守卫、dnd registry warning 门禁、strict 语料 headerClassName）

Exit Criteria:

- [x] open ≥2 轮显式停止；P2/P3 入 deferred 附理由

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/2026-10-22-HHmm-arm2-MA5.2-scheduling-walkthrough.md`、arm2-index、`docs/logs/2026/10-22.md`

- Item Types: `Proof | Decision`

- [x] 报告按 MA5.1 同构格式落盘（深挖两轮 + 既有 ID 重裁四条 + P1 ×2 + deferred + open 两轮 + 收口补记）
- [x] arm2-index：MA5.2 行 + P1 ×2 行 + P1-MA4.3-007/008/009 行注记 + Last Updated 滚动（累计 54），grep 复核
- [x] daily log 追加（计数 = 报告实数）
- [x] BUILD_VERIFY `pnpm test` 登记（exit 0，82/82）+ typecheck/build/lint 44/44
- [x] 清理 `_tmp/arm2-ma52/`（closure audit 通过后、提交前执行：探针/台账/worksheet 删除 + 自启 dev server 已终止〔4175 清零〕；`git status --porcelain -- packages/` 为空）

Exit Criteria:

- [x] 报告与 arm2-index 逐条一致（grep 复核：P1-MA5.2-001/002 两侧命中；报告行实存）
- [x] BUILD_VERIFY exit 0 登记

### Phase 4 - 收口与状态流转

Status: completed
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA5.2 `todo`→`planned`，plan→`active`
- [x] closure audit（fresh subagent `agent_05da99fa`）通过后：roadmap `planned`→`done`，plan→`completed`
- [x] 提交前零残留 grep + prettier + `_tmp` 已清 + `git status` 无 packages/ 泄漏
- [x] 单次提交（显式路径；并发线不入 stage；临时 index——并发线 index 仍持旧快照）

Exit Criteria:

- [x] roadmap 与 plan 状态流转一致
- [x] 提交仅含 In Scope 文件

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_0f201486`（五项检查全量复算：5 路由行号/页面源/e2e 计数 13+4/HEAD 与 roadmap/arm2-index 状态/MA4.3 四 P1 与 MA4.5 B-01/B-02 实存/plan 690 先例/21d8e651e 触及面 grep）
- Verdict: R1 `revised`（1M/3m）→ 回修共识
- Rounds: 1
- Findings addressed: M1 P0-002 受益前提错误（`use-designer-shortcuts` 零 scheduling 消费方——scheduling 自有键盘链四处 file:line 锚点改写，undo 复核重构为 P1-MA4.3-007/009 独立取证）；m2 Phase 3 补 P0 行登记触发；m3 perf-scale 具体指涉落点；m4 round-overflow Failure Path——均已落字

## Closure Gates

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足
- [x] arm2-index 登记与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记（exit 0，82/82）
- [x] 不存在被静默降级的 in-scope 项（watch-only 14 条按 prompt §4 步 4 附理由入台账）
- [x] 探针与临时配置已全部删除（`_tmp/arm2-ma52/` 清理 + `git status` 无 packages/ 泄漏——packages/ 下唯一条目为并发线 staged 删除，非本 plan 产物）
- [x] roadmap Work Item Status MA5.2 行已流转 `done`（closure audit R3 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据（R1 issues → R2 issues → R3 approved，见 Closure 节）
- [x] `pnpm typecheck`（44/44） / `pnpm build`（44/44） / `pnpm lint`（44/44） / `pnpm test`（82/82）

## Deferred But Adjudicated

（无——执行中改判当场落本节。）

## Non-Blocking Follow-ups

- （待执行中落账）

## Closure

Status Note: 六路由四组件全走查收官（P1 ×2 新案 + 既有四 ID 全部 live 重裁〔007 否定/008 确认已修/009 确认/006 影响面注记〕+ P2×2 + P3×4 + watch-only 14 条全列）；零入库代码变更核验通过；BUILD_VERIFY 全绿；open 两轮方法论产出（测试接线≠生产接线、拖拽落点多样性）入 MG 候选。可关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor `agent_05da99fa`（R1/R2/R3；worksheet `_tmp/arm2-ma52/closure-audit-R1.md`，随 `_tmp` 清理，结论录此）
- Evidence: R1 `issues`（0B/2M/4m：M1 dev-server 终止声称不实〔当时仍在运行〕、M2 探针计数 26→33 漂移）→ 回修 → R2 `issues`（3 处一行修未落字）→ 补落 → R3 **`approved`**（0B/0M，三行 live 复读逐条 ✓）。审计员独立复跑：Round A 19/19、Round B 14 passed、empty-column no-op 复现、三处根因源码核实（kanban-column.tsx:136-140 / use-kanban-board-effects.ts:55-70 / barcode-input.tsx:113-118 + camera-utils.ts:24-32）、index 注记 annotation-only（diff -w）、54 行计数核验。

Follow-up:

- no remaining plan-owned work；P1-MA5.2-001/002 修复行在 MR 队列；MG 候选：拖拽落点多样性守卫、dnd registry warning 入 e2e 门禁清单、测试接线≠生产接线教训回写审计 skill。
