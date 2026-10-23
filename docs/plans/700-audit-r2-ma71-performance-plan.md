# 700 审计修复 R2·MA7.1：性能审计—可疑点扫描、重渲染热点、perf 阈值裁决

> Plan Status: completed
> Last Reviewed: 2026-10-23
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA7.1；`docs/audits/arm2-scope-and-dimension-matrix.md` MA7.1 行（报告名注册 `*arm2-MA7.1-performance.md`；三扫描器全量+人工复核；React Profiler/Performance API 取证；perf 阈值 e2e 逐条裁决）；方法论 `docs/skills/react19-best-practices-review.md`；owner doc `docs/architecture/renderer-runtime.md`
> Related: matrix MA7 节、`docs/audits/arm2-index.md`、**perf 阈值裁决在案线索**：plan 623 盘点（gantt-perf ×2 + kanban-perf ×1 已 `@watch-only` 裁决——50Hz rAF 上限）；**MA4.5 报告 :214/:28（scada-editor-perf ×3 推翻清单首位：live 定罪阈值全过、红因=console gate，处置归 P1-MA4.5-002 语料/门路径）= ×3 落账裁决首要输入**；MA5.2 W-B5（kanban 6000 卡未虚拟化候选）；[PERF] 记录链：MA5.5（scada 10k 277ms、three fps 60）+ MA5.6 Round C（[PERF]×3）+ MA6.3（4 perf 页视觉通过）+ MA4.5（100k build 435ms、25-test 归因全表）；MA6.2 Round C B1 扫描器方法先例
> 方法先例沿用：`_tmp/arm2-ma71/` 中间件（收口清理）；零**入库**代码变更（P0 即时通道除外；perf 阈值裁决的 `@watch-only` 标记调整属测试文件变更——若裁决结论要求打标/改阈值，走**显式清单小提交**并在此预声明）；P1 注册前执行者 live 复核；显式路径提交

## Purpose

全仓性能审计：三性能扫描器全量扫描+人工复核；渲染循环/大列表/重渲染热点运行时取证（React Profiler / Performance API）；perf 阈值 e2e 逐条裁决（含 plan 623 遗留的 scada-editor-perf ×3 首裁）；产出 arm2 报告并登记 arm2-index。

## Current Baseline（2026-10-23 live，HEAD `cba09b7d2`）

- **扫描器**：`check:audit-performance-suspects`、`check:audit-reactive-render-reads`、`check:audit-react19-optimization-candidates`（M0 基线在册——本批复跑对比，零新增为绿）。
- **perf e2e 台账**（8 spec/25 test）：gantt-perf（3，×2 `@watch-only`）、kanban-perf（3，×1 `@watch-only`）、calendar-perf（2）、diff-perf（1）、scada-perf（5）、scada-editor-perf（3——**失败在案；根因已由 MA4.5 live 定罪**：阈值全过〔per-call 7.9ms<100 / heap 65.3MB<320 / fps 61>30〕、红因=console gate 10 条诊断，台账处置待落）、three-canvas-perf（2）、performance-table（6）。
- **待消费线索**：MA5.2 W-B5（kanban-perf-scale 6000 卡虚拟化候选）；[PERF] 记录链（closure 前勘误稿）：MA5.5（scada 10k 277ms 挂载、three-canvas fps 60）+ **MA5.6 Round C（[PERF]×3：虚拟滚动耗时/coverage slow 等待/p4 SVG 重绘）** + MA6.3（4 perf 页视觉通过）+ **MA4.5（scada 100k build 435ms、25-test 归因全表、×3 live 数值）**；plan 623 裁决先例（50Hz rAF 环境 → 60Hz 阈值不可达 → `@watch-only` 标记机制）。
- **执行状态**：roadmap MA7.1 `todo`；arm2-index MA7.1 行 `—`。
- **环境**：dev server 4175 共享在跑；本机 rAF 上限 50Hz 在案（裁决的关键环境参数）。

