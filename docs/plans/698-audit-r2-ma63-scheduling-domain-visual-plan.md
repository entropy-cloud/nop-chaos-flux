# 698 审计修复 R2·MA6.3：UX 视觉审计—scheduling+domain 页面视觉走查（light+dark）

> Plan Status: completed
> Last Reviewed: 2026-10-23
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA6.3；`docs/audits/arm2-scope-and-dimension-matrix.md` MA6.3 行（报告名注册 `*arm2-MA6.3-scheduling-domain-visual.md`）；方法论 `docs/skills/visual-page-quality-inspection-prompt.md`；截图矩阵机制复用 `docs/audits/visual-quality-r2/`（重新取证）；owner doc `docs/architecture/theme-compatibility.md`
> Related: matrix MA6 节、`docs/audits/arm2-index.md`、MA6.1/6.2 方法与工具先例（plan 696/697：capture T-1/T-2/T-C2 已立案未修——dark/default 疑点须 fresh-load 探针复证；T-1 三轮复发在案）、MA5.2/MA5.5 交互走查先例（页面域重叠、镜头不同）
> 方法先例沿用：`_tmp/arm2-ma63/` 中间件（收口清理；截图永不入库）；零**入库**代码变更（P0 即时通道除外）；P1 注册前执行者 live 复核；显式路径提交

## Purpose

对 scheduling（gantt/kanban/calendar/barcode 族）+ domain（scada 系/three 系/graph/map）19 条 playground 页面做 light+dark 双主题视觉走查：`pnpm visual:capture` 截图矩阵 + 迭代式多模态评审 + 程序化取证，产出 arm2 报告并登记 arm2-index；零入库代码变更。

## Current Baseline（2026-10-23 live，HEAD `9cb18461a`）

- **走查面**（19 页，inventory 实存核验）：
  - **Round A · scheduling（10）**：gantt、gantt-states、gantt-perf-scale、kanban、kanban-perf-scale、scheduling-calendar、calendar-perf-scale、barcode-input、scada-editor-demo、scada-perf-scale
  - **Round B · domain canvas（9）**：scada-demo、scada-gallery、scada-pressure-demo、scada-edge-cases、three-canvas-demo、three-gallery、three-industrial-demo、graph-demo、map-demo
- **余量声明**：lab-barcode-input/lab-calendar/lab-gantt/lab-kanban/lab-mapping 5 条 carrier 不在本轮（控件级由 R2-2 控件卡 + watch-pool 承载）；w3c-value-mapping 已在 MA6.1 Round B 完成视觉走查（不重开）。
- **既有机制**：`pnpm visual:capture`（复用 4175 live server；suspects 检测）；**capture 工具缺陷 T-1/T-2/T-C2 已立案未修（MA6.1）**——T-1 在 MA6.2 三轮复发；本轮全部 default/dark 疑点须 fresh-load 探针复证。
- **WebGL 注记**：three 系需 WebGL——headless 走查先例 = MA5.5（readPixels/fps 60 实证）；SwiftShader 环境在案 = plan 473 :91；dark 下 three/scada canvas 色彩适配是本轮重点。
- **执行状态**：roadmap MA6.3 `todo`；arm2-index MA6.3 行 `—`。
- **环境**：dev server 4175 共享在跑。

## Goals

- 产出 `docs/audits/2026-10-23-HHmm-arm2-MA6.3-scheduling-domain-visual.md`（矩阵注册名 scheduling-domain-visual）：finding P0–P3（P1 ID `P1-MA6.3-<nnn>`）+ A–H 维度归类 + light/dark 平价核对 + 归属归族。
- 覆盖面（两轮 + 执行者对账；字母批拆分预授权见 Failure Paths）：
  - ① **Round A · scheduling 10 页**：capture light+dark → 迭代式评审 → A3/B1 批扫双态 → 甘特/看板/日历 dark 画布适配重点 + 响应式抽查 3 页
  - ② **Round B · domain canvas 9 页**：同口径；three/scada/graph/map canvas dark 色彩适配（swiftshader WebGL）+ 响应式抽查 3 页
  - ③ **执行者对账**：suspects 核销；去重归族（MA6.1/6.2 既有族行面增量引用）；P1 live 复核；T 族假阳性复核
- 登记 arm2-index（MA6.3 行 + P1 行 + P0 行〔触发时〕）；BUILD_VERIFY = 全量 `pnpm test`（Closure Gates 预声明）。

## Non-Goals

- 不修改入库代码（P0 除外）；截图永不入库；perf 阈值归 MA7.1（perf-scale 页仅视觉取证 `[PERF]` 记录）；MA6.1/6.2 已走查页面不重开（w3c-value-mapping 明确排除）；MA6.4 designer chrome 不重开（scada-editor-demo 走预览/画布面，编辑器 chrome 例外记 MA6.4 协同）；lab carrier 5 条归 R2-2 台账。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA6.3 报告 + arm2-index 登记回填；`_tmp/arm2-ma63/` + `_tmp/visual-inspection-<date>/` 探针与截图实跑；daily log 追加；roadmap MA6.3 行流转；本 plan 流转；收口提交。

