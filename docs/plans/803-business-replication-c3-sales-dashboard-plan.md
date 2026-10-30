# 803 M3-C3 CRM 销售驾驶舱页复刻（business-page-replication roadmap M3-C3）

> Plan Status: completed
> Last Reviewed: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M3-C3（依赖 M2 done；前置 C1/C2 done——crm mock 模块已建）
> Related: D1 总体设计；D2 §2.6/§4.2/§5（C3 页设计）；R1 §2 C3（上游无直接章节，佐证登记页）；C1 页先例（crm mock/refreshSource 级联）

## Purpose

落地 M3-C3「CRM 销售驾驶舱页」：dashboard 网格（stat-tile KPI 阵列 + echarts 趋势/类别分布 + 漏斗 bar 近似）+ 全局条件筛选级联刷新 + 报表区块下载，mock 端点扩展 + focused e2e + axe 分支 A 登记。收口为 roadmap §2 C3 状态 `todo → planned → done`。

## Current Baseline

- 设施就绪：replication.ts 六件套、crm mock 模块（C1 五 + C2 六 = 11 端点，已拆分主文件 427 行 + c2 497 行——**新 C3 端点放 delegate 模块 `mock-backend-repl-crm-c3.ts` 防 oversized 复发**）、axe 机制、桌面纯 JSON 页先例。
- D2 §2.6 C3 设计（D5 核对过）：dashboard 网格（cols/panels x/y/w/h）+ panel 内 stat-tile 阵列 + echarts 趋势（onClick 钻取——参数链 setValue→refreshSource→openDialog，W3 参数链先例）+ chart bar 近似漏斗（G1）+ query-filter 级联（C1 kanban 页上游范式：refreshSource 顶层 targetId 多源级联，**onSubmit 事件形态按 live 实况**）+ html 报表区块+download。
- mock 端点：C3 子集逐名对齐 D2 §4.2 crm 表（dashboardKpi/funnelStageMetrics/forecastAccuracy/quotaSummary/report 渲染/下载——**以表原名为准**，新端点入 delegate 模块 `mock-backend-repl-crm-c3.ts`）。
- 已知 live 教训适用：dashboard events 置于 props 内（buildDashboardPanelFragment 仅消费 type/props/source）、**panel type 须已注册且 dashboard 族须入 render-host 注册（W3 勘误 4 同型——评审 Major-1 补）**、chart chartType/source、refreshSource 顶层 targetId、echarts 9 类事件、漏斗 bar 近似（G1）。

## Goals

- `page-schemas/crm-sales-dashboard.json` + mock delegate 模块（C3 子集）+ entry + e2e `tests/e2e/replication-crm-sales-dashboard.spec.ts`（三支柱）+ axe 分支 A 登记。
- e2e 断言按 D2 §5 C3 清单（KPI 阵列数值/趋势 echarts 渲染+点击钻取 dialog/漏斗 bar/筛选级联多源刷新计数/报表下载；focus 3 条）。

## Non-Goals

- 不实现 funnel/gauge 图型（G1 bar 近似）；不改 W1-C2 交付物（除 repl 分支接线扩展）。

## Scope

### In Scope

- C3 页 schema + mock delegate + entry + e2e + axe 登记；roadmap §2 C3 回写。

### Out Of Scope

- 其余 16 页；G1 缺口落地；既有交付物重构。

## Failure Paths

| 编号         | 触发                     | 行为                                                                         | 可重试 | 用户可见表现 |
| ------------ | ------------------------ | ---------------------------------------------------------------------------- | ------ | ------------ |
| e2e-fail     | focused e2e 失败         | 定位修复→重跑至绿（显式 --retries=0）；设计与 live 不符以 live 为准并勘误 D2 | 是     | e2e 全绿     |
| panel-render | dashboard panel 渲染异常 | 以 buildDashboardPanelFragment/dashboard-renderer 实况为准调整/勘误 D2       | 是     | 面板正常渲染 |

## Test Strategy

必须自动化：本页 e2e 即验收本体（三支柱），显式 `--retries=0` 全绿。

## Execution Plan

### Phase 1 - C3 页全链实现

Status: completed
Targets: `mock-backend-repl-crm-c3.ts`（新建 delegate）、`mock-backend-repl-crm.ts`（接线）、`shared/render-host.tsx`（**registerDashboardRenderers 补注册——评审 Major-1：complex-pages 渲染路径未含 dashboard 族，C3 为该路径首个 dashboard 消费页，W3 勘误 4 同型**）、`page-schemas/crm-sales-dashboard.json`、`complex-pages-model.ts`（entry）、`tests/e2e/replication-crm-sales-dashboard.spec.ts`、axe spec/JSON

- Item Types: `Fix | Proof`

- [x] mock delegate：C3 子集端点**逐名对齐 D2 §4.2 crm 表原六名**（funnelSummary〔C1/C3 共用——主模块已有，直接复用〕/dashboardKpi/dashboardTrend/drillRows/forecastAccuracy/reportDownload——评审 Minor-1 勘误：funnelStageMetrics/quotaSummary 系上游实体名转写非端点名，dashboardTrend/drillRows 为 §5 断言②落点；含错误分支）
- [x] render-host.tsx 补注册 registerDashboardRenderers（W3 勘误 4 同型；panel 内容类型 stat-tile/echarts/chart/table 经既有注册面已覆盖，仅缺 dashboard 族——评审 Major-1）
- [x] complex-pages-model.ts 加 crm-sales-dashboard entry
- [x] schema JSON（D2 §2.6 组件树：dashboard 网格 + panel 内 stat-tile 阵列 + echarts 趋势〔onClick 参数链 setValue→refreshSource→openDialog〕+ chart bar 漏斗近似〔G1〕+ 条件筛选级联〔refreshSource 顶层 targetId 多源，事件形态按 live 实况——W2 勘误 5/6 教训：form+valuesPath 载体 + 查询按钮〕+ 报表区块 panel table+download〔G6——评审 Minor-3 措辞对齐 D2 §2.6〕；testid `<pageId>-<element>`；strict 零 error——panels 经 PAGE_DATA 表达式绑定通道，见 daily log 勘误①）
- [x] e2e spec 三支柱（D2 §5 C3 断言清单：KPI 阵列数值/趋势 echarts 渲染+点击钻取 dialog〔参数链〕/漏斗 bar 渲染/筛选级联多源刷新计数/报表下载计数；axe 分支 A；focus 3 条）
- [x] axe ROUTES + JSON 登记（分支 A；首跑实测回填 aria-required-attr 4 / color-contrast 8 + \_notes）
- [x] 验证：`npx playwright test tests/e2e/replication-crm-sales-dashboard.spec.ts --retries=0` 全绿（9/9）+ axe spec 绿（13/13）+ W1-W3/C1/C2 回归（50/50）+ playground typecheck + strict 校验（50/50）

Exit Criteria:

- [x] C3 页可达可交互且列表页收录，strict validation 零 error
- [x] focused e2e `--retries=0` 全绿（断言含 \_\_replCrmCalls 计数证据）
- [x] axe 基线登记绿
- [x] roadmap §2 C3 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `revised`（首轮 fail：1 Major + 3 Minor；全部修订）
- Rounds: 1
- Findings addressed:
  - Major-1：render-host.tsx 补注册 registerDashboardRenderers（complex-pages 路径未含 dashboard 族，C3 为该路径首个 dashboard 消费页——W3 勘误 4 同型）入 Targets+执行项+教训清单
  - Minor-1：端点 gloss 替换为 D2 §4.2 原六名（funnelStageMetrics/quotaSummary 系上游实体名转写；补 dashboardTrend/drillRows）
  - Minor-2：Deferred 改写"现无已知红"（HEAD full-green）
  - Minor-3：html 报表区块 → panel table 措辞对齐 D2 §2.6

## Closure Gates

- [ ] in-scope 工作全部落地（C3 页 + mock delegate + roadmap 回写）
- [ ] 行为/契约结果已达成（D2 §5 C3 断言清单全绿，--retries=0）
- [ ] 必要 focused verification 已完成
- [ ] 不存在被静默降级的 in-scope 缺口
- [ ] 受影响 owner docs 已同步（daily log；设计勘误如有）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`（触达面零新增红口径）
- [ ] `pnpm test`（触达面零新增红口径）
- [x] `pnpm check`（触达面零新增红——scanner-baselines 增量未发生〔dashboard 族入注册后引用已 retained〕；新增 1 处 data-blob-href-without-download 已按 W3/plan 820 先例就地豁免登记〔mock 层无 download 语义、运行时 downloadBlob 无顶层导航〕→ 全链 exit 0；oversized 3 exempt 既有）

## Deferred But Adjudicated

### （继承）check/lint 链状态

- Classification: 无已知红（HEAD 23e7b795c full-green：typecheck/build/lint OK + check exit 0；798-802 Deferred 各项已被并行会话修复或注册现绿——评审 Minor-2 勘误：原"继承已知失败子项"前提过期）
- Why Not Blocking: 不适用（现无已知红；收口实跑复验零新增口径维持，scanner 增量按上述口径就地注册）
- Successor Required: `no`
- Successor Path: 不适用（并行会话后续 WIP 引入新红归其自有义务）

## Non-Blocking Follow-ups

- 全量 test:e2e 归 P1 阶段

## Closure

Status Note: C3 全链落地（dashboard 网格+stat-tile×4+echarts 趋势 onClick 参数链+漏斗 bar+级联多源刷新+panel table 报表区块；render-host 补注册 registerDashboardRenderers；panels PAGE_DATA 载体〔勘误①〕）。closure audit **approved** 零 Blocker/Major（3 Minor 随收口处理）。**含一处产品代码修复**：flux-renderers-data echarts-renderer evaluationBindings 补齐（IS-5 同族，`${event.name}` 静默失败）+ echarts-events-bridge 新用例——审计员核验语义正确（map-renderer 同款）且 data 包全量 1264/1264 不破坏。审计员独立实跑 C3 9/9、axe 13/13、回归 50/50、unit 547/547、全链 check exit 0。C3 可关，M3 累计 6/21 页。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose）
- Evidence: verdict `approved`（零 Blocker/Major，3 Minor 随收口）——审计员独立实跑 C3 9/9（retries=0）+ axe 13/13 + 回归 50/50 + unit 547/547 + pnpm check exit 0；产品修复语义核验（map-renderer 先例同款+消费侧 action-core L193 实锚+新用例 objectContaining 断言真实非空转）；pie panel 未实现裁决三级登记一致；详见 `docs/logs/2026/10-30.md`。

Follow-up:

- pie panel 补实现或移除——D5/P1 审计裁决（D2 §2.6 勘误第 5 条登记）
- echarts 6 series line hit-test 局限——chart owner 观察项（D2 勘误第 3 条）
- 全量 test:e2e 归 P1 阶段