## Goals

- 产出 `docs/audits/2026-10-23-HHmm-arm2-MA7.1-performance.md`（矩阵注册名 performance）：finding P0–P3（P1 ID `P1-MA7.1-<nnn>`）+ 扫描器复核结论 + 热点取证 + **perf 阈值逐条裁决表**（25 test 全覆盖：pass/watch 维持/需打标/回归定罪）。
- 覆盖面（两轮 + 执行者裁决；字母批拆分预授权）：
  - ① **Round A · 三扫描器全量+人工复核**（子代理）：复跑对比 M0 基线；新增命中逐条人工复核（真嫌疑 vs 误报）；与 MA3 代码质量线索交叉
  - ② **Round B · 运行时热点取证**（子代理）：perf-scale 面（gantt/kanban/scada/performance-table/calendar）React Profiler/Performance API 取证——挂载/交互/滚动帧率、重渲染热点组件、大列表虚拟化有效性（W-B5 复核）；MA5/6 [PERF] 记录复核
  - ③ **执行者 · perf 阈值 e2e 逐条裁决**：25 test 全量运行记录（以 MA4.5 :28 归因全表为起始映射：在案归因 + 当轮复测 + 结论）；scada-editor-perf ×3 **落账裁决**（以 MA4.5 当轮数值为输入，当轮复测验证仍成立后裁定台账处置：维持红 / 标记 / 归 P1-MA4.5-002 门路径）；watch-only ×3 再裁决（60Hz 环境结论或维持）；其余 pass 面确认；裁决产生的测试标记变更走显式清单小提交（预声明）
- 登记 arm2-index（MA7.1 行 + P1 行〔触发时〕）；BUILD_VERIFY = 全量 `pnpm test`。

## Non-Goals

- 不做性能优化实现（修复归 MR/后续批次）；不改业务代码（P0 除外）；`@watch-only` 标记/阈值调整仅限裁决结论直接要求的测试文件（显式清单）；MA3 已立案代码质量项不重开（交叉引用）；MA6.x [PERF] 数值不重测（引用复核）。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA7.1 报告 + arm2-index 登记回填；`_tmp/arm2-ma71/` 实跑；daily log 追加；roadmap MA7.1 行流转；本 plan 流转；**裁决要求的测试标记变更显式清单小提交（如触发）**；收口提交。

### Out Of Scope

- 性能优化实现；业务代码变更（P0 除外）；MA7.2/7.3 / MA8+ / MR / MV / MG；并发线未提交变更。

## Failure Paths

| 可测场景编号    | 触发                            | 行为                                                                | 可重试 |
| --------------- | ------------------------------- | ------------------------------------------------------------------- | ------ |
| e2e-env-failure | dev server/CDP 失效             | 归因修复后重跑                                                      | 是     |
| probe-flaky     | 帧率/耗时读数漂移               | 重跑 ≥2 取中位；仍不稳 → 环境阈值结论 + watch 标记                  | 是     |
| audit-p0-found  | Rule 2 六类之一（如渲染死循环） | 即时通道                                                            | 否     |
| subagent-quota  | 限流/模型失败                   | fresh 重启一次；再败执行者亲跑                                      | 是     |
| adjudicate-fork | 裁决结论要求改测试文件          | 显式清单小提交（仅测试标记/阈值；逐条列理由）——非零代码变更豁免路径 | 否     |
| round-overflow  | 单轮超上限                      | **字母批拆分（MA7.1-a/-b，Cross-Cutting 5 预授权）**                | 否     |

（"用户可见表现"列不适用——流程性失败路径。）

## Test Strategy

本档选择：**不适用**——纯审计取证（零业务代码变更；perf e2e 运行即取证本体）；`pnpm test` 为 Proof。档位维持不适用；若裁决需改断言语义则重新声明档位；仅标记/阈值数值变更走显式清单小提交。

## Execution Plan