### Out Of Scope

- 任何入库代码/测试/配置变更（P0 除外）；MA6.4 / MA7+ / MR / MV / MG；并发线未提交变更；截图/证据卡入库。

## Failure Paths

| 可测场景编号    | 触发                  | 行为                                                                                               | 可重试 |
| --------------- | --------------------- | -------------------------------------------------------------------------------------------------- | ------ |
| e2e-env-failure | dev server/WebGL 失效 | 归因修复后重跑（headless three 系走查先例 MA5.5 readPixels/fps 60；SwiftShader 在案 plan 473 :91） | 是     |
| probe-flaky     | 截图评审结论漂移      | 双评（冲突 → 强制第三评）；仍不稳 → watch-only                                                     | 是     |
| audit-p0-found  | Rule 2 六类之一       | 即时通道                                                                                           | 否     |
| subagent-quota  | 限流/模型失败         | fresh 重启一次；再败执行者亲跑                                                                     | 是     |
| round-overflow  | 单轮超上限            | **字母批拆分（MA6.3-a/-b，Cross-Cutting 5 预授权）或移交 Phase 2 台账留痕**                        | 否     |

（"用户可见表现"列不适用——本表各行为流程性失败路径，非产品行为场景。）

## Test Strategy

本档选择：**不适用**——纯审计取证（零入库变更）；`pnpm test` 为 Proof。触发 P0 自动升档。

## Execution Plan

### Phase 1 - multi：两域视觉走查

Status: completed
Targets: `_tmp/arm2-ma63/round-{A,B}.md`、`_tmp/visual-inspection-<date>/`

- Item Types: `Proof | Decision`

- [x] **Round A · scheduling 10 页**（子代理）：capture 22+fresh 20+响应式 20 张；P2 ×2 新案（calendar 星期头几何 / gantt 日期列）+ 族面增量 + 记录级 3 + [PERF] 4 页通过
- [x] **Round B · domain canvas 9 页**（子代理三连 API 失败 → **执行者亲跑**〔偏差落账〕）：capture 24+12 张 + 16 张评审 + canvas 像素采样双态；族面 +2（graph/map 页头）+ P3 ×2 + watch ×2；canvas dark 完好性 9/9
- [x] **执行者对账**：suspects 全 0；族归并（页壳族升格 P2-003 + breadth 修正 12→实见清单；语义色 +8/目标尺寸 +5/窄视口 +1 面增量）；canvas 完好性终验（R2）；T-1 第 4 轮归档

Exit Criteria:

- [x] 两轮台账 + A–H 维度归类 + light/dark 平价表落字（§4 总表 9/19 零违规——closure R1 修正稿）
- [x] 分类/分级/归属/归族 + P1 复核实录（P1 零立案——canvas 全完好）；suspects 全核销

### Phase 2 - open：live 信号驱动开放式追问

Status: completed

- Item Types: `Proof | Decision`

- [x] ≥2 轮追问（R1 breadth 裁决 12 grep 投影→实见清单；R2 canvas 完好性终验——像素采样+截图对照），末轮显式停止
- [x] MR3 / MG / MA7.1/7.3 交叉线索分栏（MR3 +P2-001/002/003；MA6.4 +scada-editor 溢出共管；MA7.1 +[PERF] 4 页；MA7.3 +族面增量；记录级 5 归文案/日志治理批）

Exit Criteria:

- [x] open ≥2 轮显式停止；P2/P3 入报告 deferred 附理由（P2 留报告不入索引——沿既往纪律，执行中修正过一次索引误插）

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed

- Item Types: `Proof | Decision`

- [x] 报告落盘（`docs/audits/2026-10-23-0535-arm2-MA6.3-scheduling-domain-visual.md`：两轮 + T-1 第 4 轮 + breadth 裁决 + P2 ×3 + 族面增量 + watch-only 11（含 Round A 台账结转 5）+ open 两轮 + 收口补记）
- [x] arm2-index：MA6.3 行 + Last Updated 滚动（P1 零立案、累计 63 不变；P2 ×3 留报告 deferred——索引仅 P0/P1 行纪律核验 0 命中），grep 复核
- [x] daily log 追加（头部插入；计数 = 报告实数）
- [x] BUILD_VERIFY `pnpm test` 登记（exit 0，82/82）+ typecheck/build/lint（44/44 ×3，exit 0；同一运行登记复用于 Closure Gates）
- [x] 清理 `_tmp/arm2-ma63/` 与 `_tmp/visual-inspection-2026-10-23/`（closure audit R2 通过后执行；4175 共享 server 保留）

Exit Criteria:

- [x] 报告与 arm2-index 逐条一致（grep：MA6.3 行路径实存；P2 留报告 deferred——索引 0 P2 行纪律核验）
- [x] BUILD_VERIFY exit 0 登记；截图零入库核验（`git status` 无 png；`git diff HEAD --name-only -- apps/ tests/` = 0）

### Phase 4 - 收口与状态流转

Status: completed

- Item Types: `Proof`

