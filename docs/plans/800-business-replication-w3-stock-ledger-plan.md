# 800 M3-W3 WMS 库存台账页复刻（business-page-replication roadmap M3-W3）

> Plan Status: completed
> Last Reviewed: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M3-W3（依赖 M2 done；前置 W1/W2 done——设施与 wms mock 模块已就绪）
> Related: D1 总体设计；D2 §2.3/§4.1/§5（W3 页设计）；R1 §1 W3；R4 §1 W3（G6/G7）
> 重建注：本文件曾因执行会话脚本 truncate-then-read 缺陷清空（第 4 次，同 796/799 类），已按原稿+评审 4 项修订+执行完成态重建。

## Purpose

落地 M3-W3「WMS 库存台账页」：pivot 多维透视（仓库×库位×物料×批次收发存）+ stat-tile KPI 指标卡 + 批次追溯 drill-down dialog + 服务端报表下载（G6 口径），mock 端点扩展 + focused e2e + axe 分支 A 登记。收口为 roadmap §2 W3 状态 `todo → planned → done`。

## Current Baseline

- 设施就绪（W1 交付）：replication.ts 六件套、replication.css、showcase-env repl 接线、axe 修正后机制、business-replication 分类。
- D2 §2.3 W3 设计（D5 核对过）：pivot-table（rowDimensions/columnDimensions/indicators aggregationType 大写词表/dataConfig.totals 嵌套 row——D5 勘误后写法）+ `pivot:cell-click`→dialog 批次追溯 + stat-tile KPI + query-filter（W2 勘误 5 教训：query-filter scope 不发布值，实现按 live 验证载体）+ table 明细 + download 报表下载（G6：improvement L23/L182 不采纳内建导出，服务端报表下载先例 trace-report）。
- D2 §4.1 wms 端点表 W3 子集（stockLedgerRows/stockKpi/batchTrace/ledgerReport/reconCheck，含 forceReconDrift 钩子）；mock 模块已有 11 端点（W1 五 + W2 六）。
- G7 对账提示：status/card 组合承载（W3 落点）。

## Goals

- `page-schemas/wms-stock-ledger.json` + mock 端点扩展 + complex-pages-model.ts entry + e2e `tests/e2e/replication-wms-stock-ledger.spec.ts`（三支柱）+ axe 分支 A 登记。
- e2e 断言按 D2 §5 W3 清单（透视渲染与 cell-click 钻取 dialog/KPI 数值/过滤联动/追溯明细/导出下载计数/对账提示）。

## Non-Goals

- 不实现内建导出（G6 登记冲突裁定：服务端下载）；不做对账校验专用 type（G7 组合）；不改 W1/W2 交付物（除 mock 模块扩展）。

## Scope

### In Scope

- W3 页 schema + mock 扩展 + entry + e2e + axe 登记；roadmap §2 W3 回写。

### Out Of Scope

- 其余 18 页；G6/G7 缺口落地；W1/W2 交付物重构。

## Failure Paths

| 编号             | 触发                       | 行为                                                                         | 可重试 | 用户可见表现 |
| ---------------- | -------------------------- | ---------------------------------------------------------------------------- | ------ | ------------ |
| e2e-fail         | focused e2e 失败           | 定位修复→重跑至绿（显式 --retries=0）；设计与 live 不符以 live 为准并勘误 D2 | 是     | e2e 全绿     |
| pivot-data-shape | pivot 数据契约与 mock 不符 | 以 pivot schemas 实况为准调整 mock/设计勘误                                  | 是     | 页面正常渲染 |

## Test Strategy

必须自动化：本页 e2e 即验收本体（三支柱），显式 `--retries=0` 全绿（W1/W2 教训：config 默认 retries:1 掩盖首跑失败）。

## Execution Plan

### Phase 1 - W3 页全链实现

Status: completed
Targets: `page-schemas/wms-stock-ledger.json`、`mock-backend-repl-wms.ts`（扩展 + delegate 模块）、`render-host.tsx`（pivot 族补注册——live 缺口）、`complex-pages-model.ts`（entry）、`tests/e2e/replication-wms-stock-ledger.spec.ts`、axe spec/JSON

- Item Types: `Fix | Proof`

- [x] mock 扩展：W3 子集端点**逐名对齐 D2 §4.1 原表**（stockLedgerRows〔30 行多维〕/stockKpi〔评审 Minor-1 勘误：dashboardKpi 系 CRM 域名〕/batchTrace/ledgerReport/**reconCheck〔G7，含 forceReconDrift 钩子〕**，含错误分支；ledgerReport 按 download action live 实况 `{url, filename}` 非 D2 `{downloadUrl}`——delegate 模块 `mock-backend-repl-wms-stock.ts` 249 行）
- [x] complex-pages-model.ts 加 wms-stock-ledger entry（business-replication 分类）
- [x] schema JSON（D2 §2.3 组件树：pivot-table 透视〔rowDimensions 含 batchNo 行维叶子——勘误①/stat-tile KPI/pivot:cell-click→**setValue→refreshSource→openDialog then 链**〔评审 Minor-2 参数链首验：D2 片段缺 setValue 环节、`${dimension.value}` 不存在，live payload 为 cellHeaderPaths.rowHeaderPaths[n].value——勘误②③〕/status+card 对账提示〔G7，reconCheck 驱动〕/下载 button→download action；testid `<pageId>-<element>`；strict 零 error——**render-host.tsx 补注册 registerPivotRenderers（live 缺口：showcase registry 未注册 pivot 族，strict 首跑实证）**）
- [x] e2e spec 三支柱（pivot 13 列×33 体行渲染+首叶值断言+cell-click 参数链全链命中〔lastBatchTraceBatchNo+dialog 标题+追溯两行〕/KPI 数值/过滤联动刷新+总计重算/导出 data:text/csv 形状+非法格式拒绝分支/**G7 success→error 面切换断言**；focus 3 条。axe 独立登记项见下）
- [x] axe ROUTES + JSON 登记（分支 A；实测回填 aria-required-attr:9/color-contrast:7/label:1 + \_notes 组件债归因）
- [x] 验证：W3 spec `--retries=0` 9/9 + axe 10/10 + W1/W2 回归 22/22 + pivot-table-demo 回归 4/4 + playground typecheck + strict 校验 47/47

Exit Criteria:

- [x] W3 页可达可交互且列表页收录，strict validation 零 error（unit 544/544 含 entry↔registry）
- [x] focused e2e `--retries=0` 全绿（9/9，断言含 \_\_replWmsCalls 计数证据）
- [x] axe 基线登记绿（10/10）
- [x] roadmap §2 W3 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9；实际翻转滞留一拍于 bb85256cc——Edit 陈旧读态失败，本 commit 即时补救并披露）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `revised`（首轮 fail：1 Major + 3 Minor；全部修订）
- Rounds: 1
- Findings addressed:
  - Major-1：G7/reconCheck 线悬空（W2 columnFooter 式漏列剧本）→ 修法 (a)：mock 补 reconCheck+forceReconDrift、schema 补 status/card 对账元素、e2e 补对账断言
  - Minor-1：dashboardKpi → stockKpi（CRM 域名混淆勘误）
  - Minor-2：cell-click batchNo 参数链实测列为实现首验项
  - Minor-3：e2e item 措辞 axe 移出页面 spec 括号
  - 重建注：本文件曾因执行会话脚本 truncate-then-read 缺陷清空（第 4 次），已按原稿+评审修订+执行完成态重建

## Closure Gates

- [x] in-scope 工作全部落地（W3 页 + mock 扩展 + roadmap 回写随收口 commit）
- [x] 行为/契约结果已达成（D2 §5 W3 断言清单全绿：--retries=0 9/9）
- [x] 必要 focused verification 已完成（W3 spec + axe 10/10 + W1/W2 回归 22/22 + strict 校验 47/47）
- [x] 不存在被静默降级的 in-scope 缺口（lint/check 触达面零新增红实证）
- [x] 受影响 owner docs 已同步（daily log；D2 §2.3 实现勘误 9 条就地落档）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据
- [x] `pnpm typecheck`（OK）
- [x] `pnpm build`（OK）
- [x] `pnpm lint`（触达面零新增红；失败系并行会话 WIP——flux-bundle mall-ds-ajax.test.tsx unused eslint-disable，同 799 Deferred 归因）
- [x] `pnpm test`（OK）
- [x] `pnpm check`（触达面零新增红；链上失败=workspace-manifest-deps〔798 Deferred 既有〕+ owner-doc-semantics〔bundle-default-registration-face doc 9 vs live 10——799 Deferred 既有，closure audit Major-1 勘误：原"其余子项过"声称不成立〕+ oversized 3 文件全部 [exempt] 已注册〔flux-i18n locales ×2 + flux-runtime form-runtime-owner〕，其余子项过）

## Deferred But Adjudicated

### （继承）已知 check 链上 3 失败子项

- Classification: `watch-only residual`（workspace-manifest-deps / owner-doc-semantics / scanner-baselines——前两者 798/799 Deferred 已登记 successor=flux-bundle owner 面；scanner-baselines 已于 799 就地注册修复现绿）
- Why Not Blocking: 均非本计划触达面；收口实跑复验零新增
- Successor Required: `yes`
- Successor Path: 同 798/799 登记（flux-bundle owner 面 / F2）

## Non-Blocking Follow-ups

- 全量 test:e2e 归 P1 阶段

## Closure

Status Note: W3 全链落地（pivot 透视含 batchNo 行维叶子+cell-click setValue→refreshSource→openDialog 参数链+对账 status/card〔G7〕+download action+render-host 补注册 registerPivotRenderers live 缺口）。closure audit 首轮 issues（1 Major：check"其余子项过"未验证——owner-doc-semantics 现红属 799 Deferred 既有；4 Minor）→ 修复 → 复核揪出 3 处残留（R-1 遗留行矛盾/R-2 log 勘误清单未同步/R-3 溯源错标 799）→ 全部修正 → 终轮 **approved** 零保留。审计员独立实跑 9/9、22/22 回归、10/10、544/544。W3 可关，M3 累计 3/21 页。状态翻转滞留一拍（bb85256cc 后本 commit 补齐）——guide 记录的 765 教训在本会话实证复现，后续页收口改用先翻转后提交顺序。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose；首轮+两轮复核）
- Evidence: 首轮 `issues`（1 Major + 4 Minor）→ 修复 → 二轮 `issues`（3 残留：R-1 遗留行矛盾/R-2 log 清单未同步/R-3 溯源错标）→ 修正 → 终轮 `approved`（零保留意见）；审计员独立实跑 focused e2e 9/9（retries=0）、W1/W2 回归 22/22、axe 10/10、unit 544/544；详见 `docs/logs/2026/10-30.md`。

Follow-up:

- 已知 check 链 3 失败子项 successor 同 798/799 Deferred（flux-bundle owner 面 / F2）
- 全量 test:e2e 归 P1 阶段