### Phase 1 - multi：扫描器 + 热点取证 + 阈值裁决

Status: completed
Targets: `_tmp/arm2-ma71/round-{A,B}.md`、`_tmp/arm2-ma71/adjudication.md`

- Item Types: `Proof | Decision`

- [x] **Round A · 三扫描器全量+人工复核**（子代理）：perf 27/27、reactive 21/21 零 churn；react19 663 vs 649 **+14 全归因移动批**（M0 内容树重建闭合）+ **0 真嫌疑** + 3 条不可摘 memo 清单
- [x] **Round B · 运行时热点取证**（子代理）：**W-B5 确认升格 P1**（6000/6000 卡 66,486 DOM、拖拽 44.8fps；机制 :492 items-start）；[PERF] 全部成立零回归；健康面 4 页窗口化成立
- [x] **执行者 · perf 阈值逐条裁决**：25/25 落账（22 pass + ×3 console-gate 归 P1-MA4.5-002、零阈值回归、零测试文件变更——标记小提交未触发；watch-only ×3 本轮通过维持标记）；adj/\*.log 在案
- [x] **执行者对账**：P1-001 源码亲读（:492/:519）定罪；扫描器 +14 归因采信；裁决表 vs MA4.5 归因零矛盾；族面归并（strict-corpus ×6 引用）

Exit Criteria:

- [x] 扫描器复核结论 + 热点台账 + **25 条裁决表**（§0 逐条）落字
- [x] 分类/分级/归属/归族 + P1 复核实录

### Phase 2 - open：live 信号驱动开放式追问

Status: completed

- Item Types: `Proof | Decision`

- [x] ≥2 轮追问（R1 W-B5 源码定罪 :492/:519；R2 裁决表 vs MA4.5 交叉验证 + strict-corpus 族面归并），末轮显式停止
- [x] MR3 / MG / MA7.3 交叉线索分栏（MR3 +P1-MA7.1-001 + scada-editor metadata 补全回跑义务；MG +strict-corpus ×6 引用；冗余 memo 清理批候选附不可摘清单）

Exit Criteria:

- [x] open ≥2 轮显式停止；P2/P3 入报告 deferred/watch-only 附理由

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed

- Item Types: `Proof | Decision`

- [x] 报告落盘（`docs/audits/2026-10-23-0755-arm2-MA7.1-performance.md`：两轮 + §0 裁决表 25/25 + P1 ×1 + 扫描器归因 + watch-only 6 + open 两轮 + 收口补记）
- [x] arm2-index：MA7.1 行 + P1-MA7.1-001 行 + Last Updated 滚动（累计 64），grep 复核
- [x] daily log 追加（头部插入；计数 = 报告实数）
- [x] BUILD_VERIFY `pnpm test` 登记（exit 0，82/82）+ typecheck/build/lint（44/44 ×3，exit 0；同一运行登记复用于 Closure Gates）
- [x] 清理 `_tmp/arm2-ma71/`（closure audit R1 通过后执行）

Exit Criteria:

- [x] 报告与 arm2-index 逐条一致（grep：P1-MA7.1-001 双侧命中）
- [x] BUILD_VERIFY exit 0 登记（gate-\*.exit 全 0）

### Phase 4 - 收口与状态流转

Status: completed

- Item Types: `Proof`

- [x] draft review 通过后：roadmap MA7.1 `todo`→`planned`，plan→`active`
- [x] closure audit（fresh subagent `agent_6d639d71`）R1 **`approved`**（0B/0M/4m——审计员独立复跑三扫描器 27/21/663 逐字吻合 + adj 日志逐条核对 + kanban-board.tsx:492/:519 源码引注精确；4m 均随本 commit 落地：m1 66,484→66,486 勘误 ×6、m2 板向 20 列×300 卡勘误、m3 本节勾选流转、m4 headless rAF 方法备案结转入报告 §4）后：roadmap MA7.1 `planned`→`done`（行号 surgery + sed 回读核验），plan→`completed`
- [x] 提交前零残留 grep + prettier + `_tmp` 已清 + 入库面 diff 仅 In Scope 文档
- [x] 单次提交（显式路径；并发线不入 stage；临时 index；裁决标记变更未触发——×3 处置为维持红+归门路径，零测试文件变更）