- [x] draft review 通过后：roadmap MA6.3 `todo`→`planned`，plan→`active`
- [x] closure audit（fresh subagent `agent_13f15eb7`）R1 `issues`（0B/1M/3m——M1 执行者误读 Round A 台账致 dark 平价 15/19 应为 9/19、页头族面 8 面误并为 2；m1 watch 台账丢 5 / m2 记录级丢 F9-5 / m3 措辞）→ 回修 → R2 复核 M1 core/m1/m2/m3 全 FIXED、余 2 处报告内残留 → 回修 → **grep 证明清零**（`8/10 零违规|族 4 面` 0 命中，审计员预声明充分标准）→ **approved** 后：roadmap MA6.3 `planned`→`done`（行号 surgery + sed 回读核验），plan→`completed`
- [x] 提交前零残留 grep + prettier + `_tmp` 已清 + 入库面 diff 仅 In Scope 文档
- [x] 单次提交（显式路径；并发线不入 stage；临时 index）

Exit Criteria:

- [x] roadmap 与 plan 状态流转一致（sed 回读核验）
- [x] 提交仅含 In Scope 文件

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_37b118d4`（19 页 id 全实存 10+9 零重复、lab 5 carrier batch=R2-2-carrier 排除核实、w3c 排除先例核对、scada-editor-demo MA6.4 边界、roadmap :80 / 矩阵 :124 / arm2-index :90、HEAD `9cb18461a`、MA6.2 T 族先例、capture 机制、guide 合规全绿、Rule 引用逐一核实）
- Verdict: R1 `approved`（0B/0M/3m）
- Rounds: 1
- Findings addressed: m1 swiftshader 引证拆分（headless 先例 MA5.5 / SwiftShader 在案 plan 473 :91）；m2 Last Reviewed 落日期；m3 Round A 标题含 scada-editor-demo 的域归属注记（边界文本已明确，不改）——m1/m2 已落字

## Closure Gates

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足
- [x] arm2-index 登记与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 不存在被静默降级的 in-scope 项（watch-only 附理由入台账）
- [x] 截图与探针已全部删除（`_tmp/arm2-ma63/` + `_tmp/visual-inspection-<date>/` 清理；`git status` 无 png 入库）
- [x] roadmap Work Item Status MA6.3 行已流转 `done`（closure audit 通过后，sed 回读核验）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（44/44） / `pnpm build`（44/44） / `pnpm lint`（44/44） / `pnpm test`（82/82）登记（exit 0 ×4）

## Deferred But Adjudicated

（无——执行中改判当场落本节。）

## Non-Blocking Follow-ups

- （待执行中落账）

## Closure

Status Note: 19 页 scheduling+domain 视觉走查收官（P1 零立案——canvas dark 完好性 9/9 canvas 页 + A 轮 canvas 面全通过；P2 ×3 新案〔calendar 星期头几何错位 / gantt 日期列 26/26 截断 / 页头壳 bg-white 族升格（11 faces，10 页实见）〕+ P3 ×4 + 族面增量 +8/+5/+1 + 记录级 5 + watch-only 11 + T-1 第 4 轮复发归档）；字母批裁定：未拆分——两轮全覆面（A 10 + B 9 = 19）；Round B 执行者亲跑偏差如实落账；dark 平价 9/19（closure R1 修正稿）；零入库代码变更核验通过。可关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor `agent_13f15eb7`（R1 → R2）
- Evidence: R1 **`issues`**（0B/1M/3m——M1 执行者对账时误读 Round A 台账：8 页页头壳面误并为 2、dark 平价 15/19 应为 9/19；审计员以 deep-dive-report2.json `barBg:rgb(255,255,255)` + 4 页 dark PNG 抽验纠正；m1 watch 台账丢 Round A 5 项 / m2 记录级丢 F9-5 / m3 canvas 计数措辞）→ 全部回修 → R2 复核 M1 core/m1/m2/m3 全 FIXED、余报告内 2 处残留 → 回修 → **grep 证明清零**（`8/10 零违规|族 4 面` 0 命中，审计员预声明充分标准）→ **approved**。审计员独立复核：P2-001 探针精确（周四 band 603-773/周五 773-942、today ring x=899 落周五带）、P2-002 26/26 计数（innerW 44 vs 63）、P2-003 源码引注（barcode-demo.tsx:62、gantt-demo.tsx:194）+ graph/map dark PNG 白条实见 + scada/three 页头适配对照；T-1 gantt 双 PNG MD5 同（441d4a31）+ fresh 重取在案；Round B 降级执行者亲跑判 COMPLIIES（三处落账 + 证据可查）；63 open 逐行清点；guide 合规。

Follow-up:

- no remaining plan-owned work；P2-MA6.3-001/002/003 修复行在 MR3 队列（页头壳族族级单点替换可全清 10 面）；MA6.4 +scada-editor 溢出共管；MA7.1 +[PERF] 4 页记录；MA7.3 +语义色/目标尺寸族面增量；visual-quality 工具修复批 T-1 优先级提升（4 轮连续复发）。

Follow-up:
