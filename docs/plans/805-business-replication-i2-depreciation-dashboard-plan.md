# 805 M3-I2 ITAM 折旧仪表盘页复刻（business-page-replication roadmap M3-I2）

> Plan Status: completed
> Last Reviewed: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M3-I2（依赖 M2 done；前置 I1 done——itam mock 模块已建）
> Related: D1 总体设计；D2 §2.8/§4.3/§5（I2 页设计）；R1 §3 I2；R4 §1 I2（G6 导出）
> 重建注：初稿曾因脚本缺陷清空，本稿按 W1-C3/I1 已固化周期模板重建。

## Purpose

落地 M3-I2「ITAM 折旧仪表盘页」：stat-tile KPI 阵列 + pie 类别分布 + line 折旧趋势 + pivot 年度透视 + crud 折旧未计提预警 + 期间过滤刷新，itam mock 模块扩展 + focused e2e + axe 分支 A 登记。收口为 roadmap §2 I2 状态 `todo → planned → done`。

## Current Baseline

- 设施就绪：replication.ts helper 族（10 导出，含六件套核心）、replication.css、showcase-env `/r/ReplItam__` 分支已接、delegate 模块模式（三先例）、dashboard 族已入 render-host 注册（C3 交付）、strict 零诊断门（error/warning/info 全档）。
- D2 §2.8 I2 设计（D5 核对过+W3 同族勘误适用：stat-tile formatter decimals——schemas 层 optional〔plan 800 勘误 5〕与渲染器声明链显式〔plan 801 勘误 7〕双半口径并存，实现时按 live 声明链；pivot aggregationType 大写/totals 嵌套、filterRules 上移 data-source params〔W3 勘误 10〕、form+valuesPath 过滤载体〔W2 勘误 5〕）。
- D2 §4.3 itam 表 I2 子集端点（折旧 KPI/trend/类别分布/missingAlert/pivot rows 等，逐名对齐原表）；mock 模块已有 I1 六端点+repairCreate。
- G6 导出：服务端报表下载口径（download action `{url, filename}` live 契约）。（评审 M4：原"G7 status/card"句系 W3 味残留删除——I2 缺口仅 G6；"年度透视 flux 侧预期"系 R1 原生标注非勘误。）

## Goals

- `mock-backend-repl-itam-depreciation.ts` delegate（I2 子集端点+错误分支）+ `page-schemas/itam-depreciation-dashboard.json` + entry + e2e `tests/e2e/replication-itam-depreciation-dashboard.spec.ts`（三支柱）+ axe 分支 A 登记。
- e2e 断言**忠实转写 D2 §5 I2 清单（四条断言+focus 3 条）**：期间过滤刷新+KPI 重取/pivot 单元格断言/预警 crud/导出下载。**本计划补充断言（出处 §2.8 树+R1 I2 要素②③，非 §5 原文——评审 M5）**：KPI 数值/类别分布 pie 渲染/趋势 line 渲染。

## Non-Goals

- 不实现页面级内建导出（G6 登记冲突：服务端下载）；不做跨域 pivot 需求扩展（R1 勘误：年度透视 flux 侧预期，口径对齐度量目录）；不改 I1 交付物（除 mock 接线）。

## Scope

### In Scope

- I2 页 schema + mock delegate + entry + e2e + axe 登记；roadmap §2 I2 回写。

### Out Of Scope

- 其余 14 页；G6 缺口落地；I1 交付物重构。

## Failure Paths

| 编号             | 触发                                       | 行为                                                                         | 可重试 | 用户可见表现 |
| ---------------- | ------------------------------------------ | ---------------------------------------------------------------------------- | ------ | ------------ |
| e2e-fail         | focused e2e 失败                           | 定位修复→重跑至绿（显式 --retries=0）；设计与 live 不符以 live 为准并勘误 D2 | 是     | e2e 全绿     |
| dashboard-panels | dashboard/panels 契约与 PAGE_DATA 载体不符 | 以 C3 先例（PAGE_DATA 表达式通道）为准调整/勘误 D2                           | 是     | 面板正常渲染 |

## Test Strategy

必须自动化：本页 e2e 即验收本体（三支柱），显式 `--retries=0` 全绿。

## Execution Plan

### Phase 1 - I2 页全链实现

Status: done（2026-10-30 执行会话；focused e2e --retries=0 10/10 + axe 15/15 + I1/C2/C3 回归 29/29 + strict 零诊断 + playground typecheck 全绿，证据见 docs/logs/2026/10-30.md M3-I2 节）
Targets: `mock-backend-repl-itam-depreciation.ts`（新建 delegate）、`mock-backend-repl-itam.ts`（接线）、`page-schemas/itam-depreciation-dashboard.json`、`complex-pages-model.ts`（entry）、`tests/e2e/replication-itam-depreciation-dashboard.spec.ts`、axe spec/JSON

- Item Types: `Fix | Proof`

- [x] mock delegate：I2 子集端点**逐名对齐 D2 §4.3 itam 表原六名**（depreciationKpi 平铺 map〔W3 勘误 9 口径〕/depreciationTrend 序列/categoryDistribution 类别分布/depreciationAlerts 预警/depreciationPivot 透视行/depreciationReport 报表下载——评审 M1 勘误：missingAlert 系上游名渗漏，含错误分支；行/序列数据支撑 pie/line/pivot 多维）
- [x] complex-pages-model.ts 加 itam-depreciation-dashboard entry
- [x] schema JSON（D2 §2.8 组件树：dashboard 网格或 page+stat-tile 阵列〔W3 同族 PAGE_DATA/表达式通道按 live 实况〕/chart pie 类别分布+chart line 折旧趋势/pivot-table 年度透视〔aggregationType 大写/totals 嵌套〕/crud 预警〔**行操作 dialog——D2 §5 focus③ 依赖而树未绘，预登记补绘**〔评审 M3，804 repairCreate 先例〕〕/期间过滤 form+valuesPath→refreshSource/报表下载 download action〔G6〕；testid `<pageId>-<element>`；strict 零 error）
- [x] e2e spec 三支柱（D2 §5 I2 断言清单：KPI 数值/pie 渲染/line 渲染/期间过滤刷新计数+数据变化/预警 crud 行/透视渲染与单元格断言/下载计数；axe 分支 A；focus 3 条）
- [x] axe ROUTES + JSON 登记（分支 A；首跑实测回填+\_notes）
- [x] 验证：`npx playwright test tests/e2e/replication-itam-depreciation-dashboard.spec.ts --retries=0` 全绿 + axe spec 绿 + W1-I1 回归 + playground typecheck + strict 校验

Exit Criteria:

- [x] I2 页可达可交互且列表页收录，strict validation 零 error
- [x] focused e2e `--retries=0` 全绿（断言含 \_\_replItamCalls 计数证据）
- [x] axe 基线登记绿
- [x] roadmap §2 I2 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `pass-with-minors`（零 Blocker/Major，6 Minor 已当场修订）
- Rounds: 1
- Findings addressed:
  - M1：端点名精确化 depreciationAlerts/depreciationPivot（missingAlert 系上游名渗漏）
  - M2：decimals 勘误指针改 800/801 双半口径
  - M3：预警行 dialog 预登记（§5 focus③ 依赖而树未绘）
  - M4：G7 残留句删除+R1 原生标注措辞
  - M5：补充断言出处标记（§2.8 树+R1 要素②③）
  - M6：helper 族措辞/strict 零诊断门口径

## Closure Gates

- [ ] in-scope 工作全部落地（I2 页 + mock delegate + roadmap 回写）
- [ ] 行为/契约结果已达成（D2 §5 I2 断言清单全绿，--retries=0）
- [ ] 必要 focused verification 已完成
- [ ] 不存在被静默降级的 in-scope 缺口
- [ ] 受影响 owner docs 已同步（daily log；设计勘误如有）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`（触达面零新增红口径）
- [ ] `pnpm test`（触达面零新增红口径）
- [x] `pnpm check`（触达面零新增红——mock delegate 352 行 <500；scanner-baselines 零增量；新增 1 处 data-blob-href-without-download 已按 C3/W3 先例就地豁免登记〔ui-consistency-exemptions.mjs〕→ 子项现绿；其余子项过含 i18n/focus-ledger ✅）

## Deferred But Adjudicated

### （继承）check/lint 链状态

- Classification: 无已知红（HEAD 939d7e20d 即 I1 full-green 收口态；798-804 Deferred 各项已被并行会话修复或注册现绿）
- Why Not Blocking: 不适用（现无已知红；收口实跑零新增口径维持）
- Successor Required: `no`
- Successor Path: 不适用（并行会话后续 WIP 引入新红归其自有义务）

## Non-Blocking Follow-ups

- 全量 test:e2e 归 P1 阶段

## Closure

Status Note: I2 全链落地（delegate 六端点+page 直排树 stat-tile×5 decimals 显式+pie/line+pivot category×quarter SUM+totals 嵌套+crud 预警行操作 dialog〔预登记补绘兑现〕+form+valuesPath 五源级联+download action）。closure audit **approved** 零 Blocker/Major（1 Minor 注释级种子数学勘误已修）。审计员独立实跑 I2 10/10、I1 回归 11/11、axe 15/15、ui-consistency exit 0、unit 544/544（strict 52/52 含本页）。pivot 种子数学独立复算全对（200000/950000/36800/576000）。I2 可关，M3 累计 8/21 页。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose）
- Evidence: verdict `approved`（零 Blocker/Major，1 Minor 注释勘误已修）——审计员独立实跑 I2 10/10（retries=0）+ I1 回归 11/11 + axe 15/15 + ui-consistency exit 0；pivot 种子数学独立复算（2026 IT设备×Q1×originalValue=200000、总计行三指标全命中）；预警 dialog 预登记兑现核验；勘误 5 条逐条对照 live 全成立；详见 `docs/logs/2026/10-30.md`。

Follow-up:

- 全量 test:e2e 归 P1 阶段