Exit Criteria:

- [x] roadmap 与 plan 状态流转一致（sed 回读核验）
- [x] 提交仅含 In Scope 文件

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_f57eba64`（25 test 台账逐 spec 核实、roadmap :82 / 矩阵 :131 / arm2-index :92、HEAD `cba09b7d2`、三扫描器 + M0 基线行（27/21/649）、623 先例 + 50Hz rAF、W-B5 MA5.2 :88、guide 合规、MA4.5 :214/:28 在案证据核对）
- Verdict: R1 `revised`（0B/2M/3m）→ 回修共识
- Rounds: 1
- Findings addressed: M1 scada-editor-perf ×3 前提修正（MA4.5 已 live 定罪阈值全过、红因=console gate——裁决改为「落账处置」框架，MA4.5 数值为首要输入）；M2 [PERF] 引用链勘误（MA6.2/MA6.1 移出、MA5.6 RC/MA4.5 补入）；m1 Last Reviewed 落日期；m2 Test Strategy 措辞；m3 MA4.5 :28 归因表为裁决起始映射——均已落字

## Closure Gates

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足
- [x] arm2-index 登记与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 不存在被静默降级的 in-scope 项（watch-only 附理由入台账；25 条裁决表零遗漏）
- [x] 探针与临时配置已全部删除（`_tmp/arm2-ma71/` 清理）
- [x] roadmap Work Item Status MA7.1 行已流转 `done`（closure audit 通过后，sed 回读核验）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（44/44） / `pnpm build`（44/44） / `pnpm lint`（44/44） / `pnpm test`（82/82）登记（exit 0 ×4）

## Deferred But Adjudicated

（无——执行中改判当场落本节。）

## Non-Blocking Follow-ups

- （待执行中落账）

## Closure

Status Note: 全仓性能审计收官（P1 ×1 新案〔kanban-perf-scale 虚拟化被布局击穿——W-B5 升格定罪〕+ 扫描器 0 churn/+14 全归因移动批 0 真嫌疑 + **perf 阈值 25/25 落账**（22 pass + ×3 console-gate 归 P1-MA4.5-002、零阈值回归、零测试文件变更）+ [PERF] 记录全部成立零回归 + watch-only 6）；字母批裁定：未拆分；标记小提交未触发（处置为维持红+归门路径）；零业务/测试代码变更核验通过。可关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor `agent_6d639d71`（R1）
- Evidence: R1 **`approved`**（0B/0M/4m，4m 均随本 commit 落地）。审计员独立复核：**三扫描器 live 复跑 27/21/663 逐字吻合**；adj/summary.txt 8 spec EXIT 逐对核对（7×0 + scada-editor-perf ×3 fail 全为 console-gate 断言、阈值行内全过 6.6ms/65.3MB/61）；kanban-board.tsx:492（`items-start`）/ :519（裸 `virtualize`）引注精确 + out-rerender.json 6000/6000 与 followup3.log 列高链（clientH=scrollH=26,416 / col 26,496px）；+14 归因（649+1+13=663，sheet.tsx:62 实存、三个移动 commit full-green 核实）；「零测试文件变更」双跑核实；66,486 勘误与板向勘误随 commit 落地。

Follow-up:

- no remaining plan-owned work；P1-MA7.1-001 修复行在 MR3 队列（列体高度钳制 + DOM 计数守护）；scada-editor metadata 补全后回跑 scada-editor-perf 验证转绿（P1-MA4.5-002 修复义务）；冗余 memo 清理批候选（附 3 条不可摘清单）；MA7.2（安全）为下一工作项。

Follow-up:
